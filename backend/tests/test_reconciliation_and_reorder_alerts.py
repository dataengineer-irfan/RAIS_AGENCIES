import pytest
from decimal import Decimal
from datetime import date, datetime, timedelta
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.domain.enums import InvoiceStatus, CustomerStatus
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
    """Verifies that Pizza Time balance is exactly 19,028.00 and aging total_due matches customer balance."""
    # Locate or create isolated test customer Pizza Time
    pt = db.query(Customer).filter(Customer.business_name.ilike("%PIZZA TIME%")).first()
    if pt is None:
        pt = Customer(
            customer_code="CUST-0099",
            business_name="PIZZA TIME",
            contact_person="Manager",
            phone="9876543210",
            address_line1="Rayachoty",
            city="Rayachoty",
            opening_balance=Decimal("19028.00"),
            credit_limit=Decimal("50000.00"),
            status=CustomerStatus.ACTIVE.value
        )
        db.add(pt)
        db.commit()

    # Run FIFO reconciliation
    res = ReconciliationService.reconcile_all_fifo(db)
    assert res["total_customers_reconciled"] >= 0

    # Verify live customer balance
    _, _, pt_balance = CustomerService.get_customer_balances(db, pt.id)
    assert pt_balance == Decimal("19028.00"), f"Expected 19028.00, got {pt_balance}"

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

def test_customer_gross_profit_and_commercial_metrics(db):
    """Verifies that customers list and detail return accurate gross profit, total_invoiced, and total_paid."""
    customers = CustomerService.list_customers(db, limit=20)
    assert len(customers) > 0
    for c in customers:
        assert hasattr(c, "gross_profit")
        assert isinstance(c.gross_profit, Decimal)
        assert hasattr(c, "total_invoiced")
        assert isinstance(c.total_invoiced, Decimal)
        assert hasattr(c, "total_paid")
        assert isinstance(c.total_paid, Decimal)
        assert hasattr(c, "outstanding_balance")
        assert isinstance(c.outstanding_balance, Decimal)

    # Test single customer get_customer_by_id matches list batch calculation
    first_c = customers[0]
    single = CustomerService.get_customer_by_id(db, first_c.id)
    assert single.gross_profit == first_c.gross_profit
    assert single.total_invoiced == first_c.total_invoiced
    assert single.total_paid == first_c.total_paid
    assert single.outstanding_balance == first_c.outstanding_balance

