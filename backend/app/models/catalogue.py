import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Text, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Category {self.name}>"

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sku = Column(String(50), unique=True, nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    brand = Column(String(100), nullable=False, index=True)
    packaging_unit = Column(String(100), nullable=False)  # e.g., "1 PACKET", "1 KG PACKET", "100 NOS"
    unit_quantity = Column(Numeric(10, 2), default=1.00, nullable=False)
    base_price = Column(Numeric(12, 2), nullable=False)   # Wholesale price in ₹ INR
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False) # GST percentage (e.g. 5.00, 12.00, 18.00)
    hsn_code = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    current_stock = Column(Numeric(10, 2), default=100.00, nullable=False)
    min_stock_alert = Column(Numeric(10, 2), default=10.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

    category = relationship("Category", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product {self.sku}: {self.name} (₹{self.base_price})>"
