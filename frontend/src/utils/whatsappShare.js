import { openWhatsApp } from './mobileHelpers.js';
import { 
  generateInvoiceFile, 
  downloadInvoiceImage, 
  formatInvoiceDateTime,
  formatCustomerDisplayName 
} from './invoiceImageGenerator.js';
import { generatePaymentFile, downloadPaymentImage } from './paymentImageGenerator.js';

export { formatCustomerDisplayName };

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

export const PUBLIC_CATALOGUE_URL = 'https://rais-frontend.onrender.com/catalogue.html';
export const PUBLIC_PRODUCTS_URL = 'https://rais-frontend.onrender.com/#/products';
export const PUBLIC_WA_ORDER_URL = 'https://wa.me/919347453135';

export const getCleanBillUrl = (id, type = 'invoice') => {
  if (!id) return '';
  const typeParam = type !== 'invoice' ? `&type=${encodeURIComponent(type)}` : '';
  return `https://rais-frontend.onrender.com/bill.html?id=${encodeURIComponent(id)}${typeParam}`;
};

export const getCompactQuickLinks = (billUrl, billLabel = 'Download Bill') => {
  const downloadLine = billUrl ? `📥 *${billLabel}:* ${billUrl}\n` : '';
  return `━━━━━━━━━━━━━━━━━━━━
${downloadLine}📖 *Photo Catalogue:* ${PUBLIC_CATALOGUE_URL}
📲 *1-Tap Order Desk:* ${PUBLIC_WA_ORDER_URL}
❄️ _RAIS AGENCIES Rayachoty • 9347453135_`;
};

export const QUICK_LINKS_WHATSAPP_SECTION = getCompactQuickLinks('', 'Download Bill');

/**
 * Intelligent helper to deduce an in-stock restock recommendation (Zero Prices).
 * Strictly filters by current_stock > 0 and excludes products already on the bill.
 */
export const deriveRestockSuggestion = (items = [], products = [], explicitSuggestion = null) => {
  if (explicitSuggestion) return explicitSuggestion;
  if (!products || !products.length) return null;

  const currentProductIds = new Set((items || []).map(i => i.product_id));

  // Detect affinity from current items
  const itemTexts = (items || []).map(i => {
    const p = products.find(x => x.id === i.product_id);
    return `${p?.name || ''} ${i.item_description || ''}`.toUpperCase();
  }).join(' ');

  const isPizza = /PIZZA|MOZEROLLA|MOZZARELLA|BASE\s*9|BASE\s*8/i.test(itemTexts);
  const isBurger = /BURGER|PATTY|BUN/i.test(itemTexts);
  const isSnack = /FRIES|MOMO|NUGGET|POPCORN|POPS/i.test(itemTexts);

  // Filter products with current_stock > 0 and not on current bill
  const available = products.filter(p => {
    const stock = parseFloat(p.current_stock || 0);
    return stock > 0 && !currentProductIds.has(p.id) && p.is_active !== false;
  });

  if (!available.length) return null;

  let candidate = null;
  let contextNote = 'In Stock at Depot';

  if (isPizza) {
    candidate = available.find(p => /PIZZA BOX/i.test(p.name)) || available.find(p => /OREGANO/i.test(p.name));
    if (candidate) contextNote = 'In Stock for your Pizzas';
  }

  if (!candidate && isBurger) {
    candidate = available.find(p => /BURGER BOX/i.test(p.name)) || available.find(p => /MAYO/i.test(p.name));
    if (candidate) contextNote = 'In Stock for your Burgers';
  }

  if (!candidate && isSnack) {
    candidate = available.find(p => /PERI PERI/i.test(p.name)) || available.find(p => /KETCHUP/i.test(p.name));
    if (candidate) contextNote = 'In Stock for your Kitchen';
  }

  if (!candidate) {
    candidate = available.find(p => /BOX/i.test(p.name) || (p.category && p.category.code === 'PACKAGING'));
    if (candidate) contextNote = 'In Stock at Packaging Depot';
  }

  if (!candidate) {
    candidate = available[0];
  }

  if (!candidate) return null;

  const unit = candidate.packaging_unit || 'PACKET';
  return {
    name: candidate.name,
    packaging_unit: unit,
    context_note: contextNote,
    display_text: `📦 *${contextNote}:* ${candidate.name} (${unit})`
  };
};

