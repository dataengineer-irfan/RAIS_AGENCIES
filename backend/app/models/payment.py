import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.domain.enums import PaymentMethod

def get_utc_now():
    return datetime.now(timezone.utc)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_number = Column(String(30), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_date = Column(Date, default=date.today, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    allocated_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    unallocated_amount = Column(Numeric(12, 2), nullable=False)
    
    payment_method = Column(String(20), default=PaymentMethod.CASH.value, nullable=False)
    reference_number = Column(String(100), nullable=True, index=True) # UPI Transaction ID, Cheque number, etc.
    notes = Column(Text, nullable=True)
    
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    customer = relationship("Customer", back_populates="payments")
    created_by = relationship("User")
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Payment {self.payment_number}: Amount ₹{self.amount}, Unallocated ₹{self.unallocated_amount}>"

class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    allocated_amount = Column(Numeric(12, 2), nullable=False)
    allocated_at = Column(DateTime, default=get_utc_now, nullable=False)

    payment = relationship("Payment", back_populates="allocations")
    invoice = relationship("Invoice", back_populates="allocations")
