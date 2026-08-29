import json
from sqlalchemy.orm import Session
from typing import Optional, Any
from app.models.system import AuditLog
from app.domain.enums import AuditAction

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: Any,
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
            if hasattr(val, 'model_dump'):
                try:
                    return json.dumps(val.model_dump(), default=str)
                except Exception:
                    pass
            if hasattr(val, 'dict'):
                try:
                    return json.dumps(val.dict(), default=str)
                except Exception:
                    pass
            try:
                return json.dumps(val, default=str)
            except Exception:
                return str(val)

        action_str = action.value if hasattr(action, 'value') else str(action)

        log_entry = AuditLog(
            user_id=user_id,
            username=username,
            user_role=user_role,
            entity_name=entity_name,
            entity_id=str(entity_id),
            action=action_str,
            before_state=serialize(before_state),
            after_state=serialize(after_state),
            ip_address=ip_address
        )
        db.add(log_entry)
        db.flush()
        return log_entry

    @staticmethod
    def log_action(
        db: Session,
        user_id: Optional[str] = None,
        entity_name: str = "System",
        entity_id: str = "",
        action: str = "ACTION",
        before_state: Optional[Any] = None,
        after_state: Optional[Any] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        return AuditService.log(
            db=db,
            action=action,
            entity_name=entity_name,
            entity_id=entity_id,
            user_id=user_id,
            before_state=before_state,
            after_state=after_state,
            ip_address=ip_address
        )
