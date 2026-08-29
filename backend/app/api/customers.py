from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.schemas.reports import CustomerLedgerEntry
from app.services.customer_service import CustomerService
from app.api.deps import get_current_user, require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return CustomerService.list_customers(db, search=search, status=status, skip=skip, limit=limit)

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return CustomerService.get_customer_by_id(db, customer_id)

@router.post("", response_model=CustomerResponse)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    cust = CustomerService.create_customer(db, data, user_id=current_user.id)
    return CustomerService.get_customer_by_id(db, cust.id)

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    cust = CustomerService.update_customer(db, customer_id, data, user_id=current_user.id)
    return CustomerService.get_customer_by_id(db, cust.id)

@router.get("/{customer_id}/ledger", response_model=List[CustomerLedgerEntry])
def get_customer_ledger(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return CustomerService.get_customer_ledger(db, customer_id)
