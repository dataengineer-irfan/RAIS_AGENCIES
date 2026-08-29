from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem

_MATRIX_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

class ProductPerformanceService:
    @staticmethod
    def get_product_matrix(db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """
        High-Performance Product Performance Intelligence:
        Uses joinedload to eliminate N+1 category lookups + 60s in-memory caching.
        """
        now = datetime.now(timezone.utc)
        now_ts = now.timestamp()
        if not force_refresh and _MATRIX_CACHE["data"] and (now_ts - _MATRIX_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _MATRIX_CACHE["data"]

        current_period = now.strftime("%Y-%m")
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # 1. Fetch all active products with category eagerly loaded in 1 query
        products = db.query(Product).options(joinedload(Product.category)).filter(Product.is_active == True).all()

        # 2. Query trailing 30-day and 30-to-60-day sales per product from issued/paid invoices
        recent_sales = db.query(
            InvoiceItem.product_id,
            func.sum(InvoiceItem.quantity).label("units_30d"),
            func.sum(InvoiceItem.line_total).label("revenue_30d")
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .filter(
             Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"]),
             Invoice.invoice_date >= thirty_days_ago.date()
         ).group_by(InvoiceItem.product_id).all()

        recent_sales_map = {
            r.product_id: {
                "units": float(r.units_30d or 0),
                "revenue": float(r.revenue_30d or 0)
            } for r in recent_sales
        }

        # Prior 30-to-60 day sales for MoM Trend calculation
        prior_sales = db.query(
            InvoiceItem.product_id,
            func.sum(InvoiceItem.line_total).label("revenue_prior")
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .filter(
             Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"]),
             Invoice.invoice_date >= sixty_days_ago.date(),
             Invoice.invoice_date < thirty_days_ago.date()
         ).group_by(InvoiceItem.product_id).all()

        prior_sales_map = {r.product_id: float(r.revenue_prior or 0) for r in prior_sales}

        items = []
        zero_movers = []
        winners = []
        declining = []
        total_dead_stock_value = Decimal("0.00")
        total_catalogue_stock_value = Decimal("0.00")

        for p in products:
            stats = recent_sales_map.get(p.id, {"units": 0, "revenue": 0})
            units = stats["units"]
            revenue = stats["revenue"]
            prior_rev = prior_sales_map.get(p.id, 0)
            current_stock = float(p.current_stock or 0)
            base_price = float(p.base_price or 0)
            stock_value = current_stock * base_price
            total_catalogue_stock_value += Decimal(str(stock_value))

            # MoM Trend %
            if prior_rev > 0:
                trend_pct = ((revenue - prior_rev) / prior_rev) * 100
            elif revenue > 0:
                trend_pct = 100.0
            else:
                trend_pct = 0.0

            # Classification logic
            if units == 0:
                classification = "ZERO_MOVER"
                if stock_value > 0:
                    total_dead_stock_value += Decimal(str(stock_value))
                zero_movers.append(p.name)
            elif revenue > 500 and trend_pct >= 0:
                classification = "WINNER"
                winners.append(p.name)
            elif trend_pct < -10.0:
                classification = "DECLINING"
                declining.append(p.name)
            else:
                classification = "STEADY"

            item_data = {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "brand": p.brand,
                "category_name": p.category.name if p.category else "General",
                "packaging_unit": p.packaging_unit,
                "units_sold_30d": units,
                "revenue_30d": round(revenue, 2),
                "stock_holding_units": current_stock,
                "stock_holding_value": round(stock_value, 2),
                "trend_pct": round(trend_pct, 1),
                "classification": classification
            }
            items.append(item_data)

        # Generate Plain-Language Business Insight
        if zero_movers:
            insight_summary = (
                f"₹{total_dead_stock_value:,.2f} is currently tied up in {len(zero_movers)} zero-mover SKUs in your cold room. "
                f"Consider bundling {zero_movers[0] if zero_movers else 'dead stock'} with high-velocity items."
            )
        else:
            insight_summary = "All catalogue products have moved actively in the trailing 30 days! Zero dead stock detected."

        response_data = {
            "period": current_period,
            "total_skus": len(items),
            "winners_count": len(winners),
            "steady_count": len([i for i in items if i["classification"] == "STEADY"]),
            "declining_count": len(declining),
            "zero_movers_count": len(zero_movers),
            "total_dead_stock_value": float(total_dead_stock_value),
            "total_catalogue_stock_value": float(total_catalogue_stock_value),
            "insight_summary": insight_summary,
            "items": sorted(items, key=lambda x: x["revenue_30d"], reverse=True)
        }

        _MATRIX_CACHE["timestamp"] = now_ts
        _MATRIX_CACHE["data"] = response_data
        return response_data
