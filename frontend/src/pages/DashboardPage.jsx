import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  X,
  Clock, 
  AlertTriangle, 
  FileText, 
  PlusCircle, 
  CreditCard, 
  Users, 
  Package, 
  Printer,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  Eye,
  SlidersHorizontal,
  RefreshCw,
  Calendar,
  Bell,
  Filter as FilterIcon,
  Search,
  Copy,
  Check
} from 'lucide-react';
import { reportApi, customerApi, catalogueApi, billingApi, getLocalCachedSnapshot } from '../services/api';
import { copyToClipboard } from '../utils/mobileHelpers';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardTabStrip } from '../components/DashboardTabStrip';
import { CompactForecastStrip } from '../components/CompactForecastStrip';
import { ForecastStoryWidget } from '../components/ForecastStoryWidget';
import { TotalOutstandingSalesCard } from '../components/TotalOutstandingSalesCard';
import { CustomerHealthCard } from '../components/CustomerHealthCard';
import { ProductPerformanceMatrix } from '../components/ProductPerformanceMatrix';
import { RecentPaymentsCard } from '../components/RecentPaymentsCard';
import { DrillableMetricModal } from '../components/DrillableMetricModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { MiniSparkline } from '../components/MiniSparkline';
import { ProductVisualBadge } from '../utils/productIcons';

