import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, CheckCircle2, FileText, Printer, Sparkles, Package } from 'lucide-react';
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

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 15 days upon delivery.');
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
            tax_rate: parseFloat(preselectedProduct.tax_rate || 0),
            packaging_unit: preselectedProduct.packaging_unit || 'PKT'
          }
        ]);
      } else if (prodData.length > 0) {
        // Pre-populate with first fast-moving product
        const firstProd = prodData[0];
        setItems([
          {
            product_id: firstProd.id,
            quantity: 1,
            unit_price: parseFloat(firstProd.base_price || 0),
            discount_rate: 0,
            tax_rate: parseFloat(firstProd.tax_rate || 0),
            packaging_unit: firstProd.packaging_unit || 'PKT'
          }
        ]);
      } else {
        setItems([
          { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, tax_rate: 0, packaging_unit: 'PKT' }
        ]);
      }
    } catch (err) {
      console.error("Failed to load invoice builder dependencies:", err);
      setError('Failed to load customers or catalogue items. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccessInvoice(null);
    setInvoiceDiscount('0');
    setNotes('');
    if (products.length > 0) {
      const firstProd = products[0];
      setItems([
        {
          product_id: firstProd.id,
          quantity: 1,
          unit_price: parseFloat(firstProd.base_price || 0),
          discount_rate: 0,
          tax_rate: parseFloat(firstProd.tax_rate || 0),
          packaging_unit: firstProd.packaging_unit || 'PKT'
        }
      ]);
    } else {
      setItems([{ product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, tax_rate: 0, packaging_unit: 'PKT' }]);
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
        tax_rate: parseFloat(prod.tax_rate || 0),
        packaging_unit: prod.packaging_unit || 'PKT'
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: '',
        unit_price: 0,
        tax_rate: 0
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
    // If there are products, pick the next available product or default to first
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
          tax_rate: parseFloat(defaultProd.tax_rate || 0),
          packaging_unit: defaultProd.packaging_unit || 'PKT'
        }
      ]);
    } else {
      setItems([...items, { product_id: '', quantity: 1, unit_price: 0, discount_rate: 0, tax_rate: 0, packaging_unit: 'PKT' }]);
    }
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live Calculations (Subtotal minus Discounts, No GST)
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
      taxable: grandTotal.toFixed(2),
      tax: '0.00',
      total: grandTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    const validItems = items.filter(i => i.product_id && parseFloat(i.quantity) > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid product with quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        discount_amount: parseFloat(invoiceDiscount) || 0,
        payment_terms: paymentTerms,
        notes: notes,
        auto_issue: autoIssue,
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price),
          discount_rate: parseFloat(i.discount_rate) || 0
        }))
      };

      const created = await billingApi.createInvoice(payload);
      setSuccessInvoice(created);
      if (onInvoiceCreated) {
        onInvoiceCreated(created);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to create invoice.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Create New Tax Invoice</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                  AUTO-CALCULATED
                </span>
              </div>
              <p className="text-xs text-slate-400">RAIS Agencies Wholesale Billing Engine • Rayachoty Depot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successInvoice ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Invoice Issued Successfully!</h3>
            <p className="text-sm text-slate-400 font-mono">
              Invoice Number: <span className="text-amber-400 font-bold">{successInvoice.invoice_number}</span>
            </p>
            <p className="text-xs text-slate-400">
              Grand Total: ₹{parseFloat(successInvoice.total_amount).toFixed(2)} | Billed to {successInvoice.customer_name}
            </p>

            <div className="flex gap-3 pt-4">
              <a
                href={`/api/invoices/${successInvoice.id}/print-html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </a>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                Create Another Invoice
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs uppercase tracking-wider"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  {error}
                </div>
              )}

              {/* Customer & Dates Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Customer / Restaurant *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
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
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors"
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
                    const lineSub = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    const lineDisc = lineSub * ((parseFloat(item.discount_rate) || 0) / 100);
                    const lineTaxable = Math.max(0, lineSub - lineDisc);
                    const lineTax = lineTaxable * ((parseFloat(item.tax_rate) || 0) / 100);
                    const lineTotal = lineTaxable + lineTax;

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

              {/* Notes, Discounts & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Invoice Notes / Delivery Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivered via morning refrigerated vehicle • PO Ref #9842"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Additional Bill-Level Cash Discount (₹)
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="autoIssue"
                      checked={autoIssue}
                      onChange={(e) => setAutoIssue(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autoIssue" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Issue Immediately (Ready for 1-Click WhatsApp & Receipt Printing)
                    </label>
                  </div>
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
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-mono">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">Esc</kbd> to exit
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center gap-2 transition-all transform active:scale-95"
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
