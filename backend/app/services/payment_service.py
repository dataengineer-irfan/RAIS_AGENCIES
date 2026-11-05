from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.payment import Payment, PaymentAllocation
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.schemas.payment import (
    PaymentCreate, PaymentUpdate, PaymentAllocationCreate, PaymentResponse, PaymentAllocationResponse
)
from app.core.exceptions import EntityNotFoundException, InvalidFinancialOperationException
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.domain.enums import PaymentMethod, InvoiceStatus, AuditAction
from app.core.datetime_utils import get_ist_today

def get_utc_now():
    return datetime.now(timezone.utc)

class PaymentService:
    @staticmethod
    def record_payment(
        db: Session,
        data: PaymentCreate,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> Payment:
        customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", data.customer_id)

        if data.amount <= Decimal("0.00"):
            raise InvalidFinancialOperationException("Payment amount must be greater than zero.")

        # Check payment method
        valid_methods = [m.value for m in PaymentMethod]
        if data.payment_method not in valid_methods:
            raise InvalidFinancialOperationException(f"Invalid payment method '{data.payment_method}'. Must be one of {valid_methods}.")

        pay_number = SequenceService.get_next_sequence(db, "PAY")
        pay_date = data.payment_date or get_ist_today()

        payment = Payment(
            payment_number=pay_number,
            customer_id=customer.id,
            payment_date=pay_date,
            amount=data.amount,
            allocated_amount=Decimal("0.00"),
            unallocated_amount=data.amount,
            payment_method=data.payment_method,
            reference_number=data.reference_number,
            notes=data.notes,
            created_by_id=user_id
        )
        db.add(payment)
        db.flush()

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
                "amount": str(data.amount),
                "customer": customer.business_name,
                "method": data.payment_method
            }
        )

        # Process settlement discount / concession / round-off if provided
        discount = data.discount_amount or Decimal("0.00")
        rem_discount = discount
        if rem_discount > Decimal("0.00"):
            target_invoices = []
            if data.allocations:
                target_inv_id = data.allocations[0].invoice_id
                target_inv = db.query(Invoice).filter(Invoice.id == target_inv_id).with_for_update().first()
                if target_inv and target_inv.outstanding_amount > Decimal("0.00"):
                    target_invoices.append(target_inv)
            
            other_invs = db.query(Invoice).filter(
                Invoice.customer_id == customer.id,
                Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value]),
                Invoice.outstanding_amount > Decimal("0.00")
            ).order_by(Invoice.invoice_date.asc(), Invoice.created_at.asc()).with_for_update().all()

            for oi in other_invs:
                if oi not in target_invoices:
                    target_invoices.append(oi)

            total_disc_applied = Decimal("0.00")
            from app.services.billing_service import BillingService

            for inv in target_invoices:
                if rem_discount <= Decimal("0.00"):
                    break
                eff = min(rem_discount, inv.outstanding_amount)
                if eff > Decimal("0.00"):
                    inv.discount_amount = (inv.discount_amount or Decimal("0.00")) + eff
                    inv.total_amount = max(Decimal("0.00"), inv.total_amount - eff)
                    inv.outstanding_amount = max(Decimal("0.00"), inv.outstanding_amount - eff)
                    if inv.outstanding_amount <= Decimal("0.00"):
                        inv.status = InvoiceStatus.PAID.value
                    inv.qr_payload = BillingService.generate_upi_qr_payload(inv.invoice_number, inv.outstanding_amount)

                    # Apportion settlement discount across invoice items so gross margin & product profit reflect the concession
                    if inv.items:
                        tot_items_val = sum((Decimal(str(it.line_total or "0.00")) for it in inv.items), Decimal("0.00"))
                        if tot_items_val > Decimal("0.00"):
                            allocated_so_far = Decimal("0.00")
                            for idx, it in enumerate(inv.items):
                                if idx == len(inv.items) - 1:
                                    it_disc = eff - allocated_so_far
                                else:
                                    it_disc = (eff * (Decimal(str(it.line_total or "0.00")) / tot_items_val)).quantize(Decimal("0.01"))
                                    allocated_so_far += it_disc
                                it.discount_amount = (it.discount_amount or Decimal("0.00")) + it_disc
                                it.line_total = max(Decimal("0.00"), it.line_total - it_disc)
                                it.taxable_amount = it.line_total

                    rem_discount -= eff
                    total_disc_applied += eff

                    AuditService.log(
                        db=db,
                        action=AuditAction.UPDATE,
                        entity_name="Invoice",
                        entity_id=inv.id,
                        user_id=user_id,
                        username=username,
                        user_role=user_role,
                        after_state={
                            "event": "SETTLEMENT_CASH_DISCOUNT",
                            "discount_applied": str(eff),
                            "new_total": str(inv.total_amount),
                            "new_outstanding": str(inv.outstanding_amount),
                            "payment_number": pay_number
                        }
                    )

            if rem_discount > Decimal("0.00") and customer.opening_balance > Decimal("0.00"):
                eff = min(rem_discount, customer.opening_balance)
                customer.opening_balance = max(Decimal("0.00"), customer.opening_balance - eff)
                rem_discount -= eff
                total_disc_applied += eff

            if total_disc_applied > Decimal("0.00"):
                disc_note = f"Settlement Cash Discount of ₹{total_disc_applied:.2f} applied"
                payment.notes = f"{disc_note}. {payment.notes}" if payment.notes else f"{disc_note}."

        # Process initial allocations if passed
        if data.allocations:
            for alloc_item in data.allocations:
                if payment.unallocated_amount <= Decimal("0.00"):
                    break
                target_inv_check = db.query(Invoice).filter(Invoice.id == alloc_item.invoice_id).first()
                if not target_inv_check or target_inv_check.outstanding_amount <= Decimal("0.00"):
                    continue
                safe_alloc_amount = min(alloc_item.amount, payment.unallocated_amount, target_inv_check.outstanding_amount)
                if safe_alloc_amount > Decimal("0.00"):
                    PaymentService.allocate_payment(
                        db=db,
                        payment_id=payment.id,
                        invoice_id=alloc_item.invoice_id,
                        amount=safe_alloc_amount,
                        user_id=user_id
                    )
        else:
            # Automatic FIFO settlement: customer recorded a general payment or collection voucher.
            # Settle opening balance and open invoices chronologically (FIFO).
            from app.services.reconciliation_service import ReconciliationService
            ReconciliationService.reconcile_customer_fifo(db, customer.id, auto_commit=False)

        db.commit()
        from app.services.billing_service import BillingService
        BillingService.invalidate_cache()
        db.refresh(payment)
        return payment

    @staticmethod
    def allocate_payment(
        db: Session,
        payment_id: str,
        invoice_id: str,
        amount: Decimal,
        user_id: Optional[str] = None
    ) -> PaymentAllocation:
        payment = db.query(Payment).filter(Payment.id == payment_id).with_for_update().first()
        if not payment:
            raise EntityNotFoundException("Payment", payment_id)

        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).with_for_update().first()
        if not invoice:
            raise EntityNotFoundException("Invoice", invoice_id)

        if payment.customer_id != invoice.customer_id:
            raise InvalidFinancialOperationException(
                f"Customer mismatch: Payment belongs to customer {payment.customer_id} but Invoice belongs to {invoice.customer_id}."
            )

        if amount <= Decimal("0.00"):
            raise InvalidFinancialOperationException("Allocation amount must be greater than zero.")

        if amount > payment.unallocated_amount:
            raise InvalidFinancialOperationException(
                f"Allocation amount ₹{amount} exceeds unallocated payment balance ₹{payment.unallocated_amount}."
            )

        if amount > invoice.outstanding_amount:
            raise InvalidFinancialOperationException(
                f"Allocation amount ₹{amount} exceeds invoice outstanding balance ₹{invoice.outstanding_amount}."
            )

        # Create allocation record
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            allocated_amount=amount,
            allocated_at=get_utc_now()
        )
        db.add(allocation)

        # Update payment balances
        payment.allocated_amount += amount
        payment.unallocated_amount -= amount

        # Update invoice balances
        invoice.paid_amount += amount
        invoice.outstanding_amount -= amount

        if invoice.outstanding_amount == Decimal("0.00"):
            invoice.status = InvoiceStatus.PAID.value
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID.value

        AuditService.log(
            db=db,
            action=AuditAction.ALLOCATION,
            entity_name="PaymentAllocation",
            entity_id=payment.id,
            user_id=user_id,
            after_state={
                "payment_number": payment.payment_number,
                "invoice_number": invoice.invoice_number,
                "allocated_amount": str(amount),
                "remaining_invoice_due": str(invoice.outstanding_amount),
                "remaining_payment_unallocated": str(payment.unallocated_amount)
            }
        )

        db.flush()
        return allocation

    @staticmethod
    def _build_payment_response(p: Payment, cust_balance: Optional[Decimal] = None) -> PaymentResponse:
        allocs = []
        if p.allocations:
            for a in p.allocations:
                allocs.append(
                    PaymentAllocationResponse(
                        id=a.id,
                        payment_id=a.payment_id,
                        invoice_id=a.invoice_id,
                        invoice_number=a.invoice.invoice_number if a.invoice else None,
                        allocated_amount=a.allocated_amount,
                        allocated_at=a.allocated_at
                    )
                )

        cust_address = None
        if p.customer:
            parts = [p.customer.address_line1]
            if p.customer.address_line2:
                parts.append(p.customer.address_line2)
            if p.customer.city:
                parts.append(p.customer.city)
            cust_address = ", ".join([pt for pt in parts if pt])

        disc_val = Decimal("0.00")
        if p.notes and "Settlement Cash Discount of ₹" in p.notes:
            try:
                part = p.notes.split("Settlement Cash Discount of ₹")[1].split(" ")[0].replace(",", "")
                disc_val = Decimal(part)
            except Exception:
                disc_val = Decimal("0.00")

        return PaymentResponse(
            id=p.id,
            payment_number=p.payment_number,
            customer_id=p.customer_id,
            customer_name=p.customer.business_name if p.customer else None,
            customer_contact=p.customer.contact_person if p.customer else None,
            customer_code=p.customer.customer_code if p.customer else None,
            customer_phone=p.customer.phone if p.customer else None,
            customer_address=cust_address,
            customer_outstanding_balance=cust_balance,
            payment_date=p.payment_date,
            amount=p.amount,
            discount_amount=disc_val,
            allocated_amount=p.allocated_amount,
            unallocated_amount=p.unallocated_amount,
            payment_method=p.payment_method,
            reference_number=p.reference_number,
            notes=p.notes,
            created_at=p.created_at,
            allocations=allocs
        )

    @staticmethod
    def get_payment_by_id(db: Session, payment_id: str) -> PaymentResponse:
        p = db.query(Payment).options(
            joinedload(Payment.customer),
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
        ).filter(or_(Payment.id == payment_id, Payment.payment_number == payment_id)).first()
        if not p:
            raise EntityNotFoundException("Payment", payment_id)

        cust_balance = None
        if p.customer_id:
            try:
                from app.services.customer_service import CustomerService
                _, _, cust_balance = CustomerService.get_customer_balances(db, p.customer_id)
            except Exception:
                cust_balance = None

        return PaymentService._build_payment_response(p, cust_balance=cust_balance)

    @staticmethod
    def list_payments(
        db: Session,
        customer_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[PaymentResponse]:
        query = db.query(Payment).options(
            joinedload(Payment.customer),
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
        )
        if customer_id:
            query = query.filter(Payment.customer_id == customer_id)
        if from_date:
            query = query.filter(Payment.payment_date >= from_date)
        if to_date:
            query = query.filter(Payment.payment_date <= to_date)

        payments = query.order_by(Payment.payment_date.desc(), Payment.created_at.desc()).offset(skip).limit(limit).all()

        cust_balance_map = {}
        cust_ids = list({p.customer_id for p in payments if p.customer_id})
        if cust_ids:
            try:
                from app.services.customer_service import CustomerService
                cust_balance_map = CustomerService.get_customer_balances_map(db, cust_ids)
            except Exception:
                pass

        return [PaymentService._build_payment_response(p, cust_balance=cust_balance_map.get(p.customer_id)) for p in payments]

    @staticmethod
    def update_payment(
        db: Session,
        payment_id: str,
        data: PaymentUpdate,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> PaymentResponse:
        payment = db.query(Payment).options(
            joinedload(Payment.customer),
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
        ).filter(Payment.id == payment_id).with_for_update().first()
        if not payment:
            raise EntityNotFoundException("Payment", payment_id)

        before_state = {
            "amount": str(payment.amount),
            "payment_date": str(payment.payment_date),
            "payment_method": payment.payment_method,
            "reference_number": payment.reference_number,
            "notes": payment.notes
        }

        if data.amount is not None:
            new_amount = Decimal(str(data.amount))
            if new_amount < Decimal("0.00"):
                raise InvalidFinancialOperationException("Payment amount cannot be negative.")

            if new_amount < payment.allocated_amount:
                # De-allocate excess amount from invoices (latest allocations first)
                excess = payment.allocated_amount - new_amount
                for alloc in sorted(list(payment.allocations), key=lambda a: a.allocated_at or get_utc_now(), reverse=True):
                    if excess <= Decimal("0.00"):
                        break
                    inv = alloc.invoice
                    if alloc.allocated_amount <= excess:
                        excess -= alloc.allocated_amount
                        payment.allocated_amount -= alloc.allocated_amount
                        if inv:
                            inv.paid_amount -= alloc.allocated_amount
                            inv.outstanding_amount += alloc.allocated_amount
                            if inv.paid_amount <= Decimal("0.00"):
                                inv.paid_amount = Decimal("0.00")
                                inv.status = InvoiceStatus.ISSUED.value
                            else:
                                inv.status = InvoiceStatus.PARTIALLY_PAID.value
                        db.delete(alloc)
                    else:
                        alloc.allocated_amount -= excess
                        payment.allocated_amount -= excess
                        if inv:
                            inv.paid_amount -= excess
                            inv.outstanding_amount += excess
                            if inv.outstanding_amount > Decimal("0.00"):
                                inv.status = InvoiceStatus.PARTIALLY_PAID.value
                        excess = Decimal("0.00")

                payment.amount = new_amount
                payment.unallocated_amount = new_amount - payment.allocated_amount
            else:
                diff = new_amount - payment.amount
                payment.amount = new_amount
                payment.unallocated_amount += diff

        if data.payment_date is not None:
            payment.payment_date = data.payment_date

        if data.payment_method is not None:
            valid_methods = [m.value for m in PaymentMethod]
            if data.payment_method not in valid_methods:
                raise InvalidFinancialOperationException(f"Invalid payment method '{data.payment_method}'. Must be one of {valid_methods}.")
            payment.payment_method = data.payment_method

        if data.reference_number is not None:
            payment.reference_number = data.reference_number

        if data.notes is not None:
            payment.notes = data.notes

        db.flush()

        AuditService.log(
            db=db,
            action=AuditAction.UPDATE,
            entity_name="Payment",
            entity_id=payment.id,
            user_id=user_id,
            username=username,
            user_role=user_role,
            before_state=before_state,
            after_state={
                "amount": str(payment.amount),
                "payment_date": str(payment.payment_date),
                "payment_method": payment.payment_method,
                "reference_number": payment.reference_number,
                "notes": payment.notes
            }
        )

        if data.amount is not None:
            from app.services.reconciliation_service import ReconciliationService
            ReconciliationService.reconcile_customer_fifo(db, payment.customer_id, auto_commit=False)

        db.commit()
        from app.services.billing_service import BillingService
        BillingService.invalidate_cache()
        db.refresh(payment)
        return PaymentService._build_payment_response(payment)

    @staticmethod
    def delete_payment(
        db: Session,
        payment_id: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        user_role: Optional[str] = None
    ) -> dict:
        payment = db.query(Payment).options(
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice)
        ).filter(Payment.id == payment_id).with_for_update().first()
        if not payment:
            raise EntityNotFoundException("Payment", payment_id)

        cust_id = payment.customer_id

        # 1. Reverse all allocations on invoices
        for alloc in list(payment.allocations):
            inv = alloc.invoice
            if inv:
                inv.paid_amount -= alloc.allocated_amount
                inv.outstanding_amount += alloc.allocated_amount
                if inv.paid_amount <= Decimal("0.00"):
                    inv.paid_amount = Decimal("0.00")
                    inv.status = InvoiceStatus.ISSUED.value
                else:
                    inv.status = InvoiceStatus.PARTIALLY_PAID.value

        db.flush()

        # 2. Log audit event
        AuditService.log(
            db=db,
            action=AuditAction.DELETE,
            entity_name="Payment",
            entity_id=payment.id,
            user_id=user_id,
            username=username,
            user_role=user_role,
            before_state={
                "payment_number": payment.payment_number,
                "customer_id": payment.customer_id,
                "amount": str(payment.amount),
                "allocated_amount": str(payment.allocated_amount)
            }
        )

        # 3. Delete payment record and commit first so session is clean
        pay_number = payment.payment_number
        db.delete(payment)
        db.commit()

        # 4. Re-reconcile customer FIFO in a clean transaction
        from app.services.reconciliation_service import ReconciliationService
        ReconciliationService.reconcile_customer_fifo(db, cust_id, auto_commit=True)

        from app.services.billing_service import BillingService
        BillingService.invalidate_cache()

        return {
            "success": True,
            "message": f"Payment voucher '{pay_number}' deleted and allocations reversed successfully."
        }

    @staticmethod
    def get_payments_summary(db: Session) -> dict:
        from sqlalchemy import func
        today = get_ist_today()
        month_start = date(today.year, today.month, 1)

        total_all_time = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or Decimal("0.00")
        total_month = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.payment_date >= month_start,
            Payment.payment_date <= today
        ).scalar() or Decimal("0.00")
        count_all = db.query(func.count(Payment.id)).scalar() or 0

        return {
            "total_collected_all_time": float(total_all_time),
            "total_collected_this_month": float(total_month),
            "total_vouchers_count": count_all,
            "current_month_str": today.strftime("%b %Y")
        }
