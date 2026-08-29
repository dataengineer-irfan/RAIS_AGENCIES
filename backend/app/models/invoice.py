import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.domain.enums import InvoiceStatus

def get_utc_now():
    return datetime.now(timezone.utc)

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String(30), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String(20), default=InvoiceStatus.DRAFT.value, nullable=False, index=True)
    invoice_date = Column(Date, default=date.today, nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    
    # Financial breakdown
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    taxable_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    outstanding_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    payment_terms = Column(Text, default="Payment due upon receipt or within 15 days.", nullable=True)
    notes = Column(Text, nullable=True)
    qr_payload = Column(Text, nullable=True) # Payload for payment/UPI QR code
    
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    order = relationship("Order", back_populates="invoices")
    quotation = relationship("Quotation")
    created_by = relationship("User")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    allocations = relationship("PaymentAllocation", back_populates="invoice", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Invoice {self.invoice_number} ({self.status}): Total ₹{self.total_amount}, Due ₹{self.outstanding_amount}>"

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    item_description = Column(String(150), nullable=False)
    brand = Column(String(100), nullable=True)
    packaging_unit = Column(String(100), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    taxable_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product")
