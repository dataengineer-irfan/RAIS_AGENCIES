import pytest
from datetime import datetime, timedelta, timezone
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment, PaymentAllocation
from app.models.user import User
from app.services.financial_audit_service import FinancialAuditService
from app.core.security import hash_password

@pytest.fixture
def audit_test_data(db):
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="audit_tester",
            email="audit_tester@example.com",
            full_name="Audit Tester",
            password_hash=hash_password("password123"),
            role="ADMIN",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

    cust1 = Customer(
        customer_code="CUST-AUDIT-01",
        business_name="Audit Test Resto 1",
        contact_person="Tester 1",
        phone="9876543210",
        address_line1="Shop 1, Rayachoty",
        opening_balance=1000.0,
        status="ACTIVE"
    )
    cust2 = Customer(
        customer_code="CUST-AUDIT-02",
        business_name="Audit Test Resto 2",
        contact_person="Tester 2",
        phone="9876543211",
        address_line1="Shop 2, Rayachoty",
        opening_balance=0.0,
        status="ACTIVE"
    )
    db.add_all([cust1, cust2])
    db.commit()
    db.refresh(cust1)
    db.refresh(cust2)

    # Invoices
    today = datetime.now(timezone.utc).date()
    inv1 = Invoice(
        invoice_number="INV-AUDIT-001",
        customer_id=cust1.id,
        invoice_date=today - timedelta(days=2),
        due_date=today + timedelta(days=10),
        subtotal=2000.0,
        tax_amount=0.0,
        total_amount=2000.0,
        paid_amount=500.0,
        outstanding_amount=1500.0,
        status="ISSUED",
        created_by_id=admin.id
    )
    db.add(inv1)
    db.commit()

    # Payments: 1 legitimate, and 1 pair of rapid-fire duplicates for cust1
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    p_orig = Payment(
        payment_number="PAY-AUDIT-001",
        customer_id=cust1.id,
        amount=500.0,
        allocated_amount=500.0,
        unallocated_amount=0.0,
        payment_date=today,
        payment_method="CASH",
        created_by_id=admin.id,
        created_at=now - timedelta(seconds=15)
    )
    p_dup1 = Payment(
        payment_number="PAY-AUDIT-002",
        customer_id=cust1.id,
        amount=1000.0,
        allocated_amount=0.0,
        unallocated_amount=1000.0,
        payment_date=today,
        payment_method="UPI",
        created_by_id=admin.id,
        created_at=now - timedelta(seconds=5)
    )
    p_dup2 = Payment(
        payment_number="PAY-AUDIT-003",
        customer_id=cust1.id,
        amount=1000.0,
        allocated_amount=0.0,
        unallocated_amount=1000.0,
        payment_date=today,
        payment_method="UPI",
        created_by_id=admin.id,
        created_at=now - timedelta(seconds=2)
    )
    db.add_all([p_orig, p_dup1, p_dup2])
    db.commit()

    return {
        "admin": admin,
        "cust1": cust1,
        "cust2": cust2,
        "inv1": inv1,
        "p_orig": p_orig,
        "p_dup1": p_dup1,
        "p_dup2": p_dup2
    }

def test_financial_audit_scan_anomalies(db, audit_test_data):
    scan_results = FinancialAuditService.scan_anomalies(db)
    assert "summary" in scan_results
    assert "anomalies" in scan_results
    assert "customers" in scan_results

    # Should detect the rapid-fire pair PAY-AUDIT-002 and PAY-AUDIT-003
    anomalies = scan_results["anomalies"]
    assert len(anomalies) >= 1
    flagged = next((a for a in anomalies if a["payment_1_number"] == "PAY-AUDIT-002" or a["payment_2_number"] == "PAY-AUDIT-003"), None)
    assert flagged is not None
    assert flagged["delta_seconds"] <= 10.0
    assert flagged["amount"] == 1000.0

def test_financial_audit_customer_statement_dossier(db, audit_test_data):
    cust1 = audit_test_data["cust1"]
    dossier = FinancialAuditService.get_customer_statement_dossier(db, cust1.id)
    assert dossier["customer"]["customer_code"] == "CUST-AUDIT-01"
    assert "statement" in dossier
    assert "invoices" in dossier
    assert "payments" in dossier
    assert len(dossier["payments"]) >= 3

def test_financial_audit_generate_excel(db, audit_test_data):
    cust1 = audit_test_data["cust1"]
    excel_bytes = FinancialAuditService.generate_excel_audit_workbook(db, [cust1.id])
    assert len(excel_bytes) > 1000
    # Check that it's a valid zip (xlsx) file header: PK\x03\x04
    assert excel_bytes[:4] == b"PK\x03\x04"

def test_financial_audit_resolve_duplicate_payment(db, audit_test_data):
    admin = audit_test_data["admin"]
    p_dup2 = audit_test_data["p_dup2"]
    cust1 = audit_test_data["cust1"]

    res = FinancialAuditService.resolve_phantom_payment(
        db=db,
        payment_number=p_dup2.payment_number,
        reason="Test rapid-fire duplicate removal",
        user_id=admin.id,
        username=admin.username
    )
    assert res["success"] is True
    assert p_dup2.payment_number in res["message"]

    # Verify payment is soft-deleted (status CANCELLED, physical row preserved)
    cancelled_pay = db.query(Payment).filter(Payment.payment_number == p_dup2.payment_number).first()
    assert cancelled_pay is not None
    assert cancelled_pay.status == "CANCELLED"

def test_financial_audit_margin_leakage_records(db, audit_test_data):
    leakage = FinancialAuditService.get_margin_leakage_records(db)
    assert "summary" in leakage
    assert "items" in leakage
    assert isinstance(leakage["summary"]["total_loss"], float)
    assert isinstance(leakage["items"], list)
