import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Package,
  Download,
  Search,
  Users,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { reportApi, paymentApi } from '../services/api';
import { openWhatsApp } from '../utils/mobileHelpers';
import { DrillableMetricModal } from '../components/DrillableMetricModal';

export const ReportsPage = () => {
  const [aging, setAging] = useState(null);
  const [customerAging, setCustomerAging] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState('');
  
  // Drilldown Modal
  const [drillModal, setDrillModal] = useState({ isOpen: false, metric: 'revenue', title: '' });
  const [mobileTab, setMobileTab] = useState('aging'); // 'aging' | 'velocity'

  // 150ms Debounced Search for smooth 60fps input response
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [agingData, custAgingData, prodData] = await Promise.all([
        reportApi.getAging(),
        reportApi.getCustomerAging(),
        reportApi.getProductSales()
      ]);
      setAging(agingData);
      setCustomerAging(Array.isArray(custAgingData) ? custAgingData : []);
      setProductSales(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppReminder = (cust) => {
    const total = parseFloat(cust.total_outstanding ?? cust.total_due ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const over60 = parseFloat(cust.aging_60_plus_days ?? cust.days_60_plus ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const name = cust.business_name || cust.customer_name || 'Customer';
    const text = `*RAIS AGENCIES — Payment Aging Statement*\n\nCustomer: *${name}*\nTotal Outstanding: *₹${total}*\nOverdue (>60 Days): *₹${over60}*\n\nPlease arrange settlement via UPI (*9347453135@ybl*).\n*RAIS Agencies*, Rayachoty.`;
    openWhatsApp(cust.phone || '9347453135', text);
  };

  const handleExportCSV = () => {
    const headers = ['Customer Code', 'Customer Name', 'Phone', '0-15 Days', '16-30 Days', '31-60 Days', '60+ Days', 'Total Outstanding'];
    const rows = customerAging.map(c => [
      `"${c.customer_code}"`,
      `"${c.business_name || c.customer_name || ''}"`,
      `"${c.phone || ''}"`,
      c.current_0_15_days ?? c.current_0_15 ?? 0,
      c.aging_16_30_days ?? c.days_16_30 ?? 0,
      c.aging_31_60_days ?? c.days_31_60 ?? 0,
      c.aging_60_plus_days ?? c.days_60_plus ?? 0,
      c.total_outstanding ?? c.total_due ?? 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RAIS_Aging_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReconcileFIFO = async () => {
    setReconciling(true);
    setReconcileSuccess('');
    try {
      const res = await paymentApi.reconcileFifo();
      setReconcileSuccess(`Reconciled ${res?.total_customers_reconciled || 0} outlets successfully via FIFO!`);
      setTimeout(() => setReconcileSuccess(''), 5000);
      await loadReports();
    } catch (err) {
      console.error('Failed to run FIFO reconciliation:', err);
    } finally {
      setReconciling(false);
    }
  };

  const filteredCustomerAging = useMemo(() => {
    if (!debouncedSearch) return customerAging;
    const term = debouncedSearch.toLowerCase();
    return customerAging.filter(c => {
      const name = (c.business_name || c.customer_name || '').toLowerCase();
      return (
        name.includes(term) ||
        (c.customer_code || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term)
      );
    });
  }, [customerAging, debouncedSearch]);

  const totalOutstandingVal = parseFloat(aging?.total_outstanding || 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── RECONCILIATION SUCCESS NOTIFICATION ─── */}
      {reconcileSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">{reconcileSuccess}</span>
          </div>
          <button onClick={() => setReconcileSuccess('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* ─── DESKTOP TOP ACTION & HEADER BAR (md and above) ─── */}
      <div className="hidden md:flex sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                Financial Reports & Aging Matrix
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                ₹{totalOutstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Outstanding
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Accounts Receivable Aging & Product Sales Velocity Analytics
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
              placeholder="Search customer aging..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-52"
            />
          </div>

          <button
            onClick={handleReconcileFIFO}
            disabled={reconciling}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            title="Auto-reconcile unallocated payments against oldest open invoices (FIFO)"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Reconciling...' : 'FIFO Reconcile'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
            title="Export Aging Report to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── MOBILE NATIVE ULTRA-COMPACT CONTROLS (< md) ─── */}
      <div className="flex md:hidden flex-col gap-1.5 shrink-0">
        {/* Row 1: Search + View Switcher + FIFO + CSV */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlet aging..."
              className="w-full pl-8 pr-6 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold p-0.5">
                ✕
              </button>
            )}
          </div>

          {/* Compact View Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setMobileTab('aging')}
              className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                mobileTab === 'aging'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400'
              }`}
              title="Customer Aging"
            >
              <Users className="w-3 h-3" />
              <span>Aging</span>
            </button>
            <button
              onClick={() => setMobileTab('velocity')}
              className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                mobileTab === 'velocity'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400'
              }`}
              title="SKU Velocity"
            >
              <Package className="w-3 h-3" />
              <span>SKU</span>
            </button>
          </div>

          <button
            onClick={handleReconcileFIFO}
            disabled={reconciling}
            className="flex items-center gap-1 px-2 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-lg text-xs shrink-0 active:scale-95 transition"
            title="Auto-reconcile unallocated payments via FIFO"
          >
            <Sparkles className={`w-3 h-3 text-amber-400 ${reconciling ? 'animate-spin' : ''}`} />
            <span className="text-[10px]">FIFO</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs font-bold shrink-0"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>

        {/* Row 2: 1-Line Sleek Aging Buckets & Due Micro-Strip */}
        <div className="flex items-center justify-between gap-1 px-2 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] font-mono overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 font-bold text-amber-400 whitespace-nowrap">
            <span className="text-[9px] uppercase font-sans text-slate-400">Due:</span>
            <span>₹{totalOutstandingVal >= 1000 ? `${(totalOutstandingVal/1000).toFixed(1)}k` : totalOutstandingVal.toFixed(0)}</span>
          </div>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '0–15 Days Current Balances' })}
            className="text-emerald-400 whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">0-15d:</span> ₹{parseFloat(aging?.current_0_15_days || 0) >= 1000 ? `${(parseFloat(aging?.current_0_15_days || 0)/1000).toFixed(1)}k` : parseFloat(aging?.current_0_15_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '16–30 Days Balances' })}
            className="text-blue-400 whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">16-30d:</span> ₹{parseFloat(aging?.aging_16_30_days || 0) >= 1000 ? `${(parseFloat(aging?.aging_16_30_days || 0)/1000).toFixed(1)}k` : parseFloat(aging?.aging_16_30_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '31–60 Days Overdue Balances' })}
            className="text-amber-400 whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">31-60d:</span> ₹{parseFloat(aging?.aging_31_60_days || 0) >= 1000 ? `${(parseFloat(aging?.aging_31_60_days || 0)/1000).toFixed(1)}k` : parseFloat(aging?.aging_31_60_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '60+ Days Severe Risk Balances' })}
            className="text-rose-400 font-bold whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">60+d:</span> ₹{parseFloat(aging?.aging_60_plus_days || 0) >= 1000 ? `${(parseFloat(aging?.aging_60_plus_days || 0)/1000).toFixed(1)}k` : parseFloat(aging?.aging_60_plus_days || 0).toFixed(0)}
          </button>
        </div>
      </div>

      {/* ─── 2-COLUMN SPLIT GRID (55% / 45%) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* Left Column: Customer Aging Table (55% = 7 cols) */}
        <div className={`${mobileTab === 'velocity' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Customer Aging Matrix ({filteredCustomerAging.length})</span>
            </div>
            <span className="text-[10px] text-slate-500">1-Click WhatsApp reminder</span>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="min-w-[550px] w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                <tr>
                  <th className="py-2 px-2">Customer</th>
                  <th className="py-2 px-2 text-right">0–15d</th>
                  <th className="py-2 px-2 text-right">16–30d</th>
                  <th className="py-2 px-2 text-right">31–60d</th>
                  <th className="py-2 px-2 text-right">60+d</th>
                  <th className="py-2 px-2 text-right">Total Due</th>
                  <th className="py-2 px-2 text-center">Remind</th>
                </tr>
              </thead>
              <tbody>
                {(filteredCustomerAging || []).map(c => {
                  const total = parseFloat(c?.total_outstanding ?? c?.total_due ?? 0);
                  const isSevere = parseFloat(c?.aging_60_plus_days ?? c?.days_60_plus ?? 0) > 0;
                  const cName = c?.business_name || c?.customer_name || 'Customer';
                  const c0_15 = parseFloat(c?.current_0_15_days ?? c?.current_0_15 ?? 0);
                  const c16_30 = parseFloat(c?.aging_16_30_days ?? c?.days_16_30 ?? 0);
                  const c31_60 = parseFloat(c?.aging_31_60_days ?? c?.days_31_60 ?? 0);
                  const c60_plus = parseFloat(c?.aging_60_plus_days ?? c?.days_60_plus ?? 0);

                  return (
                    <tr key={c?.customer_id} className="border-b border-slate-800/50 hover:bg-slate-950/40 transition-colors">
                      <td className="py-2 px-2">
                        <span className="font-bold text-white block text-xs truncate max-w-[140px]">{cName}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{c?.customer_code || ''}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">₹{c0_15.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">₹{c16_30.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-amber-400">₹{c31_60.toFixed(0)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${isSevere ? 'text-rose-400' : 'text-slate-500'}`}>
                        ₹{c60_plus.toFixed(0)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-black text-amber-400">
                        ₹{total.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleSendWhatsAppReminder(c)}
                          className="p-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-[9px] font-bold"
                          title="WhatsApp Statement"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Product Velocity Leaderboard (45% = 5 cols) */}
        <div className={`${mobileTab === 'aging' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white shrink-0">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>SKU Sales Velocity ({productSales.length})</span>
            </div>
            <span className="text-[10px] text-slate-500">Units & Revenue</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5">
            {productSales.map((prod, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                <div className="overflow-hidden pr-2">
                  <span className="font-mono text-[10px] text-amber-400 font-bold">{prod.sku}</span>
                  <h5 className="font-bold text-white text-xs truncate mt-0.5">{prod.name || prod.product_name}</h5>
                  <p className="text-[10px] text-slate-400">{prod.units_sold ?? prod.total_quantity_sold ?? 0} packs sold</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-emerald-400 text-xs">
                    ₹{parseFloat(prod.revenue ?? prod.total_revenue ?? 0).toFixed(2)}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Volume Val</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── 3-LEVEL DRILLDOWN MODAL ─── */}
      <DrillableMetricModal
        isOpen={drillModal.isOpen}
        onClose={() => setDrillModal({ isOpen: false, metric: 'revenue', title: '' })}
        metricType={drillModal.metric}
        title={drillModal.title}
      />

    </div>
  );
};
