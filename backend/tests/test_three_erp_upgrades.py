import pytest
from decimal import Decimal
from datetime import date, datetime, timezone
import uuid

from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment
from app.models.customer_ledger import CustomerLedgerEntry
from app.domain.enums import InvoiceStatus, PaymentMethod
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.payment import PaymentCreate
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.services.customer_service import CustomerService
from app.services.inventory_service import InventoryService
from app.services.financial_audit_service import FinancialAuditService
from app.schemas.inventory import ReceiveStockRequest

@pytest.fixture
def test_setup(db):
    # Unique suffix to prevent test clashes
    uid = uuid.uuid4().hex[:6]
    
    cat = Category(id=f"cat-{uid}", name=f"Test Cat {uid}", code=f"TC-{uid}")
    db.add(cat)
    prod = Product(
        id=f"prod-{uid}",
        sku=f"SKU-ERP-{uid}",
        category_id=cat.id,
        name=f"Test Frozen Item {uid}",
        brand="RAIS Test",
        packaging_unit="PKT",
        unit_quantity=Decimal("1.00"),
        base_price=Decimal("120.00"),
        tax_rate=Decimal("0.00"),
        current_stock=Decimal("100.00"),
        min_stock_alert=Decimal("10.00"),
        is_active=True
    )
    db.add(prod)
    cust = Customer(
        id=f"cust-{uid}",
        customer_code=f"CUST-ERP-{uid}",
        business_name=f"Test Cafe {uid}",
        contact_person="Tester",
        phone=f"999{uid[:7]}",
        address_line1="123 Test St",
        city="Rayachoty",
        state="AP",
        pincode="516269",
        credit_limit=Decimal("50000.00"),
        opening_balance=Decimal("0.00")
    )
    db.add(cust)
    db.flush()
    
    return {"cat": cat, "prod": prod, "cust": cust}

def test_upgrade_1_freeze_landed_cost(db, test_setup):
    """
    UPGRADE 1:
    1. Inward receipt logged at ₹60.00
    2. Invoice issued at ₹65.00 -> landed_cost frozen at ₹60.00
    3. New inward receipt logged later at ₹100.00
    4. Historical invoice line item MUST STILL retain landed_cost = ₹60.00
    5. Margin leakage audit MUST NOT flag historical invoice as a loss
    """
    prod = test_setup["prod"]
    cust = test_setup["cust"]
    
    # 1. Inward stock delivery at ₹60.00
    req1 = ReceiveStockRequest(
        product_id=prod.id,
        quantity=Decimal("50.00"),
        purchase_cost=Decimal("60.00"),
        supplier="Supplier Alpha"
    )
    InventoryService.receive_stock(db, req1)
    
    # 2. Issue invoice billed at ₹65.00
    inv_data = InvoiceCreate(
        customer_id=cust.id,
        invoice_date=date(2026, 10, 15),
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("2.00"),
                unit_price=Decimal("65.00"),
                discount_rate=Decimal("0.00")
            )
        ],
        auto_issue=True
    )
    inv = BillingService.create_invoice(db, inv_data)
    
    assert len(inv.items) == 1
    item = inv.items[0]
    assert item.landed_cost == Decimal("60.00")
    assert item.cost_source == "INWARD_RECEIPT"
    
    # 3. Future stock delivery arrives at higher price ₹100.00
    req2 = ReceiveStockRequest(
        product_id=prod.id,
        quantity=Decimal("50.00"),
        purchase_cost=Decimal("100.00"),
        supplier="Supplier Beta"
    )
    InventoryService.receive_stock(db, req2)
    
    # Refresh invoice item from DB
    db.refresh(item)
    
    # 4. CRITICAL ASSERTION: Historical landed cost remains frozen at ₹60.00
    assert item.landed_cost == Decimal("60.00"), "Historical invoice landed cost was improperly mutated by new receipt!"
    
    # 5. Financial Audit Service must see unit_price ₹65 >= landed_cost ₹60 -> No leakage!
    leakage = FinancialAuditService.get_margin_leakage_records(db, search=inv.invoice_number)
    matching_leakage = [x for x in leakage["items"] if x["invoice_number"] == inv.invoice_number]
    assert len(matching_leakage) == 0, "Historical invoice was falsely flagged as margin leakage!"

