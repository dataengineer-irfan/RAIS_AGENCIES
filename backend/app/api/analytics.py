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

from decimal import Decimal
from app.models.inventory import StockMovement

@router.get("/drilldown")
def get_metric_drilldown(
    metric: str = Query("revenue", description="revenue, profit, receivables, stock"),
    level: str = Query("category", description="category, product, customer"),
    category_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Multi-level progressive disclosure drill-down:
    Category -> Product -> Invoices / Customer Breakdown
    Supports both 'revenue' and 'profit' metrics with exact COGS, Net Gross Profit, and Margins.
    """
    valid_statuses = ["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT", "OVERDUE"]

    # Build purchase cost map from StockMovements
    all_movements = db.query(
        StockMovement.product_id,
        StockMovement.purchase_cost
    ).filter(StockMovement.purchase_cost.isnot(None))\
     .order_by(StockMovement.created_at.desc()).all()
    cost_map = {}
    for row in all_movements:
        if row.product_id not in cost_map and row.purchase_cost is not None:
            cost_map[row.product_id] = Decimal(str(row.purchase_cost))

    if metric == "profit":
        if level == "category":
            cats = db.query(Category).filter(Category.is_active == True).all()
            cat_list = []
            tot_revenue = Decimal("0")
            tot_cost = Decimal("0")

            for c in cats:
                prods = db.query(Product).filter(Product.category_id == c.id).all()
                prod_ids = [p.id for p in prods]
                
                inv_items = db.query(
                    InvoiceItem.product_id,
                    InvoiceItem.quantity,
                    InvoiceItem.line_total
                ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                 .filter(InvoiceItem.product_id.in_(prod_ids), Invoice.status.in_(valid_statuses)).all()
                
                cat_rev = Decimal("0")
                cat_cost = Decimal("0")
                cat_units = Decimal("0")

                for pid, qty, line_total in inv_items:
                    r = Decimal(str(line_total or "0"))
                    cat_rev += r
                    cat_units += Decimal(str(qty or "0"))
                    pcost = cost_map.get(pid)
                    if pcost and pcost > Decimal("0"):
                        cat_cost += pcost * Decimal(str(qty or "0"))
                    else:
                        cat_cost += r * Decimal("0.80")

                cat_profit = cat_rev - cat_cost
                margin_pct = (cat_profit / cat_rev * 100) if cat_rev > Decimal("0") else Decimal("0")

                tot_revenue += cat_rev
                tot_cost += cat_cost

                cat_list.append({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "products_count": len(prods),
                    "units_sold": float(cat_units),
                    "revenue": round(float(cat_rev), 2),
                    "cost": round(float(cat_cost), 2),
                    "profit": round(float(cat_profit), 2),
                    "value": round(float(cat_profit), 2),
                    "margin_pct": round(float(margin_pct), 1)
                })

            tot_profit = tot_revenue - tot_cost
            overall_margin = (tot_profit / tot_revenue * 100) if tot_revenue > Decimal("0") else Decimal("0")
            summary = {
                "total_revenue": round(float(tot_revenue), 2),
                "total_cost": round(float(tot_cost), 2),
                "total_profit": round(float(tot_profit), 2),
                "margin_pct": round(float(overall_margin), 1)
            }

            return {
                "metric": metric,
                "level": level,
                "summary": summary,
                "items": sorted(cat_list, key=lambda x: x["profit"], reverse=True)
            }

        elif level == "product":
            query = db.query(Product).filter(Product.is_active == True)
            if category_id:
                query = query.filter(Product.category_id == category_id)
            prods = query.all()
            prod_list = []

            tot_revenue = Decimal("0")
            tot_cost = Decimal("0")

            for p in prods:
                inv_items = db.query(
                    InvoiceItem.quantity,
                    InvoiceItem.line_total
                ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                 .filter(InvoiceItem.product_id == p.id, Invoice.status.in_(valid_statuses)).all()

                p_units = Decimal("0")
                p_rev = Decimal("0")
                for qty, line_total in inv_items:
                    p_units += Decimal(str(qty or "0"))
                    p_rev += Decimal(str(line_total or "0"))

                pcost = cost_map.get(p.id)
                unit_cost = pcost if (pcost and pcost > Decimal("0")) else (Decimal(str(p.base_price)) * Decimal("0.80"))
                if pcost and pcost > Decimal("0"):
                    p_cost = pcost * p_units
                else:
                    p_cost = p_rev * Decimal("0.80")

                p_profit = p_rev - p_cost
                margin_pct = (p_profit / p_rev * 100) if p_rev > Decimal("0") else Decimal("0")

                tot_revenue += p_rev
                tot_cost += p_cost

                prod_list.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "brand": p.brand,
                    "base_price": float(p.base_price),
                    "unit_cost": round(float(unit_cost), 2),
                    "current_stock": float(p.current_stock or 0),
                    "units_sold": float(p_units),
                    "revenue": round(float(p_rev), 2),
                    "cost": round(float(p_cost), 2),
                    "profit": round(float(p_profit), 2),
                    "value": round(float(p_profit), 2),
                    "margin_pct": round(float(margin_pct), 1)
                })

            tot_profit = tot_revenue - tot_cost
            overall_margin = (tot_profit / tot_revenue * 100) if tot_revenue > Decimal("0") else Decimal("0")
            summary = {
                "total_revenue": round(float(tot_revenue), 2),
                "total_cost": round(float(tot_cost), 2),
                "total_profit": round(float(tot_profit), 2),
                "margin_pct": round(float(overall_margin), 1)
            }

            return {
                "metric": metric,
                "level": level,
                "summary": summary,
                "items": sorted(prod_list, key=lambda x: x["profit"], reverse=True)
            }

    elif metric == "revenue":
        if level == "category":
            cats = db.query(Category).filter(Category.is_active == True).all()
            cat_list = []
            tot_revenue = Decimal("0")
            for c in cats:
                prods = db.query(Product).filter(Product.category_id == c.id).all()
                prod_ids = [p.id for p in prods]
                
                total_val = db.query(func.coalesce(func.sum(InvoiceItem.line_total), 0))\
                    .join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                    .filter(InvoiceItem.product_id.in_(prod_ids), Invoice.status.in_(valid_statuses)).scalar() or 0
                
                rev_dec = Decimal(str(total_val))
                tot_revenue += rev_dec

                cat_list.append({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "products_count": len(prods),
                    "revenue": round(float(rev_dec), 2),
                    "value": round(float(rev_dec), 2)
                })
            summary = {
                "total_revenue": round(float(tot_revenue), 2),
                "total_categories": len(cats)
            }
            return {
                "metric": metric,
                "level": level,
                "summary": summary,
                "items": sorted(cat_list, key=lambda x: x["value"], reverse=True)
            }
        
        elif level == "product":
            query = db.query(Product).filter(Product.is_active == True)
            if category_id:
                query = query.filter(Product.category_id == category_id)
            prods = query.all()
            prod_list = []
            tot_revenue = Decimal("0")
            for p in prods:
                inv_items = db.query(
                    func.coalesce(func.sum(InvoiceItem.line_total), 0),
                    func.coalesce(func.sum(InvoiceItem.quantity), 0)
                ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
                 .filter(InvoiceItem.product_id == p.id, Invoice.status.in_(valid_statuses)).first()

                p_rev = Decimal(str(inv_items[0] if inv_items else 0))
                p_units = Decimal(str(inv_items[1] if inv_items else 0))
                tot_revenue += p_rev

                prod_list.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "brand": p.brand,
                    "base_price": float(p.base_price),
                    "current_stock": float(p.current_stock or 0),
                    "units_sold": float(p_units),
                    "revenue": round(float(p_rev), 2),
                    "value": round(float(p_rev), 2)
                })
            summary = {
                "total_revenue": round(float(tot_revenue), 2),
                "total_products": len(prods)
            }
            return {
                "metric": metric,
                "level": level,
                "summary": summary,
                "items": sorted(prod_list, key=lambda x: x["value"], reverse=True)
            }
    
    # Default fallback
    return {"metric": metric, "level": level, "summary": {}, "items": []}
