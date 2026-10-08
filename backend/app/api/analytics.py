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

import time
from collections import defaultdict
from decimal import Decimal
from app.models.inventory import StockMovement

# High-speed in-memory drilldown cache (60s TTL)
_DRILLDOWN_CACHE = {}
_DRILLDOWN_CACHE_TTL = 60.0

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
    Category -> Product -> Breakdown.
    Single-query SQL aggregation + Python memory mapping for instant <50ms response over WAN.
    """
    cache_key = f"{metric}_{level}_{category_id}_{customer_id}"
    now = time.time()
    if cache_key in _DRILLDOWN_CACHE:
        ts, cached_data = _DRILLDOWN_CACHE[cache_key]
        if now - ts < _DRILLDOWN_CACHE_TTL:
            return cached_data

    valid_statuses = ["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT", "OVERDUE"]

    # 1. Single aggregated query for all product sales
    sales_query = db.query(
        InvoiceItem.product_id,
        func.coalesce(func.sum(InvoiceItem.quantity), 0).label("units_sold"),
        func.coalesce(func.sum(InvoiceItem.line_total), 0).label("total_revenue")
    ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
     .filter(Invoice.status.in_(valid_statuses))

    if customer_id:
        sales_query = sales_query.filter(Invoice.customer_id == customer_id)

    sales_rows = sales_query.group_by(InvoiceItem.product_id).all()
    sales_map = {
        row.product_id: (Decimal(str(row.units_sold)), Decimal(str(row.total_revenue)))
        for row in sales_rows
    }

    # 2. Build purchase cost map from StockMovements (latest purchase cost per product)
    cost_rows = db.query(
        StockMovement.product_id,
        StockMovement.purchase_cost
    ).filter(StockMovement.purchase_cost.isnot(None))\
     .order_by(StockMovement.created_at.desc()).all()
    cost_map = {}
    for row in cost_rows:
        if row.product_id not in cost_map and row.purchase_cost is not None:
            cost_map[row.product_id] = Decimal(str(row.purchase_cost))

    # 3. Fetch active products
    prods_query = db.query(Product).filter(Product.is_active == True)
    if category_id:
        prods_query = prods_query.filter(Product.category_id == category_id)
    all_prods = prods_query.all()

    # Precompute product-level metrics in memory (<1ms)
    prod_metrics = {}
    for p in all_prods:
        p_units, p_rev = sales_map.get(p.id, (Decimal("0"), Decimal("0")))
        pcost = cost_map.get(p.id)
        unit_cost = pcost if (pcost and pcost > Decimal("0")) else (Decimal(str(p.base_price)) * Decimal("0.80"))

        if pcost and pcost > Decimal("0"):
            p_cost = pcost * p_units
        else:
            p_cost = p_rev * Decimal("0.80")

        p_profit = p_rev - p_cost
        margin_pct = (p_profit / p_rev * 100) if p_rev > Decimal("0") else Decimal("0")

        prod_metrics[p.id] = {
            "product": p,
            "units_sold": p_units,
            "revenue": p_rev,
            "unit_cost": unit_cost,
            "cost": p_cost,
            "profit": p_profit,
            "margin_pct": margin_pct
        }

    # Handle PROFIT metric
    if metric == "profit":
        if level == "category":
            cats = db.query(Category).filter(Category.is_active == True).all()
            cat_list = []
            tot_revenue = Decimal("0")
            tot_cost = Decimal("0")

            # Map products by category
            prods_by_cat = defaultdict(list)
            for p_id, p_data in prod_metrics.items():
                prods_by_cat[p_data["product"].category_id].append(p_data)

            for c in cats:
                cat_p_data = prods_by_cat.get(c.id, [])
                cat_rev = sum((m["revenue"] for m in cat_p_data), Decimal("0"))
                cat_cost = sum((m["cost"] for m in cat_p_data), Decimal("0"))
                cat_units = sum((m["units_sold"] for m in cat_p_data), Decimal("0"))
                cat_profit = cat_rev - cat_cost
                margin_pct = (cat_profit / cat_rev * 100) if cat_rev > Decimal("0") else Decimal("0")

                tot_revenue += cat_rev
                tot_cost += cat_cost

                cat_list.append({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "products_count": len(cat_p_data),
                    "units_sold": float(cat_units),
                    "revenue": round(float(cat_rev), 2),
                    "cost": round(float(cat_cost), 2),
                    "profit": round(float(cat_profit), 2),
                    "value": round(float(cat_profit), 2),
                    "margin_pct": round(float(margin_pct), 1)
                })

            tot_profit = tot_revenue - tot_cost
            overall_margin = (tot_profit / tot_revenue * 100) if tot_revenue > Decimal("0") else Decimal("0")
            result = {
                "metric": metric,
                "level": level,
                "summary": {
                    "total_revenue": round(float(tot_revenue), 2),
                    "total_cost": round(float(tot_cost), 2),
                    "total_profit": round(float(tot_profit), 2),
                    "margin_pct": round(float(overall_margin), 1)
                },
                "items": sorted(cat_list, key=lambda x: x["profit"], reverse=True)
            }
            _DRILLDOWN_CACHE[cache_key] = (now, result)
            return result

        elif level == "product":
            prod_list = []
            tot_revenue = Decimal("0")
            tot_cost = Decimal("0")

            for p_id, m in prod_metrics.items():
                p = m["product"]
                tot_revenue += m["revenue"]
                tot_cost += m["cost"]
                prod_list.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "brand": p.brand,
                    "base_price": float(p.base_price),
                    "unit_cost": round(float(m["unit_cost"]), 2),
                    "current_stock": float(p.current_stock or 0),
                    "units_sold": float(m["units_sold"]),
                    "revenue": round(float(m["revenue"]), 2),
                    "cost": round(float(m["cost"]), 2),
                    "profit": round(float(m["profit"]), 2),
                    "value": round(float(m["profit"]), 2),
                    "margin_pct": round(float(m["margin_pct"]), 1)
                })

            tot_profit = tot_revenue - tot_cost
            overall_margin = (tot_profit / tot_revenue * 100) if tot_revenue > Decimal("0") else Decimal("0")
            result = {
                "metric": metric,
                "level": level,
                "summary": {
                    "total_revenue": round(float(tot_revenue), 2),
                    "total_cost": round(float(tot_cost), 2),
                    "total_profit": round(float(tot_profit), 2),
                    "margin_pct": round(float(overall_margin), 1)
                },
                "items": sorted(prod_list, key=lambda x: x["profit"], reverse=True)
            }
            _DRILLDOWN_CACHE[cache_key] = (now, result)
            return result

    # Handle REVENUE metric
    elif metric == "revenue":
        if level == "category":
            cats = db.query(Category).filter(Category.is_active == True).all()
            cat_list = []
            tot_revenue = Decimal("0")

            prods_by_cat = defaultdict(list)
            for p_id, p_data in prod_metrics.items():
                prods_by_cat[p_data["product"].category_id].append(p_data)

            for c in cats:
                cat_p_data = prods_by_cat.get(c.id, [])
                cat_rev = sum((m["revenue"] for m in cat_p_data), Decimal("0"))
                cat_units = sum((m["units_sold"] for m in cat_p_data), Decimal("0"))
                tot_revenue += cat_rev

                cat_list.append({
                    "id": c.id,
                    "code": c.code,
                    "name": c.name,
                    "products_count": len(cat_p_data),
                    "units_sold": float(cat_units),
                    "revenue": round(float(cat_rev), 2),
                    "value": round(float(cat_rev), 2)
                })

            result = {
                "metric": metric,
                "level": level,
                "summary": {
                    "total_revenue": round(float(tot_revenue), 2),
                    "total_categories": len(cats)
                },
                "items": sorted(cat_list, key=lambda x: x["value"], reverse=True)
            }
            _DRILLDOWN_CACHE[cache_key] = (now, result)
            return result

        elif level == "product":
            prod_list = []
            tot_revenue = Decimal("0")

            for p_id, m in prod_metrics.items():
                p = m["product"]
                tot_revenue += m["revenue"]
                prod_list.append({
                    "id": p.id,
                    "sku": p.sku,
                    "name": p.name,
                    "brand": p.brand,
                    "base_price": float(p.base_price),
                    "current_stock": float(p.current_stock or 0),
                    "units_sold": float(m["units_sold"]),
                    "revenue": round(float(m["revenue"]), 2),
                    "value": round(float(m["revenue"]), 2)
                })

            result = {
                "metric": metric,
                "level": level,
                "summary": {
                    "total_revenue": round(float(tot_revenue), 2),
                    "total_products": len(prod_list)
                },
                "items": sorted(prod_list, key=lambda x: x["value"], reverse=True)
            }
            _DRILLDOWN_CACHE[cache_key] = (now, result)
            return result

    # Default fallback
    return {"metric": metric, "level": level, "summary": {}, "items": []}
