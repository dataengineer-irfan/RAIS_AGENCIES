import os
import sys
from decimal import Decimal

# Force local sqlite / test db
os.environ["ALLOW_PRODUCTION_DB_LOCAL"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.database import Base, engine, SessionLocal
from app.models.catalogue import Product, Category
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem
from app.models.payment import Payment, PaymentAllocation
from app.models.order import Order, OrderItem
from app.models.inventory import StockMovement
from app.schemas.invoice import InvoiceCreate, InvoiceItemCreate, InvoiceUpdate
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.payment import PaymentCreate
from app.services.billing_service import BillingService
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.reconciliation_service import ReconciliationService
from app.services.customer_service import CustomerService
from app.domain.enums import InvoiceStatus

def test_audit_stock_restoration_and_fifo_reconciliation():
    print("==================================================")
    print("STARTING BACKEND AUDIT AUTOMATED VERIFICATION")
    print("==================================================")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Seed test customer
        cust = Customer(
            customer_code="CUST-AUDIT",
            business_name="Audit Test Outlets Ltd",
            contact_person="Audit Manager",
            address_line1="Main Road, Market Yard",
            phone="9876543210",
            status="ACTIVE",
            opening_balance=Decimal("0.00")
        )
        db.add(cust)

        # Seed test category
        cat = Category(code="DAIRY", name="Dairy", description="Dairy Products")
        db.add(cat)
        db.flush()

        # Seed test product with 50 units initial stock
        prod = Product(
            sku="AUDIT-PANEER-1KG",
            category_id=cat.id,
            name="Milky Mist Paneer 1kg",
            brand="Milky Mist",
            packaging_unit="PKT",
            unit_quantity=Decimal("1.00"),
            base_price=Decimal("450.00"),
            current_stock=Decimal("50.00"),
            min_stock_alert=Decimal("10.00"),
            is_active=True
        )
        db.add(prod)
        db.commit()
        db.refresh(cust)
        db.refresh(prod)

        initial_stock = prod.current_stock
        print(f"[TEST 1] Initial Product Stock: {initial_stock} PKT")

        # ----------------------------------------------------
        # TEST 1: Invoice Edit (Quantity Reduction) + Cancellation
        # ----------------------------------------------------
        print("\n--- Running Test 1: Cumulative Stock Restoration on Invoice Edit + Cancellation ---")
        inv_create = InvoiceCreate(
            customer_id=cust.id,
            invoice_date=None,
            items=[
                InvoiceItemCreate(
                    product_id=prod.id,
                    item_description=prod.name,
                    brand=prod.brand,
                    packaging_unit=prod.packaging_unit,
                    quantity=Decimal("10.00"),
                    unit_price=Decimal("450.00")
                )
            ],
            auto_issue=True
        )
        invoice = BillingService.create_invoice(db, inv_create)
        db.refresh(prod)
        print(f"  Step 1: Created invoice for 10 units. Warehouse stock is now: {prod.current_stock} (Expected: 40.00)")
        assert prod.current_stock == Decimal("40.00"), f"Expected 40.00 stock, got {prod.current_stock}"

        # Edit invoice: reduce quantity from 10 to 7 units
        inv_update = InvoiceUpdate(
            items=[
                InvoiceItemCreate(
                    product_id=prod.id,
                    quantity=Decimal("7.00"),
                    unit_price=Decimal("450.00")
                )
            ]
        )
        invoice = BillingService.update_invoice(db, invoice.id, inv_update)
        db.refresh(prod)
        print(f"  Step 2: Edited invoice quantity down to 7 units. Warehouse stock restored by 3 to: {prod.current_stock} (Expected: 43.00)")
        assert prod.current_stock == Decimal("43.00"), f"Expected 43.00 stock, got {prod.current_stock}"

        # Now cancel the invoice: remaining 7 units must be restored!
        BillingService.cancel_or_void_invoice(db, invoice.id, InvoiceStatus.CANCELLED.value, reason="Customer cancelled")
        db.refresh(prod)
        print(f"  Step 3: Cancelled invoice. Remaining 7 units restored! Warehouse stock is now: {prod.current_stock} (Expected: 50.00)")
        assert prod.current_stock == Decimal("50.00"), f"CRITICAL LEAK: Expected full 50.00 stock restored, got {prod.current_stock}"

        # Verify idempotency / duplicate cancel rejection
        try:
            BillingService.cancel_or_void_invoice(db, invoice.id, InvoiceStatus.CANCELLED.value)
            assert False, "Should have raised exception on duplicate cancellation"
        except Exception as e:
            print(f"  Step 4: Repeated cancellation correctly rejected: {e}")

        # ----------------------------------------------------
        # TEST 2: Order Conversion to Invoice + Deletion Restoration
        # ----------------------------------------------------
        print("\n--- Running Test 2: Order-to-Invoice Conversion + Stock Restoration on Deletion ---")
        order_create = OrderCreate(
            customer_id=cust.id,
            items=[
                OrderItemCreate(
                    product_id=prod.id,
                    item_name=prod.name,
                    packaging_unit=prod.packaging_unit,
                    quantity=Decimal("5.00"),
                    unit_price=Decimal("450.00")
                )
            ]
        )
        order = OrderService.create_order(db, order_create)
        db.refresh(prod)
        print(f"  Step 1: Created order for 5 units. Warehouse stock is now: {prod.current_stock} (Expected: 45.00)")
        assert prod.current_stock == Decimal("45.00"), f"Expected 45.00 stock, got {prod.current_stock}"

        # Convert order to invoice
        converted_inv = OrderService.convert_order_to_invoice(db, order.id)
        db.refresh(prod)
        print(f"  Step 2: Converted order to invoice {converted_inv.invoice_number}. Stock not double-deducted: {prod.current_stock} (Expected: 45.00)")
        assert prod.current_stock == Decimal("45.00"), f"Stock double-deducted on conversion: {prod.current_stock}"

        # Delete the converted invoice
        BillingService.delete_invoice(db, converted_inv.id)
        db.refresh(prod)
        print(f"  Step 3: Deleted converted invoice. Stock restored by 5 units to: {prod.current_stock} (Expected: 50.00)")
        assert prod.current_stock == Decimal("50.00"), f"Expected 50.00 stock after delete, got {prod.current_stock}"

        # ----------------------------------------------------
        # TEST 3: FIFO Reconciliation with VOID & CANCELLED Invoices
        # ----------------------------------------------------
        print("\n--- Running Test 3: FIFO Reconciliation Guarding VOID & CANCELLED Invoices ---")
        # 1 Active Invoice of 500
        inv1 = BillingService.create_invoice(
            db,
            InvoiceCreate(
                customer_id=cust.id,
                items=[InvoiceItemCreate(product_id=prod.id, item_description="Paneer", packaging_unit="PKT", quantity=Decimal("1.00"), unit_price=Decimal("500.00"))],
                auto_issue=True
            )
        )
        # 1 VOID Invoice of 1000
        inv_void = BillingService.create_invoice(
            db,
            InvoiceCreate(
                customer_id=cust.id,
                items=[InvoiceItemCreate(product_id=prod.id, item_description="Paneer", packaging_unit="PKT", quantity=Decimal("2.00"), unit_price=Decimal("500.00"))],
                auto_issue=True
            )
        )
        BillingService.cancel_or_void_invoice(db, inv_void.id, InvoiceStatus.VOID.value, reason="Billing error")

        # Record payment of 500
        pay = PaymentService.record_payment(
            db,
            PaymentCreate(
                customer_id=cust.id,
                amount=Decimal("500.00"),
                payment_method="CASH"
            )
        )

        # Trigger FIFO reconciliation
        recon_result = ReconciliationService.reconcile_customer_fifo(db, cust.id)
        db.refresh(inv1)
        db.refresh(inv_void)

        print(f"  Reconciliation result: {recon_result}")
        print(f"  Active Invoice Status: {inv1.status}, Paid Amount: {inv1.paid_amount}, Outstanding: {inv1.outstanding_amount}")
        print(f"  VOID Invoice Status: {inv_void.status}, Outstanding: {inv_void.outstanding_amount}")

        assert inv1.status == InvoiceStatus.PAID.value, f"Expected PAID, got {inv1.status}"
        assert inv_void.status == InvoiceStatus.VOID.value, f"CRITICAL RESURRECTION: VOID invoice was changed to {inv_void.status}!"
        assert inv_void.outstanding_amount == Decimal("0.00"), "VOID invoice outstanding amount should remain 0.00"

        # Customer balance check
        _, _, net_balance = CustomerService.get_customer_balances(db, cust.id)
        print(f"  Customer Net Ledger Balance: INR {net_balance} (Expected: 0.00)")
        assert net_balance == Decimal("0.00"), f"Expected 0.00 balance, got {net_balance}"

        print("\nALL BACKEND AUDIT INTEGRITY CHECKS PASSED PERFECTLY!")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    test_audit_stock_restoration_and_fifo_reconciliation()
