/**
 * RAIS AGENCIES — High-Resolution Canvas Invoice Image Generator
 * Generates an ultra-crisp, branded PNG invoice receipt card client-side
 * with zero external dependencies for direct WhatsApp image sharing.
 */

import { getProductImageUrl, preloadImage, getTeluguCompanionPhrase } from './productMediaMap.js';

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

export const deriveRestockSuggestion = (items = [], products = [], explicitSuggestion = null, customerContextText = '') => {
  if (explicitSuggestion) {
    const s = { ...explicitSuggestion };
    if (!s.image_url) s.image_url = getProductImageUrl(s);
    if (!s.telugu_note) s.telugu_note = getTeluguCompanionPhrase(s.name);
    return s;
  }

  const contextCombined = `${customerContextText || ''} ` + (items || []).map(i => {
    const p = (products || []).find(x => x?.id === i?.product_id);
    return `${p?.name || ''} ${i?.item_description || ''}`.toUpperCase();
  }).join(' ');

  const isPizza = /PIZZA|MOZEROLLA|MOZZARELLA|BASE\s*9|BASE\s*8/i.test(contextCombined);
  const isBurger = /BURGER|PATTY|BUN/i.test(contextCombined);
  const isSnack = /FRIES|MOMO|NUGGET|POPCORN|POPS|CHICKEN/i.test(contextCombined);

  if (!products || !products.length) {
    if (isPizza) {
      const pName = 'DELMONTE PIZZA PASTA SAUCE';
      const pUnit = '1 KG PACKET';
      const pCtx = 'In Stock for your Pizzas';
      return {
        sku: 'RAIS-SAU-06',
        name: pName,
        packaging_unit: pUnit,
        context_note: pCtx,
        image_url: getProductImageUrl('RAIS-SAU-06', pName),
        telugu_note: getTeluguCompanionPhrase(pName),
        display_text: `📦 *${pCtx.toUpperCase()}:* ${pName} (${pUnit}) — _Ready for immediate delivery_`
      };
    }
    if (isBurger) {
      const pName = 'BURGER BOX 4"x4" PRINTED';
      const pUnit = '100 NOS';
      const pCtx = 'In Stock for your Burgers';
      return {
        sku: 'RAIS-BOX-02',
        name: pName,
        packaging_unit: pUnit,
        context_note: pCtx,
        image_url: getProductImageUrl('RAIS-BOX-02', pName),
        telugu_note: getTeluguCompanionPhrase(pName),
        display_text: `📦 *${pCtx.toUpperCase()}:* ${pName} (${pUnit}) — _Ready for immediate delivery_`
      };
    }
    // Default fast-moving depot companion if product list isn't provided (e.g. direct receipt downloads)
    const defaultName = 'VKL PERI PERI SPRINKLER';
    const defaultUnit = '1 PACKET';
    const defaultContext = 'In Stock for your Kitchen';
    return {
      sku: 'RAIS-BRD-03',
      name: defaultName,
      packaging_unit: defaultUnit,
      context_note: defaultContext,
      image_url: getProductImageUrl('RAIS-BRD-03', defaultName),
      telugu_note: getTeluguCompanionPhrase(defaultName),
      display_text: `📦 *${defaultContext.toUpperCase()}:* ${defaultName} (${defaultUnit}) — _Ready for immediate delivery_`
    };
  }

  const currentProductIds = new Set((items || []).map(i => i.product_id));

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
  const imgUrl = getProductImageUrl(candidate);
  const teluguNote = getTeluguCompanionPhrase(candidate.name);
  return {
    id: candidate.id,
    sku: candidate.sku,
    name: candidate.name,
    packaging_unit: unit,
    context_note: contextNote,
    image_url: imgUrl,
    telugu_note: teluguNote,
    display_text: `📦 *${contextNote.toUpperCase()}:* ${candidate.name} (${unit}) — _Ready for immediate delivery_`
  };
};

