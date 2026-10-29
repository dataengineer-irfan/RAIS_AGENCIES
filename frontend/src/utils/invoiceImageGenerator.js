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

export const formatCustomerDisplayName = (businessName, contactPerson) => {
  let bName = (businessName || '').trim();
  // Deduplicate any immediate consecutive duplicate parenthesized strings like "(Foo) (Foo)"
  bName = bName.replace(/\(([^)]+)\)\s*\(\1\)/gi, '($1)').trim();
  const cPerson = (contactPerson || '').trim();
  if (!bName) return cPerson || 'Valued Customer';
  if (!cPerson) return bName;
  if (bName.toLowerCase().includes(cPerson.toLowerCase())) return bName;
  return `${bName} (${cPerson})`;
};

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
    display_text: `📦 *${contextNote.toUpperCase()}:* ${candidate.name} (${unit}) — _Ready for immediate delivery_`
  };
};

export const generateInvoiceCanvas = ({
  invoice,
  customer,
  items = [],
  products = [],
  restockSuggestion = null,
  includeRestockSuggestion = true
}) => {
  const invNumber = invoice?.invoice_number || 'INV-DRAFT';
  const bName = customer?.business_name || invoice?.customer_name || 'Valued Customer';
  const cPerson = customer?.contact_person || invoice?.customer_contact;
  const custName = formatCustomerDisplayName(bName, cPerson);
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

  // Derive restock recommendation (strictly ZERO PRICES)
  const suggestion = includeRestockSuggestion !== false
    ? deriveRestockSuggestion(processedItems, products, restockSuggestion || invoice?.restock_suggestion)
    : null;
  const restockStripHeight = suggestion ? 44 : 0;

  // Canvas Sizing
  const scale = 2; // 2x for Retina / Mobile High-DPI
  const width = 800;
  const headerHeight = 160;
  const tableHeaderHeight = 36;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + (processedItems.length * rowHeight) + 10;
  const totalsHeight = 170;
  const linksHeight = 72;
  const footerHeight = 120;
  const height = headerHeight + 110 + tableHeight + restockStripHeight + totalsHeight + linksHeight + footerHeight;

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
  ctx.fillText('❄️ FROZEN FOODS & 📦 RESTAURANT PACKAGING SOLUTIONS', 30, 72);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Reddies Colony, Sundupalli Road, Rayachoty - 516269, AP', 30, 92);
  ctx.fillText('Order Desk: +91 9347453135 | 9573261696', 30, 110);
  ctx.fillText('Email: Rais.frozenfoods@gmail.com', 30, 128);

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

  // 3b. In-Stock Restock Pill Strip on Image Card (strictly NO PRICES)
  if (suggestion) {
    curY += 10;
    const stripH = 34;
    const pillX = 30;
    const pillW = width - 60;

    ctx.fillStyle = '#fef3c7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, curY, pillW, stripH, 6);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(pillX, curY, pillW, stripH);
    }

    const ctxTag = (suggestion.context_note || 'In Stock at Depot').toUpperCase();
    const pName = suggestion.name || 'Packaging Solutions';
    const pUnit = suggestion.packaging_unit || 'PACKET';
    const labelText = `📦 ${ctxTag}: ${pName} (${pUnit})`;
    const truncatedLabel = labelText.length > 55 ? labelText.substring(0, 52) + '...' : labelText;

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(truncatedLabel, pillX + 14, curY + 21);

    // Green In Stock badge on right
    const badgeW = 140;
    const badgeH = 22;
    const badgeX = pillX + pillW - badgeW - 6;
    const badgeY = curY + 6;
    ctx.fillStyle = '#059669';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('IN STOCK AT DEPOT', badgeX + 12, badgeY + 15);

    curY += stripH;
  }

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

  // 4b. Bold Green Quick Links Banner
  curY += 152;
  const linksBoxHeight = 58;
  ctx.fillStyle = '#ecfdf5';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, width - 60, linksBoxHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, width - 60, linksBoxHeight);
  }

  // Row 1: WhatsApp Order Desk & Online Store
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🟢 WhatsApp Order Desk: 9347453135 (wa.me/919347453135)', 46, curY + 22);

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('🌐 Online Store: Live Products & Pricing', 420, curY + 22);

  // Row 2: Photo Catalogue
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('📖 Photo Catalogue: 66+ Frozen SKUs Available (Tap links in WhatsApp message to open)', 46, curY + 44);

  curY += linksBoxHeight + 12;

  // 5. Footer Notes & Signoff
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
