import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.domain.enums import CustomerStatus

def get_utc_now():
    return datetime.now(timezone.utc)

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_code = Column(String(20), unique=True, nullable=False, index=True)
    business_name = Column(String(150), nullable=False, index=True)
    contact_person = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    secondary_phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    
    # Address details
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), default="Rayachoty", nullable=False)
    state = Column(String(100), default="Andhra Pradesh", nullable=False)
    pincode = Column(String(20), default="516269", nullable=False)
    
    # Commercial attributes
    gstin = Column(String(20), nullable=True, index=True)
    credit_limit = Column(Numeric(12, 2), default=0.00, nullable=False)
    opening_balance = Column(Numeric(12, 2), default=0.00, nullable=False)  # Pre-system outstanding balance
    status = Column(String(20), default=CustomerStatus.ACTIVE.value, nullable=False)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    quotations = relationship("Quotation", back_populates="customer", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Customer {self.customer_code}: {self.business_name}>"
