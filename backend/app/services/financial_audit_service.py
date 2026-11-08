import io
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.models.catalogue import Product
from app.services.customer_service import CustomerService
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.domain.enums import InvoiceStatus, AuditAction
from app.core.exceptions import EntityNotFoundException, InvalidFinancialOperationException

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    openpyxl = None
    Font = PatternFill = Alignment = Border = Side = get_column_letter = None

IST_OFFSET = timedelta(hours=5, minutes=30)

def get_seconds_delta(dt1: Optional[datetime], dt2: Optional[datetime]) -> float:
    if not dt1 or not dt2:
        return 999999.0
    if dt1.tzinfo is not None and dt2.tzinfo is None:
        dt2 = dt2.replace(tzinfo=dt1.tzinfo)
    elif dt2.tzinfo is not None and dt1.tzinfo is None:
        dt1 = dt1.replace(tzinfo=dt2.tzinfo)
    return abs((dt2 - dt1).total_seconds())

def to_ist_str(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        ist_dt = dt + IST_OFFSET
    else:
        ist_dt = dt.astimezone(timezone(IST_OFFSET))
    return ist_dt.strftime("%d-%b-%Y %I:%M:%S %p")

def to_date_str(d: Any) -> str:
    if not d:
        return ""
    if isinstance(d, datetime):
        return d.strftime("%d-%b-%Y")
    return d.strftime("%d-%b-%Y")

class FinancialAuditService:
    @staticmethod
    def scan_anomalies(db: Session) -> Dict[str, Any]:
        """
        Runs comprehensive deep financial integrity audit across all accounts, invoices, and payments.
        """
        customers = db.query(Customer).order_by(Customer.business_name).all()
        cust_ids = [c.id for c in customers]
        balances_map = CustomerService.get_customer_balances_map(db, cust_ids)

        # 1. Platform Totals
        valid_statuses = [InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.PAID.value, InvoiceStatus.OVERDUE.value]
        total_invoiced_query = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(Invoice.status.in_(valid_statuses)).scalar()
        total_collected_query = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar()
        total_invoices_count = db.query(func.count(Invoice.id)).filter(Invoice.status.in_(valid_statuses)).scalar() or 0
        total_payments_count = db.query(func.count(Payment.id)).scalar() or 0
        
        total_invoiced = Decimal(str(total_invoiced_query or "0.00"))
        total_collected = Decimal(str(total_collected_query or "0.00"))
        total_outstanding = sum(balances_map.values(), Decimal("0.00"))

        # 2. Rapid-Fire Duplicate Payment Detection (window <= 60s)
        payments = db.query(Payment).options(joinedload(Payment.customer)).order_by(Payment.customer_id, Payment.created_at).all()
        suspect_anomalies = []
        suspect_by_cust: Dict[str, List[Dict[str, Any]]] = {}

        for i in range(len(payments) - 1):
            p1 = payments[i]
            p2 = payments[i + 1]
            if p1.customer_id == p2.customer_id and p1.amount == p2.amount and p1.payment_method == p2.payment_method:
                delta = get_seconds_delta(p1.created_at, p2.created_at)
                if delta <= 60:
                    cust_obj = p1.customer
                    p1_date_str = str(p1.payment_date) if p1.payment_date else (p1.created_at.strftime('%Y-%m-%d') if p1.created_at else None)
                    p2_date_str = str(p2.payment_date) if p2.payment_date else (p2.created_at.strftime('%Y-%m-%d') if p2.created_at else None)
                    anomaly = {
                        "id": f"DUP-{p1.payment_number}-{p2.payment_number}",
                        "type": "RAPID_FIRE_DUPLICATE_PAYMENT",
                        "customer_id": p1.customer_id,
                        "customer_name": cust_obj.business_name if cust_obj else "Customer",
                        "customer_code": cust_obj.customer_code if cust_obj else "CUST",
                        "customer_phone": cust_obj.phone if cust_obj else "",
                        "customer_city": cust_obj.city if cust_obj else "",
                        "payment_1_number": p1.payment_number,
                        "payment_1_created_at": to_ist_str(p1.created_at),
                        "payment_1_time_ist": to_ist_str(p1.created_at),
                        "payment_1_date": p1_date_str,
                        "payment_1_iso": p1.created_at.isoformat() if p1.created_at else None,
                        "payment_2_number": p2.payment_number,
                        "payment_2_created_at": to_ist_str(p2.created_at),
                        "payment_2_time_ist": to_ist_str(p2.created_at),
                        "payment_2_date": p2_date_str,
                        "payment_2_iso": p2.created_at.isoformat() if p2.created_at else None,
                        "amount": float(p1.amount),
                        "payment_method": p1.payment_method,
                        "delta_seconds": round(delta, 1),
                        "allocations_p1": len(p1.allocations),
                        "allocations_p2": len(p2.allocations),
                        "severity": "HIGH" if delta < 10 else "MEDIUM",
                        "explanation": f"Two payments of ₹{p1.amount:.2f} ({p1.payment_method}) recorded {round(delta, 1)}s apart."
                    }
                    suspect_anomalies.append(anomaly)
                    if p1.customer_id not in suspect_by_cust:
                        suspect_by_cust[p1.customer_id] = []
                    suspect_by_cust[p1.customer_id].append(anomaly)

        total_at_risk = sum([a["amount"] for a in suspect_anomalies if a["severity"] == "HIGH"])

        # Quick snapshot of commercial margin leakage
        leakage_data = FinancialAuditService.get_margin_leakage_records(db)
        leakage_summary = leakage_data.get("summary", {})

        # 3. Customer Summaries
        cust_list = []
        for c in customers:
            bal = balances_map.get(c.id, Decimal("0.00"))
            c_anomalies = suspect_by_cust.get(c.id, [])
            c_risk = sum([a["amount"] for a in c_anomalies if a["severity"] == "HIGH"])
            reconciled_due = float(bal) + c_risk
            
            cust_list.append({
                "id": c.id,
                "code": c.customer_code,
                "name": c.business_name,
                "contact": c.contact_person,
                "phone": c.phone,
                "city": c.city,
                "opening_balance": float(c.opening_balance),
                "current_balance": float(bal),
                "has_anomaly": len(c_anomalies) > 0,
                "anomalies_count": len(c_anomalies),
                "suspect_duplicate_amount": c_risk,
                "reconciled_due": reconciled_due,
                "anomalies": c_anomalies
            })

        return {
            "summary": {
                "total_customers": len(customers),
                "total_invoices_count": int(total_invoices_count),
                "total_payments_count": int(total_payments_count),
                "total_invoiced": float(total_invoiced),
                "total_collected": float(total_collected),
                "total_outstanding": float(total_outstanding),
                "anomalies_count": len(suspect_anomalies),
                "high_severity_count": len([a for a in suspect_anomalies if a["severity"] == "HIGH"]),
                "total_at_risk_amount": float(total_at_risk),
                "margin_leakage_loss": leakage_summary.get("total_loss", 0.0),
                "margin_leakage_items_count": leakage_summary.get("total_items", 0)
            },
            "anomalies": suspect_anomalies,
            "customers": cust_list
        }

    @staticmethod
    def get_margin_leakage_records(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detects historical margin leakages where products were billed below procurement landed cost.
        """
        from app.models.inventory import StockMovement
        from app.models.user import User

        cost_rows = db.query(
            StockMovement.product_id,
            StockMovement.purchase_cost
        ).filter(StockMovement.purchase_cost.isnot(None))\
         .order_by(StockMovement.created_at.desc()).all()

        cost_map: Dict[str, Decimal] = {}
        for row in cost_rows:
            if row.product_id not in cost_map and row.purchase_cost is not None:
                cost_map[row.product_id] = Decimal(str(row.purchase_cost))

        valid_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]
        query = db.query(
            InvoiceItem,
            Invoice,
            Customer,
            Product,
            User
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .join(Customer, Customer.id == Invoice.customer_id)\
         .join(Product, Product.id == InvoiceItem.product_id)\
         .outerjoin(User, User.id == Invoice.created_by_id)\
         .filter(Invoice.status.in_(valid_statuses))

        if start_date:
            query = query.filter(Invoice.invoice_date >= start_date)
        if end_date:
            query = query.filter(Invoice.invoice_date <= end_date)

        rows = query.order_by(Invoice.invoice_date.desc(), Invoice.invoice_number.desc()).all()

        leakage_items = []
        total_loss = Decimal("0.00")
        affected_invoices = set()
        customer_loss_map: Dict[str, Decimal] = {}
        sku_loss_map: Dict[str, Dict[str, Any]] = {}

        term = search.strip().lower() if (isinstance(search, str) and search.strip()) else None

        for item, inv, cust, prod, user in rows:
            cost = cost_map.get(item.product_id)
            if cost is None:
                continue

            unit_price = Decimal(str(item.unit_price or "0"))
            if unit_price >= cost:
                continue

            qty = Decimal(str(item.quantity or "0"))
            unit_loss = cost - unit_price
            item_total_loss = unit_loss * qty

            if term:
                searchable = f"{inv.invoice_number} {cust.business_name} {prod.sku} {prod.name} {user.username if user else ''}".lower()
                if term not in searchable:
                    continue

            total_loss += item_total_loss
            affected_invoices.add(inv.id)

            customer_loss_map[cust.business_name] = customer_loss_map.get(cust.business_name, Decimal("0")) + item_total_loss

            if prod.sku not in sku_loss_map:
                sku_loss_map[prod.sku] = {"name": prod.name, "loss": Decimal("0")}
            sku_loss_map[prod.sku]["loss"] += item_total_loss

            classification = "CRITICAL_TYPO" if unit_price < (cost * Decimal("0.30")) else "BELOW_COST_DISCOUNT"

            leakage_items.append({
                "id": item.id,
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
                "customer_id": cust.id,
                "customer_name": cust.business_name,
                "product_id": prod.id,
                "sku": prod.sku,
                "product_name": prod.name,
                "packaging_unit": item.packaging_unit or prod.packaging_unit,
                "quantity": float(qty),
                "unit_price": float(unit_price),
                "landed_cost": float(cost),
                "unit_loss": float(unit_loss),
                "total_loss": float(item_total_loss),
                "loss_pct": round(float((unit_loss / cost) * 100), 1) if cost > 0 else 0.0,
                "classification": classification,
                "billed_by": user.username if user else "admin"
            })

        leakage_items.sort(key=lambda x: x["total_loss"], reverse=True)

        worst_customer = max(customer_loss_map.items(), key=lambda x: x[1])[0] if customer_loss_map else None
        worst_customer_loss = float(max(customer_loss_map.values())) if customer_loss_map else 0.0

        worst_sku = max(sku_loss_map.items(), key=lambda x: x[1]["loss"]) if sku_loss_map else None

        summary = {
            "total_loss": round(float(total_loss), 2),
            "total_items": len(leakage_items),
            "total_invoices": len(affected_invoices),
            "worst_customer": worst_customer,
            "worst_customer_loss": round(worst_customer_loss, 2),
            "worst_sku": worst_sku[0] if worst_sku else None,
            "worst_sku_loss": round(float(worst_sku[1]["loss"]), 2) if worst_sku else 0.0,
            "worst_product_name": worst_sku[1]["name"] if worst_sku else None
        }

        return {
            "summary": summary,
            "items": leakage_items
        }

    @staticmethod
    def get_customer_statement_dossier(db: Session, customer_id: str) -> Dict[str, Any]:
        """
        Returns full detailed ledger, invoice list, and payments with exact timestamps for a single customer.
        """
        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise EntityNotFoundException("Customer", customer_id)

        inv_tot, pay_tot, bal = CustomerService.get_customer_balances(db, cust.id)
        ledger = CustomerService.get_customer_ledger(db, cust.id)
        invoices = db.query(Invoice).filter(Invoice.customer_id == cust.id).order_by(Invoice.invoice_date.asc(), Invoice.created_at.asc()).all()
        payments = db.query(Payment).filter(Payment.customer_id == cust.id).order_by(Payment.payment_date.asc(), Payment.created_at.asc()).all()

        # Identify any duplicate payments for this customer
        suspect_pay_ids = set()
        for i in range(len(payments) - 1):
            p1 = payments[i]
            p2 = payments[i + 1]
            if p1.amount == p2.amount and p1.payment_method == p2.payment_method:
                delta = get_seconds_delta(p1.created_at, p2.created_at)
                if delta <= 60:
                    suspect_pay_ids.add(p1.payment_number)
                    suspect_pay_ids.add(p2.payment_number)

        pay_map = {p.payment_number: p for p in payments}
        inv_map = {i.invoice_number: i for i in invoices}

        formatted_ledger = []
        for entry in ledger:
            is_suspect = str(entry.reference) in suspect_pay_ids
            dt_str = ""
            if entry.type == "PAYMENT" and entry.reference in pay_map:
                dt_str = to_ist_str(pay_map[entry.reference].created_at)
            elif entry.type == "INVOICE" and entry.reference in inv_map:
                dt_str = to_ist_str(inv_map[entry.reference].created_at)

            formatted_ledger.append({
                "date": str(entry.date),
                "timestamp_ist": dt_str,
                "type": entry.type,
                "reference": entry.reference,
                "description": entry.description,
                "debit": float(entry.debit),
                "credit": float(entry.credit),
                "running_balance": float(entry.running_balance),
                "is_suspect_duplicate": is_suspect
            })

        formatted_invoices = []
        for inv in invoices:
            items_list = []
            for itm in inv.items:
                items_list.append({
                    "description": itm.item_description or "Item",
                    "quantity": float(itm.quantity),
                    "unit_price": float(itm.unit_price),
                    "line_total": float(itm.line_total)
                })
            formatted_invoices.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": str(inv.invoice_date),
                "created_at_ist": to_ist_str(inv.created_at),
                "subtotal": float(inv.subtotal),
                "discount_amount": float(inv.discount_amount),
                "tax_amount": float(inv.tax_amount),
                "total_amount": float(inv.total_amount),
                "paid_amount": float(inv.paid_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status,
                "items_count": len(items_list),
                "items": items_list
            })

        formatted_payments = []
        for p in payments:
            alloc_list = []
            for a in p.allocations:
                inv_obj = db.query(Invoice).filter(Invoice.id == a.invoice_id).first()
                alloc_list.append({
                    "invoice_number": inv_obj.invoice_number if inv_obj else a.invoice_id[:8],
                    "amount": float(a.allocated_amount)
                })
            formatted_payments.append({
                "id": p.id,
                "payment_number": p.payment_number,
                "payment_date": str(p.payment_date),
                "created_at_ist": to_ist_str(p.created_at),
                "payment_method": p.payment_method,
                "reference_number": p.reference_number,
                "amount": float(p.amount),
                "allocated_amount": float(p.allocated_amount),
                "unallocated_amount": float(p.unallocated_amount),
                "notes": p.notes,
                "is_suspect_duplicate": p.payment_number in suspect_pay_ids,
                "allocations": alloc_list
            })

        return {
            "customer": {
                "id": cust.id,
                "customer_code": cust.customer_code,
                "business_name": cust.business_name,
                "contact_person": cust.contact_person,
                "phone": cust.phone,
                "address": f"{cust.address_line1}, {cust.city}",
                "opening_balance": float(cust.opening_balance),
                "total_invoiced": float(inv_tot),
                "total_paid": float(pay_tot),
                "current_balance": float(bal),
                "has_suspect_duplicates": len(suspect_pay_ids) > 0
            },
            "statement": formatted_ledger,
            "invoices": formatted_invoices,
            "payments": formatted_payments
        }

    @staticmethod
    def generate_excel_audit_workbook(
        db: Session,
        customer_ids: Optional[List[str]] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> bytes:
        """
        Dynamically generates a production-grade multi-tab Excel workbook.
        """
        if openpyxl is None:
            raise RuntimeError("The 'openpyxl' library is required for Excel export. Please ensure openpyxl is installed.")

        wb = openpyxl.Workbook()

        # Styles
        font_title = Font(name="Segoe UI", size=15, bold=True, color="FFFFFF")
        font_subtitle = Font(name="Segoe UI", size=10, italic=True, color="CBD5E1")
        font_sec_hdr = Font(name="Segoe UI", size=11, bold=True, color="0F172A")
        font_tbl_hdr = Font(name="Segoe UI", size=9, bold=True, color="FFFFFF")
        font_bold = Font(name="Segoe UI", size=9, bold=True, color="0F172A")
        font_regular = Font(name="Segoe UI", size=9, color="1E293B")
        font_warn = Font(name="Segoe UI", size=9, bold=True, color="B91C1C")

        fill_navy_hdr = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        fill_dark_sub = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        fill_tbl_hdr = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        fill_flagged = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
        fill_kpi_card = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        thin_side = Side(style='thin', color='E2E8F0')
        border_cell = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        double_bottom = Border(bottom=Side(style='double', color='0F172A'), top=Side(style='thin', color='0F172A'))

        CURRENCY_FORMAT = '"₹"#,##0.00'
        INTEGER_FORMAT = '#,##0'

        # Target customers
        query = db.query(Customer)
        if customer_ids and len(customer_ids) > 0:
            query = query.filter(Customer.id.in_(customer_ids))
        target_customers = query.order_by(Customer.business_name).all()

        if not target_customers:
            target_customers = db.query(Customer).order_by(Customer.business_name).limit(5).all()

        # ----------------------------------------------------------------------
        # TAB 1: EXECUTIVE AUDIT SUMMARY
        # ----------------------------------------------------------------------
        ws_sum = wb.active
        ws_sum.title = "Executive Summary"
        ws_sum.views.sheetView[0].showGridLines = True

        ws_sum.merge_cells("A1:H1")
        ws_sum["A1"] = "RAIS AGENCIES — FINANCIAL AUDIT & RECONCILIATION DOSSIER"
        ws_sum["A1"].font = font_title
        ws_sum["A1"].fill = fill_navy_hdr
        ws_sum["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws_sum.row_dimensions[1].height = 32

        now_ist_str = datetime.now(timezone(IST_OFFSET)).strftime('%d-%b-%Y, %I:%M %p IST')
        ws_sum.merge_cells("A2:H2")
        ws_sum["A2"] = f"Generated On: {now_ist_str} | Active Scope: {len(target_customers)} Customer Accounts"
        ws_sum["A2"].font = font_subtitle
        ws_sum["A2"].fill = fill_dark_sub
        ws_sum["A2"].alignment = Alignment(horizontal="center", vertical="center")
        ws_sum.row_dimensions[2].height = 20

        ws_sum.cell(row=4, column=1, value="1. CUSTOMER ACCOUNT RECONCILIATION SUMMARY").font = font_sec_hdr
        headers_sum = [
            "Customer Code", "Customer Name", "Opening Balance", "Total Invoiced", "Total Recorded Paid",
            "Current App Balance", "Suspect Duplicate Paid", "True Outstanding Balance"
        ]
        for col_idx, h in enumerate(headers_sum, 1):
            c = ws_sum.cell(row=5, column=col_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_tbl_hdr
            c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws_sum.row_dimensions[5].height = 25

        row_idx = 6
        tot_ob, tot_inv, tot_paid, tot_bal, tot_dup, tot_true = Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00")

        # Map suspect payments
        all_pays = db.query(Payment).order_by(Payment.customer_id, Payment.created_at).all()
        suspect_map: Dict[str, float] = {}
        for i in range(len(all_pays) - 1):
            p1 = all_pays[i]
            p2 = all_pays[i + 1]
            if p1.customer_id == p2.customer_id and p1.amount == p2.amount and p1.payment_method == p2.payment_method:
                delta = get_seconds_delta(p1.created_at, p2.created_at)
                if delta <= 15: # high severity rapid-fire
                    suspect_map[p1.customer_id] = suspect_map.get(p1.customer_id, 0.0) + float(p1.amount)

        # Pre-compute customer balances in batch (3 fast grouped queries)
        target_ids = [c.id for c in target_customers]
        balances_map = CustomerService.get_customer_balances_map(db, target_ids)

        valid_statuses = [InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.PAID.value, InvoiceStatus.OVERDUE.value]
        inv_rows = db.query(
            Invoice.customer_id,
            func.coalesce(func.sum(Invoice.total_amount), 0)
        ).filter(Invoice.customer_id.in_(target_ids), Invoice.status.in_(valid_statuses)).group_by(Invoice.customer_id).all()
        inv_map = {cid: Decimal(str(tot)) for cid, tot in inv_rows}

        pay_rows = db.query(
            Payment.customer_id,
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(Payment.customer_id.in_(target_ids)).group_by(Payment.customer_id).all()
        pay_map = {cid: Decimal(str(tot)) for cid, tot in pay_rows}

        for cust in target_customers:
            c_inv = inv_map.get(cust.id, Decimal("0.00"))
            c_paid = pay_map.get(cust.id, Decimal("0.00"))
            c_bal = balances_map.get(cust.id, Decimal("0.00"))
            c_dup = suspect_map.get(cust.id, 0.0)
            c_true = float(c_bal) + c_dup

            tot_ob += cust.opening_balance
            tot_inv += c_inv
            tot_paid += c_paid
            tot_bal += c_bal
            tot_dup += Decimal(str(c_dup))
            tot_true += Decimal(str(c_true))

            row_data = [
                cust.customer_code,
                cust.business_name,
                float(cust.opening_balance),
                float(c_inv),
                float(c_paid),
                float(c_bal),
                float(c_dup),
                float(c_true)
            ]
            for col_idx, val in enumerate(row_data, 1):
                c = ws_sum.cell(row=row_idx, column=col_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                if row_idx % 2 == 0:
                    c.fill = fill_zebra
                if col_idx in [1, 2]:
                    c.alignment = Alignment(horizontal="left", vertical="center")
                    if col_idx == 2:
                        c.font = font_bold
                else:
                    c.alignment = Alignment(horizontal="right", vertical="center")
                    c.number_format = CURRENCY_FORMAT
                    if col_idx == 7 and c_dup > 0:
                        c.font = font_warn
                        c.fill = fill_flagged
                    elif col_idx == 8 and c_dup > 0:
                        c.font = font_bold
                        c.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
            ws_sum.row_dimensions[row_idx].height = 20
            row_idx += 1

        # Totals
        ws_sum.cell(row=row_idx, column=1, value="TOTALS").font = font_bold
        ws_sum.cell(row=row_idx, column=3, value=float(tot_ob)).number_format = CURRENCY_FORMAT
        ws_sum.cell(row=row_idx, column=4, value=float(tot_inv)).number_format = CURRENCY_FORMAT
        ws_sum.cell(row=row_idx, column=5, value=float(tot_paid)).number_format = CURRENCY_FORMAT
        ws_sum.cell(row=row_idx, column=6, value=float(tot_bal)).number_format = CURRENCY_FORMAT
        ws_sum.cell(row=row_idx, column=7, value=float(tot_dup)).number_format = CURRENCY_FORMAT
        ws_sum.cell(row=row_idx, column=8, value=float(tot_true)).number_format = CURRENCY_FORMAT
        for c in range(1, 9):
            ws_sum.cell(row=row_idx, column=c).border = double_bottom
            ws_sum.cell(row=row_idx, column=c).font = font_bold
            if c >= 3:
                ws_sum.cell(row=row_idx, column=c).alignment = Alignment(horizontal="right", vertical="center")
        ws_sum.row_dimensions[row_idx].height = 22

        # ----------------------------------------------------------------------
        # TAB 2: MARGIN LEAKAGE FORENSICS (BELOW LANDED COST)
        # ----------------------------------------------------------------------
        leakage_res = FinancialAuditService.get_margin_leakage_records(db)
        leakage_items = leakage_res.get("items", [])
        leakage_sum = leakage_res.get("summary", {})

        ws_leak = wb.create_sheet(title="Margin Leakage Forensics")
        ws_leak.views.sheetView[0].showGridLines = True

        ws_leak.merge_cells("A1:L1")
        ws_leak["A1"] = "HISTORICAL MARGIN LEAKAGE AUDIT (SOLD BELOW REAL PROCUREMENT COST)"
        ws_leak["A1"].font = font_title
        ws_leak["A1"].fill = PatternFill(start_color="991B1B", end_color="991B1B", fill_type="solid")
        ws_leak["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws_leak.row_dimensions[1].height = 30

        ws_leak.merge_cells("A2:L2")
        ws_leak["A2"] = f"Total Cash Loss: ₹{float(leakage_sum.get('total_loss', 0)):,.2f} | Affected Line Items: {len(leakage_items)} across {leakage_sum.get('total_invoices', 0)} distinct invoices"
        ws_leak["A2"].font = font_subtitle
        ws_leak["A2"].fill = fill_dark_sub
        ws_leak["A2"].alignment = Alignment(horizontal="center", vertical="center")
        ws_leak.row_dimensions[2].height = 20

        leak_hdrs = [
            "Date", "Invoice #", "Customer Outlet", "SKU", "Product Name", "Unit",
            "Qty", "Billed Rate (₹)", "Landed Cost (₹)", "Unit Loss (₹)", "Total Loss (₹)", "Diagnosis"
        ]
        for col_idx, h in enumerate(leak_hdrs, 1):
            c = ws_leak.cell(row=4, column=col_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_tbl_hdr
            c.alignment = Alignment(horizontal="center", vertical="center")
        ws_leak.row_dimensions[4].height = 24

        l_row = 5
        tot_l_qty = 0.0
        tot_l_loss = 0.0

        for item in leakage_items:
            tot_l_qty += float(item.get("quantity", 0))
            tot_l_loss += float(item.get("total_loss", 0))
            diag = "Typo / Fatal Rate (<30% Cost)" if item.get("classification") == "CRITICAL_TYPO" else "Wholesale Below Cost"
            l_vals = [
                item.get("invoice_date", ""),
                item.get("invoice_number", ""),
                item.get("customer_name", ""),
                item.get("sku", ""),
                item.get("product_name", ""),
                item.get("packaging_unit", "PKT"),
                float(item.get("quantity", 0)),
                float(item.get("unit_price", 0)),
                float(item.get("landed_cost", 0)),
                float(item.get("unit_loss", 0)),
                float(item.get("total_loss", 0)),
                diag
            ]
            for col_idx, val in enumerate(l_vals, 1):
                c = ws_leak.cell(row=l_row, column=col_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                if item.get("classification") == "CRITICAL_TYPO":
                    c.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                elif l_row % 2 == 0:
                    c.fill = fill_zebra
                
                if col_idx in [1, 2, 4, 6, 12]:
                    c.alignment = Alignment(horizontal="center", vertical="center")
                elif col_idx in [7, 8, 9, 10, 11]:
                    c.alignment = Alignment(horizontal="right", vertical="center")
                    if col_idx in [8, 9, 10, 11]:
                        c.number_format = CURRENCY_FORMAT
                    else:
                        c.number_format = INTEGER_FORMAT
                else:
                    c.alignment = Alignment(horizontal="left", vertical="center")
            ws_leak.row_dimensions[l_row].height = 20
            l_row += 1

        # Leakage Totals Row
        ws_leak.cell(row=l_row, column=1, value="TOTAL MARGIN LEAKAGE").font = font_bold
        ws_leak.cell(row=l_row, column=7, value=float(tot_l_qty)).number_format = INTEGER_FORMAT
        ws_leak.cell(row=l_row, column=11, value=float(tot_l_loss)).number_format = CURRENCY_FORMAT
        for c in range(1, 13):
            ws_leak.cell(row=l_row, column=c).border = double_bottom
            ws_leak.cell(row=l_row, column=c).font = font_bold
            if c in [7, 11]:
                ws_leak.cell(row=l_row, column=c).alignment = Alignment(horizontal="right", vertical="center")
        ws_leak.row_dimensions[l_row].height = 22

        # Format ws_leak column widths
        ws_leak.column_dimensions['A'].width = 14
        ws_leak.column_dimensions['B'].width = 20
        ws_leak.column_dimensions['C'].width = 26
        ws_leak.column_dimensions['D'].width = 16
        ws_leak.column_dimensions['E'].width = 32
        ws_leak.column_dimensions['F'].width = 12
        ws_leak.column_dimensions['G'].width = 10
        ws_leak.column_dimensions['H'].width = 14
        ws_leak.column_dimensions['I'].width = 14
        ws_leak.column_dimensions['J'].width = 14
        ws_leak.column_dimensions['K'].width = 16
        ws_leak.column_dimensions['L'].width = 28

        # ----------------------------------------------------------------------
        # TAB 2..N: CUSTOMER SPECIFIC SHEETS
        # ----------------------------------------------------------------------
        # Generate detailed statement tabs for requested customers or accounts with anomalies
        if customer_ids and len(customer_ids) > 0:
            detail_customers = [c for c in target_customers if c.id in customer_ids][:10]
        else:
            detail_customers = [c for c in target_customers if c.id in suspect_map][:5]
            if not detail_customers:
                detail_customers = target_customers[:3]

        for cust in detail_customers:
            clean_name = cust.business_name[:25].replace("/", "-").replace("\\", "-").replace(":", "-").replace("*", "").replace("?", "").replace("[", "").replace("]", "")
            ws = wb.create_sheet(title=clean_name)
            ws.views.sheetView[0].showGridLines = True

            c_inv = inv_map.get(cust.id, Decimal("0.00"))
            c_paid = pay_map.get(cust.id, Decimal("0.00"))
            bal = balances_map.get(cust.id, Decimal("0.00"))
            ledger = CustomerService.get_customer_ledger(db, cust.id)
            payments = db.query(Payment).filter(Payment.customer_id == cust.id).order_by(Payment.payment_date.asc(), Payment.created_at.asc()).all()

            # Find suspect payments for this customer
            c_suspects = set()
            for i in range(len(payments) - 1):
                p1 = payments[i]
                p2 = payments[i + 1]
                if p1.amount == p2.amount and p1.payment_method == p2.payment_method:
                    if abs((p2.created_at - p1.created_at).total_seconds()) <= 60:
                        c_suspects.add(p1.payment_number)
                        c_suspects.add(p2.payment_number)

            p_times = {p.payment_number: to_ist_str(p.created_at) for p in payments}

            # Header
            ws.merge_cells("A1:I1")
            ws["A1"] = f"{cust.business_name} ({cust.customer_code}) — CHRONOLOGICAL STATEMENT"
            ws["A1"].font = font_title
            ws["A1"].fill = fill_navy_hdr
            ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
            ws.row_dimensions[1].height = 30

            ws.merge_cells("A2:I2")
            ws["A2"] = f"Phone: {cust.phone} | Opening: ₹{float(cust.opening_balance):,.2f} | Invoiced: ₹{float(c_inv):,.2f} | Paid: ₹{float(c_paid):,.2f} | Balance: ₹{float(bal):,.2f}"
            ws["A2"].font = font_subtitle
            ws["A2"].fill = fill_dark_sub
            ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
            ws.row_dimensions[2].height = 20

            ledger_hdrs = ["Date", "Timestamp (IST)", "Type", "Reference", "Description", "Debit (+Billed)", "Credit (-Paid)", "Running Balance", "Audit Flag"]
            for col_idx, h in enumerate(ledger_hdrs, 1):
                c = ws.cell(row=4, column=col_idx, value=h)
                c.font = font_tbl_hdr
                c.fill = fill_tbl_hdr
                c.alignment = Alignment(horizontal="center", vertical="center")
            ws.row_dimensions[4].height = 24

            cur_r = 5
            for entry in ledger:
                is_flagged = str(entry.reference) in c_suspects
                dt_str = p_times.get(entry.reference, "")

                row_vals = [
                    to_date_str(entry.date),
                    dt_str,
                    entry.type,
                    entry.reference,
                    entry.description,
                    float(entry.debit),
                    float(entry.credit),
                    float(entry.running_balance),
                    "⚠️ SUSPECT RAPID DUPLICATE" if is_flagged else "OK"
                ]
                for col_idx, val in enumerate(row_vals, 1):
                    c = ws.cell(row=cur_r, column=col_idx, value=val)
                    c.font = font_regular
                    c.border = border_cell
                    if is_flagged:
                        c.fill = fill_flagged
                        if col_idx in [4, 7, 9]:
                            c.font = font_warn
                    elif cur_r % 2 == 0:
                        c.fill = fill_zebra

                    if col_idx in [1, 2, 3]:
                        c.alignment = Alignment(horizontal="center", vertical="center")
                    elif col_idx in [6, 7, 8]:
                        c.alignment = Alignment(horizontal="right", vertical="center")
                        c.number_format = CURRENCY_FORMAT
                        if col_idx == 8:
                            c.font = font_bold
                    else:
                        c.alignment = Alignment(horizontal="left", vertical="center")
                ws.row_dimensions[cur_r].height = 19
                cur_r += 1

        # ----------------------------------------------------------------------
        # FINAL TAB: ITEMIZED PRODUCT SALES BREAKDOWN
        # ----------------------------------------------------------------------
        ws_items = wb.create_sheet(title="Itemized Sales Breakdown")
        ws_items.views.sheetView[0].showGridLines = True

        ws_items.merge_cells("A1:I1")
        ws_items["A1"] = "ITEMIZED PRODUCT SALES (ORDERS IN AUDIT SCOPE)"
        ws_items["A1"].font = font_title
        ws_items["A1"].fill = fill_navy_hdr
        ws_items["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws_items.row_dimensions[1].height = 30

        item_hdrs = ["Customer", "Invoice #", "Invoice Date", "SKU", "Item Description", "Packaging Unit", "Quantity", "Rate (₹)", "Line Total (₹)"]
        for col_idx, h in enumerate(item_hdrs, 1):
            c = ws_items.cell(row=3, column=col_idx, value=h)
            c.font = font_tbl_hdr
            c.fill = fill_tbl_hdr
            c.alignment = Alignment(horizontal="center", vertical="center")
        ws_items.row_dimensions[3].height = 24

        i_row = 4
        # Single fast joined query for invoice items
        detail_ids = [c.id for c in detail_customers]
        items_query = db.query(
            Customer.business_name,
            Invoice.invoice_number,
            Invoice.invoice_date,
            InvoiceItem.product_id,
            InvoiceItem.item_description,
            InvoiceItem.quantity,
            InvoiceItem.unit_price,
            InvoiceItem.line_total
        ).join(Invoice, Invoice.customer_id == Customer.id)\
         .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id)\
         .filter(Customer.id.in_(detail_ids))\
         .order_by(Invoice.invoice_date.asc()).all()

        prods = {p.id: p for p in db.query(Product).all()}

        for b_name, inv_num, inv_dt, p_id, desc, qty, rate, line_tot in items_query:
            prod = prods.get(p_id)
            vals = [
                b_name,
                inv_num,
                to_date_str(inv_dt),
                prod.sku if prod else "SKU",
                prod.name if prod else (desc or "Item"),
                prod.packaging_unit if prod else "PKT",
                float(qty),
                float(rate),
                float(line_tot)
            ]
            for col_idx, val in enumerate(vals, 1):
                c = ws_items.cell(row=i_row, column=col_idx, value=val)
                c.font = font_regular
                c.border = border_cell
                if i_row % 2 == 0:
                    c.fill = fill_zebra
                if col_idx in [1, 2, 3, 4, 6]:
                    c.alignment = Alignment(horizontal="center", vertical="center")
                elif col_idx in [7, 8, 9]:
                    c.alignment = Alignment(horizontal="right", vertical="center")
                    if col_idx in [8, 9]:
                        c.number_format = CURRENCY_FORMAT
                    else:
                        c.number_format = INTEGER_FORMAT
                else:
                    c.alignment = Alignment(horizontal="left", vertical="center")
            ws_items.row_dimensions[i_row].height = 19
            i_row += 1

        # Format column widths explicitly for high speed
        ws_sum.column_dimensions['A'].width = 16
        ws_sum.column_dimensions['B'].width = 28
        ws_sum.column_dimensions['C'].width = 18
        ws_sum.column_dimensions['D'].width = 18
        ws_sum.column_dimensions['E'].width = 20
        ws_sum.column_dimensions['F'].width = 20
        ws_sum.column_dimensions['G'].width = 22
        ws_sum.column_dimensions['H'].width = 24

        ws_items.column_dimensions['A'].width = 24
        ws_items.column_dimensions['B'].width = 20
        ws_items.column_dimensions['C'].width = 14
        ws_items.column_dimensions['D'].width = 18
        ws_items.column_dimensions['E'].width = 30
        ws_items.column_dimensions['F'].width = 16
        ws_items.column_dimensions['G'].width = 12
        ws_items.column_dimensions['H'].width = 14
        ws_items.column_dimensions['I'].width = 16

        for ws_c in wb.worksheets:
            if ws_c not in [ws_sum, ws_items, ws_leak]:
                ws_c.column_dimensions['A'].width = 14
                ws_c.column_dimensions['B'].width = 22
                ws_c.column_dimensions['C'].width = 12
                ws_c.column_dimensions['D'].width = 20
                ws_c.column_dimensions['E'].width = 32
                ws_c.column_dimensions['F'].width = 16
                ws_c.column_dimensions['G'].width = 16
                ws_c.column_dimensions['H'].width = 18
                ws_c.column_dimensions['I'].width = 26

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def resolve_phantom_payment(db: Session, payment_number: str, reason: str, user_id: Optional[str], username: Optional[str]) -> Dict[str, Any]:
        """
        Safely removes a confirmed phantom double-click payment and recalculates customer ledger.
        """
        payment = db.query(Payment).filter(Payment.payment_number == payment_number).first()
        if not payment:
            raise EntityNotFoundException("Payment", payment_number)

        customer = payment.customer
        amount = payment.amount
        c_id = customer.id

        AuditService.log(
            db=db,
            action=AuditAction.DELETE,
            entity_name="Payment",
            entity_id=payment.id,
            user_id=user_id,
            username=username,
            user_role="ADMIN",
            before_state={
                "payment_number": payment.payment_number,
                "amount": str(amount),
                "customer": customer.business_name,
                "reason": reason
            }
        )

        db.delete(payment)
        db.commit()

        # Recalculate customer balance
        inv_tot, pay_tot, bal = CustomerService.get_customer_balances(db, c_id)

        return {
            "success": True,
            "message": f"Phantom duplicate payment {payment_number} (₹{amount:.2f}) was successfully removed.",
            "customer_id": c_id,
            "customer_name": customer.business_name,
            "new_balance": float(bal)
        }
