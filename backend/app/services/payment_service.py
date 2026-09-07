from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session, joinedload
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
        pay_date = data.payment_date or date.today()

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

        # Process initial allocations if passed
        if data.allocations:
            for alloc_item in data.allocations:
                PaymentService.allocate_payment(
                    db=db,
                    payment_id=payment.id,
                    invoice_id=alloc_item.invoice_id,
                    amount=alloc_item.amount,
                    user_id=user_id
                )

        db.commit()
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
    def _build_payment_response(p: Payment) -> PaymentResponse:
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

        return PaymentResponse(
            id=p.id,
            payment_number=p.payment_number,
            customer_id=p.customer_id,
            customer_name=p.customer.business_name if p.customer else None,
            customer_code=p.customer.customer_code if p.customer else None,
            payment_date=p.payment_date,
            amount=p.amount,
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
        ).filter(Payment.id == payment_id).first()
        if not p:
            raise EntityNotFoundException("Payment", payment_id)
        return PaymentService._build_payment_response(p)

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
        return [PaymentService._build_payment_response(p) for p in payments]

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

        db.commit()
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

        # 3. Delete payment record
        pay_number = payment.payment_number
        db.delete(payment)
        db.commit()

        return {
            "success": True,
            "message": f"Payment voucher '{pay_number}' deleted and allocations reversed successfully."
        }
