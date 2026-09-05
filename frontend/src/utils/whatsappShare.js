/**
 * WhatsApp Direct Sharing Utilities for RAIS Agencies
 * Enables instant 1-tap sharing of Invoices and Orders to any WhatsApp contact.
 */

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
  const totalAmt = parseFloat(invoice?.total_amount || 0).toFixed(2);

  let lines = (items || []).map((itm, idx) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.product_name || `Item ${idx + 1}`;
    const qty = itm.quantity || 1;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const rate = parseFloat(itm.unit_price || 0).toFixed(2);
    const lineTotal = (qty * parseFloat(itm.unit_price || 0)).toFixed(2);
    return `• ${name} (${unit}) x ${qty} @ ₹${rate} = *₹${lineTotal}*`;
  }).join('\n');

  if (!lines) {
    lines = '• Wholesale products & supplies';
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
💰 *Grand Total:* *₹${totalAmt}*
💳 *Terms:* ${terms}

📍 _RAIS AGENCIES — Frozen Foods & Packaging_
📍 _Near Reddies Colony, Rayachoty - 516269_
📞 _Hotline: 9347453135 | 9573261696_
🙏 _Thank you for your business!_`;

  openWhatsAppMessage(custPhone, message);
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

const openWhatsAppMessage = (phone, text) => {
  const encoded = encodeURIComponent(text);
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  
  let url = `https://api.whatsapp.com/send?text=${encoded}`;
  if (cleanPhone.length >= 10) {
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
  }
  
  window.open(url, '_blank');
};
