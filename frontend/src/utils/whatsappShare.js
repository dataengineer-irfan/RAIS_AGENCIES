import { openWhatsApp } from './mobileHelpers.js';
import { generateInvoiceFile, downloadInvoiceImage, formatInvoiceDateTime } from './invoiceImageGenerator.js';
import { generatePaymentFile, downloadPaymentImage } from './paymentImageGenerator.js';

/**
 * Always returns the public production Render URL for PDF receipts.
 * Strictly avoids localhost/capacitor URLs so customers can open receipts anywhere.
 */
import { API_BASE_URL } from '../services/api.js';

const PROD_RENDER_HOST = 'https://rais-backend.onrender.com/api';

/**
 * Returns a guaranteed absolute, public HTTPS backend URL for WhatsApp messages.
 * Prevents broken relative (/api) or localhost URLs on customer devices.
 */
export const getPublicApiBaseUrl = () => {
  if (
    typeof API_BASE_URL === 'string' &&
    API_BASE_URL.startsWith('http') &&
    !API_BASE_URL.includes('localhost') &&
    !API_BASE_URL.includes('127.0.0.1')
  ) {
    return API_BASE_URL.replace(/\/$/, '');
  }
  return PROD_RENDER_HOST;
};

/**
 * Returns the active API URL for PDF receipts.
 */
export const getPublicInvoicePdfUrl = (invoiceId) => {
  if (!invoiceId) return '';
  return `${getPublicApiBaseUrl()}/invoices/${invoiceId}/print-html`;
};

export const getPublicPaymentPdfUrl = (paymentId) => {
  if (!paymentId) return '';
  return `${getPublicApiBaseUrl()}/payments/${paymentId}/print-html`;
};

export const getPublicOrderPdfUrl = (orderId) => {
  if (!orderId) return '';
  return `${getPublicApiBaseUrl()}/orders/${orderId}/print-html`;
};

export const getPublicCustomerStatementPdfUrl = (customerId) => {
  if (!customerId) return '';
  return `${getPublicApiBaseUrl()}/customers/${customerId}/statement/print-html`;
};

export const PUBLIC_CATALOGUE_URL = 'https://dataengineer-irfan.github.io/RAIS-AGENCIES/catalogue.html';
export const PUBLIC_PRODUCTS_URL = 'https://dataengineer-irfan.github.io/RAIS-AGENCIES/#/products';
export const PUBLIC_WA_ORDER_URL = 'https://wa.me/919347453135';

export const QUICK_LINKS_WHATSAPP_SECTION = 
`📖 *Photo Catalogue:*
👉 ${PUBLIC_CATALOGUE_URL}

🌐 *Website & Products:*
👉 ${PUBLIC_PRODUCTS_URL}

📲 *WhatsApp Order Desk:*
👉 ${PUBLIC_WA_ORDER_URL}

`;

