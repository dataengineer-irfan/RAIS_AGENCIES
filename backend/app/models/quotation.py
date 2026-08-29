import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.domain.enums import QuotationStatus

def get_utc_now():
    return datetime.now(timezone.utc)

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_number = Column(String(30), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(20), default=QuotationStatus.DRAFT.value, nullable=False)
    quotation_date = Column(Date, default=date.today, nullable=False)
    valid_until = Column(Date, nullable=False)
    
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    taxable_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    terms_and_conditions = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    customer = relationship("Customer", back_populates="quotations")
    created_by = relationship("User")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    item_name = Column(String(150), nullable=False)
    packaging_unit = Column(String(100), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    line_total = Column(Numeric(12, 2), nullable=False)

    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product")
