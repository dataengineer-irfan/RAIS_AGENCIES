/**
 * RAIS AGENCIES — High-Resolution Canvas Payment Settlement Receipt Generator
 * Generates an ultra-crisp, branded PNG payment receipt card client-side
 * for direct WhatsApp image sharing and 1-click downloads.
 */

import { formatInvoiceDateTime, formatCustomerDisplayName } from './invoiceImageGenerator.js';

export const generatePaymentCanvas = ({
  payment,
  customer
}) => {
  const pNumber = payment?.payment_number || 'PAY-RECEIPT';
  const bName = customer?.business_name || payment?.customer_name || 'Valued Customer';
  const cPerson = customer?.contact_person || payment?.customer_contact;
  const custName = formatCustomerDisplayName(bName, cPerson);
  const custPhone = customer?.phone || payment?.customer_phone || '';
  const custCode = customer?.customer_code || payment?.customer_code || '';
  const method = (payment?.payment_method || 'CASH').toUpperCase();
  const fallbackRef = method === 'CASH' ? 'Direct Cash Settlement' : method === 'UPI' ? 'UPI Transfer' : 'Direct Bank Settlement';
  const refStr = payment?.reference_number || fallbackRef;

  const payAmt = parseFloat(payment?.amount || 0);
  const payAmtFormatted = payAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const unallocAmt = parseFloat(payment?.unallocated_amount || 0);

  let overallDue = null;
  if (payment?.customer_outstanding_balance !== undefined && payment?.customer_outstanding_balance !== null) {
    overallDue = parseFloat(payment.customer_outstanding_balance);
  } else if (customer?.outstanding_balance !== undefined && customer?.outstanding_balance !== null) {
    overallDue = parseFloat(customer.outstanding_balance);
  }

  const { fullText: paymentDateTimeStr } = formatInvoiceDateTime(payment?.payment_date, payment?.created_at);

  const allocations = payment?.allocations || [];

  // Canvas Sizing
  const scale = 2; // 2x Retina / Mobile High-DPI
  const width = 800;
  const headerHeight = 140;
  const custBoxHeight = 80;
  const heroBoxHeight = 85;
  const tableHeaderHeight = 36;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + (Math.max(allocations.length, 1) * rowHeight) + 15;
  const ledgerBoxHeight = 75;
  const linksBoxHeight = 72;
  const footerHeight = 100;
  const height = headerHeight + 20 + custBoxHeight + 15 + heroBoxHeight + 15 + tableHeight + ledgerBoxHeight + linksBoxHeight + footerHeight;

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

  // 1. Header Banner (Deep Navy #0f172a with Emerald Accent)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, headerHeight);

  // Emerald accent bar
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, headerHeight - 4, width, 4);

  // Brand Name
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RAIS AGENCIES', 30, 48);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('❄️ FROZEN FOODS & 📦 RESTAURANT PACKAGING SOLUTIONS', 30, 72);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Reddies Colony, Sundupalli Road, Rayachoty - 516269, AP', 30, 92);
  ctx.fillText('Accounts Desk: +91 9347453135 | 9573261696', 30, 110);
  ctx.fillText('Operational Hours: 8:00 AM – 9:30 PM (All 7 Days)', 30, 126);

  // Right Side Header Badge
  ctx.fillStyle = '#1e293b';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(width - 245, 18, 215, 105, 8);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.stroke();
  } else {
    ctx.fillRect(width - 245, 18, 215, 105);
  }

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('SETTLEMENT RECEIPT', width - 230, 40);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`#${pNumber}`, width - 230, 62);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Date: ${paymentDateTimeStr}`, width - 230, 82);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('STATUS: CONFIRMED', width - 230, 104);

  // 2. Customer Info Card
  let curY = headerHeight + 15;
  ctx.fillStyle = '#f8fafc';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, width - 60, custBoxHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, width - 60, custBoxHeight);
  }

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('RECEIVED FROM (CUSTOMER ACCOUNT):', 46, curY + 22);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(custName, 46, curY + 44);

  ctx.fillStyle = '#475569';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const metaText = `Phone: ${custPhone || '-'}  •  Customer Code: ${custCode || '-'}  •  Depot Ledger Account`;
  ctx.fillText(metaText, 46, curY + 64);

  // 3. Hero Amount Received Box
  curY += custBoxHeight + 15;
  ctx.fillStyle = '#ecfdf5';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, width - 60, heroBoxHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, width - 60, heroBoxHeight);
  }

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TOTAL AMOUNT SETTLED & RECEIVED:', 48, curY + 26);

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(`₹${payAmtFormatted}`, 48, curY + 62);

  // Right details in Hero box
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Payment Mode: ${method}`, width - 320, curY + 30);

  ctx.fillStyle = '#475569';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Ref / UTR: ${refStr}`, width - 320, curY + 54);

  // 4. Allocations Table
  curY += heroBoxHeight + 15;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(30, curY, width - 60, tableHeaderHeight);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('#', 44, curY + 22);
  ctx.fillText('ALLOCATED INVOICE #', 80, curY + 22);
  ctx.fillText('ALLOCATION DATE', 440, curY + 22);
  ctx.fillText('SETTLED AMOUNT (₹)', 640, curY + 22);

  curY += tableHeaderHeight;
  if (allocations && allocations.length > 0) {
    allocations.forEach((a, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillStyle = bg;
      ctx.fillRect(30, curY, width - 60, rowHeight);

      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(30, curY + rowHeight);
      ctx.lineTo(width - 30, curY + rowHeight);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(String(idx + 1), 44, curY + 22);

      const invNum = a.invoice_number || `INV-${a.invoice_id?.slice(0, 8) || idx + 1}`;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`Bill #${invNum}`, 80, curY + 22);

      let allocDate = payment?.payment_date || '-';
      if (a.allocated_at) {
        try {
          const d = new Date(a.allocated_at);
          allocDate = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
        } catch {}
      }
      ctx.fillStyle = '#64748b';
      ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(allocDate, 440, curY + 22);

      const allocAmtFormatted = parseFloat(a.allocated_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`₹${allocAmtFormatted}`, 640, curY + 22);

      curY += rowHeight;
    });
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, curY, width - 60, rowHeight);
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Direct credit settlement recorded against customer account ledger.', 80, curY + 22);
    curY += rowHeight;
  }

  // 5. Ledger Balance & Advance Credit Notes
  curY += 15;
  if (unallocAmt > 0) {
    ctx.fillStyle = '#fef3c7';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(30, curY, width - 60, 32, 6);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.stroke();
    } else {
      ctx.fillRect(30, curY, width - 60, 32);
    }
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Advance / On-Account Credit Retained: ₹${unallocAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 46, curY + 20);
    curY += 40;
  }

  if (overallDue !== null) {
    if (overallDue > 0) {
      ctx.fillStyle = '#fff1f2';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(30, curY, width - 60, 44, 8);
        ctx.fill();
        ctx.strokeStyle = '#fecdd3';
        ctx.stroke();
      } else {
        ctx.fillRect(30, curY, width - 60, 44);
      }
      ctx.fillStyle = '#9f1239';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CURRENT REMAINING LEDGER DUE BALANCE:', 46, curY + 26);

      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`₹${overallDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, width - 220, curY + 28);
    } else {
      ctx.fillStyle = '#ecfdf5';
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(30, curY, width - 60, 44, 8);
        ctx.fill();
        ctx.strokeStyle = '#a7f3d0';
        ctx.stroke();
      } else {
        ctx.fillRect(30, curY, width - 60, 44);
      }
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('✅ CURRENT LEDGER STATUS: ALL DUES FULLY CLEARED (₹0.00)', 46, curY + 27);
    }
    curY += 55;
  }

  // 5b. Bold Green Quick Links Banner
  const linkBannerHeight = 58;
  ctx.fillStyle = '#ecfdf5';
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(30, curY, width - 60, linkBannerHeight, 8);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillRect(30, curY, width - 60, linkBannerHeight);
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

  curY += linkBannerHeight + 15;

  // 6. Footer Notes
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(30, curY);
  ctx.lineTo(width - 30, curY);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = '400 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Official Computer Generated Settlement Receipt • RAIS AGENCIES Rayachoty (-18°C Cold-Chain Depot)', 30, curY + 22);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Generated electronically on ${paymentDateTimeStr}. No physical signature required.`, 30, curY + 40);

  return canvas;
};

export const generatePaymentBlob = async (data) => {
  const canvas = generatePaymentCanvas(data);
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

export const generatePaymentFile = async (data) => {
  const blob = await generatePaymentBlob(data);
  const pNumber = data?.payment?.payment_number || 'RECEIPT';
  return new File([blob], `RAIS_Receipt_${pNumber}.png`, { type: 'image/png' });
};

export const downloadPaymentImage = async (data) => {
  const blob = await generatePaymentBlob(data);
  const pNumber = data?.payment?.payment_number || 'RECEIPT';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RAIS_Receipt_${pNumber}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
};
