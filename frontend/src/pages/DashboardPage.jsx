import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
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
  Filter as FilterIcon
} from 'lucide-react';
import { reportApi, customerApi, catalogueApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { DashboardTabStrip } from '../components/DashboardTabStrip';
import { CompactForecastStrip } from '../components/CompactForecastStrip';
import { ForecastStoryWidget } from '../components/ForecastStoryWidget';
import { AgingBucketsCard } from '../components/AgingBucketsCard';
import { CustomerHealthCard } from '../components/CustomerHealthCard';
import { ProductPerformanceMatrix } from '../components/ProductPerformanceMatrix';
import { RecentPaymentsCard } from '../components/RecentPaymentsCard';
import { DrillableMetricModal } from '../components/DrillableMetricModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE SLICER FILTER ENGINE
// Filters KPIs, invoices, and products by the active slicer selections.
// Backend always returns the full dataset; slicers narrow the view instantly.
// ─────────────────────────────────────────────────────────────────────────────
function applyClientFilters(rawKpis, filters) {
  if (!rawKpis) return rawKpis;

  let invoices = rawKpis.recent_invoices || [];
  let products = rawKpis.top_selling_products || [];

  // Filter by customer
  if (filters.customerId && filters.customerId !== 'ALL') {
    invoices = invoices.filter(inv => inv.customer_id === filters.customerId);
  }

  // Filter by category (products only — invoices don't carry category)
  if (filters.categoryId && filters.categoryId !== 'ALL') {
    products = products.filter(p => p.category_id === filters.categoryId);
  }

  // Recompute KPI totals from filtered invoices
  const totalRevenue = invoices.reduce((s, inv) => s + parseFloat(inv.total_amount || 0), 0);
  const totalOutstanding = invoices.reduce((s, inv) => s + parseFloat(inv.outstanding_amount || 0), 0);
  const totalOverdue = invoices
    .filter(inv => inv.status === 'OVERDUE' || parseFloat(inv.outstanding_amount || 0) > 0)
    .reduce((s, inv) => s + parseFloat(inv.outstanding_amount || 0), 0);
  const openInvoices = invoices.filter(inv => parseFloat(inv.outstanding_amount || 0) > 0);

  return {
    ...rawKpis,
    total_revenue_month: totalRevenue,
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    total_invoices_count: invoices.length,
    open_invoices_count: openInvoices.length,
    recent_invoices: invoices,
    top_selling_products: products,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE SLICER BAR (Compact, no external component)
// ─────────────────────────────────────────────────────────────────────────────
const InlineSlicerBar = ({ filters, onFilterChange, onResetFilters, categories, customers }) => {
  const isFiltered = filters.customerId !== 'ALL' || filters.categoryId !== 'ALL' || filters.dateRange !== 'THIS_MONTH';

  return (
    <div className="flex items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-sm border border-slate-800/80 rounded-xl px-3 py-1.5 shrink-0">
      {/* Left label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">Slicers</span>
        {isFiltered && (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 animate-pulse">
            Active
          </span>
        )}
      </div>

      {/* Slicer dropdowns */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Date Range */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 shrink-0">
          <Calendar className="w-3 h-3 text-amber-500 mr-1.5 shrink-0" />
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange('dateRange', e.target.value)}
            className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="TODAY" className="bg-slate-900">Today</option>
            <option value="THIS_WEEK" className="bg-slate-900">This Week</option>
            <option value="THIS_MONTH" className="bg-slate-900">This Month</option>
            <option value="LAST_30_DAYS" className="bg-slate-900">Last 30 Days</option>
            <option value="ALL_TIME" className="bg-slate-900">All Time</option>
          </select>
        </div>

        {/* Customer */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 shrink-0">
          <Users className="w-3 h-3 text-amber-500 mr-1.5 shrink-0" />
          <select
            value={filters.customerId}
            onChange={(e) => onFilterChange('customerId', e.target.value)}
            className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer max-w-[120px]"
          >
            <option value="ALL" className="bg-slate-900">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-900">{c.business_name || c.name}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 shrink-0">
          <Package className="w-3 h-3 text-amber-500 mr-1.5 shrink-0" />
          <select
            value={filters.categoryId}
            onChange={(e) => onFilterChange('categoryId', e.target.value)}
            className="bg-transparent text-[11px] font-semibold text-white focus:outline-none cursor-pointer max-w-[120px]"
          >
            <option value="ALL" className="bg-slate-900">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} className="bg-slate-900">{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onResetFilters}
        disabled={!isFiltered}
        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border transition-all shrink-0 ${
          isFiltered
            ? 'text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 cursor-pointer'
            : 'text-slate-600 bg-slate-950 border-slate-800 cursor-default'
        }`}
      >
        <RefreshCw className="w-3 h-3" />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const DashboardPage = ({ onOpenInvoiceBuilder, onOpenPaymentModal, onNavigate }) => {
  const [rawKpis, setRawKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Active Power BI Page Tab
  const [activePage, setActivePage] = useState('overview');

  // Slicer Filters State (Applies across all 5 pages)
  const [filters, setFilters] = useState({
    dateRange: 'THIS_MONTH',
    customerId: 'ALL',
    categoryId: 'ALL',
    compareTo: 'LAST_MONTH'
  });

  // Modal States
  const [drilldownModal, setDrilldownModal] = useState({ isOpen: false, metric: 'revenue', title: '' });
  const [thermalReceiptModal, setThermalReceiptModal] = useState({ isOpen: false, invoiceId: null });

  // ─── Load raw data once on mount ───
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiData, catData, custData] = await Promise.all([
        reportApi.getDashboard(),
        catalogueApi.listCategories(true),
        customerApi.list({ limit: 100 })
      ]);
      setRawKpis(kpiData);
      setCategories(catData || []);
      setCustomers(Array.isArray(custData) ? custData : (custData?.items || custData?.data || []));
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── REACTIVE SLICER: useMemo re-computes filtered KPIs whenever filters change ───
  const kpis = useMemo(() => applyClientFilters(rawKpis, filters), [rawKpis, filters]);

  const handleFilterChange = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      dateRange: 'THIS_MONTH',
      customerId: 'ALL',
      categoryId: 'ALL',
      compareTo: 'LAST_MONTH'
    });
  }, []);

  const openDrilldown = (metric, title) => {
    setDrilldownModal({ isOpen: true, metric, title });
  };

  const openThermalReceipt = (invoiceId) => {
    setThermalReceiptModal({ isOpen: true, invoiceId });
  };

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

  const revenueVal = parseFloat(kpis?.total_revenue_month || 0);
  const outstandingVal = parseFloat(kpis?.total_outstanding || 0);
  const overdueVal = parseFloat(kpis?.total_overdue || 0);

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

      {/* ─── MOBILE PAGE TAB STRIP (< md) ─── */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 py-0.5 scroll-smooth">
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

      {/* ─── CANVAS VIEWPORT: flex-1 fills remaining height ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        
        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 1: OVERVIEW
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'overview' && (
          <>
            {/* ─── DESKTOP OVERVIEW CANVAS (md and up) ─── */}
            <div className="hidden md:flex h-full flex-col gap-2 overflow-hidden animate-fadeIn">
            
            {/* Row 1: Action Header (compact) */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800 shadow-lg shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Rayachoty Hub
                </span>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">
                  Executive Command & Decision Overview
                </h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onOpenInvoiceBuilder}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">New Invoice</span>
                </button>
                <button
                  onClick={onOpenPaymentModal}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                >
                  <CreditCard className="w-3 h-3" />
                  <span className="hidden sm:inline">Payment</span>
                </button>
              </div>
            </div>

            {/* Row 2: 4 KPI Cards (fixed height) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
              {/* Revenue */}
              <div 
                onClick={() => openDrilldown('revenue', 'Revenue by Category & SKU Breakdown')}
                className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-white mt-1 font-mono">
                  ₹{revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-800/80">
                  <span>{kpis?.total_invoices_count || 0} orders</span>
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    Drill <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Receivables */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Receivables</span>
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-amber-400 mt-1 font-mono">
                  ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-800/80">
                  <span>{kpis?.open_invoices_count || 0} unpaid</span>
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    Aging <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Overdue */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-rose-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overdue</span>
                  <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-rose-400 mt-1 font-mono">
                  ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-800/80">
                  <span className={overdueVal > 0 ? 'text-rose-400/80 font-semibold' : ''}>{overdueVal > 0 ? 'Outreach Due' : 'Clear'}</span>
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    Risk <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>

              {/* Active B2B Clients */}
              <div 
                onClick={() => onNavigate('customers')}
                className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Food Clients</span>
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Users className="w-3 h-3" />
                  </div>
                </div>
                <p className="text-lg font-black text-white mt-1 font-mono">
                  {kpis?.active_customers_count || 0} <span className="text-[10px] font-normal text-slate-500">outlets</span>
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1 pt-1 border-t border-slate-800/80">
                  <span>{kpis?.total_products_count || 0} SKUs</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    View <ArrowUpRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3: Compact Forecast Strip */}
            <CompactForecastStrip onNavigateToForecast={() => setActivePage('forecast')} />

            {/* Row 4: Recent Invoices + Top Products (FLEX-1 = fills remaining space) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
              
              {/* Recent Invoices (7 cols, internal scroll) */}
              <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Recent Invoices</h3>
                  </div>
                  <button
                    onClick={() => setActivePage('activity')}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                  >
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                  {(kpis?.recent_invoices || []).slice(0, 5).map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between text-[11px]"
                    >
                      <div className="overflow-hidden pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-[11px]">{inv.invoice_number}</span>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{inv.customer_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-white text-[11px]">₹{parseFloat(inv.total_amount).toFixed(2)}</div>
                          <span className={`text-[9px] font-mono ${parseFloat(inv.outstanding_amount) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            Due: ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => openThermalReceipt(inv.id)}
                          className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[9px] font-bold flex items-center gap-0.5 transition-colors"
                        >
                          <Printer className="w-2.5 h-2.5" />
                          <span>Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!kpis?.recent_invoices || kpis.recent_invoices.length === 0) && (
                    <div className="flex items-center justify-center h-20 text-slate-500 text-[11px]">
                      No invoices match current slicer filters.
                    </div>
                  )}
                </div>
              </div>

              {/* Top Moving Products (5 cols, internal scroll) */}
              <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">Fast-Moving Items</h3>
                  </div>
                  <button
                    onClick={() => setActivePage('products')}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                  >
                    Matrix <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                  {(kpis?.top_selling_products || []).slice(0, 5).map((prod, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between text-[11px]"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-bold text-slate-200 truncate text-[11px]">{prod.product_name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{prod.quantity_sold} packs sold</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400 text-[11px]">₹{parseFloat(prod.total_revenue).toFixed(2)}</div>
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Revenue</span>
                      </div>
                    </div>
                  ))}
                  {(!kpis?.top_selling_products || kpis.top_selling_products.length === 0) && (
                    <div className="flex items-center justify-center h-20 text-slate-500 text-[11px]">
                      No products match current slicer filters.
                    </div>
                  )}
                </div>
              </div>
            </div>

            </div>

            {/* ─── MOBILE NATIVE OVERVIEW CANVAS (< md) ─── */}
            <div className="md:hidden flex flex-col space-y-3 pb-8 animate-fadeIn">
              
              {/* Card 1: Executive Financial Hero Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rayachoty Depot Overview</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    {kpis?.total_invoices_count || 0} Orders
                  </span>
                </div>

                {/* Primary Metric: Total Revenue */}
                <div className="mt-1">
                  <span className="text-[11px] font-semibold text-slate-400">Total B2B Wholesale Revenue</span>
                  <div className="text-3xl font-black text-white font-mono tracking-tight mt-0.5">
                    ₹{revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Sub-Metrics Strip */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <div 
                    onClick={() => setActivePage('receivables')}
                    className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Receivables</span>
                    <p className="text-xs font-black text-amber-400 font-mono mt-0.5">
                      ₹{outstandingVal >= 1000 ? `${(outstandingVal/1000).toFixed(1)}k` : outstandingVal.toFixed(0)}
                    </p>
                    <span className="text-[8px] text-slate-500">{kpis?.open_invoices_count || 0} unpaid</span>
                  </div>
                  
                  <div 
                    onClick={() => setActivePage('receivables')}
                    className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Overdue</span>
                    <p className="text-xs font-black text-rose-400 font-mono mt-0.5">
                      ₹{overdueVal >= 1000 ? `${(overdueVal/1000).toFixed(1)}k` : overdueVal.toFixed(0)}
                    </p>
                    <span className="text-[8px] text-rose-400/80">Risk Alert</span>
                  </div>

                  <div 
                    onClick={() => onNavigate('customers')}
                    className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Outlets</span>
                    <p className="text-xs font-black text-white font-mono mt-0.5">
                      {kpis?.active_customers_count || 0}
                    </p>
                    <span className="text-[8px] text-emerald-400 font-semibold">Active</span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
                  <button
                    onClick={onOpenInvoiceBuilder}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Invoice</span>
                  </button>
                  <button
                    onClick={onOpenPaymentModal}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider border border-slate-700 active:scale-95 transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payment</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Run-Rate & Target Pacing */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-white">Monthly Run-Rate</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded">Day 3/30</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Pacing at <span className="text-amber-400 font-bold font-mono">₹2.31 Lakhs</span> this month
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePage('forecast')}
                  className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/20 shrink-0"
                >
                  Targets →
                </button>
              </div>

              {/* Card 3: Recent Invoices List */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Recent Invoices</h3>
                  </div>
                  <button
                    onClick={() => setActivePage('activity')}
                    className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5"
                  >
                    View All →
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {(kpis?.recent_invoices || []).slice(0, 5).map((inv) => (
                    <div 
                      key={inv.id}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-white text-xs">{inv.invoice_number}</span>
                          <StatusBadge status={inv.status} />
                        </div>
                        <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">{inv.customer_name}</p>
                        <span className={`text-[9px] font-mono ${parseFloat(inv.outstanding_amount) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          Due: ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="font-mono font-black text-white text-right text-xs">
                          ₹{parseFloat(inv.total_amount).toFixed(2)}
                        </div>
                        <button
                          onClick={() => openThermalReceipt(inv.id)}
                          className="p-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          title="Print Thermal Slip"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!kpis?.recent_invoices || kpis.recent_invoices.length === 0) && (
                    <div className="text-center py-4 text-slate-500 text-xs">
                      No recent invoices found.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 4: Fast-Moving Depot SKUs */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Fast-Moving Items</h3>
                  </div>
                  <button
                    onClick={() => onNavigate('catalogue')}
                    className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5"
                  >
                    Catalogue →
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {(kpis?.top_selling_products || []).slice(0, 4).map((prod, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-200 truncate text-xs">{prod.product_name}</p>
                        <span className="text-[10px] text-slate-400">{prod.quantity_sold} packs sold</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400 text-xs">₹{parseFloat(prod.total_revenue).toFixed(2)}</div>
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Revenue</span>
                      </div>
                    </div>
                  ))}
                  {(!kpis?.top_selling_products || kpis.top_selling_products.length === 0) && (
                    <div className="text-center py-4 text-slate-500 text-xs">
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
            <ForecastStoryWidget onOpenDrilldown={() => openDrilldown('revenue', 'Sales Velocity & Forecast Breakdown')} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 3: RECEIVABLES & RISK
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'receivables' && (
          <div className="h-full flex flex-col gap-2 overflow-hidden animate-fadeIn">
            {/* Aging Buckets (fixed height) */}
            <div className="shrink-0">
              <AgingBucketsCard onOpenDrilldown={() => onNavigate('reports')} />
            </div>
            {/* Customer Health (fills remaining, internal scroll) */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <CustomerHealthCard onSelectCustomer={(c) => onNavigate('customers')} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 4: PRODUCT INTELLIGENCE
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'products' && (
          <div className="h-full overflow-y-auto animate-fadeIn">
            <ProductPerformanceMatrix onSelectProduct={() => onNavigate('catalogue')} />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            PAGE 5: ACTIVITY & RECEIPTS
           ═══════════════════════════════════════════════════════════════════════ */}
        {activePage === 'activity' && (
          <div className="h-full flex flex-col gap-2 overflow-hidden animate-fadeIn">
            
            {/* Invoice History (fills remaining space, internal scroll) */}
            <div className="flex-1 min-h-0 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-lg flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white tracking-wide">
                      Invoice History & Counter Thermal Slips
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      1-Click Thermal Print with Dynamic UPI QR Code.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('billing')}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  Full Billing <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Table with internal scroll */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Invoice #</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Customer</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Total</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Balance</th>
                      <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Status</th>
                      <th className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2 px-2">Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpis?.recent_invoices || []).map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-800/50 hover:bg-slate-950/40 transition-colors">
                        <td className="py-2 px-2 font-mono font-bold text-slate-200">{inv.invoice_number}</td>
                        <td className="py-2 px-2 text-white truncate max-w-[160px]">{inv.customer_name}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-300 font-bold">₹{parseFloat(inv.total_amount).toFixed(2)}</td>
                        <td className={`py-2 px-2 text-right font-mono font-black ${parseFloat(inv.outstanding_amount) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          ₹{parseFloat(inv.outstanding_amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center"><StatusBadge status={inv.status} /></td>
                        <td className="py-2 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openThermalReceipt(inv.id)}
                              className="p-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[9px] font-bold flex items-center gap-0.5"
                            >
                              <Printer className="w-3 h-3" />
                              Thermal
                            </button>
                            <a
                              href={`/api/invoices/${inv.id}/print-html`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments (fixed height) */}
            <div className="shrink-0 max-h-48">
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
        onClose={() => setDrilldownModal({ isOpen: false, metric: 'revenue', title: '' })}
        metricType={drilldownModal.metric}
        title={drilldownModal.title}
      />

      <ThermalReceiptModal
        isOpen={thermalReceiptModal.isOpen}
        onClose={() => setThermalReceiptModal({ isOpen: false, invoiceId: null })}
        invoiceId={thermalReceiptModal.invoiceId}
      />

    </div>
  );
};
