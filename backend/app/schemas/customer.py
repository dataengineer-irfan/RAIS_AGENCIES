from pydantic import BaseModel, EmailStr
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class CustomerBase(BaseModel):
    business_name: str
    contact_person: str
    phone: str
    secondary_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str = "Rayachoty"
    state: str = "Andhra Pradesh"
    pincode: str = "516269"
    gstin: Optional[str] = None
    credit_limit: Decimal = Decimal("0.00")
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    secondary_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    customer_code: str
    status: str
    total_invoiced: Decimal = Decimal("0.00")
    total_paid: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerSummary(BaseModel):
    id: str
    customer_code: str
    business_name: str
    contact_person: str
    phone: str
    city: str
    outstanding_balance: Decimal = Decimal("0.00")
    status: str

    class Config:
        from_attributes = True
