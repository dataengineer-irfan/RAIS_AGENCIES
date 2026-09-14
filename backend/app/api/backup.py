import io
import json
import gzip
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Response, Query, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models import (
    Customer, Product, Category,
    Order, OrderItem,
    Quotation, QuotationItem,
    Invoice, InvoiceItem,
    Payment, PaymentAllocation,
    StockMovement, AuditLog,
    SystemSetting, DocumentSequence
)
from app.services.audit_service import AuditService
from app.domain.enums import AuditAction, UserRole
from app.api.deps import require_operator_or_admin

router = APIRouter(prefix="/backup", tags=["Data Vault & Backup"])

class BackupEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, bytes):
            return obj.decode("utf-8", errors="ignore")
        return super().default(obj)

def serialize_table(query):
    rows = []
    for item in query.all():
        data = {}
        for col in item.__table__.columns:
            val = getattr(item, col.name)
            if col.name == "password_hash":
                data[col.name] = "***MASKED***"
            else:
                data[col.name] = val
        rows.append(data)
    return rows

@router.get("/status")
def get_backup_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
) -> Dict[str, Any]:
    """
    Returns live database health, table row counts, and data vault integrity metrics.
    """
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    
    models = [
        ("customers", Customer),
        ("categories", Category),
        ("products", Product),
        ("orders", Order),
        ("invoices", Invoice),
        ("invoice_items", InvoiceItem),
        ("payments", Payment),
        ("payment_allocations", PaymentAllocation),
        ("stock_movements", StockMovement),
        ("audit_logs", AuditLog),
        ("users", User)
    ]
    
    counts = {}
    total = 0
    for name, model_cls in models:
        c = db.query(model_cls).count()
        counts[name] = c
        total += c
        
    return {
        "status": "online",
        "cloud_provider": "Supabase AWS Managed PostgreSQL",
        "retention_policy": "Rolling 30-Day Automated Snapshots",
        "current_time_ist": ist_now.strftime("%d-%b-%Y %I:%M %p"),
        "total_records": total,
        "table_counts": counts
    }

def get_backup_export_user(
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    raw_token = None
    if authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization.split(" ", 1)[1].strip()
    elif token:
        raw_token = token.strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Pass via Authorization header or ?token= query parameter."
        )

    payload = decode_access_token(raw_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter((User.id == user_id) | (User.username == user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    if user.role not in [UserRole.ADMIN.value, UserRole.OPERATOR.value]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions to export backup")

    return user

@router.get("/export")
def export_database_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_backup_export_user)
):
    """
    Generates an on-demand, compressed GZIP snapshot of all 16 database tables
    and triggers an instant direct browser file download.
    """
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    timestamp_str = ist_now.strftime("%Y-%m-%d_%H%M%S")
    filename = f"rais_backup_{timestamp_str}.json.gz"

    models_to_backup = [
        ("customers", Customer),
        ("categories", Category),
        ("products", Product),
        ("orders", Order),
        ("order_items", OrderItem),
        ("quotations", Quotation),
        ("quotation_items", QuotationItem),
        ("invoices", Invoice),
        ("invoice_items", InvoiceItem),
        ("payments", Payment),
        ("payment_allocations", PaymentAllocation),
        ("stock_movements", StockMovement),
        ("audit_logs", AuditLog),
        ("system_settings", SystemSetting),
        ("document_sequences", DocumentSequence),
        ("users", User)
    ]

    backup_payload = {
        "metadata": {
            "business": "RAIS AGENCIES Rayachoty",
            "system": "RAIS Management Platform v2.0",
            "exported_at_ist": ist_now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "exported_by": current_user.username,
            "user_role": current_user.role,
            "table_summary": {}
        },
        "tables": {}
    }

    total_records = 0
    for table_name, model_cls in models_to_backup:
        records = serialize_table(db.query(model_cls))
        count = len(records)
        total_records += count
        backup_payload["tables"][table_name] = records
        backup_payload["metadata"]["table_summary"][table_name] = count

    # Audit log entry for security compliance
    user_record = db.query(User).filter(User.id == current_user.id).first() if getattr(current_user, "id", None) else None
    actual_user_id = user_record.id if user_record else None

    AuditService.log(
        db=db,
        action=AuditAction.EXPORT,
        entity_name="DatabaseBackup",
        entity_id=filename,
        user_id=actual_user_id,
        username=current_user.username,
        user_role=current_user.role,
        after_state={
            "action": "MANUAL_UI_BACKUP_EXPORT",
            "filename": filename,
            "total_records": total_records
        }
    )
    db.commit()

    json_str = json.dumps(backup_payload, cls=BackupEncoder, indent=2)
    compressed_bytes = gzip.compress(json_str.encode("utf-8"), compresslevel=9)

    return Response(
        content=compressed_bytes,
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Total-Records": str(total_records),
            "X-Backup-Time": timestamp_str
        }
    )
