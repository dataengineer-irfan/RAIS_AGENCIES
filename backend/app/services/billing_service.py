from typing import List, Optional, Dict, Any
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_, func
import logging
from app.models.invoice import Invoice, InvoiceItem
from app.models.quotation import Quotation, QuotationItem
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.catalogue import Product
from app.models.inventory import StockMovement
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceItemResponse,
    InvoiceAllocationItem, InvoiceStatusUpdate
)
from app.schemas.quotation import QuotationCreate, QuotationResponse, QuotationItemResponse
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse
from app.core.exceptions import EntityNotFoundException, RaisAppException, InvalidFinancialOperationException
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.domain.enums import InvoiceStatus, QuotationStatus, OrderStatus, AuditAction
from app.core.datetime_utils import get_ist_today
from app.core.config import settings

def quantize_amount(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

_INVOICES_CACHE: Dict[str, Any] = {}
_INVOICES_CACHE_TTL: float = 60.0  # 60 seconds server-side in-memory TTL
logger = logging.getLogger("billing_service")

class BillingService:
    @staticmethod
    def invalidate_cache():
        global _INVOICES_CACHE
        _INVOICES_CACHE.clear()
        try:
            from app.services.reporting_service import invalidate_reporting_caches
            invalidate_reporting_caches()
        except Exception:
            pass
        try:
            from app.services.customer_service import CustomerService
            CustomerService.invalidate_alerts_cache()
        except Exception:
            pass
        try:
            from app.services.customer_health_service import _HEALTH_CACHE
            _HEALTH_CACHE["timestamp"] = 0
            _HEALTH_CACHE["data"] = None
        except Exception:
            pass
        try:
            from app.services.forecasting_service import _FORECAST_CACHE
            _FORECAST_CACHE["timestamp"] = 0
            _FORECAST_CACHE["data"] = None
        except Exception:
            pass
        try:
            from app.services.product_performance_service import _MATRIX_CACHE
            _MATRIX_CACHE["timestamp"] = 0
            _MATRIX_CACHE["data"] = None
        except Exception:
            pass

    @staticmethod
    def calculate_invoice_totals(
        items_data: List[Dict[str, Any]],
        invoice_level_discount: Decimal = Decimal("0.00")
    ) -> Dict[str, Any]:
        """
        Deterministic, audit-proof calculation of line items and invoice aggregates.
        """
        subtotal = Decimal("0.00")
        total_item_discounts = Decimal("0.00")
        total_taxable = Decimal("0.00")
        total_tax = Decimal("0.00")
        calculated_items = []

        for item in items_data:
            qty = Decimal(str(item["quantity"]))
            unit_price = Decimal(str(item["unit_price"]))
            discount_rate = Decimal(str(item.get("discount_rate", "0.00")))
            # GST removed per business directive
            tax_rate = Decimal("0.00")

            gross_line = quantize_amount(qty * unit_price)
            discount_line = quantize_amount(gross_line * (discount_rate / Decimal("100.00")))
            taxable_line = quantize_amount(gross_line - discount_line)
            tax_line = Decimal("0.00")
            line_total = quantize_amount(taxable_line)

            subtotal += gross_line
            total_item_discounts += discount_line
            total_taxable += taxable_line
            total_tax += tax_line

            calculated_items.append({
                **item,
                "quantity": qty,
                "unit_price": unit_price,
                "discount_rate": discount_rate,
                "discount_amount": discount_line,
                "taxable_amount": taxable_line,
                "tax_rate": tax_rate,
                "tax_amount": tax_line,
                "line_total": line_total
            })

        net_discount = quantize_amount(total_item_discounts + invoice_level_discount)
        if net_discount > subtotal:
            raise InvalidFinancialOperationException(
                f"Total discount (₹{net_discount}) cannot exceed invoice subtotal (₹{subtotal}). "
                "Persisted invoice totals cannot be negative."
            )

        final_taxable = quantize_amount(subtotal - net_discount)
        grand_total = quantize_amount(final_taxable) # Pure subtotal minus discount (No GST)
        if grand_total < Decimal("0.00"):
            raise InvalidFinancialOperationException("Persisted invoice totals cannot be negative.")

        return {
            "subtotal": subtotal,
            "discount_amount": net_discount,
            "taxable_amount": final_taxable,
            "tax_amount": Decimal("0.00"),
            "total_amount": grand_total,
            "items": calculated_items
        }

    @staticmethod
    def generate_upi_qr_payload(invoice_number: str, amount: Decimal) -> str:
        # UPI Dynamic QR string standard
        pa = "9347453135@ybl" # Official business contact VPA
        pn = "RAIS AGENCIES"
        return f"upi://pay?pa={pa}&pn={pn}&am={amount:.2f}&cu=INR&tn=Invoice%20{invoice_number}"

    # ----------------------------------------------------
    # INVOICE MANAGEMENT
    # ----------------------------------------------------
    @staticmethod
    def create_invoice(
        db: Session,
        data: InvoiceCreate,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Invoice:
        # Verify customer
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", data.customer_id)

        # Idempotency guard: return existing invoice if idempotency_key was already processed
        idempotency_key = getattr(data, "idempotency_key", None)
        if idempotency_key:
            existing_inv = db.query(Invoice).filter(Invoice.idempotency_key == idempotency_key).first()
            if existing_inv:
                return existing_inv

        if not data.items:
            raise InvalidFinancialOperationException("An invoice must contain at least one line item.")

        # Prepare items data
        prepared_items = []
        for itm in data.items:
            qty = Decimal(str(itm.quantity))
            if qty <= Decimal("0.00"):
                raise InvalidFinancialOperationException(f"Item quantity must be strictly positive (> 0), got {qty}.")
            if itm.discount_rate < Decimal("0.00") or itm.discount_rate > Decimal("100.00"):
                raise InvalidFinancialOperationException("Discount rate must be between 0% and 100%.")

            product = db.query(Product).filter(Product.id == itm.product_id).first()
            if not product:
                raise EntityNotFoundException("Product", itm.product_id)
            if not product.is_active:
                raise RaisAppException(detail=f"Product '{product.name}' is inactive.")
            
            if itm.unit_price is None:
                unit_price = product.base_price
            else:
                unit_price = Decimal(str(itm.unit_price))
                if unit_price <= Decimal("0.00"):
                    raise InvalidFinancialOperationException(f"Unit price must be strictly positive (> 0), got {unit_price}.")
                if unit_price != product.base_price:
                    # Negotiated pricing override: log audit trail
                    base_pr = product.base_price if product.base_price and product.base_price > Decimal("0.00") else Decimal("1.00")
                    diff_pct = (((unit_price - base_pr) / base_pr) * 100).quantize(Decimal("0.1"))
                    
                    # Resolve landed cost to evaluate margin safety
                    landed_cost_raw = db.query(StockMovement.purchase_cost)\
                        .filter(StockMovement.product_id == product.id, StockMovement.purchase_cost.isnot(None))\
                        .order_by(StockMovement.created_at.desc()).limit(1).scalar()
                    landed_cost = Decimal(str(landed_cost_raw)) if landed_cost_raw is not None else (base_pr * Decimal("0.80"))
                    
                    is_below_cost = unit_price < landed_cost
                    is_severe_outlier = unit_price < (landed_cost * Decimal("0.50"))
                    
                    if is_severe_outlier:
                        logger.warning(
                            f"[CRITICAL_PRICE_WARNING] SKU {product.sku} ({product.name}) sold at severe loss: "
                            f"Price=Rs.{unit_price}, Landed Cost=Rs.{landed_cost} (Loss: -Rs.{landed_cost - unit_price}/unit)"
                        )
                    elif is_below_cost:
                        logger.info(
                            f"[PRICE_WARNING] SKU {product.sku} ({product.name}) sold below landed cost: "
                            f"Price=Rs.{unit_price}, Landed Cost=Rs.{landed_cost}"
                        )

                    AuditService.log(
                        db=db,
                        action=AuditAction.PRICE_OVERRIDE,
                        entity_name="ProductPricing",
                        entity_id=product.id,
                        user_id=user_id,
                        username=username,
                        user_role=user_role,
                        after_state={
                            "product_sku": product.sku,
                            "catalogue_base_price": str(product.base_price),
                            "landed_cost": str(landed_cost),
                            "negotiated_unit_price": str(unit_price),
                            "variance_pct": str(diff_pct),
                            "is_below_cost": is_below_cost,
                            "is_severe_outlier": is_severe_outlier
                        }
                    )

            prepared_items.append({
                "product_id": product.id,
                "item_description": product.name,
                "brand": product.brand,
                "packaging_unit": product.packaging_unit,
                "hsn_code": product.hsn_code,
                "quantity": qty,
                "unit_price": unit_price,
                "discount_rate": itm.discount_rate,
                "tax_rate": product.tax_rate
            })

        calc = BillingService.calculate_invoice_totals(prepared_items, data.discount_amount)
        
        inv_number = SequenceService.get_next_sequence(db, "INV")
        inv_date = data.invoice_date or get_ist_today()
        due_date = data.due_date or inv_date # Cash business: invoice date and due date are the same
        init_status = InvoiceStatus.ISSUED.value if data.auto_issue else InvoiceStatus.DRAFT.value
        qr_code = BillingService.generate_upi_qr_payload(inv_number, calc["total_amount"])

        invoice = Invoice(
            invoice_number=inv_number,
            customer_id=customer.id,
            order_id=data.order_id,
            quotation_id=data.quotation_id,
            status=init_status,
            invoice_date=inv_date,
            due_date=due_date,
            idempotency_key=idempotency_key,
            subtotal=calc["subtotal"],
            discount_amount=calc["discount_amount"],
            taxable_amount=calc["taxable_amount"],
            tax_amount=calc["tax_amount"],
            total_amount=calc["total_amount"],
            paid_amount=Decimal("0.00"),
            outstanding_amount=calc["total_amount"],
            payment_terms=data.payment_terms or "Cash on Delivery / Immediate Settlement",
            notes=data.notes,
            qr_payload=qr_code,
            created_by_id=user_id
        )
        db.add(invoice)
        db.flush()

        for itm in calc["items"]:
            inv_item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=itm["product_id"],
                item_description=itm["item_description"],
                brand=itm["brand"],
                packaging_unit=itm["packaging_unit"],
                hsn_code=itm["hsn_code"],
                quantity=itm["quantity"],
                unit_price=itm["unit_price"],
                discount_rate=itm["discount_rate"],
                discount_amount=itm["discount_amount"],
                taxable_amount=itm["taxable_amount"],
                tax_rate=itm["tax_rate"],
                tax_amount=itm["tax_amount"],
                line_total=itm["line_total"]
            )
            db.add(inv_item)
            
            # Automatically deduct warehouse inventory for this commercial invoice item
            # (If invoice was created from an order, order already deducted stock upon placement)
            if not data.order_id:
                from app.services.inventory_service import InventoryService
                InventoryService.deduct_stock_for_invoice(
                    db=db,
                    product_id=itm["product_id"],
                    quantity=itm["quantity"],
                    invoice_number=invoice.invoice_number,
                    user_id=user_id
                )

        # ─── AUTOMATIC IMMEDIATE COUNTER PAYMENT & CASH SETTLEMENT ───
        # Supports:
        # 1. Exact bill settlement (mark_as_paid=True or Cash customer)
        # 2. Custom counter collection (data.amount_paid > 0), e.g., ₹1,000 on a ₹550 bill
        #    where ₹550 pays off this invoice and the ₹450 surplus automatically settles
        #    the customer's previous open invoices / ledger dues via FIFO reconciliation!
        custom_amount_paid = getattr(data, "amount_paid", None)
        has_custom_payment = custom_amount_paid is not None and Decimal(str(custom_amount_paid)) > Decimal("0.00")

        is_cash_customer = (
            customer.customer_code == "CUST-0044" or
            "cash" in (customer.business_name or "").lower().strip()
        )
        should_settle = (
            invoice.status == InvoiceStatus.ISSUED.value and
            (has_custom_payment or bool(getattr(data, "mark_as_paid", False)) or is_cash_customer)
        )

        if should_settle and invoice.total_amount > Decimal("0.00"):
            from app.models.payment import Payment, PaymentAllocation
            from app.domain.enums import PaymentMethod
            
            terms_upper = (invoice.payment_terms or "").upper()
            pay_method = PaymentMethod.UPI.value if "UPI" in terms_upper else PaymentMethod.CASH.value
            pay_number = SequenceService.get_next_sequence(db, "PAY")
            now_dt = datetime.now(timezone.utc)

            total_received = Decimal(str(custom_amount_paid)) if has_custom_payment else invoice.total_amount
            alloc_to_this_invoice = min(invoice.total_amount, total_received)
            unalloc_surplus = max(Decimal("0.00"), total_received - alloc_to_this_invoice)

            payment = Payment(
                payment_number=pay_number,
                customer_id=customer.id,
                payment_date=invoice.invoice_date,
                amount=total_received,
                allocated_amount=alloc_to_this_invoice,
                unallocated_amount=unalloc_surplus,
                payment_method=pay_method,
                reference_number=f"Counter Settlement #{invoice.invoice_number}",
                notes=f"Counter collection for Invoice #{invoice.invoice_number} (Received: ₹{total_received})",
                created_by_id=user_id
            )
            db.add(payment)
            db.flush()

            allocation = PaymentAllocation(
                payment_id=payment.id,
                invoice_id=invoice.id,
                allocated_amount=alloc_to_this_invoice,
                allocated_at=now_dt
            )
            db.add(allocation)

            invoice.paid_amount = alloc_to_this_invoice
            invoice.outstanding_amount = quantize_amount(invoice.total_amount - alloc_to_this_invoice)
            if invoice.outstanding_amount <= Decimal("0.00"):
                invoice.status = InvoiceStatus.PAID.value
            else:
                invoice.status = InvoiceStatus.PARTIALLY_PAID.value

            # If customer paid surplus over the current bill (e.g. ₹1000 on ₹550 bill -> ₹450 surplus):
            # Automatically apply the surplus to previous unpaid invoices chronologically (FIFO)!
            if unalloc_surplus > Decimal("0.00"):
                from app.services.reconciliation_service import ReconciliationService
                ReconciliationService.reconcile_customer_fifo(db, customer.id, auto_commit=False)

            AuditService.log(
                db=db,
                action=AuditAction.CREATE,
                entity_name="Payment",
                entity_id=payment.id,
                user_id=user_id,
                username=username,
                user_role=user_role,
                after_state={
                    "payment_number": pay_number,
                    "amount": str(total_received),
                    "invoice_number": invoice.invoice_number,
                    "method": pay_method,
                    "allocated_to_invoice": str(alloc_to_this_invoice),
                    "surplus_applied_to_past_dues": str(unalloc_surplus)
                }
            )

        # Automatic Advance Settlement:
        # If customer already has unallocated advance payments in their account,
        # apply the advance chronologically to settle or reduce this new invoice.
        if not should_settle and invoice.status == InvoiceStatus.ISSUED.value and invoice.outstanding_amount > Decimal("0.00"):
            from app.models.payment import Payment, PaymentAllocation
            unalloc_payments = db.query(Payment).filter(
                Payment.customer_id == customer.id,
                Payment.unallocated_amount > Decimal("0.00")
            ).order_by(Payment.payment_date.asc(), Payment.created_at.asc()).all()

            if unalloc_payments:
                now_dt = datetime.now(timezone.utc)
                for p in unalloc_payments:
                    if invoice.outstanding_amount <= Decimal("0.00"):
                        break
                    alloc_amt = min(p.unallocated_amount, invoice.outstanding_amount)
                    if alloc_amt > Decimal("0.00"):
                        alloc = PaymentAllocation(
                            payment_id=p.id,
                            invoice_id=invoice.id,
                            allocated_amount=alloc_amt,
                            allocated_at=now_dt
                        )
                        db.add(alloc)
                        p.allocated_amount += alloc_amt
                        p.unallocated_amount -= alloc_amt
                        invoice.paid_amount += alloc_amt
                        invoice.outstanding_amount -= alloc_amt

                if invoice.outstanding_amount <= Decimal("0.00"):
                    invoice.status = InvoiceStatus.PAID.value
                elif invoice.paid_amount > Decimal("0.00"):
                    invoice.status = InvoiceStatus.PARTIALLY_PAID.value
                db.flush()

        AuditService.log(
            db=db,
            action=AuditAction.CREATE,
            entity_name="Invoice",
            entity_id=invoice.id,
            user_id=user_id,
            username=username,
            user_role=user_role,
            after_state={
                "invoice_number": invoice.invoice_number,
                "customer": customer.business_name,
                "total_amount": str(invoice.total_amount),
                "status": invoice.status
            }
        )
        db.commit()
        BillingService.invalidate_cache()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def update_invoice(
        db: Session,
        invoice_id: str,
        data,  # InvoiceUpdate schema instance
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Invoice:
        """
        Edit an existing invoice:
        - Change customer
        - Change invoice date / due date / payment terms / notes
        - Replace line items (with automatic warehouse stock diff reconciliation)
        Guards: Cannot edit if payments are already allocated.
        """
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)

        # Guard: Cannot edit if any payment has been settled against this invoice
        if invoice.paid_amount > Decimal("0.00"):
            raise InvalidFinancialOperationException(
                f"Cannot edit invoice '{invoice.invoice_number}' — payments totaling "
                f"₹{invoice.paid_amount} are already allocated. "
                f"Please unallocate or delete payments first."
            )

        before_state = {
            "invoice_number": invoice.invoice_number,
            "customer_id": invoice.customer_id,
            "total_amount": str(invoice.total_amount),
            "items_count": len(invoice.items)
        }

        # ─── Update customer if provided ───
        if data.customer_id and data.customer_id != invoice.customer_id:
            new_customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
            if not new_customer:
                raise EntityNotFoundException("Customer", data.customer_id)
            invoice.customer_id = data.customer_id

        # ─── Update simple scalar fields ───
        if data.invoice_date is not None:
            invoice.invoice_date = data.invoice_date
        if data.due_date is not None:
            invoice.due_date = data.due_date
        if data.payment_terms is not None:
            invoice.payment_terms = data.payment_terms
        if data.notes is not None:
            invoice.notes = data.notes

        # ─── Replace line items if provided ───
        if data.items is not None:
            if len(data.items) == 0:
                raise InvalidFinancialOperationException("An invoice cannot have an empty list of line items.")
            from app.services.inventory_service import InventoryService

            # 1. Build previous items dict: product_id → quantity
            prev_items = {itm.product_id: itm.quantity for itm in invoice.items}

            # 2. Validate and prepare new items
            prepared_items = []
            for itm in data.items:
                qty = Decimal(str(itm.quantity))
                if qty <= Decimal("0.00"):
                    raise InvalidFinancialOperationException(f"Item quantity must be strictly positive (> 0), got {qty}.")
                if itm.discount_rate < Decimal("0.00") or itm.discount_rate > Decimal("100.00"):
                    raise InvalidFinancialOperationException("Discount rate must be between 0% and 100%.")

                product = db.query(Product).filter(Product.id == itm.product_id).first()
                if not product:
                    raise EntityNotFoundException("Product", itm.product_id)
                if not product.is_active:
                    raise RaisAppException(detail=f"Product '{product.name}' is inactive.")
                
                if itm.unit_price is None:
                    unit_price = product.base_price
                else:
                    unit_price = Decimal(str(itm.unit_price))
                    if unit_price <= Decimal("0.00"):
                        raise InvalidFinancialOperationException(f"Unit price must be strictly positive (> 0), got {unit_price}.")
                    if unit_price != product.base_price:
                        diff_pct = (((unit_price - product.base_price) / product.base_price) * 100).quantize(Decimal("0.1"))
                        AuditService.log(
                            db=db,
                            action=AuditAction.PRICE_OVERRIDE,
                            entity_name="ProductPricing",
                            entity_id=product.id,
                            user_id=user_id,
                            username=username,
                            user_role=user_role,
                            after_state={
                                "product_sku": product.sku,
                                "catalogue_base_price": str(product.base_price),
                                "negotiated_unit_price": str(unit_price),
                                "variance_pct": str(diff_pct)
                            }
                        )

                prepared_items.append({
                    "product_id": product.id,
                    "item_description": product.name,
                    "brand": product.brand,
                    "packaging_unit": product.packaging_unit,
                    "hsn_code": product.hsn_code,
                    "quantity": qty,
                    "unit_price": unit_price,
                    "discount_rate": itm.discount_rate,
                    "tax_rate": product.tax_rate
                })

            # 3. Calculate new totals
            inv_disc = data.discount_amount if data.discount_amount is not None else invoice.discount_amount
            calc = BillingService.calculate_invoice_totals(prepared_items, inv_disc)

            # 4. Reconcile stock: restore removed/reduced, deduct added/increased
            new_items_dict = {itm["product_id"]: itm["quantity"] for itm in prepared_items}

            # Restore stock for products removed or with reduced quantity
            for prod_id, old_qty in prev_items.items():
                new_qty = new_items_dict.get(prod_id, Decimal("0"))
                diff = old_qty - new_qty
                if diff > 0:
                    InventoryService.restore_stock_for_invoice(
                        db=db,
                        product_id=prod_id,
                        quantity=diff,
                        invoice_number=invoice.invoice_number,
                        reason=f"Edit: reduced qty by {diff} on {invoice.invoice_number}",
                        user_id=user_id
                    )

            # Deduct stock for products added or with increased quantity
            for prod_id, new_qty in new_items_dict.items():
                old_qty = prev_items.get(prod_id, Decimal("0"))
                diff = new_qty - old_qty
                if diff > 0:
                    InventoryService.deduct_stock_for_invoice(
                        db=db,
                        product_id=prod_id,
                        quantity=diff,
                        invoice_number=invoice.invoice_number,
                        user_id=user_id
                    )

            # 5. Delete old invoice items and re-create
            for old_item in list(invoice.items):
                db.delete(old_item)
            db.flush()

            for itm in calc["items"]:
                inv_item = InvoiceItem(
                    invoice_id=invoice.id,
                    product_id=itm["product_id"],
                    item_description=itm["item_description"],
                    brand=itm["brand"],
                    packaging_unit=itm["packaging_unit"],
                    hsn_code=itm["hsn_code"],
                    quantity=itm["quantity"],
                    unit_price=itm["unit_price"],
                    discount_rate=itm["discount_rate"],
                    discount_amount=itm["discount_amount"],
                    taxable_amount=itm["taxable_amount"],
                    tax_rate=itm["tax_rate"],
                    tax_amount=itm["tax_amount"],
                    line_total=itm["line_total"]
                )
                db.add(inv_item)

            # 6. Update invoice financials
            invoice.subtotal = calc["subtotal"]
            invoice.discount_amount = calc["discount_amount"]
            invoice.taxable_amount = calc["taxable_amount"]
            invoice.tax_amount = calc["tax_amount"]
            invoice.total_amount = calc["total_amount"]
            invoice.outstanding_amount = calc["total_amount"] - invoice.paid_amount
            invoice.qr_payload = BillingService.generate_upi_qr_payload(invoice.invoice_number, invoice.outstanding_amount)

        elif data.discount_amount is not None:
            # Only discount changed, no items replacement
            invoice.discount_amount = data.discount_amount
            invoice.outstanding_amount = invoice.total_amount - invoice.paid_amount

        db.flush()
        AuditService.log(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="Invoice",
            entity_id=invoice.id,
            user_id=user_id,
            username=username,
            user_role=user_role,
            before_state=before_state,
            after_state={
                "customer_id": invoice.customer_id,
                "total_amount": str(invoice.total_amount),
                "invoice_number": invoice.invoice_number
            }
        )
        db.commit()
        BillingService.invalidate_cache()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def issue_invoice(db: Session, invoice_id: str, user_id: Optional[str] = None) -> Invoice:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)
        if invoice.status != InvoiceStatus.DRAFT.value:
            raise InvalidFinancialOperationException(f"Cannot issue invoice with status '{invoice.status}'. Only DRAFT can be issued.")
        
        invoice.status = InvoiceStatus.ISSUED.value
        db.flush()
        AuditService.log(db, AuditAction.STATUS_CHANGE, "Invoice", invoice.id, user_id=user_id, after_state={"status": invoice.status})
        db.commit()
        BillingService.invalidate_cache()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def cancel_or_void_invoice(
        db: Session,
        invoice_id: str,
        target_status: str,
        reason: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Invoice:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)
        
        # Guard: Cannot cancel or void an already cancelled or void invoice (prevents duplicate stock restoration)
        if invoice.status in [InvoiceStatus.CANCELLED.value, InvoiceStatus.VOID.value]:
            raise InvalidFinancialOperationException(
                f"Invoice '{invoice.invoice_number}' is already {invoice.status}. Cannot cancel or reverse again."
            )

        if invoice.paid_amount > Decimal("0.00"):
            raise InvalidFinancialOperationException(
                f"Cannot {target_status.lower()} invoice '{invoice.invoice_number}' because payments totaling ₹{invoice.paid_amount} are already allocated. Unallocate payments first."
            )
        
        if target_status not in [InvoiceStatus.CANCELLED.value, InvoiceStatus.VOID.value]:
            raise InvalidFinancialOperationException(f"Invalid target status: {target_status}")

        before_status = invoice.status
        invoice.status = target_status
        invoice.notes = (invoice.notes or "") + f"\n[{target_status.upper()}: {reason or 'No reason provided'}]"
        invoice.outstanding_amount = Decimal("0.00")
        
        # Restore warehouse inventory for all items in the cancelled/voided invoice
        from app.services.inventory_service import InventoryService
        for itm in invoice.items:
            InventoryService.restore_stock_for_invoice(
                db=db,
                product_id=itm.product_id,
                quantity=itm.quantity,
                invoice_number=invoice.invoice_number,
                reason=f"Restored on Invoice {target_status} ({reason or 'Cancelled'})",
                user_id=user_id
            )
        
        db.flush()
        AuditService.log(
            db, AuditAction.STATUS_CHANGE, "Invoice", invoice.id,
            user_id=user_id,
            before_state={"status": before_status},
            after_state={"status": target_status, "reason": reason}
        )
        db.commit()
        BillingService.invalidate_cache()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def delete_invoice(
        db: Session,
        invoice_id: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> dict:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)

        if invoice.paid_amount > Decimal("0.00"):
            raise InvalidFinancialOperationException(
                f"Cannot delete invoice '{invoice.invoice_number}' because payments totaling ₹{invoice.paid_amount} are allocated to it. Delete or unallocate payments first."
            )

        # Restore stock if invoice was not already cancelled
        if invoice.status not in [InvoiceStatus.CANCELLED.value, InvoiceStatus.VOID.value]:
            from app.services.inventory_service import InventoryService
            for itm in invoice.items:
                InventoryService.restore_stock_for_invoice(
                    db=db,
                    product_id=itm.product_id,
                    quantity=itm.quantity,
                    invoice_number=invoice.invoice_number,
                    reason=f"Stock Restored on Invoice Deletion ({invoice.invoice_number})",
                    user_id=user_id
                )

        inv_number = invoice.invoice_number
        AuditService.log(
            db=db,
            action=AuditAction.DELETE,
            entity_name="Invoice",
            entity_id=invoice.id,
            user_id=user_id,
            username=username,
            user_role=user_role,
            before_state={
                "invoice_number": inv_number,
                "total_amount": str(invoice.total_amount)
            }
        )

        db.delete(invoice)
        db.commit()
        BillingService.invalidate_cache()

        return {
            "success": True,
            "message": f"Invoice '{inv_number}' deleted successfully."
        }

    @staticmethod
    def get_invoice_by_id(db: Session, invoice_id: str) -> InvoiceResponse:
        from app.models.payment import PaymentAllocation
        inv = db.query(Invoice).options(
            joinedload(Invoice.customer),
            selectinload(Invoice.items),
            selectinload(Invoice.allocations).joinedload(PaymentAllocation.payment)
        ).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise EntityNotFoundException("Invoice", invoice_id)
        
        # Check if overdue
        if inv.status in [InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value]:
            if inv.due_date < get_ist_today() and inv.outstanding_amount > Decimal("0.00"):
                inv.status = InvoiceStatus.OVERDUE.value
                db.commit()
                db.refresh(inv)

        return BillingService._build_invoice_response(inv, db)

    @staticmethod
    def _build_invoice_response(
        inv: Invoice, 
        db: Optional[Session] = None, 
        balances_map: Optional[Dict[str, Decimal]] = None,
        first_inv_map: Optional[Dict[str, date]] = None,
        is_list: bool = False
    ) -> InvoiceResponse:
        cust_balance = None
        cust_since = None
        if not is_list:
            if balances_map is not None and inv.customer_id:
                cust_balance = balances_map.get(inv.customer_id)
            elif db and inv.customer_id:
                try:
                    from app.services.customer_service import CustomerService
                    _, _, cust_balance = CustomerService.get_customer_balances(db, inv.customer_id)
                except Exception:
                    cust_balance = None

            # Determine customer_since: based on earliest 1st invoice date, fallback to created_at
            if inv.customer:
                f_date = first_inv_map.get(inv.customer_id) if first_inv_map else None
                if not f_date and db and inv.customer_id:
                    try:
                        f_date = db.query(func.min(Invoice.invoice_date)).filter(
                            Invoice.customer_id == inv.customer_id,
                            Invoice.status != InvoiceStatus.CANCELLED.value
                        ).scalar()
                    except Exception:
                        f_date = None
                if f_date:
                    cust_since = datetime.combine(f_date, datetime.min.time())
                else:
                    cust_since = inv.customer.created_at
        elif inv.customer and inv.customer.created_at:
            cust_since = inv.customer.created_at

        items_resp = [
            InvoiceItemResponse(
                id=itm.id,
                product_id=itm.product_id,
                item_description=itm.item_description,
                brand=itm.brand,
                packaging_unit=itm.packaging_unit,
                hsn_code=itm.hsn_code,
                quantity=itm.quantity,
                unit_price=itm.unit_price,
                discount_rate=itm.discount_rate,
                discount_amount=itm.discount_amount,
                taxable_amount=itm.taxable_amount,
                tax_rate=itm.tax_rate,
                tax_amount=itm.tax_amount,
                line_total=itm.line_total
            ) for itm in (inv.items or [])
        ]

        allocs_resp = []
        if not is_list and inv.allocations:
            for alloc in inv.allocations:
                if alloc.payment:
                    allocs_resp.append(
                        InvoiceAllocationItem(
                            payment_id=alloc.payment.id,
                            payment_number=alloc.payment.payment_number,
                            payment_date=alloc.payment.payment_date,
                            payment_method=alloc.payment.payment_method,
                            allocated_amount=alloc.allocated_amount,
                            reference_number=alloc.payment.reference_number
                        )
                    )

        return InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            customer_id=inv.customer_id,
            customer_name=inv.customer.business_name if inv.customer else "Unknown",
            customer_contact=inv.customer.contact_person if inv.customer else "",
            customer_code=inv.customer.customer_code if inv.customer else "",
            customer_phone=inv.customer.phone if inv.customer else "",
            customer_address=f"{inv.customer.address_line1}, {inv.customer.city} - {inv.customer.pincode}" if inv.customer else "",
            customer_gstin=inv.customer.gstin if inv.customer else "",
            customer_since=cust_since,
            order_id=inv.order_id,
            quotation_id=inv.quotation_id,
            status=inv.status,
            invoice_date=inv.invoice_date,
            due_date=inv.due_date,
            subtotal=inv.subtotal,
            discount_amount=inv.discount_amount,
            taxable_amount=inv.taxable_amount,
            tax_amount=inv.tax_amount,
            total_amount=inv.total_amount,
            paid_amount=inv.paid_amount,
            outstanding_amount=inv.outstanding_amount,
            customer_outstanding_balance=cust_balance,
            payment_terms=inv.payment_terms,
            notes=inv.notes,
            qr_payload=inv.qr_payload,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            items=items_resp,
            allocations=allocs_resp
        )

    @staticmethod
    def list_invoices(
        db: Session,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[InvoiceResponse]:
        import time
        cache_key = f"{customer_id}_{status}_{search}_{from_date}_{to_date}_{skip}_{limit}"
        now = time.time()
        if cache_key in _INVOICES_CACHE:
            ts, cached_data = _INVOICES_CACHE[cache_key]
            if now - ts < _INVOICES_CACHE_TTL:
                return cached_data

        query = db.query(Invoice).options(
            joinedload(Invoice.customer),
            selectinload(Invoice.items)
        )
        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)
        if status:
            query = query.filter(Invoice.status == status)
        if from_date:
            query = query.filter(Invoice.invoice_date >= from_date)
        if to_date:
            query = query.filter(Invoice.invoice_date <= to_date)
        if search:
            pattern = f"%{search}%"
            query = query.join(Customer).filter(
                or_(
                    Invoice.invoice_number.ilike(pattern),
                    Customer.business_name.ilike(pattern),
                    Customer.customer_code.ilike(pattern)
                )
            )
        
        invoices = query.order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc()).offset(skip).limit(limit).all()

        res = [BillingService._build_invoice_response(inv, db, is_list=True) for inv in invoices]
        _INVOICES_CACHE[cache_key] = (now, res)
        return res

    # ----------------------------------------------------
    # QUOTATION MANAGEMENT
    # ----------------------------------------------------
    @staticmethod
    def create_quotation(db: Session, data: QuotationCreate, user_id: Optional[str] = None) -> Quotation:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", data.customer_id)

        items_prep = []
        for itm in data.items:
            product = db.query(Product).filter(Product.id == itm.product_id).first()
            if not product:
                raise EntityNotFoundException("Product", itm.product_id)
            unit_price = itm.unit_price if itm.unit_price is not None else product.base_price
            items_prep.append({
                "product_id": product.id,
                "item_name": product.name,
                "packaging_unit": product.packaging_unit,
                "quantity": itm.quantity,
                "unit_price": unit_price,
                "discount_rate": itm.discount_rate,
                "tax_rate": product.tax_rate
            })

        calc = BillingService.calculate_invoice_totals(items_prep, data.discount_amount)
        quo_num = SequenceService.get_next_sequence(db, "QUO")

        quo = Quotation(
            quotation_number=quo_num,
            customer_id=customer.id,
            status=QuotationStatus.ISSUED.value,
            quotation_date=get_ist_today(),
            valid_until=data.valid_until,
            subtotal=calc["subtotal"],
            discount_amount=calc["discount_amount"],
            taxable_amount=calc["taxable_amount"],
            tax_amount=calc["tax_amount"],
            total_amount=calc["total_amount"],
            terms_and_conditions=data.terms_and_conditions,
            notes=data.notes,
            created_by_id=user_id
        )
        db.add(quo)
        db.flush()

        for itm in calc["items"]:
            q_item = QuotationItem(
                quotation_id=quo.id,
                product_id=itm["product_id"],
                item_name=itm["item_name"],
                packaging_unit=itm["packaging_unit"],
                quantity=itm["quantity"],
                unit_price=itm["unit_price"],
                discount_rate=itm["discount_rate"],
                tax_rate=itm["tax_rate"],
                tax_amount=itm["tax_amount"],
                line_total=itm["line_total"]
            )
            db.add(q_item)

        AuditService.log(db, AuditAction.CREATE, "Quotation", quo.id, user_id=user_id, after_state={"quotation_number": quo_num})
        db.commit()
        db.refresh(quo)
        return quo

    @staticmethod
    def convert_quotation_to_invoice(db: Session, quotation_id: str, user_id: Optional[str] = None) -> Invoice:
        quo = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quo:
            raise EntityNotFoundException("Quotation", quotation_id)
        
        inv_items = [
            InvoiceItemCreate(
                product_id=itm.product_id,
                quantity=itm.quantity,
                unit_price=itm.unit_price,
                discount_rate=itm.discount_rate
            ) for itm in quo.items
        ]

        inv_create = InvoiceCreate(
            customer_id=quo.customer_id,
            quotation_id=quo.id,
            invoice_date=get_ist_today(),
            due_date=get_ist_today() + timedelta(days=15),
            discount_amount=quo.discount_amount,
            notes=f"Generated from Quotation #{quo.quotation_number}",
            auto_issue=True,
            items=inv_items
        )

        invoice = BillingService.create_invoice(db, inv_create, user_id=user_id)
        quo.status = QuotationStatus.ACCEPTED.value
        db.commit()
        return invoice
