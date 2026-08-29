from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import date, datetime

class DashboardKPIs(BaseModel):
    total_revenue_month: Decimal
    total_outstanding: Decimal
    total_overdue: Decimal
    total_invoices_count: int
    open_invoices_count: int
    active_customers_count: int
    total_products_count: int
    recent_invoices: List[Dict[str, Any]]
    recent_payments: List[Dict[str, Any]]
    top_selling_products: List[Dict[str, Any]]

class SalesReportItem(BaseModel):
    period: str
    invoices_count: int
    total_sales: Decimal
    total_tax: Decimal
    total_collected: Decimal

class AgingBucket(BaseModel):
    current_0_15_days: Decimal
    aging_16_30_days: Decimal
    aging_31_60_days: Decimal
    aging_60_plus_days: Decimal
    total_outstanding: Decimal

class CustomerAgingReportItem(BaseModel):
    customer_id: str
    customer_code: str
    business_name: str
    contact_person: str
    phone: str
    current_0_15: Decimal
    days_16_30: Decimal
    days_31_60: Decimal
    days_60_plus: Decimal
    total_due: Decimal

class ProductPerformanceItem(BaseModel):
    product_id: str
    sku: str
    product_name: str
    category_name: str
    brand: str
    total_quantity_sold: Decimal
    total_revenue: Decimal

class CustomerLedgerEntry(BaseModel):
    date: date
    type: str # INVOICE, PAYMENT, ADJUSTMENT
    reference: str # Invoice number or Payment number
    description: str
    debit: Decimal # Amount billed
    credit: Decimal # Amount paid
    running_balance: Decimal
