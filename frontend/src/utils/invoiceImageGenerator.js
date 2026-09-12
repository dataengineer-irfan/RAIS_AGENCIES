/**
 * RAIS AGENCIES — High-Resolution Canvas Invoice Image Generator
 * Generates an ultra-crisp, branded PNG invoice receipt card client-side
 * with zero external dependencies for direct WhatsApp image sharing.
 */

export const formatInvoiceDateTime = (invoiceDate, createdAt) => {
  let datePart = invoiceDate || '';
  let timePart = '';

  if (createdAt) {
    try {
      let iso = String(createdAt).trim();
      // If server returned ISO datetime without timezone (e.g. '2026-09-12T08:11:00'), force UTC interpretation
      if (!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-') && iso.length > 10) {
        iso += 'Z';
      } else if (!iso.endsWith('Z') && !iso.includes('+') && iso.includes('T')) {
        iso += 'Z';
      }
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        // Explicitly format to Indian Standard Time (IST / Asia/Kolkata)
        datePart = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
        timePart = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
      }
    } catch {
      // fallback
    }
  }

  if (!timePart && datePart) {
    try {
      const d = new Date(datePart);
      if (!isNaN(d.getTime())) {
        datePart = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
  }

  return { datePart, timePart, fullText: timePart ? `${datePart} • ${timePart}` : datePart };
};

export const generateInvoiceCanvas = ({
  invoice,
  customer,
  items = [],
  products = []
}) => {
  const invNumber = invoice?.invoice_number || 'INV-DRAFT';
  const custName = customer?.business_name || invoice?.customer_name || 'Valued Customer';
  const custPhone = customer?.phone || invoice?.customer_phone || '';
  const custAddress = customer?.address || invoice?.customer_address || '';
  const custCode = customer?.customer_code || invoice?.customer_code || '';
  const terms = invoice?.payment_terms || 'Cash on Delivery';
  const status = (invoice?.status || 'ISSUED').toUpperCase();

  const totalAmount = parseFloat(invoice?.total_amount || 0);
  const discountAmount = parseFloat(invoice?.discount_amount || 0);
  const subtotal = parseFloat(invoice?.subtotal || (totalAmount + discountAmount));
  const outstandingAmount = parseFloat(invoice?.outstanding_amount !== undefined ? invoice.outstanding_amount : totalAmount);

  let overallDue = null;
  if (invoice?.customer_outstanding_balance !== undefined && invoice?.customer_outstanding_balance !== null) {
    overallDue = parseFloat(invoice.customer_outstanding_balance);
  } else if (customer?.outstanding_balance !== undefined && customer?.outstanding_balance !== null) {
    overallDue = parseFloat(customer.outstanding_balance);
  }

  const { fullText: invoiceDateTimeStr } = formatInvoiceDateTime(invoice?.invoice_date, invoice?.created_at);

  // Normalize line items
  const processedItems = (items && items.length > 0) ? items : [
    { item_description: 'Wholesale Frozen Food & Supplies', quantity: 1, packaging_unit: 'UNIT', unit_price: totalAmount, line_total: totalAmount }
  ];

  // Canvas Sizing
  const scale = 2; // 2x for Retina / Mobile High-DPI
  const width = 800;
  const headerHeight = 160;
  const tableHeaderHeight = 36;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + (processedItems.length * rowHeight) + 10;
  const totalsHeight = 170;
  const footerHeight = 120;
  const height = headerHeight + 110 + tableHeight + totalsHeight + footerHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer Border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // 1. Header Banner (Deep Navy #0f172a with Amber/Gold Accent)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, headerHeight);

  // Gold accent bar
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, headerHeight - 4, width, 4);

  // Brand Name
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RAIS AGENCIES', 30, 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('❄️ FROZEN FOOD IS OUR SPECIALTY • -18°C COLD-CHAIN DEPOT', 30, 72);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Reddies Colony, Sundupalli Road, Rayachoty - 516269, AP', 30, 92);
  ctx.fillText('Order Desk: +91 9347453135 | 9573261696', 30, 110);
  ctx.fillText('Email: raisagencies2@gmail.com', 30, 128);

  // Right Side Header Badge
  ctx.fillStyle = '#1e293b';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(width - 240, 22, 210, 115, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  } else {
    ctx.fillRect(width - 240, 22, 210, 115);
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TAX INVOICE', width - 225, 46);

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`#${invNumber}`, width - 225, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date: ${invoiceDateTimeStr}`, width - 225, 88);

  // Status Badge
  const statusColor = status === 'PAID' ? '#10b981' : (status === 'OVERDUE' ? '#ef4444' : '#3b82f6');
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`STATUS: ${status}`, width - 225, 112);

  // 2. Customer Info Section
  let curY = headerHeight + 20;
  ctx.fillStyle = '#f8fafc';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, width - 60, 90, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, width - 60, 90);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('BILLED TO (CUSTOMER):', 46, curY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(custName, 46, curY + 44);

  ctx.fillStyle = '#475569';
  ctx.font = '400 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  let subInfo = [];
  if (custPhone) subInfo.push(`Phone: ${custPhone}`);
  if (custCode) subInfo.push(`Code: ${custCode}`);
  if (custAddress) subInfo.push(custAddress);
  ctx.fillText(subInfo.join('  •  ') || 'Wholesale Registered Outlet', 46, curY + 66);

  // Payment terms
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Terms: ${terms}`, width - 260, curY + 44);

  // 3. Line Items Table
  curY += 105;
  const colX = { sl: 30, desc: 75, unit: 450, qty: 530, rate: 630, total: 770 };

  // Table Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(30, curY, width - 60, tableHeaderHeight);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('#', colX.sl + 10, curY + 22);
  ctx.fillText('ITEM DESCRIPTION', colX.desc, curY + 22);
  ctx.fillText('UNIT', colX.unit, curY + 22);
  ctx.fillText('QTY', colX.qty, curY + 22);
  ctx.fillText('RATE (₹)', colX.rate, curY + 22);
  ctx.fillText('AMOUNT (₹)', colX.total - 40, curY + 22);

  curY += tableHeaderHeight;

  // Table Rows
  processedItems.forEach((itm, idx) => {
    const isEven = idx % 2 === 0;
    ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    ctx.fillRect(30, curY, width - 60, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, curY + rowHeight);
    ctx.lineTo(width - 30, curY + rowHeight);
    ctx.stroke();

    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.item_description || itm.product_name || `Item ${idx + 1}`;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const qty = itm.quantity || 1;
    const rate = parseFloat(itm.unit_price || 0).toFixed(2);
    const lineTot = parseFloat(itm.line_total || (qty * parseFloat(itm.unit_price || 0))).toFixed(2);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${idx + 1}`, colX.sl + 12, curY + 22);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    // Truncate long descriptions
    const descText = name.length > 45 ? name.substring(0, 42) + '...' : name;
    ctx.fillText(descText, colX.desc, curY + 22);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(unit, colX.unit, curY + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${qty}`, colX.qty, curY + 22);

    ctx.fillStyle = '#475569';
    ctx.font = '400 11px monospace';
    ctx.fillText(`₹${rate}`, colX.rate, curY + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`₹${lineTot}`, colX.total - 40, curY + 22);

    curY += rowHeight;
  });

  // 4. Financial Summary Card & UPI Card
  curY += 15;
  const summaryWidth = 320;
  const summaryX = width - 30 - summaryWidth;

  ctx.fillStyle = '#f8fafc';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(summaryX, curY, summaryWidth, 140, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
  } else {
    ctx.fillRect(summaryX, curY, summaryWidth, 140);
  }

  let sY = curY + 26;
  ctx.fillStyle = '#64748b';
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Subtotal:', summaryX + 20, sY);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 110, sY);

  if (discountAmount > 0) {
    sY += 22;
    ctx.fillStyle = '#16a34a';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Discount:', summaryX + 20, sY);
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 110, sY);
  }

  sY += 28;
  // Grand Total Banner inside summary
  ctx.fillStyle = '#0f172a';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(summaryX + 12, sY - 18, summaryWidth - 24, 34, 6);
    ctx.fill();
  } else {
    ctx.fillRect(summaryX + 12, sY - 18, summaryWidth - 24, 34);
  }

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('INVOICE TOTAL:', summaryX + 24, sY + 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + summaryWidth - 120, sY + 4);

  sY += 32;
  if (overallDue !== null && overallDue > 0) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Overall Due: ₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 20, sY + 4);
  } else if (outstandingAmount > 0 && outstandingAmount !== totalAmount) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Balance Due: ₹${outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 20, sY + 4);
  }

  // Left Side: UPI Payment Box
  const upiWidth = width - 60 - summaryWidth - 20;
  ctx.fillStyle = '#f0fdf4';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, upiWidth, 140, 8);
    ctx.fill();
    ctx.strokeStyle = '#bbf7d0';
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, upiWidth, 140);
  }

  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('💳 OFFICIAL UPI SETTLEMENT:', 46, curY + 28);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('9347453135@ybl', 46, curY + 54);

  ctx.fillStyle = '#334155';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Payee: RAIS AGENCIES', 46, curY + 76);
  ctx.fillText('GPay / PhonePe / Paytm: 9347453135', 46, curY + 94);

  ctx.fillStyle = '#15803d';
  ctx.font = 'italic 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Please share payment screenshot on WhatsApp for instant receipt credit.', 46, curY + 116);

  // 5. Footer Notes & Signoff
  curY += 155;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, curY, width, height - curY);
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(0, curY);
  ctx.lineTo(width, curY);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Thank you for partnering with RAIS AGENCIES — Rayachoty Central Cold-Chain Depot.', 30, curY + 26);
  ctx.fillText('Certified -18°C Deep-Freeze Storage • Fresh Daily Delivery Batches (11 AM & 5 PM)', 30, curY + 44);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Generated electronically on ${invoiceDateTimeStr}. No physical signature required.`, 30, curY + 68);

  return canvas;
};

export const generateInvoiceBlob = async (data) => {
  const canvas = generateInvoiceCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob generation failed'));
      },
      'image/png',
      0.95
    );
  });
};

export const generateInvoiceFile = async (data) => {
  const blob = await generateInvoiceBlob(data);
  const invNumber = data?.invoice?.invoice_number || 'INV';
  return new File([blob], `RAIS_Invoice_${invNumber}.png`, { type: 'image/png' });
};

export const downloadInvoiceImage = async (data) => {
  const blob = await generateInvoiceBlob(data);
  const invNumber = data?.invoice?.invoice_number || 'INV';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RAIS_Invoice_${invNumber}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
};
