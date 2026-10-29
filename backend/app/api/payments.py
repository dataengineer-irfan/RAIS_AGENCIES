import io
from PIL import Image, ImageDraw, ImageFont
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from decimal import Decimal
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate, PaymentUpdate, PaymentAllocationCreate, PaymentResponse, PaymentAllocationResponse
)
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

@router.get("/summary")
def get_payments_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    """
    Returns true global collection metrics:
    All-Time Collections, Current Month Collections, Total Vouchers Count.
    """
    return PaymentService.get_payments_summary(db)

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return PaymentService.get_payment_by_id(db, payment_id)

@router.get("/{payment_id}/print-html", response_class=HTMLResponse)
def get_printable_payment(
    payment_id: str,
    db: Session = Depends(get_db)
):
    p = PaymentService.get_payment_by_id(db, payment_id)

    # Format created_at to IST (UTC+5:30) with date & short time
    created_str = str(p.payment_date)
    if p.created_at:
        try:
            ist_time = p.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(p.payment_date)

    cust_display = p.customer_name or "Customer"
    contact_person_str = ""
    if p.customer_contact and p.customer_contact.strip() and p.customer_contact.strip().lower() != (p.customer_name or "").strip().lower() and p.customer_contact.strip().lower() not in (p.customer_name or "").lower():
        contact_person_str = f'<p class="text-xs font-semibold text-gray-700 mt-0.5">Contact Person: <strong class="text-gray-900">{p.customer_contact}</strong></p>'

    method = (p.payment_method or "CASH").upper()
    fallback_ref = "Direct Cash Settlement" if method == "CASH" else ("UPI Transfer" if method == "UPI" else "Bank Settlement")
    ref_str = p.reference_number or fallback_ref

    # Allocations Table
    alloc_rows = ""
    if p.allocations:
        for idx, a in enumerate(p.allocations, 1):
            alloc_date_str = str(p.payment_date)
            if a.allocated_at:
                try:
                    alloc_ist = a.allocated_at + timedelta(hours=5, minutes=30)
                    alloc_date_str = alloc_ist.strftime("%d-%b-%Y")
                except Exception:
                    alloc_date_str = str(p.payment_date)
            alloc_rows += f"""
            <tr class="border-b border-gray-200 text-sm">
                <td class="py-2.5 text-center text-gray-600">{idx}</td>
                <td class="py-2.5 font-bold font-mono text-gray-900">{a.invoice_number or a.invoice_id}</td>
                <td class="py-2.5 text-center text-gray-600">{alloc_date_str}</td>
                <td class="py-2.5 text-right font-bold font-mono text-emerald-700">₹{a.allocated_amount:,.2f}</td>
            </tr>
            """
    else:
        alloc_rows = """
        <tr class="border-b border-gray-200 text-sm">
            <td colspan="4" class="py-4 text-center text-gray-500 italic">Direct settlement on customer ledger account.</td>
        </tr>
        """

    # Outstanding balance card
    balance_card = ""
    if p.customer_outstanding_balance is not None:
        bal = float(p.customer_outstanding_balance)
        if bal > 0:
            balance_card = f"""
            <div class="mt-4 p-3 bg-rose-50 border border-rose-200 rounded flex justify-between items-center text-sm">
                <span class="font-bold text-rose-900">Remaining Ledger Balance Due:</span>
                <span class="font-mono font-black text-rose-700 text-base">₹{bal:,.2f}</span>
            </div>
            """
        else:
            balance_card = f"""
            <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded flex justify-between items-center text-sm">
                <span class="font-bold text-emerald-900">Current Ledger Status:</span>
                <span class="font-bold text-emerald-700">All Dues Fully Settled (₹0.00)</span>
            </div>
            """

    notes_section = ""
    if p.notes:
        notes_section = f"""
        <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
            <span class="font-bold text-gray-900">Notes / Remarks:</span> {p.notes}
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Payment Receipt {p.payment_number} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Payment Settlement Receipt #{p.payment_number}">
        <meta property="og:description" content="Received From: {cust_display} • Amount: ₹{p.amount:,.2f} • Date: {created_str}">
        <meta property="og:image" content="https://rais-backend.onrender.com/api/payments/{p.id}/image">
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
        <div class="no-print max-w-3xl mx-auto mb-4 flex justify-between items-center">
            <a href="javascript:window.close()" class="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Close</a>
            <button onclick="window.print()" class="px-5 py-2 bg-emerald-600 text-white font-semibold rounded text-sm shadow hover:bg-emerald-700">Print / Save as PDF</button>
        </div>

        <div class="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md border border-gray-200">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-emerald-600 rounded flex items-center justify-center font-black text-2xl text-white">R</div>
                        <div>
                            <h1 class="text-2xl font-black tracking-wide text-gray-900">{settings.COMPANY_NAME}</h1>
                            <p class="text-xs font-semibold uppercase tracking-widest text-emerald-700">{settings.COMPANY_TAGLINE}</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 mt-2">{settings.COMPANY_ADDRESS}</p>
                    <p class="text-xs text-gray-600 font-semibold">Phone: {settings.COMPANY_PHONE_PRIMARY} | {settings.COMPANY_PHONE_SECONDARY}</p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 bg-emerald-800 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">OFFICIAL PAYMENT RECEIPT</span>
                    <h2 class="text-xl font-bold font-mono text-gray-900">{p.payment_number}</h2>
                    <p class="text-xs text-gray-500 mt-1">Date & Time: <span class="font-medium text-gray-800">{created_str}</span></p>
                    <span class="inline-block mt-2 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {method} SETTLED
                    </span>
                </div>
            </div>

            <!-- Customer Details & Reference -->
            <div class="grid grid-cols-2 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div>
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Received From (Customer):</h3>
                    <p class="text-base font-bold text-gray-900">{p.customer_name or 'Valued Customer'}</p>
                    {contact_person_str}
                    <p class="text-gray-600 mt-0.5">{p.customer_address or 'Rayachoty Market'}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{p.customer_phone or '-'}</span></p>
                </div>
                <div class="text-right flex flex-col justify-center">
                    <p class="text-gray-500">Customer Code: <span class="font-mono font-bold text-gray-800">{p.customer_code or '-'}</span></p>
                    <p class="text-gray-500 mt-1">Payment Method: <span class="font-bold text-gray-800">{method}</span></p>
                    <p class="text-gray-500 mt-1">Ref / UTR: <span class="font-mono font-bold text-gray-800">{ref_str}</span></p>
                </div>
            </div>

            <!-- Amount Highlight Banner -->
            <div class="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-lg p-5 mb-6 flex justify-between items-center">
                <div>
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Amount Received</span>
                    <span class="text-3xl font-black font-mono text-emerald-700">₹{p.amount:,.2f}</span>
                </div>
                <div class="text-right text-xs">
                    <span class="text-gray-500 block">Settlement Status:</span>
                    <span class="font-bold text-emerald-800 text-sm">₹{p.allocated_amount:,.2f} Allocated</span>
                    {f'<span class="text-amber-700 block text-[11px] font-medium mt-0.5">(₹{p.unallocated_amount:,.2f} unallocated advance)</span>' if p.unallocated_amount > 0 else ''}
                </div>
            </div>

            <!-- Allocations Table -->
            <div class="my-6">
                <h4 class="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Invoice Settlement Breakdown:</h4>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-300 text-xs font-bold text-gray-600 uppercase">
                            <th class="py-2 text-center w-10">#</th>
                            <th class="py-2">Invoice Number</th>
                            <th class="py-2 text-center">Settlement Date</th>
                            <th class="py-2 text-right">Allocated Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alloc_rows}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-gray-300 font-bold text-sm">
                            <td colspan="3" class="py-2.5 text-right text-gray-700">Total Allocated:</td>
                            <td class="py-2.5 text-right font-mono text-emerald-700">₹{p.allocated_amount:,.2f}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {balance_card}
            {notes_section}

            <!-- Bottom Support & Bank Settlement -->
            <div class="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-gray-800 uppercase tracking-wider mb-0.5">RAIS Agencies Settlement Desk:</h5>
                    <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                    <p class="mt-0.5">Direct Line: <span class="font-bold">9347453135 / 9573261696</span></p>
                    <p class="mt-2 italic text-gray-500">Thank you for your timely settlement! Quality frozen food products delivered fresh.</p>
                </div>
            </div>

            <!-- Direct Quick Links (Bold Green Badges) -->
            <div class="mt-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 print:hidden flex flex-wrap items-center justify-between gap-3">
                <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    ⚡ Quick Online Links:
                </span>
                <div class="flex flex-wrap items-center gap-2">
                    <a href="https://wa.me/919347453135" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>🟢 WhatsApp Order Desk</span>
                    </a>
                    <a href="https://rais-frontend.onrender.com/catalogue.html" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>📖 Photo Catalogue</span>
                    </a>
                    <a href="https://rais-frontend.onrender.com/#/products" target="_blank" rel="noopener noreferrer" 
                       class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors">
                        <span>🌐 Website & Products</span>
                    </a>
                </div>
            </div>

            <!-- Printed Links (For paper print / PDF rendering) -->
            <div class="hidden print:block mt-4 pt-2 border-t border-gray-200 text-[10px] text-gray-600">
                <p><strong>🟢 WhatsApp Order Desk:</strong> wa.me/919347453135 &nbsp;•&nbsp; <strong>📖 Photo Catalogue:</strong> rais-frontend.onrender.com/catalogue.html &nbsp;•&nbsp; <strong>🌐 Website:</strong> rais-frontend.onrender.com</p>
            </div>

            <!-- Footer Signatures -->
            <div class="flex justify-between items-end mt-10 pt-6 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Customer Acknowledgment</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-gray-900">For RAIS AGENCIES</p>
                    <div class="h-10"></div>
                    <p class="text-gray-600">Authorized Accounts Signatory</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/{payment_id}/image")
def get_payment_image(
    payment_id: str,
    db: Session = Depends(get_db)
):
    p = PaymentService.get_payment_by_id(db, payment_id)

    # Format date & short time in IST
    created_str = str(p.payment_date)
    if p.created_at:
        try:
            ist_time = p.created_at + timedelta(hours=5, minutes=30)
            created_str = ist_time.strftime("%d-%b-%Y, %I:%M %p")
        except Exception:
            created_str = str(p.payment_date)

    allocations = list(p.allocations) if p.allocations else []
    alloc_count = len(allocations) if allocations else 1

    # Dynamic sizing based on allocation rows
    width = 800
    row_height = 34
    height = 620 + (alloc_count * row_height)

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
    f_large_amt = load_font(22, bold=True)
    f_small = load_font(10)

    # 1. Header Banner (Deep Navy + Emerald Accent)
    draw.rectangle([(0, 0), (width, 130)], fill=(15, 23, 42))
    draw.rectangle([(0, 126), (width, 130)], fill=(16, 185, 129))

    draw.text((30, 18), settings.COMPANY_NAME, fill=(16, 185, 129), font=f_title)
    draw.text((30, 50), settings.COMPANY_TAGLINE, fill=(148, 163, 184), font=f_sub)
    draw.text((30, 72), f"{settings.COMPANY_ADDRESS} • Accounts: {settings.COMPANY_PHONE_PRIMARY}", fill=(203, 213, 225), font=f_small)
    draw.text((30, 90), f"Depot Desk: {settings.COMPANY_PHONE_SECONDARY} • Timely Settlements Acknowledged", fill=(203, 213, 225), font=f_small)

    # Payment Meta Box (Header Right)
    draw.rectangle([(width - 250, 16), (width - 30, 115)], fill=(30, 41, 59), outline=(51, 65, 85))
    draw.text((width - 235, 24), "SETTLEMENT RECEIPT", fill=(248, 250, 252), font=f_bold)
    draw.text((width - 235, 44), f"#{p.payment_number}", fill=(16, 185, 129), font=f_mono)
    draw.text((width - 235, 64), f"Date: {created_str}", fill=(148, 163, 184), font=f_small)
    draw.text((width - 235, 86), "STATUS: CONFIRMED", fill=(16, 185, 129), font=f_bold)

    # 2. Customer Info Card
    draw.rectangle([(30, 145), (width - 30, 225)], fill=(248, 250, 252), outline=(226, 232, 240))
    draw.text((45, 155), "RECEIVED FROM (CUSTOMER ACCOUNT):", fill=(100, 116, 139), font=f_small)
    cust_display = p.customer_name or "Valued Customer"
    draw.text((45, 172), cust_display, fill=(15, 23, 42), font=f_bold)
    contact_info = f"Phone: {p.customer_phone or '-'}  •  Code: {p.customer_code or '-'}  •  Contact: {p.customer_contact or '-'}"
    draw.text((45, 194), contact_info, fill=(71, 85, 105), font=f_regular)

    # 3. Hero Amount & Method Banner
    cur_y = 238
    draw.rectangle([(30, cur_y), (width - 30, cur_y + 60)], fill=(236, 253, 245), outline=(167, 243, 208))
    draw.text((45, cur_y + 10), "AMOUNT RECEIVED:", fill=(4, 120, 87), font=f_bold)
    draw.text((45, cur_y + 28), f"₹{p.amount:,.2f}", fill=(6, 95, 70), font=f_large_amt)

    method = (p.payment_method or "CASH").upper()
    fallback_ref = "Direct Cash Settlement" if method == "CASH" else ("UPI Transfer" if method == "UPI" else "Direct Bank Settlement")
    ref_str = p.reference_number or fallback_ref

    draw.text((450, cur_y + 12), f"Payment Mode: {method}", fill=(15, 23, 42), font=f_bold)
    draw.text((450, cur_y + 32), f"Ref / UTR: {ref_str}", fill=(71, 85, 105), font=f_regular)

    # 4. Allocations Table
    tbl_y = cur_y + 75
    draw.rectangle([(30, tbl_y), (width - 30, tbl_y + 30)], fill=(15, 23, 42))
    draw.text((42, tbl_y + 8), "#", fill=(248, 250, 252), font=f_bold)
    draw.text((80, tbl_y + 8), "ALLOCATED INVOICE #", fill=(248, 250, 252), font=f_bold)
    draw.text((430, tbl_y + 8), "ALLOCATED DATE", fill=(248, 250, 252), font=f_bold)
    draw.text((650, tbl_y + 8), "SETTLED AMOUNT (₹)", fill=(248, 250, 252), font=f_bold)

    cur_y = tbl_y + 30
    if allocations:
        for idx, a in enumerate(allocations, 1):
            bg = (255, 255, 255) if idx % 2 == 1 else (248, 250, 252)
            draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=bg)
            draw.line([(30, cur_y + row_height), (width - 30, cur_y + row_height)], fill=(241, 245, 249))

            draw.text((42, cur_y + 9), str(idx), fill=(100, 116, 139), font=f_regular)
            inv_num = a.invoice_number or a.invoice_id or f"Invoice {idx}"
            draw.text((80, cur_y + 9), f"Bill #{inv_num}", fill=(30, 41, 59), font=f_bold)

            alloc_date_str = str(p.payment_date)
            if a.allocated_at:
                try:
                    alloc_ist = a.allocated_at + timedelta(hours=5, minutes=30)
                    alloc_date_str = alloc_ist.strftime("%d-%b-%Y")
                except Exception:
                    pass
            draw.text((430, cur_y + 9), alloc_date_str, fill=(100, 116, 139), font=f_regular)
            draw.text((650, cur_y + 9), f"₹{a.allocated_amount:,.2f}", fill=(4, 120, 87), font=f_bold)
            cur_y += row_height
    else:
        draw.rectangle([(30, cur_y), (width - 30, cur_y + row_height)], fill=(255, 255, 255))
        draw.text((80, cur_y + 9), "Direct credit settlement on customer account ledger.", fill=(71, 85, 105), font=f_regular)
        cur_y += row_height

    # 5. Ledger Status Box & Unallocated Note
    cur_y += 15
    if p.unallocated_amount and float(p.unallocated_amount) > 0:
        draw.rectangle([(30, cur_y), (width - 30, cur_y + 32)], fill=(254, 243, 199), outline=(253, 230, 138))
        draw.text((45, cur_y + 8), f"Advance / On-Account Credit Retained: ₹{float(p.unallocated_amount):,.2f}", fill=(180, 83, 9), font=f_bold)
        cur_y += 42

    bal = float(p.customer_outstanding_balance) if p.customer_outstanding_balance is not None else None
    if bal is not None:
        if bal > 0:
            draw.rectangle([(30, cur_y), (width - 30, cur_y + 40)], fill=(255, 241, 242), outline=(254, 205, 211))
            draw.text((45, cur_y + 12), "CURRENT REMAINING LEDGER DUE:", fill=(159, 18, 57), font=f_bold)
            draw.text((620, cur_y + 12), f"₹{bal:,.2f}", fill=(190, 18, 60), font=f_mono)
        else:
            draw.rectangle([(30, cur_y), (width - 30, cur_y + 40)], fill=(236, 253, 245), outline=(167, 243, 208))
            draw.text((45, cur_y + 12), "CURRENT LEDGER STATUS: ALL DUES FULLY CLEARED (₹0.00)", fill=(4, 120, 87), font=f_bold)
        cur_y += 50

    # 5b. Direct Quick Links Banner (Bold Emerald Card)
    draw.rectangle([(30, cur_y), (width - 30, cur_y + 48)], fill=(236, 253, 245), outline=(167, 243, 208))
    draw.text((45, cur_y + 8), "🟢 WhatsApp Orders: 9347453135 (wa.me/919347453135)", fill=(4, 120, 87), font=f_bold)
    draw.text((430, cur_y + 8), "🌐 Online Store: Live Products & Pricing", fill=(6, 95, 70), font=f_bold)
    draw.text((45, cur_y + 26), "📖 Photo Catalogue: 66+ Frozen SKUs Available (Tap links in message to open)", fill=(4, 120, 87), font=f_bold)
    cur_y += 58

    # 6. Footer
    draw.line([(0, cur_y), (width, cur_y)], fill=(226, 232, 240))
    draw.text((30, cur_y + 8), "Official Computer Generated Settlement Receipt • RAIS AGENCIES Rayachoty (-18°C Cold-Chain Depot)", fill=(100, 116, 139), font=f_small)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return Response(content=buf.getvalue(), media_type="image/png")

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

@router.post("/reconcile-fifo")
def reconcile_payments_fifo(
    customer_id: Optional[str] = Query(None, description="Optional customer ID to reconcile specifically"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    from app.services.reconciliation_service import ReconciliationService
    if customer_id:
        return ReconciliationService.reconcile_customer_fifo(db, customer_id)
    return ReconciliationService.reconcile_all_fifo(db)

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

@router.put("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: str,
    data: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return PaymentService.update_payment(
        db=db,
        payment_id=payment_id,
        data=data,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )

@router.delete("/{payment_id}")
def delete_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return PaymentService.delete_payment(
        db=db,
        payment_id=payment_id,
        user_id=current_user.id,
        username=current_user.username,
        user_role=current_user.role
    )
