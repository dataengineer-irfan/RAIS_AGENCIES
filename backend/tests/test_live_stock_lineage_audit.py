import os
import sys
from decimal import Decimal
from datetime import date

os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, ".")

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate
from app.schemas.inventory import ReceiveStockRequest, AdjustStockRequest
from app.services.billing_service import BillingService
from app.services.inventory_service import InventoryService


def test_live_stock_lineage_audit_and_price_integrity():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Category
    cat = db.query(Category).filter_by(code="DAIRY").first()
    if not cat:
        cat = Category(code="DAIRY", name="Dairy")
        db.add(cat)
        db.commit()

    # Seed Customers
    cust_a = db.query(Customer).filter_by(customer_code="CUST-0034").first()
    if not cust_a:
        cust_a = Customer(
            customer_code="CUST-0034",
            business_name="Mohammed Walid sundupalli",
            contact_person="Walid",
            phone="9999999991",
            address_line1="Main Road"
        )
        db.add(cust_a)

    cust_b = db.query(Customer).filter_by(customer_code="CUST-0012").first()
    if not cust_b:
        cust_b = Customer(
            customer_code="CUST-0012",
            business_name="Hot Spot Cafe",
            contact_person="Farhan",
            phone="9999999992",
            address_line1="Market Yard"
        )
        db.add(cust_b)
    db.commit()

    # Fetch seeded product or create
    prod = db.query(Product).filter_by(sku="RAIS-CHS-01").first()
    if not prod:
        prod = Product(
            sku="RAIS-CHS-01",
            name="MILKY MIST MOZEROLLA DICED CHEESE (2KG)",
            brand="Milky Mist",
            packaging_unit="PKT",
            category_id=cat.id,
            base_price=Decimal("910.00"),
            min_stock_alert=Decimal("5.00"),
            current_stock=Decimal("0.00")
        )
        db.add(prod)
        db.commit()
    else:
        prod.current_stock = Decimal("0.00")
        prod.min_stock_alert = Decimal("5.00")
        prod.base_price = Decimal("910.00")
        db.commit()

    original_base_price = prod.base_price

    # 1. Inward Intake: 10 pk received
    InventoryService.receive_stock(db, ReceiveStockRequest(
        product_id=prod.id,
        quantity=Decimal("10.00"),
        purchase_cost=Decimal("780.00"),
        supplier="Milky Mist Logistics",
        batch_number="MM-OCT-26",
        expiry_date=date(2026, 12, 31)
    ))

    # 2. Sales Invoice 1: Walid buys 3 pk @ 910
    inv1 = BillingService.create_invoice(db, InvoiceCreate(
        customer_id=cust_a.id,
        invoice_date=date.today(),
        due_date=date.today(),
        auto_issue=True,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("3.00"), unit_price=Decimal("910.00"))]
    ))

    # 3. Sales Invoice 2: Hot Spot Cafe buys 4 pk @ 910 (drops stock to 3 pk, below 5 pk threshold)
    inv2 = BillingService.create_invoice(db, InvoiceCreate(
        customer_id=cust_b.id,
        invoice_date=date.today(),
        due_date=date.today(),
        auto_issue=True,
        items=[InvoiceItemCreate(product_id=prod.id, quantity=Decimal("4.00"), unit_price=Decimal("910.00"))]
    ))

    # 4. Manual Adjustment: 1 pk damaged
    InventoryService.adjust_stock(db, AdjustStockRequest(
        product_id=prod.id,
        adjustment_type="DECREASE",
        quantity=Decimal("1.00"),
        reason="DAMAGED",
        notes="Torn packaging in bay 2"
    ))

    # Query Lineage
    movements = InventoryService.get_stock_movements(db, product_id=prod.id)
    assert len(movements) == 4

    # M0: Adjustment (-1 pk, Bal: 2 pk)
    assert movements[0]["movement_type"] == "ADJUSTMENT_DECREASE"
    assert movements[0]["quantity_change"] == Decimal("-1.00")
    assert movements[0]["new_stock"] == Decimal("2.00")
    assert movements[0]["reason"] == "Damaged"
    assert movements[0]["notes"] == "Torn packaging in bay 2"

    # M1: Inv 2 (Hot Spot Cafe, -4 pk, Bal: 3 pk)
    assert movements[1]["customer_name"] == "Hot Spot Cafe"
    assert movements[1]["customer_code"] == "CUST-0012"
    assert movements[1]["reference_number"] == inv2.invoice_number
    assert movements[1]["unit_price"] == Decimal("910.00")
    assert movements[1]["total_value"] == Decimal("3640.00")
    assert movements[1]["new_stock"] == Decimal("3.00")
    assert movements[1]["invoice_id"] == inv2.id

    # M2: Inv 1 (Walid, -3 pk, Bal: 7 pk)
    assert movements[2]["customer_name"] == "Mohammed Walid sundupalli"
    assert movements[2]["customer_code"] == "CUST-0034"
    assert movements[2]["reference_number"] == inv1.invoice_number
    assert movements[2]["unit_price"] == Decimal("910.00")
    assert movements[2]["total_value"] == Decimal("2730.00")
    assert movements[2]["new_stock"] == Decimal("7.00")
    assert movements[2]["invoice_id"] == inv1.id

    # M3: Intake (+10 pk, Bal: 10 pk)
    assert movements[3]["movement_type"] == "RECEIPT"
    assert movements[3]["supplier"] == "Milky Mist Logistics"
    assert movements[3]["purchase_cost"] == Decimal("780.00")
    assert movements[3]["total_value"] == Decimal("7800.00")
    assert movements[3]["new_stock"] == Decimal("10.00")
    assert movements[3]["batch_number"] == "MM-OCT-26"

    # Verify prices untouched in DB
    db.refresh(prod)
    assert prod.base_price == original_base_price == Decimal("910.00")
    assert prod.current_stock == Decimal("2.00")
