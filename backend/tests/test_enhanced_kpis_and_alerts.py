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

def test_product_performance_matrix_margins_and_sorting(db):
    from app.services.product_performance_service import ProductPerformanceService
    matrix = ProductPerformanceService.get_product_matrix(db, force_refresh=True)
    assert matrix is not None
    assert "total_skus" in matrix
    assert "total_profit_30d" in matrix
    assert "overall_margin_pct" in matrix
    assert isinstance(matrix["items"], list)
    if matrix["items"]:
        item = matrix["items"][0]
        assert "profit_30d" in item
        assert "margin_pct" in item
        assert "cost_30d" in item
        assert "unit_cost" in item
        assert "revenue_30d" in item
        assert isinstance(item["profit_30d"], (int, float))
        assert isinstance(item["margin_pct"], (int, float))

def test_today_zero_business_accuracy(db):
    """
    Verifies that when no invoices or payments have been recorded for today (IST),
    the dashboard KPI endpoint returns strictly 0 revenue, 0 bills, 0 collections, and 0 receipts for 'today'.
    """
    from datetime import timedelta
    from app.core.datetime_utils import get_ist_today
    from app.models.invoice import Invoice
    from app.models.payment import Payment

    today_ist = get_ist_today()
    yest_ist = today_ist - timedelta(days=1)

    # Ensure any existing invoices/payments in the test db are pushed to yesterday
    db.query(Invoice).filter(Invoice.invoice_date == today_ist).update({"invoice_date": yest_ist})
    db.query(Payment).filter(Payment.payment_date == today_ist).update({"payment_date": yest_ist})
    db.commit()

    kpis = ReportingService.get_dashboard_kpis(db, force_refresh=True)
    today_p = kpis.revenue_periods["today"]

    assert today_p["revenue"] == 0.0, f"Expected ₹0.00 revenue for today, got {today_p['revenue']}"
    assert today_p["invoices_count"] == 0, f"Expected 0 invoices for today, got {today_p['invoices_count']}"
    assert today_p["collections"] == 0.0, f"Expected ₹0.00 collections for today, got {today_p['collections']}"
    assert today_p["payments_count"] == 0, f"Expected 0 payments for today, got {today_p['payments_count']}"
    assert today_p["cash_collected"] == 0.0
    assert today_p["upi_collected"] == 0.0


