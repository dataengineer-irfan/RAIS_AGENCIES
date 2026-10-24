from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
from app.core.database import get_db
from app.core.config import settings
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
            customer_contact=o.customer.contact_person if o.customer else None,
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
        customer_contact=order.customer.contact_person if order.customer else None,
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
        customer_contact=order.customer.contact_person if order.customer else None,
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

@router.get("/{order_id}/print-html", response_class=HTMLResponse)
def get_printable_order(
    order_id: str,
    db: Session = Depends(get_db)
):
    order = OrderService.get_order_by_id(db, order_id)
    
    # Format created_at to IST
    created_str = str(order.order_date)
    if order.created_at:
        try:
            ist_time = order.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(order.order_date)

    delivery_str = str(order.expected_delivery_date) if order.expected_delivery_date else "Same-Day Dispatch"

    cust = order.customer
    cust_name = cust.business_name if cust else "Customer"
    contact_str = ""
    if cust and cust.contact_person and cust.contact_person.strip().lower() != cust.business_name.strip().lower():
        contact_str = f'<p class="text-xs font-semibold text-gray-700 mt-0.5">Contact: <strong class="text-gray-900">{cust.contact_person}</strong></p>'
    
    cust_phone = cust.phone if cust else "-"
    cust_code = cust.customer_code if cust else "-"
    addr = order.delivery_address or (f"{cust.address_line1}, {cust.city}" if cust else "Rayachoty")

    items_rows = ""
    for idx, itm in enumerate(order.items, 1):
        items_rows += f"""
        <tr class="border-b border-gray-200 text-sm">
            <td class="py-2.5 text-center text-gray-600">{idx}</td>
            <td class="py-2.5 font-medium text-gray-900">{itm.item_name}</td>
            <td class="py-2.5 text-center text-gray-600 font-mono text-xs">{itm.packaging_unit or 'PKT'}</td>
            <td class="py-2.5 text-center font-bold">{itm.quantity}</td>
            <td class="py-2.5 text-right font-mono">₹{itm.unit_price:,.2f}</td>
            <td class="py-2.5 text-right font-bold font-mono text-gray-900">₹{itm.line_total:,.2f}</td>
        </tr>
        """

    notes_section = ""
    if order.notes:
        notes_section = f"""
        <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
            <strong>Order Instructions / Notes:</strong> {order.notes}
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Order {order.order_number} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Order Booking #{order.order_number}">
        <meta property="og:description" content="Outlet: {cust_name} • Total: ₹{order.total_amount:.2f} • Delivery: {delivery_str}">
        <meta property="og:type" content="website">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {{
                .no-print {{ display: none !important; }}
                body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body class="bg-gray-100 p-6 font-sans text-gray-800">
        <div class="no-print max-w-3xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-blue-600 text-white font-semibold rounded text-sm shadow hover:bg-blue-700">Print / Save as PDF</button>
        </div>

        <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-amber-500 rounded flex items-center justify-center font-black text-2xl text-white">R</div>
                        <div>
                            <h1 class="text-2xl font-black tracking-wide text-gray-900">{settings.COMPANY_NAME}</h1>
                            <p class="text-xs font-semibold uppercase tracking-widest text-amber-600">{settings.COMPANY_TAGLINE}</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-2">{settings.COMPANY_ADDRESS}</p>
                    <p class="text-xs text-gray-600 font-semibold">Phone: {settings.COMPANY_PHONE_PRIMARY} | {settings.COMPANY_PHONE_SECONDARY}</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">WHOLESALE ORDER BOOKING</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{order.order_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Booked: <span class="font-medium text-gray-800">{created_str}</span></p>
                    <p class="text-xs text-gray-500">Exp. Delivery: <span class="font-medium text-gray-800">{delivery_str}</span></p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase {'bg-emerald-100 text-emerald-800' if order.status == 'COMPLETED' else 'bg-blue-100 text-blue-800' if order.status == 'CONFIRMED' else 'bg-amber-100 text-amber-800'}">
                        {order.status}
                    </span>
                </div>
            </div>

            <!-- Customer & Delivery Address -->
            <div class="grid grid-cols-2 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Customer / Outlet:</h3>
                    <p class="text-base font-bold text-gray-900">{cust_name}</p>
                    {contact_str}
                    <p class="text-gray-600 mt-0.5">Delivery Point: {addr}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{cust_phone}</span></p>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{cust_code}</span></p>
                    <p class="text-gray-500 mt-1">Order Mode: <span class="font-medium text-gray-800">Depot Wholesale</span></p>
                    <p class="text-gray-500 mt-1">Cold-Chain: <span class="font-bold text-blue-700">-18°C Frozen</span></p>
                </div>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left border-collapse my-6">
                <thead>
                    <tr class="border-b-2 border-gray-300 text-xs font-bold text-gray-600 uppercase">
                        <th class="py-2 text-center w-10">#</th>
                        <th class="py-2">Item Description</th>
                        <th class="py-2 text-center">Unit</th>
                        <th class="py-2 text-center">Qty</th>
                        <th class="py-2 text-right">Rate</th>
                        <th class="py-2 text-right">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
                <tfoot>
                    <tr class="border-t-2 border-gray-300 font-bold text-sm">
                        <td colspan="5" class="py-2.5 text-right text-gray-700">Estimated Total:</td>
                        <td class="py-2.5 text-right font-mono text-gray-900 text-base">₹{order.total_amount:,.2f}</td>
                    </tr>
                </tfoot>
            </table>

            {notes_section}

            <!-- Bottom Support & Cold Chain Guarantee -->
            <div class="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-gray-800 uppercase tracking-wider mb-0.5">RAIS Agencies Order Desk:</h5>
                    <p>Hotline: <span class="font-bold">9347453135 / 9573261696</span></p>
                    <p class="mt-0.5">UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span></p>
                    <p class="mt-2 italic text-gray-500">Fresh frozen foods delivered at guaranteed cold-chain temperatures.</p>
                </div>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-12 pt-8 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Receiver's Seal & Signature</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-900">For RAIS AGENCIES</p>
                    <div class="h-10"></div>
                    <p class="text-gray-600">Authorized Dispatcher</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@router.post("/{order_id}/convert-to-invoice", response_model=InvoiceResponse)
def convert_order_to_invoice(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Converts a confirmed customer order directly into a Tax Invoice and allocates inventory."""
    return OrderService.convert_order_to_invoice(db, order_id=order_id, user_id=current_user.id)

@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: str,
    reason: Optional[str] = Query(None, description="Reason for cancelling order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """Cancels a customer order and safely restores allocated warehouse inventory."""
    order = OrderService.cancel_order(db, order_id=order_id, reason=reason, user_id=current_user.id)
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
        customer_contact=order.customer.contact_person if order.customer else None,
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