def test_upgrade_2_idempotency_duplicate_protection(db, test_setup):
    """
    UPGRADE 2:
    1. First payment submitted with idempotency_key
    2. Repeated submission with identical idempotency_key returns original payment
    3. Exactly 1 payment record exists in the database
    """
    cust = test_setup["cust"]
    idem_key = f"idem-key-{uuid.uuid4().hex}"
    
    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("700.00"),
        payment_method="UPI",
        reference_number="UPI-REF-001",
        idempotency_key=idem_key
    )
    
    # First submit
    p1 = PaymentService.record_payment(db, pay_data)
    db.commit()
    assert p1.id is not None
    assert p1.idempotency_key == idem_key
    
    # Rapid second submit (e.g. double click)
    p2 = PaymentService.record_payment(db, pay_data)
    
    # Both must resolve to the identical transaction record
    assert p1.id == p2.id
    assert p1.payment_number == p2.payment_number
    
    # DB count check
    count = db.query(Payment).filter(Payment.idempotency_key == idem_key).count()
    assert count == 1, "Duplicate payment record was inserted despite idempotency key!"

def test_upgrade_3_strict_double_entry_ledger(db, test_setup):
    """
    UPGRADE 3:
    1. Invoice issued -> Debit posted to CustomerLedgerEntry
    2. Payment received -> Credit posted to CustomerLedgerEntry
    3. Invoice cancelled -> Reversal credit posted to CustomerLedgerEntry
    4. Running balance matches CustomerService.get_customer_balances()
    """
    prod = test_setup["prod"]
    cust = test_setup["cust"]
    
    # 1. Issue Invoice ₹500
    inv_data = InvoiceCreate(
        customer_id=cust.id,
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("5.00"),
                unit_price=Decimal("100.00"),
                discount_rate=Decimal("0.00")
            )
        ],
        auto_issue=True
    )
    inv = BillingService.create_invoice(db, inv_data)
    db.commit()
    
    # Check ledger debit entry
    entries = db.query(CustomerLedgerEntry).filter(
        CustomerLedgerEntry.customer_id == cust.id
    ).order_by(CustomerLedgerEntry.created_at.asc()).all()
    
    assert len(entries) >= 1
    inv_entry = entries[-1]
    assert inv_entry.entry_type == "INVOICE"
    assert inv_entry.debit == Decimal("500.00")
    assert inv_entry.credit == Decimal("0.00")
    assert inv_entry.running_balance == Decimal("500.00")
    
    # 2. Record Payment ₹300
    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("300.00"),
        payment_method="CASH",
        idempotency_key=f"pay-idem-{uuid.uuid4().hex}"
    )
    p = PaymentService.record_payment(db, pay_data)
    db.commit()
    
    # Check ledger credit entry
    entries_after_pay = db.query(CustomerLedgerEntry).filter(
        CustomerLedgerEntry.customer_id == cust.id
    ).order_by(CustomerLedgerEntry.created_at.asc()).all()
    
    pay_entry = entries_after_pay[-1]
    assert pay_entry.entry_type == "PAYMENT"
    assert pay_entry.debit == Decimal("0.00")
    assert pay_entry.credit == Decimal("300.00")
    assert pay_entry.running_balance == Decimal("200.00")
    
    # 3. Verify customer balance matches
    _, _, expected_bal = CustomerService.get_customer_balances(db, cust.id)
    assert pay_entry.running_balance == expected_bal
    assert expected_bal == Decimal("200.00")

