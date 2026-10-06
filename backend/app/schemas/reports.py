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
    overall_profit: Decimal = Decimal("0.00")
    overall_loss: Decimal = Decimal("0.00")
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
    customer_name: Optional[str] = None
    contact_person: str
    phone: str
    current_0_15: Decimal
    current_0_15_days: Optional[Decimal] = None
    days_16_30: Decimal
    aging_16_30_days: Optional[Decimal] = None
    days_31_60: Decimal
    aging_31_60_days: Optional[Decimal] = None
    days_60_plus: Decimal
    aging_60_plus_days: Optional[Decimal] = None
    total_due: Decimal
    total_outstanding: Optional[Decimal] = None

class ProductPerformanceItem(BaseModel):
    product_id: str
    sku: str
    product_name: str
    name: Optional[str] = None
    category_name: str
    brand: str
    total_quantity_sold: Decimal
    units_sold: Optional[Decimal] = None
    total_revenue: Decimal
    revenue: Optional[Decimal] = None

class CustomerLedgerEntry(BaseModel):
    date: date
    type: str # INVOICE, PAYMENT, ADJUSTMENT
    reference: str # Invoice number or Payment number
    description: str
    debit: Decimal # Amount billed
    credit: Decimal # Amount paid
    running_balance: Decimal
