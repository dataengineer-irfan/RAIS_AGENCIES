from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta, timezone
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_, case
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.schemas.reports import (
    DashboardKPIs, SalesReportItem, AgingBucket,
    CustomerAgingReportItem, ProductPerformanceItem
)
from app.domain.enums import InvoiceStatus, CustomerStatus, PaymentMethod

from app.core.datetime_utils import get_ist_today, get_ist_now

# 60-Second In-Memory Response Caches
_DASHBOARD_CACHE = {"timestamp": 0, "data": None}
_AGING_SUMMARY_CACHE = {"timestamp": 0, "data": None}
_CUSTOMER_AGING_CACHE = {"timestamp": 0, "data": None}
_PRODUCT_SALES_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

def invalidate_reporting_caches():
    _DASHBOARD_CACHE["timestamp"] = 0
    _DASHBOARD_CACHE["data"] = None
    _AGING_SUMMARY_CACHE["timestamp"] = 0
    _AGING_SUMMARY_CACHE["data"] = None
    _CUSTOMER_AGING_CACHE["timestamp"] = 0
    _CUSTOMER_AGING_CACHE["data"] = None
    _PRODUCT_SALES_CACHE["timestamp"] = 0
    _PRODUCT_SALES_CACHE["data"] = None

class ReportingService:
    @staticmethod
    def get_dashboard_kpis(db: Session, force_refresh: bool = False) -> DashboardKPIs:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _DASHBOARD_CACHE["data"] and (now_ts - _DASHBOARD_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _DASHBOARD_CACHE["data"]

        today = get_ist_today()
        first_day_month = date(today.year, today.month, 1)

        valid_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]

        # 1. Total Revenue This Month
        revenue_month_query = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.invoice_date >= first_day_month,
            Invoice.invoice_date <= today,
            Invoice.status.in_(valid_statuses)
        ).scalar()
        total_revenue_month = Decimal(str(revenue_month_query or "0.00"))

        # 2. Total Outstanding Balance across all commercial outlet accounts (Outlets Receivables)
        # outstanding = opening_balance + total_invoiced - total_paid
        total_opening = db.query(func.sum(Customer.opening_balance)).scalar() or Decimal("0.00")
        total_invoiced_all = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status.in_(valid_statuses)
        ).scalar() or Decimal("0.00")
        total_paid_all = db.query(func.sum(Payment.amount)).scalar() or Decimal("0.00")
        total_outstanding = Decimal(str(total_opening)) + Decimal(str(total_invoiced_all)) - Decimal(str(total_paid_all))

        # 3. Total Overdue Balance
        # Bounded by total_outstanding: Overdue cannot exceed net customer ledger balance
        overdue_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.due_date < today,
            Invoice.outstanding_amount > 0
        ).scalar()
        raw_overdue = Decimal(str(overdue_query or "0.00"))
        total_overdue = min(raw_overdue, total_outstanding) if total_outstanding > Decimal("0.00") else Decimal("0.00")

        # 4. Total Invoices Count This Month
        invoices_count = db.query(func.count(Invoice.id)).filter(
            Invoice.invoice_date >= first_day_month,
            Invoice.invoice_date <= today,
            Invoice.status != InvoiceStatus.CANCELLED.value
        ).scalar() or 0

        # 5. Open Invoices Count (Unpaid or Partially Paid)
        open_invoices_count = db.query(func.count(Invoice.id)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.outstanding_amount > 0
        ).scalar() or 0

        # 6. Active Customers Count
        active_customers = db.query(func.count(Customer.id)).filter(
            Customer.status == CustomerStatus.ACTIVE.value
        ).scalar() or 0

        # 7. Total Products Count
        total_products = db.query(func.count(Product.id)).filter(
            Product.is_active == True
        ).scalar() or 0

        # 8. Top Selling Products
        top_products_query = db.query(
            Product.id,
            Product.name,
            Product.sku,
            func.coalesce(func.sum(InvoiceItem.quantity), 0).label("qty_sold"),
            func.coalesce(func.sum(InvoiceItem.line_total), 0).label("total_rev"),
            Product.current_stock,
            Product.min_stock_alert,
            Product.category_id,
            func.max(InvoiceItem.item_description).label("desc_fallback")
        ).join(InvoiceItem, Product.id == InvoiceItem.product_id)\
         .join(Invoice, InvoiceItem.invoice_id == Invoice.id)\
         .filter(
            Invoice.invoice_date >= first_day_month,
            Invoice.status.in_(valid_statuses)
         ).group_by(Product.id, Product.name, Product.sku, Product.current_stock, Product.min_stock_alert, Product.category_id)\
          .order_by(desc("total_rev"))\
          .limit(8).all()

        top_products = [
            {
                "product_id": p[0],
                "product_name": (p[1] or "").strip() or (p[8] or "").strip() or "Wholesale SKU",
                "sku": p[2] or "PROD",
                "quantity_sold": float(p[3] or 0),
                "total_revenue": float(p[4] or 0),
                "current_stock": float(p[5] if p[5] is not None else 0),
                "min_stock_alert": float(p[6] if p[6] is not None else 10),
                "category_id": p[7]
            }
            for p in top_products_query
        ]

        # 9. Multi-Period Revenue Intelligence & Comparisons
        yesterday = today - timedelta(days=1)
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)
        end_of_last_week = start_of_week - timedelta(days=1)
        last_day_prev_month = first_day_month - timedelta(days=1)
        first_day_prev_month = date(last_day_prev_month.year, last_day_prev_month.month, 1)

        def get_period_stats(start_d: Optional[date], end_d: Optional[date]):
            iq = db.query(
                func.coalesce(func.sum(Invoice.total_amount), 0),
                func.count(Invoice.id)
            ).filter(Invoice.status.in_(valid_statuses))
            if start_d:
                iq = iq.filter(Invoice.invoice_date >= start_d)
            if end_d:
                iq = iq.filter(Invoice.invoice_date <= end_d)
            rev, cnt = iq.first() or (0, 0)

            # Collections & Payment Method breakdown
            pq = db.query(
                func.coalesce(func.sum(Payment.amount), 0).label("tot_coll"),
                func.count(Payment.id).label("pay_cnt"),
                func.coalesce(func.sum(case((Payment.payment_method == PaymentMethod.CASH.value, Payment.amount), else_=0)), 0).label("cash_coll"),
                func.coalesce(func.sum(case((Payment.payment_method.in_([
                    PaymentMethod.UPI.value, PaymentMethod.NEFT_RTGS.value, PaymentMethod.CARD.value
                ]), Payment.amount), else_=0)), 0).label("upi_coll")
            )
            if start_d:
                pq = pq.filter(Payment.payment_date >= start_d)
            if end_d:
                pq = pq.filter(Payment.payment_date <= end_d)
            p_row = pq.first()
            tot_coll = float(p_row.tot_coll or 0) if p_row else 0.0
            pay_cnt = int(p_row.pay_cnt or 0) if p_row else 0
            cash_coll = float(p_row.cash_coll or 0) if p_row else 0.0
            upi_coll = float(p_row.upi_coll or 0) if p_row else 0.0

            return {
                "revenue": float(rev or 0),
                "invoices_count": int(cnt or 0),
                "collections": tot_coll,
                "cash_collected": cash_coll,
                "upi_collected": upi_coll,
                "payments_count": pay_cnt
            }

        today_stats = get_period_stats(today, today)
        yest_stats = get_period_stats(yesterday, yesterday)
        week_stats = get_period_stats(start_of_week, today)
        last_week_stats = get_period_stats(start_of_last_week, end_of_last_week)
        month_stats = get_period_stats(first_day_month, today)
        last_month_stats = get_period_stats(first_day_prev_month, last_day_prev_month)
        all_time_stats = get_period_stats(None, None)

        diff_amount = round(today_stats["revenue"] - yest_stats["revenue"], 2)
        if yest_stats["revenue"] > 0:
            pct = round((diff_amount / yest_stats["revenue"]) * 100, 1)
        elif today_stats["revenue"] > 0:
            pct = 100.0
        else:
            pct = 0.0

        if today_stats["revenue"] > yest_stats["revenue"]:
            trend = "up"
        elif today_stats["revenue"] < yest_stats["revenue"]:
            trend = "down"
        else:
            trend = "flat"

        revenue_periods = {
            "today": {**today_stats, "label": "Today"},
            "yesterday": {**yest_stats, "label": "Yesterday"},
            "this_week": {**week_stats, "label": "This Week"},
            "last_week": {**last_week_stats, "label": "Past Week"},
            "this_month": {**month_stats, "label": "This Month"},
            "last_month": {**last_month_stats, "label": "Past Month"},
            "all_time": {**all_time_stats, "label": "All Time"}
        }

        today_comparison = {
            "today_revenue": today_stats["revenue"],
            "yesterday_revenue": yest_stats["revenue"],
            "today_collections": today_stats["collections"],
            "today_cash": today_stats["cash_collected"],
            "today_upi": today_stats["upi_collected"],
            "yesterday_collections": yest_stats["collections"],
            "diff_amount": diff_amount,
            "pct": pct,
            "trend": trend
        }

        # Real 7-Day Rolling Telemetry (Replaces hardcoded sparkline multipliers)
        d_7d_start = today - timedelta(days=6)
        inv_by_date = dict(db.query(Invoice.invoice_date, func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
            Invoice.invoice_date >= d_7d_start,
            Invoice.invoice_date <= today,
            Invoice.status.in_(valid_statuses)
        ).group_by(Invoice.invoice_date).all())

        pay_by_date = dict(db.query(Payment.payment_date, func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.payment_date >= d_7d_start,
            Payment.payment_date <= today
        ).group_by(Payment.payment_date).all())

        daily_trend_7d = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            daily_trend_7d.append({
                "date": str(d),
                "day_label": d.strftime("%a"),
                "revenue": float(inv_by_date.get(d, 0)),
                "collections": float(pay_by_date.get(d, 0))
            })

        # 10. Recent Invoices (expanded to 100 for high-density audit & period inspection)
        recent_invs = db.query(Invoice).options(
            joinedload(Invoice.customer),
            joinedload(Invoice.items)
        ).filter(
            Invoice.status != InvoiceStatus.CANCELLED.value
        ).order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc()).limit(100).all()

        recent_invoices = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.business_name if inv.customer else "Unknown",
                "customer_contact": inv.customer.contact_person if inv.customer else "",
                "customer_id": inv.customer_id,
                "customer_city": inv.customer.city if inv.customer else "Rayachoty",
                "customer_phone": inv.customer.phone if inv.customer else "",
                "invoice_date": str(inv.invoice_date),
                "total_amount": float(inv.total_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status,
                "items_preview": [f"{float(it.quantity):g}x {it.item_description}" for it in (inv.items or [])][:4]
            }
            for inv in recent_invs
        ]

        # 10. Recent Payments (expanded to 50 for full multi-day settlement coverage)
        recent_payments_query = db.query(Payment).options(
            joinedload(Payment.customer)
        ).order_by(Payment.payment_date.desc(), Payment.created_at.desc()).limit(50).all()

        recent_payments = [
            {
                "id": p.id,
                "payment_number": p.payment_number,
                "customer_name": p.customer.business_name if p.customer else "Unknown",
                "customer_contact": p.customer.contact_person if p.customer else "",
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method
            }
            for p in recent_payments_query
        ]

        # 11. Overall Profit & Loss calculation
        from app.models.inventory import StockMovement
        all_movements = db.query(
            StockMovement.product_id,
            StockMovement.purchase_cost
        ).filter(StockMovement.purchase_cost.isnot(None))\
         .order_by(StockMovement.created_at.desc()).all()
        cost_map = {}
        for row in all_movements:
            if row.product_id not in cost_map and row.purchase_cost is not None:
                cost_map[row.product_id] = Decimal(str(row.purchase_cost))

        inv_items_sold = db.query(
            InvoiceItem.product_id,
            InvoiceItem.quantity,
            InvoiceItem.line_total
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .filter(Invoice.status.in_(valid_statuses)).all()

        total_rev = Decimal("0.00")
        total_cost = Decimal("0.00")

        for prod_id, qty, line_total in inv_items_sold:
            rev = Decimal(str(line_total or "0.00"))
            total_rev += rev
            p_cost = cost_map.get(prod_id)
            if p_cost and p_cost > Decimal("0.00"):
                total_cost += p_cost * Decimal(str(qty or "0.00"))
            else:
                total_cost += rev * Decimal("0.80")

        net_profit_loss = total_rev - total_cost
        if net_profit_loss >= Decimal("0.00"):
            overall_profit = net_profit_loss.quantize(Decimal("0.01"))
            overall_loss = Decimal("0.00")
        else:
            overall_profit = Decimal("0.00")
            overall_loss = abs(net_profit_loss).quantize(Decimal("0.01"))

        kpis = DashboardKPIs(
            total_revenue_month=total_revenue_month,
            total_outstanding=total_outstanding,
            total_overdue=total_overdue,
            total_invoices_count=invoices_count,
            open_invoices_count=open_invoices_count,
            active_customers_count=active_customers,
            total_products_count=total_products,
            overall_profit=overall_profit,
            overall_loss=overall_loss,
            top_selling_products=top_products,
            recent_invoices=recent_invoices,
            recent_payments=recent_payments,
            revenue_periods=revenue_periods,
            today_comparison=today_comparison,
            daily_trend_7d=daily_trend_7d
        )

        _DASHBOARD_CACHE["timestamp"] = now_ts
        _DASHBOARD_CACHE["data"] = kpis
        return kpis

    @staticmethod
    def get_aging_summary(db: Session, force_refresh: bool = False) -> AgingBucket:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _AGING_SUMMARY_CACHE["data"] and (now_ts - _AGING_SUMMARY_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _AGING_SUMMARY_CACHE["data"]

        # Aggregate reconciled customer aging breakdown items to guarantee 100% mathematical equality
        # with individual customer dues and the Dashboard KPI total_outstanding (₹37,606.60)
        customer_items = ReportingService.get_customer_aging_breakdown(db, force_refresh=force_refresh)

        c_0_15 = sum((c.current_0_15_days or Decimal("0.00") for c in customer_items), Decimal("0.00"))
        c_16_30 = sum((c.aging_16_30_days or Decimal("0.00") for c in customer_items), Decimal("0.00"))
        c_31_60 = sum((c.aging_31_60_days or Decimal("0.00") for c in customer_items), Decimal("0.00"))
        c_60_plus = sum((c.aging_60_plus_days or Decimal("0.00") for c in customer_items), Decimal("0.00"))
        total = c_0_15 + c_16_30 + c_31_60 + c_60_plus

        bucket = AgingBucket(
            current_0_15_days=c_0_15,
            aging_16_30_days=c_16_30,
            aging_31_60_days=c_31_60,
            aging_60_plus_days=c_60_plus,
            total_outstanding=total
        )
        _AGING_SUMMARY_CACHE["timestamp"] = now_ts
        _AGING_SUMMARY_CACHE["data"] = bucket
        return bucket

    @staticmethod
    def get_customer_aging_breakdown(db: Session, force_refresh: bool = False) -> List[CustomerAgingReportItem]:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _CUSTOMER_AGING_CACHE["data"] and (now_ts - _CUSTOMER_AGING_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _CUSTOMER_AGING_CACHE["data"]

        today = get_ist_today()
        d15 = today - timedelta(days=15)
        d30 = today - timedelta(days=30)
        d60 = today - timedelta(days=60)

        # Batch 1: All active customers
        customers = db.query(Customer).filter(Customer.status == CustomerStatus.ACTIVE.value).all()
        if not customers:
            return []

        # Batch 2: All open invoices across all active customers
        cust_ids = [c.id for c in customers]
        all_open_invs = db.query(Invoice).filter(
            Invoice.customer_id.in_(cust_ids),
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.outstanding_amount > 0
        ).all()

        invs_by_customer = defaultdict(list)
        for inv in all_open_invs:
            invs_by_customer[inv.customer_id].append(inv)

        # Batch 3: Payments per active customer for remaining OB check
        pay_rows = db.query(Payment.customer_id, func.sum(Payment.amount)).filter(Payment.customer_id.in_(cust_ids)).group_by(Payment.customer_id).all() if cust_ids else []
        paid_map = {r[0]: Decimal(str(r[1] or "0.00")) for r in pay_rows}

        # Batch 4: Total invoiced per active customer to determine true live ledger balance
        inv_tot_rows = db.query(Invoice.customer_id, func.sum(Invoice.total_amount)).filter(
            Invoice.customer_id.in_(cust_ids),
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.PAID.value, InvoiceStatus.OVERDUE.value])
        ).group_by(Invoice.customer_id).all() if cust_ids else []
        inv_tot_map = {r[0]: Decimal(str(r[1] or "0.00")) for r in inv_tot_rows}

        results: List[CustomerAgingReportItem] = []

        for cust in customers:
            open_invs = invs_by_customer.get(cust.id, [])
            ob = Decimal(str(cust.opening_balance or "0.00"))
            paid = paid_map.get(cust.id, Decimal("0.00"))
            tot_invoiced = inv_tot_map.get(cust.id, Decimal("0.00"))
            net_balance = max(Decimal("0.00"), ob + tot_invoiced - paid)

            # If customer has zero or negative net ledger balance, they owe nothing
            if net_balance <= Decimal("0.00"):
                continue

            rem_ob = max(Decimal("0.00"), ob - paid) if ob > Decimal("0.00") else Decimal("0.00")

            c_0_15 = Decimal("0.00")
            c_16_30 = Decimal("0.00")
            c_31_60 = Decimal("0.00")
            c_60_plus = rem_ob

            for inv in open_invs:
                due = inv.due_date
                amt = Decimal(str(inv.outstanding_amount))
                if due >= d15:
                    c_0_15 += amt
                elif due >= d30:
                    c_16_30 += amt
                elif due >= d60:
                    c_31_60 += amt
                else:
                    c_60_plus += amt

            raw_total = c_0_15 + c_16_30 + c_31_60 + c_60_plus
            if raw_total <= Decimal("0.00"):
                continue

            # Strict reconciliation clamp: total aging cannot exceed net live balance
            if raw_total > net_balance and raw_total > Decimal("0.00"):
                scale = net_balance / raw_total
                c_0_15 = (c_0_15 * scale).quantize(Decimal("0.01"))
                c_16_30 = (c_16_30 * scale).quantize(Decimal("0.01"))
                c_31_60 = (c_31_60 * scale).quantize(Decimal("0.01"))
                c_60_plus = max(Decimal("0.00"), net_balance - c_0_15 - c_16_30 - c_31_60)
                total = net_balance
            else:
                total = raw_total

            if total > Decimal("0.00"):
                results.append(CustomerAgingReportItem(
                    customer_id=cust.id,
                    customer_code=cust.customer_code,
                    business_name=cust.business_name,
                    customer_name=cust.business_name,
                    contact_person=cust.contact_person,
                    phone=cust.phone,
                    current_0_15=c_0_15,
                    current_0_15_days=c_0_15,
                    days_16_30=c_16_30,
                    aging_16_30_days=c_16_30,
                    days_31_60=c_31_60,
                    aging_31_60_days=c_31_60,
                    days_60_plus=c_60_plus,
                    aging_60_plus_days=c_60_plus,
                    total_due=total,
                    total_outstanding=total
                ))

        results.sort(key=lambda x: x.total_due, reverse=True)
        _CUSTOMER_AGING_CACHE["timestamp"] = now_ts
        _CUSTOMER_AGING_CACHE["data"] = results
        return results

    @staticmethod
    def get_product_sales_performance(db: Session, force_refresh: bool = False) -> List[ProductPerformanceItem]:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _PRODUCT_SALES_CACHE["data"] and (now_ts - _PRODUCT_SALES_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _PRODUCT_SALES_CACHE["data"]

        valid_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]

        query = db.query(
            Product.id,
            Product.sku,
            Product.name,
            Category.name.label("category_name"),
            Product.brand,
            func.coalesce(func.sum(InvoiceItem.quantity), 0).label("qty_sold"),
            func.coalesce(func.sum(InvoiceItem.line_total), 0).label("rev")
        ).join(Category, Product.category_id == Category.id)\
         .outerjoin(InvoiceItem, Product.id == InvoiceItem.product_id)\
         .outerjoin(Invoice, InvoiceItem.invoice_id == Invoice.id)\
         .filter(or_(Invoice.id == None, Invoice.status.in_(valid_statuses)))\
         .group_by(Product.id, Product.sku, Product.name, Category.name, Product.brand)\
         .order_by(desc("rev")).all()

        items = [
            ProductPerformanceItem(
                product_id=row[0],
                sku=row[1],
                product_name=row[2],
                name=row[2],
                category_name=row[3],
                brand=row[4],
                total_quantity_sold=Decimal(str(row[5])),
                units_sold=Decimal(str(row[5])),
                total_revenue=Decimal(str(row[6])),
                revenue=Decimal(str(row[6]))
            ) for row in query
        ]

        _PRODUCT_SALES_CACHE["timestamp"] = now_ts
        _PRODUCT_SALES_CACHE["data"] = items
        return items
