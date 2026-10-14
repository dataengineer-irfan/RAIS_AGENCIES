from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class InvoiceItemCreate(BaseModel):
    product_id: str
    quantity: Decimal = Field(..., gt=Decimal("0.00"), description="Quantity must be strictly positive (> 0)")
    unit_price: Optional[Decimal] = Field(None, gt=Decimal("0.00"), description="Unit price must be strictly positive (> 0) if provided")
    discount_rate: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"), description="Discount rate between 0% and 100%")

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
    discount_amount: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"), description="Invoice-level discount cannot be negative")
    payment_terms: Optional[str] = "Cash on Delivery / Immediate Settlement"
    notes: Optional[str] = None
    auto_issue: bool = False # If True, mark as ISSUED immediately
    idempotency_key: Optional[str] = Field(None, max_length=64, description="Client idempotency key for safe retries")
    items: List[InvoiceItemCreate] = Field(..., min_length=1, description="Invoice must contain at least one item")

class InvoiceUpdate(BaseModel):
    customer_id: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    discount_amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemCreate]] = Field(None, min_length=1, description="If provided, replaces all line items and cannot be empty list")

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
    customer_since: Optional[datetime] = None
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
    customer_outstanding_balance: Optional[Decimal] = None  # Live customer total account due balance
    payment_terms: Optional[str] = None
    notes: Optional[str] = None
    qr_payload: Optional[str] = None
    idempotency_key: Optional[str] = None
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
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
