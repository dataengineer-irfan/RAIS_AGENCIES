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
  ArrowLeft,
  Zap,
  Printer,
  Share2
} from 'lucide-react';
import { paymentApi } from '../services/api';
import { copyToClipboard, openWhatsApp } from '../utils/mobileHelpers';
import { sharePaymentOnWhatsApp, sharePaymentImageFile } from '../utils/whatsappShare';
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

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
};

const getCurrentMonthStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const extractDateOnly = (dateVal) => {
  if (!dateVal) return '';
  return String(dateVal).split('T')[0];
};

export const PaymentsPage = ({ onOpenPaymentModal, onNavigate }) => {
  const { hasRole } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMethodFilter, setActiveMethodFilter] = useState('ALL'); // ALL, CASH, UPI, BANK
  
  // Date Restriction & Stepper State
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'SPECIFIC_DAY'
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());

  // Master-Detail State
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('metadata'); // metadata, allocations, actions
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCardPaymentId, setCopiedCardPaymentId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // Edit and Delete State
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  const openDeleteModal = (payment) => {
    setDeleteModalError('');
    setDeleteConfirmModal(payment);
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async (selectId = null) => {
    setLoading(true);
    try {
      const [data, summary] = await Promise.all([
        paymentApi.list({ limit: 500 }),
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

  const [isReconciling, setIsReconciling] = useState(false);

  const handleSendWhatsAppReceipt = async (p) => {
    if (!p) return;
    await sharePaymentOnWhatsApp({ payment: p });
  };

  const handleSharePaymentImage = async (p) => {
    if (!p) return;
    await sharePaymentImageFile({ payment: p });
  };

  const handlePrintVoucher = (p) => {
    if (!p?.id) return;
    window.open(paymentApi.getPrintHtmlUrl(p.id), '_blank');
  };

  const handleReconcileCustomer = async (customerId) => {
    if (!customerId) return;
    setIsReconciling(true);
    try {
      await paymentApi.reconcileFifo(customerId);
      setNotification({
        type: 'success',
        message: 'Auto-reconciliation successful! Payment allocated against open customer invoices.'
      });
      setTimeout(() => setNotification(null), 4000);
      await loadPayments(selectedPaymentId);
    } catch (err) {
      console.error('Failed to reconcile FIFO', err);
      setNotification({
        type: 'error',
        message: err?.response?.data?.detail || err?.message || 'Failed to auto-reconcile voucher.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsReconciling(false);
    }
  };

  const executeDeletePayment = async (payment) => {
    if (!payment) return;
    setIsDeleting(true);
    setDeleteModalError('');
    try {
      await paymentApi.delete(payment.id);
      setDeleteConfirmModal(null);
      setDeleteModalError('');
      setNotification({
        type: 'success',
        message: `Payment voucher ${payment.payment_number} deleted. Allocations reversed and balances updated.`
      });
      setTimeout(() => setNotification(null), 4000);
      await loadPayments();
    } catch (err) {
      console.error('Failed to delete payment', err);
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to delete payment voucher.';
      setDeleteModalError(errMsg);
      setNotification({
        type: 'error',
        message: errMsg
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Day Stepping Handlers
  const handleStepDay = (delta) => {
    let baseDateStr = selectedDate;
    if (dateFilterMode === 'TODAY') {
      baseDateStr = getLocalDateStr();
    } else if (dateFilterMode === 'YESTERDAY') {
      baseDateStr = getYesterdayDateStr();
    } else if (!baseDateStr || dateFilterMode === 'ALL' || dateFilterMode === 'THIS_MONTH') {
      baseDateStr = getLocalDateStr();
    }

    const parts = baseDateStr.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + delta);
      const newDateStr = getLocalDateStr(d);
      setSelectedDate(newDateStr);
      if (newDateStr === getLocalDateStr()) {
        setDateFilterMode('TODAY');
      } else if (newDateStr === getYesterdayDateStr()) {
        setDateFilterMode('YESTERDAY');
      } else {
        setDateFilterMode('SPECIFIC_DAY');
      }
    }
  };

  const handleDateChange = (dateStr) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    if (dateStr === getLocalDateStr()) {
      setDateFilterMode('TODAY');
    } else if (dateStr === getYesterdayDateStr()) {
      setDateFilterMode('YESTERDAY');
    } else {
      setDateFilterMode('SPECIFIC_DAY');
    }
  };

  // 1. Date-Filtered Payments Subset
  const dateFilteredPayments = useMemo(() => {
    const todayStr = getLocalDateStr();
    const yesterdayStr = getYesterdayDateStr();
    const currentMonthStr = getCurrentMonthStr();

    return payments.filter(p => {
      const pDate = extractDateOnly(p.payment_date);
      if (dateFilterMode === 'TODAY') {
        return pDate === todayStr;
      }
      if (dateFilterMode === 'YESTERDAY') {
        return pDate === yesterdayStr;
      }
      if (dateFilterMode === 'THIS_MONTH') {
        return pDate.startsWith(currentMonthStr);
      }
      if (dateFilterMode === 'SPECIFIC_DAY') {
        return pDate === selectedDate;
      }
      return true; // 'ALL'
    });
  }, [payments, dateFilterMode, selectedDate]);

  // 2. Micro-Metrics & Method Counts for the active date slice
  const methodCounts = useMemo(() => {
    let cash = 0;
    let upi = 0;
    let bank = 0;
    for (const p of dateFilteredPayments) {
      const m = (p.payment_method || '').toUpperCase();
      if (m.includes('CASH')) cash++;
      else if (m.includes('UPI')) upi++;
      else if (m.includes('BANK') || m.includes('NEFT') || m.includes('RTGS') || m.includes('CHEQUE')) bank++;
    }
    return {
      total: dateFilteredPayments.length,
      cash,
      upi,
      bank
    };
  }, [dateFilteredPayments]);

  // 3. Dynamic Reconciliation Summary for the active date slice
  const dateSummary = useMemo(() => {
    let total = 0;
    let cash = 0;
    let upi = 0;
    let bank = 0;
    for (const p of dateFilteredPayments) {
      const amt = parseFloat(p.amount || 0);
      total += amt;
      const m = (p.payment_method || '').toUpperCase();
      if (m.includes('CASH')) cash += amt;
      else if (m.includes('UPI')) upi += amt;
      else bank += amt;
    }
    return { total, cash, upi, bank };
  }, [dateFilteredPayments]);

  // 4. Final Filtered Payments (applying method filter and omni-search)
  const filteredPayments = useMemo(() => {
    return dateFilteredPayments.filter(p => {
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
        (p.customer_contact && p.customer_contact.toLowerCase().includes(term)) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(term)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term))
      );
    });
  }, [dateFilteredPayments, activeMethodFilter, searchTerm]);

  // Auto-sync selected payment when filtered list changes
  useEffect(() => {
    if (filteredPayments.length > 0) {
      const exists = filteredPayments.some(p => p.id === selectedPaymentId);
      if (!exists) {
        setSelectedPaymentId(filteredPayments[0].id);
      }
    } else {
      setSelectedPaymentId(null);
    }
  }, [filteredPayments, selectedPaymentId]);

  const selectedPayment = payments.find(p => p.id === selectedPaymentId) || filteredPayments[0] || null;
  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── DESKTOP UNIFIED COMMAND RIBBON (>= md) ─── */}
      <div className="hidden md:flex flex-col gap-2 bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shrink-0 shadow-md">
        {/* Tier 1: Identity, Search, Dynamic Ticker & CTA */}
        <div className="flex items-center justify-between gap-3">
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
                {loading && payments.length === 0 ? 'Syncing...' : `${filteredPayments.length} of ${payments.length}`}
              </span>
            </div>
          </div>

          {/* Center: Omni-Search Input with Clear */}
          <div className="relative flex-1 max-w-sm min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search receipt #, outlet, UTR, note..."
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

          {/* Live Collection & Daily Reconciliation Ticker (Placed in Tier 1 with ample width) */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs whitespace-nowrap shrink-0">
            {dateFilterMode === 'ALL' ? (
              <>
                <span className="text-emerald-400">Total: <strong className="font-bold">₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                {summaryData?.total_collected_this_month !== undefined && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span className="text-amber-400">{summaryData.current_month_str}: <strong className="font-bold">₹{parseFloat(summaryData.total_collected_this_month).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
                  </>
                )}
              </>
            ) : dateFilterMode === 'TODAY' ? (
              <span className="text-emerald-400">
                Today Total: <strong className="font-bold">₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <span className="text-slate-600 mx-1">|</span>
                <span className="text-amber-400">💵 ₹{dateSummary.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="text-slate-600 mx-1">•</span>
                <span className="text-cyan-400">📱 ₹{dateSummary.upi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </span>
            ) : dateFilterMode === 'YESTERDAY' ? (
              <span className="text-emerald-400">
                Yesterday: <strong className="font-bold">₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <span className="text-slate-600 mx-1">|</span>
                <span className="text-amber-400">💵 ₹{dateSummary.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="text-slate-600 mx-1">•</span>
                <span className="text-cyan-400">📱 ₹{dateSummary.upi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </span>
            ) : dateFilterMode === 'THIS_MONTH' ? (
              <span className="text-emerald-400">
                This Month: <strong className="font-bold">₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <span className="text-slate-600 mx-1">|</span>
                <span className="text-amber-400">💵 ₹{dateSummary.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </span>
            ) : (
              <span className="text-emerald-400">
                {formatVoucherDate(selectedDate)}: <strong className="font-bold">₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                <span className="text-slate-600 mx-1">|</span>
                <span className="text-amber-400">💵 ₹{dateSummary.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="text-slate-600 mx-1">•</span>
                <span className="text-cyan-400">📱 ₹{dateSummary.upi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </span>
            )}
          </div>

          {/* Right: + Record Payment CTA */}
          {hasRole(['ADMIN', 'OPERATOR']) && (
            <button
              onClick={() => onOpenPaymentModal && onOpenPaymentModal(null, null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105 shrink-0"
              title="Record Payment Voucher"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Payment</span>
            </button>
          )}
        </div>

        {/* Tier 2: Date Restriction & Stepper + Method Filters */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 flex-wrap lg:flex-nowrap">
          {/* Left: Date Restriction Pills & Single-Day Stepper */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Date:</span>
            </span>

            <button
              onClick={() => setDateFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                dateFilterMode === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Time
            </button>

            <button
              onClick={() => {
                setDateFilterMode('TODAY');
                setSelectedDate(getLocalDateStr());
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                dateFilterMode === 'TODAY'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>⚡ Today</span>
            </button>

            <button
              onClick={() => {
                setDateFilterMode('YESTERDAY');
                setSelectedDate(getYesterdayDateStr());
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                dateFilterMode === 'YESTERDAY'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              Yesterday
            </button>

            <button
              onClick={() => setDateFilterMode('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                dateFilterMode === 'THIS_MONTH'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              This Month
            </button>

            {/* Historical Single-Day Stepper */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-0.5 ml-1">
              <button
                type="button"
                onClick={() => handleStepDay(-1)}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-850 rounded-lg text-xs font-bold transition flex items-center gap-1"
                title="Previous Day"
              >
                ◀ <span className="hidden xl:inline text-[10px]">Prev</span>
              </button>

              <input
                type="date"
                value={selectedDate}
                max={getLocalDateStr()}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`bg-slate-900 border px-2 py-0.5 rounded-lg text-xs font-mono text-center focus:outline-none cursor-pointer transition-opacity ${
                  dateFilterMode === 'ALL'
                    ? 'border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    : dateFilterMode === 'SPECIFIC_DAY' || dateFilterMode === 'TODAY' || dateFilterMode === 'YESTERDAY'
                    ? 'border-emerald-500 text-emerald-400 font-bold'
                    : 'border-slate-700 text-slate-300'
                }`}
                title="Jump to specific date"
              />

              <button
                type="button"
                onClick={() => handleStepDay(1)}
                disabled={selectedDate >= getLocalDateStr()}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-850 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                title="Next Day"
              >
                <span className="hidden xl:inline text-[10px]">Next</span> ▶
              </button>
            </div>
          </div>

          {/* Right: Method Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setActiveMethodFilter('ALL')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeMethodFilter === 'ALL'
                  ? 'bg-slate-200 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({methodCounts.total})
            </button>
            <button
              onClick={() => setActiveMethodFilter(activeMethodFilter === 'CASH' ? 'ALL' : 'CASH')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMethodFilter === 'CASH'
                  ? 'bg-amber-500 text-slate-950 shadow-sm ring-1 ring-amber-400 font-black'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
            >
              <span>💵 Cash</span>
              <span className="font-mono text-[11px]">({methodCounts.cash})</span>
            </button>
            <button
              onClick={() => setActiveMethodFilter(activeMethodFilter === 'UPI' ? 'ALL' : 'UPI')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMethodFilter === 'UPI'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm ring-1 ring-cyan-400 font-black'
                  : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30'
              }`}
            >
              <span>📱 UPI</span>
              <span className="font-mono text-[11px]">({methodCounts.upi})</span>
            </button>
            <button
              onClick={() => setActiveMethodFilter(activeMethodFilter === 'BANK' ? 'ALL' : 'BANK')}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMethodFilter === 'BANK'
                  ? 'bg-purple-500 text-white shadow-sm ring-1 ring-purple-400 font-black'
                  : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'
              }`}
            >
              <span>🏦 Bank</span>
              <span className="font-mono text-[11px]">({methodCounts.bank})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE SLEEK ACTION BAR (< md) ─── */}
      <div className="md:hidden flex flex-col gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 shrink-0 shadow-sm">
        {/* Row 1: Back, Search, CTA */}
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
              title="Record Payment"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Payment</span>
            </button>
          )}
        </div>

        {/* Row 2: Date Restriction & Stepper Bar */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setDateFilterMode('ALL')}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
                dateFilterMode === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setDateFilterMode('TODAY');
                setSelectedDate(getLocalDateStr());
              }}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
                dateFilterMode === 'TODAY'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-300 border border-slate-800'
              }`}
            >
              ⚡ Today
            </button>
            <button
              onClick={() => {
                setDateFilterMode('YESTERDAY');
                setSelectedDate(getYesterdayDateStr());
              }}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap font-bold transition-all ${
                dateFilterMode === 'YESTERDAY'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              Yest
            </button>
          </div>

          {/* Mobile Day Stepper */}
          <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStepDay(-1)}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded text-[11px] font-bold"
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              max={getLocalDateStr()}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`bg-slate-900 border px-1 py-0.5 rounded text-[10px] font-mono text-center focus:outline-none transition-opacity ${
                dateFilterMode === 'ALL'
                  ? 'border-slate-800 text-slate-500 opacity-60'
                  : 'border-slate-700 text-slate-200'
              }`}
            />
            <button
              type="button"
              onClick={() => handleStepDay(1)}
              disabled={selectedDate >= getLocalDateStr()}
              className="px-1.5 py-0.5 text-slate-400 hover:text-white disabled:opacity-30 rounded text-[11px] font-bold"
              title="Next Day"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Row 3: Method Filters & Total Ticker */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar text-[11px] font-mono pt-0.5">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveMethodFilter('ALL')}
              className={`px-1.5 py-0.5 rounded-md whitespace-nowrap font-bold transition-all ${
                activeMethodFilter === 'ALL'
                  ? 'bg-slate-200 text-slate-950'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              All ({methodCounts.total})
            </button>
            <button
              onClick={() => setActiveMethodFilter(activeMethodFilter === 'CASH' ? 'ALL' : 'CASH')}
              className={`px-1.5 py-0.5 rounded-md whitespace-nowrap font-bold transition-all ${
                activeMethodFilter === 'CASH'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              💵 {methodCounts.cash}
            </button>
            <button
              onClick={() => setActiveMethodFilter(activeMethodFilter === 'UPI' ? 'ALL' : 'UPI')}
              className={`px-1.5 py-0.5 rounded-md whitespace-nowrap font-bold transition-all ${
                activeMethodFilter === 'UPI'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              📱 {methodCounts.upi}
            </button>
          </div>

          <span className="text-emerald-400 font-bold font-mono px-1 py-0.5 whitespace-nowrap shrink-0">
            ₹{dateSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
                        {p?.customer_contact && p.customer_contact.toLowerCase() !== (p.customer_name || '').toLowerCase() && (
                          <span className="text-amber-300 font-semibold ml-1">({p.customer_contact})</span>
                        )}
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
                            handlePrintVoucher(p);
                          }}
                          className="p-1 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 rounded-lg transition-colors"
                          title="Print / Save PDF Voucher"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
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
                            openDeleteModal(p);
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
              <div className="pb-3 border-b border-slate-800 shrink-0 space-y-2.5">
                {/* Row 1: Identity & Settled Amount Banner */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                        <span>{selectedPayment.payment_number}</span>
                        <button 
                          type="button"
                          onClick={() => handleCopyCode(selectedPayment.payment_number)}
                          className="hover:text-white transition-colors p-0.5 rounded hover:bg-emerald-500/20"
                          title="Copy Payment #"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 whitespace-nowrap shadow-sm">
                        {selectedPayment.payment_method}
                      </span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        Settled on {formatVoucherDate(selectedPayment.payment_date)}
                      </span>
                      {selectedPayment.reference_number && (
                        <span className="text-[11px] font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap hidden sm:inline-block">
                          Ref: {selectedPayment.reference_number}
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-base sm:text-lg font-black text-white mt-1.5 leading-snug break-words">
                      {selectedPayment.customer_name}
                      {selectedPayment.customer_contact && selectedPayment.customer_contact.toLowerCase() !== (selectedPayment.customer_name || '').toLowerCase() && (
                        <span className="text-amber-300 font-semibold text-sm ml-1.5">({selectedPayment.customer_contact})</span>
                      )}
                    </h2>
                  </div>

                  {/* Settled Amount Card */}
                  <div className="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Settled Amount</span>
                    <div className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      ₹{parseFloat(selectedPayment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Dedicated Action Toolbar (Spacious, grouped, never crowds the header) */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
                  {/* Share & Export Tools */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppReceipt(selectedPayment)}
                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                      title="Send Receipt via WhatsApp to Customer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSharePaymentImage(selectedPayment)}
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-emerald-950/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                      title="Share High-Res PNG Receipt Card"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Image Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintVoucher(selectedPayment)}
                      className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                      title="Print / Save PDF Voucher"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      <span>Print Voucher</span>
                    </button>
                  </div>

                  {/* Record Administration Tools */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasRole(['ADMIN', 'OPERATOR']) && (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal({ id: selectedPayment.customer_id, business_name: selectedPayment.customer_name }, null)}
                        className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                        title={`Collect New Payment for ${selectedPayment.customer_name}`}
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+ Collect</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingPayment(selectedPayment)}
                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                      title="Edit Payment Voucher"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(selectedPayment)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-95"
                      title="Delete / Reverse Payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0 overflow-x-auto no-scrollbar">
                {[
                  { id: 'metadata', label: 'Voucher Details', icon: CreditCard },
                  { id: 'allocations', label: `Allocations (${selectedPayment.allocations?.length || 0})`, icon: FileText },
                  { id: 'actions', label: 'Action Console', icon: CheckCircle2 },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
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
                          <span className="text-slate-500 text-[10px] block">
                            {selectedPayment.payment_method === 'UPI' 
                              ? 'UPI UTR / Reference ID:' 
                              : selectedPayment.payment_method === 'CASH' 
                              ? 'Settlement Mode:' 
                              : 'Bank UTR / Transaction Ref:'}
                          </span>
                          <span className="font-mono font-bold text-amber-400">
                            {selectedPayment.reference_number || (
                              selectedPayment.payment_method === 'UPI'
                                ? 'UPI Counter Transfer (No UTR)'
                                : selectedPayment.payment_method === 'CASH'
                                ? 'Direct Cash Settlement'
                                : 'Direct Bank Settlement (No Ref)'
                            )}
                          </span>
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
                    {/* Unallocated Funds Alert & Auto-Reconcile Action */}
                    {(parseFloat(selectedPayment.unallocated_amount || 0) > 0.01 || (parseFloat(selectedPayment.amount || 0) - parseFloat(selectedPayment.allocated_amount || 0) > 0.01)) && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4" />
                            <span>₹{(parseFloat(selectedPayment.unallocated_amount || 0) || (parseFloat(selectedPayment.amount || 0) - parseFloat(selectedPayment.allocated_amount || 0))).toFixed(2)} Unallocated Funds</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            This voucher has unallocated funds remaining. Run FIFO auto-reconciliation to match against open customer bills.
                          </p>
                        </div>
                        {hasRole(['ADMIN', 'OPERATOR']) && (
                          <button
                            onClick={() => handleReconcileCustomer(selectedPayment.customer_id)}
                            disabled={isReconciling}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95 transition disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{isReconciling ? 'Reconciling...' : 'Auto-Allocate FIFO'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Allocated Invoices
                        </h4>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          Allocated: ₹{parseFloat(selectedPayment.allocated_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      {selectedPayment.allocations && selectedPayment.allocations.length > 0 ? (
                        <div className="space-y-1.5">
                          {selectedPayment.allocations.map((alloc, idx) => (
                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-white">{alloc.invoice_number || 'INV'}</span>
                                <p className="text-[10px] text-slate-400">{alloc.allocated_at ? formatVoucherDate(alloc.allocated_at) : 'Settled'}</p>
                              </div>
                              <div className="font-mono font-bold text-emerald-400">
                                ₹{parseFloat(alloc.allocated_amount || alloc.amount || 0).toFixed(2)}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {hasRole(['ADMIN', 'OPERATOR']) && (
                        <button
                          onClick={() => onOpenPaymentModal && onOpenPaymentModal({ id: selectedPayment.customer_id, business_name: selectedPayment.customer_name }, null)}
                          className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                        >
                          <PlusCircle className="w-5 h-5 shrink-0" />
                          <div>
                            <div className="font-bold text-xs text-white">Record New Payment</div>
                            <span className="text-[10px] text-slate-400">Open payment entry for {selectedPayment.customer_name}</span>
                          </div>
                        </button>
                      )}

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
                        onClick={() => openDeleteModal(selectedPayment)}
                        className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-left text-rose-400 transition-all hover:scale-[1.02]"
                      >
                        <Trash2 className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-rose-300">Delete / Reverse</div>
                          <span className="text-[10px] text-rose-400/80">Reverses allocations & restores invoice</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handlePrintVoucher(selectedPayment)}
                        className="p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center gap-2.5 text-left text-blue-400 transition-all hover:scale-[1.02]"
                      >
                        <Printer className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Print / PDF Voucher</div>
                          <span className="text-[10px] text-slate-400">Open official settlement voucher</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSendWhatsAppReceipt(selectedPayment)}
                        className="p-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <MessageSquare className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Send WhatsApp Receipt</div>
                          <span className="text-[10px] text-slate-400">Open direct WhatsApp to customer</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleSharePaymentImage(selectedPayment)}
                        className="p-3 bg-slate-800 hover:bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-left text-emerald-400 transition-all hover:scale-[1.02]"
                      >
                        <Share2 className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="font-bold text-xs text-white">Share Image Card</div>
                          <span className="text-[10px] text-slate-400">Share high-res PNG voucher file</span>
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
        <div className={`fixed bottom-5 right-5 z-[70] p-4 rounded-2xl border shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn ${
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
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

            {deleteModalError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteModalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalError('');
                  setDeleteConfirmModal(null);
                }}
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
