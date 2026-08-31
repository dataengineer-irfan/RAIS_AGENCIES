import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Printer, 
  Eye, 
  CreditCard, 
  Filter, 
  CheckCircle, 
  Ban, 
  X, 
  Calendar,
  Search,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ExternalLink,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { billingApi, customerApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';

export const BillingPage = ({ onOpenInvoiceBuilder, onOpenPaymentForInvoice }) => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master-Detail State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('items'); // items, payment, print
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusToSet, setStatusToSet] = useState('CANCELLED');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [activeStatusFilter]);

  const loadInvoices = async (selectId = null) => {
    setLoading(true);
    try {
      const params = {};
      if (activeStatusFilter !== 'ALL') {
        params.status = activeStatusFilter;
      }
      const data = await billingApi.listInvoices(params);
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setInvoices(items);
      if (items.length > 0) {
        const initialId = selectId || items[0].id;
        setSelectedInvoiceId(initialId);
        loadInvoiceDetails(initialId);
      } else {
        setSelectedInvoiceId(null);
        setSelectedInvoiceDetails(null);
      }
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (invoiceId) => {
    setDetailsLoading(true);
    try {
      const details = await billingApi.getInvoice(invoiceId);
      setSelectedInvoiceDetails(details);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectInvoice = (inv) => {
    setSelectedInvoiceId(inv.id);
    loadInvoiceDetails(inv.id);
  };

  const handleIssueDraft = async (invoiceId) => {
    try {
      await billingApi.issueInvoice(invoiceId);
      await loadInvoices(invoiceId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue invoice');
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;
    try {
      await billingApi.updateStatus(selectedInvoiceId, statusToSet, statusReason);
      setStatusModalOpen(false);
      setStatusReason('');
      await loadInvoices(selectedInvoiceId);
    } catch (err) {
      alert(err.response?.data?.message || 'Status change failed');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppInvoice = (inv) => {
    const total = parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const due = parseFloat(inv.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Tax Invoice Receipt*%0A%0AInvoice #: *${inv.invoice_number}*%0ACustomer: *${inv.customer_name}*%0ADate: *${inv.invoice_date}*%0ATotal Amount: *₹${total}*%0ABalance Due: *₹${due}*%0A%0APlease arrange settlement via UPI (*9347453135@ybl*).%0A%0A*RAIS Agencies*, Rayachoty.`;
    window.open(`https://wa.me/91${inv.customer_phone || '9347453135'}?text=${text}`, '_blank');
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (inv.invoice_number || '').toLowerCase().includes(term) ||
      (inv.customer_name || '').toLowerCase().includes(term) ||
      (inv.customer_code || '').toLowerCase().includes(term)
    );
  });

  const selectedInvoice = selectedInvoiceDetails || invoices.find(i => i.id === selectedInvoiceId);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & FILTER HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Billing & Wholesale Invoices Hub
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {invoices.length} Invoices
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Wholesale Invoicing, 58mm Thermal POS Print & Direct Settlement
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
              placeholder="Search invoice # or customer..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
            />
          </div>

          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ISSUED">Issued / Open</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DRAFT">Drafts</option>
          </select>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={onOpenInvoiceBuilder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Tax Invoices ({filteredInvoices.length})</span>
            <span>Total / Due</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matching invoices found.
              </div>
            ) : (
              filteredInvoices.map(inv => {
                const isSelected = inv.id === selectedInvoiceId;
                const total = parseFloat(inv.total_amount || 0);
                const outstanding = parseFloat(inv.outstanding_amount || 0);

                return (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-amber-400">
                          {inv.invoice_number}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {inv.customer_name}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {inv.invoice_date} • {inv.items_count || (inv.items ? inv.items.length : 0)} line items
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-bold text-xs text-white">
                          ₹{total.toFixed(2)}
                        </div>
                        <span className={`text-[9px] font-mono ${outstanding > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                          Due: ₹{outstanding.toFixed(2)}
                        </span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
          {selectedInvoice ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                      {selectedInvoice.invoice_number}
                      <button 
                        onClick={() => handleCopyCode(selectedInvoice.invoice_number)}
                        className="hover:text-white"
                        title="Copy Invoice #"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>
                    <StatusBadge status={selectedInvoice.status} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white mt-1">
                    {selectedInvoice.customer_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Billed on {selectedInvoice.invoice_date} {selectedInvoice.due_date ? `• Due: ${selectedInvoice.due_date}` : ''}
                  </p>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setThermalModalOpen(true)}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Print 58mm/80mm Thermal Receipt with UPI QR"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Thermal</span>
                  </button>

                  <a
                    href={`/api/invoices/${selectedInvoice.id}/print-html`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-xl text-xs font-bold transition-colors"
                    title="Standard A4 Tax Invoice PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleSendWhatsAppInvoice(selectedInvoice)}
                    className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
                    title="Send Invoice via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'items', label: 'Itemized Line Items', icon: FileText },
                  { id: 'payment', label: 'Settlement & Ledger', icon: CreditCard },
                  { id: 'actions', label: 'Action Console', icon: CheckCircle },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
                
                {/* ─── TAB 1: ITEMIZED TAX INVOICE LINES ─── */}
                {activeInspectorTab === 'items' && (
                  <div className="space-y-3">
                    {detailsLoading ? (
                      <div className="space-y-2 animate-pulse py-4">
                        <div className="h-10 bg-slate-800 rounded" />
                        <div className="h-10 bg-slate-800 rounded" />
                      </div>
                    ) : !selectedInvoice.items || selectedInvoice.items.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No line items recorded on this invoice.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          {selectedInvoice.items.map((item, idx) => (
                            <div 
                              key={idx}
                              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                            >
                              <div className="overflow-hidden pr-2">
                                <span className="font-mono text-[10px] text-amber-400 font-bold">{item.product_sku || 'SKU'}</span>
                                <h5 className="font-bold text-white text-xs truncate mt-0.5">{item.product_name}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.quantity} units @ ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-white text-xs">
                                  ₹{parseFloat(item.line_total || item.total_amount || 0).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Invoice Pricing Summary Banner */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Billing Structure</span>
                            <span className="text-slate-300 font-mono">
                              Direct Wholesale • No Tax Added
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Invoiced Amount</span>
                            <span className="text-base font-black text-amber-400 font-mono">
                              ₹{parseFloat(selectedInvoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB 2: PAYMENT & SETTLEMENT STATUS ─── */}
                {activeInspectorTab === 'payment' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Total Amount</span>
                        <div className="text-base font-black font-mono text-white mt-1">
                          ₹{parseFloat(selectedInvoice.total_amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Amount Paid</span>
                        <div className="text-base font-black font-mono text-emerald-400 mt-1">
                          ₹{parseFloat(selectedInvoice.paid_amount || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Balance Due</span>
                        <div className={`text-base font-black font-mono mt-1 ${parseFloat(selectedInvoice.outstanding_amount || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          ₹{parseFloat(selectedInvoice.outstanding_amount || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {parseFloat(selectedInvoice.outstanding_amount || 0) > 0 && onOpenPaymentForInvoice && (
                      <button
                        onClick={() => onOpenPaymentForInvoice(selectedInvoice)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Record Payment for this Invoice</span>
                      </button>
                    )}
                  </div>
                )}

                {/* ─── TAB 3: ACTION CONSOLE ─── */}
                {activeInspectorTab === 'actions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      Operations available for invoice <strong className="text-white">{selectedInvoice.invoice_number}</strong>:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setThermalModalOpen(true)}
                        className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-2.5 text-left text-blue-400 transition-all hover:scale-[1.02]"
                      >
                        <Printer className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">58mm/80mm Thermal Receipt</div>
                          <span className="text-[10px] text-slate-400">ESC/POS counter receipt with UPI QR</span>
                        </div>
                      </button>

                      <a
                        href={`/api/invoices/${selectedInvoice.id}/print-html`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl flex items-center gap-2.5 text-left text-slate-300 transition-all hover:scale-[1.02]"
                      >
                        <Eye className="w-5 h-5" />
                        <div>
                          <div className="font-bold text-xs text-white">Standard A4 Invoice</div>
                          <span className="text-[10px] text-slate-400">Full formal B2B wholesale invoice</span>
                        </div>
                      </a>

                      {selectedInvoice.status === 'DRAFT' && hasRole(['ADMIN', 'OPERATOR']) && (
                        <button
                          onClick={() => handleIssueDraft(selectedInvoice.id)}
                          className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                        >
                          <CheckCircle className="w-5 h-5" />
                          <div>
                            <div className="font-bold text-xs text-white">Issue Official Invoice</div>
                            <span className="text-[10px] text-slate-400">Finalize draft & lock number</span>
                          </div>
                        </button>
                      )}

                      {selectedInvoice.status !== 'CANCELLED' && hasRole(['ADMIN']) && (
                        <button
                          onClick={() => setStatusModalOpen(true)}
                          className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-left text-rose-400 transition-all hover:scale-[1.02]"
                        >
                          <Ban className="w-5 h-5" />
                          <div>
                            <div className="font-bold text-xs text-white">Cancel Invoice</div>
                            <span className="text-[10px] text-slate-400">Void invoice with reason note</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an invoice from the master list to inspect.
            </div>
          )}
        </div>

      </div>

      {/* ─── 58MM/80MM THERMAL RECEIPT MODAL ─── */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        invoiceId={selectedInvoiceId}
      />

      {/* ─── STATUS CANCELLATION MODAL ─── */}
      {statusModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setStatusModalOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Cancel / Void Invoice</h3>
            <p className="text-xs text-slate-400">
              Provide an audit reason for cancelling invoice <strong className="text-white">{selectedInvoice?.invoice_number}</strong>.
            </p>
            <form onSubmit={handleStatusSubmit} className="space-y-3">
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Reason for cancellation (e.g., Order changed, duplicate billing)..."
                required
                className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
