from typing import List, Optional, Dict, Any
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, timedelta
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.invoice import Invoice, InvoiceItem
from app.models.quotation import Quotation, QuotationItem
from app.models.order import Order, OrderItem
from app.models.customer import Customer
from app.models.catalogue import Product
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
from app.core.config import settings

def quantize_amount(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class BillingService:
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
            tax_rate = Decimal(str(item.get("tax_rate", "0.00")))

            gross_line = quantize_amount(qty * unit_price)
            discount_line = quantize_amount(gross_line * (discount_rate / Decimal("100.00")))
            taxable_line = quantize_amount(gross_line - discount_line)
            tax_line = quantize_amount(taxable_line * (tax_rate / Decimal("100.00")))
            line_total = quantize_amount(taxable_line + tax_line)

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
        final_taxable = quantize_amount(subtotal - net_discount)
        grand_total = quantize_amount(final_taxable + total_tax)

        return {
            "subtotal": subtotal,
            "discount_amount": net_discount,
            "taxable_amount": final_taxable,
            "tax_amount": total_tax,
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

        if not data.items:
            raise InvalidFinancialOperationException("An invoice must contain at least one line item.")

        # Prepare items data
        prepared_items = []
        for itm in data.items:
            product = db.query(Product).filter(Product.id == itm.product_id).first()
            if not product:
                raise EntityNotFoundException("Product", itm.product_id)
            if not product.is_active:
                raise RaisAppException(detail=f"Product '{product.name}' is inactive.")
            
            unit_price = itm.unit_price if itm.unit_price is not None else product.base_price
            prepared_items.append({
                "product_id": product.id,
                "item_description": product.name,
                "brand": product.brand,
                "packaging_unit": product.packaging_unit,
                "hsn_code": product.hsn_code,
                "quantity": itm.quantity,
                "unit_price": unit_price,
                "discount_rate": itm.discount_rate,
                "tax_rate": product.tax_rate
            })

        calc = BillingService.calculate_invoice_totals(prepared_items, data.discount_amount)
        
        inv_number = SequenceService.get_next_sequence(db, "INV")
        inv_date = data.invoice_date or date.today()
        due_date = data.due_date or (inv_date + timedelta(days=15))
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
            subtotal=calc["subtotal"],
            discount_amount=calc["discount_amount"],
            taxable_amount=calc["taxable_amount"],
            tax_amount=calc["tax_amount"],
            total_amount=calc["total_amount"],
            paid_amount=Decimal("0.00"),
            outstanding_amount=calc["total_amount"],
            payment_terms=data.payment_terms,
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
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)
        
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
        
        db.flush()
        AuditService.log(
            db, AuditAction.STATUS_CHANGE, "Invoice", invoice.id,
            user_id=user_id,
            before_state={"status": before_status},
            after_state={"status": target_status, "reason": reason}
        )
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def get_invoice_by_id(db: Session, invoice_id: str) -> InvoiceResponse:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            raise EntityNotFoundException("Invoice", invoice_id)
        
        # Check if overdue
        if inv.status in [InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value]:
            if inv.due_date < date.today() and inv.outstanding_amount > Decimal("0.00"):
                inv.status = InvoiceStatus.OVERDUE.value
                db.commit()
                db.refresh(inv)

        return BillingService._build_invoice_response(inv)

    @staticmethod
    def _build_invoice_response(inv: Invoice) -> InvoiceResponse:
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
        if inv.allocations:
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
            customer_code=inv.customer.customer_code if inv.customer else "",
            customer_phone=inv.customer.phone if inv.customer else "",
            customer_address=f"{inv.customer.address_line1}, {inv.customer.city} - {inv.customer.pincode}" if inv.customer else "",
            customer_gstin=inv.customer.gstin if inv.customer else "",
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
        query = db.query(Invoice).options(
            joinedload(Invoice.customer),
            joinedload(Invoice.items)
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
        return [BillingService._build_invoice_response(inv) for inv in invoices]

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
            quotation_date=date.today(),
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
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=15),
            discount_amount=quo.discount_amount,
            notes=f"Generated from Quotation #{quo.quotation_number}",
            auto_issue=True,
            items=inv_items
        )

        invoice = BillingService.create_invoice(db, inv_create, user_id=user_id)
        quo.status = QuotationStatus.ACCEPTED.value
        db.commit()
        return invoice