export const shareInvoiceOnWhatsApp = async ({
  invoice,
  customer,
  items = [],
  products = [],
  restockSuggestion = null,
  showRestock = true,
  mode = 'direct'
}) => {
  const invNumber = invoice?.invoice_number || 'DRAFT';
  const bName = customer?.business_name || invoice?.customer_name || 'Customer';
  const cPerson = customer?.contact_person || invoice?.customer_contact;
  const custName = formatCustomerDisplayName(bName, cPerson);
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

  // Date + Short Time format (e.g., "29 Oct 2026 • 03:55 PM")
  const { fullText: invoiceDateTimeStr } = formatInvoiceDateTime(invoice?.invoice_date, invoice?.created_at);

  // Mobile-Optimized Compact Item Lines (capped at 5 to avoid 'Read more')
  const totalItemsCount = (items || []).length;
  const maxDisplayItems = 5;
  const displayedItems = (items || []).slice(0, maxDisplayItems);

  let itemLines = displayedItems.map((itm) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.item_description || itm.product_name || 'Item';
    const rawQty = parseFloat(itm.quantity || 1);
    const qty = Number.isInteger(rawQty) ? rawQty : rawQty.toFixed(2);
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const lineTotal = (rawQty * parseFloat(itm.unit_price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    return `▫️ ${name} (${unit}) × ${qty} = ₹${lineTotal}`;
  }).join('\n');

  if (totalItemsCount > maxDisplayItems) {
    const remaining = totalItemsCount - maxDisplayItems;
    itemLines += `\n▫️ _...and ${remaining} more item${remaining > 1 ? 's' : ''} (see full bill)_`;
  }

  if (!itemLines) {
    itemLines = '▫️ Wholesale frozen food supplies';
  }

  let dueSection = '';
  if (overallDue !== null && overallDue > 0) {
    dueSection = `⚠️ *Total Due Balance:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  } else if (invOutstanding > 0 && invOutstanding !== billAmt) {
    dueSection = `⚠️ *Balance Due on Bill:* *₹${invOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
  }

  const billIdentifier = invoice?.invoice_number || invoice?.id || '';
  const cleanBillUrl = getCleanBillUrl(billIdentifier, 'invoice');

  // Derive in-stock restock suggestion (strictly NO PRICES)
  let restockSection = '';
  if (showRestock) {
    const finalSuggestion = deriveRestockSuggestion(items, products, restockSuggestion);
    if (finalSuggestion && finalSuggestion.display_text) {
      restockSection = `\n${finalSuggestion.display_text}\n`;
    }
  }

  const message = 
`🧾 *TAX INVOICE — RAIS AGENCIES*
📄 *Bill #${invNumber}* • ${invoiceDateTimeStr}
🏪 *Customer:* *${custName}*
━━━━━━━━━━━━━━━━━━━━
📦 *Items (${totalItemsCount}):*
${itemLines}
━━━━━━━━━━━━━━━━━━━━
💰 *Bill Total:* *₹${totalAmtFormatted}*
${dueSection}${restockSection}
📲 *Pay via UPI:* \`9347453135@ybl\` (RAIS AGENCIES)
GPay / PhonePe: 9347453135
${getCompactQuickLinks(cleanBillUrl, 'Download Bill')}`;

  const cleanPhone = (custPhone || '').toString().replace(/[^0-9]/g, '');
  const hasDirectCustomer = cleanPhone.length >= 10;

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

    // MODE 1: EXPLICIT FILE SHARE (User tapped "Share Image Card")
    if (mode === 'file') {
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
          if (shareErr.name === 'AbortError') return;
          console.warn('Native file share cancelled or failed, falling back to direct link:', shareErr);
        }
      }

      // If file share not supported or failed on desktop, download image card
      if (invoiceFile) {
        try {
          await downloadInvoiceImage({
            invoice,
            customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone },
            items,
            products
          });
        } catch (dlErr) {
          console.warn('Image auto-download failed:', dlErr);
        }
      }
      openWhatsApp(custPhone, message);
      return;
    }

    // MODE 2: DIRECT CUSTOMER CHAT (Default 1-tap WhatsApp delivery)
    if (hasDirectCustomer) {
      // Auto-cache image card in background so it's in the device gallery ready to drop in if needed
      if (invoiceFile) {
        try {
          await downloadInvoiceImage({
            invoice,
            customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone },
            items,
            products
          });
        } catch (dlErr) {
          // non-blocking
        }
      }
      // Instantly open direct chat with customer
      openWhatsApp(custPhone, message);
      return;
    }

    // MODE 3: Fallback when customer has NO registered phone number
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
        if (shareErr.name === 'AbortError') return;
      }
    }

    if (invoiceFile) {
      try {
        await downloadInvoiceImage({
          invoice,
          customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone },
          items,
          products
        });
      } catch (dlErr) {
        console.warn('Image auto-download failed:', dlErr);
      }
    }
    openWhatsApp(custPhone, message);
  } catch (err) {
    console.error('Invoice share pipeline error:', err);
    openWhatsApp(custPhone, message);
  }
};

