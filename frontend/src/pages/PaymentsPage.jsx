import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { paymentApi } from '../services/api';
import { copyToClipboard, openWhatsApp } from '../utils/mobileHelpers';
import { useAuth } from '../context/AuthContext';
import { EditPaymentModal } from '../components/EditPaymentModal';

const formatVoucherDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const parts = String(dateStr).split('T')[0].split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
};

export const PaymentsPage = ({ onOpenPaymentModal, onNavigate }) => {
  const { hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMethodFilter, setActiveMethodFilter] = useState('ALL'); // ALL, CASH, UPI, BANK
  
  // Master-Detail State
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('metadata'); // metadata, allocations, actions
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCardPaymentId, setCopiedCardPaymentId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // Edit and Delete State
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async (selectId = null) => {
    setLoading(true);
    try {
      const [data, summary] = await Promise.all([
        paymentApi.list(),
        paymentApi.getSummary().catch(() => null)
      ]);
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setPayments(items);
      if (summary) setSummaryData(summary);
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

  const handleCopyCode = async (code) => {
    await copyToClipboard(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendWhatsAppReceipt = (p) => {
    const amount = parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Payment Settlement Receipt*\n\nReceipt #: *${p.payment_number}*\nCustomer: *${p.customer_name}*\nAmount Received: *₹${amount}*\nMethod: *${p.payment_method}*\nRef / UTR: *${p.reference_number || 'Cash Deposit'}*\nDate: *${p.payment_date}*\n\nThank you for your timely settlement!\n*RAIS Agencies*, Rayachoty.`;
    openWhatsApp('9347453135', text);
  };

  const executeDeletePayment = async (payment) => {
    if (!payment) return;
    setIsDeleting(true);
    try {
      await paymentApi.delete(payment.id);
      setDeleteConfirmModal(null);
      setNotification({
        type: 'success',
        message: `Payment voucher ${payment.payment_number} deleted. Allocations reversed and balances updated.`
      });
      setTimeout(() => setNotification(null), 4000);
      await loadPayments();
    } catch (err) {
      console.error('Failed to delete payment', err);
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || err?.message || 'Failed to delete payment voucher.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Micro-Metrics & Payment Method Counts for 1-Click Ribbon
  const methodCounts = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let bank = 0;
    for (const p of payments) {
      const m = (p.payment_method || '').toUpperCase();
      if (m.includes('CASH')) cash++;
      else if (m.includes('UPI')) upi++;
      else if (m.includes('BANK') || m.includes('NEFT') || m.includes('RTGS') || m.includes('CHEQUE')) bank++;
    }
    return {
      total: payments.length,
      cash,
      upi,
      bank
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (activeMethodFilter !== 'ALL') {
        const m = (p.payment_method || '').toUpperCase();
        if (activeMethodFilter === 'CASH' && !m.includes('CASH')) return false;
        if (activeMethodFilter === 'UPI' && !m.includes('UPI')) return false;
        if (activeMethodFilter === 'BANK' && (!m.includes('BANK') && !m.includes('NEFT') && !m.includes('RTGS') && !m.includes('CHEQUE'))) return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (p.payment_number || '').toLowerCase().includes(term) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(term)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    });
  }, [payments, activeMethodFilter, searchTerm]);

  const selectedPayment = payments.find(p => p.id === selectedPaymentId) || payments[0];
  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── DESKTOP UNIFIED COMMAND RIBBON (>= md) ─── */}
      <div className="hidden md:flex items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-1.5 shrink-0 shadow-md min-h-[46px]">
        {/* Left: Back Button + Icon & Title */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl bg-slate-950 hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-800"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>
          )}
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black text-white whitespace-nowrap">
              Payments Ledger
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-emerald-400 rounded-full border border-slate-700 font-mono">
              {loading && payments.length === 0 ? 'Syncing...' : `${filteredPayments.length}/${payments.length}`}
            </span>
          </div>
        </div>

        {/* Center: 1-Click Method Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveMethodFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeMethodFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All ({methodCounts.total})
          </button>
          <button
            onClick={() => setActiveMethodFilter(activeMethodFilter === 'CASH' ? 'ALL' : 'CASH')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeMethodFilter === 'CASH'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <span>💵 Cash</span>
            <span className="font-mono text-[11px]">({methodCounts.cash})</span>
          </button>
          <button
            onClick={() => setActiveMethodFilter(activeMethodFilter === 'UPI' ? 'ALL' : 'UPI')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeMethodFilter === 'UPI'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30'
            }`}
          >
            <span>📱 UPI</span>
            <span className="font-mono text-[11px]">({methodCounts.upi})</span>
          </button>
          <button
            onClick={() => setActiveMethodFilter(activeMethodFilter === 'BANK' ? 'ALL' : 'BANK')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              activeMethodFilter === 'BANK'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 ring-1 ring-purple-400'
                : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'
            }`}
          >
            <span>🏦 Bank</span>
            <span className="font-mono text-[11px]">({methodCounts.bank})</span>
          </button>
        </div>

        {/* Center-Right: Omni-Search Input with Clear */}
        <div className="relative flex-1 max-w-[240px] min-w-[140px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search receipt #, outlet, UTR..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Collection Micro-Ticker */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] shrink-0">
          <span className="text-emerald-400">All-Time: <strong className="font-bold">₹{(summaryData?.total_collected_all_time || totalCollected).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
          {summaryData?.total_collected_this_month !== undefined && (
            <>
              <span className="text-slate-700">|</span>
              <span className="text-amber-400">{summaryData.current_month_str}: <strong className="font-bold">₹{parseFloat(summaryData.total_collected_this_month).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
            </>
          )}
        </div>

        {/* Right: + Settlement CTA */}
        {hasRole(['ADMIN', 'OPERATOR']) && (
          <button
            onClick={() => onOpenPaymentModal && onOpenPaymentModal(null, null)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ Settlement</span>
          </button>
        )}
      </div>

      {/* ─── MOBILE SLEEK ACTION BAR (< md) ─── */}
      <div className="md:hidden flex flex-col gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-2 shrink-0 shadow-sm">
        <div className="flex items-center gap-1.5">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-bold border border-slate-700 shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px]">Back</span>
            </button>
          )}
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${payments.length} vouchers...`}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(null, null)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs shrink-0 shadow-sm active:scale-95 transition"
              title="Record Settlement"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Pay</span>
            </button>
          )}
        </div>

        {/* Mobile 1-Click Method Filter & Ticker Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px] font-mono">
          <button
            onClick={() => setActiveMethodFilter('ALL')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              activeMethodFilter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 border border-slate-800'
            }`}
          >
            All ({methodCounts.total})
          </button>
          <button
            onClick={() => setActiveMethodFilter(activeMethodFilter === 'CASH' ? 'ALL' : 'CASH')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              activeMethodFilter === 'CASH'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}
          >
            💵 Cash ({methodCounts.cash})
          </button>
          <button
            onClick={() => setActiveMethodFilter(activeMethodFilter === 'UPI' ? 'ALL' : 'UPI')}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              activeMethodFilter === 'UPI'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            📱 UPI ({methodCounts.upi})
          </button>
          <span className="text-slate-700 mx-0.5">|</span>
          <span className="text-emerald-400/90 whitespace-nowrap px-1 py-0.5 font-bold">
            ₹{parseFloat(summaryData?.total_collected_all_time || totalCollected).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Payment Vouchers ({filteredPayments.length})</span>
            <span>Amount Received</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 pb-20 lg:pb-0">
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
              (filteredPayments || []).map(p => {
                const isSelected = p?.id === selectedPaymentId;
                const amount = parseFloat(p?.amount || 0);
                const allocated = parseFloat(p?.allocated_amount || 0);
                const unallocated = Math.max(0, amount - allocated);
                const isCopied = copiedCardPaymentId === p?.id;

                return (
                  <div
                    key={p?.id}
                    onClick={() => {
                      setSelectedPaymentId(p?.id);
                      setMobileView('detail');
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs group ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-[11px] text-emerald-400 flex items-center gap-1">
                          {p?.payment_number || 'REC'}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await copyToClipboard(p?.payment_number || '');
                              setCopiedCardPaymentId(p?.id);
                              setTimeout(() => setCopiedCardPaymentId(null), 1500);
                            }}
                            className="text-slate-500 hover:text-emerald-300 p-0.5 rounded transition"
                            title="Copy Receipt #"
                          >
                            {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />}
                          </button>
                        </span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                          {p?.payment_method || 'CASH'}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-xs truncate mt-0.5">
                        {p?.customer_name || 'Customer'}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {formatVoucherDate(p?.payment_date)} {p?.reference_number ? `• Ref: ${p.reference_number}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-mono font-black text-xs text-emerald-400">
                          +₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {unallocated > 0.01 ? (
                          <span className="text-[9px] text-amber-400 font-bold block font-mono">
                            ⚠️ ₹{unallocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Unallocated
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500 block font-mono">
                            Alloc: ₹{allocated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>

                      {/* Desktop only Quick WhatsApp & Edit/Delete buttons (hidden on mobile to protect tap targets and prevent accidental deletion) */}
                      <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsAppReceipt(p);
                          }}
                          className="p-1 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors"
                          title="Share WhatsApp Settlement Receipt"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPayment(p);
                          }}
                          className="p-1 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-lg transition-colors"
                          title="Edit Payment"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal(p);
                          }}
                          className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl flex-col overflow-hidden`}>
          {/* Mobile Back to List button */}
          <div className="lg:hidden pb-2 mb-2 border-b border-slate-800 flex items-center justify-between shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Vouchers List</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono">
              {filteredPayments.length} Vouchers
            </span>
          </div>

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
                    Settled on {formatVoucherDate(selectedPayment.payment_date)} {selectedPayment.reference_number ? `• Ref: ${selectedPayment.reference_number}` : ''}
                  </p>
                </div>

                {/* Direct Action Chips */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingPayment(selectedPayment)}
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Edit Payment Voucher"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmModal(selectedPayment)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Delete / Reverse Payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>

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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        onClick={() => setEditingPayment(selectedPayment)}
                        className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-left text-amber-400 transition-all hover:scale-[1.02]"
                      >
                        <Pencil className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Edit Voucher</div>
                          <span className="text-[10px] text-slate-400">Correct amount, date, method, notes</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmModal(selectedPayment)}
                        className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-left text-rose-400 transition-all hover:scale-[1.02]"
                      >
                        <Trash2 className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-rose-300">Delete / Reverse</div>
                          <span className="text-[10px] text-rose-400/80">Reverses allocations & restores invoice</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSendWhatsAppReceipt(selectedPayment)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5 shrink-0" />
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

      {/* Floating Notification */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Payment Voucher</h3>
                <p className="text-xs text-rose-400/90 font-medium">Permanent reversal action</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Voucher #:</span>
                <span className="font-mono font-bold text-white">{deleteConfirmModal.payment_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white">{deleteConfirmModal.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-black text-rose-400 text-sm">
                  ₹{parseFloat(deleteConfirmModal.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              Deleting this payment voucher will <strong>reverse all bill allocations</strong>, restore the outstanding balance on affected invoices, and update the customer's ledger.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeletePayment(deleteConfirmModal)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Reversing...' : 'Delete & Reverse'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      <EditPaymentModal 
        isOpen={!!editingPayment}
        payment={editingPayment}
        onClose={() => setEditingPayment(null)}
        onSuccess={() => loadPayments(selectedPaymentId)}
      />

    </div>
  );
};
