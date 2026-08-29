import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import { reportApi, customerApi, catalogueApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { DashboardTabStrip } from '../components/DashboardTabStrip';
import { CompactForecastStrip } from '../components/CompactForecastStrip';
import { ForecastStoryWidget } from '../components/ForecastStoryWidget';
import { AgingBucketsCard } from '../components/AgingBucketsCard';
import { CustomerHealthCard } from '../components/CustomerHealthCard';
import { ProductPerformanceMatrix } from '../components/ProductPerformanceMatrix';
import { RecentPaymentsCard } from '../components/RecentPaymentsCard';
import { DrillableMetricModal } from '../components/DrillableMetricModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { ResponsiveTable } from '../components/ResponsiveTable';

export const DashboardPage = ({ onOpenInvoiceBuilder, onOpenPaymentModal, onNavigate }) => {
  const [kpis, setKpis] = useState(null);
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
      setKpis(kpiData);
      setCategories(catData || []);
      setCustomers(custData || []);
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'THIS_MONTH',
      customerId: 'ALL',
      categoryId: 'ALL',
      compareTo: 'LAST_MONTH'
    });
  };

  const openDrilldown = (metric, title) => {
    setDrilldownModal({ isOpen: true, metric, title });
  };

  const openThermalReceipt = (invoiceId) => {
    setThermalReceiptModal({ isOpen: true, invoiceId });
  };

  if (loading && !kpis) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-400 text-xs animate-pulse space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Sparkles className="w-5 h-5 animate-spin" />
        </div>
        <p className="font-bold tracking-wide">Loading No-Scroll Executive Canvas...</p>
      </div>
    );
  }

  const revenueVal = parseFloat(kpis?.total_revenue_month || 0);
  const outstandingVal = parseFloat(kpis?.total_outstanding || 0);
  const overdueVal = parseFloat(kpis?.total_overdue || 0);

  return (
    <div className="flex flex-col space-y-3 animate-fadeIn">
      
      {/* 1. PERSISTENT GLOBAL SLICERS BAR (Date, Customer, Category, Baseline Comparison) */}
      <GlobalFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        categories={categories}
        customers={customers}
      />

      {/* 2. PERSISTENT POWER BI PAGE TAB STRIP */}
      <DashboardTabStrip
        activePage={activePage}
        onSelectPage={setActivePage}
      />

      {/* 3. PAGINATED CANVAS CONTAINER (Fixed height per viewport, zero window-level scrolling) */}
      <div className="w-full">
        
        {/* =========================================================================
            PAGE 1: OVERVIEW (Hero, 4 KPIs, Compact Storyline, Recent Invoices & Top SKUs)
           ========================================================================= */}
        {activePage === 'overview' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-4.5 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Rayachoty Commercial Hub
                  </span>
                  <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
                    • Executive Canvas
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight">
                  Executive Command & Decision Overview
                </h1>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={onOpenInvoiceBuilder}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Invoice</span>
                </button>
                <button
                  onClick={onOpenPaymentModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all hover:scale-105"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>

            {/* 4 Clickable Drilldown KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Metric 1: Revenue */}
              <div 
                onClick={() => openDrilldown('revenue', 'Revenue by Category & SKU Breakdown')}
                className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month Revenue</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-all">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-white mt-2 font-mono">
                  ₹{revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-500">{kpis?.total_invoices_count || 0} orders</span>
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    Drilldown <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Metric 2: Total Receivables */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Receivables</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-all">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-400 mt-2 font-mono">
                  ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-500">{kpis?.open_invoices_count || 0} unpaid slips</span>
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    Aging <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Metric 3: Overdue */}
              <div 
                onClick={() => setActivePage('receivables')}
                className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-rose-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-all">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-rose-400 mt-2 font-mono">
                  ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-rose-400/80 font-semibold">{overdueVal > 0 ? 'Outreach Due' : 'All Clear'}</span>
                  <span className="text-rose-400 font-bold flex items-center gap-0.5">
                    Risk <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Metric 4: Registered B2B Outlets */}
              <div 
                onClick={() => onNavigate('customers')}
                className="bg-slate-900 p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Food Clients</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-all">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-white mt-2 font-mono">
                  {kpis?.active_customers_count || 0} <span className="text-xs font-normal text-slate-500">Outlets</span>
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-800/80">
                  <span className="text-slate-500">{kpis?.total_products_count || 0} active SKUs</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    Clients <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

            </div>

            {/* Compact Predictive Run-Rate Strip */}
            <CompactForecastStrip onNavigateToForecast={() => setActivePage('forecast')} />

            {/* Split Row: Recent Invoices & Top Catalogue SKUs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Recent Invoices (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Invoices</h3>
                    </div>
                    <button
                      onClick={() => setActivePage('activity')}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      View All Slips <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {kpis?.recent_invoices?.slice(0, 4).map((inv) => (
                      <div 
                        key={inv.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="overflow-hidden pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs">{inv.invoice_number}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{inv.customer_name}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-white">₹{inv.total_amount.toFixed(2)}</div>
                            <span className={`text-[10px] font-mono ${inv.outstanding_amount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                              Due: ₹{inv.outstanding_amount.toFixed(2)}
                            </span>
                          </div>

                          <button
                            onClick={() => openThermalReceipt(inv.id)}
                            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                            title="Print 58mm Thermal Receipt with UPI QR"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Slip</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Moving Products (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">Fast-Moving Items</h3>
                    </div>
                    <button
                      onClick={() => setActivePage('products')}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      Product Matrix <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {kpis?.top_selling_products?.slice(0, 4).map((prod, idx) => (
                      <div 
                        key={idx}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                      >
                        <div className="overflow-hidden pr-2">
                          <p className="font-bold text-slate-200 truncate text-xs">{prod.product_name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{prod.quantity_sold} packs sold</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-emerald-400">₹{prod.total_revenue.toFixed(2)}</div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Revenue</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            PAGE 2: FORECAST & TARGETS (Full Predictive Run-Rate, Story, Goals)
           ========================================================================= */}
        {activePage === 'forecast' && (
          <div className="space-y-4 animate-fadeIn">
            <ForecastStoryWidget onOpenDrilldown={() => openDrilldown('revenue', 'Sales Velocity & Forecast Breakdown')} />
          </div>
        )}

        {/* =========================================================================
            PAGE 3: RECEIVABLES & RISK (Aging Buckets & Customer Health Traffic Lights)
           ========================================================================= */}
        {activePage === 'receivables' && (
          <div className="space-y-4 animate-fadeIn">
            <AgingBucketsCard onOpenDrilldown={() => onNavigate('reports')} />
            <CustomerHealthCard onSelectCustomer={(c) => onNavigate('customers')} />
          </div>
        )}

        {/* =========================================================================
            PAGE 4: PRODUCT INTELLIGENCE (4-Quadrant Matrix, Dead Stock Alert)
           ========================================================================= */}
        {activePage === 'products' && (
          <div className="space-y-4 animate-fadeIn">
            <ProductPerformanceMatrix onSelectProduct={() => onNavigate('catalogue')} />
          </div>
        )}

        {/* =========================================================================
            PAGE 5: ACTIVITY & RECEIPTS (Recent Invoices, Thermal Print, Settlements)
           ========================================================================= */}
        {activePage === 'activity' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-wide">
                      Invoice History & Counter Thermal Slips
                    </h3>
                    <p className="text-xs text-slate-400">
                      1-Click Thermal Print with Dynamic UPI QR Code for Counter Collection.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('billing')}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                >
                  Full Billing Module <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Responsive Invoices Table */}
              <ResponsiveTable
                columns={[
                  {
                    header: 'Invoice #',
                    render: (inv) => <span className="font-mono font-bold text-slate-200">{inv.invoice_number}</span>
                  },
                  {
                    header: 'Customer',
                    render: (inv) => <span className="font-medium text-white truncate max-w-[180px] block">{inv.customer_name}</span>
                  },
                  {
                    header: 'Date',
                    render: (inv) => <span className="text-slate-400 font-mono text-[11px]">{inv.invoice_date}</span>
                  },
                  {
                    header: 'Total Amount',
                    align: 'right',
                    render: (inv) => <span className="font-mono text-slate-300 font-bold">₹{inv.total_amount.toFixed(2)}</span>
                  },
                  {
                    header: 'Balance Due',
                    align: 'right',
                    render: (inv) => (
                      <span className={`font-mono font-black ${inv.outstanding_amount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        ₹{inv.outstanding_amount.toFixed(2)}
                      </span>
                    )
                  },
                  {
                    header: 'Status',
                    align: 'center',
                    render: (inv) => <StatusBadge status={inv.status} />
                  },
                  {
                    header: 'Print / Thermal',
                    align: 'center',
                    render: (inv) => (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openThermalReceipt(inv.id)}
                          className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                          title="Print 58mm/80mm Thermal Receipt with UPI QR"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Thermal</span>
                        </button>
                        <a
                          href={`/api/invoices/${inv.id}/print-html`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                          title="Standard Tax Invoice PDF / Print"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )
                  }
                ]}
                data={kpis?.recent_invoices || []}
              />
            </div>

            {/* Recent Payments Log */}
            <RecentPaymentsCard 
              payments={kpis?.recent_payments || []} 
              onNavigateToPayments={() => onNavigate('payments')} 
            />
          </div>
        )}

      </div>

      {/* 4. MODALS & PROGRESSIVE DISCLOSURE MOUNTS */}
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
