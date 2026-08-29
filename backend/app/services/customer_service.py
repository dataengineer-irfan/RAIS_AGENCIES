from typing import List, Optional, Tuple, Dict, Any
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment, PaymentAllocation
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerSummary
from app.schemas.reports import CustomerLedgerEntry
from app.core.exceptions import EntityNotFoundException, RaisAppException
from app.services.sequence_service import SequenceService
from app.services.audit_service import AuditService
from app.domain.enums import AuditAction, InvoiceStatus, CustomerStatus

class CustomerService:
    @staticmethod
    def get_customer_balances(db: Session, customer_id: str) -> Tuple[Decimal, Decimal, Decimal]:
        """
        Calculates live total invoiced, total paid, and outstanding balance for a customer.
        """
        valid_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]
        
        # Invoiced total
        invoiced_query = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(valid_statuses)
        ).scalar()
        total_invoiced = Decimal(str(invoiced_query or "0.00"))

        # Paid total across payments
        paid_query = db.query(func.sum(Payment.amount)).filter(
            Payment.customer_id == customer_id
        ).scalar()
        total_paid = Decimal(str(paid_query or "0.00"))

        # Outstanding calculation
        outstanding_query = db.query(func.sum(Invoice.outstanding_amount)).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(valid_statuses)
        ).scalar()
        outstanding_balance = Decimal(str(outstanding_query or "0.00"))

        return total_invoiced, total_paid, outstanding_balance

    @staticmethod
    def list_customers(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[CustomerResponse]:
        query = db.query(Customer)
        if status:
            query = query.filter(Customer.status == status)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Customer.business_name.ilike(pattern),
                    Customer.contact_person.ilike(pattern),
                    Customer.customer_code.ilike(pattern),
                    Customer.phone.ilike(pattern),
                    Customer.city.ilike(pattern)
                )
            )
        customers = query.order_by(Customer.business_name.asc()).offset(skip).limit(limit).all()
        if not customers:
            return []
        
        cust_ids = [c.id for c in customers]
        valid_statuses = [
            InvoiceStatus.ISSUED.value,
            InvoiceStatus.PARTIALLY_PAID.value,
            InvoiceStatus.PAID.value,
            InvoiceStatus.OVERDUE.value
        ]

        # Single batch query for invoice totals
        inv_stats = db.query(
            Invoice.customer_id,
            func.sum(Invoice.total_amount).label("total_invoiced"),
            func.sum(Invoice.outstanding_amount).label("total_outstanding")
        ).filter(
            Invoice.customer_id.in_(cust_ids),
            Invoice.status.in_(valid_statuses)
        ).group_by(Invoice.customer_id).all()

        invoiced_map = {row[0]: Decimal(str(row[1] or "0.00")) for row in inv_stats}
        outstanding_map = {row[0]: Decimal(str(row[2] or "0.00")) for row in inv_stats}

        # Single batch query for payment totals
        pay_stats = db.query(
            Payment.customer_id,
            func.sum(Payment.amount).label("total_paid")
        ).filter(
            Payment.customer_id.in_(cust_ids)
        ).group_by(Payment.customer_id).all()

        paid_map = {row[0]: Decimal(str(row[1] or "0.00")) for row in pay_stats}

        result = []
        for c in customers:
            total_invoiced = invoiced_map.get(c.id, Decimal("0.00"))
            total_paid = paid_map.get(c.id, Decimal("0.00"))
            outstanding = outstanding_map.get(c.id, Decimal("0.00"))
            c_resp = CustomerResponse(
                id=c.id,
                customer_code=c.customer_code,
                business_name=c.business_name,
                contact_person=c.contact_person,
                phone=c.phone,
                secondary_phone=c.secondary_phone,
                email=c.email,
                address_line1=c.address_line1,
                address_line2=c.address_line2,
                city=c.city,
                state=c.state,
                pincode=c.pincode,
                gstin=c.gstin,
                credit_limit=c.credit_limit,
                status=c.status,
                notes=c.notes,
                total_invoiced=total_invoiced,
                total_paid=total_paid,
                outstanding_balance=outstanding,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
            result.append(c_resp)
        return result

    @staticmethod
    def get_customer_by_id(db: Session, customer_id: str) -> CustomerResponse:
        c = db.query(Customer).filter(Customer.id == customer_id).first()
        if not c:
            raise EntityNotFoundException("Customer", customer_id)
        
        total_invoiced, total_paid, outstanding = CustomerService.get_customer_balances(db, c.id)
        return CustomerResponse(
            id=c.id,
            customer_code=c.customer_code,
            business_name=c.business_name,
            contact_person=c.contact_person,
            phone=c.phone,
            secondary_phone=c.secondary_phone,
            email=c.email,
            address_line1=c.address_line1,
            address_line2=c.address_line2,
            city=c.city,
            state=c.state,
            pincode=c.pincode,
            gstin=c.gstin,
            credit_limit=c.credit_limit,
            status=c.status,
            notes=c.notes,
            total_invoiced=total_invoiced,
            total_paid=total_paid,
            outstanding_balance=outstanding,
            created_at=c.created_at,
            updated_at=c.updated_at
        )

    @staticmethod
    def create_customer(db: Session, data: CustomerCreate, user_id: Optional[str] = None) -> Customer:
        code = SequenceService.get_next_sequence(db, "CUST")
        customer = Customer(
            customer_code=code,
            business_name=data.business_name,
            contact_person=data.contact_person,
            phone=data.phone,
            secondary_phone=data.secondary_phone,
            email=data.email,
            address_line1=data.address_line1,
            address_line2=data.address_line2,
            city=data.city,
            state=data.state,
            pincode=data.pincode,
            gstin=data.gstin,
            credit_limit=data.credit_limit,
            status=CustomerStatus.ACTIVE.value,
            notes=data.notes
        )
        db.add(customer)
        db.flush()
        AuditService.log(db, AuditAction.CREATE, "Customer", customer.id, user_id=user_id, after_state=data.dict())
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def update_customer(db: Session, customer_id: str, data: CustomerUpdate, user_id: Optional[str] = None) -> Customer:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", customer_id)
        
        before_state = {
            "business_name": customer.business_name,
            "phone": customer.phone,
            "credit_limit": str(customer.credit_limit),
            "status": customer.status
        }
        
        update_dict = data.dict(exclude_unset=True)
        for k, v in update_dict.items():
            setattr(customer, k, v)
            
        db.flush()
        AuditService.log(db, AuditAction.UPDATE, "Customer", customer.id, user_id=user_id, before_state=before_state, after_state=update_dict)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def get_customer_ledger(db: Session, customer_id: str) -> List[CustomerLedgerEntry]:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise EntityNotFoundException("Customer", customer_id)
            
        # Invoices
        invoices = db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_([InvoiceStatus.ISSUED.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.PAID.value, InvoiceStatus.OVERDUE.value])
        ).order_by(Invoice.invoice_date.asc(), Invoice.created_at.asc()).all()

        # Payments
        payments = db.query(Payment).filter(
            Payment.customer_id == customer_id
        ).order_by(Payment.payment_date.asc(), Payment.created_at.asc()).all()

        timeline = []
        for inv in invoices:
            timeline.append({
                "date": inv.invoice_date,
                "created_at": inv.created_at,
                "type": "INVOICE",
                "reference": inv.invoice_number,
                "description": f"Invoice issued - {inv.items.__len__()} items",
                "debit": Decimal(str(inv.total_amount)),
                "credit": Decimal("0.00")
            })

        for pay in payments:
            timeline.append({
                "date": pay.payment_date,
                "created_at": pay.created_at,
                "type": "PAYMENT",
                "reference": pay.payment_number,
                "description": f"Payment received via {pay.payment_method}" + (f" (Ref: {pay.reference_number})" if pay.reference_number else ""),
                "debit": Decimal("0.00"),
                "credit": Decimal(str(pay.amount))
            })

        # Sort combined timeline chronologically
        timeline.sort(key=lambda x: (x["date"], x["created_at"]))

        ledger: List[CustomerLedgerEntry] = []
        running_bal = Decimal("0.00")
        for entry in timeline:
            running_bal = running_bal + entry["debit"] - entry["credit"]
            ledger.append(CustomerLedgerEntry(
                date=entry["date"],
                type=entry["type"],
                reference=entry["reference"],
                description=entry["description"],
                debit=entry["debit"],
                credit=entry["credit"],
                running_balance=running_bal
            ))
        return ledger
