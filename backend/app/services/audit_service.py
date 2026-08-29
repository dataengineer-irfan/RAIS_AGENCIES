import json
from sqlalchemy.orm import Session
from typing import Optional, Any
from app.models.system import AuditLog
from app.domain.enums import AuditAction

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: AuditAction,
        entity_name: str,
        entity_id: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None,
        before_state: Optional[Any] = None,
        after_state: Optional[Any] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        def serialize(val):
            if val is None:
                return None
            if isinstance(val, str):
                return val
            try:
                return json.dumps(val, default=str)
            except Exception:
                return str(val)

        log_entry = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            entity_name=entity_name,
            entity_id=str(entity_id),
            action=action.value if isinstance(action, AuditAction) else str(action),
            before_state=serialize(before_state),
            after_state=serialize(after_state),
            ip_address=ip_address
        )
        db.add(log_entry)
        db.flush()
        return log_entry
