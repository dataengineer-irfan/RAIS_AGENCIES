from decimal import Decimal
from datetime import date
from app.services.reporting_service import ReportingService
from app.services.customer_service import CustomerService

def test_enhanced_dashboard_kpis_and_collections(db):
    kpis = ReportingService.get_dashboard_kpis(db, force_refresh=True)
    assert kpis.revenue_periods is not None
    assert "today" in kpis.revenue_periods
    today_p = kpis.revenue_periods["today"]
    assert "revenue" in today_p
    assert "collections" in today_p
    assert "cash_collected" in today_p
    assert "upi_collected" in today_p
    assert "payments_count" in today_p
    assert isinstance(today_p["collections"], (int, float))
    assert isinstance(today_p["cash_collected"], (int, float))
    assert isinstance(today_p["upi_collected"], (int, float))

    # Real 7-day rolling telemetry
    assert kpis.daily_trend_7d is not None
    assert len(kpis.daily_trend_7d) == 7
    for day_stat in kpis.daily_trend_7d:
        assert "date" in day_stat
        assert "day_label" in day_stat
        assert "revenue" in day_stat
        assert "collections" in day_stat

def test_enhanced_inactive_alerts_with_last_order_and_priority(db):
    alerts = CustomerService.get_inactive_reorder_alerts(db, days_threshold=1)
    if alerts:
        first = alerts[0]
        assert "last_order_amount" in first
        assert "lifetime_spend" in first
        assert "priority_tier" in first
        assert "priority_label" in first
        assert first["priority_tier"] in (1, 2, 3)
