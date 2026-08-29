import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, DateTime, Text, Integer, ForeignKey
from app.core.database import Base
from app.domain.enums import AuditAction

def get_utc_now():
    return datetime.now(timezone.utc)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    username = Column(String(100), nullable=True)
    user_role = Column(String(30), nullable=True)
    entity_name = Column(String(100), nullable=False, index=True) # e.g. "Invoice", "Payment", "Customer", "Catalogue"
    entity_id = Column(String(100), nullable=False, index=True)
    action = Column(String(30), nullable=False, index=True) # e.g. "CREATE", "UPDATE", "STATUS_CHANGE", "ALLOCATION"
    before_state = Column(Text, nullable=True) # JSON serialized
    after_state = Column(Text, nullable=True)  # JSON serialized
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_name}:{self.entity_id} by {self.username}>"

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False) # JSON or string
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

class DocumentSequence(Base):
    __tablename__ = "document_sequences"

    doc_type = Column(String(20), primary_key=True) # "INV", "QUO", "ORD", "PAY", "CUST"
    current_year_month = Column(String(10), nullable=False) # e.g. "202608"
    current_sequence = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now, nullable=False)

class AITelemetry(Base):
    __tablename__ = "ai_telemetry"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    username = Column(String(100), nullable=True)
    query = Column(Text, nullable=False)
    intent_detected = Column(String(100), nullable=True)
    tool_executed = Column(String(100), nullable=True)
    success = Column(String(10), default="true", nullable=False)
    latency_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
