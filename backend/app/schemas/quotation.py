from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class QuotationItemCreate(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Optional[Decimal] = None # Will pull from product base_price if omitted
    discount_rate: Decimal = Decimal("0.00")

class QuotationItemResponse(BaseModel):
    id: str
    product_id: str
    item_name: str
    packaging_unit: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    customer_id: str
    valid_until: date
    discount_amount: Decimal = Decimal("0.00")
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    items: List[QuotationItemCreate]

class QuotationResponse(BaseModel):
    id: str
    quotation_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    status: str
    quotation_date: date
    valid_until: date
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True