export const generateInvoiceCanvas = ({
  invoice,
  customer,
  items = [],
  products = [],
  restockSuggestion = null,
  includeRestockSuggestion = true,
  preloadedSuggestionImage = null
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

  const isPaid = status === 'PAID';
  let receivedAmount = parseFloat(invoice?.received_amount ?? 0);
  let appliedToPrev = parseFloat(invoice?.applied_to_previous ?? 0);
  let paymentMethod = (invoice?.payment_method || '').toUpperCase();
  let closingBalance = (invoice?.closing_balance !== undefined && invoice?.closing_balance !== null)
    ? parseFloat(invoice.closing_balance)
    : (overallDue !== null ? overallDue : null);

  // If allocations array exists, inspect it for rich settlement data
  if (invoice?.allocations && invoice.allocations.length > 0) {
    let totalAlloc = 0;
    invoice.allocations.forEach(a => {
      totalAlloc += parseFloat(a.allocated_amount || 0);
      if (!paymentMethod && a.payment_method) paymentMethod = a.payment_method.toUpperCase();
      if (!paymentMethod && a.reference_number) {
        paymentMethod = a.reference_number.toUpperCase().includes('UPI') ? 'UPI' : 'CASH';
      }
      if (a.payment?.amount && (!receivedAmount || parseFloat(a.payment.amount) > receivedAmount)) {
        receivedAmount = parseFloat(a.payment.amount);
      }
    });
    if (receivedAmount > totalAlloc && !appliedToPrev) {
      appliedToPrev = receivedAmount - totalAlloc;
    }
    if (!receivedAmount) {
      receivedAmount = totalAlloc;
    }
  }

  if (isPaid && !receivedAmount) {
    receivedAmount = parseFloat(invoice?.paid_amount || totalAmount);
  }
  if (!paymentMethod) {
    paymentMethod = (terms.toUpperCase().includes('UPI') || (invoice?.notes || '').toUpperCase().includes('UPI')) ? 'UPI' : 'CASH';
  }

  const isSettled = isPaid || receivedAmount > 0;
  const appliedToCurrent = Math.min(totalAmount, receivedAmount > 0 ? receivedAmount : (isPaid ? totalAmount : 0));

  const { fullText: invoiceDateTimeStr } = formatInvoiceDateTime(invoice?.invoice_date, invoice?.created_at);

  // Normalize line items
  const processedItems = (items && items.length > 0) ? items : [
    { item_description: 'Wholesale Frozen Food & Supplies', quantity: 1, packaging_unit: 'UNIT', unit_price: totalAmount, line_total: totalAmount }
  ];

  // Derive restock recommendation (strictly ZERO PRICES)
  const suggestion = includeRestockSuggestion !== false
    ? deriveRestockSuggestion(processedItems, products, restockSuggestion || invoice?.restock_suggestion)
    : null;
  const restockStripHeight = suggestion ? 84 : 0;

  // Canvas Sizing
  const scale = 2; // 2x for Retina / Mobile High-DPI
  const width = 800;
  const headerHeight = 160;
  const tableHeaderHeight = 36;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + (processedItems.length * rowHeight) + 10;
  const totalsHeight = 190;
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
  const tableX = 30;
  const tableWidth = width - 60; // 740px
  const tableRightX = tableX + tableWidth - 18; // 752px (18px clean padding inside table border)

  // Table Header
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(tableX, curY, tableWidth, tableHeaderHeight);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('#', 42, curY + 22);
  ctx.fillText('ITEM DESCRIPTION', 75, curY + 22);
  ctx.fillText('UNIT', 425, curY + 22);

  ctx.textAlign = 'right';
  ctx.fillText('QTY', 535, curY + 22);
  ctx.fillText('RATE (₹)', 635, curY + 22);
  ctx.fillText('AMOUNT (₹)', tableRightX, curY + 22);
  ctx.textAlign = 'left';

  curY += tableHeaderHeight;

  // Table Rows
  processedItems.forEach((itm, idx) => {
    const isEven = idx % 2 === 0;
    ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    ctx.fillRect(tableX, curY, tableWidth, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, curY + rowHeight);
    ctx.lineTo(tableX + tableWidth, curY + rowHeight);
    ctx.stroke();

    const p = products.find(prod => prod.id === itm.product_id);
    const name = p?.name || itm.item_description || itm.product_name || `Item ${idx + 1}`;
    const unit = itm.packaging_unit || p?.packaging_unit || 'PKT';
    const qty = itm.quantity || 1;
    const rate = parseFloat(itm.unit_price || 0).toFixed(2);
    const lineTot = parseFloat(itm.line_total || (qty * parseFloat(itm.unit_price || 0))).toFixed(2);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${idx + 1}`, 42, curY + 22);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    // Truncate long descriptions
    const descText = name.length > 38 ? name.substring(0, 35) + '...' : name;
    ctx.fillText(descText, 75, curY + 22);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(unit, 425, curY + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${qty}`, 535, curY + 22);

    ctx.fillStyle = '#475569';
    ctx.font = '400 11px monospace';
    ctx.fillText(`₹${rate}`, 635, curY + 22);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`₹${lineTot}`, tableRightX, curY + 22);
    ctx.textAlign = 'left';

    curY += rowHeight;
  });

  // 3b. High-Impact Visual Companion Spotlight Card (strictly NO PRICES)
  if (suggestion) {
    curY += 12;
    const stripH = 72;
    const pillX = 30;
    const pillW = width - 60;

    // Card background: warm gradient style with gold border
    ctx.fillStyle = '#fffbeb';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, curY, pillW, stripH, 8);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillRect(pillX, curY, pillW, stripH);
    }

    // Thumbnail container: white rounded frame
    const thumbSize = 58;
    const thumbX = pillX + 7;
    const thumbY = curY + 7;

    ctx.fillStyle = '#ffffff';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbSize, thumbSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(thumbX, thumbY, thumbSize, thumbSize);
    }

    if (preloadedSuggestionImage && preloadedSuggestionImage.complete && preloadedSuggestionImage.naturalWidth > 0) {
      // Draw image inside thumbnail box maintaining aspect ratio
      const imgW = preloadedSuggestionImage.naturalWidth;
      const imgH = preloadedSuggestionImage.naturalHeight;
      const scaleFit = Math.min((thumbSize - 6) / imgW, (thumbSize - 6) / imgH);
      const drawW = imgW * scaleFit;
      const drawH = imgH * scaleFit;
      const drawX = thumbX + (thumbSize - drawW) / 2;
      const drawY = thumbY + (thumbSize - drawH) / 2;

      ctx.save();
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(thumbX + 2, thumbY + 2, thumbSize - 4, thumbSize - 4, 4);
        ctx.clip();
      }
      ctx.drawImage(preloadedSuggestionImage, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Clean fallback icon
      ctx.font = '26px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📦', thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 9);
      ctx.textAlign = 'start';
    }

    // Text content next to image
    const textX = thumbX + thumbSize + 14;
    const ctxTag = (suggestion.context_note || 'In Stock at Depot').toUpperCase();
    const pName = suggestion.name || 'Packaging Solutions';
    const pUnit = suggestion.packaging_unit || 'PACKET';
    const teNote = suggestion.telugu_note || 'రాయచోటి డిపోలో తాజా స్టాక్ సిద్ధంగా ఉంది';

    // Tag line
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`🔥 POPULAR COMPANION • ${ctxTag}`, textX, curY + 18);

    // Product title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const truncName = pName.length > 40 ? pName.substring(0, 38) + '...' : pName;
    ctx.fillText(`${truncName} (${pUnit})`, textX, curY + 37);

    // Telugu / English reassurance
    ctx.fillStyle = '#047857';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`✓ 100% In Depot Stock • ${teNote}`, textX, curY + 56);

    // Right side: In Depot Stock Green Button
    const badgeW = 145;
    const badgeH = 26;
    const badgeX = pillX + pillW - badgeW - 10;
    const badgeY = curY + 23;

    ctx.fillStyle = '#059669';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
      ctx.fill();
    } else {
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('● IN DEPOT STOCK', badgeX + 16, badgeY + 17);

    curY += stripH;
  }

  // 4. Financial Summary Card & Settlement Box
  curY += 15;
  const summaryWidth = 320;
  const summaryX = width - 30 - summaryWidth; // 450px
  const summaryRightX = summaryX + summaryWidth - 18; // 752px (18px clean padding inside summary card)
  const summaryBannerRightX = summaryX + summaryWidth - 24; // 746px (12px padding inside dark banner)
  const boxHeight = 172;

  // Left Side: Payment Settlement Receipt OR UPI Payment Box
  const upiWidth = width - 60 - summaryWidth - 20; // 400px
  const leftBoxX = 30;
  const leftBoxRightX = leftBoxX + upiWidth - 18; // 412px (18px clean right padding)
  const leftBoxTextX = leftBoxX + 18; // 48px (18px clean left padding)

  // Derive Ledger & Settlement Waterfall figures (Option 1)
  let priorBalance = 0;
  if (isSettled) {
    const finalBalance = (closingBalance !== null && closingBalance !== undefined) ? closingBalance : overallDue;
    if (finalBalance !== null && finalBalance !== undefined) {
      priorBalance = Math.max(0, finalBalance + receivedAmount - totalAmount);
    } else if (appliedToPrev > 0) {
      priorBalance = appliedToPrev;
    }
  } else {
    const effectiveDue = (overallDue !== null && overallDue !== undefined) ? overallDue : outstandingAmount;
    priorBalance = Math.max(0, effectiveDue - outstandingAmount);
  }
  const totalObligation = totalAmount + priorBalance;

  // Right Box: Financial Summary Card (Option 1 Unified Waterfall)
  ctx.fillStyle = '#f8fafc';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(summaryX, curY, summaryWidth, boxHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.fillRect(summaryX, curY, summaryWidth, boxHeight);
  }

  let sY = curY + 20;
  ctx.fillStyle = '#64748b';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Subtotal:', summaryX + 18, sY);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 11.5px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
  ctx.textAlign = 'left';

  if (discountAmount > 0) {
    sY += 15;
    ctx.fillStyle = '#16a34a';
    ctx.font = '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Discount:', summaryX + 18, sY);
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
    ctx.textAlign = 'left';
  }

  // Grand Total Banner inside summary
  const bannerY = discountAmount > 0 ? sY + 8 : curY + 34;
  const bannerH = 28;
  ctx.fillStyle = '#0f172a';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(summaryX + 12, bannerY, summaryWidth - 24, bannerH, 6);
    ctx.fill();
  } else {
    ctx.fillRect(summaryX + 12, bannerY, summaryWidth - 24, bannerH);
  }

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('INVOICE TOTAL:', summaryX + 22, bannerY + 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13.5px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBannerRightX, bannerY + 18);
  ctx.textAlign = 'left';

  if (isSettled) {
    if (priorBalance > 0.01) {
      // ─── OPTION 1: UNIFIED ACCOUNT WATERFALL ───
      // Line 1: Prior Past Due Balance
      sY = bannerY + bannerH + 16;
      ctx.fillStyle = '#92400e';
      ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Prior Past Due Balance:', summaryX + 18, sY);
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`+₹${priorBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';

      // Line 2: Total Account Obligation
      sY += 18;
      ctx.fillStyle = '#334155';
      ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Total Account Obligation:', summaryX + 18, sY);
      ctx.font = 'bold 11.5px monospace';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${totalObligation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';

      // Line 3: Total Payment Received
      sY += 18;
      ctx.fillStyle = '#15803d';
      ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Total Payment Received:', summaryX + 18, sY);
      ctx.font = 'bold 11.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`-₹${receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';

      // Line Separator
      sY += 10;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(summaryX + 14, sY);
      ctx.lineTo(summaryRightX, sY);
      ctx.stroke();

      // Line 4: TOTAL BALANCE DUE (matches bottom status pill baseline!)
      sY = curY + 150;
      const isDueCleared = closingBalance !== null && closingBalance <= 0.01;
      ctx.fillStyle = isDueCleared ? '#15803d' : '#dc2626';
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TOTAL BALANCE DUE:', summaryX + 18, sY);
      ctx.font = isDueCleared ? 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'bold 12.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        isDueCleared ? '₹0.00 (Cleared)' : `₹${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        summaryRightX,
        sY
      );
      ctx.textAlign = 'left';
    } else {
      // Settled with NO prior dues (Clean & direct)
      sY = bannerY + bannerH + 20;
      ctx.fillStyle = '#15803d';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Total Payment Received:', summaryX + 18, sY);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`-₹${receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';

      // Line Separator
      sY += 20;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(summaryX + 14, sY);
      ctx.lineTo(summaryRightX, sY);
      ctx.stroke();

      sY = curY + 150;
      const isDueCleared = closingBalance === null || closingBalance <= 0.01;
      ctx.fillStyle = isDueCleared ? '#15803d' : '#dc2626';
      ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('TOTAL BALANCE DUE:', summaryX + 18, sY);
      ctx.font = isDueCleared ? 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'bold 12.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        isDueCleared ? '₹0.00 (Cleared)' : `₹${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        summaryRightX,
        sY
      );
      ctx.textAlign = 'left';
    }
  } else {
    // ─── UNSETTLED / DUE BILL SUMMARY ───
    const effectiveDue = (overallDue !== null && overallDue !== undefined) ? overallDue : outstandingAmount;
    sY = bannerY + bannerH + 16;
    if (priorBalance > 0.01) {
      ctx.fillStyle = '#92400e';
      ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Prior Past Due Balance:', summaryX + 18, sY);
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`+₹${priorBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';

      sY += 18;
      ctx.fillStyle = '#475569';
      ctx.font = '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('This Bill Balance Due:', summaryX + 18, sY);
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#475569';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('This Bill Balance Due:', summaryX + 18, sY);
      ctx.font = 'bold 11.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
      ctx.textAlign = 'left';
    }

    // Line Separator
    sY += 16;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(summaryX + 14, sY);
    ctx.lineTo(summaryRightX, sY);
    ctx.stroke();

    sY = curY + 150;
    ctx.fillStyle = effectiveDue > 0.01 ? '#dc2626' : '#15803d';
    ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('TOTAL BALANCE DUE:', summaryX + 18, sY);
    ctx.font = 'bold 12.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${effectiveDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryRightX, sY);
    ctx.textAlign = 'left';
  }

  // Left Side: Payment Settlement Receipt OR UPI Payment Box
  if (isSettled) {
    // ─── A: COUNTER SETTLEMENT CONFIRMED BOX ───
    ctx.fillStyle = '#f0fdf4';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(leftBoxX, curY, upiWidth, boxHeight, 8);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(leftBoxX, curY, upiWidth, boxHeight);
    }

    // Top Header Badge Title
    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✓ PAYMENT SETTLEMENT RECEIPT', leftBoxTextX, curY + 22);

    // Mode Pill on Right of Header (Centered text, aligned to 18px inner padding)
    const modeBadgeText = paymentMethod || 'CASH';
    ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const modeBadgeWidth = Math.max(54, ctx.measureText(modeBadgeText).width + 16);
    const modeBadgeX = leftBoxRightX - modeBadgeWidth;
    const modeBadgeY = curY + 11;
    ctx.fillStyle = '#dcfce7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(modeBadgeX, modeBadgeY, modeBadgeWidth, 18, 4);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(modeBadgeX, modeBadgeY, modeBadgeWidth, 18);
    }
    ctx.fillStyle = '#166534';
    ctx.textAlign = 'center';
    ctx.fillText(modeBadgeText, modeBadgeX + modeBadgeWidth / 2, modeBadgeY + 13);
    ctx.textAlign = 'left';

    // Header divider line
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftBoxX + 14, curY + 34);
    ctx.lineTo(leftBoxRightX, curY + 34);
    ctx.stroke();

    // Row 1: Total Payment Received (Large bold monospace, right-aligned to leftBoxRightX)
    let lY = curY + 54;
    ctx.fillStyle = '#334155';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Total Payment Received:', leftBoxTextX, lY);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftBoxRightX, lY);
    ctx.textAlign = 'left';

    // Row 2: Applied to Current Bill (Emerald, right-aligned to leftBoxRightX)
    lY = curY + 77;
    ctx.fillStyle = '#475569';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Applied to Current Bill:', leftBoxTextX, lY);

    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 11.5px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${appliedToCurrent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftBoxRightX, lY);
    ctx.textAlign = 'left';

    // Row 3: Adjusted to Past Dues (Amber, right-aligned to leftBoxRightX)
    lY = curY + 98;
    if (appliedToPrev > 0) {
      ctx.fillStyle = '#92400e';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Adjusted to Past Dues:', leftBoxTextX, lY);

      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 11.5px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${appliedToPrev.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftBoxRightX, lY);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Settlement Mode:', leftBoxTextX, lY);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Counter ${modeBadgeText}`, leftBoxRightX, lY);
      ctx.textAlign = 'left';
    }

    // Row 4: Account Status Pill (Bottom)
    const pillY = curY + 124;
    const pillH = 34;
    const pillX = leftBoxX + 14;
    const pillW = upiWidth - 28;
    const isCleared = (closingBalance !== null && closingBalance <= 0.01) || (isPaid && (closingBalance === null || closingBalance <= 0.01));

    ctx.fillStyle = isCleared ? '#dcfce7' : '#fef3c7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = isCleared ? '#86efac' : '#fde68a';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
    }

    if (isCleared) {
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓ ALL DUES FULLY CLEARED (Current Balance: ₹0.00)', pillX + pillW / 2, pillY + 21);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Remaining Account Due:', pillX + 12, pillY + 21);

      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`₹${(closingBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pillX + pillW - 12, pillY + 21);
      ctx.textAlign = 'left';
    }

  } else {
    // ─── B: OFFICIAL UPI SETTLEMENT BOX (Unpaid Bills) ───
    ctx.fillStyle = '#f0fdf4';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(leftBoxX, curY, upiWidth, boxHeight, 8);
      ctx.fill();
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(leftBoxX, curY, upiWidth, boxHeight);
    }

    ctx.fillStyle = '#15803d';
    ctx.font = 'bold 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('💳 OFFICIAL UPI SETTLEMENT', leftBoxTextX, curY + 22);

    // Subtle header divider
    ctx.strokeStyle = '#bbf7d0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftBoxX + 14, curY + 34);
    ctx.lineTo(leftBoxRightX, curY + 34);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('9347453135@ybl', leftBoxTextX, curY + 58);

    ctx.fillStyle = '#334155';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Payee: RAIS AGENCIES', leftBoxTextX, curY + 78);
    ctx.fillText('GPay / PhonePe / Paytm: 9347453135', leftBoxTextX, curY + 96);

    // Bottom Collection Pill
    const pillY = curY + 124;
    const pillH = 34;
    const pillX = leftBoxX + 14;
    const pillW = upiWidth - 28;
    const effectiveDue = (overallDue !== null && overallDue !== undefined) ? overallDue : outstandingAmount;

    ctx.fillStyle = '#fef3c7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 6);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(pillX, pillY, pillW, pillH);
    }

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Driver Collection / Total Due:', pillX + 12, pillY + 21);

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`₹${effectiveDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pillX + pillW - 12, pillY + 21);
    ctx.textAlign = 'left';
  }

  // 4b. Bold Green Quick Links Banner
  curY += boxHeight + 12;
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
  let preloadedImg = null;
  try {
    const processedItems = (data?.items && data.items.length > 0) ? data.items : [];
    const suggestion = data?.includeRestockSuggestion !== false
      ? deriveRestockSuggestion(processedItems, data?.products || [], data?.restockSuggestion || data?.invoice?.restock_suggestion)
      : null;
    if (suggestion) {
      const imgUrl = suggestion.image_url || getProductImageUrl(suggestion);
      preloadedImg = await preloadImage(imgUrl, 1200);
    }
  } catch (err) {
    console.warn('Suggestion image preload failed gracefully:', err);
  }

  const canvas = generateInvoiceCanvas({
    ...data,
    preloadedSuggestionImage: preloadedImg
  });

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
