from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse
from app.schemas.invoice import InvoiceResponse
from app.services.order_service import OrderService
from app.api.deps import require_operator_or_admin, require_any_authenticated

router = APIRouter(prefix="/orders", tags=["Orders / Bookings"])

@router.get("", response_model=List[OrderResponse])
def list_orders(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    orders = OrderService.list_orders(db, customer_id=customer_id, status=status, limit=limit)
    res = []
    for o in orders:
        items = [
            OrderItemResponse(
                id=i.id,
                product_id=i.product_id,
                item_name=i.item_name,
                packaging_unit=i.packaging_unit,
                quantity=i.quantity,
                unit_price=i.unit_price,
                line_total=i.line_total
            ) for i in o.items
        ]
        res.append(OrderResponse(
            id=o.id,
            order_number=o.order_number,
            customer_id=o.customer_id,
            customer_name=o.customer.business_name if o.customer else None,
            customer_phone=o.customer.phone if o.customer else None,
            quotation_id=o.quotation_id,
            status=o.status,
            order_date=o.order_date,
            expected_delivery_date=o.expected_delivery_date,
            subtotal=o.subtotal,
            tax_amount=o.tax_amount,
            total_amount=o.total_amount,
            delivery_address=o.delivery_address,
            notes=o.notes,
            created_at=o.created_at,
            items=items
        ))
    return res

@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    order = OrderService.create_order(db, data, user_id=current_user.id)
    items = [
        OrderItemResponse(
            id=i.id,
            product_id=i.product_id,
            item_name=i.item_name,
            packaging_unit=i.packaging_unit,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.line_total
        ) for i in order.items
    ]
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        customer_id=order.customer_id,
        customer_name=order.customer.business_name if order.customer else None,
        customer_phone=order.customer.phone if order.customer else None,
        quotation_id=order.quotation_id,
        status=order.status,
        order_date=order.order_date,
        expected_delivery_date=order.expected_delivery_date,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        delivery_address=order.delivery_address,
        notes=order.notes,
        created_at=order.created_at,
        items=items
    )

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    order = OrderService.get_order_by_id(db, order_id)
    items = [
        OrderItemResponse(
            id=i.id,
            product_id=i.product_id,
            item_name=i.item_name,
            packaging_unit=i.packaging_unit,
            quantity=i.quantity,
            unit_price=i.unit_price,
            line_total=i.line_total
        ) for i in order.items
    ]
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        customer_id=order.customer_id,
        customer_name=order.customer.business_name if order.customer else None,
        customer_phone=order.customer.phone if order.customer else None,
        quotation_id=order.quotation_id,
        status=order.status,
        order_date=order.order_date,
        expected_delivery_date=order.expected_delivery_date,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        delivery_address=order.delivery_address,
        notes=order.notes,
        created_at=order.created_at,
        items=items
    )

@router.post("/{order_id}/convert-to-invoice", response_model=InvoiceResponse)
def convert_order_to_invoice(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Converts a confirmed customer order directly into a Tax Invoice and allocates inventory."""
    return OrderService.convert_order_to_invoice(db, order_id=order_id, user_id=current_user.id)
