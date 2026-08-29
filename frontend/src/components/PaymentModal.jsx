import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2 } from 'lucide-react';
import { customerApi, billingApi, paymentApi } from '../services/api';

export const PaymentModal = ({ isOpen, onClose, preselectedCustomer, preselectedInvoice, onPaymentRecorded }) => {
  const [customers, setCustomers] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, preselectedCustomer, preselectedInvoice]);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const custList = await customerApi.list();
      setCustomers(custList);

      const targetCustId = preselectedCustomer?.id || (custList.length > 0 ? custList[0].id : '');
      setCustomerId(targetCustId);

      if (targetCustId) {
        await loadCustomerInvoices(targetCustId);
      }

      if (preselectedInvoice) {
        setSelectedInvoiceId(preselectedInvoice.id);
        setAmount(preselectedInvoice.outstanding_amount.toString());
      }
    } catch (err) {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInvoices = async (cId) => {
    try {
      const invs = await billingApi.listInvoices({ customer_id: cId });
      const open = invs.filter(i => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i.status) && parseFloat(i.outstanding_amount) > 0);
      setOpenInvoices(open);
      if (open.length > 0 && !preselectedInvoice) {
        setSelectedInvoiceId(open[0].id);
        setAmount(open[0].outstanding_amount.toString());
      } else if (open.length === 0) {
        setSelectedInvoiceId('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerChange = async (cId) => {
    setCustomerId(cId);
    await loadCustomerInvoices(cId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_id: customerId,
        amount: amtNum,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: notes,
        allocations: selectedInvoiceId ? [{ invoice_id: selectedInvoiceId, amount: amtNum }] : []
      };

      const result = await paymentApi.record(payload);
      setSuccessMsg(`Payment ${result.payment_number} of ₹${amtNum.toFixed(2)} recorded successfully!`);
      if (onPaymentRecorded) {
        onPaymentRecorded(result);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to record payment.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Settlement / Payment</h2>
              <p className="text-xs text-slate-400">Allocate Cash, UPI, or Bank settlement to Invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name} (Balance: ₹{parseFloat(c.outstanding_balance).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Allocate to Open Invoice (Optional)
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                const inv = openInvoices.find(i => i.id === e.target.value);
                if (inv) setAmount(inv.outstanding_amount.toString());
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">-- No Direct Allocation (Add to Unallocated Pool) --</option>
              {openInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} ({inv.invoice_date}) — Due: ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="CASH">Cash</option>
                <option value="NEFT_RTGS">Bank Transfer (NEFT/RTGS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CARD">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Reference / Transaction ID
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR12345678 or Cash Receipt No"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Direct settlement at counter"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-lg shadow-emerald-600/20 uppercase tracking-wider"
            >
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
