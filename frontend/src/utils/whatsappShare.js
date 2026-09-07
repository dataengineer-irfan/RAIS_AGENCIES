import { openWhatsApp } from './mobileHelpers';

export const shareInvoiceOnWhatsApp = ({
  invoice,
  customer,
  items = [],
  products = []
}) => {
  const invNumber = invoice?.invoice_number || 'DRAFT';
  const invDate = invoice?.invoice_date || new Date().toISOString().split('T')[0];
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

  let lines = (items || []).map((itm, idx) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.item_description || itm.product_name || `Item ${idx + 1}`;
    const qty = itm.quantity || 1;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const rate = parseFloat(itm.unit_price || 0).toFixed(2);
    const lineTotal = (qty * parseFloat(itm.unit_price || 0)).toFixed(2);
    return `• ${name} (${unit}) x ${qty} @ ₹${rate} = *₹${lineTotal}*`;
  }).join('\n');

  if (!lines) {
    lines = '• Wholesale products & supplies';
  }

  let dueSection = '';
  if (overallDue !== null && overallDue > 0) {
    dueSection = `⚠️ *Overall Total Due Balance:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  } else if (invOutstanding > 0) {
    dueSection = `⚠️ *Balance Due on this Bill:* *₹${invOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  }

  // Official Tax Invoice PDF Receipt Link
  const baseUrl = (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http'))
    ? window.location.origin
    : 'https://rais-backend.onrender.com';
  
  let pdfUrl = '';
  let pdfSection = '';
  if (invoice?.id) {
    pdfUrl = `${baseUrl}/api/invoices/${invoice.id}/print-html`;
    pdfSection = `📄 *Official Tax Invoice Receipt (PDF):*\n${pdfUrl}\n\n`;
  }

  const message = 
`🧾 *RAIS AGENCIES — INVOICE*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice:* #${invNumber}
📅 *Date:* ${invDate}
🏪 *Billed To:* *${custName}*
${custPhone ? `📞 *Phone:* ${custPhone}\n` : ''}━━━━━━━━━━━━━━━━━━━━
*Itemized Bill:*
${lines}

━━━━━━━━━━━━━━━━━━━━
💵 *Bill Amount:* *₹${totalAmtFormatted}*
${dueSection}💳 *Payment Terms:* ${terms}
📲 *Pay via UPI:* 9347453135@ybl

${pdfSection}📍 _RAIS AGENCIES — Frozen Foods & Packaging_
📍 _Near Reddies Colony, Rayachoty - 516269_
📞 _Hotline: 9347453135 | 9573261696_
🙏 _Thank you for your business!_`;

  openWhatsAppMessage(custPhone, message, pdfUrl);
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
    return `• ${name} (${unit}) x ${qty}`;
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
📦 _Your booking is confirmed and being dispatched!_`;

  openWhatsAppMessage(custPhone, message);
};

const openWhatsAppMessage = async (phone, text, url = null) => {
  // If native navigator.share is available on mobile touch devices
  if (typeof navigator !== 'undefined' && navigator.share && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '')) {
    try {
      await navigator.share({
        title: 'RAIS Agencies Invoice Receipt',
        text: text,
        url: url || undefined
      });
      return;
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Native share failed, falling back to WhatsApp direct link', e);
      } else {
        return; // User cancelled share dialog
      }
    }
  }
  openWhatsApp(phone, text);
};