/**
 * Dedicated helper to share high-resolution invoice image card file
 * via the native OS share sheet (WhatsApp, Drive, Email, etc.)
 */
export const shareInvoiceImageFile = async (params) => {
  return shareInvoiceOnWhatsApp({ ...params, mode: 'file' });
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
  const custName = formatCustomerDisplayName(bName, cPerson);
  const custPhone = customer?.phone || order?.customer_phone || '';
  const deliveryDate = order?.expected_delivery_date || 'Same-Day / Next Morning';
  const totalAmt = parseFloat(order?.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const totalItemsCount = (items || []).length;
  const maxDisplayItems = 5;
  const displayedItems = (items || []).slice(0, maxDisplayItems);

  let lines = displayedItems.map((itm) => {
    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.product_name || 'Item';
    const qty = itm.quantity || 1;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    return `▫️ ${name} (${unit}) × ${qty}`;
  }).join('\n');

  if (totalItemsCount > maxDisplayItems) {
    const remaining = totalItemsCount - maxDisplayItems;
    lines += `\n▫️ _...and ${remaining} more item${remaining > 1 ? 's' : ''}_`;
  }

  if (!lines) {
    lines = '▫️ Wholesale products ordered';
  }

  const ordIdentifier = order?.order_number || order?.id || '';
  const cleanOrderUrl = getCleanBillUrl(ordIdentifier, 'order');

  const message = 
`✅ *ORDER BOOKED — RAIS AGENCIES*
📦 *Order #${ordNumber}* • ${ordDate}
🏪 *Outlet:* *${custName}*
━━━━━━━━━━━━━━━━━━━━
*Booked Items (${totalItemsCount}):*
${lines}
━━━━━━━━━━━━━━━━━━━━
🚚 *Delivery:* ${deliveryDate}
💰 *Est. Total:* *₹${totalAmt}*
${getCompactQuickLinks(cleanOrderUrl, 'Download Order Slip')}`;

  openWhatsApp(custPhone, message);
};

export const sharePaymentOnWhatsApp = async ({
  payment,
  customer,
  restockSuggestion = null,
  showRestock = true,
  mode = 'direct'
}) => {
  const pNumber = payment?.payment_number || 'RECEIPT';
  const bName = customer?.business_name || payment?.customer_name || 'Valued Customer';
  const cPerson = customer?.contact_person || payment?.customer_contact;
  const custName = formatCustomerDisplayName(bName, cPerson);
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
      return `▫️ Bill #${invNum} ➔ Settled ₹${allocAmt}`;
    }).join('\n');
    allocSection = `📄 *Settled Invoices:*\n${lines}\n`;
  }

  // Unallocated advance note
  let advanceNote = '';
  const unallocAmt = parseFloat(payment?.unallocated_amount || 0);
  if (unallocAmt > 0) {
    advanceNote = `ℹ️ *Advance / On-Account Credit:* ₹${unallocAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
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
      ledgerSection = `⚠️ *Remaining Ledger Due:* *₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n`;
    } else {
      ledgerSection = `✅ *Current Ledger Status:* *All Dues Cleared (₹0.00)*\n`;
    }
  }

  // Optional in-stock restock note for next order (strictly NO PRICES)
  let restockSection = '';
  if (showRestock && restockSuggestion && restockSuggestion.display_text) {
    restockSection = `${restockSuggestion.display_text}\n`;
  }

  const payIdentifier = payment?.payment_number || payment?.id || '';
  const cleanPayUrl = getCleanBillUrl(payIdentifier, 'payment');

  const message =
`🟢 *PAYMENT RECEIPT — RAIS AGENCIES*
🧾 *Receipt #${pNumber}* • ${paymentDateTimeStr}
🏪 *Customer:* *${custName}*
━━━━━━━━━━━━━━━━━━━━
💰 *Amount Received:* *₹${payAmtFormatted}*
💳 *Payment Mode:* ${method} (${refStr})
${allocSection}${advanceNote}━━━━━━━━━━━━━━━━━━━━
${ledgerSection}${restockSection}${getCompactQuickLinks(cleanPayUrl, 'Download Voucher')}`;

  const cleanPhone = (custPhone || '').toString().replace(/[^0-9]/g, '');
  const hasDirectCustomer = cleanPhone.length >= 10;

  try {
    let paymentFile = null;
    try {
      paymentFile = await generatePaymentFile({
        payment,
        customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone }
      });
    } catch (imgErr) {
      console.warn('Payment canvas image generation skipped/failed:', imgErr);
    }

    // MODE 1: EXPLICIT FILE SHARE (User tapped "Share Image Card")
    if (mode === 'file') {
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
          if (shareErr.name === 'AbortError') return;
          console.warn('Native payment share cancelled or failed, falling back to direct link:', shareErr);
        }
      }

      if (paymentFile) {
        try {
          await downloadPaymentImage({
            payment,
            customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone }
          });
        } catch (dlErr) {
          console.warn('Payment image auto-download failed:', dlErr);
        }
      }
      openWhatsApp(custPhone, message);
      return;
    }

    // MODE 2: DIRECT CUSTOMER CHAT (Default 1-tap WhatsApp delivery)
    if (hasDirectCustomer) {
      if (paymentFile) {
        try {
          await downloadPaymentImage({
            payment,
            customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone }
          });
        } catch (dlErr) {
          // non-blocking
        }
      }
      openWhatsApp(custPhone, message);
      return;
    }

    // MODE 3: Fallback when customer has NO registered phone number
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
        if (shareErr.name === 'AbortError') return;
      }
    }

    if (paymentFile) {
      try {
        await downloadPaymentImage({
          payment,
          customer: { ...(customer || {}), business_name: bName, contact_person: cPerson, phone: custPhone }
        });
      } catch (dlErr) {
        console.warn('Payment image auto-download failed:', dlErr);
      }
    }
    openWhatsApp(custPhone, message);
  } catch (err) {
    console.error('Payment share pipeline error:', err);
    openWhatsApp(custPhone, message);
  }
};

/**
 * Dedicated helper to share high-resolution payment settlement image card
 * via native OS share sheet (WhatsApp, Drive, Email, etc.)
 */
export const sharePaymentImageFile = async (params) => {
  return sharePaymentOnWhatsApp({ ...params, mode: 'file' });
};

export const shareCustomerStatementOnWhatsApp = ({
  customer,
  ledger = []
}) => {
  const bName = customer?.business_name || customer?.name || 'Valued Customer';
  const cPerson = customer?.contact_person;
  const custName = formatCustomerDisplayName(bName, cPerson);
  const custPhone = customer?.phone || '';
  const bal = parseFloat(customer?.outstanding_balance || 0);
  const balFormatted = bal.toLocaleString('en-IN', { minimumFractionDigits: 2 });

  let recentTxns = '';
  if (ledger && ledger.length > 0) {
    const last3 = ledger.slice(-3).reverse();
    const rows = last3.map(e => {
      const dStr = e.date ? String(e.date).split('T')[0] : '';
      const amt = e.debit > 0 ? `+₹${parseFloat(e.debit).toLocaleString('en-IN')}` : `-₹${parseFloat(e.credit).toLocaleString('en-IN')}`;
      return `▫️ ${dStr} • ${e.type} #${e.reference || '-'} (${amt})`;
    }).join('\n');
    recentTxns = `📋 *Recent Ledger Activity:*\n${rows}\n`;
  }

  let statusLine = '';
  if (bal > 0) {
    statusLine = `⚠️ *Remaining Ledger Due:* *₹${balFormatted}*`;
  } else {
    statusLine = `✅ *Current Ledger Status:* *All Dues Cleared (₹0.00)*`;
  }

  const cleanStmtUrl = getCleanBillUrl(customer?.id || '', 'statement');

  const message =
`📊 *CUSTOMER ACCOUNT STATEMENT — RAIS AGENCIES*
🏪 *Customer:* *${custName}*
━━━━━━━━━━━━━━━━━━━━
${statusLine}
${recentTxns}━━━━━━━━━━━━━━━━━━━━
📲 *Pay via UPI:* \`9347453135@ybl\` (RAIS AGENCIES)
${getCompactQuickLinks(cleanStmtUrl, 'Download Statement')}`;

  openWhatsApp(custPhone, message);
};

