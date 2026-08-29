from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.user import User
from app.schemas.reports import (
    DashboardKPIs, AgingBucket, CustomerAgingReportItem,
    ProductPerformanceItem
)
from app.services.reporting_service import ReportingService
from app.api.deps import require_any_authenticated

router = APIRouter(prefix="/reports", tags=["Reporting & Analytics"])

@router.get("/dashboard", response_model=DashboardKPIs)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return ReportingService.get_dashboard_kpis(db)

@router.get("/aging", response_model=AgingBucket)
def get_aging_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return ReportingService.get_aging_summary(db)

@router.get("/aging/customers", response_model=List[CustomerAgingReportItem])
def get_customer_aging(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return ReportingService.get_customer_aging_breakdown(db)

@router.get("/product-sales", response_model=List[ProductPerformanceItem])
def get_product_sales_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return ReportingService.get_product_sales_performance(db)
