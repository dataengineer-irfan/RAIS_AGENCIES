from typing import Optional, List, Union
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StockOverviewItem(BaseModel):
    product_id: str
    sku: str
    name: str
    category_name: str
    brand: str
    packaging_unit: str
    current_stock: Decimal
    min_stock_alert: Decimal
    stock_status: str # IN_STOCK, LOW_STOCK, OUT_OF_STOCK
    base_price: Decimal
    tax_rate: Decimal

    model_config = ConfigDict(from_attributes=True)

class ReceiveStockRequest(BaseModel):
    product_id: str
    quantity: Decimal = Field(..., gt=0)
    unit: Optional[str] = None
    purchase_cost: Optional[Decimal] = None
    supplier: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[Union[date, str]] = None
    notes: Optional[str] = None

    @field_validator('expiry_date', mode='before')
    @classmethod
    def parse_expiry_date(cls, v):
        if not v or str(v).strip() == '':
            return None
        return v

    @field_validator('purchase_cost', mode='before')
    @classmethod
    def parse_purchase_cost(cls, v):
        if v is None or str(v).strip() == '':
            return None
        return Decimal(str(v))

class AdjustStockRequest(BaseModel):
    product_id: str
    adjustment_type: str = Field(..., description="INCREASE or DECREASE")
    quantity: Decimal = Field(..., gt=0)
    reason: str = Field(..., description="DAMAGED, EXPIRED, CORRECTION, WASTAGE, PHYSICAL_COUNT, OTHER")
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    movement_type: str
    quantity_change: Decimal
    previous_stock: Decimal
    new_stock: Decimal
    unit: str
    purchase_cost: Optional[Decimal] = None
    supplier: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    reference_type: Optional[str] = None
    reference_number: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
