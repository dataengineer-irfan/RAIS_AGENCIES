from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Optional[Decimal] = None

class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    item_name: str
    packaging_unit: str
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: str
    quotation_id: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemCreate]

class OrderResponse(BaseModel):
    id: str
    order_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    quotation_id: Optional[str] = None
    status: str
    order_date: date
    expected_delivery_date: Optional[date] = None
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    delivery_address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
