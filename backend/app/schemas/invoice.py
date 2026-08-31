from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class InvoiceItemCreate(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Optional[Decimal] = None # Will pull from product base_price if not provided
    discount_rate: Decimal = Decimal("0.00")

class InvoiceItemResponse(BaseModel):
    id: str
    product_id: str
    item_description: str
    brand: Optional[str] = None
    packaging_unit: str
    hsn_code: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    customer_id: str
    order_id: Optional[str] = None
    quotation_id: Optional[str] = None
    invoice_date: Optional[date] = None # Defaults to today
    due_date: Optional[date] = None     # Defaults to invoice_date (Cash business)
    discount_amount: Decimal = Decimal("0.00") # Additional invoice-level discount
    payment_terms: Optional[str] = "Cash on Delivery / Immediate Settlement"
    notes: Optional[str] = None
    auto_issue: bool = False # If True, mark as ISSUED immediately
    items: List[InvoiceItemCreate]

class InvoiceUpdate(BaseModel):
    due_date: Optional[date] = None
    discount_amount: Optional[Decimal] = None
    payment_terms: Optional[str] = None
    notes: Optional[str] = None

class InvoiceStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None

class InvoiceAllocationItem(BaseModel):
    payment_id: str
    payment_number: str
    payment_date: date
    payment_method: str
    allocated_amount: Decimal
    reference_number: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    order_id: Optional[str] = None
    quotation_id: Optional[str] = None
    status: str
    invoice_date: date
    due_date: date
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    qr_payload: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []
    allocations: List[InvoiceAllocationItem] = []

    class Config:
        from_attributes = True

class InvoiceSummary(BaseModel):
    id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    status: str
    invoice_date: date
    due_date: date
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal

    class Config:
        from_attributes = True
