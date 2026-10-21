from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem
from app.models.inventory import StockMovement

_MATRIX_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

class ProductPerformanceService:
    @staticmethod
    def get_product_matrix(db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """
        High-Performance Product Performance Intelligence:
        Uses joinedload to eliminate N+1 category lookups + 60s in-memory caching.
        Includes 30-day Revenue, COGS, Profit, Margin % and Freezer Dead Stock.
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
            func.sum(InvoiceItem.line_total).label("revenue_30d"),
            func.count(func.distinct(Invoice.id)).label("orders_30d")
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .filter(
             Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID"]),
             Invoice.invoice_date >= thirty_days_ago.date()
         ).group_by(InvoiceItem.product_id).all()

        recent_sales_map = {
            r.product_id: {
                "units": float(r.units_30d or 0),
                "revenue": float(r.revenue_30d or 0),
                "orders": int(r.orders_30d or 0)
            } for r in recent_sales
        }

        # Prior 30-to-60 day sales for MoM Trend calculation
        prior_sales = db.query(
            InvoiceItem.product_id,
            func.sum(InvoiceItem.line_total).label("revenue_prior")
        ).join(Invoice, Invoice.id == InvoiceItem.invoice_id)\
         .filter(
             Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID"]),
             Invoice.invoice_date >= sixty_days_ago.date(),
             Invoice.invoice_date < thirty_days_ago.date()
         ).group_by(InvoiceItem.product_id).all()

        prior_sales_map = {r.product_id: float(r.revenue_prior or 0) for r in prior_sales}

        # 3. Fetch latest purchase costs from StockMovement
        cost_rows = db.query(
            StockMovement.product_id,
            StockMovement.purchase_cost
        ).filter(StockMovement.purchase_cost.isnot(None))\
         .order_by(StockMovement.created_at.desc()).all()
        cost_map = {}
        for row in cost_rows:
            if row.product_id not in cost_map and row.purchase_cost is not None:
                cost_map[row.product_id] = float(row.purchase_cost)

        # Build 30-day profit map for percentiles
        recent_profit_map = {}
        for p in products:
            stats = recent_sales_map.get(p.id, {"units": 0, "revenue": 0, "orders": 0})
            rev = stats["revenue"]
            u = stats["units"]
            pc = cost_map.get(p.id)
            c = (pc * u) if (pc is not None and pc > 0) else (rev * 0.80)
            recent_profit_map[p.id] = rev - c

        # Determine Top Revenue, Top Volume & Top Profit Percentile Cutoffs among active sellers
        active_sellers = [
            p for p in products
            if recent_sales_map.get(p.id, {}).get("units", 0) > 0
        ]

        top_rev_pids = set()
        top_vol_pids = set()
        top_profit_pids = set()

        if active_sellers:
            # Top 20% by revenue (at least 3 SKUs or 20% of sellers)
            rev_sorted = sorted(active_sellers, key=lambda p: recent_sales_map.get(p.id, {}).get("revenue", 0), reverse=True)
            top_rev_cutoff = max(3, int(len(active_sellers) * 0.20))
            top_rev_pids = {p.id for p in rev_sorted[:top_rev_cutoff]}

            # Top 20% by volume (at least 3 SKUs or 20% of sellers)
            vol_sorted = sorted(active_sellers, key=lambda p: recent_sales_map.get(p.id, {}).get("units", 0), reverse=True)
            top_vol_cutoff = max(3, int(len(active_sellers) * 0.20))
            top_vol_pids = {p.id for p in vol_sorted[:top_vol_cutoff]}

            # Top 20% by profit
            profit_sorted = sorted(active_sellers, key=lambda p: recent_profit_map.get(p.id, 0), reverse=True)
            top_profit_cutoff = max(3, int(len(active_sellers) * 0.20))
            top_profit_pids = {p.id for p in profit_sorted[:top_profit_cutoff]}

        items = []
        zero_movers = []
        out_of_stock = []
        winners = []
        steady = []
        declining = []
        total_dead_stock_value = Decimal("0.00")
        total_catalogue_stock_value = Decimal("0.00")

        for p in products:
            stats = recent_sales_map.get(p.id, {"units": 0, "revenue": 0, "orders": 0})
            units = stats["units"]
            revenue = stats["revenue"]
            orders = stats["orders"]
            prior_rev = prior_sales_map.get(p.id, 0)
            current_stock = float(p.current_stock or 0)
            base_price = float(p.base_price or 0)
            stock_value = current_stock * base_price
            total_catalogue_stock_value += Decimal(str(stock_value))

            # Profit, Cost & Margin %
            pcost = cost_map.get(p.id)
            unit_cost = pcost if (pcost is not None and pcost > 0) else round(base_price * 0.80, 2)

            if units > 0 and revenue > 0:
                cost_30d = (pcost * units) if (pcost is not None and pcost > 0) else (revenue * 0.80)
                profit_30d = revenue - cost_30d
                margin_pct = (profit_30d / revenue * 100) if revenue > 0 else 0.0
            else:
                cost_30d = 0.0
                profit_30d = 0.0
                unit_margin = base_price - unit_cost
                margin_pct = (unit_margin / base_price * 100) if base_price > 0 else 0.0

            # MoM Trend %
            if prior_rev > 0:
                trend_pct = ((revenue - prior_rev) / prior_rev) * 100
            elif revenue > 0:
                trend_pct = 100.0
            else:
                trend_pct = 0.0

            # Multi-Metric Classification Logic
            if units == 0:
                if current_stock > 0:
                    # Trapped capital: physical stock exists in freezer but zero sales in 30 days
                    classification = "ZERO_MOVER"
                    total_dead_stock_value += Decimal(str(stock_value))
                    zero_movers.append(p.name)
                else:
                    # Unstocked / Dormant catalogue item: 0 sales, 0 stock
                    classification = "OUT_OF_STOCK"
                    out_of_stock.append(p.name)
            else:
                # Active product with sales in 30 days
                # Winner criteria: (Top 20% Revenue OR Top 20% Profit OR Top 20% Volume) + Meaningful Revenue/Profit + Repeat/Bulk Orders + Non-collapsing trend
                is_top_revenue = (p.id in top_rev_pids) and (revenue >= 1000)
                is_top_profit = (p.id in top_profit_pids) and (profit_30d >= 200)
                is_top_volume = (p.id in top_vol_pids) and (units >= 5)
                has_substantive_demand = (orders >= 2) or (units >= 10)
                is_not_collapsing = trend_pct >= -15.0

                if (is_top_revenue or is_top_profit or is_top_volume) and has_substantive_demand and is_not_collapsing and profit_30d >= 0:
                    classification = "WINNER"
                    winners.append(p.name)
                elif trend_pct < -20.0 and prior_rev >= 1000:
                    classification = "DECLINING"
                    declining.append(p.name)
                else:
                    classification = "STEADY"
                    steady.append(p.name)

            item_data = {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "brand": p.brand,
                "category_name": p.category.name if p.category else "General",
                "packaging_unit": p.packaging_unit,
                "units_sold_30d": units,
                "revenue_30d": round(revenue, 2),
                "cost_30d": round(cost_30d, 2),
                "profit_30d": round(profit_30d, 2),
                "margin_pct": round(margin_pct, 1),
                "unit_cost": round(unit_cost, 2),
                "orders_count_30d": orders,
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
                f"Consider bundling {zero_movers[0] if zero_movers else 'dead stock'} with high-velocity winners."
            )
        else:
            insight_summary = "All stocked catalogue products have moved actively in the trailing 30 days! Zero cold-room dead stock."

        total_profit_30d = sum(i["profit_30d"] for i in items)
        total_revenue_30d = sum(i["revenue_30d"] for i in items)
        overall_margin_pct = round((total_profit_30d / total_revenue_30d * 100), 1) if total_revenue_30d > 0 else 0.0

        response_data = {
            "period": current_period,
            "total_skus": len(items),
            "winners_count": len(winners),
            "steady_count": len(steady),
            "declining_count": len(declining),
            "zero_movers_count": len(zero_movers),
            "out_of_stock_count": len(out_of_stock),
            "total_dead_stock_value": float(total_dead_stock_value),
            "total_catalogue_stock_value": float(total_catalogue_stock_value),
            "total_profit_30d": round(total_profit_30d, 2),
            "overall_margin_pct": overall_margin_pct,
            "insight_summary": insight_summary,
            "items": sorted(items, key=lambda x: x["revenue_30d"], reverse=True)
        }

        _MATRIX_CACHE["timestamp"] = now_ts
        _MATRIX_CACHE["data"] = response_data
        return response_data