export const shareInvoiceOnWhatsApp = async ({
  invoice,
  customer,
  items = [],
  products = []
}) => {
  const invNumber = invoice?.invoice_number || 'DRAFT';
  const bName = customer?.business_name || invoice?.customer_name || 'Customer';
  const cPerson = customer?.contact_person || invoice?.customer_contact;
  const custName = cPerson && cPerson.trim().toLowerCase() !== bName.trim().toLowerCase() ? `${bName} (${cPerson.trim()})` : bName;
  const custPhone = customer?.phone || invoice?.customer_phone || '';
  const terms = invoice?.payment_terms || 'Cash on Delivery';
  const billAmt = parseFloat(invoice?.total_amount || 0);
  const totalAmtFormatted = billAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const invOutstanding = parseFloat(invoice?.outstanding_amount !== undefined ? invoice.outstanding_amount : invoice?.total_amount || 0);

  // Overall customer ledger due balance
  let overallDue = null;
  if (invoice?.customer_outstanding_balance !== undefined && invoice?.customer_outstanding_balance !== null) {
    overallDue = parseFloat(invoice.customer_outstanding_balance);
  } else if (customer?.outstanding_balance !== undefined && customer?.outstanding_balance !== null) {
    overallDue = parseFloat(customer.outstanding_balance);
  }

  // Date + Short Time format (e.g., "12-Sep-2026 • 11:30 AM")
  const { fullText: invoiceDateTimeStr } = formatInvoiceDateTime(invoice?.invoice_date, invoice?.created_at);

  // Mobile-Optimized Multi-Line Item Cards
  let lines = (items || []).map((itm, idx) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.item_description || itm.product_name || `Item ${idx + 1}`;
    const rawQty = parseFloat(itm.quantity || 1);
    const qty = Number.isInteger(rawQty) ? rawQty : rawQty.toFixed(2);
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const rate = parseFloat(itm.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const lineTotal = (rawQty * parseFloat(itm.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `▫️ *${idx + 1}. ${name}* (${unit})\n   ${qty} × ₹${rate} = *₹${lineTotal}*`;
  }).join('\n\n');

  if (!lines) {
    lines = '• Wholesale frozen food products & supplies';
  }

  let dueSection = '';
  if (overallDue !== null && overallDue > 0) {
    dueSection = `⚠️ *Overall Total Due Balance:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  } else if (invOutstanding > 0 && invOutstanding !== billAmt) {
    dueSection = `⚠️ *Balance Due on this Bill:* *₹${invOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  }

  // Guaranteed Live Render URLs for Image & PDF
  let pdfSection = '';
  let imageSection = '';
  if (invoice?.id) {
    const pdfUrl = getPublicInvoicePdfUrl(invoice.id);
    const imgUrl = `${getPublicApiBaseUrl()}/invoices/${invoice.id}/image`;
    imageSection = `🖼️ *Digital Invoice Receipt (Image Card):*\n👉 ${imgUrl}\n\n`;
    pdfSection = `📄 *Official Tax Invoice Receipt (PDF):*\n👉 ${pdfUrl}\n\n`;
  }

  const message = 
`🧾 *TAX INVOICE — RAIS AGENCIES*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice #:* #${invNumber}
📅 *Date & Time:* ${invoiceDateTimeStr}
🏪 *Billed To:* *${custName}*
${custPhone ? `📞 *Phone:* ${custPhone}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📦 *ORDER SUMMARY:*
${lines}

━━━━━━━━━━━━━━━━━━━━
💵 *Bill Amount:* *₹${totalAmtFormatted}*
${dueSection}💳 *Payment Terms:* ${terms}

📲 *PAY VIA UPI:*
• UPI ID: \`9347453135@ybl\`
• Payee: *RAIS AGENCIES*
• GPay / PhonePe: *9347453135*

${imageSection}${pdfSection}${QUICK_LINKS_WHATSAPP_SECTION}📍 _RAIS AGENCIES — Rayachoty Cold-Chain Depot_
📞 _Order Desk: 9347453135 | 9573261696_
❄️ _Frozen Food Is Our Specialty (-18°C)_
🙏 _Thank you for your valued partnership!_`;

  // Try generating the invoice image card and sharing it natively with image attached
  try {
    let invoiceFile = null;
    try {
      invoiceFile = await generateInvoiceFile({
        invoice,
        customer: customer || { business_name: custName, phone: custPhone },
        items,
        products
      });
    } catch (imgErr) {
      console.warn('Canvas image generation skipped/failed:', imgErr);
    }

    // 1. Mobile Web Share API with image file
    if (
      invoiceFile &&
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [invoiceFile] })
    ) {
      try {
        await navigator.share({
          title: `RAIS Invoice #${invNumber}`,
          text: message,
          files: [invoiceFile]
        });
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return; // User cancelled share sheet
        }
        console.warn('Native file share failed, falling back to download & direct link:', shareErr);
      }
    }

    // 2. If file sharing is not supported (e.g. desktop web or older Android webview):
    // Auto-save the invoice image to downloads/gallery so user has it ready
    if (invoiceFile) {
      try {
        await downloadInvoiceImage({
          invoice,
          customer: customer || { business_name: custName, phone: custPhone },
          items,
          products
        });
      } catch (dlErr) {
        console.warn('Image auto-download failed:', dlErr);
      }
    }

    // 3. Launch WhatsApp with message & Render PDF link
    openWhatsApp(custPhone, message);
  } catch (err) {
    console.error('Invoice share pipeline error:', err);
    openWhatsApp(custPhone, message);
  }
};

export const shareOrderOnWhatsApp = ({
  order,
  customer,
  items = [],
  products = []
}) => {
  const ordNumber = order?.order_number || 'ORD-NEW';
  const ordDate = order?.order_date || new Date().toISOString().split('T')[0];
  const bName = customer?.business_name || order?.customer_name || 'Customer';
  const cPerson = customer?.contact_person || order?.customer_contact;
  const custName = cPerson && cPerson.trim().toLowerCase() !== bName.trim().toLowerCase() ? `${bName} (${cPerson.trim()})` : bName;
  const custPhone = customer?.phone || order?.customer_phone || '';
  const deliveryDate = order?.expected_delivery_date || 'Same-Day / Next Morning';
  const totalAmt = parseFloat(order?.total_amount || 0).toFixed(2);

  let lines = (items || []).map((itm, idx) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.product_name || `Item ${idx + 1}`;
    const qty = itm.quantity || 1;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    return `${idx + 1}️⃣ *${name}* (${unit}) × ${qty}`;
  }).join('\n');

  if (!lines) {
    lines = '• Wholesale products ordered';
  }

  let pdfSection = '';
  if (order?.id) {
    const pdfUrl = getPublicOrderPdfUrl(order.id);
    pdfSection = `📄 *Official Order Slip (Print/PDF):*\n👉 ${pdfUrl}\n\n`;
  }

  const message = 
