import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem

logger = logging.getLogger(__name__)

class RecommendationService:
    """
    Intelligent, read-only customer recommendation and restock affinity service.
    Analyzes historical purchasing patterns for a customer to recommend relevant,
    in-stock products (e.g. Pizza Boxes, Burger Boxes, Oregano, Peri-Peri, Sauces).
    
    Guarantees:
    1. Single Source of Truth: ONLY recommends products where Product.current_stock > 0 and is_active is True.
    2. Zero Price Printing: Never displays or includes product pricing in the recommendation text.
    3. Fail-Safe: All queries are safely guarded; on any exception, gracefully returns None.
    4. Kill-Switch Compliant: Instantly disabled if settings.ENABLE_RESTOCK_SUGGESTIONS is False.
    """

    @classmethod
    def get_customer_restock_suggestion(
        cls,
        db: Session,
        customer_id: Optional[str] = None,
        exclude_product_ids: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates a dynamic in-stock restock recommendation for a customer.
        Returns a dict with product name and packaging unit (NO PRICE) or None.
        """
        # Kill-switch guard
        if not getattr(settings, "ENABLE_RESTOCK_SUGGESTIONS", True):
            return None

        if not db:
            return None

        exclude_ids = set(exclude_product_ids or [])

        try:
            detected_affinities = set()

            if customer_id:
                # 1. Fetch recent invoice items for this customer (last 100 items from past invoices)
                recent_items = (
                    db.query(InvoiceItem.item_description, InvoiceItem.product_id)
                    .join(Invoice, Invoice.id == InvoiceItem.invoice_id)
                    .filter(Invoice.customer_id == customer_id)
                    .order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())
                    .limit(100)
                    .all()
                )

                for desc, pid in recent_items:
                    text = (desc or "").upper()
                    if any(w in text for w in ["PIZZA", "MOZEROLLA", "MOZZARELLA", "BASE 9", "BASE 8", "BASE 7"]):
                        detected_affinities.add("PIZZA")
                    if any(w in text for w in ["BURGER", "PATTY", "BUN"]):
                        detected_affinities.add("BURGER")
                    if any(w in text for w in ["FRIES", "MOMO", "NUGGET", "POPCORN", "POPS", "SWEET CORN"]):
                        detected_affinities.add("SNACKS")
                    if any(w in text for w in ["TORTILLAH", "TORTILLA", "WRAP"]):
                        detected_affinities.add("WRAP")

            # 2. Build target SKU / Keyword affinity lists based on detected profile
            target_skus = []
            target_keywords = []

            if "PIZZA" in detected_affinities:
                # Prioritize Pizza Boxes and Pizza seasonings/sauces
                target_skus.extend(["RAIS-BOX-01", "RAIS-BOX-03", "RAIS-BRD-04", "RAIS-SAU-06"])
                target_keywords.extend(["PIZZA BOX", "OREGANO"])

            if "BURGER" in detected_affinities:
                # Prioritize Burger Boxes and Mayo
                target_skus.extend(["RAIS-BOX-02", "RAIS-BOX-04", "RAIS-BOX-05", "RAIS-SAU-04", "RAIS-SAU-08"])
                target_keywords.extend(["BURGER BOX", "MAYO"])

            if "SNACKS" in detected_affinities:
                # Prioritize Peri Peri, Ketchup sachets, Breading
                target_skus.extend(["RAIS-BRD-03", "RAIS-SAU-03", "RAIS-SAU-07", "RAIS-BRD-02"])
                target_keywords.extend(["PERI PERI", "KETCHUP"])

            if "WRAP" in detected_affinities:
                target_skus.extend(["RAIS-SAU-04", "RAIS-BRD-02", "RAIS-SAU-08"])

            # 3. Step A: Try matching against target SKUs that are IN STOCK and NOT excluded
            for sku in target_skus:
                prod = (
                    db.query(Product)
                    .filter(
                        Product.sku == sku,
                        Product.is_active == True,
                        Product.current_stock > 0
                    )
                    .first()
                )
                if prod and str(prod.id) not in exclude_ids:
                    return cls._format_suggestion(prod, detected_affinities)

            # 4. Step B: Try matching against target keywords in Product.name that are IN STOCK
            for kw in target_keywords:
                prod = (
                    db.query(Product)
                    .filter(
                        Product.is_active == True,
                        Product.current_stock > 0,
                        func.upper(Product.name).like(f"%{kw}%")
                    )
                    .order_by(Product.current_stock.desc())
                    .first()
                )
                if prod and str(prod.id) not in exclude_ids:
                    return cls._format_suggestion(prod, detected_affinities)

            # 5. Step C: Fallback to any active packaging product with stock > 0
            packaging_cat = db.query(Category).filter(Category.code == "PACKAGING").first()
            if packaging_cat:
                fallback_pkg = (
                    db.query(Product)
                    .filter(
                        Product.category_id == packaging_cat.id,
                        Product.is_active == True,
                        Product.current_stock > 0
                    )
                    .order_by(Product.current_stock.desc())
                    .first()
                )
                if fallback_pkg and str(fallback_pkg.id) not in exclude_ids:
                    return cls._format_suggestion(fallback_pkg, detected_affinities)

            # 6. Step D: General fallback to any fast-moving in-stock product not on this bill
            general_fallback = (
                db.query(Product)
                .filter(
                    Product.is_active == True,
                    Product.current_stock > 0
                )
                .order_by(Product.current_stock.desc())
                .first()
            )
            if general_fallback and str(general_fallback.id) not in exclude_ids:
                return cls._format_suggestion(general_fallback, detected_affinities)

            return None

        except Exception as e:
            logger.warning(f"Recommendation calculation failed gracefully: {e}", exc_info=True)
            return None

    @classmethod
    def _format_suggestion(cls, product: Product, affinities: set) -> Dict[str, Any]:
        """
        Formats product suggestion for print and WhatsApp templates.
        STRICTLY OMITS ANY PRICES.
        """
        clean_name = product.name.strip()
        unit = (product.packaging_unit or "PACKET").strip()

        # Context-aware title headline without prices
        if "PIZZA" in affinities and ("PIZZA" in clean_name.upper() or "BOX" in clean_name.upper()):
            context_note = "In Stock for your Pizzas"
        elif "BURGER" in affinities and ("BURGER" in clean_name.upper() or "BOX" in clean_name.upper()):
            context_note = "In Stock for your Burgers"
        elif "BOX" in clean_name.upper() or "PACK" in clean_name.upper():
            context_note = "In Stock at Packaging Depot"
        else:
            context_note = "In Stock at Depot"

        display_text = f"📦 {context_note}: {clean_name} ({unit})"

        return {
            "product_id": str(product.id),
            "sku": product.sku,
            "name": clean_name,
            "packaging_unit": unit,
            "context_note": context_note,
            "display_text": display_text
        }
