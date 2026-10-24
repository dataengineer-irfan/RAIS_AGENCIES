from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.config import settings
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

@router.get("/reorder-alerts")
def get_inactive_reorder_alerts(
    days_threshold: int = Query(5, ge=1, le=90, description="Inactivity threshold in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_authenticated)
):
    return CustomerService.get_inactive_reorder_alerts(db, days_threshold=days_threshold)

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

@router.get("/{customer_id}/statement/print-html", response_class=HTMLResponse)
def get_printable_statement(
    customer_id: str,
    db: Session = Depends(get_db)
):
    cust = CustomerService.get_customer_by_id(db, customer_id)
    ledger = CustomerService.get_customer_ledger(db, customer_id)
    total_invoiced, total_paid, outstanding_balance = CustomerService.get_customer_balances(db, customer_id)

    today_str = date.today().strftime("%d-%b-%Y")
    
    contact_str = ""
    if cust.contact_person and cust.contact_person.strip().lower() != cust.business_name.strip().lower():
        contact_str = f'<p class="text-xs font-semibold text-gray-700 mt-0.5">Contact: <strong class="text-gray-900">{cust.contact_person}</strong></p>'

    rows_html = ""
    if ledger:
        for idx, entry in enumerate(ledger, 1):
            date_str = entry.date.strftime("%d-%b-%Y") if hasattr(entry.date, "strftime") else str(entry.date)
            badge_color = "bg-blue-100 text-blue-800" if entry.type == "INVOICE" else ("bg-emerald-100 text-emerald-800" if entry.type == "PAYMENT" else "bg-gray-100 text-gray-800")
            debit_str = f"₹{entry.debit:,.2f}" if entry.debit > 0 else "-"
            credit_str = f"₹{entry.credit:,.2f}" if entry.credit > 0 else "-"
            rows_html += f"""
            <tr class="border-b border-gray-200 text-xs">
                <td class="py-2 text-center text-gray-600">{idx}</td>
                <td class="py-2 font-mono">{date_str}</td>
                <td class="py-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase {badge_color}">{entry.type}</span></td>
                <td class="py-2 font-mono font-bold text-gray-900">{entry.reference or '-'}</td>
                <td class="py-2 text-gray-700">{entry.description or '-'}</td>
                <td class="py-2 text-right font-mono font-medium text-rose-700">{debit_str}</td>
                <td class="py-2 text-right font-mono font-medium text-emerald-700">{credit_str}</td>
                <td class="py-2 text-right font-mono font-bold text-gray-900">₹{entry.running_balance:,.2f}</td>
            </tr>
            """
    else:
        rows_html = """
        <tr class="border-b border-gray-200 text-xs">
            <td colspan="8" class="py-4 text-center text-gray-500 italic">No ledger transactions recorded yet.</td>
        </tr>
        """

    due_card = ""
    if outstanding_balance > 0:
        due_card = f"""
        <div class="p-4 bg-rose-50 border border-rose-200 rounded-lg text-right">
            <span class="text-xs font-bold uppercase tracking-wider text-rose-800 block">Total Balance Due</span>
            <span class="text-2xl font-black font-mono text-rose-700">₹{outstanding_balance:,.2f}</span>
        </div>
        """
    else:
        due_card = f"""
        <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-right">
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-800 block">Ledger Status</span>
            <span class="text-xl font-black font-mono text-emerald-700">All Dues Cleared (₹0.00)</span>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Account Statement - {cust.business_name} - RAIS Agencies</title>
        <meta property="og:title" content="RAIS AGENCIES — Account Statement for {cust.business_name}">
        <meta property="og:description" content="Total Balance Due: ₹{outstanding_balance:,.2f} • Date: {today_str}">
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
                    <span class="inline-block px-3 py-1 bg-gray-900 text-white font-bold text-xs uppercase tracking-widest rounded mb-2">CUSTOMER ACCOUNT STATEMENT</span>
                    <h2 class="text-lg font-bold font-mono text-gray-900">{cust.customer_code}</h2>
                    <p class="text-xs text-gray-500 mt-1">Statement Date: <span class="font-medium text-gray-800">{today_str}</span></p>
                </div>
            </div>

            <!-- Customer Details & Summary Banner -->
            <div class="grid grid-cols-12 gap-6 my-6 p-4 bg-gray-50 rounded border border-gray-200 text-xs">
                <div class="col-span-7">
                    <h3 class="font-bold text-gray-500 uppercase tracking-wider mb-1">Customer / Outlet Profile:</h3>
                    <p class="text-base font-bold text-gray-900">{cust.business_name}</p>
                    {contact_str}
                    <p class="text-gray-600 mt-0.5">{cust.address_line1}, {cust.city} - {cust.pincode}</p>
                    <p class="text-gray-600 mt-0.5">Phone: <span class="font-medium text-gray-800">{cust.phone}</span></p>
                    <p class="text-gray-500 mt-1">Credit Limit: <span class="font-mono font-bold text-gray-800">₹{cust.credit_limit:,.2f}</span></p>
                </div>
                <div class="col-span-5 flex flex-col justify-between">
                    <div class="space-y-1 font-mono text-right text-xs">
                        <div class="text-gray-600">Total Billed: <span class="font-bold text-gray-900">₹{total_invoiced:,.2f}</span></div>
                        <div class="text-gray-600">Total Payments: <span class="font-bold text-emerald-700">₹{total_paid:,.2f}</span></div>
                    </div>
                    {due_card}
                </div>
            </div>

            <!-- Ledger Transactions Table -->
            <div class="my-6">
                <h4 class="font-bold text-gray-700 text-xs uppercase tracking-wider mb-2">Account Transaction History:</h4>
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b-2 border-gray-300 text-[11px] font-bold text-gray-600 uppercase">
                            <th class="py-2 text-center w-8">#</th>
                            <th class="py-2">Date</th>
                            <th class="py-2">Type</th>
                            <th class="py-2">Reference</th>
                            <th class="py-2">Particulars</th>
                            <th class="py-2 text-right">Billed (Debit)</th>
                            <th class="py-2 text-right">Paid (Credit)</th>
                            <th class="py-2 text-right">Balance (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                    <tfoot>
                        <tr class="border-t-2 border-gray-300 font-bold text-xs">
                            <td colspan="5" class="py-2.5 text-right text-gray-700">Closing Ledger Balance:</td>
                            <td class="py-2.5 text-right font-mono text-rose-700">₹{total_invoiced:,.2f}</td>
                            <td class="py-2.5 text-right font-mono text-emerald-700">₹{total_paid:,.2f}</td>
                            <td class="py-2.5 text-right font-mono text-base font-black {'text-rose-700' if outstanding_balance > 0 else 'text-emerald-700'}">₹{outstanding_balance:,.2f}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- UPI Settlement Box -->
            <div class="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-start">
                <div>
                    <h5 class="font-bold text-gray-800 uppercase tracking-wider mb-0.5">RAIS Agencies Settlement Desk:</h5>
                    <p>UPI ID: <span class="font-mono font-bold text-gray-900">9347453135@ybl</span> (RAIS Agencies)</p>
                    <p class="mt-0.5">Direct Line: <span class="font-bold">9347453135 / 9573261696</span></p>
                    <p class="mt-2 italic text-gray-500">Thank you for your valued wholesale partnership!</p>
                </div>
            </div>

            <!-- Signatures -->
            <div class="flex justify-between items-end mt-12 pt-8 text-xs text-gray-500 border-t border-gray-200">
                <div>
                    <p class="font-bold text-gray-700">Customer Stamp / Signature</p>
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

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator_or_admin)
):
    return CustomerService.delete_customer(db, customer_id, user_id=current_user.id)

