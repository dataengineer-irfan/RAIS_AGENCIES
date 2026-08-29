from typing import List, Dict, Any
from decimal import Decimal
from datetime import datetime, date, timedelta, timezone
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.order import Order

# Simple 60-second in-memory response cache
_HEALTH_CACHE = {"timestamp": 0, "data": None}
CACHE_TTL_SECONDS = 60

class CustomerHealthService:
    @staticmethod
    def get_customer_health_analysis(db: Session, force_refresh: bool = False) -> Dict[str, Any]:
        """
        High-Performance Customer Health Analysis:
        Uses batched queries (3 SQL queries instead of 40+ N+1 loops) + in-memory grouping.
        """
        now_ts = datetime.now(timezone.utc).timestamp()
        if not force_refresh and _HEALTH_CACHE["data"] and (now_ts - _HEALTH_CACHE["timestamp"] < CACHE_TTL_SECONDS):
            return _HEALTH_CACHE["data"]

        today = date.today()

        # Batch Query 1: All active customers (1 round-trip)
        customers = db.query(Customer).filter(Customer.status != "INACTIVE").all()

        # Batch Query 2: All active invoices (1 round-trip)
        all_invoices = db.query(Invoice).filter(Invoice.status != "CANCELLED").all()
        invoices_by_customer = defaultdict(list)
        for inv in all_invoices:
            invoices_by_customer[inv.customer_id].append(inv)

        # Batch Query 3: All orders (1 round-trip)
        all_orders = db.query(Order).order_by(Order.order_date.desc()).all()
        orders_by_customer = defaultdict(list)
        for ord_item in all_orders:
            orders_by_customer[ord_item.customer_id].append(ord_item)

        healthy_count = 0
        watch_count = 0
        at_risk_count = 0
        total_overdue_risk = Decimal("0.00")
        results = []

        for c in customers:
            invoices = invoices_by_customer.get(c.id, [])
            orders = orders_by_customer.get(c.id, [])

            # 1. Total Invoiced and Outstanding
            total_invoiced = sum([inv.total_amount for inv in invoices]) or Decimal("0.00")
            outstanding = sum([inv.outstanding_amount for inv in invoices if inv.status in ["ISSUED", "PARTIALLY_PAID", "OVERDUE", "DRAFT"]]) or Decimal("0.00")

            # 2. Overdue calculation & punctuality
            overdue_invoices = [inv for inv in invoices if inv.outstanding_amount > 0 and inv.due_date and inv.due_date < today]
            overdue_amount = sum([inv.outstanding_amount for inv in overdue_invoices]) or Decimal("0.00")

            days_late_list = [(today - inv.due_date).days for inv in overdue_invoices if inv.due_date]
            avg_days_late = round(sum(days_late_list) / len(days_late_list), 1) if days_late_list else 0.0

            # 3. Order frequency trend
            last_order_date = orders[0].order_date if orders else None
            days_since_last_order = (today - last_order_date).days if last_order_date else 999

            order_freq_trend = "STABLE"
            if len(orders) >= 2:
                recent_gap = (orders[0].order_date - orders[1].order_date).days
                if days_since_last_order > recent_gap * 2 and days_since_last_order > 14:
                    order_freq_trend = "DECAYING"
                elif days_since_last_order < recent_gap:
                    order_freq_trend = "INCREASING"
            elif not orders:
                order_freq_trend = "NO_ORDERS"

            # 4. DSO (Days Sales Outstanding) approx
            dso = round((float(outstanding) / float(total_invoiced) * 30), 1) if total_invoiced > 0 else 0.0

            # 5. Classify Health Traffic Light
            if overdue_amount > 0 and (avg_days_late > 15 or overdue_amount > (c.credit_limit or 10000)):
                health_status = "AT_RISK"
                risk_reason = f"₹{overdue_amount:,.2f} overdue by avg {avg_days_late} days past terms."
                at_risk_count += 1
                total_overdue_risk += overdue_amount
            elif overdue_amount > 0 or order_freq_trend == "DECAYING" or dso > 25:
                health_status = "WATCH"
                risk_reason = f"Payment pending for {len(overdue_invoices)} open invoice(s). Order frequency slowing."
                watch_count += 1
                total_overdue_risk += overdue_amount
            else:
                health_status = "HEALTHY"
                risk_reason = "Payments current and orders within normal cadence."
                healthy_count += 1

            results.append({
                "customer_id": c.id,
                "code": c.customer_code,
                "name": c.business_name,
                "contact_person": c.contact_person,
                "phone": c.phone,
                "total_invoiced": float(total_invoiced),
                "outstanding_balance": float(outstanding),
                "overdue_balance": float(overdue_amount),
                "credit_limit": float(c.credit_limit or 15000),
                "avg_days_late": avg_days_late,
                "days_since_last_order": days_since_last_order if days_since_last_order != 999 else None,
                "order_freq_trend": order_freq_trend,
                "dso_days": dso,
                "health_status": health_status,
                "risk_reason": risk_reason
            })

        # Plain-language insight summary
        if at_risk_count > 0:
            insight_summary = f"{at_risk_count} restaurant client(s) require proactive collection outreach with ₹{total_overdue_risk:,.2f} total at-risk."
        else:
            insight_summary = "All active customer balances are in healthy standing with zero severe overdue risk."

        response_data = {
            "total_customers": len(results),
            "healthy_count": healthy_count,
            "watch_count": watch_count,
            "at_risk_count": at_risk_count,
            "total_overdue_risk": float(total_overdue_risk),
            "insight_summary": insight_summary,
            "customers": sorted(results, key=lambda x: (x["health_status"] == "AT_RISK", x["overdue_balance"]), reverse=True)
        }

        _HEALTH_CACHE["timestamp"] = now_ts
        _HEALTH_CACHE["data"] = response_data
        return response_data