`✅ *ORDER CONFIRMED — RAIS AGENCIES*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${ordNumber}
📅 *Date:* ${ordDate}
🏪 *Outlet:* *${custName}*
${custPhone ? `📞 *Contact:* ${custPhone}\n` : ''}━━━━━━━━━━━━━━━━━━━━
*Items Booked:*
${lines}

━━━━━━━━━━━━━━━━━━━━
🚚 *Delivery:* ${deliveryDate}
${parseFloat(totalAmt) > 0 ? `💰 *Est. Total:* *₹${totalAmt}*\n\n` : '\n'}${pdfSection}${QUICK_LINKS_WHATSAPP_SECTION}📍 _RAIS AGENCIES — Rayachoty Depot_
📞 _Hotline: 9347453135 | 9573261696_
❄️ _Cold-chain dispatch scheduled!_`;

  openWhatsApp(custPhone, message);
};

export const sharePaymentOnWhatsApp = async ({
  payment,
  customer
}) => {
  const pNumber = payment?.payment_number || 'RECEIPT';
  const bName = customer?.business_name || payment?.customer_name || 'Valued Customer';
  const cPerson = customer?.contact_person || payment?.customer_contact;
  const custName = cPerson && cPerson.trim().toLowerCase() !== bName.trim().toLowerCase() ? `${bName} (${cPerson.trim()})` : bName;
  const custPhone = customer?.phone || payment?.customer_phone || '';
  const payAmt = parseFloat(payment?.amount || 0);
  const payAmtFormatted = payAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const method = (payment?.payment_method || 'CASH').toUpperCase();
  const fallbackRef = method === 'CASH' ? 'Direct Cash Settlement' : method === 'UPI' ? 'UPI Transfer' : 'Direct Bank Settlement';
  const refStr = payment?.reference_number || fallbackRef;

  // Format payment date & time
  const { fullText: paymentDateTimeStr } = formatInvoiceDateTime(payment?.payment_date, payment?.created_at);

  // Allocations breakdown
  let allocSection = '';
  if (payment?.allocations && payment.allocations.length > 0) {
    const lines = payment.allocations.map((a, idx) => {
      const invNum = a.invoice_number || `INV-${a.invoice_id?.slice(0, 6) || idx + 1}`;
      const allocAmt = parseFloat(a.allocated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      return `▫️ *Bill #${invNum}* ➔ Settled *₹${allocAmt}*`;
    }).join('\n');
    allocSection = `\n📄 *ALLOCATED INVOICES:*\n${lines}\n`;
  }

  // Unallocated advance note
  let advanceNote = '';
  const unallocAmt = parseFloat(payment?.unallocated_amount || 0);
  if (unallocAmt > 0) {
    advanceNote = `ℹ️ *Advance / On-Account Balance:* ₹${unallocAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  }

  // Outstanding ledger balance
  let ledgerSection = '';
  let overallDue = null;
  if (payment?.customer_outstanding_balance !== undefined && payment?.customer_outstanding_balance !== null) {
    overallDue = parseFloat(payment.customer_outstanding_balance);
  } else if (customer?.outstanding_balance !== undefined && customer?.outstanding_balance !== null) {
    overallDue = parseFloat(customer.outstanding_balance);
  }

  if (overallDue !== null) {
    if (overallDue > 0) {
      ledgerSection = `⚠️ *Current Remaining Ledger Due:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
    } else {
      ledgerSection = `✅ *Current Ledger Status:* *All Dues Fully Cleared (₹0.00)*\n`;
    }
  }

  // Guaranteed Live Render URLs for Image & PDF
  let pdfSection = '';
  let imageSection = '';
  if (payment?.id) {
    const pdfUrl = getPublicPaymentPdfUrl(payment.id);
    const imgUrl = `${getPublicApiBaseUrl()}/payments/${payment.id}/image`;
    imageSection = `🖼️ *Digital Settlement Receipt (Image Card):*\n👉 ${imgUrl}\n\n`;
    pdfSection = `📄 *Official Payment Voucher (Print/PDF):*\n👉 ${pdfUrl}\n\n`;
  }

  const message =
`🟢 *PAYMENT SETTLEMENT RECEIPT — RAIS AGENCIES*
━━━━━━━━━━━━━━━━━━━━
🧾 *Receipt #:* #${pNumber}
📅 *Date & Time:* ${paymentDateTimeStr}
🏪 *Received From:* *${custName}*
${custPhone ? `📞 *Phone:* ${custPhone}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *Amount Paid:* *₹${payAmtFormatted}*
💳 *Payment Mode:* *${method}*
🔖 *Ref / UTR:* ${refStr}
${allocSection}${advanceNote}
━━━━━━━━━━━━━━━━━━━━
${ledgerSection}
${imageSection}${pdfSection}${QUICK_LINKS_WHATSAPP_SECTION}📍 _RAIS AGENCIES — Rayachoty Cold-Chain Depot_
📞 _Accounts Desk: 9347453135 | 9573261696_
❄️ _Quality Frozen Foods & Reliable Service_
🙏 _Thank you for your timely settlement!_`;

  // Try generating the payment image card and sharing it natively with image attached
  try {
    let paymentFile = null;
    try {
      paymentFile = await generatePaymentFile({
        payment,
        customer: customer || { business_name: custName, phone: custPhone }
      });
    } catch (imgErr) {
      console.warn('Payment canvas image generation skipped/failed:', imgErr);
    }

    // 1. Mobile Web Share API with image file
    if (
      paymentFile &&
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [paymentFile] })
    ) {
      try {
        await navigator.share({
          title: `RAIS Payment Receipt #${pNumber}`,
          text: message,
          files: [paymentFile]
        });
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return; // User cancelled share sheet
        }
        console.warn('Native payment share failed, falling back to download & direct link:', shareErr);
      }
    }

    // 2. If file sharing is not supported (e.g. desktop web or older Android webview):
    // Auto-save the payment image to downloads/gallery so user has it ready
    if (paymentFile) {
      try {
        await downloadPaymentImage({
          payment,
          customer: customer || { business_name: custName, phone: custPhone }
        });
      } catch (dlErr) {
        console.warn('Payment image auto-download failed:', dlErr);
      }
    }

    // 3. Launch WhatsApp with message & Render PDF link
    openWhatsApp(custPhone, message);
  } catch (err) {
    console.error('Payment share pipeline error:', err);
    openWhatsApp(custPhone, message);
  }
};

