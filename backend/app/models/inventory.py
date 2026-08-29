import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(30), nullable=False) # RECEIPT, ORDER_DEDUCTION, ADJUSTMENT_INCREASE, ADJUSTMENT_DECREASE
    quantity_change = Column(Numeric(10, 2), nullable=False)
    previous_stock = Column(Numeric(10, 2), nullable=False)
    new_stock = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50), nullable=False)
    
    purchase_cost = Column(Numeric(12, 2), nullable=True)
    supplier = Column(String(150), nullable=True)
    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(Date, nullable=True)
    
    reference_type = Column(String(30), nullable=True) # ORDER, RECEIPT, MANUAL
    reference_number = Column(String(50), nullable=True)
    reason = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)

    product = relationship("Product", back_populates="stock_movements")
    created_by = relationship("User")
