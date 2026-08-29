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