def test_concurrent_payment_idempotency_savepoint(db, test_setup):
    """
    REMEDIATION TEST: Repeated payment submission with identical idempotency key.
    - Resolves duplicate submission gracefully
    - Zero unhandled IntegrityErrors / HTTP 500
    - Exactly 1 payment, 1 ledger entry, 0 duplicate allocations
    """
    cust = test_setup["cust"]
    idem_key = f"IDEM-KEY-{uuid.uuid4().hex}"

    pay_data = PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("450.00"),
        payment_method="UPI",
        reference_number="REQ-1",
        notes="__ALLOW_RAPID_DUPLICATE__",
        idempotency_key=idem_key
    )

    # First attempt succeeds
    res1 = PaymentService.record_payment(db, pay_data)
    db.flush()

    # Second rapid retry attempt with identical key returns original payment without error
    res2 = PaymentService.record_payment(db, pay_data)
    db.flush()

    # Third retry attempt with identical key returns original payment without error
    res3 = PaymentService.record_payment(db, pay_data)
    db.flush()

    assert res1.id == res2.id == res3.id
    assert res1.payment_number == res2.payment_number == res3.payment_number

    # Verify database state: exactly 1 payment record and 1 ledger entry
    db_count = db.query(Payment).filter(Payment.idempotency_key == idem_key).count()
    assert db_count == 1, f"Expected exactly 1 payment record in DB, found {db_count}"

    ledger_count = db.query(CustomerLedgerEntry).filter(CustomerLedgerEntry.reference_id == res1.id).count()
    assert ledger_count == 1, f"Expected exactly 1 ledger entry for payment, found {ledger_count}"

def test_two_legitimate_identical_payments_succeed(db, test_setup):
    """
    Two legitimate payments with identical customer, amount, method, date,
    but different idempotency keys must both succeed.
    """
    cust = test_setup["cust"]
    key1 = f"LEGIT-1-{uuid.uuid4().hex}"
    key2 = f"LEGIT-2-{uuid.uuid4().hex}"

    pay1 = PaymentService.record_payment(db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("250.00"),
        payment_method="CASH",
        notes="__ALLOW_RAPID_DUPLICATE__",
        idempotency_key=key1
    ))
    db.commit()

    pay2 = PaymentService.record_payment(db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("250.00"),
        payment_method="CASH",
        notes="__ALLOW_RAPID_DUPLICATE__",
        idempotency_key=key2
    ))
    db.commit()

    assert pay1.id != pay2.id
    assert pay1.payment_number != pay2.payment_number

def test_omitted_idempotency_key_safe_fallback(db, test_setup):
    """
    When idempotency_key is omitted (None or empty), backend assigns a safe
    PAY-AUTO-<uuid> key. Two sequential identical payments both succeed.
    """
    cust = test_setup["cust"]

    pay1 = PaymentService.record_payment(db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("175.00"),
        payment_method="CASH",
        notes="__ALLOW_RAPID_DUPLICATE__",
        idempotency_key=None
    ))
    db.commit()

    pay2 = PaymentService.record_payment(db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("175.00"),
        payment_method="CASH",
        notes="__ALLOW_RAPID_DUPLICATE__",
        idempotency_key=""
    ))
    db.commit()

    assert pay1.id != pay2.id
    assert pay1.idempotency_key.startswith("PAY-AUTO-")
    assert pay2.idempotency_key.startswith("PAY-AUTO-")
    assert pay1.idempotency_key != pay2.idempotency_key

def test_payment_soft_deletion_and_reversal(db, test_setup):
    """
    REMEDIATION TEST: Soft cancellation of payment.
    - Physical row preserved with status='CANCELLED'
    - Customer ledger reversal entry created
    - Subsequent attempt to cancel raises InvalidFinancialOperationException
    """
    from app.core.exceptions import InvalidFinancialOperationException
    cust = test_setup["cust"]

    pay = PaymentService.record_payment(db, PaymentCreate(
        customer_id=cust.id,
        amount=Decimal("500.00"),
        payment_method="UPI",
        idempotency_key=f"SOFT-DEL-{uuid.uuid4().hex}"
    ))
    db.commit()
    pay_id = pay.id

    # Execute soft cancellation
    result = PaymentService.delete_payment(db, pay_id)

    # Physical row is preserved in database
    refreshed_pay = db.query(Payment).filter(Payment.id == pay_id).first()
    assert refreshed_pay is not None, "Payment row was physically deleted!"
    assert refreshed_pay.status == "CANCELLED"
    assert refreshed_pay.cancelled_at is not None

    # Customer ledger reversal exists
    rev_entry = db.query(CustomerLedgerEntry).filter(
        CustomerLedgerEntry.customer_id == cust.id,
        CustomerLedgerEntry.entry_type == "PAYMENT_REVERSAL",
        CustomerLedgerEntry.reference_id == pay_id
    ).first()
    assert rev_entry is not None, "Customer ledger reversal entry was not created!"
    assert rev_entry.debit == Decimal("500.00")

    # Repeat cancellation must be blocked
    with pytest.raises(InvalidFinancialOperationException):
        PaymentService.delete_payment(db, pay_id)

