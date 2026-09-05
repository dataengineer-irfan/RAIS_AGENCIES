from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_any_authenticated, require_operator_or_admin
from app.models.user import User
from app.schemas.inventory import (
    StockOverviewItem, 
    ReceiveStockRequest, 
    BatchReceiveStockRequest,
    AdjustStockRequest, 
    StockMovementResponse
)
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory & Stock Management"])

@router.get("/overview", response_model=List[StockOverviewItem])
def get_stock_overview(
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """List all stock inventory balances with In Stock, Low Stock, and Out of Stock indicators."""
    return InventoryService.get_stock_overview(db, category_id=category_id, search=search)

@router.post("/receive")
def receive_stock(
    data: ReceiveStockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Receive inventory stock from supplier with cost, batch, and expiry tracking."""
    return InventoryService.receive_stock(db, data, user_id=current_user.id)

@router.post("/batch-receive")
def batch_receive_stock(
    data: BatchReceiveStockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Batch inward stock receipt from truck delivery with multiple items."""
    return InventoryService.batch_receive_stock(
        db, 
        items=data.items, 
        supplier=data.supplier, 
        notes=data.notes, 
        user_id=current_user.id
    )

@router.post("/adjust")
def adjust_stock(
    data: AdjustStockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Adjust inventory stock for damage, expiry, wastage, or count corrections."""
    return InventoryService.adjust_stock(db, data, user_id=current_user.id)

@router.get("/movements", response_model=List[StockMovementResponse])
def get_stock_movements(
    product_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Get complete chronological audit trail of inventory movements."""
    return InventoryService.get_stock_movements(db, product_id=product_id, limit=limit)
