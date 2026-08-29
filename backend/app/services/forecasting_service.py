import calendar
from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.invoice import Invoice
from app.models.analytics import MonthlyTarget

class ForecastingService:
    @staticmethod
    def get_sales_forecast(db: Session) -> Dict[str, Any]:
        """
        Sales Forecast vs Actual Intelligence:
        Calculates month-end projection using rolling velocity and 3-month weighted moving average (50/30/20).
        Generates single plain-language story statement and daily pacing sparkline.
        """
        today = date.today()
        year = today.year
        month = today.month
        year_month_str = today.strftime("%Y-%m")
        days_in_month = calendar.monthrange(year, month)[1]
        days_elapsed = max(today.day, 1)

        # 1. Fetch current month's invoiced revenue so far
        current_invoices = db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total")
        ).filter(
            Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"]),
            Invoice.invoice_date >= date(year, month, 1),
            Invoice.invoice_date <= today
        ).scalar()

        current_revenue = float(current_invoices or 0.0)

        # 2. Daily revenue sparkline for the current month
        daily_records = db.query(
            Invoice.invoice_date,
            func.sum(Invoice.total_amount).label("day_total")
        ).filter(
            Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"]),
            Invoice.invoice_date >= date(year, month, 1),
            Invoice.invoice_date <= today
        ).group_by(Invoice.invoice_date).order_by(Invoice.invoice_date.asc()).all()

        daily_map = {r.invoice_date.day: float(r.day_total or 0) for r in daily_records}
        sparkline = []
        cumulative = 0.0
        for d in range(1, days_elapsed + 1):
            day_val = daily_map.get(d, 0.0)
            cumulative += day_val
            sparkline.append({
                "day": d,
                "date": f"{year}-{month:02d}-{d:02d}",
                "daily_revenue": round(day_val, 2),
                "cumulative_revenue": round(cumulative, 2)
            })

        # 3. Trailing 3 Months History for Weighted Moving Average (50/30/20)
        past_months_data = []
        for i in range(1, 4):
            # Calculate prior month
            m = month - i
            y = year
            if m <= 0:
                m += 12
                y -= 1
            start_d = date(y, m, 1)
            end_d = date(y, m, calendar.monthrange(y, m)[1])
            
            m_rev = db.query(func.coalesce(func.sum(Invoice.total_amount), 0)).filter(
                Invoice.status.in_(["ISSUED", "PAID", "PARTIALLY_PAID", "DRAFT"]),
                Invoice.invoice_date >= start_d,
                Invoice.invoice_date <= end_d
            ).scalar()
            past_months_data.append(float(m_rev or 0.0))

        # Weights: Last month 50%, 2nd prior 30%, 3rd prior 20%
        w_m1 = past_months_data[0] if len(past_months_data) > 0 and past_months_data[0] > 0 else current_revenue
        w_m2 = past_months_data[1] if len(past_months_data) > 1 and past_months_data[1] > 0 else current_revenue
        w_m3 = past_months_data[2] if len(past_months_data) > 2 and past_months_data[2] > 0 else current_revenue
        weighted_baseline = (w_m1 * 0.50) + (w_m2 * 0.30) + (w_m3 * 0.20)

        # 4. Projected Month-End Revenue
        daily_run_rate = current_revenue / days_elapsed
        linear_projection = daily_run_rate * days_in_month

        # Blended forecast: 75% current linear velocity + 25% historical weighted baseline
        if current_revenue > 0:
            projected_revenue = (linear_projection * 0.75) + (weighted_baseline * 0.25) if weighted_baseline > 0 else linear_projection
        else:
            projected_revenue = weighted_baseline if weighted_baseline > 0 else 50000.00

        # 5. Fetch Monthly Revenue Target
        target_obj = db.query(MonthlyTarget).filter(MonthlyTarget.year_month == year_month_str).first()
        target_revenue = float(target_obj.target_revenue) if target_obj else 50000.00

        # 6. Comparisons
        target_achievement_pct = round((current_revenue / target_revenue) * 100, 1) if target_revenue > 0 else 0.0
        projected_vs_target_pct = round(((projected_revenue - target_revenue) / target_revenue) * 100, 1) if target_revenue > 0 else 0.0
        
        last_month_name = (today.replace(day=1) - timedelta(days=1)).strftime("%B")
        vs_last_month_pct = round(((projected_revenue - w_m1) / w_m1) * 100, 1) if w_m1 > 0 else 0.0

        # 7. One-Sentence Plain-Language Business Story
        if projected_revenue >= target_revenue:
            story = (
                f"You're pacing at ₹{projected_revenue:,.2f} this month — "
                f"{abs(projected_vs_target_pct)}% ahead of your ₹{target_revenue:,.0f} target."
            )
        else:
            gap = target_revenue - projected_revenue
            story = (
                f"You're pacing at ₹{projected_revenue:,.2f} this month — "
                f"₹{gap:,.2f} behind your ₹{target_revenue:,.0f} monthly goal. "
                f"Focus on high-velocity frozen snacks to close the gap."
            )

        return {
            "year_month": year_month_str,
            "days_elapsed": days_elapsed,
            "days_in_month": days_in_month,
            "current_revenue": round(current_revenue, 2),
            "target_revenue": round(target_revenue, 2),
            "projected_month_end": round(projected_revenue, 2),
            "daily_run_rate": round(daily_run_rate, 2),
            "target_achievement_pct": target_achievement_pct,
            "projected_vs_target_pct": projected_vs_target_pct,
            "vs_last_month_pct": vs_last_month_pct,
            "last_month_revenue": round(w_m1, 2),
            "story": story,
            "sparkline": sparkline
        }

    @staticmethod
    def set_monthly_target(db: Session, year_month: str, target_amount: float, user_id: str = None) -> MonthlyTarget:
        target = db.query(MonthlyTarget).filter(MonthlyTarget.year_month == year_month).first()
        if target:
            target.target_revenue = Decimal(str(target_amount))
            target.set_by = user_id
        else:
            target = MonthlyTarget(
                year_month=year_month,
                target_revenue=Decimal(str(target_amount)),
                set_by=user_id
            )
            db.add(target)
        db.commit()
        db.refresh(target)
        return target
