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
  CheckCircle2,
  X,
  RefreshCw,
  Info
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
  const [fifoModalOpen, setFifoModalOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState('');
  
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
    try {
      const headers = ['Customer Code', 'Customer Name', 'Phone', '0-15 Days', '16-30 Days', '31-60 Days', '60+ Days', 'Total Outstanding'];
      const rows = customerAging.map(c => [
        `"${c.customer_code || ''}"`,
        `"${(c.business_name || c.customer_name || '').replace(/"/g, '""')}"`,
        `"${c.phone || ''}"`,
        c.current_0_15_days ?? c.current_0_15 ?? 0,
        c.aging_16_30_days ?? c.days_16_30 ?? 0,
        c.aging_31_60_days ?? c.days_31_60 ?? 0,
        c.aging_60_plus_days ?? c.days_60_plus ?? 0,
        c.total_outstanding ?? c.total_due ?? 0
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `RAIS_Aging_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setDownloadToast(`Aging CSV exported successfully (${customerAging.length} outlets)`);
      setTimeout(() => setDownloadToast(''), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setDownloadToast('Failed to export CSV. Please retry.');
      setTimeout(() => setDownloadToast(''), 4000);
    }
  };

  const handleReconcileFIFO = async () => {
    setReconciling(true);
    setReconcileSuccess('');
    try {
      const res = await paymentApi.reconcileFifo();
      const count = res?.total_customers_reconciled || 0;
      setReconcileSuccess(`Reconciled ${count} outlet${count === 1 ? '' : 's'} successfully via FIFO!`);
      setTimeout(() => setReconcileSuccess(''), 6000);
      setFifoModalOpen(false);
      await loadReports();
    } catch (err) {
      console.error('Failed to run FIFO reconciliation:', err);
      setReconcileSuccess('FIFO reconciliation failed. Please try again.');
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

  // Derive mathematically reconciled aging summary directly from ground-truth customer rows:
  const reconciledAging = useMemo(() => {
    if (customerAging && customerAging.length > 0) {
      const c0_15 = customerAging.reduce((s, c) => s + parseFloat(c.current_0_15_days ?? c.current_0_15 ?? 0), 0);
      const c16_30 = customerAging.reduce((s, c) => s + parseFloat(c.aging_16_30_days ?? c.days_16_30 ?? 0), 0);
      const c31_60 = customerAging.reduce((s, c) => s + parseFloat(c.aging_31_60_days ?? c.days_31_60 ?? 0), 0);
      const c60_plus = customerAging.reduce((s, c) => s + parseFloat(c.aging_60_plus_days ?? c.days_60_plus ?? 0), 0);
      const totalDue = customerAging.reduce((s, c) => s + parseFloat(c.total_outstanding ?? c.total_due ?? 0), 0);
      return {
        current_0_15_days: c0_15,
        aging_16_30_days: c16_30,
        aging_31_60_days: c31_60,
        aging_60_plus_days: c60_plus,
        total_outstanding: totalDue
      };
    }
    return aging;
  }, [customerAging, aging]);

  const totalOutstandingVal = parseFloat(reconciledAging?.total_outstanding || 0);

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

      {/* ─── DOWNLOAD CSV NOTIFICATION TOAST ─── */}
      {downloadToast && (
        <div className="bg-sky-500/10 border border-sky-500/30 text-sky-300 px-4 py-2 rounded-xl text-xs flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <span className="font-bold">{downloadToast}</span>
          </div>
          <button onClick={() => setDownloadToast('')} className="text-sky-400 hover:text-white text-xs">✕</button>
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
            onClick={() => setFifoModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
            title="Open FIFO Reconciliation Dialog"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>FIFO Reconcile</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95"
            title="Export Aging Report to CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
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
            onClick={() => setFifoModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold rounded-lg text-xs shrink-0 active:scale-95 transition shadow-xs"
            title="Auto-reconcile unallocated payments via FIFO"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="text-[10px]">FIFO</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 active:text-white rounded-lg text-xs font-bold shrink-0 transition"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] hidden xs:inline">CSV</span>
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
            <span className="text-slate-400 text-[9px]">0-15d:</span> ₹{parseFloat(reconciledAging?.current_0_15_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.current_0_15_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.current_0_15_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '16–30 Days Balances' })}
            className="text-blue-400 whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">16-30d:</span> ₹{parseFloat(reconciledAging?.aging_16_30_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_16_30_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.aging_16_30_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '31–60 Days Overdue Balances' })}
            className="text-amber-400 whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">31-60d:</span> ₹{parseFloat(reconciledAging?.aging_31_60_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_31_60_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.aging_31_60_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '60+ Days Severe Risk Balances' })}
            className="text-rose-400 font-bold whitespace-nowrap hover:underline active:scale-95"
          >
            <span className="text-slate-400 text-[9px]">60+d:</span> ₹{parseFloat(reconciledAging?.aging_60_plus_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_60_plus_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.aging_60_plus_days || 0).toFixed(0)}
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

          <div className="flex-1 min-h-0 overflow-auto pb-20 sm:pb-2">
            {/* ─── MOBILE CARD VIEW (< sm) ─── */}
            <div className="sm:hidden space-y-2">
              {(filteredCustomerAging || []).map(c => {
                const total = parseFloat(c?.total_outstanding ?? c?.total_due ?? 0);
                const isSevere = parseFloat(c?.aging_60_plus_days ?? c?.days_60_plus ?? 0) > 0;
                const cName = c?.business_name || c?.customer_name || 'Customer';
                const c0_15 = parseFloat(c?.current_0_15_days ?? c?.current_0_15 ?? 0);
                const c16_30 = parseFloat(c?.aging_16_30_days ?? c?.days_16_30 ?? 0);
                const c31_60 = parseFloat(c?.aging_31_60_days ?? c?.days_31_60 ?? 0);
                const c60_plus = parseFloat(c?.aging_60_plus_days ?? c?.days_60_plus ?? 0);

                return (
                  <div key={c?.customer_id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="overflow-hidden">
                        <span className="font-bold text-white text-xs block truncate">{cName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{c?.customer_code || 'OUTLET'}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase text-slate-500 font-bold block">Total Due</span>
                        <span className="font-mono font-black text-amber-400 text-sm">₹{total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Aging Buckets Micro-Pills */}
                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px] pt-1 border-t border-slate-900">
                      <div className="bg-slate-900/90 rounded p-1">
                        <span className="text-[8px] text-slate-500 block">0–15d</span>
                        <span className="text-slate-300 font-bold">₹{c0_15.toFixed(0)}</span>
                      </div>
                      <div className="bg-slate-900/90 rounded p-1">
                        <span className="text-[8px] text-slate-500 block">16–30d</span>
                        <span className="text-slate-300 font-bold">₹{c16_30.toFixed(0)}</span>
                      </div>
                      <div className="bg-slate-900/90 rounded p-1">
                        <span className="text-[8px] text-slate-500 block">31–60d</span>
                        <span className="text-amber-400 font-bold">₹{c31_60.toFixed(0)}</span>
                      </div>
                      <div className={`rounded p-1 ${isSevere ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-900/90 text-slate-500'}`}>
                        <span className="text-[8px] block opacity-75">60+d</span>
                        <span className="font-bold">₹{c60_plus.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Quick WhatsApp Action Bar */}
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleSendWhatsAppReminder(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold active:scale-95 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send WhatsApp Statement</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── DESKTOP TABLE VIEW (sm and above) ─── */}
            <table className="hidden sm:table min-w-[550px] w-full text-left text-xs border-collapse">
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

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 pb-20 sm:pb-2">
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

      {/* ─── FIFO RECONCILIATION EDUCATIONAL & CONFIRMATION MODAL ─── */}
      {fifoModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border-t-4 border-t-amber-500 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    FIFO Ledger Reconciliation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    First-In, First-Out Automatic Settlement Engine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFifoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                  <Info className="w-3.5 h-3.5" />
                  <span>How FIFO Reconciliation Works:</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When wholesale outlets pay lump-sum amounts without specifying which invoice is cleared, <b>FIFO (First-In, First-Out)</b> automatically allocates those payments against their <b>oldest open invoices first</b>.
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This guarantees that debt aging buckets (0–15d, 16–30d, 60+d) accurately reflect only truly outstanding recent shipments, preventing false overdue penalties.
                </p>
              </div>

              {/* Current Ledger Stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Debtors</p>
                  <p className="text-base font-black text-white mt-0.5 font-mono">
                    {customerAging.length} Outlets
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Debt Balance</p>
                  <p className="text-base font-black text-amber-400 mt-0.5 font-mono">
                    ₹{totalOutstandingVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFifoModalOpen(false)}
                disabled={reconciling}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReconcileFIFO}
                disabled={reconciling}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
              >
                {reconciling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reconciling...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run FIFO Reconciliation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
