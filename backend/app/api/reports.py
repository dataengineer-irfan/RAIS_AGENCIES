from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.models.user import User
from app.schemas.reports import (
    DashboardKPIs, AgingBucket, CustomerAgingReportItem,
    ProductPerformanceItem
)
from app.services.reporting_service import ReportingService
from app.services.financial_audit_service import FinancialAuditService
from app.api.deps import require_any_authenticated, require_admin

router = APIRouter(prefix="/reports", tags=["Reporting & Analytics"])

class ExportAuditExcelRequest(BaseModel):
    customer_ids: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class ResolveDuplicatePaymentRequest(BaseModel):
    payment_number: str
    reason: str = "Confirmed phantom double-click submission"

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

# ─── FINANCIAL AUDIT & RECONCILIATION SUITE ───

@router.get("/financial-audit/scan")
def scan_financial_audit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Deep scan across all customer ledgers, rapid-fire payments, and mathematical invariants."""
    return FinancialAuditService.scan_anomalies(db)

@router.get("/financial-audit/customer/{customer_id}")
def get_customer_audit_statement(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Detailed audit dossier for a single customer: statement, invoices, payments, and suspect flags."""
    return FinancialAuditService.get_customer_statement_dossier(db, customer_id)

@router.post("/financial-audit/export-excel")
def export_financial_audit_excel(
    payload: ExportAuditExcelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Generates and streams a comprehensive multi-tab audit Excel spreadsheet."""
    excel_bytes = FinancialAuditService.generate_excel_audit_workbook(
        db=db,
        customer_ids=payload.customer_ids,
        date_from=payload.date_from,
        date_to=payload.date_to
    )
    filename = f"RAIS_Financial_Audit_{date.today().isoformat()}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/financial-audit/margin-leakage")
def get_financial_audit_margin_leakage(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = Query(None, min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """Forensic margin leakage query for Financial Audit Hub."""
    return FinancialAuditService.get_margin_leakage_records(
        db=db,
        start_date=start_date,
        end_date=end_date,
        search=search
    )

@router.post("/financial-audit/resolve-duplicate")
def resolve_phantom_duplicate_payment(
    payload: ResolveDuplicatePaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin action to safely remove a confirmed duplicate payment and recalculate balances."""
    return FinancialAuditService.resolve_phantom_payment(
        db=db,
        payment_number=payload.payment_number,
        reason=payload.reason,
        user_id=current_user.id,
        username=current_user.username
    )
