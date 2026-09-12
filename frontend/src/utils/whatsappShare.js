import { openWhatsApp } from './mobileHelpers.js';
import { generateInvoiceFile, downloadInvoiceImage, formatInvoiceDateTime } from './invoiceImageGenerator.js';

/**
 * Always returns the public production Render URL for PDF receipts.
 * Strictly avoids localhost/capacitor URLs so customers can open receipts anywhere.
 */
export const getPublicInvoicePdfUrl = (invoiceId) => {
  if (!invoiceId) return '';
  let prodHost = 'https://rais-backend.onrender.com';
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const customApi = (env.VITE_PUBLIC_API_URL || env.VITE_API_URL || '').trim();
  if (customApi && !customApi.includes('localhost') && !customApi.includes('127.0.0.1')) {
    prodHost = customApi.startsWith('http') ? customApi : `https://${customApi}`;
  }
  return `${prodHost.replace(/\/$/, '')}/api/invoices/${invoiceId}/print-html`;
};

export const shareInvoiceOnWhatsApp = async ({
  invoice,
  customer,
  items = [],
  products = []
}) => {
  const invNumber = invoice?.invoice_number || 'DRAFT';
  const custName = customer?.business_name || invoice?.customer_name || 'Customer';
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
    const qty = itm.quantity || 1;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const rate = parseFloat(itm.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const lineTotal = (qty * parseFloat(itm.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `${idx + 1}️⃣ *${name}* (${unit})\n   ${qty} × ₹${rate} = *₹${lineTotal}*`;
  }).join('\n');

  if (!lines) {
    lines = '• Wholesale frozen food products & supplies';
  }

  let dueSection = '';
  if (overallDue !== null && overallDue > 0) {
    dueSection = `⚠️ *Overall Total Due Balance:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  } else if (invOutstanding > 0 && invOutstanding !== billAmt) {
    dueSection = `⚠️ *Balance Due on this Bill:* *₹${invOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  }

  // Guaranteed Live Render URL
  let pdfUrl = '';
  let pdfSection = '';
  if (invoice?.id) {
    pdfUrl = getPublicInvoicePdfUrl(invoice.id);
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

${pdfSection}📍 _RAIS AGENCIES — Rayachoty Cold-Chain Depot_
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
  const custName = customer?.business_name || order?.customer_name || 'Customer';
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
${parseFloat(totalAmt) > 0 ? `💰 *Est. Total:* *₹${totalAmt}*\n` : ''}
📍 _RAIS AGENCIES — Rayachoty Depot_
📞 _Hotline: 9347453135 | 9573261696_
❄️ _Cold-chain dispatch scheduled!_`;

  openWhatsApp(custPhone, message);
};
