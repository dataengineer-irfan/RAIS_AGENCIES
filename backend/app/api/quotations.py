from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.models.quotation import Quotation
from app.schemas.quotation import QuotationCreate, QuotationResponse, QuotationItemResponse
from app.schemas.invoice import InvoiceResponse
from app.services.billing_service import BillingService
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/quotations", tags=["Quotations"])

@router.get("", response_model=List[QuotationResponse])
def list_quotations(
    customer_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    query = db.query(Quotation)
    if customer_id:
        query = query.filter(Quotation.customer_id == customer_id)
    quotations = query.order_by(Quotation.quotation_date.desc()).offset(skip).limit(limit).all()
    
    res = []
    for q in quotations:
        items = [
            QuotationItemResponse(
                id=i.id,
                product_id=i.product_id,
                item_name=i.item_name,
                packaging_unit=i.packaging_unit,
                quantity=i.quantity,
                unit_price=i.unit_price,
                discount_rate=i.discount_rate,
                tax_rate=i.tax_rate,
                tax_amount=i.tax_amount,
                line_total=i.line_total
            ) for i in q.items
        ]
        res.append(QuotationResponse(
            id=q.id,
            quotation_number=q.quotation_number,
            customer_id=q.customer_id,
            customer_name=q.customer.business_name if q.customer else None,
            customer_phone=q.customer.phone if q.customer else None,
            status=q.status,
            quotation_date=q.quotation_date,
            valid_until=q.valid_until,
            subtotal=q.subtotal,
            discount_amount=q.discount_amount,
            taxable_amount=q.taxable_amount,
            tax_amount=q.tax_amount,
            total_amount=q.total_amount,
            terms_and_conditions=q.terms_and_conditions,
            notes=q.notes,
            created_at=q.created_at,
            items=items
        ))
    return res

@router.post("", response_model=QuotationResponse)
def create_quotation(
    data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    quo = BillingService.create_quotation(db, data, user_id=current_user.id)
    items = [
        QuotationItemResponse(
            id=i.id,
            product_id=i.product_id,
            item_name=i.item_name,
            packaging_unit=i.packaging_unit,
            quantity=i.quantity,
            unit_price=i.unit_price,
            discount_rate=i.discount_rate,
            tax_rate=i.tax_rate,
            tax_amount=i.tax_amount,
            line_total=i.line_total
        ) for i in quo.items
    ]
    return QuotationResponse(
        id=quo.id,
        quotation_number=quo.quotation_number,
        customer_id=quo.customer_id,
        customer_name=quo.customer.business_name if quo.customer else None,
        customer_phone=quo.customer.phone if quo.customer else None,
        status=quo.status,
        quotation_date=quo.quotation_date,
        valid_until=quo.valid_until,
        subtotal=quo.subtotal,
        discount_amount=quo.discount_amount,
        taxable_amount=quo.taxable_amount,
        tax_amount=quo.tax_amount,
        total_amount=quo.total_amount,
        terms_and_conditions=quo.terms_and_conditions,
        notes=quo.notes,
        created_at=quo.created_at,
        items=items
    )

@router.post("/{quotation_id}/convert-to-invoice", response_model=InvoiceResponse)
def convert_to_invoice(
    quotation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.convert_quotation_to_invoice(db, quotation_id, user_id=current_user.id)
    return BillingService.get_invoice_by_id(db, inv.id)
