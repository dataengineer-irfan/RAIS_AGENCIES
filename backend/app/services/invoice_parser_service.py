import io
import re
import csv
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher
from sqlalchemy.orm import Session
from app.models.catalogue import Product, Category

# Well-known cold-chain and FMCG suppliers for RAIS AGENCIES
KNOWN_SUPPLIERS = [
    "JUBILEE ENTERPRISES",
    "MILKY MIST DAIRY FOODS PRIVATE LIMITED",
    "MILKY MIST",
    "AMUL (GCMMF LTD)",
    "AMUL",
    "ITC LIMITED",
    "ITC MASTER CHEF",
    "MCCAIN FOODS INDIA PVT LTD",
    "MCCAIN",
    "DEL MONTE FOODS PRIVATE LIMITED",
    "DEL MONTE",
    "GODREJ AGROVET LIMITED",
    "GODREJ REAL GOOD",
    "NUTRICH / PREMIER POULTRY",
    "FOODRITE INDIA",
    "SIGNATURE TORTILLA"
]

class InvoiceParserService:
    """
    Intelligent Supplier Tax Invoice Parsing Engine.
    Extracts vendor, invoice number, date, line items, and performs
    automated fuzzy matching against the RAIS product catalogue.
    """

    @classmethod
    def parse_invoice_file(cls, file_bytes: bytes, filename: str, db: Session) -> Dict[str, Any]:
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        extracted_text = ""

        if ext == "pdf":
            extracted_text = cls._extract_text_from_pdf(file_bytes)
        elif ext in ["csv", "txt"]:
            extracted_text = cls._extract_text_from_txt(file_bytes)
        else:
            try:
                extracted_text = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                extracted_text = ""

        # If text was extracted, parse structured fields
        parsed_data = cls._parse_text_content(extracted_text, filename)
        
        # Match each parsed item against the catalogue in database
        all_products = db.query(Product).filter(Product.is_active == True).all()
        categories = db.query(Category).all()
        cat_map = {c.id: c.code for c in categories}
        cat_name_map = {c.code: c.name for c in categories}

        matched_items = []
        for idx, it in enumerate(parsed_data.get("items", [])):
            match_res = cls._match_item_to_catalogue(it["supplier_item"], all_products, cat_map)
            
            item_entry = {
                "id": idx + 1,
                "supplier_item": it["supplier_item"],
                "invoiced_qty": it["invoiced_qty"],
                "unit_description": it["unit_description"],
                "pack_ratio": it["pack_ratio"],
                "packets": it["packets"],
                "purchase_cost": it["purchase_cost"],
                "line_total": it["line_total"],
                "batch_number": it.get("batch_number") or f"LOT-{datetime.now().strftime('%m%d')}-{idx+1:02d}",
                "is_matched": match_res["is_matched"],
                "confidence": match_res["confidence"],
                "product_id": match_res["product_id"],
                "sku": match_res["sku"],
                "product_name": match_res["product_name"],
                "suggested_category_code": match_res["suggested_category_code"],
                "suggested_category_name": cat_name_map.get(match_res["suggested_category_code"], "Veg Items"),
                "suggested_sku": match_res["suggested_sku"],
                "suggested_base_price": round(it["purchase_cost"] * 1.25, 2)
            }
            matched_items.append(item_entry)

        return {
            "supplier_name": parsed_data.get("supplier_name", "SUPPLIER"),
            "invoice_number": parsed_data.get("invoice_number", f"INV-{datetime.now().strftime('%Y%m%d%H%M')}"),
            "invoice_date": parsed_data.get("invoice_date", datetime.now().strftime("%Y-%m-%d")),
            "uploaded_filename": filename,
            "raw_text_snippet": extracted_text[:500] if extracted_text else "",
            "items": matched_items,
            "total_items": len(matched_items),
            "matched_count": sum(1 for m in matched_items if m["is_matched"]),
            "new_items_count": sum(1 for m in matched_items if not m["is_matched"])
        }

    @staticmethod
    def _extract_text_from_pdf(file_bytes: bytes) -> str:
        text = ""
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            print(f"  [InvoiceParserService] pypdf extraction error: {e}")
        return text

    @staticmethod
    def _extract_text_from_txt(file_bytes: bytes) -> str:
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                return file_bytes.decode(enc)
            except Exception:
                continue
        return ""

    @classmethod
    def _parse_text_content(cls, text: str, filename: str) -> Dict[str, Any]:
        supplier_name = ""
        invoice_number = ""
        invoice_date = datetime.now().strftime("%Y-%m-%d")
        items = []

        if not text:
            return {
                "supplier_name": "SUPPLIER INVOICE",
                "invoice_number": f"INW-{datetime.now().strftime('%m%d%H%M')}",
                "invoice_date": invoice_date,
                "items": []
            }

        # 1. Detect Supplier Name (check top 15 header lines first)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        header_lines = lines[:15]
        for hl in header_lines:
            hl_upper = hl.upper()
            for sup in KNOWN_SUPPLIERS:
                if sup in hl_upper:
                    supplier_name = sup.split("(")[0].strip()
                    break
            if supplier_name:
                break

        if not supplier_name:
            match = re.search(r'(?:M/s|Supplier|Vendor|Seller|From|Billed By|Tax Invoice\s*-\s*)\s*[:.\-]?\s*([A-Za-z0-9 &.-]{4,40})', text, re.IGNORECASE)
            if match:
                supplier_name = match.group(1).strip()
            else:
                first_lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 3]
                supplier_name = first_lines[0] if first_lines else "SUPPLIER INVOICE"

        # 2. Detect Invoice Number (e.g. AMUL/2026/8892, JE/12212/26-27, INV-9821)
        inv_match = re.search(r'(?:Invoice\s*No\.?|Inv\s*No\.?|Bill\s*No\.?|Bill\s*#|Invoice\s*#)\s*[:.\-]?\s*([A-Za-z0-9\/\-_]+)', text, re.IGNORECASE)
        if inv_match and len(inv_match.group(1).strip()) >= 3:
            invoice_number = inv_match.group(1).strip()
        else:
            custom_match = re.search(r'\b([A-Z]{2,6}\/[\d\/\-_]+|\b[A-Z]{2,6}-\d+)\b', text)
            if custom_match:
                invoice_number = custom_match.group(1)
            else:
                invoice_number = f"INW-{datetime.now().strftime('%Y%m%d-%H%M')}"

        # 3. Detect Invoice Date
        date_match = re.search(r'(?:Dated?|Date|Invoice\s*Date|Bill\s*Date)\s*[:.\-]?\s*(\d{1,2}[\/\-.][A-Za-z0-9]{2,4}[\/\-.]\d{2,4})', text, re.IGNORECASE)
        if date_match:
            raw_date = date_match.group(1).strip()
            invoice_date = cls._normalize_date(raw_date)

        # 4. Extract Line Items
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for line in lines:
            parsed_item = cls._parse_table_line(line)
            if parsed_item:
                items.append(parsed_item)

        if not items and "," in text:
            items = cls._parse_csv_lines(lines)

        return {
            "supplier_name": supplier_name,
            "invoice_number": invoice_number,
            "invoice_date": invoice_date,
            "items": items
        }

    @staticmethod
    def _normalize_date(raw_date: str) -> str:
        formats = [
            "%d-%b-%y", "%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y",
            "%Y-%m-%d", "%d.%m.%Y", "%d %b %Y", "%d %b %y"
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(raw_date, fmt)
                return dt.strftime("%Y-%m-%d")
            except Exception:
                continue
        return datetime.now().strftime("%Y-%m-%d")

    @classmethod
    def _parse_table_line(cls, line: str) -> Optional[Dict[str, Any]]:
        if re.search(r'\b(TOTAL|SUBTOTAL|TAX|GST|CGST|SGST|IGST|ROUND OFF|AMOUNT IN WORDS|DESCRIPTION|PARTICULARS|HSN|RATE)\b', line, re.IGNORECASE):
            if len(line.split()) < 4 or line.upper().startswith(("TOTAL", "SUBTOTAL", "GRAND TOTAL", "ROUND OFF")):
                return None

        pattern = re.compile(
            r'^(?:\d+[\s.-]+)?(.+?)\s+(\d+(?:\.\d{1,2})?)\s*(KGS?|NOS?|PKTS?|PACKETS?|BOX|BAGS?|PCS?)?\s+(?:₹\s*)?(\d+(?:\.\d{1,2})?)\s+(?:₹\s*)?(\d+(?:\.\d{1,2})?)$',
            re.IGNORECASE
        )
        m = pattern.match(line)
        if m:
            desc = m.group(1).strip()
            qty = float(m.group(2))
            unit_str = (m.group(3) or "PKT").upper()
            rate = float(m.group(4))
            total = float(m.group(5))
            pack_ratio, unit_desc, packets, cost_per_packet = cls._deduce_pack_ratio(desc, qty, unit_str, rate, total)

            return {
                "supplier_item": desc,
                "invoiced_qty": qty,
                "unit_description": unit_desc,
                "pack_ratio": pack_ratio,
                "packets": packets,
                "purchase_cost": cost_per_packet,
                "line_total": total,
                "batch_number": f"INW-{datetime.now().strftime('%m%d')}"
            }

        simple_pattern = re.compile(r'^(?:\d+[\s.-]+)?(.+?)\s+(\d+(?:\.\d{1,2})?)\s+(?:₹\s*)?(\d+(?:\.\d{1,2})?)$')
        m2 = simple_pattern.match(line)
        if m2 and len(m2.group(1).strip()) > 3:
            desc = m2.group(1).strip()
            qty = float(m2.group(2))
            rate = float(m2.group(3))
            total = qty * rate
            pack_ratio, unit_desc, packets, cost_per_packet = cls._deduce_pack_ratio(desc, qty, "PKT", rate, total)
            return {
                "supplier_item": desc,
                "invoiced_qty": qty,
                "unit_description": unit_desc,
                "pack_ratio": pack_ratio,
                "packets": packets,
                "purchase_cost": cost_per_packet,
                "line_total": total,
                "batch_number": f"INW-{datetime.now().strftime('%m%d')}"
            }

        return None

    @classmethod
    def _parse_csv_lines(cls, lines: List[str]) -> List[Dict[str, Any]]:
        items = []
        reader = csv.reader(lines)
        for row in reader:
            if len(row) >= 3:
                desc = row[0].strip()
                if desc.lower() in ["item", "description", "product", "particulars", ""]:
                    continue
                try:
                    qty = float(re.sub(r'[^\d.]', '', row[1]))
                    rate = float(re.sub(r'[^\d.]', '', row[2]))
                    total = float(re.sub(r'[^\d.]', '', row[3])) if len(row) > 3 else qty * rate
                    pack_ratio, unit_desc, packets, cost_per_packet = cls._deduce_pack_ratio(desc, qty, "PKT", rate, total)
                    items.append({
                        "supplier_item": desc,
                        "invoiced_qty": qty,
                        "unit_description": unit_desc,
                        "pack_ratio": pack_ratio,
                        "packets": packets,
                        "purchase_cost": cost_per_packet,
                        "line_total": total,
                        "batch_number": f"INW-{datetime.now().strftime('%m%d')}"
                    })
                except Exception:
                    continue
        return items

    @staticmethod
    def _deduce_pack_ratio(desc: str, qty: float, unit_str: str, rate: float, total: float):
        lower_desc = desc.lower()
        pack_ratio = 1.0
        unit_desc = "1 Packet"

        if "2.5" in lower_desc or "2.5kg" in lower_desc or "2.5 kg" in lower_desc:
            pack_ratio = 2.5
            unit_desc = "2.5 KG / Packet"
        elif "2.0" in lower_desc or "2kg" in lower_desc or "2 kg" in lower_desc:
            pack_ratio = 2.0
            unit_desc = "2.0 KG / Packet"
        elif "1kg" in lower_desc or "1 kg" in lower_desc or "1.0kg" in lower_desc:
            pack_ratio = 1.0
            unit_desc = "1 KG / Packet"
        elif "500g" in lower_desc or "500 gm" in lower_desc:
            pack_ratio = 1.0
            unit_desc = "500g Packet"
        elif "tortilla" in lower_desc and unit_str.startswith("NOS"):
            pack_ratio = 10.0
            unit_desc = "10 Nos / Packet"
        elif ("box" in lower_desc or "packaging" in lower_desc) and qty >= 50:
            pack_ratio = 100.0
            unit_desc = "100 Nos / Pack"
        else:
            pack_ratio = 1.0
            unit_desc = f"1 {unit_str.capitalize() if unit_str else 'Packet'}"

        packets = qty / pack_ratio if pack_ratio > 0 else qty
        packets = round(packets, 2)
        if packets.is_integer():
            packets = int(packets)

        cost_per_packet = round(total / packets, 2) if packets > 0 else rate

        return pack_ratio, unit_desc, packets, cost_per_packet

    @classmethod
    def _match_item_to_catalogue(cls, supplier_item: str, all_products: List[Product], cat_map: Dict[str, str]) -> Dict[str, Any]:
        cleaned_item = re.sub(r'[^\w\s]', ' ', supplier_item.lower()).strip()
        item_tokens = set(cleaned_item.split())

        best_prod = None
        best_score = 0.0

        for p in all_products:
            p_name = p.name.lower()
            p_sku = p.sku.lower()
            cleaned_p_name = re.sub(r'[^\w\s]', ' ', p_name).strip()
            p_tokens = set(cleaned_p_name.split())

            if p_sku in cleaned_item or cleaned_p_name in cleaned_item or cleaned_item in cleaned_p_name:
                score = 0.95
            else:
                common_tokens = item_tokens.intersection(p_tokens)
                token_score = len(common_tokens) / max(len(p_tokens), 1)
                seq_score = SequenceMatcher(None, cleaned_item, cleaned_p_name).ratio()
                score = (token_score * 0.6) + (seq_score * 0.4)

            if score > best_score:
                best_score = score
                best_prod = p

        if best_score >= 0.65 and best_prod:
            cat_code = cat_map.get(best_prod.category_id, "VEG")
            return {
                "is_matched": True,
                "confidence": round(best_score * 100, 1),
                "product_id": best_prod.id,
                "sku": best_prod.sku,
                "product_name": best_prod.name,
                "suggested_category_code": cat_code,
                "suggested_sku": best_prod.sku
            }
        else:
            suggested_cat = cls._infer_category(supplier_item)
            suggested_sku = cls._generate_suggested_sku(suggested_cat, all_products)
            return {
                "is_matched": False,
                "confidence": round(best_score * 100, 1),
                "product_id": None,
                "sku": None,
                "product_name": None,
                "suggested_category_code": suggested_cat,
                "suggested_sku": suggested_sku
            }

    @staticmethod
    def _infer_category(item_name: str) -> str:
        name = item_name.lower()
        if any(w in name for w in ["chicken", "patty", "nugget", "popcorn", "momos", "tortilla", "meat", "wings"]):
            return "CHICKEN"
        if any(w in name for w in ["fries", "veg", "triangles", "corn", "paneer", "potato", "spring roll"]):
            return "VEG"
        if any(w in name for w in ["cheese", "mozzarella", "slice", "cheddar", "dairy"]):
            return "CHEESE"
        if any(w in name for w in ["sauce", "mayo", "ketchup", "dip", "mustard", "tandoori"]):
            return "SAUCES"
        if any(w in name for w in ["box", "packaging", "cup", "wrap", "container", "kraft"]):
            return "PACKAGING"
        if any(w in name for w in ["syrup", "mojito", "crush", "beverage", "soda"]):
            return "MOJITOS"
        if any(w in name for w in ["breading", "powder", "seasoning", "marinade", "mix"]):
            return "BREADING"
        if any(w in name for w in ["spice", "chilli", "turmeric", "pepper"]):
            return "SPICES"
        return "VEG"

    @staticmethod
    def _generate_suggested_sku(category_code: str, all_products: List[Product]) -> str:
        prefix = f"RAIS-{category_code[:3].upper()}-"
        existing_nums = []
        for p in all_products:
            if p.sku and p.sku.startswith(prefix):
                num_part = p.sku.replace(prefix, "")
                if num_part.isdigit():
                    existing_nums.append(int(num_part))
        next_num = max(existing_nums, default=0) + 1
        return f"{prefix}{next_num:02d}"
