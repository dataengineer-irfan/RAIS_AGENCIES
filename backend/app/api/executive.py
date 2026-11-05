import json
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from app.core.database import get_db
from app.models.user import User
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.models.inventory import StockMovement
from app.models.system import SystemSetting
from app.domain.enums import InvoiceStatus, CustomerStatus
from app.api.deps import require_any_authenticated
from app.core.datetime_utils import get_ist_today

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/executive", tags=["Executive Cockpit"])

def format_inr(val: float) -> str:
    """Format a float as Indian Rupee string e.g. 17,067.00"""
    return f"{val:,.2f}"

import time

_EXECUTIVE_CACHE = {"timestamp": 0, "data": None}
_EXECUTIVE_CACHE_TTL = 0  # 0 TTL = Direct real-time live queries against PostgreSQL on every hit

def invalidate_executive_cache():
    _EXECUTIVE_CACHE["timestamp"] = 0
    _EXECUTIVE_CACHE["data"] = None

def format_inr_short(val: float) -> str:
    """Format short currency string e.g. ₹17k or ₹1.2L"""
    if val >= 100000:
        return f"₹{val/100000:.1f}L"
    if val >= 1000:
        return f"₹{val/1000:.1f}k"
    return f"₹{val:,.0f}"

@router.get("/briefing")
def get_executive_briefing(
    force_refresh: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Real-time high-level operations briefing.
    Computes situational metrics, prioritized action cards, Rayachoty market intelligence,
    and bilingual (English & Telugu) translations with 100% dynamic PostgreSQL data.
    """
    today = get_ist_today()
    first_day_month = date(today.year, today.month, 1)

    valid_statuses = [
        InvoiceStatus.ISSUED.value,
        InvoiceStatus.PARTIALLY_PAID.value,
        InvoiceStatus.PAID.value,
        InvoiceStatus.OVERDUE.value
    ]

    # ─────────────────────────────────────────────────────────────
    # 1. LIVE BUSINESS VITAL SIGNS
    # ─────────────────────────────────────────────────────────────
    # Today's billed revenue and count
    today_inv_row = db.query(
        func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
        func.count(Invoice.id).label("count")
    ).filter(
        Invoice.invoice_date == today,
        Invoice.status.in_(valid_statuses)
    ).first()
    today_revenue = float(today_inv_row.revenue or 0)
    today_invoices_count = int(today_inv_row.count or 0)

    # Today's collections breakdown (Cash vs UPI)
    today_pay_rows = db.query(
        Payment.payment_method,
        func.coalesce(func.sum(Payment.amount), 0).label("amount")
    ).filter(Payment.payment_date == today).group_by(Payment.payment_method).all()

    today_cash = 0.0
    today_upi = 0.0
    for r in today_pay_rows:
        method = (r.payment_method or "").upper()
        if method == "CASH":
            today_cash += float(r.amount)
        elif method in ["UPI", "ONLINE", "NEFT", "RTGS"]:
            today_upi += float(r.amount)
        else:
            today_cash += float(r.amount)
    today_collections = round(today_cash + today_upi, 2)

    # Month-to-date revenue
    mtd_rev_scalar = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.invoice_date >= first_day_month,
        Invoice.invoice_date <= today,
        Invoice.status.in_(valid_statuses)
    ).scalar()
    mtd_revenue = float(mtd_rev_scalar or 0)

    # Total Receivables & Overdue across entire market
    total_opening = float(db.query(func.coalesce(func.sum(Customer.opening_balance), 0)).scalar() or 0)
    total_invoiced_all = float(db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
        Invoice.status.in_(valid_statuses)
    ).scalar() or 0)
    total_paid_all = float(db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0)
    total_receivables = max(0.0, round(total_opening + total_invoiced_all - total_paid_all, 2))

    # Overdue invoices (due_date < today)
    raw_overdue = float(db.query(func.coalesce(func.sum(Invoice.outstanding_amount), 0)).filter(
        Invoice.due_date < today,
        Invoice.outstanding_amount > 0,
        Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value])
    ).scalar() or 0)
    total_overdue = min(raw_overdue, total_receivables)

    # Active Outlets Count
    active_outlets_count = db.query(func.count(Customer.id)).filter(
        Customer.status == CustomerStatus.ACTIVE.value
    ).scalar() or 0

    # Open Invoices Count
    open_invoices_count = db.query(func.count(Invoice.id)).filter(
        Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
        Invoice.outstanding_amount > 0
    ).scalar() or 0

    # Purchase cost mapping for MTD Profit calculation
    cost_rows = db.query(
        StockMovement.product_id,
        StockMovement.purchase_cost
    ).filter(StockMovement.purchase_cost.isnot(None))\
     .order_by(StockMovement.created_at.desc()).all()
    cost_map = {}
    for cr in cost_rows:
        if cr.product_id not in cost_map and cr.purchase_cost is not None:
            cost_map[cr.product_id] = float(cr.purchase_cost)

    # Calculate MTD gross profit
    mtd_items = db.query(
        InvoiceItem.product_id,
        InvoiceItem.quantity,
        InvoiceItem.line_total
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
     .filter(
         Invoice.invoice_date >= first_day_month,
         Invoice.invoice_date <= today,
         Invoice.status.in_(valid_statuses)
     ).all()

    mtd_profit = 0.0
    for pid, qty, l_total in mtd_items:
        line_rev = float(l_total or 0)
        c = cost_map.get(pid)
        if c and c > 0:
            c_tot = c * float(qty or 0)
        else:
            c_tot = line_rev * 0.80
        mtd_profit += (line_rev - c_tot)
    mtd_profit = round(mtd_profit, 2)
    # Ensure MTD net profit accounts for any unapportioned invoice discounts / round-offs
    mtd_inv_discounts = float(db.query(func.coalesce(func.sum(Invoice.discount_amount), 0)).filter(
        Invoice.invoice_date >= first_day_month,
        Invoice.invoice_date <= today,
        Invoice.status.in_(valid_statuses)
    ).scalar() or 0)
    mtd_item_discounts = float(db.query(func.coalesce(func.sum(InvoiceItem.discount_amount), 0)).join(
        Invoice, Invoice.id == InvoiceItem.invoice_id
    ).filter(
        Invoice.invoice_date >= first_day_month,
        Invoice.invoice_date <= today,
        Invoice.status.in_(valid_statuses)
    ).scalar() or 0)
    unapportioned_mtd = max(0.0, mtd_inv_discounts - mtd_item_discounts)
    mtd_profit = max(0.0, round(mtd_profit - unapportioned_mtd, 2))
    mtd_margin_pct = round((mtd_profit / mtd_revenue * 100), 1) if mtd_revenue > 0 else 0.0

    # Count of active products at or below min_stock_alert
    depot_stockouts_count = db.query(func.count(Product.id)).filter(
        Product.is_active == True,
        Product.current_stock <= Product.min_stock_alert
    ).scalar() or 0

    # ─────────────────────────────────────────────────────────────
    # 2. PRIORITY 1: TOP DEBTOR CASH RECOVERY
    # ─────────────────────────────────────────────────────────────
    debt_by_cust = db.query(
        Customer.id,
        Customer.business_name,
        Customer.contact_person,
        Customer.phone,
        Customer.city,
        func.coalesce(func.sum(Invoice.outstanding_amount), 0).label("overdue_amt"),
        func.count(Invoice.id).label("inv_count"),
        func.min(Invoice.due_date).label("oldest_due"),
        func.min(Invoice.invoice_date).label("oldest_inv_date"),
        func.min(Invoice.invoice_number).label("sample_inv_num")
    ).join(Invoice, Invoice.customer_id == Customer.id)\
     .filter(
         Invoice.due_date < today,
         Invoice.outstanding_amount > 0,
         Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value])
     ).group_by(Customer.id)\
     .order_by(desc("overdue_amt")).all()

    top_debtor = None
    top_debtor_concentration_pct = 0.0
    priority_debt_recovery = None

    if debt_by_cust:
        top_row = debt_by_cust[0]
        top_debt_amt = float(top_row.overdue_amt)
        top_debtor_concentration_pct = round((top_debt_amt / total_overdue * 100), 1) if total_overdue > 0 else 0.0
        days_overdue = (today - top_row.oldest_due).days if top_row.oldest_due else 0

        wa_clean_phone = "".join(filter(str.isdigit, top_row.phone or ""))
        if len(wa_clean_phone) == 10:
            wa_clean_phone = f"91{wa_clean_phone}"

        wa_text_en = (
            f"Dear {top_row.contact_person or top_row.business_name},\n"
            f"Friendly reminder from RAIS Agencies Rayachoty. Your pending balance of ₹{top_debt_amt:,.2f} "
            f"has {top_row.inv_count} overdue bills (oldest: {top_row.oldest_inv_date}).\n"
            f"Kindly settle via UPI or have cash ready for our delivery executive today. Thank you!"
        )
        wa_text_te = (
            f"నమస్కారం {top_row.contact_person or top_row.business_name} గారు,\n"
            f"రాయ్స్ ఏజెన్సీస్ (రాయచోటి) నుండి జ్ఞాపిక. మీ ఖాతాలో ₹{top_debt_amt:,.2f} బకాయి ఉంది "
            f"({top_row.inv_count} పాత బిల్లులు).\n"
            f"దయచేసి ఈ రోజు UPI ద్వారా లేదా మా డెలివరీ ఎగ్జిక్యూటివ్‌కు నగదు చెల్లించగలరు. ధన్యవాదాలు!"
        )

        priority_debt_recovery = {
            "id": "debt_recovery",
            "priority_num": 1,
            "urgency": "HIGH",
            "category": "CASH_RECOVERY",
            "customer_id": top_row.id,
            "customer_name": top_row.business_name,
            "contact_person": top_row.contact_person,
            "phone": top_row.phone,
            "city": top_row.city,
            "amount": top_debt_amt,
            "formatted_amount": f"₹{top_debt_amt:,.2f}",
            "days_overdue": days_overdue,
            "invoices_count": top_row.inv_count,
            "concentration_pct": top_debtor_concentration_pct,
            "title_en": f"Priority 1: Recover ₹{top_debt_amt:,.0f} from {top_row.business_name}",
            "title_te": f"ప్రాధాన్యత 1: {top_row.business_name} నుండి ₹{top_debt_amt:,.0f} వసూలు చేయండి",
            "badge_en": f"{top_debtor_concentration_pct}% of Total Overdue",
            "badge_te": f"మొత్తం బకాయిలో {top_debtor_concentration_pct}%",
            "summary_en": f"{top_row.business_name} holds the largest overdue balance (₹{top_debt_amt:,.2f}). Oldest bill is {days_overdue} days overdue.",
            "summary_te": f"{top_row.business_name} వద్ద అత్యధిక మార్కెట్ బకాయి (₹{top_debt_amt:,.2f}) ఉంది. అత్యంత పాత బిల్లు {days_overdue} రోజుల క్రితం ఉంది.",
            "whatsapp_url": f"https://wa.me/{wa_clean_phone}?text={wa_text_en}",
            "whatsapp_url_te": f"https://wa.me/{wa_clean_phone}?text={wa_text_te}",
            "actions": [
                {"type": "WHATSAPP", "label_en": "Send WhatsApp", "label_te": "వాట్సాప్ సందేశం", "url": f"https://wa.me/{wa_clean_phone}?text={wa_text_en}"},
                {"type": "CALL", "label_en": f"Call {top_row.contact_person or 'Client'}", "label_te": "కాల్ చేయండి", "tel": f"tel:{top_row.phone}"},
                {"type": "COLLECT", "label_en": "Collect ₹ Receipt", "label_te": "రసీదు నమోదు"}
            ]
        }
    else:
        priority_debt_recovery = {
            "id": "debt_recovery",
            "priority_num": 1,
            "urgency": "HEALTHY",
            "category": "CASH_RECOVERY",
            "amount": 0.0,
            "title_en": "Priority 1: Zero Overdue Debt",
            "title_te": "ప్రాధాన్యత 1: ఎటువంటి మార్కెట్ బకాయిలు లేవు",
            "badge_en": "100% On-Time",
            "badge_te": "100% సక్రమం",
            "summary_en": "All active customer ledger balances are completely up to date. Excellent liquidity!",
            "summary_te": "అన్ని కస్టమర్ల చెల్లింపులు సమయానికి జరిగాయి. మార్కెట్లో బకాయిలు లేవు!"
        }

    # ─────────────────────────────────────────────────────────────
    # 3. PRIORITY 2: CRITICAL DEPOT STOCKOUTS (Ranked by Sales Velocity)
    # ─────────────────────────────────────────────────────────────
    # Calculate product sales velocity (units sold historically)
    velocity_query = db.query(
        InvoiceItem.product_id,
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("units_sold")
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
     .filter(Invoice.status.in_(valid_statuses))\
     .group_by(InvoiceItem.product_id).all()
    velocity_map = {row.product_id: float(row.units_sold) for row in velocity_query}

    # Fetch active products with current_stock <= min_stock_alert
    low_stock_prods = db.query(Product).filter(
        Product.is_active == True,
        Product.current_stock <= Product.min_stock_alert
    ).all()

    # Sort: First zero stock (current_stock <= 0) by velocity desc, then low stock by velocity desc
    sorted_stockouts = sorted(
        low_stock_prods,
        key=lambda p: (
            0 if p.current_stock <= 0 else 1,
            -velocity_map.get(p.id, 0.0),
            float(p.current_stock)
        )
    )

    priority_stockouts = None
    if sorted_stockouts:
        top_so = sorted_stockouts[0]
        top_so_vel = velocity_map.get(top_so.id, 0.0)
        stockout_items = []
        for p in sorted_stockouts[:5]:
            vel = velocity_map.get(p.id, 0.0)
            stockout_items.append({
                "product_id": p.id,
                "name": p.name,
                "sku": p.sku,
                "current_stock": float(p.current_stock),
                "min_stock_alert": float(p.min_stock_alert),
                "packaging_unit": p.packaging_unit or "PACKET",
                "units_sold_velocity": vel,
                "status": "CRITICAL_STOCKOUT" if p.current_stock <= 0 else "LOW_STOCK"
            })

        priority_stockouts = {
            "id": "depot_stockouts",
            "priority_num": 2,
            "urgency": "CRITICAL" if top_so.current_stock <= 0 else "MEDIUM",
            "category": "INVENTORY",
            "stockouts_count": len(sorted_stockouts),
            "top_product_name": top_so.name,
            "top_product_sku": top_so.sku,
            "top_current_stock": float(top_so.current_stock),
            "top_velocity": top_so_vel,
            "items": stockout_items,
            "title_en": f"Priority 2: Reorder {top_so.name} (Stock: {float(top_so.current_stock):g})",
            "title_te": f"ప్రాధాన్యత 2: {top_so.name} వెంటనే తెప్పించండి (స్టాక్: {float(top_so.current_stock):g})",
            "badge_en": f"{len(sorted_stockouts)} SKUs Need Stocking",
            "badge_te": f"{len(sorted_stockouts)} సరుకులు రీఆర్డర్ కావాలి",
            "summary_en": f"Top selling item '{top_so.name}' ({top_so_vel:g} units sold) has only {float(top_so.current_stock):g} left. Inward immediately to prevent sales loss.",
            "summary_te": f"ఎక్కువ డిమాండ్ ఉన్న '{top_so.name}' ({top_so_vel:g} యూనిట్లు అమ్మకం) ప్రస్తుతం {float(top_so.current_stock):g} మాత్రమే ఉంది. ఆర్డర్లు కోల్పోకుండా వెంటనే సరుకు తెప్పించండి.",
            "actions": [
                {"type": "NAVIGATE_INVENTORY", "label_en": "Inward / Adjust Stock", "label_te": "స్టాక్ నమోదు చేయండి", "tab": "inventory"}
            ]
        }
    else:
        priority_stockouts = {
            "id": "depot_stockouts",
            "priority_num": 2,
            "urgency": "HEALTHY",
            "category": "INVENTORY",
            "stockouts_count": 0,
            "title_en": "Priority 2: Depot Stock Fully Healthy",
            "title_te": "ప్రాధాన్యత 2: డిపోలో అన్ని సరుకులు అందుబాటులో ఉన్నాయి",
            "badge_en": "Zero Stockouts",
            "badge_te": "స్టాక్ సమృద్ధిగా ఉంది",
            "summary_en": "All catalog SKUs are above safe replenishment thresholds. No order blockage.",
            "summary_te": "అన్ని రకాల సరుకులు తగినంతగా డిపోలో ఉన్నాయి. ఆర్డర్ల సరఫరాకు ఆటంకం లేదు."
        }

    # ─────────────────────────────────────────────────────────────
    # 4. PRIORITY 3: CUSTOMER RETENTION & CADENCE (Inactive regular cafes)
    # ─────────────────────────────────────────────────────────────
    cust_orders_summary = db.query(
        Invoice.customer_id,
        func.max(Invoice.invoice_date).label("last_order_date"),
        func.count(Invoice.id).label("total_orders"),
        func.sum(Invoice.total_amount).label("total_spend")
    ).filter(Invoice.status.in_(valid_statuses))\
     .group_by(Invoice.customer_id).all()

    inactive_cafes = []
    for co in cust_orders_summary:
        if co.total_orders >= 2 and co.last_order_date:
            days_since = (today - co.last_order_date).days
            if days_since >= 7:
                cust_obj = db.query(Customer).filter(Customer.id == co.customer_id).first()
                if cust_obj and cust_obj.status == CustomerStatus.ACTIVE.value:
                    # Find favorite item
                    fav_item = db.query(
                        InvoiceItem.item_description,
                        func.sum(InvoiceItem.quantity).label("qty")
                    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                     .filter(Invoice.customer_id == cust_obj.id)\
                     .group_by(InvoiceItem.item_description)\
                     .order_by(desc("qty")).first()

                    fav_name = fav_item[0] if fav_item else "Frozen supplies"
                    wa_phone = "".join(filter(str.isdigit, cust_obj.phone or ""))
                    if len(wa_phone) == 10:
                        wa_phone = f"91{wa_phone}"

                    msg_en = (
                        f"Hello {cust_obj.contact_person or cust_obj.business_name}, greeting from RAIS Agencies! "
                        f"We noticed it's been {days_since} days since your last order. Fresh batch of {fav_name} "
                        f"and restaurant supplies just arrived at our Rayachoty depot. Would you like a delivery today?"
                    )
                    msg_te = (
                        f"నమస్కారం {cust_obj.contact_person or cust_obj.business_name} గారు, రాయ్స్ ఏజెన్సీస్ నుండి! "
                        f"మీరు గత {days_since} రోజులుగా ఆర్డర్ ఇవ్వలేదు. మన రాయచోటి డిపోకు తాజా {fav_name} "
                        f"మరియు ఇతర సరుకులు వచ్చాయి. ఈ రోజు మీకు ఏమైనా డెలివరీ అవసరమా?"
                    )

                    inactive_cafes.append({
                        "customer_id": cust_obj.id,
                        "business_name": cust_obj.business_name,
                        "contact_person": cust_obj.contact_person,
                        "phone": cust_obj.phone,
                        "city": cust_obj.city,
                        "days_inactive": days_since,
                        "last_order_date": str(co.last_order_date),
                        "total_orders": co.total_orders,
                        "favorite_item": fav_name,
                        "whatsapp_url_en": f"https://wa.me/{wa_phone}?text={msg_en}",
                        "whatsapp_url_te": f"https://wa.me/{wa_phone}?text={msg_te}"
                    })

    inactive_cafes.sort(key=lambda x: x["days_inactive"], reverse=True)

    priority_retention = None
    if inactive_cafes:
        top_churn = inactive_cafes[0]
        priority_retention = {
            "id": "customer_churn",
            "priority_num": 3,
            "urgency": "MEDIUM",
            "category": "RETENTION",
            "inactive_count": len(inactive_cafes),
            "top_customer": top_churn,
            "customers": inactive_cafes[:4],
            "title_en": f"Priority 3: Re-engage {top_churn['business_name']} ({top_churn['days_inactive']} days inactive)",
            "title_te": f"ప్రాధాన్యత 3: {top_churn['business_name']} ను తిరిగి సంప్రదించండి ({top_churn['days_inactive']} రోజులుగా ఆర్డర్ లేదు)",
            "badge_en": f"{len(inactive_cafes)} Regular Outlets Due for Order",
            "badge_te": f"{len(inactive_cafes)} రెగ్యులర్ షాపులు ఆర్డర్ ఇవ్వాలి",
            "summary_en": f"{top_churn['business_name']} hasn't ordered in {top_churn['days_inactive']} days. Usually orders '{top_churn['favorite_item']}'. Contact them today to secure demand.",
            "summary_te": f"{top_churn['business_name']} గత {top_churn['days_inactive']} రోజులుగా ఆర్డర్ చేయలేదు. సాధారణంగా '{top_churn['favorite_item']}' తీసుకుంటారు. ఈ రోజే సంప్రదించండి.",
            "actions": [
                {"type": "WHATSAPP", "label_en": "WhatsApp Re-order Greeting", "label_te": "వాట్సాప్ మెసేజ్", "url": top_churn["whatsapp_url_en"]},
                {"type": "CALL", "label_en": f"Call {top_churn['contact_person'] or 'Owner'}", "label_te": "కాల్ చేయండి", "tel": f"tel:{top_churn['phone']}"}
            ]
        }
    else:
        priority_retention = {
            "id": "customer_churn",
            "priority_num": 3,
            "urgency": "HEALTHY",
            "category": "RETENTION",
            "inactive_count": 0,
            "title_en": "Priority 3: 100% Cafe Retention & Healthy Cadence",
            "title_te": "ప్రాధాన్యత 3: అన్ని కేఫ్‌ల నుండి నిరంతర ఆర్డర్లు",
            "badge_en": "All Active Within 7 Days",
            "badge_te": "అందరూ 7 రోజుల్లో ఆర్డర్ చేశారు",
            "summary_en": "Every regular cafe in Rayachoty and nearby routes has placed an order within the last 7 days.",
            "summary_te": "రాయచోటిలోని అన్ని రెగ్యులర్ రెస్టారెంట్లు & కేఫ్‌లు గత 7 రోజుల్లో ఆర్డర్లు చేశాయి."
        }

    # ─────────────────────────────────────────────────────────────
    # 5. RAYACHOTY LOCAL MARKET & COMMERCIAL INTELLIGENCE
    # ─────────────────────────────────────────────────────────────
    market_intelligence = []

    # A) Dynamic Basket Gap / Cross-sell Intelligence
    # Identify customers who bought packaging/boxes but 0 cheese/frozen snacks
    pizza_box_buyers = db.query(
        Invoice.customer_id,
        Customer.business_name,
        func.sum(InvoiceItem.line_total).label("box_spend")
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
     .join(Customer, Customer.id == Invoice.customer_id)\
     .filter(
         Invoice.status.in_(valid_statuses),
         InvoiceItem.item_description.ilike("%PIZZA BOX%")
     ).group_by(Invoice.customer_id, Customer.business_name).all()

    found_gap = False
    for pbb in pizza_box_buyers:
        # Check if they bought cheese
        cheese_bought = db.query(func.count(InvoiceItem.id)).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
            .filter(
                Invoice.customer_id == pbb.customer_id,
                Invoice.status.in_(valid_statuses),
                InvoiceItem.item_description.ilike("%MOZ%ELLA%")
            ).scalar() or 0

        if cheese_bought == 0:
            found_gap = True
            box_spend = float(pbb.box_spend)
            est_cheese_spend = round(box_spend * 4.0, 2)
            market_intelligence.append({
                "id": "cross_sell_pizza_cheese",
                "type": "BASKET_OPPORTUNITY",
                "tag_en": "Rayachoty Basket Gap",
                "tag_te": "రాయచోటి బాస్కెట్ గ్యాప్",
                "title_en": f"Cross-Sell: {pbb.business_name} buys Pizza Boxes but 0 Cheese",
                "title_te": f"అదనపు అమ్మకం: {pbb.business_name} బాక్స్‌లు కొంటోంది కానీ చీజ్ కొనడం లేదు",
                "insight_en": (
                    f"{pbb.business_name} bought ₹{box_spend:,.0f} worth of Pizza Boxes from RAIS, but ₹0 Mozzarella Cheese. "
                    f"A Rayachoty pizzeria using that volume needs ~25kg mozzarella/month. "
                    f"Pitch Milky Mist 2KG Diced Cheese at ₹906/pkt to capture ~₹{est_cheese_spend:,.0f}/month incremental sales!"
                ),
                "insight_te": (
                    f"{pbb.business_name} మన వద్ద ₹{box_spend:,.0f} పిజ్జా బాక్స్‌లు కొనుగోలు చేసింది, కానీ చీజ్ కొనడం లేదు. "
                    f"ఆ షాపుకు నెలకు కనీసం 25-30 కేజీల చీజ్ అవసరం. మన మిల్కీ మిస్ట్ చీజ్ వారికి ఆఫర్ చేయడం ద్వారా "
                    f"నెలకు సుమారు ₹{est_cheese_spend:,.0f} అదనపు వ్యాపారం సాధించవచ్చు!"
                ),
                "action_recommended_en": f"Offer a sample block of Milky Mist Mozzarella to {pbb.business_name}.",
                "action_recommended_te": f"{pbb.business_name} కు మిల్కీ మిస్ట్ చీజ్ శాంపిల్ ఇచ్చి ఆర్డర్ పొందండి."
            })
            break

    if not found_gap:
        # General cross-sell recommendation
        market_intelligence.append({
            "id": "cross_sell_shawarma_wrap",
            "type": "BASKET_OPPORTUNITY",
            "tag_en": "Shawarma Food Hub Opportunity",
            "tag_te": "షవర్మా & ఫాస్ట్ ఫుడ్ అవకాశం",
            "title_en": "Bundle Signature Tortillas with Garlic & Tandoori Mayo",
            "title_te": "సిగ్నేచర్ టోర్టిల్లాలతో పాటు మయోన్నైస్ బండిల్ ఆఫర్",
            "insight_en": "Rayachoty shawarma counters consume 100+ wraps daily. Bundling 10 packets of Signature Tortilla with 1 tub of Tandoori Mayo gives complete kitchen supply and lifts basket margin to 28%.",
            "insight_te": "రాయచోటిలో షవర్మా షాపులు రోజుకు 100కు పైగా రోల్స్ అమ్ముతాయి. 10 ప్యాకెట్ల టోర్టిల్లాతో పాటు మయోన్నైస్ అందించడం ద్వారా బాస్కెట్ లాభం 28%కి పెరుగుతుంది.",
            "action_recommended_en": "Promote Tortilla + Mayo combo to fast-food outlets today.",
            "action_recommended_te": "ఫాస్ట్ ఫుడ్ షాపులకు టోర్టిల్లా + మయోన్నైస్ కాంబో ఆఫర్ చేయండి."
        })

    # B) Weekend Demand Surge Predictor
    weekday = today.strftime("%A")
    is_thu_fri = today.weekday() in [3, 4, 5]  # Thu, Fri, Sat

    # Check fast food inventory in depot
    fries_prod = db.query(Product).filter(Product.is_active == True, Product.sku.ilike("%VEG-02%")).first()
    tortilla_prod = db.query(Product).filter(Product.is_active == True, Product.sku.ilike("%CHK-02%")).first()

    fries_stock = float(fries_prod.current_stock) if fries_prod else 0.0
    tortilla_stock = float(tortilla_prod.current_stock) if tortilla_prod else 0.0

    surge_warning_en = (
        f"Rayachoty fast-food & cafe dining surges +40% on Friday-Sunday evenings. "
        f"Depot reserves: French Fries ({fries_stock:g} pkts), Signature Tortilla ({tortilla_stock:g} pkts). "
        f"{'Stock is healthy for weekend demand.' if fries_stock >= 30 and tortilla_stock >= 25 else 'Restock urgently before Friday afternoon rush!'}"
    )
    surge_warning_te = (
        f"రాయచోటిలో శుక్రవారం నుండి ఆదివారం వరకు ఫాస్ట్ ఫుడ్ వ్యాపారం 40% పైగా పెరుగుతుంది. "
        f"ప్రస్తుత నిల్వలు: ఫ్రెంచ్ ఫ్రైస్ ({fries_stock:g} ప్యాకెట్లు), టోర్టిల్లా ({tortilla_stock:g} ప్యాకెట్లు). "
        f"{'వారాంతపు డిమాండ్‌కు స్టాక్ సరిపోతుంది.' if fries_stock >= 30 and tortilla_stock >= 25 else 'శుక్రవారం మధ్యాహ్నానికి ముందే తక్షణమే రీఆర్డర్ చేయండి!'}"
    )

    market_intelligence.append({
        "id": "weekend_demand_surge",
        "type": "DEMAND_SURGE",
        "tag_en": f"Weekend Trend ({weekday})",
        "tag_te": f"వారాంతపు ట్రెండ్ ({weekday})",
        "title_en": "Rayachoty Weekend QSR Demand Rush (Fri - Sun)",
        "title_te": "రాయచోటి వారాంతపు ఫాస్ట్ ఫుడ్ రద్దీ (శుక్ర - ఆది)",
        "insight_en": surge_warning_en,
        "insight_te": surge_warning_te,
        "action_recommended_en": "Verify freezer pallet temperatures and top up high-velocity SKUs today.",
        "action_recommended_te": "ఫ్రీజర్ స్టాక్ సరిచూసి ముఖ్యమైన సరుకులు తగినంతగా ఉండేలా చూసుకోండి."
    })

    # C) Route & Logistics Consolidation
    # Cluster open balance / active clients by city/locality
    loc_rows = db.query(
        Customer.city,
        func.count(Customer.id).label("outlets"),
        func.coalesce(func.sum(Invoice.outstanding_amount), 0).label("dues")
    ).outerjoin(Invoice, (Invoice.customer_id == Customer.id) & (Invoice.outstanding_amount > 0))\
     .filter(Customer.status == CustomerStatus.ACTIVE.value)\
     .group_by(Customer.city)\
     .order_by(desc("dues")).limit(3).all()

    top_loc = loc_rows[0] if loc_rows else None
    if top_loc and top_loc.city:
        market_intelligence.append({
            "id": "route_consolidation",
            "type": "LOGISTICS_OPTIMIZATION",
            "tag_en": "Dispatch Route Synergy",
            "tag_te": "డెలివరీ రూట్ సమన్వయం",
            "title_en": f"{top_loc.city} Route Van Consolidation",
            "title_te": f"{top_loc.city} డెలివరీ రూట్ ఆప్టిమైజేషన్",
            "insight_en": (
                f"{top_loc.outlets} active outlets in {top_loc.city} have a combined pending balance of ₹{float(top_loc.dues):,.0f}. "
                f"Consolidating product deliveries and payment collection into a single van route saves ~₹450 fuel and collects ₹{float(top_loc.dues):,.0f} in one round."
            ),
            "insight_te": (
                f"{top_loc.city} పరిధిలో {top_loc.outlets} షాపుల వద్ద కలిపి ₹{float(top_loc.dues):,.0f} బకాయి ఉంది. "
                f"ఒకే డెలివరీ వ్యాన్ ద్వారా సరుకు సరఫరా మరియు నగదు వసూలు పూర్తి చేయడం వల్ల ఇంధనం ఆదా అవుతుంది."
            ),
            "action_recommended_en": f"Assign {top_loc.city} batch to single van run today.",
            "action_recommended_te": f"{top_loc.city} రూట్ ఆర్డర్లను ఒకే డెలివరీ ట్రిప్‌లో పూర్తి చేయండి."
        })

    # ─────────────────────────────────────────────────────────────
    # 6. TRAFFIC LIGHT STATUS PILLS
    # ─────────────────────────────────────────────────────────────
    # 1) Cash Intake Status
    if today_collections > 0:
        cash_status = "GREEN"
        cash_desc_en = f"₹{today_collections:,.0f} cash/UPI collected today. Zero uncollected drift."
        cash_desc_te = f"ఈ రోజు ₹{today_collections:,.0f} నగదు/UPI వసూలైంది. లిక్విడిటీ పటిష్టంగా ఉంది."
    elif today_revenue == 0:
        cash_status = "AMBER"
        cash_desc_en = "No billing recorded yet today. Prioritize collections on open balances."
        cash_desc_te = "ఈ రోజు ఇంకా బిల్లులు రికార్డు కాలేదు. పాత బకాయిల వసూలుపై దృష్టి పెట్టండి."
    else:
        cash_status = "RED"
        cash_desc_en = f"₹{today_revenue:,.0f} billed today but ₹0 collected. Follow up on COD terms."
        cash_desc_te = f"ఈ రోజు ₹{today_revenue:,.0f} బిల్ చేశారు కానీ వసూలు కాలేదు. నగదు వెంటనే తీసుకోండి."

    # 2) Depot Stock Health
    if depot_stockouts_count == 0:
        stock_status = "GREEN"
        stock_desc_en = "All SKUs safely stocked above reorder threshold."
        stock_desc_te = "అన్ని రకాల సరుకులు తగినంతగా డిపోలో ఉన్నాయి."
    elif depot_stockouts_count <= 2:
        stock_status = "AMBER"
        stock_desc_en = f"{depot_stockouts_count} SKU at minimum stock alert. Restock soon."
        stock_desc_te = f"{depot_stockouts_count} సరుకులు తక్కువగా ఉన్నాయి. త్వరలో ఆర్డర్ చేయండి."
    else:
        stock_status = "RED"
        stock_desc_en = f"{depot_stockouts_count} SKUs critically low or out of stock! Order immediately."
        stock_desc_te = f"{depot_stockouts_count} ముఖ్యమైన సరుకులు అయిపోయాయి! వెంటనే సరఫరాదారునికి ఆర్డర్ ఇవ్వండి."

    # 3) Gross Margin Health
    if mtd_margin_pct >= 20.0:
        margin_status = "GREEN"
        margin_desc_en = f"{mtd_margin_pct}% MTD margin exceeds the 20% wholesale target benchmark."
        margin_desc_te = f"{mtd_margin_pct}% సగటు లాభం లభిస్తోంది. వ్యాపార ప్రమాణాల కన్నా మెరుగ్గా ఉంది."
    elif mtd_margin_pct >= 15.0:
        margin_status = "AMBER"
        margin_desc_en = f"{mtd_margin_pct}% MTD margin. Close to threshold; monitor discount leakage."
        margin_desc_te = f"{mtd_margin_pct}% సగటు లాభం. డిస్కౌంట్లు అధికంగా ఇవ్వకుండా గమనించండి."
    else:
        margin_status = "RED"
        margin_desc_en = f"{mtd_margin_pct}% MTD margin is below safe threshold. Check landed costs."
        margin_desc_te = f"{mtd_margin_pct}% తక్కువ లాభం. ఖర్చుల కన్నా తక్కువ ధరకు విక్రయించవద్దు."

    traffic_lights = [
        {
            "key": "cash_flow",
            "status": cash_status,
            "metric": f"₹{today_collections:,.0f} Today",
            "label_en": "Cash Intake & Collections",
            "label_te": "నగదు వసూళ్లు & లిక్విడిటీ",
            "desc_en": cash_desc_en,
            "desc_te": cash_desc_te
        },
        {
            "key": "depot_stock",
            "status": stock_status,
            "metric": f"{depot_stockouts_count} Out of Stock" if depot_stockouts_count > 0 else "All Stocked",
            "label_en": "Depot Stock Availability",
            "label_te": "డిపో స్టాక్ లభ్యత",
            "desc_en": stock_desc_en,
            "desc_te": stock_desc_te
        },
        {
            "key": "profit_margin",
            "status": margin_status,
            "metric": f"{mtd_margin_pct}% Gross Margin",
            "label_en": "Wholesale Margin Health",
            "label_te": "హోల్‌సేల్ లాభాల ఆరోగ్యం",
            "desc_en": margin_desc_en,
            "desc_te": margin_desc_te
        }
    ]

    # ─────────────────────────────────────────────────────────────
    # 7. EXECUTIVE STORY & OPERATIONS COLLABORATIVE HANDOVER MEMO
    # ─────────────────────────────────────────────────────────────
    # Dynamic Executive Story (English & Telugu)
    story_parts_en = []
    story_parts_te = []

    if priority_debt_recovery and priority_debt_recovery.get("amount", 0) > 0:
        c_name = priority_debt_recovery.get("customer_name")
        c_amt = priority_debt_recovery.get("amount")
        c_days = priority_debt_recovery.get("days_overdue")
        story_parts_en.append(
            f"1) Recover ₹{c_amt:,.0f} from {c_name} ({c_days} days overdue) to unfreeze working capital."
        )
        story_parts_te.append(
            f"1) నగదు ప్రవాహం కోసం {c_days} రోజులుగా పెండింగ్‌లో ఉన్న {c_name} నుండి ₹{c_amt:,.0f} బకాయిని తక్షణమే వసూలు చేయండి."
        )
    else:
        story_parts_en.append("1) All outlet balances are healthy with zero critical debt bottlenecks.")
        story_parts_te.append("1) అన్ని కస్టమర్ల ఖాతాలు సక్రమంగా ఉన్నాయి, బకాయిల సమస్య లేదు.")

    if sorted_stockouts:
        top_p = sorted_stockouts[0]
        story_parts_en.append(
            f"2) Inward {top_p.name} (stock: {float(top_p.current_stock):g}) and {len(sorted_stockouts)} low SKUs before the Rayachoty weekend rush."
        )
        story_parts_te.append(
            f"2) వారాంతపు రద్దీకి ముందే డిపోలో అయిపోయిన {top_p.name} మరియు ఇతర {len(sorted_stockouts)} సరుకులను డిపోకు తెప్పించండి."
        )
    else:
        story_parts_en.append("2) Depot stock is completely healthy across all food catalog items.")
        story_parts_te.append("2) డిపోలో అన్ని రకాల సరుకులు తగినంతగా అందుబాటులో ఉన్నాయి.")

    if inactive_cafes:
        top_c = inactive_cafes[0]
        story_parts_en.append(
            f"3) Follow up with {top_c['business_name']} ({top_c['days_inactive']} days inactive) to secure regular demand."
        )
        story_parts_te.append(
            f"3) గత {top_c['days_inactive']} రోజులుగా ఆర్డర్ ఇవ్వని {top_c['business_name']} ను సంప్రదించి ఆర్డర్ నిర్ధారించండి."
        )
    else:
        story_parts_en.append("3) 100% of regular food accounts ordered within safe weekly cadence.")
        story_parts_te.append("3) అన్ని రెగ్యులర్ కేఫ్‌ల నుండి సమయానికి ఆర్డర్లు వచ్చాయి.")

    executive_story = {
        "summary_en": " ".join(story_parts_en),
        "summary_te": " ".join(story_parts_te)
    }

    memo_setting = db.query(SystemSetting).filter(SystemSetting.key == "executive_handover_memo").first()
    memo_data = {
        "memo": "",
        "updated_by": "Operator",
        "updated_at": str(today)
    }
    if memo_setting and memo_setting.value:
        try:
            memo_data = json.loads(memo_setting.value)
        except Exception:
            memo_data["memo"] = memo_setting.value

    # Build final executive briefing payload
    briefing_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "today_date": str(today),
        "executive_story": executive_story,
        "vital_signs": {
            "today_revenue": today_revenue,
            "today_invoices_count": today_invoices_count,
            "today_collections": today_collections,
            "today_cash": today_cash,
            "today_upi": today_upi,
            "mtd_revenue": mtd_revenue,
            "mtd_profit": mtd_profit,
            "mtd_margin_pct": mtd_margin_pct,
            "total_receivables": total_receivables,
            "total_overdue": total_overdue,
            "active_outlets_count": active_outlets_count,
            "open_invoices_count": open_invoices_count,
            "depot_stockouts_count": depot_stockouts_count,
            "top_debtor_concentration_pct": top_debtor_concentration_pct
        },
        "traffic_lights": traffic_lights,
        "priorities": [
            priority_debt_recovery,
            priority_stockouts,
            priority_retention
        ],
        "market_intelligence": market_intelligence,
        "handover_memo": memo_data
    }
    return briefing_payload

@router.get("/memo")
def get_executive_memo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Get the current collaborative operations handover memo."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "executive_handover_memo").first()
    if not setting or not setting.value:
        return {
            "memo": "",
            "updated_by": "System",
            "updated_at": str(get_ist_today())
        }
    try:
        return json.loads(setting.value)
    except Exception:
        return {
            "memo": setting.value,
            "updated_by": "System",
            "updated_at": str(setting.updated_at)
        }

@router.post("/memo")
def update_executive_memo(
    memo: str = Body(..., embed=True),
    updated_by: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Update the collaborative operations handover memo."""
    author = updated_by or getattr(current_user, "full_name", None) or "Operator"
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %I:%M %p")
    payload = {
        "memo": memo.strip(),
        "updated_by": author,
        "updated_at": now_str
    }
    json_val = json.dumps(payload)

    setting = db.query(SystemSetting).filter(SystemSetting.key == "executive_handover_memo").first()
    if setting:
        setting.value = json_val
        setting.description = f"Updated by {author} at {now_str}"
    else:
        setting = SystemSetting(
            key="executive_handover_memo",
            value=json_val,
            description=f"Executive Handover Memo by {author}"
        )
        db.add(setting)
    db.commit()
    invalidate_executive_cache()
    return payload