def test_invoice_edit_preserves_landed_cost_and_updates_ledger(db, test_setup):
    """
    REMEDIATION TEST: Editing invoice line items preserves original frozen landed cost
    and posts ADJUSTMENT to customer ledger if total changed.
    """
    from app.schemas.invoice import InvoiceUpdate, InvoiceItemCreate
    prod = test_setup["prod"]
    cust = test_setup["cust"]

    # 1. Inward receipt logged at ₹45.00
    req = ReceiveStockRequest(
        product_id=prod.id,
        quantity=Decimal("20.00"),
        purchase_cost=Decimal("45.00"),
        supplier="Supplier Gamma"
    )
    InventoryService.receive_stock(db, req)

    # 2. Issue invoice for 2 items at ₹80.00
    inv = BillingService.create_invoice(db, InvoiceCreate(
        customer_id=cust.id,
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("2.00"),
                unit_price=Decimal("80.00"),
                discount_rate=Decimal("0.00")
            )
        ],
        auto_issue=True
    ))
    db.commit()

    assert inv.items[0].landed_cost == Decimal("45.00")
    assert inv.items[0].cost_source == "INWARD_RECEIPT"
    assert inv.total_amount == Decimal("160.00")

    # 3. Future stock inward at ₹95.00
    InventoryService.receive_stock(db, ReceiveStockRequest(
        product_id=prod.id,
        quantity=Decimal("20.00"),
        purchase_cost=Decimal("95.00"),
        supplier="Supplier Delta"
    ))

    # 4. Edit invoice: increase quantity to 3 items
    updated_inv = BillingService.update_invoice(db, inv.id, InvoiceUpdate(
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                quantity=Decimal("3.00"),
                unit_price=Decimal("80.00"),
                discount_rate=Decimal("0.00")
            )
        ]
    ))
    db.commit()

    # CRITICAL: landed_cost must STILL be ₹45.00 (not overwritten with ₹95.00!)
    assert updated_inv.items[0].landed_cost == Decimal("45.00")
    assert updated_inv.items[0].cost_source == "INWARD_RECEIPT"
    assert updated_inv.total_amount == Decimal("240.00")

    # Ledger entry ADJUSTMENT must exist for ₹80 diff
    adj_entry = db.query(CustomerLedgerEntry).filter(
        CustomerLedgerEntry.customer_id == cust.id,
        CustomerLedgerEntry.entry_type == "ADJUSTMENT",
        CustomerLedgerEntry.reference_id == inv.id
    ).first()
    assert adj_entry is not None
    assert adj_entry.debit == Decimal("80.00")

def test_margin_leakage_excludes_estimated_by_default(db):
    """
    REMEDIATION TEST: Margin leakage report excludes ESTIMATED_80PCT by default,
    and includes with is_verified=False when include_estimated=True.
    """
    res_verified = FinancialAuditService.get_margin_leakage_records(db, include_estimated=False)
    for itm in res_verified["items"]:
        assert itm["is_verified"] is True
        assert itm["cost_source"] != "ESTIMATED_80PCT"

    res_all = FinancialAuditService.get_margin_leakage_records(db, include_estimated=True)
    estimated_items = [itm for itm in res_all["items"] if itm["cost_source"] == "ESTIMATED_80PCT"]
    for itm in estimated_items:
        assert itm["is_verified"] is False
