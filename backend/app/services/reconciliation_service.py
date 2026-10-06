from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment, PaymentAllocation
from app.domain.enums import InvoiceStatus
from app.services.reporting_service import invalidate_reporting_caches

def get_utc_now():
    return datetime.now(timezone.utc)

class ReconciliationService:
    @staticmethod
    def reconcile_customer_fifo(db: Session, customer_id: str, auto_commit: bool = True) -> Dict[str, Any]:
        """
        Performs idempotent First-In, First-Out (FIFO) reconciliation for a single customer.
        1. Clears existing PaymentAllocations for this customer's payments and invoices.
        2. Resets invoice balances (paid_amount=0, outstanding_amount=total_amount, status=ISSUED).
        3. Resets payment balances (allocated_amount=0, unallocated_amount=amount).
        4. Applies payments in chronological order (payment_date ASC, created_at ASC):
           a) First covers the customer's Opening Balance (if any).
           b) Then covers open invoices in chronological order (invoice_date ASC, created_at ASC).
           c) Creates PaymentAllocation records and updates invoice/payment statuses.
        """
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"customer_id": customer_id, "success": False, "error": "Customer not found"}

        ob = Decimal(str(customer.opening_balance or "0.00"))

        payments = db.query(Payment).filter(
            Payment.customer_id == customer_id
        ).order_by(Payment.payment_date.asc(), Payment.created_at.asc()).all()

        invoices = db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status != InvoiceStatus.CANCELLED.value
        ).order_by(Invoice.invoice_date.asc(), Invoice.created_at.asc()).all()

        # Step 1: Remove existing allocations for this customer
        payment_ids = [p.id for p in payments]
        if payment_ids:
            db.query(PaymentAllocation).filter(PaymentAllocation.payment_id.in_(payment_ids)).delete(synchronize_session=False)

        # Step 2: Reset invoices
        for inv in invoices:
            inv.paid_amount = Decimal("0.00")
            inv.outstanding_amount = Decimal(str(inv.total_amount))
            inv.status = InvoiceStatus.ISSUED.value

        # Step 3: Reset payments
        for p in payments:
            p.allocated_amount = Decimal("0.00")
            p.unallocated_amount = Decimal(str(p.amount))

        # Step 4: Reconcile FIFO
        rem_ob = ob
        inv_idx = 0
        curr_inv_rem = Decimal(str(invoices[inv_idx].outstanding_amount)) if invoices else Decimal("0.00")

        allocations_to_add = []
        ob_settled_total = Decimal("0.00")
        inv_settled_total = Decimal("0.00")
        now = get_utc_now()

        for p in payments:
            p_avail = Decimal(str(p.amount))

            # a) Satisfy remaining Opening Balance first
            if rem_ob > Decimal("0.00"):
                cov = min(rem_ob, p_avail)
                rem_ob -= cov
                p_avail -= cov
                p.allocated_amount += cov
                p.unallocated_amount -= cov
                ob_settled_total += cov

            # b) Satisfy chronological invoices
            while p_avail > Decimal("0.00") and inv_idx < len(invoices):
                inv = invoices[inv_idx]
                alloc = min(p_avail, curr_inv_rem)

                if alloc > Decimal("0.00"):
                    allocations_to_add.append(
                        PaymentAllocation(
                            payment_id=p.id,
                            invoice_id=inv.id,
                            allocated_amount=alloc,
                            allocated_at=now
                        )
                    )

                    p_avail -= alloc
                    curr_inv_rem -= alloc

                    p.allocated_amount += alloc
                    p.unallocated_amount -= alloc

                    inv.paid_amount += alloc
                    inv.outstanding_amount -= alloc
                    inv_settled_total += alloc

                    if inv.outstanding_amount <= Decimal("0.00"):
                        inv.status = InvoiceStatus.PAID.value
                    else:
                        inv.status = InvoiceStatus.PARTIALLY_PAID.value

                if curr_inv_rem <= Decimal("0.00"):
                    inv_idx += 1
                    if inv_idx < len(invoices):
                        curr_inv_rem = Decimal(str(invoices[inv_idx].outstanding_amount))

        if allocations_to_add:
            db.bulk_save_objects(allocations_to_add)

        if auto_commit:
            db.commit()

        # Calculate final customer dues
        rem_inv_due = sum(inv.outstanding_amount for inv in invoices if inv.outstanding_amount > Decimal("0.00"))
        total_due = rem_ob + rem_inv_due

        return {
            "customer_id": customer.id,
            "customer_name": customer.business_name,
            "opening_balance": float(ob),
            "opening_balance_remaining": float(rem_ob),
            "invoices_count": len(invoices),
            "payments_count": len(payments),
            "allocations_created": len(allocations_to_add),
            "ob_settled": float(ob_settled_total),
            "invoices_settled": float(inv_settled_total),
            "remaining_invoice_due": float(rem_inv_due),
            "total_outstanding_due": float(total_due),
            "success": True
        }

    @staticmethod
    def reconcile_all_fifo(db: Session) -> Dict[str, Any]:
        """
        Performs FIFO reconciliation for all customers in the database in a single transaction.
        """
        customers = db.query(Customer).all()
        results = []
        for c in customers:
            res = ReconciliationService.reconcile_customer_fifo(db, c.id, auto_commit=False)
            results.append(res)

        db.commit()
        invalidate_reporting_caches()

        return {
            "total_customers_reconciled": len(results),
            "results": results
        }
