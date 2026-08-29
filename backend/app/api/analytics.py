from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.invoice import Invoice, InvoiceItem
from app.models.catalogue import Category, Product
from app.models.customer import Customer
from app.api.deps import require_any_authenticated, require_operator_or_admin
from app.services.product_performance_service import ProductPerformanceService
from app.services.customer_health_service import CustomerHealthService
from app.services.forecasting_service import ForecastingService
from app.services.thermal_print_service import ThermalPrintService

router = APIRouter(prefix="/analytics", tags=["Analytics & Intelligence"])

@router.get("/product-matrix")
def get_product_performance_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns Product Performance Intelligence: Winner, Steady, Declining, Zero-Mover matrix and freezer dead stock value.
    """
    return ProductPerformanceService.get_product_matrix(db)

@router.get("/customer-health")
def get_customer_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns Customer Health Traffic Light Scores & Proactive At-Risk Alerts.
    """
    return CustomerHealthService.get_customer_health_analysis(db)

@router.get("/forecast")
def get_sales_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns Sales Forecast vs Actual, month-end projection, and plain-language story statement.
    """
    return ForecastingService.get_sales_forecast(db)

@router.post("/targets")
def set_monthly_revenue_target(
    year_month: str = Body(..., embed=True),
    target_amount: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """
    Sets or updates monthly revenue target.
    """
    target = ForecastingService.set_monthly_target(db, year_month, target_amount, user_id=current_user.id)
    return {
        "year_month": target.year_month,
        "target_revenue": float(target.target_revenue),
        "message": f"Monthly revenue target for {year_month} updated to ₹{target_amount:,.2f}"
    }

@router.get("/receipt/{invoice_id}")
def get_thermal_receipt(
    invoice_id: str,
    paper_width: int = Query(58, description="58 or 80 mm"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns structured ESC/POS thermal receipt data and UPI QR code payload.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return ThermalPrintService.build_thermal_receipt_payload(invoice, paper_width=paper_width)

@router.get("/drilldown")
def get_metric_drilldown(
    metric: str = Query("revenue", description="revenue, receivables, stock"),
    level: str = Query("category", description="category, product, customer"),
    category_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Multi-level progressive disclosure drill-down:
    Category -> Product -> Invoices / Customer Breakdown
    """
    if metric == "revenue":
        if level == "category":
            cats = db.query(Category).filter(Category.is_active == True).all()
            cat_list = []
            for c in cats:
                prods = db.query(Product).filter(Product.category_id == c.id).all()
                prod_ids = [p.id for p in prods]
                
                # Sum items for these products
                total_val = db.query(func.coalesce(func.sum(InvoiceItem.line_total), 0))\
                    .join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                    .filter(InvoiceItem.product_id.in_(prod_ids), Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"])).scalar()
                
                cat_list.append({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "products_count": len(prods),
                    "value": float(total_val or 0.0)
                })
            return {"metric": metric, "level": level, "items": sorted(cat_list, key=lambda x: x["value"], reverse=True)}
        
        elif level == "product":
            query = db.query(Product).filter(Product.is_active == True)
            if category_id:
                query = query.filter(Product.category_id == category_id)
            prods = query.all()
            prod_list = []
            for p in prods:
                prod_list.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "brand": p.brand,
                    "base_price": float(p.base_price),
                    "current_stock": float(p.current_stock or 0),
                    "value": float(p.base_price * (p.current_stock or 0))
                })
            return {"metric": metric, "level": level, "items": sorted(prod_list, key=lambda x: x["value"], reverse=True)}
    
    # Default fallback
    return {"metric": metric, "level": level, "items": []}
