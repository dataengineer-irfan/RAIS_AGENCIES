from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class PaymentAllocationCreate(BaseModel):
    invoice_id: str
    amount: Decimal

class PaymentCreate(BaseModel):
    customer_id: str
    payment_date: Optional[date] = None # Defaults to today
    amount: Decimal
    payment_method: str = "CASH" # CASH, UPI, NEFT_RTGS, CHEQUE, CARD
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    allocations: List[PaymentAllocationCreate] = [] # Optional direct invoice allocations at payment creation

class PaymentAllocationResponse(BaseModel):
    id: str
    payment_id: str
    invoice_id: str
    invoice_number: Optional[str] = None
    allocated_amount: Decimal
    allocated_at: datetime

    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: str
    payment_number: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_code: Optional[str] = None
    payment_date: date
    amount: Decimal
    allocated_amount: Decimal
    unallocated_amount: Decimal
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    allocations: List[PaymentAllocationResponse] = []

    class Config:
        from_attributes = True
