import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, Numeric, DateTime, Date, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.datetime_utils import get_ist_today

def get_utc_now():
    return datetime.now(timezone.utc)

class CustomerLedgerEntry(Base):
    __tablename__ = "customer_ledger_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    entry_date = Column(Date, default=get_ist_today, nullable=False, index=True)
    entry_type = Column(String(30), nullable=False)  # OPENING_BALANCE, INVOICE, PAYMENT, INVOICE_REVERSAL, PAYMENT_REVERSAL, ADJUSTMENT
    reference_id = Column(String(36), nullable=True) # invoice_id or payment_id
    reference_number = Column(String(50), nullable=True, index=True)
    description = Column(Text, nullable=True)
    
    debit = Column(Numeric(12, 2), default=0.00, nullable=False)
    credit = Column(Numeric(12, 2), default=0.00, nullable=False)
    running_balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
    is_locked = Column(Boolean, default=True, nullable=False)

    # Relationships
    customer = relationship("Customer", foreign_keys=[customer_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<CustomerLedgerEntry {self.entry_type} {self.reference_number}: Debit ₹{self.debit}, Credit ₹{self.credit}, Bal ₹{self.running_balance}>"
