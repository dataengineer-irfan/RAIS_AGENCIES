import io
from datetime import date, datetime, timedelta
from PIL import Image, ImageDraw, ImageFont
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse,
    InvoiceStatusUpdate
)
from app.services.billing_service import BillingService
from app.api.deps import get_current_user, require_operator_or_admin, require_any_authenticated, require_admin
from app.core.config import settings

router = APIRouter(prefix="/invoices", tags=["Invoices / Billing"])

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return BillingService.list_invoices(
        db=db,
        customer_id=customer_id,
        status=status,
        search=search,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return BillingService.get_invoice_by_id(db, invoice_id)

@router.post("", response_model=InvoiceResponse)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.create_invoice(
        db=db,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
def issue_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.issue_invoice(db, invoice_id, user_id=current_user.id)
    return BillingService.get_invoice_by_id(db, inv.id)

@router.post("/{invoice_id}/status", response_model=InvoiceResponse)
def update_invoice_status(
    invoice_id: str,
    data: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    inv = BillingService.cancel_or_void_invoice(
        db=db,
        invoice_id=invoice_id,
        target_status=data.status,
        reason=data.reason,
        user_id=current_user.id
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    """
    Edit a generated invoice: change customer, dates, line items, quantities.
    Stock is automatically reconciled (restored for removed/reduced items, 
    deducted for added/increased items).
    Guard: Cannot edit if payments are already allocated.
    """
    inv = BillingService.update_invoice(
        db=db,
        invoice_id=invoice_id,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
    return BillingService.get_invoice_by_id(db, inv.id)

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return BillingService.delete_invoice(
        db=db,
        invoice_id=invoice_id,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )

@router.get("/{invoice_id}/print-html", response_class=HTMLResponse)
def get_printable_invoice(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice_by_id(db, invoice_id)
    
    # Format created_at to IST (UTC+5:30) with date & short time
    created_str = str(inv.invoice_date)
    if inv.created_at:
        try:
            ist_time = inv.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(inv.invoice_date)

    # Render rich HTML invoice template for direct print / PDF generation
    items_rows = ""
    for idx, itm in enumerate(inv.items, 1):
        items_rows += f"""
        <tr class="border-b border-gray-200 text-sm">
            <td class="py-2.5 text-center">{idx}</td>
            <td class="py-2.5 font-medium text-gray-800">{itm.item_description} <span class="text-xs text-gray-500">({itm.packaging_unit})</span></td>
            <td class="py-2.5 text-center text-gray-600">{itm.hsn_code or '-'}</td>
            <td class="py-2.5 text-center font-bold">{itm.quantity}</td>
            <td class="py-2.5 text-right font-mono">₹{itm.unit_price:.2f}</td>
            <td class="py-2.5 text-right text-gray-600">{itm.discount_rate}%</td>
            <td class="py-2.5 text-right font-bold font-mono">₹{itm.line_total:.2f}</td>
        </tr>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice {inv.invoice_number} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Tax Invoice #{inv.invoice_number}">
        <meta property="og:description" content="Billed To: {inv.customer_name} • Total: ₹{inv.total_amount:.2f} • Date: {created_str}">
        <meta property="og:image" content="https://rais-backend.onrender.com/api/invoices/{inv.id}/image">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {{
                .no-print {{ display: none !important; }}
                body {{ print-color-adjust: exact; -webkit-print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body class="bg-gray-100 p-6 font-sans text-gray-800">
        <div class="no-print max-w-4xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-blue-600 text-white font-semibold rounded text-sm shadow hover:bg-blue-700">Print / Save as PDF</button>
        </div>

        <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
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
                    <span class="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">WHOLESALE INVOICE</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{inv.invoice_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Date & Time: <span class="font-medium text-gray-800">{created_str}</span></p>
                    <p class="text-xs text-gray-500">Due Date: <span class="font-medium text-gray-800">{inv.due_date}</span></p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase {'bg-emerald-100 text-emerald-800' if inv.status == 'PAID' else 'bg-amber-100 text-amber-800' if inv.status == 'PARTIALLY_PAID' else 'bg-blue-100 text-blue-800'}">
                        {inv.status}
                    </span>
                </div>
            </div>

            <!-- Bill To -->
            <div class="grid grid-cols-2 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Billed To (Customer):</h3>
                    <p class="text-base font-bold text-gray-900">{inv.customer_name}</p>
                    <p class="text-gray-600 mt-0.5">{inv.customer_address}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{inv.customer_phone}</span></p>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{inv.customer_code}</span></p>
                    <p class="text-gray-500 mt-1">Terms: <span class="font-medium text-gray-800">{inv.payment_terms or 'Standard Wholesale'}</span></p>
                </div>
            </div>

            <!-- Items Table -->
            <table class="w-full text-left border-collapse my-6">
                <thead>
                    <tr class="border-b-2 border-gray-300 text-xs font-bold text-gray-600 uppercase">
                        <th class="py-2 text-center w-10">#</th>
                        <th class="py-2">Item Description</th>
                        <th class="py-2 text-center">HSN</th>
                        <th class="py-2 text-center">Qty</th>
                        <th class="py-2 text-right">Rate</th>
                        <th class="py-2 text-right">Disc %</th>
                        <th class="py-2 text-right">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows}
                </tbody>
            </table>

            <!-- Summary & QR -->
            <div class="grid grid-cols-12 gap-6 pt-4 border-t-2 border-gray-300">
                <div class="col-span-7 text-xs text-gray-600 flex flex-col justify-between">
                    <div>
                        <h4 class="font-bold text-gray-800 uppercase tracking-wider mb-1">Bank & UPI Settlement:</h4>
                        <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                        <p class="mt-1">For direct orders & accounts support: <span class="font-bold">9347453135 / 9573261696</span></p>
                        <p class="mt-2 italic text-gray-500">Thank you for partnering with RAIS Agencies! Quality frozen food products delivered fresh.</p>
                    </div>
                </div>

                <div class="col-span-5 text-sm space-y-1.5 font-mono">
                    <div class="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>₹{inv.subtotal:.2f}</span>
                    </div>
                    {f'<div class="flex justify-between text-emerald-600"><span>Discount:</span><span>-₹{inv.discount_amount:.2f}</span></div>' if inv.discount_amount > 0 else ''}
                    <div class="flex justify-between text-base font-bold text-gray-900 border-t border-b border-gray-400 py-1 font-sans">
                        <span>Grand Total:</span>
                        <span class="font-mono">₹{inv.total_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-xs text-emerald-700 pt-1">
                        <span>Paid to Date:</span>
                        <span>₹{inv.paid_amount:.2f}</span>
                    </div>
                    <div class="flex justify-between text-base font-black text-rose-700 bg-rose-50 p-1.5 rounded font-sans">
                        <span>Balance Due:</span>
                        <span class="font-mono">₹{inv.outstanding_amount:.2f}</span>
                    </div>
                </div>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-12 pt-8 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Customer Signature / Stamp</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-900">For RAIS AGENCIES</p>
                    <div class="h-10"></div>
                    <p class="text-gray-600">Authorized Signatory</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/{invoice_id}/image")
def get_invoice_image(
    invoice_id: str,
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice_by_id(db, invoice_id)
    
    # Format date & short time in IST
    created_str = str(inv.invoice_date)
    if inv.created_at:
        try:
            ist_time = inv.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(inv.invoice_date)

    items = list(inv.items) if inv.items else []
    item_count = len(items) if items else 1
    
    # Dynamic sizing based on item rows
    width = 800
    row_height = 34
    height = 560 + (item_count * row_height)
    
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    def load_font(size, bold=False):
        candidates = ["arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf", "calibri.ttf", "segoeui.ttf"]
        for c in candidates:
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                pass
        return ImageFont.load_default()

    f_title = load_font(24, bold=True)
    f_sub = load_font(12)
    f_bold = load_font(12, bold=True)
    f_regular = load_font(11)
    f_mono = load_font(12, bold=True)
    f_small = load_font(10)

    # 1. Header Banner (Navy + Gold Accent)
    draw.rectangle([(0, 0), (width, 130)], fill=(15, 23, 42))
    draw.rectangle([(0, 126), (width, 130)], fill=(245, 158, 11))

    draw.text((30, 18), settings.COMPANY_NAME, fill=(245, 158, 11), font=f_title)
    draw.text((30, 50), settings.COMPANY_TAGLINE, fill=(148, 163, 184), font=f_sub)
    draw.text((30, 72), f"{settings.COMPANY_ADDRESS} • Phone: {settings.COMPANY_PHONE_PRIMARY}", fill=(203, 213, 225), font=f_small)
    draw.text((30, 90), "Depot Hours: 8:00 AM - 9:30 PM (All 7 Days) • UPI: 9347453135@ybl", fill=(203, 213, 225), font=f_small)

    # Invoice Meta Box (Header Right)
    draw.rectangle([(width - 240, 16), (width - 30, 115)], fill=(30, 41, 59), outline=(51, 65, 85))
    draw.text((width - 225, 24), "TAX INVOICE", fill=(248, 250, 252), font=f_bold)
    draw.text((width - 225, 44), f"#{inv.invoice_number}", fill=(245, 158, 11), font=f_mono)
    draw.text((width - 225, 64), f"Date: {created_str}", fill=(148, 163, 184), font=f_small)
    status_color = (16, 185, 129) if inv.status == "PAID" else (245, 158, 11)
    draw.text((width - 225, 86), f"STATUS: {inv.status}", fill=status_color, font=f_bold)

    # 2. Customer Info Card
    draw.rectangle([(30, 145), (width - 30, 225)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((45, 155), "BILLED TO (CUSTOMER):", fill=(100, 116, 139), font=f_small)
    draw.text((45, 172), inv.customer_name, fill=(15, 23, 42), font=f_bold)
    draw.text((45, 194), f"Phone: {inv.customer_phone or '-'}  •  Code: {inv.customer_code or '-'}  •  Terms: {inv.payment_terms or 'Standard'}", fill=(71, 85, 105), font=f_regular)

    # 3. Items Table
    tbl_y = 240
    draw.rectangle([(30, tbl_y), (width - 30, tbl_y + 30)], fill=(15, 23, 42))
    draw.text((42, tbl_y + 8), "#", fill=(248, 250, 252), font=f_bold)
    draw.text((80, tbl_y + 8), "ITEM DESCRIPTION", fill=(248, 250, 252), font=f_bold)
    draw.text((430, tbl_y + 8), "UNIT", fill=(248, 250, 252), font=f_bold)
    draw.text((510, tbl_y + 8), "QTY", fill=(248, 250, 252), font=f_bold)
    draw.text((600, tbl_y + 8), "RATE (₹)", fill=(248, 250, 252), font=f_bold)
    draw.text((700, tbl_y + 8), "TOTAL (₹)", fill=(248, 250, 252), font=f_bold)

    cur_y = tbl_y + 30
    if items:
        for idx, itm in enumerate(items, 1):
            bg = (255, 255, 255) if idx % 2 == 1 else (248, 250, 252)
            draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=bg)
            draw.line([(30, cur_y + row_height), (width - 30, cur_y + row_height)], fill=(241, 245, 249))

            draw.text((42, cur_y + 9), str(idx), fill=(100, 116, 139), font=f_regular)
            desc = itm.item_description[:40] + ("..." if len(itm.item_description) > 40 else "")
            draw.text((80, cur_y + 9), desc, fill=(30, 41, 59), font=f_bold)
            draw.text((430, cur_y + 9), str(itm.packaging_unit or "PKT"), fill=(100, 116, 139), font=f_regular)
            draw.text((510, cur_y + 9), str(itm.quantity), fill=(15, 23, 42), font=f_bold)
            draw.text((600, cur_y + 9), f"₹{itm.unit_price:.2f}", fill=(71, 85, 105), font=f_regular)
            draw.text((700, cur_y + 9), f"₹{itm.line_total:.2f}", fill=(15, 23, 42), font=f_bold)
            cur_y += row_height
    else:
        draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=(255, 255, 255))
        draw.text((80, cur_y + 9), "Wholesale frozen foods & supplies", fill=(30, 41, 59), font=f_bold)
        draw.text((510, cur_y + 9), "1", fill=(15, 23, 42), font=f_bold)
        draw.text((700, cur_y + 9), f"₹{inv.total_amount:.2f}", fill=(15, 23, 42), font=f_bold)
        cur_y += row_height

    # 4. Summary & UPI Cards
    cur_y += 15
    # UPI Box (Left)
    draw.rectangle([(30, cur_y), (420, cur_y + 110)], fill=(240, 253, 244), outline=(187, 247, 208))
    draw.text((45, cur_y + 14), "💳 OFFICIAL UPI SETTLEMENT:", fill=(21, 128, 61), font=f_bold)
    draw.text((45, cur_y + 36), "9347453135@ybl", fill=(15, 23, 42), font=f_title)
    draw.text((45, cur_y + 70), "Payee: RAIS AGENCIES • GPay / PhonePe: 9347453135", fill=(51, 65, 85), font=f_regular)
    draw.text((45, cur_y + 88), "Share payment confirmation on WhatsApp for instant credit.", fill=(21, 128, 61), font=f_small)

    # Totals Box (Right)
    draw.rectangle([(440, cur_y), (width - 30, cur_y + 110)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((455, cur_y + 14), "Subtotal:", fill=(100, 116, 139), font=f_regular)
    draw.text((660, cur_y + 14), f"₹{inv.subtotal:.2f}", fill=(30, 41, 59), font=f_bold)

    draw.rectangle([(450, cur_y + 38), (width - 40, cur_y + 72)], fill=(15, 23, 42))
    draw.text((462, cur_y + 47), "INVOICE TOTAL:", fill=(245, 158, 11), font=f_bold)
    draw.text((650, cur_y + 47), f"₹{inv.total_amount:.2f}", fill=(255, 255, 255), font=f_mono)

    if inv.outstanding_amount > 0 and inv.outstanding_amount != inv.total_amount:
        draw.text((455, cur_y + 84), f"Balance Due: ₹{inv.outstanding_amount:.2f}", fill=(239, 68, 68), font=f_bold)

    # 5. Footer
    cur_y += 125
    draw.line([(0, cur_y), (width, cur_y)], fill=(226, 232, 240))
    draw.text((30, cur_y + 8), "Official Computer Generated Invoice • RAIS AGENCIES Rayachoty (-18°C Deep Cold-Chain Depot)", fill=(100, 116, 139), font=f_small)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return Response(content=buf.getvalue(), media_type="image/png")
