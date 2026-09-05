from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.system import AuditLog
from app.schemas.system import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

@router.get("/logs", response_model=List[AuditLogResponse], dependencies=[Depends(require_admin)])
def list_audit_logs(
    entity_name: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username == username)

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/reset-operational-data", dependencies=[Depends(require_admin)])
def reset_operational_data(
    db: Session = Depends(get_db)
):
    from sqlalchemy import text
    clean_tables = [
        'payment_allocations',
        'payments',
        'invoice_items',
        'invoices',
        'order_items',
        'orders',
        'quotation_items',
        'quotations',
        'audit_logs',
        'customers'
    ]
    deleted_counts = {}
    for tbl in clean_tables:
        try:
            res = db.execute(text(f"DELETE FROM {tbl}"))
            deleted_counts[tbl] = res.rowcount
        except Exception as e:
            deleted_counts[tbl] = str(e)
            
    # Reset inventory stock levels to 0.00
    try:
        res = db.execute(text("UPDATE products SET current_stock = 0.00"))
        deleted_counts["products_stock_reset"] = res.rowcount
    except Exception as e:
        deleted_counts["products_stock_reset"] = str(e)

    # Reset sequences if present
    try:
        db.execute(text("UPDATE document_sequences SET current_sequence = 0"))
    except Exception:
        pass

    db.commit()
    return {
        "status": "success",
        "message": "All dummy operational data wiped cleanly. Products and categories preserved with 0 stock.",
        "deleted": deleted_counts
    }
