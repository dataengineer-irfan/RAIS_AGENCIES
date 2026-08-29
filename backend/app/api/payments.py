from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from decimal import Decimal
from app.core.database import get_db
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentAllocationCreate, PaymentResponse, PaymentAllocationResponse
from app.services.payment_service import PaymentService
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("", response_model=List[PaymentResponse])
def list_payments(
    customer_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return PaymentService.list_payments(
        db=db,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit
    )

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return PaymentService.get_payment_by_id(db, payment_id)

@router.post("", response_model=PaymentResponse)
def record_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    payment = PaymentService.record_payment(
        db=db,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return PaymentService.get_payment_by_id(db, payment.id)

@router.post("/{payment_id}/allocate", response_model=PaymentAllocationResponse)
def allocate_payment(
    payment_id: str,
    data: PaymentAllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    alloc = PaymentService.allocate_payment(
        db=db,
        payment_id=payment_id,
        invoice_id=data.invoice_id,
        amount=data.amount,
        user_id=current_user.id
    )
    db.commit()
    return PaymentAllocationResponse(
        id=alloc.id,
        payment_id=alloc.payment_id,
        invoice_id=alloc.invoice_id,
        invoice_number=alloc.invoice.invoice_number if alloc.invoice else None,
        allocated_amount=alloc.allocated_amount,
        allocated_at=alloc.allocated_at
    )
