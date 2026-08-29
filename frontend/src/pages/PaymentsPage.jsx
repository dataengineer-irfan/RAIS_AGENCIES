import React, { useState, useEffect } from 'react';
import { CreditCard, PlusCircle, Search, Eye, CheckCircle2, X } from 'lucide-react';
import { paymentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PaymentsPage = ({ onOpenPaymentModal }) => {
  const { hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentApi.list();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(term) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <span>Payments & Settlement Log</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cash, UPI & Bank settlements reconciled with open invoices
          </p>
        </div>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={() => onOpenPaymentModal(null, null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Settlement</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by payment number, customer, or transaction ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          />
        </div>
        <p className="text-xs text-slate-400 font-semibold hidden sm:block">
          Total: <span className="text-emerald-400 font-bold">{filteredPayments.length}</span> settlements
        </p>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Payment #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Reference / UTR</th>
                <th className="py-3 px-3 text-right">Amount (₹)</th>
                <th className="py-3 px-3 text-right">Allocated (₹)</th>
                <th className="py-3 px-3 text-right">Unallocated (₹)</th>
                <th className="py-3 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 text-xs">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 text-xs">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="text-emerald-400 hover:underline"
                      >
                        {p.payment_number}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">{p.payment_date}</td>
                    <td className="py-3 px-3 text-slate-200">
                      <p className="font-bold truncate max-w-[160px]">{p.customer_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{p.customer_code}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 text-slate-300 border border-slate-800">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {p.reference_number || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                      ₹{parseFloat(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">
                      ₹{parseFloat(p.allocated_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">
                      ₹{parseFloat(p.unallocated_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Drawer */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedPayment.payment_number}</h3>
                  <p className="text-xs text-slate-400">{selectedPayment.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Amount:</span>
                  <span className="font-mono font-bold text-white text-sm">₹{parseFloat(selectedPayment.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allocated to Invoices:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{parseFloat(selectedPayment.allocated_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unallocated Pool:</span>
                  <span className="font-mono font-bold text-amber-400">₹{parseFloat(selectedPayment.unallocated_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-slate-400">Method:</span>
                  <span className="font-semibold text-slate-200 uppercase">{selectedPayment.payment_method}</span>
                </div>
                {selectedPayment.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reference:</span>
                    <span className="font-mono text-slate-200">{selectedPayment.reference_number}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Allocated Invoices
                </h4>
                {selectedPayment.allocations?.length === 0 ? (
                  <p className="text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800">
                    No invoice allocations for this payment. Entire amount is unallocated.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedPayment.allocations?.map((alloc, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-200 font-mono">{alloc.invoice_number}</p>
                          <p className="text-[10px] text-slate-500">{alloc.allocated_at}</p>
                        </div>
                        <p className="font-mono font-bold text-emerald-400">₹{parseFloat(alloc.allocated_amount).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