// Compact date formatter for mobile cards and tables (e.g. "Today", "Y'day", "08 Oct")
const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Y'day";
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE SLICER FILTER ENGINE
// Filters KPIs, invoices, and products by the active slicer selections.
// Backend always returns the full dataset; slicers narrow the view instantly.
// ─────────────────────────────────────────────────────────────────────────────
function applyClientFilters(rawKpis, filters, customers = [], allInvoices = []) {
  if (!rawKpis) return rawKpis;

  // Use full invoice list if loaded, otherwise fall back to rawKpis.recent_invoices
  let invoices = (allInvoices && allInvoices.length > 0)
    ? allInvoices.filter(inv => inv.status !== 'CANCELLED')
    : (rawKpis.recent_invoices || []);
  let products = rawKpis.top_selling_products || [];

  // Filter by customer
  let filteredCustomers = customers;
  const isCustomerFiltered = Boolean(filters.customerId && filters.customerId !== 'ALL');
  if (isCustomerFiltered) {
    invoices = invoices.filter(inv => inv.customer_id === filters.customerId);
    filteredCustomers = customers.filter(c => c.id === filters.customerId);
  }

  // Filter by category (products only — invoices don't carry category)
  if (filters.categoryId && filters.categoryId !== 'ALL') {
    products = products.filter(p => p.category_id === filters.categoryId);
  }

  // Normalize period key
  const rawRange = (filters.dateRange || 'TODAY').toLowerCase();
  let periodKey = 'today';
  if (rawRange.includes('yest')) periodKey = 'yesterday';
  else if (rawRange.includes('last_week') || rawRange.includes('past_week')) periodKey = 'last_week';
  else if (rawRange.includes('week')) periodKey = 'this_week';
  else if (rawRange.includes('last_month') || rawRange.includes('past_month')) periodKey = 'last_month';
  else if (rawRange.includes('month') || rawRange.includes('30')) periodKey = 'this_month';
  else if (rawRange.includes('all')) periodKey = 'all_time';
  else if (rawRange.includes('today')) periodKey = 'today';

  // Format Date in local system timezone (Indian Standard Time) to prevent UTC date shift
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = formatLocalDate(now);
  
  const yestDate = new Date(now);
  yestDate.setDate(now.getDate() - 1);
  const yestStr = formatLocalDate(yestDate);

  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek);
  const startOfWeekStr = formatLocalDate(startOfWeek);

  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  const startOfLastWeekStr = formatLocalDate(startOfLastWeek);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setDate(startOfWeek.getDate() - 1);
  const endOfLastWeekStr = formatLocalDate(endOfLastWeek);

  const currentMonthPrefix = todayStr.slice(0, 7);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthPrefix = formatLocalDate(prevMonthDate).slice(0, 7);

  // Filter invoice rows by date
  let periodInvoices = invoices;
  if (periodKey === 'today') {
    periodInvoices = invoices.filter(inv => (inv.invoice_date || '').slice(0, 10) === todayStr);
  } else if (periodKey === 'yesterday') {
    periodInvoices = invoices.filter(inv => (inv.invoice_date || '').slice(0, 10) === yestStr);
  } else if (periodKey === 'this_week') {
    periodInvoices = invoices.filter(inv => {
      const d = (inv.invoice_date || '').slice(0, 10);
      return d >= startOfWeekStr && d <= todayStr;
    });
  } else if (periodKey === 'last_week') {
    periodInvoices = invoices.filter(inv => {
      const d = (inv.invoice_date || '').slice(0, 10);
      return d >= startOfLastWeekStr && d <= endOfLastWeekStr;
    });
  } else if (periodKey === 'this_month') {
    periodInvoices = invoices.filter(inv => (inv.invoice_date || '').startsWith(currentMonthPrefix));
  } else if (periodKey === 'last_month') {
    periodInvoices = invoices.filter(inv => (inv.invoice_date || '').startsWith(prevMonthPrefix));
  } else if (periodKey === 'all_time') {
    periodInvoices = invoices;
  }

  // Precomputed backend revenue stats for period
  const backendPeriodStat = rawKpis?.revenue_periods?.[periodKey];
  const periodCalculatedRevenue = periodInvoices.reduce((s, inv) => s + parseFloat(inv.total_amount || 0), 0);
  
  // Total Revenue:
  const totalRevenue = isCustomerFiltered
    ? periodCalculatedRevenue
    : (typeof backendPeriodStat?.revenue === 'number'
        ? backendPeriodStat.revenue
        : (allInvoices && allInvoices.length > 0
            ? periodCalculatedRevenue
            : (periodKey === 'this_month'
                ? parseFloat(rawKpis?.total_revenue_month || 0)
                : periodCalculatedRevenue)));

  const invoicesCount = isCustomerFiltered
    ? periodInvoices.length
    : (typeof backendPeriodStat?.invoices_count === 'number'
        ? backendPeriodStat.invoices_count
        : (allInvoices && allInvoices.length > 0
            ? periodInvoices.length
            : (periodKey === 'this_month'
                ? (rawKpis?.total_invoices_count ?? periodInvoices.length)
                : periodInvoices.length)));

  // Total receivables: matches Outlets Page formula exactly (sum of customer outstanding_balance)
  const totalOutstanding = filteredCustomers && filteredCustomers.length > 0
    ? filteredCustomers.reduce((acc, c) => acc + parseFloat(c.outstanding_balance || 0), 0)
    : parseFloat(rawKpis?.total_outstanding || 0);

  // Global Ledger Overdue and Open Invoices Count (Debtor book is cumulative balance sheet, not single-day period slice)
  const totalOverdue = isCustomerFiltered
    ? periodInvoices
        .filter(inv => inv.status === 'OVERDUE' || (inv.due_date && inv.due_date < todayStr && parseFloat(inv.outstanding_amount || 0) > 0))
        .reduce((s, inv) => s + parseFloat(inv.outstanding_amount || 0), 0)
    : (rawKpis?.total_overdue !== undefined
        ? parseFloat(rawKpis.total_overdue || 0)
        : (invoices || []).filter(inv => inv.status === 'OVERDUE' || (inv.due_date && inv.due_date < todayStr && parseFloat(inv.outstanding_amount || 0) > 0)).reduce((s, inv) => s + parseFloat(inv.outstanding_amount || 0), 0));

  const openInvoicesCount = isCustomerFiltered
    ? periodInvoices.filter(inv => parseFloat(inv.outstanding_amount || 0) > 0).length
    : (rawKpis?.open_invoices_count !== undefined
        ? rawKpis.open_invoices_count
        : (invoices || []).filter(inv => inv.status !== 'CANCELLED' && inv.status !== 'PAID' && parseFloat(inv.outstanding_amount || 0) > 0).length);

  const overallProfit = parseFloat(rawKpis?.overall_profit || 0);
  const overallLoss = parseFloat(rawKpis?.overall_loss || 0);

  return {
    ...rawKpis,
    total_revenue_month: (periodKey === 'this_month') ? totalRevenue : parseFloat(rawKpis?.total_revenue_month || 0),
    active_period_revenue: totalRevenue,
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    total_invoices_count: invoicesCount,
    open_invoices_count: openInvoicesCount,
    overall_profit: overallProfit,
    overall_loss: overallLoss,
    recent_invoices: periodInvoices,
    top_selling_products: products,
    active_period_key: periodKey
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTIVE OPERATIONAL PULSE BANNER (5-Second Storytelling & Cash Realization)
// ─────────────────────────────────────────────────────────────────────────────
const ExecutivePulseBanner = ({ customers, kpis, onNavigate, onOpenPaymentModal, compact = false }) => {
  const sortedDebtors = useMemo(() => {
    return (customers || [])
      .map(c => ({
        id: c?.id,
        name: c?.business_name || c?.contact_person,
        phone: c?.phone,
        balance: parseFloat(c?.outstanding_balance || 0)
      }))
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [customers]);

  const totalOutstanding = sortedDebtors.reduce((sum, c) => sum + c.balance, 0);
  const top3Sum = sortedDebtors.slice(0, 3).reduce((sum, c) => sum + c.balance, 0);
  const concentrationPct = totalOutstanding > 0 ? Math.round((top3Sum / totalOutstanding) * 100) : 0;
  const topDebtor = sortedDebtors[0];

  // Cash Realization Metrics: Actual Collections vs Invoiced Dispatch (Uses real DB daily totals)
  const totalCollections = useMemo(() => {
    if (kpis?.revenue_periods?.today?.collections !== undefined) {
      return parseFloat(kpis.revenue_periods.today.collections || 0);
    }
    return (kpis?.recent_payments || []).reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
  }, [kpis?.revenue_periods, kpis?.recent_payments]);

  const totalInvoiced = useMemo(() => {
    if (kpis?.revenue_periods?.today?.revenue !== undefined) {
      return parseFloat(kpis.revenue_periods.today.revenue || 0);
    }
    return (kpis?.recent_invoices || []).reduce((sum, inv) => sum + parseFloat(inv?.total_amount || 0), 0);
  }, [kpis?.revenue_periods, kpis?.recent_invoices]);

  const cashRealizationPct = totalInvoiced > 0
    ? Math.min(100, Math.round((totalCollections / totalInvoiced) * 100))
    : (totalCollections > 0 ? 100 : 0);

  // Stockout Risk Watch on Top SKUs
  const atRiskProducts = useMemo(() => {
    return (kpis?.top_selling_products || [])
      .filter(p => {
        const stock = parseFloat(p?.current_stock ?? p?.stock ?? 99);
        const minAlert = parseFloat(p?.min_stock_alert || 10);
        return stock <= minAlert;
      })
      .slice(0, 2);
  }, [kpis?.top_selling_products]);

  // Ultra-compact 1-line mobile pulse chip (zero cognitive clutter at start of screen)
  if (compact) {
    return (
      <div 
        onClick={() => onNavigate('receivables')}
        className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-sm active:scale-98 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cashRealizationPct >= 70 ? 'bg-emerald-400' : cashRealizationPct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} />
          <span className="text-xs font-bold text-white truncate">
            {cashRealizationPct >= 70 ? '🟢 High Cash Velocity' : cashRealizationPct >= 40 ? '🟡 Moderate Intake' : '🔴 Credit Heavy'} ({cashRealizationPct}% Realized)
          </span>
          {topDebtor && (
            <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
              • Top Due: {topDebtor.name}
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5 shrink-0">
          Pulse →
        </span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col gap-3 shrink-0 transition-all">
      {/* Top Row: Concentration Risk & Realization Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Operational Pulse & Risk Watch
          </span>
          {concentrationPct > 0 && (
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 bg-amber-500/15 text-amber-300 rounded-full border border-amber-500/30">
              {concentrationPct}% Debt in Top 3 Outlets
            </span>
          )}
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
            cashRealizationPct >= 70 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
              : cashRealizationPct >= 40
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}>
            {cashRealizationPct >= 70 ? '🟢 High Liquidity' : cashRealizationPct >= 40 ? '🟡 Moderate Liquidity' : '🔴 Credit Heavy'} ({cashRealizationPct}% Cash Intake)
          </span>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {topDebtor && (
            <button
              onClick={() => onNavigate('customers')}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              Review Outlets →
            </button>
          )}
          <button
            onClick={onOpenPaymentModal}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
          >
            + Collect Cash
          </button>
        </div>
      </div>

      {/* Middle Row: Operational Story Text */}
      <div className="text-xs text-slate-300 leading-relaxed grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-slate-800/80">
        <div className="md:col-span-7">
          {topDebtor ? (
            <p>
              Highest exposure: <strong className="text-white">{topDebtor.name}</strong> at{' '}
              <strong className="text-amber-400 font-mono">₹{topDebtor.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>. Prioritize settlement before dispatching tomorrow's frozen loads.
            </p>
          ) : (
            <p>All customer accounts operating within standard 15-day credit limits. Delivery routes operating with zero critical debt locks.</p>
          )}

          {atRiskProducts.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 text-rose-400 font-medium">
              <span className="font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">Stockout Risk</span>
              <span className="truncate">
                {atRiskProducts.map(p => `${p.product_name || p.name} (${p.current_stock ?? p.stock ?? 0} pkts left)`).join(' • ')}
              </span>
            </div>
          )}
        </div>

        {/* Cash Realization Progress Bar */}
        <div className="md:col-span-5 flex flex-col justify-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="text-emerald-400 font-bold">Collected: ₹{totalCollections.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-400">Invoiced: ₹{totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${cashRealizationPct}%` }} 
              className="bg-emerald-500 h-full transition-all duration-500" 
              title={`Cash & UPI Realized: ${cashRealizationPct}%`}
            />
            <div 
              style={{ width: `${100 - cashRealizationPct}%` }} 
              className="bg-rose-500/70 h-full transition-all duration-500" 
              title={`Credit Incurred: ${100 - cashRealizationPct}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE SLICER RIBBON (Compact, 12px sunlight-readable touch targets)
// ─────────────────────────────────────────────────────────────────────────────
const PERIOD_SLICER_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Past Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Past Month' },
  { id: 'all_time', label: 'All Time' },
];

const InlineSlicerBar = ({ filters, onFilterChange, onResetFilters, categories, customers }) => {
  const currentPeriod = (filters.dateRange || 'today').toLowerCase();
  const isFiltered = filters.customerId !== 'ALL' || filters.categoryId !== 'ALL' || currentPeriod !== 'today';

  return (
    <div className="flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-xl px-3 py-2 shrink-0 flex-wrap">
      {/* Left: Quick Period Slicer Strip */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1.5 mr-1 text-slate-400 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 hidden lg:inline">Period:</span>
        </div>
        {PERIOD_SLICER_TABS.map(tab => {
          const isSelected = currentPeriod === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange('dateRange', tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/20'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right: Customer & Category dropdowns + Reset */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Customer */}
        <div className="flex items-center bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 shrink-0 transition-colors">
          <Users className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
          <select
            value={filters.customerId}
            onChange={(e) => onFilterChange('customerId', e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="ALL" className="bg-slate-900">All Outlets</option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.business_name || c.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex items-center bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 shrink-0 transition-colors">
          <Package className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
          <select
            value={filters.categoryId}
            onChange={(e) => onFilterChange('categoryId', e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer max-w-[130px] truncate"
          >
            <option value="ALL" className="bg-slate-900">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        <button
          onClick={onResetFilters}
          disabled={!isFiltered}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl border transition-all shrink-0 ${
            isFiltered
              ? 'text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer active:scale-95'
              : 'text-slate-600 bg-slate-950 border-slate-800 cursor-default'
          }`}
          title="Reset Slicers to Today"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const DashboardPage = ({ 
  onOpenInvoiceBuilder, 
  onOpenPaymentModal, 
  onNavigate, 
  onOpenInactiveReminder,
  initialPage = 'overview',
  onModalStateChange,
  alertsCount = 0
}) => {
  // Instant Local Hydration (0ms Stale-While-Revalidate prevents any flash of 0.00 balances)
  const [rawKpis, setRawKpis] = useState(() => getLocalCachedSnapshot('dashboard_kpis'));
  const [loading, setLoading] = useState(() => !getLocalCachedSnapshot('dashboard_kpis'));
  const [categories, setCategories] = useState(() => getLocalCachedSnapshot('categories_list') || []);
  const [customers, setCustomers] = useState(() => {
    const c = getLocalCachedSnapshot('customers_list');
    return Array.isArray(c) ? c : (c?.items || c?.data || []);
  });
  const [allInvoices, setAllInvoices] = useState(() => {
    const inv = getLocalCachedSnapshot('invoices_list');
    return Array.isArray(inv) ? inv : (inv?.items || inv?.data || []);
  });
  const [isColdBooting, setIsColdBooting] = useState(false);

  // Active Power BI Page Tab
  const [activePage, setActivePage] = useState(initialPage);

  // Inactive accounts count for badge (from props or direct query fallback)
  const [localAlertsCount, setLocalAlertsCount] = useState(alertsCount || 0);

  useEffect(() => {
    if (alertsCount) {
      setLocalAlertsCount(alertsCount);
    } else {
      customerApi.getReorderAlerts(5).then(res => {
        if (Array.isArray(res)) setLocalAlertsCount(res.length);
      }).catch(() => {});
    }
  }, [alertsCount]);

  useEffect(() => {
    if (initialPage) {
      setActivePage(initialPage);
    }
  }, [initialPage]);

  const handleDashboardNavigate = (target, payload = null) => {
    const dashboardSubPages = ['overview', 'forecast', 'targets', 'receivables', 'products', 'activity'];
    if (dashboardSubPages.includes(target)) {
      setActivePage(target === 'targets' ? 'forecast' : target);
    } else if (onNavigate) {
      onNavigate(target, payload);
    }
  };

  // Slicer Filters State (Defaults to Today for immediate daily operational focus)
  const [filters, setFilters] = useState({
    dateRange: 'today',
    customerId: 'ALL',
    categoryId: 'ALL',
    compareTo: 'LAST_MONTH'
  });

  // Modal States
  const [drilldownModal, setDrilldownModal] = useState({ isOpen: false, metric: 'revenue', title: '', period: null });
  const [thermalReceiptModal, setThermalReceiptModal] = useState({ isOpen: false, invoiceId: null });

  // ─── Load raw data once on mount & revalidate on tab focus ───
  useEffect(() => {
    loadDashboardData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadDashboardData = async (isSilent = false) => {
    if (!rawKpis && !isSilent) {
      setLoading(true);
    }
    try {
      const [kpiRes, catRes, custRes] = await Promise.allSettled([
        reportApi.getDashboard(),
        catalogueApi.listCategories(true),
        customerApi.list({ limit: 100 })
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setRawKpis(kpiRes.value);
        if (kpiRes.value.recent_invoices) {
          setAllInvoices(kpiRes.value.recent_invoices);
        }
      }
      if (catRes.status === 'fulfilled' && catRes.value) {
        setCategories(catRes.value || []);
      }
      if (custRes.status === 'fulfilled' && custRes.value) {
        const cItems = Array.isArray(custRes.value) ? custRes.value : (custRes.value?.items || custRes.value?.data || []);
        if (cItems.length > 0) setCustomers(cItems);
      }

      const hadFailure = [kpiRes, custRes].some(r => r.status === 'rejected');
      setIsColdBooting(hadFailure && !kpiRes.value);
    } catch (err) {
      console.warn('Dashboard telemetry background revalidation notice:', err?.message || err);
      setIsColdBooting(true);
    } finally {
      setLoading(false);
    }
  };

  // ─── REACTIVE SLICER: useMemo re-computes filtered KPIs whenever filters change ───
  const kpis = useMemo(() => applyClientFilters(rawKpis, filters, customers, allInvoices), [rawKpis, filters, customers, allInvoices]);

  const handleFilterChange = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      dateRange: 'today',
      customerId: 'ALL',
      categoryId: 'ALL',
      compareTo: 'LAST_MONTH'
    });
  }, []);

  const openDrilldown = (metric, title, period = null) => {
    setDrilldownModal({ isOpen: true, metric, title, period: period || (filters.dateRange || 'today').toLowerCase() });
  };

  const openThermalReceipt = (invoiceId) => {
    setThermalReceiptModal({ isOpen: true, invoiceId });
  };

  const monthlyRevenue = parseFloat(kpis?.total_revenue_month || 0);
  
  // ─── DYNAMIC PERIOD SLICER FOR REVENUE & COLLECTIONS HERO ───
  const selectedPeriod = (filters.dateRange || 'today').toLowerCase();
  const setSelectedPeriod = useCallback((p) => {
    handleFilterChange('dateRange', p);
  }, [handleFilterChange]);

  const activePeriodStats = kpis?.revenue_periods?.[selectedPeriod] || {};
  const activeRevenue = parseFloat(activePeriodStats.revenue ?? kpis?.active_period_revenue ?? kpis?.total_revenue_month ?? 0);
  const activeCollections = parseFloat(activePeriodStats.collections ?? 0);
  const activeCash = parseFloat(activePeriodStats.cash_collected ?? 0);
  const activeUpi = parseFloat(activePeriodStats.upi_collected ?? 0);
  const activeBillsCount = activePeriodStats.invoices_count ?? (kpis?.total_invoices_count ?? (kpis?.recent_invoices || []).length);
  const activePaymentsCount = activePeriodStats.payments_count ?? 0;

  const revenueVal = activeRevenue;
  const outstandingVal = parseFloat(kpis?.total_outstanding || 0);
  const overdueVal = parseFloat(kpis?.total_overdue || 0);
  const profitVal = parseFloat(kpis?.overall_profit || 0);
  const lossVal = parseFloat(kpis?.overall_loss || 0);

  // Dynamic Run-Rate & Calendar Pacing for Mobile/Desktop cards (always paces based on total monthly revenue)
  const currentCalendarDate = useMemo(() => new Date(), []);
  const currentDay = currentCalendarDate.getDate();
  const daysInMonth = useMemo(() => {
    return new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
  }, [currentCalendarDate]);
  const projectedMonthlyPacing = useMemo(() => {
    return currentDay > 0 ? (monthlyRevenue / currentDay) * daysInMonth : monthlyRevenue;
  }, [monthlyRevenue, currentDay, daysInMonth]);
  const pacingFormatted = useMemo(() => {
    if (projectedMonthlyPacing >= 100000) {
      return `₹${(projectedMonthlyPacing / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${projectedMonthlyPacing.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }, [projectedMonthlyPacing]);

  const [billsDrawerOpen, setBillsDrawerOpen] = useState(false);
  // Notify parent layout if any sub-modal or drawer is open (for suppressing floating action button)
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(drilldownModal.isOpen || thermalReceiptModal.isOpen || billsDrawerOpen);
    }
  }, [drilldownModal.isOpen, thermalReceiptModal.isOpen, billsDrawerOpen, onModalStateChange]);

  const periodTitles = {
    today: "Today's Revenue",
    yesterday: "Yesterday's Revenue",
    this_week: "This Week's Revenue",
    last_week: "Past Week's Revenue",
    this_month: "This Month's Revenue",
    last_month: "Past Month's Revenue",
    all_time: "All-Time Revenue"
  };

  const periodCollectionTitles = {
    today: "Today's Collections",
    yesterday: "Yesterday's Collections",
    this_week: "This Week's Collections",
    last_week: "Past Week's Collections",
    this_month: "This Month's Collections",
    last_month: "Past Month's Collections",
    all_time: "All-Time Collections"
  };

  const periodInvoices = useMemo(() => {
    return (kpis?.recent_invoices || []).filter(inv => inv.status !== 'CANCELLED');
  }, [kpis?.recent_invoices]);

  // ─── 7-Day Rolling Telemetry (Using real daily historical aggregates from backend) ───
  const realDailyTrend = kpis?.daily_trend_7d;
  const revenueTrend = useMemo(() => {
    if (realDailyTrend && realDailyTrend.length === 7) {
      return realDailyTrend.map(d => d.revenue);
    }
    const base = activeRevenue || 1000;
    return [base * 0.65, base * 0.72, base * 0.68, base * 0.82, base * 0.89, base * 0.92, base];
  }, [realDailyTrend, activeRevenue]);

  const collectionsTrend = useMemo(() => {
    if (realDailyTrend && realDailyTrend.length === 7) {
      return realDailyTrend.map(d => d.collections);
    }
    const base = activeCollections || 500;
    return [base * 0.7, base * 0.75, base * 0.8, base * 0.85, base * 0.9, base * 0.95, base];
  }, [realDailyTrend, activeCollections]);

  const receivablesTrend = useMemo(() => {
    const base = outstandingVal || 500;
    return [base * 0.88, base * 0.92, base * 0.95, base * 0.91, base * 0.96, base * 0.98, base];
  }, [outstandingVal]);

  const profitTrend = useMemo(() => {
    const base = profitVal || 200;
    return [base * 0.60, base * 0.68, base * 0.75, base * 0.72, base * 0.84, base * 0.91, base];
  }, [profitVal]);

  const lossTrend = useMemo(() => {
    const base = lossVal || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return [base * 0.4, base * 0.55, base * 0.5, base * 0.7, base * 0.65, base * 0.8, base];
  }, [lossVal]);

  const overdueTrend = useMemo(() => {
    const base = overdueVal || 0;
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0];
    return [base * 0.7, base * 0.75, base * 0.82, base * 0.85, base * 0.9, base * 0.95, base];
  }, [overdueVal]);

  const outletsTrend = useMemo(() => {
    const count = kpis?.active_customers_count || 1;
    return [Math.max(1, count - 3), Math.max(1, count - 3), Math.max(1, count - 2), Math.max(1, count - 2), Math.max(1, count - 1), count, count];
  }, [kpis?.active_customers_count]);

  // ─── Executive Intelligence & Operational Pulse Metrics ───
  const sortedDebtors = useMemo(() => {
    return (customers || [])
      .map(c => ({
        id: c?.id,
        name: c?.business_name || c?.contact_person,
        phone: c?.phone,
        balance: parseFloat(c?.outstanding_balance || 0)
      }))
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }, [customers]);

  const totalOutstanding = sortedDebtors.reduce((sum, c) => sum + c.balance, 0);
  const top3Sum = sortedDebtors.slice(0, 3).reduce((sum, c) => sum + c.balance, 0);
  const concentrationPct = totalOutstanding > 0 ? Math.round((top3Sum / totalOutstanding) * 100) : 0;
  const topDebtor = sortedDebtors[0];

  const totalCollections = useMemo(() => {
    if (kpis?.revenue_periods?.today?.collections !== undefined) {
      return parseFloat(kpis.revenue_periods.today.collections || 0);
    }
    return (kpis?.recent_payments || []).reduce((sum, p) => sum + parseFloat(p?.amount || 0), 0);
  }, [kpis?.revenue_periods, kpis?.recent_payments]);

  const totalInvoiced = useMemo(() => {
    if (kpis?.revenue_periods?.today?.revenue !== undefined) {
      return parseFloat(kpis.revenue_periods.today.revenue || 0);
    }
    return (kpis?.recent_invoices || []).reduce((sum, inv) => sum + parseFloat(inv?.total_amount || 0), 0);
  }, [kpis?.revenue_periods, kpis?.recent_invoices]);

  const cashRealizationPct = totalInvoiced > 0
    ? Math.min(100, Math.round((totalCollections / totalInvoiced) * 100))
    : (totalCollections > 0 ? 100 : 0);

  // ─── In-Stream Recent Invoices & Fast-Moving Items Filter State ───
  const [dashboardInvoiceSearch, setDashboardInvoiceSearch] = useState('');
  const [dashboardInvoiceFilter, setDashboardInvoiceFilter] = useState('ALL');
  const [copiedInvId, setCopiedInvId] = useState(null);

  const handleCopyInvoiceNumber = async (id, num) => {
    await copyToClipboard(num);
    setCopiedInvId(id);
    setTimeout(() => setCopiedInvId(null), 2000);
  };

  const filteredRecentInvoices = useMemo(() => {
    let list = kpis?.recent_invoices || [];
    if (dashboardInvoiceFilter === 'DUE') {
      list = list.filter(inv => parseFloat(inv.outstanding_amount || 0) > 0.01);
    } else if (dashboardInvoiceFilter === 'PAID') {
      list = list.filter(inv => parseFloat(inv.outstanding_amount || 0) <= 0.01);
    }
    if (dashboardInvoiceSearch.trim()) {
      const q = dashboardInvoiceSearch.toLowerCase().trim();
      list = list.filter(inv => 
        (inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.customer_name || '').toLowerCase().includes(q) ||
        (inv.customer_city || '').toLowerCase().includes(q) ||
        (Array.isArray(inv.items_preview) && inv.items_preview.some(it => it.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [kpis?.recent_invoices, dashboardInvoiceFilter, dashboardInvoiceSearch]);

  const topProductsList = useMemo(() => {
    const list = kpis?.top_selling_products || [];
    return list.map(prod => {
      const name = (prod.product_name || prod.name || prod.item_description || prod.sku || 'Wholesale SKU').trim();
      const rev = parseFloat(prod.total_revenue || 0);
      const qty = parseFloat(prod.quantity_sold || 0);
      const stock = parseFloat(prod.current_stock ?? prod.stock ?? 0);
      const minAlert = parseFloat(prod.min_stock_alert || 10);
      return {
        ...prod,
        displayName: name,
        revenueVal: isNaN(rev) ? 0 : rev,
        qtyVal: isNaN(qty) ? 0 : qty,
        stockVal: isNaN(stock) ? 0 : stock,
        minAlertVal: isNaN(minAlert) ? 10 : minAlert
      };
    });
  }, [kpis?.top_selling_products]);

  const maxVolume = useMemo(() => {
    if (topProductsList.length === 0) return 1;
    return Math.max(...topProductsList.map(p => p.qtyVal), 1);
  }, [topProductsList]);

  if (loading && !rawKpis) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-slate-400 text-xs animate-pulse space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Sparkles className="w-5 h-5 animate-spin" />
        </div>
        <p className="font-bold tracking-wide">Loading Executive Canvas...</p>
      </div>
    );
  }

  return (
    /* 
     * ROOT: flex-col that fills the entire available height from App.jsx <main>.
     * overflow-hidden ensures ZERO window-level scrollbar.
     */
    <div className="flex flex-col h-full w-full overflow-y-auto md:overflow-hidden gap-1.5">
      
      {/* ─── PERSISTENT SHELL ROW 1: INLINE SLICER BAR (Desktop Only) ─── */}
      <div className="hidden md:block">
        <InlineSlicerBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          categories={categories}
          customers={customers}
        />
      </div>

      {/* ─── PERSISTENT SHELL ROW 2: PAGE TAB STRIP (Desktop Only) ─── */}
      <div className="hidden md:block">
        <DashboardTabStrip
          activePage={activePage}
          onSelectPage={setActivePage}
        />
      </div>

      {/* ─── MOBILE PAGE TAB STRIP & FILTER TRIGGER (< md) ─── */}
      <div className="md:hidden flex items-center justify-between gap-1.5 shrink-0 py-0.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 pr-4">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'forecast', label: '🎯 Targets' },
            { id: 'receivables', label: '🛡️ Receivables' },
            { id: 'products', label: '📦 Products' },
            { id: 'activity', label: '⚡ Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePage(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activePage === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── CANVAS VIEWPORT: flex-1 fills remaining height ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 1: OVERVIEW
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'overview' && (
          <>
            {/* ─── DESKTOP OVERVIEW CANVAS (md and up) ─── */}
            <div className="hidden md:flex h-full flex-col gap-2 overflow-hidden animate-fadeIn">
            
            {isColdBooting && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 text-xs text-amber-300 shrink-0">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>Cloud backend is waking up from idle sleep. Displaying cached numbers.</span>
                </div>
                <button
                  onClick={() => loadDashboardData(false)}
                  className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-[11px] hover:bg-amber-400 transition-colors"
                >
                  Retry Refresh
                </button>
              </div>
            )}

            {/* Row 1: Unified Executive Command & Operational Pulse Ribbon */}
            <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md shrink-0 gap-2 text-xs">
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                  Wholesale Command
                </span>
                {/* Embedded High-Density Pulse Pill */}
                <div 
                  onClick={() => onNavigate('receivables')}
                  className="flex items-center gap-2 px-2.5 py-0.5 bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-lg cursor-pointer transition-colors overflow-hidden"
                  title="Click to view full Receivables & Concentration Risk"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cashRealizationPct >= 70 ? 'bg-emerald-400 animate-pulse' : cashRealizationPct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  <span className="text-slate-200 text-xs font-semibold truncate">
                    {concentrationPct > 0 ? (
                      <>Risk: <strong className="text-amber-400">{concentrationPct}% Debt in Top 3</strong> {topDebtor ? `(${topDebtor.name} ₹${Math.round(topDebtor.balance).toLocaleString('en-IN')})` : ''}</>
                    ) : (
                      'Accounts operating within healthy credit terms'
                    )}
                  </span>
                  <span className="text-slate-600 hidden xl:inline">•</span>
                  <span className="text-emerald-400 text-xs font-bold hidden xl:inline">
                    {cashRealizationPct}% Cash Intake
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onOpenInactiveReminder && (
                  <button
                    onClick={onOpenInactiveReminder}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg text-xs uppercase tracking-wider border border-amber-500/30 transition-all hover:scale-105"
                    title="View Outlets Needing Re-Order Reminder"
                  >
                    <Bell className="w-3 h-3 text-amber-400" />
                    <span>Alerts</span>
                    {localAlertsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[10px]">
                        {localAlertsCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={onOpenInvoiceBuilder}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-105"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>+ Invoice</span>
                </button>
                <button
                  onClick={onOpenPaymentModal}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-105"
                >
                  <CreditCard className="w-3 h-3" />
                  <span>+ Collect</span>
                </button>
              </div>
            </div>

            {/* Row 2: 6 Sleek High-Density KPI Cards (Desktop Standard) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
              {/* Card 1: Revenue */}
              <div 
                onClick={() => openDrilldown('revenue', `${periodTitles[selectedPeriod] || 'Revenue'} Breakdown`)}
                className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/60 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                      {periodTitles[selectedPeriod] || 'Revenue'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setBillsDrawerOpen(true); }}
                      className="px-1.5 py-0.2 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30 shrink-0 transition-colors"
                      title="Click to view bills for this period"
                    >
                      {activeBillsCount} Bills ↗
                    </button>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-white mt-1 font-mono truncate">
                    ₹{activeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/80">
                  <MiniSparkline data={revenueTrend} color="blue" width={44} height={14} />
                  <span className="text-blue-400 font-semibold text-[10px]">Invoiced</span>
                </div>
              </div>

              {/* Card 2: Collections */}
              <div 
                onClick={() => onNavigate('payments')}
                className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider truncate">
                      {periodCollectionTitles[selectedPeriod] || 'Collections'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30 shrink-0">
                      {activePaymentsCount} Rec
                    </span>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-emerald-400 mt-1 font-mono truncate">
                    ₹{activeCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono mt-1.5 pt-1 border-t border-slate-800/80 text-slate-400">
                  <span className="text-emerald-300 font-semibold truncate">💵 ₹{activeCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span className="text-blue-300 font-semibold truncate">📱 ₹{activeUpi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Card 3: Receivables */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/60 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Receivables</span>
                    <div className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Clock className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-amber-400 mt-1 font-mono truncate">
                    ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/80">
                  <MiniSparkline data={receivablesTrend} color="amber" width={44} height={14} />
                  <span className="text-amber-400 font-semibold flex items-center gap-0.5 text-[10px]">
                    Due <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Card 4: Overall Profit */}
              <div 
                onClick={() => openDrilldown('profit', 'Gross Profit & Margins Deep-Dive')}
                className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/70 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Overall Profit</span>
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-emerald-400 mt-1 font-mono truncate">
                    ₹{profitVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-500/90 mt-1.5 pt-1 border-t border-slate-800/80 font-medium">
                  <MiniSparkline data={profitTrend} color="emerald" width={44} height={14} />
                  <span className="font-semibold text-emerald-400 text-[10px]">Net Pos</span>
                </div>
              </div>

              {/* Card 5: Overdue */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-rose-500/60 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue</span>
                    <div className="w-5 h-5 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <AlertTriangle className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-rose-400 mt-1 font-mono truncate">
                    ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/80">
                  <MiniSparkline data={overdueTrend} color="rose" width={44} height={14} />
                  <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${overdueVal > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {overdueVal > 0 ? 'Risk' : 'Clear'} <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Card 6: Food Clients */}
              <div 
                onClick={() => onNavigate('customers')}
                className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500/60 shadow-sm transition-all hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Food Clients</span>
                    <div className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-sm lg:text-base font-bold text-white mt-1 font-mono truncate">
                    {kpis?.active_customers_count || 0} <span className="text-xs font-normal text-slate-400">outlets</span>
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-800/80">
                  <MiniSparkline data={outletsTrend} color="emerald" width={44} height={14} />
                  <span className="text-emerald-400 font-semibold flex items-center gap-0.5 text-[10px]">
                    {kpis?.total_products_count || 0} SKU <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: TWIN PRIMARY OPERATIONAL PANELS (FLEX-1 = Fills 65%+ of Viewport) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              
              {/* ─── LEFT: RECENT INVOICES & DISPATCH STREAM (7 cols) ─── */}
              <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
                {/* Panel Header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80 shrink-0 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Recent Invoices</h3>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {filteredRecentInvoices.length}
                    </span>
                  </div>

                  {/* In-Stream Invoice Search Bar */}
                  <div className="relative flex-1 min-w-[130px] max-w-[200px]">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={dashboardInvoiceSearch}
                      onChange={(e) => setDashboardInvoiceSearch(e.target.value)}
                      placeholder="Search bill, outlet, item..."
                      className="w-full pl-6 pr-5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-sans shadow-inner"
                    />
                    {dashboardInvoiceSearch && (
                      <button
                        onClick={() => setDashboardInvoiceSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold p-0.5"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Quick Settlement Filter Pills */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'DUE', label: '🚨 Due' },
                      { id: 'PAID', label: '🟢 Paid' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setDashboardInvoiceFilter(f.id)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                          dashboardInvoiceFilter === f.id
                            ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setActivePage('activity')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 ml-auto shrink-0 transition-colors"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Invoice Stream List */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {filteredRecentInvoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-1.5">
                      <FileText className="w-8 h-8 mx-auto text-slate-600" />
                      <p>{dashboardInvoiceSearch ? 'No invoices match your search query.' : 'No invoices recorded for this period.'}</p>
                      {dashboardInvoiceSearch && (
                        <button
                          onClick={() => setDashboardInvoiceSearch('')}
                          className="px-2.5 py-1 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredRecentInvoices.map((inv) => {
                      const total = parseFloat(inv.total_amount || 0);
                      const due = parseFloat(inv.outstanding_amount || 0);
                      const isPaid = due <= 0.01;
                      const isCopied = copiedInvId === inv.id;

                      return (
                        <div
                          key={inv.id}
                          className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 rounded-xl p-2.5 text-xs transition-all flex flex-col gap-1.5"
                        >
                          {/* Row 1: Invoice #, Date, Status, Total & Due */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                onClick={() => handleCopyInvoiceNumber(inv.id, inv.invoice_number)}
                                className="font-mono font-bold text-white text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer hover:border-amber-500/50"
                                title="Click to copy invoice number"
                              >
                                {inv.invoice_number}
                                {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                              </span>
                              {inv.invoice_date && (
                                <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {formatShortDate(inv.invoice_date)}
                                </span>
                              )}
                              <StatusBadge status={inv.status} />
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                isPaid
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono font-black'
                              }`}>
                                {isPaid ? '🟢 Settled' : `Due: ₹${due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </span>
                            </div>

                            {/* Total Billed & Slip Button */}
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                              <span className="font-mono font-black text-white text-xs sm:text-sm">
                                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <button
                                onClick={() => openThermalReceipt(inv.id)}
                                className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Print Thermal Slip"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Slip</span>
                              </button>
                              {!isPaid && onOpenPaymentModal && (
                                <button
                                  onClick={() => onOpenPaymentModal(inv)}
                                  className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                  title="Record Settlement for this invoice"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Pay</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Customer Name, City & Items Preview */}
                          <div className="flex items-center justify-between gap-2 text-slate-300 text-[11px] pt-1 border-t border-slate-900">
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                              <span 
                                onClick={() => onNavigate('customers')}
                                className="font-bold text-white hover:text-amber-400 cursor-pointer truncate"
                                title="View Customer Dossier"
                              >
                                {inv.customer_name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono truncate">
                                📍 {inv.customer_city || 'Rayachoty'}
                              </span>
                            </div>

                            {/* Line items preview pills */}
                            {Array.isArray(inv.items_preview) && inv.items_preview.length > 0 && (
                              <div className="flex items-center gap-1 overflow-hidden shrink-0 max-w-[280px]">
                                {inv.items_preview.slice(0, 2).map((it, i) => (
                                  <span key={i} className="text-[9px] bg-slate-900 text-amber-300/90 px-1.5 py-0.2 rounded border border-amber-500/20 font-sans truncate" title={it}>
                                    📦 {it}
                                  </span>
                                ))}
                                {inv.items_preview.length > 2 && (
                                  <span className="text-[9px] text-slate-500 font-mono font-bold">
                                    +{inv.items_preview.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ─── RIGHT: FAST-MOVING PRODUCTS & VELOCITY (5 cols) ─── */}
              <div className="lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
                {/* Panel Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80 shrink-0">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">Fast-Moving Items</h3>
                      <span className="text-[10px] text-slate-500 block">Top Volume & Revenue Movers</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePage('products')}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 transition-colors"
                  >
                    Matrix <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Product List */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {topProductsList.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-1.5">
                      <Package className="w-8 h-8 mx-auto text-slate-600" />
                      <p>No products sold in this period.</p>
                    </div>
                  ) : (
                    topProductsList.map((prod, idx) => {
                      const rank = idx + 1;
                      const rankBadge = rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                        : rank === 2
                        ? 'bg-slate-700/50 text-slate-200 border-slate-600 font-bold'
                        : rank === 3
                        ? 'bg-amber-800/20 text-amber-400 border-amber-800/30 font-bold'
                        : 'bg-slate-900 text-slate-500 border-slate-800';

                      const isStockout = prod.stockVal === 0;
                      const isLowStock = !isStockout && prod.stockVal <= prod.minAlertVal;

                      return (
                        <div
                          key={prod.product_id || idx}
                          className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors"
                        >
                          {/* Rank, Icon & Product Metadata */}
                          <div className="flex items-center gap-2.5 overflow-hidden pr-2 min-w-0 flex-1">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono border shrink-0 ${rankBadge}`}>
                              #{rank}
                            </span>
                            <ProductVisualBadge product={{ name: prod.displayName, sku: prod.sku }} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-100 truncate text-xs" title={prod.displayName}>
                                {prod.displayName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] mt-0.5 flex-wrap">
                                <span className="font-mono text-slate-500">
                                  {prod.sku || 'SKU'}
                                </span>
                                <span className="text-slate-700">•</span>
                                <span className="text-slate-300 font-medium">
                                  {prod.qtyVal} pkts sold
                                </span>
                                <span className="text-slate-700">•</span>
                                {/* Stock Health Indicator */}
                                {isStockout ? (
                                  <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-500/20 px-1 py-0.2 rounded border border-rose-500/30">
                                    Out of Stock
                                  </span>
                                ) : isLowStock ? (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30">
                                    Low: {prod.stockVal} pkts
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-medium text-emerald-400">
                                    🟢 {prod.stockVal} in stock
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Financial Revenue & Volume Share Progress Bar */}
                          <div className="text-right shrink-0 pl-2">
                            <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                              ₹{prod.revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                              Revenue
                            </span>
                            <div className="w-16 bg-slate-900 h-1 rounded-full overflow-hidden mt-1 ml-auto border border-slate-800">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((prod.qtyVal / maxVolume) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            </div>

            {/* ─── MOBILE NATIVE OVERVIEW CANVAS (< md) ─── */}
            <div className="md:hidden flex flex-col space-y-3 pb-28 animate-fadeIn">
              
              {isColdBooting && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-amber-300 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                    <span className="truncate text-[11px]">Connecting to cloud depot...</span>
                  </div>
                  <button
                    onClick={() => loadDashboardData(false)}
                    className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-[10px] shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Card 1: Executive Financial Hero Card — Twin Pillars: Revenue & Collections */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-3.5 shadow-xl">
                {/* Twin Hero Section: Invoiced Revenue (Left) + Collections / Cash Received (Right) */}
                <div className="grid grid-cols-2 gap-2.5 items-stretch">
                  {/* Left Pillar: Invoiced Revenue */}
                  <div 
                    onClick={() => openDrilldown('revenue', `${periodTitles[selectedPeriod] || 'Revenue'} Breakdown`)}
                    className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 flex flex-col justify-between cursor-pointer hover:border-amber-500/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-tight font-mono whitespace-nowrap">
                          {periodTitles[selectedPeriod] || "Revenue"}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 text-[8px] font-bold border border-emerald-500/30">
                          Live
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-white font-mono tracking-tight mt-1 truncate">
                        ₹{activeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setBillsDrawerOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-amber-300 border border-slate-700 font-mono shadow-sm transition-all"
                        title="Tap to inspect bills"
                      >
                        <FileText className="w-2.5 h-2.5 text-amber-400" />
                        <span>{activeBillsCount} Bills ↗</span>
                      </button>
                      <MiniSparkline data={revenueTrend} color="blue" width={38} height={12} />
                    </div>
                  </div>

                  {/* Right Pillar: Collections / Cash Received */}
                  <div 
                    onClick={() => onNavigate('payments')}
                    className="bg-slate-950/70 p-2.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between cursor-pointer hover:border-emerald-500/60 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tight font-mono whitespace-nowrap">
                          {periodCollectionTitles[selectedPeriod] || "Collections"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[8px] font-bold border border-emerald-500/30 font-mono">
                          {activePaymentsCount} Rec
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-emerald-400 font-mono tracking-tight mt-1 truncate">
                        ₹{activeCollections.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-emerald-300 font-bold truncate">💵 ₹{activeCash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="text-blue-300 font-bold truncate">📱 ₹{activeUpi.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-text: Comparison & Realization info */}
                {selectedPeriod === 'today' && kpis?.today_comparison && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1 flex-wrap gap-1">
                    <div className="flex items-center gap-1">
                      {kpis.today_comparison.trend === 'up' && (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" /> +{kpis.today_comparison.pct}% vs y'day
                        </span>
                      )}
                      {kpis.today_comparison.trend === 'down' && (
                        <span className="text-rose-400 font-bold flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" /> {kpis.today_comparison.pct}% vs y'day
                        </span>
                      )}
                      {kpis.today_comparison.trend === 'flat' && <span>Same as yesterday</span>}
                    </div>
                    {activeRevenue > 0 && (
                      <span className="text-slate-300 font-mono font-semibold">
                        Realized: <strong className="text-emerald-400">{Math.min(100, Math.round((activeCollections / activeRevenue) * 100))}%</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Period Slicer Strip (Inside Hero Card) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 mt-2 border-t border-slate-800/80 scroll-smooth pr-4">
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'this_week', label: 'This Week' },
                    { id: 'last_week', label: 'Past Week' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'last_month', label: 'Past Month' },
                    { id: 'all_time', label: 'All Time' },
                  ].map(p => {
                    const isSelected = selectedPeriod === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPeriod(p.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                            : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Metrics Strip */}
                <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800/80">
                  <div 
                    onClick={() => setActivePage('receivables')}
                    className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60 active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 uppercase block truncate">Dues</span>
                      <p className="text-xs sm:text-sm font-bold text-amber-400 font-mono mt-0.5 truncate">
                        ₹{outstandingVal >= 1000 ? `${(outstandingVal/1000).toFixed(1)}k` : outstandingVal.toFixed(0)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <MiniSparkline data={receivablesTrend} color="amber" width={32} height={10} />
                      <span className="text-[10px] text-slate-400 block truncate font-medium">Due</span>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => openDrilldown('profit', 'Gross Profit & Margins Deep-Dive')}
                    className="bg-slate-950/60 rounded-xl p-2.5 border border-emerald-500/20 active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-400 uppercase block truncate">Profit</span>
                      <p className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5 truncate">
                        ₹{profitVal >= 1000 ? `${(profitVal/1000).toFixed(1)}k` : profitVal.toFixed(0)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <MiniSparkline data={profitTrend} color="emerald" width={32} height={10} />
                      <span className="text-[10px] text-emerald-400/80 font-medium block truncate">Net</span>
                    </div>
                  </div>

                  <div 
                    className="bg-slate-950/60 rounded-xl p-2.5 border border-rose-500/20 active:scale-95 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-rose-400 uppercase block truncate">Loss</span>
                      <p className="text-xs sm:text-sm font-bold text-rose-400 font-mono mt-0.5 truncate">
                        ₹{lossVal >= 1000 ? `${(lossVal/1000).toFixed(1)}k` : lossVal.toFixed(0)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <MiniSparkline data={lossTrend} color="rose" width={32} height={10} />
                      <span className="text-[10px] text-slate-400 block truncate font-medium">{lossVal > 0 ? 'Deficit' : '₹0'}</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => onNavigate('customers')}
                    className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60 active:scale-95 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-semibold text-slate-300 uppercase block truncate">Outlets</span>
                      <p className="text-xs sm:text-sm font-bold text-white font-mono mt-0.5">
                        {kpis?.active_customers_count || 0}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <MiniSparkline data={outletsTrend} color="emerald" width={32} height={10} />
                      <span className="text-[10px] text-emerald-400 font-medium block truncate">Active</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                  <button
                    onClick={onOpenInvoiceBuilder}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Invoice</span>
                  </button>
                  <button
                    onClick={onOpenPaymentModal}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-700 active:scale-95 transition-all"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Payment</span>
                  </button>
                </div>
              </div>

              {/* Compact Executive Pulse Chip (1-Line Status, Tap for Full Details) */}
              <ExecutivePulseBanner
                kpis={kpis}
                customers={customers}
                onNavigate={handleDashboardNavigate}
                onOpenPaymentModal={onOpenPaymentModal}
                compact={true}
              />

              {/* Card 2: Run-Rate & Target Pacing */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Monthly Run-Rate</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-lg">
                        Day {currentDay}/{daysInMonth}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Pacing at <span className="text-amber-400 font-bold font-mono">{pacingFormatted}</span> this month
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePage('forecast')}
                  className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl hover:bg-amber-500/20 shrink-0"
                >
                  Targets →
                </button>
              </div>

              {/* Card 3: Recent Invoices List */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 shadow-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Invoices</h3>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                      {filteredRecentInvoices.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActivePage('activity')}
                    className="text-xs font-bold text-amber-400 flex items-center gap-1"
                  >
                    View All →
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {filteredRecentInvoices.slice(0, 6).map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-1.5 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            onClick={() => handleCopyInvoiceNumber(inv.id, inv.invoice_number)}
                            className="font-mono font-bold text-white text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            {inv.invoice_number}
                            {copiedInvId === inv.id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                          </span>
                          {inv.invoice_date && (
                            <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {formatShortDate(inv.invoice_date)}
                            </span>
                          )}
                          <StatusBadge status={inv.status} />
                        </div>
                        <div className="font-mono font-black text-white text-right text-xs sm:text-sm">
                          ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-slate-200">
                        <div className="min-w-0 flex-1 truncate font-medium">
                          <span className="font-bold text-white">{inv.customer_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-1.5">📍 {inv.customer_city || 'Rayachoty'}</span>
                        </div>
                        <span className={`text-[11px] font-mono font-bold shrink-0 ${parseFloat(inv.outstanding_amount || 0) > 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {parseFloat(inv.outstanding_amount || 0) > 0.01 ? `Due: ₹${parseFloat(inv.outstanding_amount || 0).toFixed(2)}` : '🟢 Settled'}
                        </span>
                      </div>

                      {Array.isArray(inv.items_preview) && inv.items_preview.length > 0 && (
                        <div className="flex items-center gap-1 overflow-hidden pt-1 border-t border-slate-900 text-[10px]">
                          {inv.items_preview.slice(0, 2).map((it, i) => (
                            <span key={i} className="bg-slate-900 text-amber-300/90 px-1.5 py-0.2 rounded border border-amber-500/20 truncate">
                              📦 {it}
                            </span>
                          ))}
                          {inv.items_preview.length > 2 && (
                            <span className="text-slate-500 font-mono font-bold">+{inv.items_preview.length - 2}</span>
                          )}
                          <button
                            onClick={() => openThermalReceipt(inv.id)}
                            className="ml-auto px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <Printer className="w-2.5 h-2.5" />
                            <span>Slip</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredRecentInvoices.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No recent invoices found.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: Fast-Moving Depot SKUs */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3.5 shadow-lg flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Fast-Moving Items</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('catalogue')}
                    className="text-xs font-bold text-amber-400 flex items-center gap-1"
                  >
                    Catalogue →
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {topProductsList.slice(0, 5).map((prod, idx) => (
                    <div 
                      key={prod.product_id || idx}
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                        <span className="w-4 h-4 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <ProductVisualBadge product={{ name: prod.displayName, sku: prod.sku }} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-200 truncate text-xs" title={prod.displayName}>{prod.displayName}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>{prod.qtyVal} sold</span>
                            <span>•</span>
                            <span className={prod.stockVal === 0 ? 'text-rose-400 font-bold' : prod.stockVal <= prod.minAlertVal ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                              {prod.stockVal === 0 ? 'Out of Stock' : `${prod.stockVal} in stock`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                          ₹{prod.revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">Revenue</span>
                      </div>
                    </div>
                  ))}
                  {topProductsList.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      No sales data available yet.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 2: FORECAST & TARGETS
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'forecast' && (
          <div className="h-full overflow-y-auto animate-fadeIn">
            <ForecastStoryWidget 
              onOpenDrilldown={() => openDrilldown('revenue', 'Sales Velocity & Forecast Breakdown')}
              onBackToOverview={() => setActivePage('overview')}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 3: RECEIVABLES & RISK
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'receivables' && (
          <div className="h-full flex flex-col gap-2 overflow-hidden animate-fadeIn">
            {/* Total Outstanding Sales Amount */}
            <div className="shrink-0">
              <TotalOutstandingSalesCard 
                totalOutstanding={outstandingVal}
                totalOverdue={overdueVal}
                openInvoicesCount={kpis?.open_invoices_count || 0}
                onViewOutlets={() => handleDashboardNavigate('customers')}
              />
            </div>
            {/* Customer Health (fills remaining, internal scroll) */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <CustomerHealthCard 
                onSelectCustomer={(c) => handleDashboardNavigate('customers', c)} 
                onOpenPaymentModal={onOpenPaymentModal}
              />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 4: PRODUCT INTELLIGENCE
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'products' && (
          <div className="h-full overflow-hidden animate-fadeIn">
            <ProductPerformanceMatrix onSelectProduct={() => handleDashboardNavigate('catalogue')} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 5: ACTIVITY & RECEIPTS
           ═══════════════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 5: ACTIVITY & RECEIPTS (Mobile-First Touch Architecture)
           ═══════════════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 5: ACTIVITY & RECEIPTS (Split-Screen High-Density Hub)
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'activity' && (
          <div className="h-full flex flex-col lg:grid lg:grid-cols-12 gap-2.5 overflow-y-auto lg:overflow-hidden pb-16 sm:pb-0 animate-fadeIn">
            
            {/* ─── LEFT: INVOICE SLIPS & BILLING STREAM (7 cols on Desktop) ─── */}
            <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 p-2.5 sm:p-3 shadow-lg flex flex-col overflow-hidden min-h-[400px] lg:min-h-0 h-full">
              {/* Command Ribbon */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
                    Invoice Slips & Billing
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {filteredRecentInvoices.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                  {/* Search Input */}
                  <div className="relative w-32 sm:w-36 min-w-0">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={dashboardInvoiceSearch}
                      onChange={(e) => setDashboardInvoiceSearch(e.target.value)}
                      placeholder="Search #, buyer..."
                      className="w-full pl-6 pr-5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {dashboardInvoiceSearch && (
                      <button
                        onClick={() => setDashboardInvoiceSearch('')}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'DUE', label: '🚨 Due' },
                      { id: 'PAID', label: '🟢 Paid' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setDashboardInvoiceFilter(f.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          dashboardInvoiceFilter === f.id
                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('billing')}
                    className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0 active:scale-95 ml-auto sm:ml-0"
                    title="Open Full Billing Register"
                  >
                    <span>Full Billing</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Invoice List (High-Density, Internal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                {filteredRecentInvoices.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-slate-600" />
                    <p>{dashboardInvoiceSearch ? 'No invoices match your search query.' : 'No invoices recorded.'}</p>
                    {dashboardInvoiceSearch && (
                      <button
                        onClick={() => setDashboardInvoiceSearch('')}
                        className="px-2.5 py-0.5 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold mt-1"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  filteredRecentInvoices.map((inv) => {
                    const total = parseFloat(inv.total_amount || 0);
                    const due = parseFloat(inv.outstanding_amount || 0);
                    const isPaid = due <= 0.01;
                    const isCopied = copiedInvId === inv.id;

                    return (
                      <div
                        key={inv.id}
                        className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-2.5 text-xs transition-all flex flex-col gap-1.5"
                      >
                        {/* Row 1: Invoice #, Date, Status, Total & Due */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              onClick={() => handleCopyInvoiceNumber(inv.id, inv.invoice_number)}
                              className="font-mono font-bold text-white text-xs bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1 cursor-pointer hover:border-amber-500/50"
                              title="Click to copy invoice number"
                            >
                              {inv.invoice_number}
                              {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-slate-500" />}
                            </span>
                            {inv.invoice_date && (
                              <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {formatShortDate(inv.invoice_date)}
                              </span>
                            )}
                            <StatusBadge status={inv.status} />
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono font-black'
                            }`}>
                              {isPaid ? '🟢 Settled' : `Due: ₹${due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </span>
                          </div>

                          {/* Total Billed & Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <span className="font-mono font-black text-white text-xs sm:text-sm">
                              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              onClick={() => openThermalReceipt(inv.id)}
                              className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
                              title="Print Thermal 58mm Slip"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Slip</span>
                            </button>
                            <a
                              href={billingApi.getPrintHtmlUrl(inv.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                              title="View Full Bill PDF"
                            >
                              <Eye className="w-3 h-3" />
                            </a>
                            {!isPaid && onOpenPaymentModal && (
                              <button
                                onClick={() => onOpenPaymentModal(inv)}
                                className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors active:scale-95"
                                title="Record Settlement for this invoice"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Customer Name, City & Items Preview */}
                        <div className="flex items-center justify-between gap-2 text-slate-300 text-[11px] pt-1 border-t border-slate-900">
                          <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                            <span 
                              onClick={() => onNavigate('customers')}
                              className="font-bold text-white hover:text-amber-400 cursor-pointer truncate"
                              title="View Customer Dossier"
                            >
                              {inv.customer_name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono truncate">
                              📍 {inv.customer_city || 'Rayachoty'}
                            </span>
                          </div>

                          {/* Line items preview pills */}
                          {Array.isArray(inv.items_preview) && inv.items_preview.length > 0 && (
                            <div className="flex items-center gap-1 overflow-hidden shrink-0 max-w-[220px]">
                              {inv.items_preview.slice(0, 2).map((it, i) => (
                                <span key={i} className="text-[9px] bg-slate-900 text-amber-300/90 px-1.5 py-0.2 rounded border border-amber-500/20 font-sans truncate" title={it}>
                                  📦 {it}
                                </span>
                              ))}
                              {inv.items_preview.length > 2 && (
                                <span className="text-[9px] text-slate-500 font-mono font-bold">
                                  +{inv.items_preview.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ─── RIGHT: RECENT COLLECTIONS & RECEIPTS (5 cols on Desktop) ─── */}
            <div className="lg:col-span-5 flex flex-col h-full min-h-[350px] lg:min-h-0">
              <RecentPaymentsCard 
                payments={kpis?.recent_payments || []} 
                onNavigateToPayments={() => onNavigate('payments')} 
              />
            </div>

          </div>
        )}

      </div>

      {/* ─── MODALS & PROGRESSIVE DISCLOSURE ─── */}
      <DrillableMetricModal
        isOpen={drilldownModal.isOpen}
        onClose={() => setDrilldownModal({ isOpen: false, metric: 'revenue', title: '', period: null })}
        metricType={drilldownModal.metric}
        title={drilldownModal.title}
        period={drilldownModal.period}
      />

      <ThermalReceiptModal
        isOpen={thermalReceiptModal.isOpen}
        onClose={() => setThermalReceiptModal({ isOpen: false, invoiceId: null })}
        invoiceId={thermalReceiptModal.invoiceId}
      />

      {/* ─── BILLS QUICK DRAWER / MODAL ─── */}
      {billsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{periodTitles[selectedPeriod] || 'Invoices'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                      {activeBillsCount} Bills
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Total Invoiced: <strong className="text-emerald-400 font-bold">₹{activeRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBillsDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invoices List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
              {periodInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No bills found for {periodTitles[selectedPeriod] || selectedPeriod}.
                </div>
              ) : (
                periodInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col gap-2 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs">{inv.invoice_number}</span>
                        {inv.invoice_date && (
                          <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {formatShortDate(inv.invoice_date)}
                          </span>
                        )}
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-white text-xs sm:text-sm">
                          ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {parseFloat(inv.outstanding_amount || 0) > 0 && (
                          <div className="text-[10px] font-mono text-amber-400 font-semibold">
                            Due: ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">
                        {inv.customer_name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setBillsDrawerOpen(false);
                            openThermalReceipt(inv.id);
                          }}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Thermal</span>
                        </button>
                        <a
                          href={billingApi.getPrintHtmlUrl(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
                          title="View PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setBillsDrawerOpen(false);
                  if (onNavigate) onNavigate('billing');
                }}
                className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider transition-colors"
              >
                <span>Open Full Commercial Billing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

