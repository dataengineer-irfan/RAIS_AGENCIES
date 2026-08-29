from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta, timezone
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

_DASHBOARD_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

class ReportingService:
    @staticmethod
    def get_dashboard_kpis(db: Session, force_refresh: bool = False) -> DashboardKPIs:
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _DASHBOARD_CACHE["data"] and (now_ts - _DASHBOARD_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _DASHBOARD_CACHE["data"]

        today = date.today()
        first_day_of_month = today.replace(day=1)

        valid_revenue_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]

        # 1. Total revenue this month
        rev_query = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.invoice_date >= first_day_of_month,
            Invoice.status.in_(valid_revenue_statuses)
        ).scalar()
        total_revenue_month = Decimal(str(rev_query or "0.00"))

        # 2. Total outstanding
        out_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value])
        ).scalar()
        total_outstanding = Decimal(str(out_query or "0.00"))

        # 3. Total overdue
        overdue_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.due_date < today,
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
            Invoice.outstanding_amount > 0
        ).scalar()
        total_overdue = Decimal(str(overdue_query or "0.00"))

        # 4. Counts
        total_invoices_count = db.query(func.count(Invoice.id)).scalar() or 0
        open_invoices_count = db.query(func.count(Invoice.id)).filter(
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value])
        ).scalar() or 0
        active_customers_count = db.query(func.count(Customer.id)).filter(Customer.status == CustomerStatus.ACTIVE.value).scalar() or 0
        total_products_count = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0

        # 5. Recent invoices with customer eagerly joined (1 query)
        recent_invs = db.query(Invoice).options(joinedload(Invoice.customer)).order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc()).limit(6).all()
        recent_invoices = [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.business_name if inv.customer else "Unknown",
                "invoice_date": str(inv.invoice_date),
                "total_amount": float(inv.total_amount),
                "paid_amount": float(inv.paid_amount),
                "outstanding_amount": float(inv.outstanding_amount),
                "status": inv.status
            } for inv in recent_invs
        ]

        # 6. Recent payments with customer eagerly joined (1 query)
        recent_pays = db.query(Payment).options(joinedload(Payment.customer)).order_by(Payment.payment_date.desc(), Payment.created_at.desc()).limit(6).all()
        recent_payments = [
            {
                "id": p.id,
                "payment_number": p.payment_number,
                "customer_name": p.customer.business_name if p.customer else "Unknown",
                "payment_date": str(p.payment_date),
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "reference_number": p.reference_number
            } for p in recent_pays
        ]

        # 7. Top selling products
        top_prods_query = db.query(
            InvoiceItem.product_id,
            InvoiceItem.item_description,
            func.sum(InvoiceItem.quantity).label("total_qty"),
            func.sum(InvoiceItem.line_total).label("total_rev")
        ).join(Invoice).filter(
            Invoice.status.in_(valid_revenue_statuses)
        ).group_by(InvoiceItem.product_id, InvoiceItem.item_description).order_by(desc("total_rev")).limit(5).all()

        top_selling_products = [
            {
                "product_id": tp[0],
                "product_name": tp[1],
                "quantity_sold": float(tp[2] or 0),
                "total_revenue": float(tp[3] or 0)
            } for tp in top_prods_query
        ]

        result = DashboardKPIs(
            total_revenue_month=total_revenue_month,
            total_outstanding=total_outstanding,
            total_overdue=total_overdue,
            total_invoices_count=total_invoices_count,
            open_invoices_count=open_invoices_count,
            active_customers_count=active_customers_count,
            total_products_count=total_products_count,
            recent_invoices=recent_invoices,
            recent_payments=recent_payments,
            top_selling_products=top_selling_products
        )

        _DASHBOARD_CACHE["timestamp"] = now_ts
        _DASHBOARD_CACHE["data"] = result
        return result

    @staticmethod
    def get_aging_summary(db: Session) -> AgingBucket:
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
        return AgingBucket(
            current_0_15_days=c_0_15,
            aging_16_30_days=c_16_30,
            aging_31_60_days=c_31_60,
            aging_60_plus_days=c_60_plus,
            total_outstanding=total
        )

    @staticmethod
    def get_customer_aging_breakdown(db: Session) -> List[CustomerAgingReportItem]:
        today = date.today()
        d15 = today - timedelta(days=15)
        d30 = today - timedelta(days=30)
        d60 = today - timedelta(days=60)

        customers = db.query(Customer).filter(Customer.status == CustomerStatus.ACTIVE.value).all()
        results: List[CustomerAgingReportItem] = []

        for cust in customers:
            open_invs = db.query(Invoice).filter(
                Invoice.customer_id == cust.id,
                Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
                Invoice.outstanding_amount > 0
            ).all()

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
        return results

    @staticmethod
    def get_product_sales_performance(db: Session) -> List[ProductPerformanceItem]:
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

        return [
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
