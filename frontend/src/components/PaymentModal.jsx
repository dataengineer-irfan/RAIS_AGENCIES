import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle2, Tag, Sparkles, RotateCcw } from 'lucide-react';
import { customerApi, billingApi, paymentApi } from '../services/api';
import { SearchableCustomerSelect } from './SearchableCustomerSelect';

export const PaymentModal = ({ 
  isOpen, 
  onClose, 
  preselectedCustomer, 
  preselectedInvoice,
  initialCustomer,
  initialInvoice,
  onPaymentRecorded,
  onPaymentSuccess
}) => {
  const activeCustomer = preselectedCustomer || initialCustomer;
  const activeInvoice = preselectedInvoice || initialInvoice;

  const [customers, setCustomers] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen, activeCustomer, activeInvoice]);

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDiscountAmount('');
    try {
      const custList = await customerApi.list();
      const safeCustomers = Array.isArray(custList) ? custList : (custList?.items || []);
      setCustomers(safeCustomers);
      // Strictly prioritize activeInvoice's customer or preselected customer. Never auto-select safeCustomers[0]!
      const targetCustId = activeInvoice?.customer_id || activeCustomer?.id || '';
      setCustomerId(targetCustId);

      if (targetCustId) {
        await loadCustomerInvoices(targetCustId, safeCustomers);
      } else {
        setOpenInvoices([]);
        setSelectedInvoiceId('');
        setAmount('');
      }

      if (activeInvoice) {
        setSelectedInvoiceId(activeInvoice?.id || '');
        setAmount(String(activeInvoice?.outstanding_amount ?? '0'));
      }
    } catch (err) {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInvoices = async (cId, currentCustomers = customers) => {
    try {
      const invs = await billingApi.listInvoices({ customer_id: cId });
      const rawInvs = Array.isArray(invs) ? invs : (invs?.items || []);
      const open = rawInvs.filter(i => ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(i?.status) && parseFloat(i?.outstanding_amount || 0) > 0);
      setOpenInvoices(open);
      
      if (open.length > 0 && !preselectedInvoice) {
        setSelectedInvoiceId(open[0]?.id || '');
        setAmount(String(open[0]?.outstanding_amount ?? '0'));
      } else if (open.length === 0) {
        setSelectedInvoiceId('');
        const cust = (currentCustomers || []).find(c => String(c?.id) === String(cId));
        if (cust && parseFloat(cust?.outstanding_balance || 0) > 0) {
          setAmount(String(cust.outstanding_balance));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerChange = async (cId) => {
    setCustomerId(cId);
    setSelectedInvoiceId('');
    setDiscountAmount('');
    if (cId) {
      await loadCustomerInvoices(cId);
    } else {
      setOpenInvoices([]);
      setAmount('');
    }
  };

  // Determine active outstanding due balance for this transaction
  const currentCustomer = (customers || []).find(c => String(c?.id) === String(customerId));
  const custOutstanding = parseFloat(currentCustomer?.outstanding_balance || 0);
  const selectedInvoice = (openInvoices || []).find(i => i?.id === selectedInvoiceId);
  const invOutstanding = selectedInvoice ? parseFloat(selectedInvoice.outstanding_amount || 0) : 0;
  const activeDue = selectedInvoice ? invOutstanding : custOutstanding;

  const amtNum = parseFloat(amount) || 0;
  const discNum = parseFloat(discountAmount) || 0;
  const totalSettled = amtNum + discNum;
  const remainingDue = Math.max(0, activeDue - totalSettled);
  const excessToAdvance = Math.max(0, totalSettled - activeDue);

  // Difference between target due and entered cash payment
  const unpaidDiff = Math.max(0, activeDue - amtNum);
  const paise = activeDue > 0 ? +(activeDue - Math.floor(activeDue)).toFixed(2) : 0;

  const applyQuickDiscount = (val) => {
    const num = parseFloat(val) || 0;
    if (num <= 0) {
      setDiscountAmount('');
      if (activeDue > 0) setAmount(activeDue.toFixed(2));
      return;
    }
    setDiscountAmount(String(num));
    if (activeDue > 0) {
      const remainingCash = Math.max(0, activeDue - num);
      setAmount(remainingCash.toFixed(2));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerId) {
      setError('Please select a customer to record payment.');
      return;
    }
    if (!amtNum || amtNum <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      // Auto-clamp allocation so it never exceeds invoice outstanding balance
      const matchedInvoice = (openInvoices || []).find(i => i?.id === selectedInvoiceId);
      const allocatedAmount = (selectedInvoiceId && matchedInvoice)
        ? Math.min(amtNum, parseFloat(matchedInvoice.outstanding_amount || 0))
        : (selectedInvoiceId ? amtNum : 0);

      const allocations = selectedInvoiceId && allocatedAmount > 0
        ? [{ invoice_id: selectedInvoiceId, amount: allocatedAmount }]
        : [];

      const payload = {
        customer_id: customerId,
        amount: amtNum,
        discount_amount: discNum > 0 ? discNum : 0,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: allocations
      };

      const result = await paymentApi.record(payload);
      const discText = discNum > 0 ? ` (with ₹${discNum.toFixed(2)} cash discount)` : '';
      setSuccessMsg(`Payment ${result?.payment_number || 'REC'} of ₹${amtNum.toFixed(2)}${discText} recorded successfully!`);
      if (onPaymentRecorded) {
        onPaymentRecorded(result);
      }
      if (onPaymentSuccess) {
        onPaymentSuccess(result);
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

  const allocatedToInvoice = selectedInvoice ? Math.min(amtNum, invOutstanding) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Payment</h2>
              <p className="text-xs text-slate-400">Cash, UPI, or Bank settlement</p>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
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

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Customer *
            </label>
            <SearchableCustomerSelect
              customers={customers}
              selectedCustomerId={customerId}
              onSelectCustomer={(id) => handleCustomerChange(id)}
              required
              placeholder="-- Click to Search & Select Customer --"
            />
          </div>

          {/* Open Invoice Allocation Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Allocate to Open Invoice (Optional)
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                setDiscountAmount('');
                const inv = (openInvoices || []).find(i => i?.id === e.target.value);
                if (inv) {
                  setAmount(String(inv?.outstanding_amount ?? '0'));
                } else if (custOutstanding > 0) {
                  setAmount(String(custOutstanding));
                }
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="" className="bg-slate-900 text-slate-400">-- No Direct Allocation (Add to Unallocated Pool) --</option>
              {(openInvoices || []).map((inv) => (
                <option key={inv?.id} value={inv?.id} className="bg-slate-900 text-white py-1">
                  {inv?.invoice_number || 'INV'} ({inv?.invoice_date || '-'}) — Due: ₹{parseFloat(inv?.outstanding_amount || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Discount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Amount Received (₹) *
                </label>
                {activeDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(activeDue.toFixed(2));
                      setDiscountAmount('');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    Full Due (₹{activeDue.toFixed(2)})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Discount / Round-off (₹)
                </label>
                {discNum > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountAmount('')}
                    className="text-[10px] text-slate-400 hover:text-white underline flex items-center gap-0.5"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Clear
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00 (e.g. 20)"
                className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Quick Concession / Round-off Chips */}
          {activeDue > 0 && (
            <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded-lg flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Quick Concession:</span>
              {paise > 0 && (
                <button
                  type="button"
                  onClick={() => applyQuickDiscount(paise)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-medium transition-colors"
                >
                  Round paise (-₹{paise.toFixed(2)})
                </button>
              )}
              {[10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => applyQuickDiscount(val)}
                  className={`px-2 py-0.5 rounded border text-[11px] font-mono font-bold transition-colors ${
                    discNum === val
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  -₹{val}
                </button>
              ))}
            </div>
          )}

          {/* Customer Paid Less Difference Action Banner */}
          {activeDue > 0 && unpaidDiff > 0.009 && discNum === 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs text-amber-200 truncate">
                  Customer paid <span className="font-black text-amber-300">₹{unpaidDiff.toFixed(2)} less</span> than due (₹{activeDue.toFixed(2)})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiscountAmount(unpaidDiff.toFixed(2))}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] rounded-lg uppercase tracking-wider shrink-0 transition-colors shadow-sm flex items-center gap-1"
              >
                <span>⚡ Apply ₹{unpaidDiff.toFixed(2)} as Discount</span>
              </button>
            </div>
          )}

          {/* Payment Method and Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="UPI" className="bg-slate-900 text-white">UPI / PhonePe / GPay</option>
                <option value="CASH" className="bg-slate-900 text-white">Cash</option>
                <option value="NEFT_RTGS" className="bg-slate-900 text-white">Bank Transfer (NEFT/RTGS)</option>
                <option value="CHEQUE" className="bg-slate-900 text-white">Cheque</option>
                <option value="CARD" className="bg-slate-900 text-white">Card</option>
              </select>
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
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Settlement Breakdown Card */}
          {activeDue > 0 && (amtNum > 0 || discNum > 0) && (
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span>Account Due Before Payment:</span>
                <span className="font-mono font-bold text-slate-200">₹{activeDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Amount Received ({paymentMethod}):</span>
                <span className="font-mono font-bold text-emerald-400">₹{amtNum.toFixed(2)}</span>
              </div>
              {discNum > 0 && (
                <div className="flex justify-between items-center text-amber-300">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    Settlement Cash Discount / Round-off:
                  </span>
                  <span className="font-mono font-bold text-amber-400">-₹{discNum.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-200">Total Settled on Account:</span>
                <span className="font-mono text-white text-sm">₹{totalSettled.toFixed(2)}</span>
              </div>
              <div className="pt-1 border-t border-slate-800/60 flex justify-between items-center text-xs">
                <span className="text-slate-400">Remaining Balance:</span>
                {remainingDue <= 0.009 ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[11px] border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Fully Settled (₹0.00)
                  </span>
                ) : (
                  <span className="font-mono font-bold text-amber-400">₹{remainingDue.toFixed(2)} remaining</span>
                )}
              </div>
              {excessToAdvance > 0 && (
                <div className="flex justify-between items-center text-amber-400 text-[11px] pt-1">
                  <span>Advance Credit (Excess):</span>
                  <span className="font-mono font-bold">+₹{excessToAdvance.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes / Concession Reason
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. ₹20 counter concession agreed with customer"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-lg shadow-emerald-600/20 uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
