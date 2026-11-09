from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date, datetime, time
from app.core.database import get_db
from app.models.user import User
from app.models.system import AuditLog
from app.schemas.system import AuditLogResponse
from app.api.deps import require_admin

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

@router.get("/logs", response_model=List[AuditLogResponse], dependencies=[Depends(require_admin)])
def list_audit_logs(
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    entity_name: Optional[str] = None,
    action: Optional[str] = None,
    username: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    # 1. Date Range Bounding (Indexed via created_at B-tree index for high performance)
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.combine(start_date, time.min))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.combine(end_date, time.max))

    # 2. Indexed Exact Filters
    if entity_name:
        query = query.filter(AuditLog.entity_name == entity_name)
    if action:
        query = query.filter(AuditLog.action == action)
    if username:
        query = query.filter(AuditLog.username == username)

    # 3. Server-Side Full-Database Search across entity_id, actors, and JSON before/after snapshots
    if search:
        s = search.strip()
        if s:
            term = f"%{s}%"
            query = query.filter(
                or_(
                    AuditLog.entity_id.ilike(term),
                    AuditLog.username.ilike(term),
                    AuditLog.entity_name.ilike(term),
                    AuditLog.action.ilike(term),
                    AuditLog.before_state.ilike(term),
                    AuditLog.after_state.ilike(term)
                )
            )

    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/margin-leakage", dependencies=[Depends(require_admin)])
def get_margin_leakage(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    include_estimated: bool = Query(False, description="Include estimated 80% catalogue costs"),
    db: Session = Depends(get_db)
):
    from app.services.financial_audit_service import FinancialAuditService
    return FinancialAuditService.get_margin_leakage_records(
        db=db,
        start_date=start_date,
        end_date=end_date,
        search=search,
        include_estimated=include_estimated
    )


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
