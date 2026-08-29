import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def get_utc_now():
    return datetime.now(timezone.utc)

class MonthlyTarget(Base):
    __tablename__ = "monthly_targets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    year_month = Column(String(7), nullable=False, unique=True, index=True) # e.g. '2026-08'
    target_revenue = Column(Numeric(12, 2), nullable=False, default=50000.00)
    set_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class ProductPerformanceSnapshot(Base):
    __tablename__ = "product_performance_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True) # '2026-08'
    revenue = Column(Numeric(12, 2), default=0.00)
    units_sold = Column(Numeric(12, 2), default=0.00)
    stock_holding_value = Column(Numeric(12, 2), default=0.00)
    trend_pct = Column(Numeric(6, 2), default=0.00) # MoM change %
    classification = Column(String(20), nullable=False, default="STEADY") # WINNER, STEADY, DECLINING, ZERO_MOVER
    computed_at = Column(DateTime, default=get_utc_now)

    product = relationship("Product")

class CustomerHealthSnapshot(Base):
    __tablename__ = "customer_health_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    period = Column(String(7), nullable=False, index=True) # '2026-08'
    dso_days = Column(Numeric(6, 1), default=0.0) # Days Sales Outstanding
    avg_days_late = Column(Numeric(6, 1), default=0.0)
    order_freq_trend = Column(String(20), default="STABLE") # INCREASING, STABLE, DECAYING
    outstanding_balance = Column(Numeric(12, 2), default=0.00)
    health_status = Column(String(20), nullable=False, default="HEALTHY") # HEALTHY, WATCH, AT_RISK
    risk_reason = Column(Text, nullable=True)
    computed_at = Column(DateTime, default=get_utc_now)

    customer = relationship("Customer")

class DashboardLayout(Base):
    __tablename__ = "dashboard_layouts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    role = Column(String(20), nullable=False, default="ADMIN")
    layout_config = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class PrinterProfile(Base):
    __tablename__ = "printer_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    name = Column(String(100), nullable=False, default="Thermal Counter Printer")
    connection_type = Column(String(20), default="BLUETOOTH") # BLUETOOTH, USB, NETWORK
    paper_width = Column(Integer, default=58) # 58 or 80 mm
    device_name = Column(String(100), nullable=True)
    mac_address = Column(String(50), nullable=True)
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)
