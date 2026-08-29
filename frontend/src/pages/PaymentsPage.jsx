import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  PlusCircle, 
  Search, 
  Eye, 
  CheckCircle2, 
  X,
  MessageSquare,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  FileText,
  DollarSign,
  Calendar
} from 'lucide-react';
import { paymentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PaymentsPage = ({ onOpenPaymentModal }) => {
  const { hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master-Detail State
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('metadata'); // metadata, allocations, actions
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async (selectId = null) => {
    setLoading(true);
    try {
      const data = await paymentApi.list();
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setPayments(items);
      if (items.length > 0) {
        setSelectedPaymentId(selectId || items[0].id);
      } else {
        setSelectedPaymentId(null);
      }
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppReceipt = (p) => {
    const amount = parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Payment Settlement Receipt*%0A%0AReceipt #: *${p.payment_number}*%0ACustomer: *${p.customer_name}*%0AAmount Received: *₹${amount}*%0AMethod: *${p.payment_method}*%0ARef / UTR: *${p.reference_number || 'Cash Deposit'}*%0ADate: *${p.payment_date}*%0A%0AThank you for your timely settlement!%0A*RAIS Agencies*, Rayachoty.`;
    window.open(`https://wa.me/919347453135?text=${text}`, '_blank');
  };

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.payment_number || '').toLowerCase().includes(term) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(term)) ||
      (p.payment_method && p.payment_method.toLowerCase().includes(term))
    );
  });

  const selectedPayment = payments.find(p => p.id === selectedPaymentId) || payments[0];
  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & SUMMARY HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Payment Settlements & Collection Ledger
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-emerald-400 rounded-full border border-slate-700 font-mono">
                ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Total Collected
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Master-Detail UPI, Cash & Bank Settlement Reconciliation with Invoices
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search receipt #, customer, UTR..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-60"
            />
          </div>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(null, null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Settlement</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Payment Vouchers ({filteredPayments.length})</span>
            <span>Amount Received</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matching payment settlements found.
              </div>
            ) : (
              filteredPayments.map(p => {
                const isSelected = p.id === selectedPaymentId;
                const amount = parseFloat(p.amount || 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPaymentId(p.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-emerald-400">
                          {p.payment_number}
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {p.payment_method}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {p.customer_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {p.payment_date} {p.reference_number ? `• UTR: ${p.reference_number}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-black text-xs text-emerald-400">
                          +₹{amount.toFixed(2)}
                        </div>
                        <span className="text-[9px] text-slate-500">
                          Alloc: ₹{parseFloat(p.allocated_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
          {selectedPayment ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      {selectedPayment.payment_number}
                      <button 
                        onClick={() => handleCopyCode(selectedPayment.payment_number)}
                        className="hover:text-white"
                        title="Copy Payment #"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedPayment.payment_method}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1">
                    {selectedPayment.customer_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Settled on {selectedPayment.payment_date} {selectedPayment.reference_number ? `• Ref: ${selectedPayment.reference_number}` : ''}
                  </p>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSendWhatsAppReceipt(selectedPayment)}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Send Receipt via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'metadata', label: 'Voucher & Method Details', icon: CreditCard },
                  { id: 'allocations', label: 'Invoice Allocations', icon: FileText },
                  { id: 'actions', label: 'Action Console', icon: CheckCircle2 },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Content Area (Internal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                
                {/* ─── TAB 1: METADATA & SETTLEMENT DETAILS ─── */}
                {activeInspectorTab === 'metadata' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Amount Received</span>
                        <div className="text-base font-black font-mono text-emerald-400 mt-1">
                          +₹{parseFloat(selectedPayment.amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Allocated to Bills</span>
                        <div className="text-base font-black font-mono text-white mt-1">
                          ₹{parseFloat(selectedPayment.allocated_amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Unallocated</span>
                        <div className="text-base font-black font-mono text-slate-400 mt-1">
                          ₹{(parseFloat(selectedPayment.amount || 0) - parseFloat(selectedPayment.allocated_amount || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Voucher Settlement Audit
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Payment Method:</span>
                          <span className="font-bold text-white uppercase">{selectedPayment.payment_method}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Bank UTR / Transaction Ref:</span>
                          <span className="font-mono font-bold text-amber-400">{selectedPayment.reference_number || 'Direct Cash Settlement'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] block">Settlement Notes / Narration:</span>
                          <span className="font-medium">{selectedPayment.notes || 'Account settlement recorded at Rayachoty commercial counter.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: INVOICE ALLOCATIONS ─── */}
                {activeInspectorTab === 'allocations' && (
                  <div className="space-y-3">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Allocated Invoices
                      </h4>
                      {selectedPayment.allocations && selectedPayment.allocations.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedPayment.allocations.map((alloc, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-white">{alloc.invoice_number || 'INV'}</span>
                                <p className="text-[10px] text-slate-400">{alloc.allocated_at || 'Settled'}</p>
                              </div>
                              <div className="font-mono font-bold text-emerald-400">
                                ₹{parseFloat(alloc.amount || 0).toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs py-4 text-center">
                          Voucher recorded with direct customer balance reconciliation.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: ACTION CONSOLE ─── */}
                {activeInspectorTab === 'actions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Operations available for payment voucher <strong className="text-white">{selectedPayment.payment_number}</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleSendWhatsAppReceipt(selectedPayment)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Send WhatsApp Receipt</div>
                          <span className="text-[10px] text-slate-400">Dispatch payment acknowledgement slip</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a payment voucher from the master list to inspect.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
