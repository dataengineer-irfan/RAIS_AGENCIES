from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

class CategoryBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    category_id: str
    sku: str
    name: str
    brand: str
    packaging_unit: str
    unit_quantity: Decimal = Decimal("1.00")
    base_price: Decimal
    tax_rate: Decimal = Decimal("0.00")
    hsn_code: Optional[str] = None
    description: Optional[str] = None
    current_stock: Decimal = Decimal("100.00")
    min_stock_alert: Decimal = Decimal("10.00")
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    packaging_unit: Optional[str] = None
    unit_quantity: Optional[Decimal] = None
    base_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    hsn_code: Optional[str] = None
    description: Optional[str] = None
    current_stock: Optional[Decimal] = None
    min_stock_alert: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    category_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