export const shareCustomerStatementOnWhatsApp = ({
  customer,
  ledger = []
}) => {
  const bName = customer?.business_name || customer?.name || 'Valued Customer';
  const cPerson = customer?.contact_person;
  const custName = cPerson && cPerson.trim().toLowerCase() !== bName.trim().toLowerCase() ? `${bName} (${cPerson.trim()})` : bName;
  const custPhone = customer?.phone || '';
  const bal = parseFloat(customer?.outstanding_balance || 0);
  const balFormatted = bal.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  // Recent transactions summary (last 3 entries)
  let recentTxns = '';
  if (ledger && ledger.length > 0) {
    const last3 = ledger.slice(-3).reverse();
    const rows = last3.map(e => {
      const dStr = e.date ? String(e.date).split('T')[0] : '';
      const amt = e.debit > 0 ? `+₹${parseFloat(e.debit).toLocaleString('en-IN')}` : `-₹${parseFloat(e.credit).toLocaleString('en-IN')}`;
      return `▫️ ${dStr} • ${e.type} #${e.reference || '-'} (${amt})`;
    }).join('\n');
    recentTxns = `\n📋 *RECENT LEDGER ACTIVITY:*\n${rows}\n`;
  }

  // Digital statement link
  let pdfSection = '';
  if (customer?.id) {
    const pdfUrl = getPublicCustomerStatementPdfUrl(customer.id);
    pdfSection = `📄 *Official Account Statement (Print/PDF):*\n👉 ${pdfUrl}\n\n`;
  }

  let statusLine = '';
  if (bal > 0) {
    statusLine = `⚠️ *Current Ledger Balance Due:* *₹${balFormatted}*`;
  } else {
    statusLine = `✅ *Current Ledger Status:* *All Dues Fully Settled (₹0.00)*`;
  }

  const message =
`📊 *CUSTOMER ACCOUNT STATEMENT — RAIS AGENCIES*
━━━━━━━━━━━━━━━━━━━━
🏪 *Account:* *${custName}*
${custPhone ? `📞 *Phone:* ${custPhone}\n` : ''}━━━━━━━━━━━━━━━━━━━━
${statusLine}
${recentTxns}
━━━━━━━━━━━━━━━━━━━━
${pdfSection}${QUICK_LINKS_WHATSAPP_SECTION}📲 *DIRECT UPI SETTLEMENT:*
• UPI ID: \`9347453135@ybl\`
• Payee: *RAIS AGENCIES*

📍 _RAIS AGENCIES — Rayachoty Depot_
📞 _Accounts Desk: 9347453135 | 9573261696_
❄️ _Thank you for your business partnership!_`;

  openWhatsApp(custPhone, message);
};

