from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta, timezone
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.schemas.reports import (
    DashboardKPIs, SalesReportItem, AgingBucket,
    CustomerAgingReportItem, ProductPerformanceItem
)
from app.domain.enums import InvoiceStatus, CustomerStatus

# 60-Second In-Memory Response Caches
_DASHBOARD_CACHE = {"timestamp": 0, "data": None}
_AGING_SUMMARY_CACHE = {"timestamp": 0, "data": None}
_CUSTOMER_AGING_CACHE = {"timestamp": 0, "data": None}
_PRODUCT_SALES_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

class ReportingService:
    @staticmethod
    def get_dashboard_kpis(db: Session, force_refresh: bool = False) -> DashboardKPIs:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _DASHBOARD_CACHE["data"] and (now_ts - _DASHBOARD_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _DASHBOARD_CACHE["data"]

        today = date.today()
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

        # 2. Total Outstanding Balance
        outstanding_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value])
        ).scalar()
        total_outstanding = Decimal(str(outstanding_query or "0.00"))

        # 3. Total Overdue Balance
        overdue_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.due_date < today,
            Invoice.outstanding_amount > 0
        ).scalar()
        total_overdue = Decimal(str(overdue_query or "0.00"))

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
            func.coalesce(func.sum(InvoiceItem.line_total), 0).label("total_rev")
        ).join(InvoiceItem, Product.id == InvoiceItem.product_id)\
         .join(Invoice, InvoiceItem.invoice_id == Invoice.id)\
         .filter(
            Invoice.invoice_date >= first_day_month,
            Invoice.status.in_(valid_statuses)
         ).group_by(Product.id, Product.name, Product.sku)\
          .order_by(desc("total_rev"))\
          .limit(5).all()

        top_products = [
            {
                "product_id": p[0],
                "product_name": p[1],
                "sku": p[2],
                "quantity_sold": float(p[3]),
                "total_revenue": float(p[4])
            }
            for p in top_products_query
        ]

        # 9. Recent Invoices
        recent_invs = db.query(Invoice).options(
            joinedload(Invoice.customer)
        ).filter(
            Invoice.status != InvoiceStatus.CANCELLED.value
        ).order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc()).limit(6).all()

        recent_invoices = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.business_name if inv.customer else "Unknown",
                "customer_id": inv.customer_id,
                "invoice_date": str(inv.invoice_date),
                "total_amount": float(inv.total_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status
            }
            for inv in recent_invs
        ]

        # 10. Recent Payments
        recent_payments_query = db.query(Payment).options(
            joinedload(Payment.customer)
        ).order_by(Payment.payment_date.desc(), Payment.created_at.desc()).limit(5).all()

        recent_payments = [
            {
                "id": p.id,
                "payment_number": p.payment_number,
                "customer_name": p.customer.business_name if p.customer else "Unknown",
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method
            }
            for p in recent_payments_query
        ]

        kpis = DashboardKPIs(
            total_revenue_month=total_revenue_month,
            total_outstanding=total_outstanding,
            total_overdue=total_overdue,
            total_invoices_count=invoices_count,
            open_invoices_count=open_invoices_count,
            active_customers_count=active_customers,
            total_products_count=total_products,
            top_selling_products=top_products,
            recent_invoices=recent_invoices,
            recent_payments=recent_payments
        )

        _DASHBOARD_CACHE["timestamp"] = now_ts
        _DASHBOARD_CACHE["data"] = kpis
        return kpis

    @staticmethod
    def get_aging_summary(db: Session, force_refresh: bool = False) -> AgingBucket:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _AGING_SUMMARY_CACHE["data"] and (now_ts - _AGING_SUMMARY_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _AGING_SUMMARY_CACHE["data"]

        today = date.today()
        d15 = today - timedelta(days=15)
        d30 = today - timedelta(days=30)
        d60 = today - timedelta(days=60)

        open_invoices = db.query(Invoice).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.outstanding_amount > 0
        ).all()

        c_0_15 = Decimal("0.00")
        c_16_30 = Decimal("0.00")
        c_31_60 = Decimal("0.00")
        c_60_plus = Decimal("0.00")

        for inv in open_invoices:
            due = inv.due_date
            amount = inv.outstanding_amount
            if due >= d15:
                c_0_15 += amount
            elif due >= d30:
                c_16_30 += amount
            elif due >= d60:
                c_31_60 += amount
            else:
                c_60_plus += amount

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

        today = date.today()
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

        results: List[CustomerAgingReportItem] = []

        for cust in customers:
            open_invs = invs_by_customer.get(cust.id, [])
            if not open_invs:
                continue

            c_0_15 = Decimal("0.00")
            c_16_30 = Decimal("0.00")
            c_31_60 = Decimal("0.00")
            c_60_plus = Decimal("0.00")

            for inv in open_invs:
                due = inv.due_date
                amt = inv.outstanding_amount
                if due >= d15:
                    c_0_15 += amt
                elif due >= d30:
                    c_16_30 += amt
                elif due >= d60:
                    c_31_60 += amt
                else:
                    c_60_plus += amt

            total = c_0_15 + c_16_30 + c_31_60 + c_60_plus
            if total > 0:
                results.append(CustomerAgingReportItem(
                    customer_id=cust.id,
                    customer_code=cust.customer_code,
                    business_name=cust.business_name,
                    contact_person=cust.contact_person,
                    phone=cust.phone,
                    current_0_15=c_0_15,
                    days_16_30=c_16_30,
                    days_31_60=c_31_60,
                    days_60_plus=c_60_plus,
                    total_due=total
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
                category_name=row[3],
                brand=row[4],
                total_quantity_sold=Decimal(str(row[5])),
                total_revenue=Decimal(str(row[6]))
            ) for row in query
        ]

        _PRODUCT_SALES_CACHE["timestamp"] = now_ts
        _PRODUCT_SALES_CACHE["data"] = items
        return items
