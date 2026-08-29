import React, { useState, useEffect } from 'react';
import { 
  Users, 
  X, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  ShoppingBag, 
  History, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { customerApi, billingApi, orderApi, paymentApi } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '../context/AuthContext';

export const CustomerProfileModal = ({ 
  isOpen, 
  onClose, 
  customer, 
  onOpenOrder, 
  onOpenInvoice, 
  onOpenPayment 
}) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, orders, invoices, payments, ledger
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerWorkspace();
    }
  }, [isOpen, customer]);

  const loadCustomerWorkspace = async () => {
    setLoading(true);
    try {
      const [invs, ords, pays, led] = await Promise.all([
        billingApi.listInvoices({ customer_id: customer.id }),
        orderApi.list({ customer_id: customer.id }),
        paymentApi.list({ customer_id: customer.id }),
        customerApi.getLedger(customer.id)
      ]);
      setInvoices(invs);
      setOrders(ords);
      setPayments(pays);
      setLedger(led);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-6 flex flex-col max-h-[90vh]">
        
        {/* Header with Quick Actions */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xl">
              {customer.business_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white leading-tight">{customer.business_name}</h2>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {customer.customer_code}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Contact: <span className="text-slate-200 font-semibold">{customer.contact_person}</span> • Phone: {customer.phone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {hasRole(['ADMIN', 'OPERATOR']) && (
              <>
                <button
                  onClick={() => onOpenOrder(customer)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  <span>+ New Order</span>
                </button>
                <button
                  onClick={() => onOpenInvoice(customer)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>+ Create Invoice</span>
                </button>
                <button
                  onClick={() => onOpenPayment(customer)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>+ Record Payment</span>
                </button>
              </>
            )}
            <button onClick={onClose} title="Close Profile" className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Total Invoiced</span>
            <p className="text-sm font-black text-slate-200 mt-0.5">₹{parseFloat(customer.total_invoiced).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Total Paid</span>
            <p className="text-sm font-black text-emerald-400 mt-0.5">₹{parseFloat(customer.total_paid).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Outstanding Balance</span>
            <p className="text-sm font-black text-amber-400 mt-0.5">₹{parseFloat(customer.outstanding_balance).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Credit Limit</span>
            <p className="text-sm font-black text-slate-300 mt-0.5">₹{parseFloat(customer.credit_limit || 0).toFixed(2)}</p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900">
          {[
            { id: 'overview', label: 'Overview & Profile' },
            { id: 'ledger', label: `Ledger Timeline (${ledger.length})` },
            { id: 'invoices', label: `Invoices (${invoices.length})` },
            { id: 'orders', label: `Orders (${orders.length})` },
            { id: 'payments', label: `Payments (${payments.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
          {loading ? (
            <p className="text-slate-500 text-center py-12">Loading customer profile details...</p>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <h3 className="font-bold uppercase tracking-wider text-slate-300 text-[11px] mb-2">
                      Business Details
                    </h3>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Business Name:</span>
                      <span className="font-semibold text-white">{customer.business_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact Person:</span>
                      <span className="text-slate-200">{customer.contact_person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Primary Phone:</span>
                      <span className="text-slate-200">{customer.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Alternate Phone:</span>
                      <span className="text-slate-200">{customer.secondary_phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GSTIN / Tax ID:</span>
                      <span className="font-mono text-slate-200">{customer.gstin || 'Unregistered'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                    <h3 className="font-bold uppercase tracking-wider text-slate-300 text-[11px] mb-2">
                      Billing & Location
                    </h3>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="text-slate-200 text-right">{customer.address_line1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">City / Pincode:</span>
                      <span className="text-slate-200">{customer.city} - {customer.pincode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">State:</span>
                      <span className="text-slate-200">{customer.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Account Status:</span>
                      <StatusBadge status={customer.status} />
                    </div>
                    {customer.notes && (
                      <div className="pt-2 border-t border-slate-800">
                        <span className="text-slate-400">Notes:</span>
                        <p className="text-slate-300 mt-1 italic">{customer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ledger' && (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] uppercase font-bold text-slate-400 font-sans">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference / Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {ledger.length === 0 ? (
                        <tr><td colSpan="5" className="py-8 text-center text-slate-500 font-sans">No statement records found.</td></tr>
                      ) : (
                        ledger.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30">
                            <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{entry.date}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span className="font-bold text-slate-200 font-mono">{entry.reference}</span>
                              <p className="text-[10px] text-slate-500">{entry.description}</p>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-300">
                              {parseFloat(entry.debit) > 0 ? `₹${parseFloat(entry.debit).toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-400">
                              {parseFloat(entry.credit) > 0 ? `₹${parseFloat(entry.credit).toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                              ₹{parseFloat(entry.running_balance).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-2">
                  {invoices.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No invoices found for this customer.</p>
                  ) : (
                    invoices.map(inv => (
                      <div key={inv.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-amber-400">{inv.invoice_number}</p>
                          <p className="text-[11px] text-slate-400">Date: {inv.invoice_date} | Due: {inv.due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-slate-200">₹{parseFloat(inv.total_amount).toFixed(2)}</p>
                          <p className="text-[10px] text-amber-400 font-mono">Due: ₹{parseFloat(inv.outstanding_amount).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No orders placed by this customer yet.</p>
                  ) : (
                    orders.map(ord => (
                      <div key={ord.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-amber-400">{ord.order_number}</p>
                          <p className="text-[11px] text-slate-400">Date: {ord.order_date} • {ord.items?.length || 0} Items</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            {ord.status}
                          </span>
                          <p className="font-mono font-bold text-slate-200 mt-1">₹{parseFloat(ord.total_amount).toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {payments.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No payments recorded from this customer yet.</p>
                  ) : (
                    payments.map(pay => (
                      <div key={pay.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="font-mono font-bold text-emerald-400">{pay.payment_number}</p>
                          <p className="text-[11px] text-slate-400">{pay.payment_date} • {pay.payment_method}</p>
                        </div>
                        <p className="font-mono font-black text-emerald-400 text-sm">
                          ₹{parseFloat(pay.amount).toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg uppercase tracking-wider"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};
