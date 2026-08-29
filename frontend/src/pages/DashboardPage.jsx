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
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { reportApi, customerApi, catalogueApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { GlobalFilterBar } from '../components/GlobalFilterBar';
import { ForecastStoryWidget } from '../components/ForecastStoryWidget';
import { ProductPerformanceMatrix } from '../components/ProductPerformanceMatrix';
import { CustomerHealthCard } from '../components/CustomerHealthCard';
import { DrillableMetricModal } from '../components/DrillableMetricModal';
import { ThermalReceiptModal } from '../components/ThermalReceiptModal';
import { ResponsiveTable } from '../components/ResponsiveTable';

export const DashboardPage = ({ onOpenInvoiceBuilder, onOpenPaymentModal, onNavigate }) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Slicer Filters State
  const [filters, setFilters] = useState({
    dateRange: 'THIS_MONTH',
    customerId: 'ALL',
    categoryId: 'ALL',
    compareTo: 'LAST_MONTH'
  });

  // Drilldown & Receipt Modals State
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
      console.error('Failed to load dashboard metrics:', err);
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
        <p className="font-bold tracking-wide">Synthesizing Decision-Support Intelligence...</p>
      </div>
    );
  }

  const revenueVal = parseFloat(kpis?.total_revenue_month || 0);
  const outstandingVal = parseFloat(kpis?.total_outstanding || 0);
  const overdueVal = parseFloat(kpis?.total_overdue || 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. STICKY GLOBAL SLICER BAR (Date, Customer, Category, Baseline Comparison) */}
      <GlobalFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        categories={categories}
        customers={customers}
      />

      {/* 2. TOP ACTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              Rayachoty Commercial Hub
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              v2 Decision-Support Engine
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1.5 tracking-tight">
            Executive Command & Decision Canvas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any metric card below to deep-dive through progressive disclosure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenInvoiceBuilder}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
          <button
            onClick={onOpenPaymentModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 3. CLICKABLE DRILLABLE KPI METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Month Revenue -> Clickable to Deep-Dive */}
        <div 
          onClick={() => openDrilldown('revenue', 'Revenue by Category & SKU Breakdown')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Revenue This Month</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 font-mono">
            ₹{revenueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-500">{kpis?.total_invoices_count || 0} orders invoiced</span>
            <span className="text-amber-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[10px]">
              Drilldown <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 2: Total Receivables -> Clickable */}
        <div 
          onClick={() => onNavigate('reports')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-amber-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Receivables</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-3 font-mono">
            ₹{outstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-500">{kpis?.open_invoices_count || 0} open unpaid slips</span>
            <span className="text-amber-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[10px]">
              Aging Buckets <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 3: Total Overdue */}
        <div 
          onClick={() => onNavigate('reports')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-rose-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overdue Balance</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-3 font-mono">
            ₹{overdueVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-rose-400/80 font-semibold">{overdueVal > 0 ? 'Requires Outreach' : 'All Clear'}</span>
            <span className="text-rose-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[10px]">
              Risk Table <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Metric 4: Registered Accounts */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/60 shadow-md transition-all hover:scale-[1.02] cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">B2B Food Outlets</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-all">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 font-mono">
            {kpis?.active_customers_count || 0} <span className="text-xs font-normal text-slate-500">Clients</span>
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span className="text-slate-500">{kpis?.total_products_count || 0} active SKUs</span>
            <span className="text-emerald-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-all text-[10px]">
              Customer Hub <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

      </div>

      {/* 4. SALES FORECAST VS ACTUAL INTELLIGENCE WIDGET */}
      <ForecastStoryWidget onOpenDrilldown={() => openDrilldown('revenue', 'Sales Velocity & Forecast Breakdown')} />

      {/* 5. PRODUCT PERFORMANCE MATRIX & DEAD STOCK INTELLIGENCE */}
      <ProductPerformanceMatrix onSelectProduct={(prod) => onNavigate('catalogue')} />

      {/* 6. CUSTOMER HEALTH TRAFFIC LIGHT & EARLY WARNING */}
      <CustomerHealthCard onSelectCustomer={(c) => onNavigate('customers')} />

      {/* 7. RECENT INVOICES WITH 1-CLICK THERMAL RECEIPT MODAL */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Recent Invoices & Counter Dispatches
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
            View All Billing History <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Table Wrapper */}
        <ResponsiveTable
          columns={[
            {
              header: 'Invoice #',
              render: (inv) => <span className="font-mono font-bold text-slate-200">{inv.invoice_number}</span>
            },
            {
              header: 'Customer',
              render: (inv) => <span className="font-medium text-white truncate max-w-[160px] block">{inv.customer_name}</span>
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
          renderMobileCard={(inv) => (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-xs">{inv.invoice_number}</span>
                <StatusBadge status={inv.status} />
              </div>
              <div className="text-xs font-semibold text-slate-300">{inv.customer_name}</div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                <div>
                  <span className="text-[10px] text-slate-500">Amount: </span>
                  <span className="font-bold text-white font-mono">₹{inv.total_amount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Due: </span>
                  <span className="font-bold text-amber-400 font-mono">₹{inv.outstanding_amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                <button
                  onClick={() => openThermalReceipt(inv.id)}
                  className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Thermal Receipt (58mm)
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* 8. MODAL MOUNTS */}
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
