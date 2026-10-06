import React, { useState, useEffect, useMemo } from 'react';
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
  DollarSign,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { billingApi, customerApi } from '../services/api';
import { copyToClipboard, openWhatsApp } from '../utils/mobileHelpers';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { InvoiceBuilderModal } from '../components/InvoiceBuilderModal';
import { shareInvoiceOnWhatsApp } from '../utils/whatsappShare';
import { formatInvoiceDateTime } from '../utils/invoiceImageGenerator';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// ─── MODULE-LEVEL IN-MEMORY CACHE FOR INSTANT 0-MS INVOICE RENDERING ───
let _invoicesMemoryCache = null;

const getInitialInvoices = () => {
  if (Array.isArray(_invoicesMemoryCache) && _invoicesMemoryCache.length > 0) {
    return _invoicesMemoryCache;
  }
  try {
    const cached = sessionStorage.getItem('rais_invoices_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _invoicesMemoryCache = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  return [];
};

export const BillingPage = ({ onOpenInvoiceBuilder, onOpenPaymentForInvoice }) => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState(getInitialInvoices);
  const [loading, setLoading] = useState(() => {
    const initial = getInitialInvoices();
    return initial.length === 0;
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master-Detail State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(() => {
    const initial = getInitialInvoices();
    return initial.length > 0 ? initial[0].id : null;
  });
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('items'); // items, payment, print
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // Modals
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusToSet, setStatusToSet] = useState('CANCELLED');
  const [statusReason, setStatusReason] = useState('');

  // Delete Invoice State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [notification, setNotification] = useState(null);

  // Edit Bill State
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState(null);

  // Lock body scroll on touch devices when modals are open
  const anyModalOpen = thermalModalOpen || statusModalOpen || deleteModalOpen || editInvoiceModalOpen;
  useBodyScrollLock(anyModalOpen);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async (selectId = null) => {
    // Only show full loading skeleton if we have zero invoices in memory/cache
    if (invoices.length === 0 && !getInitialInvoices().length) {
      setLoading(true);
    }
    try {
      const data = await billingApi.listInvoices();
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setInvoices(items);
      _invoicesMemoryCache = items;
      try {
        sessionStorage.setItem('rais_invoices_cache', JSON.stringify(items));
      } catch (e) {}
      if (items.length > 0) {
        const initialId = selectId || selectedInvoiceId || items[0].id;
        setSelectedInvoiceId(initialId);
        const match = items.find(i => i.id === initialId) || items[0];
        setSelectedInvoiceDetails(match);
        loadInvoiceDetails(match.id, true);
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

  const loadInvoiceDetails = async (invoiceId, isBackground = false) => {
    if (!isBackground) {
      setDetailsLoading(true);
    }
    try {
      const details = await billingApi.getInvoice(invoiceId);
      setSelectedInvoiceDetails(details);
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    } finally {
      if (!isBackground) {
        setDetailsLoading(false);
      }
    }
  };

  const handleSelectInvoice = (inv) => {
    setSelectedInvoiceId(inv.id);
    setSelectedInvoiceDetails(inv);
    setMobileView('detail');
    loadInvoiceDetails(inv.id, true);
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

  const handleCopyCode = async (code) => {
    await copyToClipboard(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppInvoice = async (inv) => {
    if (!inv) return;
    let fullInvoice = inv;
    if (!fullInvoice.items || fullInvoice.items.length === 0) {
      try {
        fullInvoice = await billingApi.getInvoice(inv.id);
      } catch (e) {
        console.warn('Could not fetch full invoice items, sharing available data:', e);
      }
    }
    await shareInvoiceOnWhatsApp({
      invoice: fullInvoice,
      customer: {
        business_name: fullInvoice.customer_name,
        phone: fullInvoice.customer_phone,
        address: fullInvoice.customer_address,
        customer_code: fullInvoice.customer_code,
        outstanding_balance: fullInvoice.customer_outstanding_balance
      },
      items: fullInvoice.items || []
    });
  };

  const handleDeleteInvoice = async (inv) => {
    if (!inv) return;
    setIsDeletingInvoice(true);
    try {
      await billingApi.deleteInvoice(inv.id);
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
      setNotification({
        type: 'success',
        message: `Invoice ${inv.invoice_number} deleted successfully. Stock restored to depot inventory.`
      });
      setTimeout(() => setNotification(null), 4000);
      await loadInvoices();
    } catch (err) {
      console.error('Failed to delete invoice', err);
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to delete invoice.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    return invoices.filter(inv => {
      if (activeStatusFilter !== 'ALL') {
        if (inv.status !== activeStatusFilter) return false;
      }
      if (term) {
        const matches = (
          (inv.invoice_number || '').toLowerCase().includes(term) ||
          (inv.customer_name || '').toLowerCase().includes(term) ||
          (inv.customer_code || '').toLowerCase().includes(term)
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [invoices, activeStatusFilter, searchTerm]);

  const selectedInvoice = selectedInvoiceDetails || invoices.find(i => i.id === selectedInvoiceId);

  useEffect(() => {
    if (filteredInvoices.length > 0) {
      const isStillPresent = selectedInvoiceId && filteredInvoices.some(i => i.id === selectedInvoiceId);
      if (!isStillPresent) {
        const next = filteredInvoices[0];
        setSelectedInvoiceId(next.id);
        setSelectedInvoiceDetails(next);
        loadInvoiceDetails(next.id, true);
      }
    }
  }, [filteredInvoices, selectedInvoiceId]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── DESKTOP TOP ACTION & FILTER HEADER BAR (>= md) ─── */}
      <div className="hidden md:flex flex-col gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-2">
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
                  {loading && invoices.length === 0 ? 'Syncing...' : invoices.length > 0 ? `${invoices.length} Invoices` : 'Invoices'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wholesale Invoicing, 58mm Thermal POS Print & Direct Settlement
              </p>
            </div>
          </div>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={onOpenInvoiceBuilder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Invoice</span>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice # or customer..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[140px]"
          >
            <option value="ALL">All Status</option>
            <option value="ISSUED">Issued / Open</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="DRAFT">Drafts</option>
          </select>
        </div>
      </div>

      {/* ─── MOBILE COMPACT SEARCH & ACTION BAR (< md) ─── */}
      <div className="md:hidden flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1.5 shrink-0 shadow-sm">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={invoices.length > 0 ? `Search ${invoices.length} invoices...` : "Search invoices..."}
            className="w-full pl-8 pr-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={activeStatusFilter}
          onChange={(e) => setActiveStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer shrink-0 max-w-[95px]"
        >
          <option value="ALL">All</option>
          <option value="ISSUED">Open</option>
          <option value="PARTIALLY_PAID">Partial</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="DRAFT">Draft</option>
        </select>

        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={onOpenInvoiceBuilder}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shrink-0 shadow-sm active:scale-95 transition"
            title="Create Tax Invoice"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Bill</span>
          </button>
        )}
      </div>

      {/* ─── MOBILE VIEW SWITCHER (< lg) ─── */}
      <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'list'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{loading && invoices.length === 0 ? 'Invoices' : invoices.length > 0 ? `Invoices (${filteredInvoices.length})` : 'Invoices'}</span>
        </button>
        <button
          onClick={() => setMobileView('detail')}
          disabled={!selectedInvoice}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'detail'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white disabled:opacity-40'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Invoice Details</span>
        </button>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (Invoices List) ─── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>{loading && invoices.length === 0 ? 'Tax Invoices' : invoices.length > 0 ? `Tax Invoices (${filteredInvoices.length})` : 'Tax Invoices'}</span>
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
              (filteredInvoices || []).map(inv => {
                const isSelected = inv?.id === selectedInvoiceId;
                const total = parseFloat(inv?.total_amount || 0);
                const outstanding = parseFloat(inv?.outstanding_amount || 0);

                return (
                  <div
                    key={inv?.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {inv?.invoice_number || 'INV'}
                        </span>
                        <StatusBadge status={inv?.status} />
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {inv?.customer_name || 'Customer'}
                      </h4>
                      <p className="text-xs text-slate-400 truncate">
                        {formatInvoiceDateTime(inv?.invoice_date, inv?.created_at).fullText} • {inv?.items_count || (inv?.items ? inv.items.length : 0)} line items
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-bold text-xs text-white">
                          ₹{parseFloat(total || 0).toFixed(2)}
                        </div>
                        <span className={`text-xs font-mono ${outstanding > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                          Due: ₹{parseFloat(outstanding || 0).toFixed(2)}
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

        {/* ─── RIGHT DETAIL INSPECTOR ─── */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl flex-col overflow-hidden`}>
          {/* Mobile Back Button */}
          <div className="lg:hidden pb-2 mb-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Invoices List</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              {loading && invoices.length === 0 ? '' : filteredInvoices.length > 0 ? `${filteredInvoices.length} Invoices` : ''}
            </span>
          </div>
          {selectedInvoice ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
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
                  <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                    {selectedInvoice.customer_name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Billed on {formatInvoiceDateTime(selectedInvoice.invoice_date, selectedInvoice.created_at).fullText} {selectedInvoice.due_date ? `• Due: ${selectedInvoice.due_date}` : ''}
                    {selectedInvoice.customer_since && (
                      <span className="block mt-0.5 text-[11px] text-amber-400/90 font-medium">
                        🤝 Associated Since: {new Date(selectedInvoice.customer_since).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </p>
                </div>

                {/* Direct Action Chips - Partitioned with Fitts's Law Touch Target Safety (Min 44-48px targets) */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Primary Dispatch Action: High-contrast Thermal Slip */}
                  <button
                    onClick={() => setThermalModalOpen(true)}
                    className="min-h-[44px] sm:min-h-[48px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-blue-600/20"
                    title="Print 58mm/80mm Thermal Receipt with UPI QR"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Thermal Slip</span>
                  </button>

                  {/* Secondary Dispatch Action: WhatsApp Bill */}
                  <button
                    onClick={() => handleSendWhatsAppInvoice(selectedInvoice)}
                    className="min-h-[44px] sm:min-h-[48px] px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                    title="Send Invoice via WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Bill</span>
                  </button>

                  {/* Secondary Utilities: A4 PDF & Edit Bill */}
                  <a
                    href={billingApi.getPrintHtmlUrl(selectedInvoice.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                    title="Standard A4 Tax Invoice PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </a>

                  {parseFloat(selectedInvoice.paid_amount || 0) === 0 && hasRole(['ADMIN', 'OPERATOR']) && (
                    <button
                      onClick={() => {
                        setInvoiceToEdit(selectedInvoiceDetails || selectedInvoice);
                        setEditInvoiceModalOpen(true);
                      }}
                      className="min-h-[44px] sm:min-h-[48px] px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                      title="Edit Customer, Line Items, or Quantities (Stock Auto-Reconciled)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                  )}

                  {/* Danger Group: Delete (Isolated border to prevent accidental mis-taps) */}
                  {selectedInvoice.status !== 'PAID' && hasRole(['ADMIN']) && (
                    <div className="flex items-center pl-1.5 border-l border-slate-800">
                      <button
                        onClick={() => {
                          setInvoiceToDelete(selectedInvoice);
                          setDeleteModalOpen(true);
                        }}
                        className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex items-center justify-center p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl text-xs font-bold transition-all active:scale-95"
                        title="Delete Invoice & Restore Stock"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                    {detailsLoading && (!selectedInvoice.items || selectedInvoice.items.length === 0) ? (
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.brand && (
                                    <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">{item.brand}</span>
                                  )}
                                  {item.product_sku && (
                                    <span className="font-mono text-[10px] text-slate-400">{item.product_sku}</span>
                                  )}
                                  {item.hsn_code && (
                                    <span className="font-mono text-[9px] text-slate-500">HSN: {item.hsn_code}</span>
                                  )}
                                </div>
                                <h5 className="font-bold text-white text-xs truncate mt-0.5">
                                  {item.item_description || item.item_name || item.product_name || 'Item'}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.quantity} {item.packaging_unit || 'units'} @ ₹{parseFloat(item.unit_price || 0).toFixed(2)}
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
                        href={billingApi.getPrintHtmlUrl(selectedInvoice.id)}
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

                      {parseFloat(selectedInvoice.paid_amount || 0) === 0 && hasRole(['ADMIN', 'OPERATOR']) && (
                        <button
                          onClick={() => {
                            setInvoiceToEdit(selectedInvoiceDetails || selectedInvoice);
                            setEditInvoiceModalOpen(true);
                          }}
                          className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                        >
                          <Pencil className="w-5 h-5 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-white">Edit Bill / Change Customer</div>
                            <span className="text-[10px] text-slate-400">Switch outlet, fix line items, auto-reconcile stock</span>
                          </div>
                        </button>
                      )}

                      {selectedInvoice.status !== 'PAID' && hasRole(['ADMIN']) && (
                        <button
                          onClick={() => {
                            setInvoiceToDelete(selectedInvoice);
                            setDeleteModalOpen(true);
                          }}
                          className="p-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-600/30 rounded-xl flex items-center gap-2.5 text-left text-rose-400 transition-all hover:scale-[1.02]"
                        >
                          <Trash2 className="w-5 h-5 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-rose-300">Delete Invoice</div>
                            <span className="text-[10px] text-rose-400/80">Permanent purge & restores warehouse stock</span>
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

      {/* ─── DELETE INVOICE CONFIRMATION MODAL ─── */}
      {deleteModalOpen && invoiceToDelete && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget && !isDeletingInvoice) setDeleteModalOpen(false); }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Invoice {invoiceToDelete.invoice_number}</h3>
                <p className="text-xs text-rose-400/90 font-medium">Permanent invoice deletion</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{invoiceToDelete.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Invoice Amount:</span>
                <span className="font-mono font-black text-rose-400 text-sm">
                  ₹{parseFloat(invoiceToDelete.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              Deleting this invoice will <strong>automatically restore all deducted product stock</strong> back to the Rayachoty depot inventory and remove this bill from customer outstanding balance.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeletingInvoice}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteInvoice(invoiceToDelete)}
                disabled={isDeletingInvoice}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingInvoice ? 'Restoring Stock & Deleting...' : 'Delete & Restore Stock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editInvoiceModalOpen && invoiceToEdit && (
        <InvoiceBuilderModal
          isOpen={editInvoiceModalOpen}
          invoiceToEdit={invoiceToEdit}
          onClose={() => {
            setEditInvoiceModalOpen(false);
            setInvoiceToEdit(null);
          }}
          onInvoiceCreated={(updatedInv) => {
            setEditInvoiceModalOpen(false);
            setInvoiceToEdit(null);
            setNotification({
              type: 'success',
              message: `Bill ${updatedInv.invoice_number} updated successfully! Stock reconciled.`
            });
            setTimeout(() => setNotification(null), 4500);
            loadInvoices(updatedInv.id);
          }}
        />
      )}

      {/* Floating Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{notification.message}</span>
        </div>
      )}

    </div>
  );
};
