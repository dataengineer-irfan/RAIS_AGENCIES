import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, CheckCircle2, FileText, Printer } from 'lucide-react';
import { customerApi, catalogueApi, billingApi } from '../services/api';

export const InvoiceBuilderModal = ({ isOpen, onClose, onInvoiceCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successInvoice, setSuccessInvoice] = useState(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
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
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: '', discount_rate: 0, tax_rate: 0 }
  ]);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      resetForm();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      const [custData, prodData] = await Promise.all([
        customerApi.list(),
        catalogueApi.listProducts({ limit: 200 })
      ]);
      setCustomers(custData);
      setProducts(prodData);
      if (custData.length > 0 && !customerId) {
        setCustomerId(custData[0].id);
      }
    } catch (err) {
      setError('Failed to load customers or catalogue items.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setSuccessInvoice(null);
    setInvoiceDiscount('0');
    setNotes('');
    setItems([{ product_id: '', quantity: 1, unit_price: '', discount_rate: 0, tax_rate: 0 }]);
  };

  const handleProductChange = (index, prodId) => {
    const prod = products.find(p => p.id === prodId);
    const newItems = [...items];
    if (prod) {
      newItems[index] = {
        ...newItems[index],
        product_id: prod.id,
        unit_price: prod.base_price,
        tax_rate: prod.tax_rate,
        packaging_unit: prod.packaging_unit
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: '',
        unit_price: '',
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
    setItems([...items, { product_id: '', quantity: 1, unit_price: '', discount_rate: 0, tax_rate: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live Calculations (Client preview, verified server-side)
  const calculateTotals = () => {
    let subtotal = 0;
    let itemDiscounts = 0;
    let totalTax = 0;

    items.forEach(itm => {
      const qty = parseFloat(itm.quantity) || 0;
      const rate = parseFloat(itm.unit_price) || 0;
      const disc = parseFloat(itm.discount_rate) || 0;
      const tax = parseFloat(itm.tax_rate) || 0;

      const gross = qty * rate;
      const discAmt = gross * (disc / 100);
      const taxable = gross - discAmt;
      const taxAmt = taxable * (tax / 100);

      subtotal += gross;
      itemDiscounts += discAmt;
      totalTax += taxAmt;
    });

    const invDisc = parseFloat(invoiceDiscount) || 0;
    const totalDiscount = itemDiscounts + invDisc;
    const taxableTotal = Math.max(0, subtotal - totalDiscount);
    const grandTotal = taxableTotal + totalTax;

    return {
      subtotal: subtotal.toFixed(2),
      discount: totalDiscount.toFixed(2),
      taxable: taxableTotal.toFixed(2),
      tax: totalTax.toFixed(2),
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Tax Invoice</h2>
              <p className="text-xs text-slate-400">RAIS Agencies Wholesale Billing Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
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
            <p className="text-sm text-slate-400 font-mono">Invoice Number: <span className="text-amber-400 font-bold">{successInvoice.invoice_number}</span></p>
            <p className="text-xs text-slate-400">Grand Total: ₹{parseFloat(successInvoice.total_amount).toFixed(2)} | Billed to {successInvoice.customer_name}</p>

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
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-semibold">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Line Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Product Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product Row
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800 items-center">
                      <div className="col-span-5">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                        >
                          <option value="">-- Choose Catalogue SKU --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.packaging_unit}) — ₹{p.base_price}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          required
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-center text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-xs text-slate-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemFieldChange(index, 'unit_price', e.target.value)}
                            placeholder="Price"
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded pl-5 pr-2 py-1.5 text-xs text-right text-slate-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.1"
                          value={item.discount_rate}
                          onChange={(e) => handleItemFieldChange(index, 'discount_rate', e.target.value)}
                          placeholder="Disc %"
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-center text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          disabled={items.length === 1}
                          className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                    placeholder="e.g. Delivered via morning frozen van"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Additional Invoice Discount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceDiscount}
                      onChange={(e) => setInvoiceDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoIssue"
                      checked={autoIssue}
                      onChange={(e) => setAutoIssue(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                    />
                    <label htmlFor="autoIssue" className="text-xs font-semibold text-slate-300">
                      Issue Immediately (Ready for Payment Allocation)
                    </label>
                  </div>
                </div>
              </div>

              {/* Totals Summary Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  <span>Deterministic Server Calculation Applied</span>
                </div>

                <div className="flex items-center gap-6 font-mono text-xs">
                  <div>
                    <span className="text-slate-500">Subtotal:</span>{' '}
                    <span className="text-slate-300 font-bold">₹{totals.subtotal}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">GST:</span>{' '}
                    <span className="text-slate-300 font-bold">₹{totals.tax}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-amber-500 font-bold">Total:</span>{' '}
                    <span className="text-amber-400 font-black text-base">₹{totals.total}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg shadow-lg shadow-amber-500/20 uppercase tracking-wider flex items-center gap-2"
              >
                {submitting ? 'Generating...' : autoIssue ? 'Issue Invoice' : 'Save as Draft'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
