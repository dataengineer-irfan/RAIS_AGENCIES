import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, CheckCircle2, FileText, Printer, Sparkles, Package, Eye, ArrowLeft, Building2, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { customerApi, catalogueApi, billingApi } from '../services/api';

export const InvoiceBuilderModal = ({ 
  isOpen, 
  onClose, 
  onInvoiceCreated,
  preselectedCustomer = null,
  preselectedProduct = null
}) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInvoice, setSuccessInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form State - Cash business default: invoiceDate and dueDate are identical today
  const todayStr = new Date().toISOString().split('T')[0];
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('Cash on Delivery / Immediate Settlement');
  const [notes, setNotes] = useState('');
  const [autoIssue, setAutoIssue] = useState(true);

  // Line items
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen, preselectedCustomer, preselectedProduct]);

  const loadDependencies = async () => {
    setLoading(true);
    setError('');
    setSuccessInvoice(null);
    setShowPreview(false);
    try {
      const [custDataRaw, prodDataRaw] = await Promise.all([
        customerApi.list({ limit: 100 }),
        catalogueApi.listProducts({ limit: 200 })
      ]);

      const custData = Array.isArray(custDataRaw) ? custDataRaw : (custDataRaw?.items || []);
      const prodData = Array.isArray(prodDataRaw) ? prodDataRaw : (prodDataRaw?.items || []);

      setCustomers(custData);
      setProducts(prodData);

      // 1. Resolve initial customer
      if (preselectedCustomer) {
        setCustomerId(typeof preselectedCustomer === 'object' ? preselectedCustomer.id : preselectedCustomer);
      } else if (custData.length > 0) {
        setCustomerId(custData[0].id);
      }

      // 2. Resolve initial product line items
      if (preselectedProduct && typeof preselectedProduct === 'object') {
        setItems([
          {
            product_id: preselectedProduct.id,
            quantity: 1,
            unit_price: parseFloat(preselectedProduct.base_price || 0),
            discount_rate: 0,
            packaging_unit: preselectedProduct.packaging_unit || 'PKT'
          }
        ]);
      } else if (prodData.length > 0) {
        const firstProd = prodData[0];
        setItems([
          {
            product_id: firstProd.id,
            quantity: 1,
            unit_price: parseFloat(firstProd.base_price || 0),
            discount_rate: 0,
            packaging_unit: firstProd.packaging_unit || 'PKT'
          }
        ]);
      } else {
        setItems([
          { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }
        ]);
      }
    } catch (err) {
      console.error("Failed to load invoice builder dependencies:", err);
      setError('Failed to load customers or catalogue items. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceDateChange = (val) => {
    setInvoiceDate(val);
    // Keep due date synced to invoice date by default for cash business
    setDueDate(val);
  };

  const resetForm = () => {
    setError('');
    setSuccessInvoice(null);
    setShowPreview(false);
    setInvoiceDiscount('0');
    setNotes('');
    setPaymentTerms('Cash on Delivery / Immediate Settlement');
    const curToday = new Date().toISOString().split('T')[0];
    setInvoiceDate(curToday);
    setDueDate(curToday);
    if (products.length > 0) {
      const firstProd = products[0];
      setItems([
        {
          product_id: firstProd.id,
          quantity: 1,
          unit_price: parseFloat(firstProd.base_price || 0),
          discount_rate: 0,
          packaging_unit: firstProd.packaging_unit || 'PKT'
        }
      ]);
    } else {
      setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
    }
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => p.id === prodId);
    const newItems = [...items];
    if (prod) {
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        unit_price: parseFloat(prod.base_price || 0),
        packaging_unit: prod.packaging_unit || 'PKT'
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: '',
        unit_price: 0
      };
    }
    setItems(newItems);
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItemRow = () => {
    let defaultProd = products.length > 0 ? products[0] : null;
    if (products.length > items.length) {
      const unusedProd = products.find(p => !items.some(i => i.product_id === p.id));
      if (unusedProd) defaultProd = unusedProd;
    }

    if (defaultProd) {
      setItems([
        ...items,
        {
          product_id: defaultProd.id,
          quantity: 1,
          unit_price: parseFloat(defaultProd.base_price || 0),
          discount_rate: 0,
          packaging_unit: defaultProd.packaging_unit || 'PKT'
        }
      ]);
    } else {
      setItems([...items, { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, packaging_unit: 'PKT' }]);
    }
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live Calculations (Direct Wholesale Price - No GST)
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;

    items.forEach(itm => {
      const qty = parseFloat(itm.quantity) || 0;
      const rate = parseFloat(itm.unit_price) || 0;
      const disc = parseFloat(itm.discount_rate) || 0;

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);

      subtotal += gross;
      itemDiscounts += discAmt;
    });

    const invDisc = parseFloat(invoiceDiscount) || 0;
    const totalDiscount = itemDiscounts + invDisc;
    const grandTotal = Math.max(0, subtotal - totalDiscount);

    return {
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      total: grandTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();
  const selectedCustomerObj = customers.find(c => c.id === customerId);

  const validateForm = () => {
    if (!customerId) {
      setError('Please select a customer / restaurant.');
      return false;
    }
    if (items.length === 0 || items.some(i => !i.product_id || parseFloat(i.quantity) <= 0)) {
      setError('Please ensure all line items have a selected SKU and valid quantity > 0.');
      return false;
    }
    return true;
  };

  const handleOpenPreview = () => {
    setError('');
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        discount_amount: parseFloat(invoiceDiscount) || 0,
        payment_terms: paymentTerms,
        notes: notes.trim() || null,
        auto_issue: autoIssue,
        items: items.map(itm => ({
          product_id: itm.product_id,
          quantity: parseFloat(itm.quantity),
          unit_price: parseFloat(itm.unit_price),
          discount_rate: parseFloat(itm.discount_rate) || 0
        }))
      };

      const res = await billingApi.createInvoice(payload);
      setSuccessInvoice(res);
      setShowPreview(false);
      if (onInvoiceCreated) {
        onInvoiceCreated(res);
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to create invoice.';
      setError(msg);
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {showPreview ? 'Invoice Live Preview' : 'Create Commercial Wholesale Invoice'}
                </h2>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  DIRECT WHOLESALE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {showPreview 
                  ? 'Review verified document layout before issuing' 
                  : 'RAIS Agencies Wholesale Invoicing Engine • Cash / Immediate Settlement'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── CASE A: INVOICE CREATED SUCCESS SCREEN ─── */}
        {successInvoice ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Invoice #{successInvoice.invoice_number} Generated!
            </h3>
            <p className="text-xs text-slate-400">
              Grand Total: <b className="text-amber-400 font-mono">₹{parseFloat(successInvoice.total_amount).toFixed(2)}</b> | Billed to {successInvoice.customer_name}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Date: {successInvoice.invoice_date} • Terms: {successInvoice.payment_terms || 'Cash on Delivery'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <a
                href={`/api/invoices/${successInvoice.id}/print-html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
              >
                <Printer className="w-4 h-4" />
                Print / Save A4 PDF
              </a>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Create Another Invoice
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
              >
                Done
              </button>
            </div>
          </div>
        ) : showPreview ? (
          /* ─── CASE B: LIVE INVOICE PREVIEW BEFORE ISSUING ─── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              
              {/* Top Banner inside Preview */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold">Live Pre-Issue Verification: Direct Cash Pricing (Zero GST)</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Invoice Date & Due Date: <strong className="text-white">{invoiceDate}</strong>
                </span>
              </div>

              {/* Styled Paper Sheet Preview */}
              <div className="bg-white text-gray-900 rounded-xl p-6 shadow-2xl border border-gray-200 text-xs font-sans space-y-5">
                
                {/* Header Row */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-black text-lg text-white">R</div>
                      <div>
                        <h1 className="text-lg font-black tracking-wide text-gray-900">RAIS AGENCIES</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Frozen Foods & Beverages Wholesale</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600 mt-1.5">Reddies Colony, Rayachoty - 516269</p>
                    <p className="text-[11px] text-gray-600 font-semibold">Phone: 9347453135 | 9573261696</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-gray-900 text-white font-bold text-[10px] uppercase tracking-widest rounded mb-1.5">
                      WHOLESALE INVOICE
                    </span>
                    <h2 className="text-sm font-bold font-mono text-gray-700">INV-PREVIEW</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">Date: <strong className="text-gray-900">{invoiceDate}</strong></p>
                    <p className="text-[11px] text-gray-500">Due Date: <strong className="text-gray-900">{dueDate}</strong></p>
                  </div>
                </div>

                {/* Billed To & Terms */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h3 className="font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">Billed To (Customer):</h3>
                    <p className="text-sm font-bold text-gray-900">{selectedCustomerObj?.business_name || 'Customer'}</p>
                    <p className="text-gray-600 mt-0.5">{selectedCustomerObj?.address_line1 || 'Rayachoty'}</p>
                    <p className="text-gray-600 mt-0.5 font-semibold">Phone: {selectedCustomerObj?.phone || '-'}</p>
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <p className="text-gray-500">Customer Code: <strong className="font-mono text-gray-800">{selectedCustomerObj?.customer_code || '-'}</strong></p>
                    <p className="text-gray-500 mt-1">Payment Terms: <strong className="text-emerald-700 font-bold">{paymentTerms}</strong></p>
                    {notes && <p className="text-gray-500 mt-1 italic">Note: {notes}</p>}
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300 text-[11px] font-bold text-gray-600 uppercase">
                      <th className="py-2 text-center w-8">#</th>
                      <th className="py-2">Item SKU & Description</th>
                      <th className="py-2 text-center">Unit</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Disc %</th>
                      <th className="py-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((itm, idx) => {
                      const prod = products.find(p => p.id === itm.product_id);
                      const qty = parseFloat(itm.quantity) || 0;
                      const rate = parseFloat(itm.unit_price) || 0;
                      const disc = parseFloat(itm.discount_rate) || 0;
                      const lineGross = qty * rate;
                      const lineTotal = lineGross - (lineGross * (disc / 100));

                      return (
                        <tr key={idx} className="border-b border-gray-200 text-xs">
                          <td className="py-2 text-center font-mono">{idx + 1}</td>
                          <td className="py-2 font-semibold text-gray-800">
                            {prod?.name || 'Product'} <span className="text-[10px] text-gray-500 font-mono">({prod?.sku})</span>
                          </td>
                          <td className="py-2 text-center text-gray-600">{itm.packaging_unit || prod?.packaging_unit || 'PKT'}</td>
                          <td className="py-2 text-center font-bold font-mono">{qty}</td>
                          <td className="py-2 text-right font-mono">₹{rate.toFixed(2)}</td>
                          <td className="py-2 text-right text-gray-600">{disc}%</td>
                          <td className="py-2 text-right font-bold font-mono text-gray-900">₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Summary & Bank Info */}
                <div className="grid grid-cols-12 gap-4 pt-3 border-t-2 border-gray-300">
                  <div className="col-span-7 text-[11px] text-gray-600 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-1">Bank & UPI Settlement:</h4>
                      <p>UPI ID: <strong className="font-mono text-gray-900">9347453135@ybl</strong> (RAIS Agencies)</p>
                      <p className="mt-0.5">Order Support Hotline: <strong className="text-gray-900">9347453135 / 9573261696</strong></p>
                      <p className="mt-1.5 italic text-gray-500">Thank you for partnering with RAIS Agencies!</p>
                    </div>
                  </div>

                  <div className="col-span-5 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>₹{totals.subtotal}</span>
                    </div>
                    {parseFloat(totals.discount) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>-₹{totals.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-b border-gray-400 py-1.5 font-sans">
                      <span>Grand Total Due:</span>
                      <span className="font-mono text-base text-gray-900 font-black">₹{totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit Form
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors border border-slate-700"
                >
                  <Printer className="w-4 h-4" />
                  Print Preview
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {submitting ? 'Generating...' : 'Confirm & Issue Invoice Now'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── CASE C: MAIN INVOICE BUILDER FORM ─── */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  {error}
                </div>
              )}

              {/* Customer, Date & Due Date Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Customer / Restaurant *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors font-medium"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Invoice Date</span>
                    <span className="text-[10px] text-amber-400 font-mono font-normal">Cash Same-Day</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => handleInvoiceDateChange(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Payment Due Date</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-normal">= Invoice Date</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Payment Terms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="Cash on Delivery / Immediate Settlement">Cash on Delivery / Immediate Settlement (Default)</option>
                    <option value="Immediate UPI / Online Settlement">Immediate UPI / Online Settlement</option>
                    <option value="Net 7 Days">Net 7 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Delivery Notes / Instructions
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivered via morning refrigerated vehicle • Ref #9842"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Product Line Items
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      ({items.length} {items.length === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product Row
                  </button>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <div className="col-span-5">Catalogue Product SKU</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price (₹)</div>
                  <div className="col-span-2 text-center">Disc %</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => {
                    const selProd = products.find(p => p.id === item.product_id);

                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors items-center">
                        <div className="col-span-5">
                          <select
                            value={item.product_id}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-500 truncate"
                          >
                            <option value="">-- Choose Catalogue SKU --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.packaging_unit || 'PKT'}) — ₹{parseFloat(p.base_price).toFixed(2)}
                              </option>
                            ))}
                          </select>
                          {selProd && (
                            <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400 font-mono">
                              <span>SKU: {selProd.sku}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold">Stock: {parseFloat(selProd.current_stock || 0)} {selProd.packaging_unit}</span>
                            </div>
                          )}
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                              placeholder="Qty"
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-center font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                            />
                            <span className="absolute right-2 top-2 text-[10px] text-slate-500 font-mono pointer-events-none">
                              {item.packaging_unit || 'PKT'}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-xs text-slate-500 font-mono">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                              placeholder="0.00"
                              required
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-2 text-xs text-right font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.discount_rate}
                              onChange={(e) => handleItemFieldChange(index, 'discount_rate', e.target.value)}
                              placeholder="0"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-center font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                            />
                            <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 pointer-events-none">%</span>
                          </div>
                        </div>

                        <div className="col-span-1 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            disabled={items.length === 1}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Delete Line Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bill-Level Cash Discount & Auto Issue */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Bill-Level Cash Discount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceDiscount}
                      onChange={(e) => setInvoiceDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-6">
                  <input
                    type="checkbox"
                    id="autoIssue"
                    checked={autoIssue}
                    onChange={(e) => setAutoIssue(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="autoIssue" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                    Issue Immediately (Ready for WhatsApp & Thermal Print)
                  </label>
                </div>
              </div>

              {/* Totals Summary Card */}
              <div className="p-4 bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Calculator className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-slate-200 font-semibold">Wholesale Pricing Valuation</span>
                    <p className="text-[10px] text-slate-500">Direct Pricing • No Tax Included</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-sans">Subtotal</span>
                    <span className="text-slate-300 font-bold text-sm">₹{totals.subtotal}</span>
                  </div>
                  {parseFloat(totals.discount) > 0 && (
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Discount</span>
                      <span className="text-emerald-400 font-bold text-sm">-₹{totals.discount}</span>
                    </div>
                  )}
                  <div className="text-right pl-3 border-l border-slate-800">
                    <span className="text-amber-400 block text-[10px] uppercase font-bold font-sans">Grand Total Due</span>
                    <span className="text-amber-400 font-black text-lg">₹{totals.total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">Esc</kbd> to exit
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Invoice</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {submitting ? 'Generating...' : autoIssue ? 'Issue Invoice Now' : 'Save as Draft'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
