import pytest
from decimal import Decimal
from datetime import date, datetime, timedelta
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.domain.enums import InvoiceStatus
from app.services.customer_service import CustomerService
from app.services.reconciliation_service import ReconciliationService
from app.services.reporting_service import ReportingService

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_inactive_reorder_alerts_structure(db):
    """Verifies that reorder alerts returns structured outlet data with calculated inactivity."""
    alerts = CustomerService.get_inactive_reorder_alerts(db, days_threshold=5)
    assert isinstance(alerts, list)
    if alerts:
        a = alerts[0]
        assert "customer_id" in a
        assert "customer_code" in a
        assert "business_name" in a
        assert "phone" in a
        assert "days_inactive" in a
        assert a["days_inactive"] >= 5
        assert "outstanding_balance" in a

def test_customer_first_invoice_date_association(db):
    """Verifies that customer listing returns first_invoice_date based on earliest non-cancelled invoice."""
    customers = CustomerService.list_customers(db, limit=20)
    for c in customers:
        if c.first_invoice_date is not None:
            assert isinstance(c.first_invoice_date, date)
            # Earliest invoice date in DB must match first_invoice_date
            earliest = db.query(Invoice.invoice_date).filter(
                Invoice.customer_id == c.id,
                Invoice.status != InvoiceStatus.CANCELLED.value
            ).order_by(Invoice.invoice_date.asc()).first()
            if earliest:
                assert c.first_invoice_date == earliest[0]

def test_fifo_reconciliation_and_pizza_time_balance(db):
    """Verifies that Pizza Time balance is exactly 20,749.00 and aging total_due matches customer balance."""
    # Run FIFO reconciliation
    res = ReconciliationService.reconcile_all_fifo(db)
    assert res["total_customers_reconciled"] > 0

    # Locate Pizza Time
    pt = db.query(Customer).filter(Customer.business_name.ilike("%PIZZA TIME%")).first()
    assert pt is not None

    # Verify live customer balance
    _, _, pt_balance = CustomerService.get_customer_balances(db, pt.id)
    assert pt_balance == Decimal("20749.00"), f"Expected 20749.00, got {pt_balance}"

    # Verify Aging report for Pizza Time
    aging_list = ReportingService.get_customer_aging_breakdown(db, force_refresh=True)
    pt_aging = next((a for a in aging_list if a.customer_id == pt.id), None)
    assert pt_aging is not None
    assert pt_aging.total_due == pt_balance, f"Aging {pt_aging.total_due} does not match customer balance {pt_balance}"

    # Verify Global consistency
    kpis = ReportingService.get_dashboard_kpis(db, force_refresh=True)
    aging_summary = ReportingService.get_aging_summary(db, force_refresh=True)
    sum_cust_aging = sum(a.total_due for a in aging_list)

    assert kpis.total_outstanding == aging_summary.total_outstanding
    assert aging_summary.total_outstanding == sum_cust_aging
