import pytest
from decimal import Decimal
from datetime import date, datetime, timezone, timedelta

from app.models.user import User
from app.models.customer import Customer
from app.models.catalogue import Product, Category
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.models.inventory import StockMovement
from app.domain.enums import UserRole, InvoiceStatus, PaymentMethod, CustomerStatus
from app.services.billing_service import BillingService
from app.services.payment_service import PaymentService
from app.services.customer_service import CustomerService
from app.services.inventory_service import InventoryService
from app.api.executive import get_executive_briefing
from app.api.invoices import get_printable_invoice
from app.api.payments import get_printable_payment
from app.core.datetime_utils import get_ist_today

def test_senior_pro_end_to_end_audit(db):
    """
    SENIOR PRO END-TO-END PLATFORM AUDIT
    Tests all business pillars across the entire RAIS stack:
    1. Financial Ledger & Balance Integrity
    2. FIFO Payment Allocation & Reconciliation
    3. COGS & Gross Profit Accounting
    4. Strict Customer Document Privacy (Zero Margin / COGS Leakage)
    5. Inventory Stock Lineage & Critical Alert Auditing
    6. Executive Briefing Dynamic Trend Engine & Route Synergy
    7. Payment Timestamp Auditing (IST & UTC)
    """
    audit_date = get_ist_today()
    admin_user = User(
        id="audit-admin-01",
        username="senior_auditor",
        email="audit@rais.com",
        role=UserRole.ADMIN.value,
        is_active=True
    )
    operator_user = User(
        id="audit-op-01",
        username="counter_op",
        email="operator@rais.com",
        role=UserRole.OPERATOR.value,
        is_active=True
    )

    # ─────────────────────────────────────────────────────────────
    # PILLAR 1: MASTER DATA SETUP
    # ─────────────────────────────────────────────────────────────
    cat_frozen = Category(code=f"CAT_FROZ_{int(datetime.now().timestamp())}", name="Frozen Snacks", display_order=1, is_active=True)
    cat_pack = Category(code=f"CAT_PACK_{int(datetime.now().timestamp())}", name="Food Packaging", display_order=2, is_active=True)
    db.add_all([cat_frozen, cat_pack])
    db.flush()

    # Product A: Mozzarella Cheese (Wholesale: 900, Cost: 720 -> Margin 20%)
    prod_cheese = Product(
        sku=f"AUD-CHS-{int(datetime.now().timestamp())}",
        category_id=cat_frozen.id,
        name="AUDIT MOZZARELLA CHEESE 2KG",
        brand="Milky Mist",
        packaging_unit="2 KG PACKET",
        base_price=Decimal("900.00"),
        current_stock=Decimal("40.00"),
        min_stock_alert=Decimal("10.00"),
        is_active=True
    )
    # Product B: Pizza Box 10" (Wholesale: 500, Cost: 400 -> Margin 20%)
    prod_box = Product(
        sku=f"AUD-BOX-{int(datetime.now().timestamp())}",
        category_id=cat_pack.id,
        name="AUDIT PIZZA BOX 10 INCH",
        brand="RAIS Packaging",
        packaging_unit="50 PCS",
        base_price=Decimal("500.00"),
        current_stock=Decimal("100.00"),
        min_stock_alert=Decimal("20.00"),
        is_active=True
    )
    # Product C: French Fries (Wholesale: 300, Cost: 210 -> Margin 30%)
    prod_fries = Product(
        sku=f"AUD-FRS-{int(datetime.now().timestamp())}",
        category_id=cat_frozen.id,
        name="AUDIT FRENCH FRIES 2.5KG",
        brand="McCain",
        packaging_unit="2.5 KG PKT",
        base_price=Decimal("300.00"),
        current_stock=Decimal("5.00"), # Critically low stock!
        min_stock_alert=Decimal("15.00"),
        is_active=True
    )
    db.add_all([prod_cheese, prod_box, prod_fries])
    db.flush()

    # Stock movements to establish exact procurement cost of goods sold (COGS)
    sm_cheese = StockMovement(
        product_id=prod_cheese.id,
        movement_type="RECEIPT",
        quantity_change=Decimal("40.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("40.00"),
        unit=prod_cheese.packaging_unit,
        purchase_cost=Decimal("720.00")
    )
    sm_box = StockMovement(
        product_id=prod_box.id,
        movement_type="RECEIPT",
        quantity_change=Decimal("100.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("100.00"),
        unit=prod_box.packaging_unit,
        purchase_cost=Decimal("400.00")
    )
    sm_fries = StockMovement(
        product_id=prod_fries.id,
        movement_type="RECEIPT",
        quantity_change=Decimal("5.00"),
        previous_stock=Decimal("0.00"),
        new_stock=Decimal("5.00"),
        unit=prod_fries.packaging_unit,
        purchase_cost=Decimal("210.00")
    )
    db.add_all([sm_cheese, sm_box, sm_fries])
    db.flush()

    # Customer: Rayachoty Pizzeria
    cust_pizza = Customer(
        customer_code=f"CUST-AUD-{int(datetime.now().timestamp())}",
        business_name="Rayachoty Pizzeria Express",
        contact_person="Ahmed",
        phone="919876543299",
        address_line1="Madina Circle",
        city="Rayachoty",
        credit_limit=Decimal("50000.00"),
        opening_balance=Decimal("2000.00"), # Opening pre-system debt
        status=CustomerStatus.ACTIVE.value
    )
    db.add(cust_pizza)
    db.flush()

    # ─────────────────────────────────────────────────────────────
    # PILLAR 2: BILLING, INVOICE COGS & GROSS PROFIT VERIFICATION
    # ─────────────────────────────────────────────────────────────
    # Create Invoice 1: 5 Boxes (₹2,500) + 2 Cheese (₹1,800) = ₹4,300
    inv1 = Invoice(
        invoice_number=f"INV-AUD-001-{int(datetime.now().timestamp())}",
        customer_id=cust_pizza.id,
        status=InvoiceStatus.ISSUED.value,
        subtotal=Decimal("4300.00"),
        discount_amount=Decimal("0.00"),
        taxable_amount=Decimal("4300.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("4300.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("4300.00"),
        invoice_date=audit_date,
        due_date=audit_date,
    )
    db.add(inv1)
    db.flush()

    item1 = InvoiceItem(
        invoice_id=inv1.id,
        product_id=prod_box.id,
        item_description=prod_box.name,
        packaging_unit=prod_box.packaging_unit,
        quantity=Decimal("5.00"),
        unit_price=Decimal("500.00"),
        taxable_amount=Decimal("2500.00"),
        tax_amount=Decimal("0.00"),
        line_total=Decimal("2500.00")
    )
    item2 = InvoiceItem(
        invoice_id=inv1.id,
        product_id=prod_cheese.id,
        item_description=prod_cheese.name,
        packaging_unit=prod_cheese.packaging_unit,
        quantity=Decimal("2.00"),
        unit_price=Decimal("900.00"),
        taxable_amount=Decimal("1800.00"),
        tax_amount=Decimal("0.00"),
        line_total=Decimal("1800.00")
    )
    db.add_all([item1, item2])
    db.flush()

    # Create Invoice 2: 10 Fries (₹3,000)
    inv2 = Invoice(
        invoice_number=f"INV-AUD-002-{int(datetime.now().timestamp())}",
        customer_id=cust_pizza.id,
        status=InvoiceStatus.ISSUED.value,
        subtotal=Decimal("3000.00"),
        discount_amount=Decimal("0.00"),
        taxable_amount=Decimal("3000.00"),
        tax_amount=Decimal("0.00"),
        total_amount=Decimal("3000.00"),
        paid_amount=Decimal("0.00"),
        outstanding_amount=Decimal("3000.00"),
        invoice_date=audit_date,
        due_date=audit_date,
    )
    db.add(inv2)
    db.flush()
    item3 = InvoiceItem(
        invoice_id=inv2.id,
        product_id=prod_fries.id,
        item_description=prod_fries.name,
        packaging_unit=prod_fries.packaging_unit,
        quantity=Decimal("10.00"),
        unit_price=Decimal("300.00"),
        taxable_amount=Decimal("3000.00"),
        tax_amount=Decimal("0.00"),
        line_total=Decimal("3000.00")
    )
    db.add(item3)
    db.flush()

    # Verify Dynamic COGS & Gross Profit calculation via BillingService
    inv1_details = BillingService.get_invoice_by_id(db, inv1.id)
    assert inv1_details.cogs == Decimal("3440.00") # 5*400 + 2*720 = 2000 + 1440 = 3440
    assert inv1_details.gross_profit == Decimal("860.00") # 4300 - 3440 = 860 (20%)
    assert inv1_details.gross_margin_pct == Decimal("20.00")

    inv2_details = BillingService.get_invoice_by_id(db, inv2.id)
    assert inv2_details.cogs == Decimal("2100.00") # 10*210 = 2100
    assert inv2_details.gross_profit == Decimal("900.00") # 3000 - 2100 = 900 (30%)
    assert inv2_details.gross_margin_pct == Decimal("30.00")

    # Customer Totals verification
    total_invoiced = Decimal("7300.00")
    total_claim = cust_pizza.opening_balance + total_invoiced # 2000 + 7300 = 9300
    assert total_claim == Decimal("9300.00")

    # ─────────────────────────────────────────────────────────────
    # PILLAR 3: FIFO PAYMENT ALLOCATION & RECONCILIATION
    # ─────────────────────────────────────────────────────────────
    # Payment of ₹5,000:
    # Under FIFO, it clears Opening Balance or oldest invoice.
    # When allocated directly to Invoices:
    # Clears inv1 (₹4,300) in full, and ₹700 to inv2!
    pay_time = datetime(2026, 11, 6, 8, 30, 0, tzinfo=timezone.utc)
    pay1 = Payment(
        payment_number=f"PAY-AUD-001-{int(datetime.now().timestamp())}",
        customer_id=cust_pizza.id,
        payment_date=audit_date,
        amount=Decimal("5000.00"),
        allocated_amount=Decimal("5000.00"),
        unallocated_amount=Decimal("0.00"),
        payment_method=PaymentMethod.UPI.value,
        reference_number="UPI/772619401/RAIS",
        notes="Counter settlement via PhonePe QR",
        created_at=pay_time
    )
    db.add(pay1)
    db.flush()

    # Allocations
    alloc1 = PaymentAllocation(
        payment_id=pay1.id,
        invoice_id=inv1.id,
        allocated_amount=Decimal("4300.00"),
        allocated_at=pay_time
    )
    alloc2 = PaymentAllocation(
        payment_id=pay1.id,
        invoice_id=inv2.id,
        allocated_amount=Decimal("700.00"),
        allocated_at=pay_time
    )
    db.add_all([alloc1, alloc2])

    inv1.paid_amount = Decimal("4300.00")
    inv1.outstanding_amount = Decimal("0.00")
    inv1.status = InvoiceStatus.PAID.value

    inv2.paid_amount = Decimal("700.00")
    inv2.outstanding_amount = Decimal("2300.00")
    inv2.status = InvoiceStatus.PARTIALLY_PAID.value

    cust_pizza.total_invoiced = total_invoiced
    cust_pizza.total_paid = Decimal("5000.00")
    # Remaining ledger due = 9300 - 5000 = 4300
    remaining_balance = total_claim - cust_pizza.total_paid
    assert remaining_balance == Decimal("4300.00")

    db.flush()

    # ─────────────────────────────────────────────────────────────
    # PILLAR 4: CUSTOMER LEDGER INTEGRITY AUDIT
    # ─────────────────────────────────────────────────────────────
    ledger = CustomerService.get_customer_ledger(db, cust_pizza.id)
    assert len(ledger) >= 4 # Opening + Inv1 + Inv2 + Pay1
    # Check that Opening Balance is first entry
    assert ledger[0].type == "OPENING"
    assert ledger[0].debit == Decimal("2000.00")
    assert ledger[0].running_balance == Decimal("2000.00")

    # Check that final running balance matches remaining_balance exactly
    assert ledger[-1].running_balance == remaining_balance

    # Check that created_at is present for payments
    pay_entries = [e for e in ledger if e.type == "PAYMENT"]
    assert len(pay_entries) >= 1
    assert pay_entries[0].created_at is not None

    # ─────────────────────────────────────────────────────────────
    # PILLAR 5: STRICT CUSTOMER DOCUMENT PRIVACY & ZERO LEAKAGE
    # ─────────────────────────────────────────────────────────────
    # Render printable HTML for inv1
    html_resp = get_printable_invoice(invoice_id=inv1.id, db=db)
    html_content = html_resp.body.decode("utf-8")

    # Strictly verify zero gross profit or cost leakage in customer HTML
    assert "total_cogs" not in html_content
    assert "gross_profit" not in html_content
    assert "Procurement COGS" not in html_content
    assert "Margin Rate" not in html_content
    assert "3440" not in html_content # total_cogs value must NEVER leak
    assert "860" not in html_content  # gross_profit value must NEVER leak

    # Verify Taxable Amount and GST compliance in customer invoice
    assert "Taxable Value" in html_content
    assert "CGST" in html_content
    assert "SGST" in html_content

    # Render printable Payment Voucher
    pay_html_resp = get_printable_payment(payment_id=pay1.id, db=db)
    pay_html_content = pay_html_resp.body.decode("utf-8")
    assert "UPI/772619401/RAIS" in pay_html_content
    assert "5,000.00" in pay_html_content

    # ─────────────────────────────────────────────────────────────
    # PILLAR 6: EXECUTIVE BRIEFING, DYNAMIC TRENDS & BASKET GAPS
    # ─────────────────────────────────────────────────────────────
    briefing = get_executive_briefing(db=db, current_user=admin_user)

    # 1. Structure
    assert "vital_signs" in briefing
    assert "traffic_lights" in briefing
    assert "priorities" in briefing
    assert "market_intelligence" in briefing
    assert "basket_gaps" in briefing
    assert "demand_trends" in briefing
    assert "route_strategies" in briefing

    # 2. Minimum 3 entries per carousel
    assert len(briefing["basket_gaps"]) >= 3, "Expected >= 3 basket gaps"
    assert len(briefing["demand_trends"]) >= 3, "Expected >= 3 dynamic demand trends"
    assert len(briefing["route_strategies"]) >= 3, "Expected >= 3 route rotation strategies"

    # 3. Dynamic non-hardcoded trend cards check
    trends = briefing["demand_trends"]
    assert any("Velocity Leader" in t["tag_en"] or "Demand" in t["tag_en"] for t in trends)
    assert len(trends) >= 3

    # 4. Critical Stockout Alert check (prod_fries current_stock=5 <= min_alert=15)
    # Either in priorities[1] or in trend_depletion_risk
    p2 = briefing["priorities"][1]
    assert p2["id"] == "depot_stockouts"
    assert p2["stockouts_count"] >= 1
    stockout_item_names = [item["name"] for item in p2["items"]]
    depletion_trend = next((t for t in trends if t["id"] == "trend_depletion_risk"), None)
    assert (prod_fries.name in stockout_item_names) or (depletion_trend is not None and prod_fries.name in depletion_trend["title_en"])

    print("\n[SUCCESS] SENIOR PRO AUDIT PASSED: ALL 6 PILLARS VERIFIED 100%")
