import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Package,
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
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { reportApi, paymentApi, getLocalCachedSnapshot } from '../services/api';
import { openWhatsApp } from '../utils/mobileHelpers';
import { DrillableMetricModal } from '../components/DrillableMetricModal';

export const ReportsPage = () => {
  const [aging, setAging] = useState(() => getLocalCachedSnapshot('reports_aging'));
  const [customerAging, setCustomerAging] = useState(() => getLocalCachedSnapshot('reports_customer_aging') || []);
  const [productSales, setProductSales] = useState([]);
  const [loading, setLoading] = useState(() => !getLocalCachedSnapshot('reports_aging'));
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState('');
  const [fifoModalOpen, setFifoModalOpen] = useState(false);
  
  // Drilldown Modal
  const [drillModal, setDrillModal] = useState({ isOpen: false, metric: 'revenue', title: '' });
  const [mobileTab, setMobileTab] = useState('aging'); // 'aging' | 'velocity'
  const [selectedAgingBucket, setSelectedAgingBucket] = useState('ALL'); // 'ALL' | '0-15' | '16-30' | '31-60' | '60+'

  // Multi-Column Interactive Sort States
  const [agingSortField, setAgingSortField] = useState('total_due'); // 'total_due', 'name', '0-15', '16-30', '31-60', '60+'
  const [agingSortAsc, setAgingSortAsc] = useState(false);
  const [velocitySortField, setVelocitySortField] = useState('revenue'); // 'revenue', 'volume', 'name', 'sku'
  const [velocitySortAsc, setVelocitySortAsc] = useState(false);

  const handleAgingSort = (field) => {
    if (agingSortField === field) {
      setAgingSortAsc(!agingSortAsc);
    } else {
      setAgingSortField(field);
      setAgingSortAsc(field === 'name');
    }
  };

  const handleVelocitySort = (field) => {
    if (velocitySortField === field) {
      setVelocitySortAsc(!velocitySortAsc);
    } else {
      setVelocitySortField(field);
      setVelocitySortAsc(field === 'name' || field === 'sku');
    }
  };

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
    if (!aging) setLoading(true);
    try {
      const [agingRes, custAgingRes, prodRes] = await Promise.allSettled([
        reportApi.getAging(),
        reportApi.getCustomerAging(),
        reportApi.getProductSales()
      ]);
      if (agingRes.status === 'fulfilled' && agingRes.value) {
        setAging(agingRes.value);
      }
      if (custAgingRes.status === 'fulfilled' && custAgingRes.value) {
        setCustomerAging(Array.isArray(custAgingRes.value) ? custAgingRes.value : []);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value) {
        setProductSales(Array.isArray(prodRes.value) ? prodRes.value : []);
      }
    } catch (err) {
      console.warn('Failed to refresh reports from network (preserved cached state):', err?.message || err);
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
    let list = customerAging || [];

    // Filter by selected aging bucket
    if (selectedAgingBucket === '0-15') {
      list = list.filter(c => parseFloat(c?.current_0_15_days ?? c?.current_0_15 ?? 0) > 0);
    } else if (selectedAgingBucket === '16-30') {
      list = list.filter(c => parseFloat(c?.aging_16_30_days ?? c?.days_16_30 ?? 0) > 0);
    } else if (selectedAgingBucket === '31-60') {
      list = list.filter(c => parseFloat(c?.aging_31_60_days ?? c?.days_31_60 ?? 0) > 0);
    } else if (selectedAgingBucket === '60+') {
      list = list.filter(c => parseFloat(c?.aging_60_plus_days ?? c?.days_60_plus ?? 0) > 0);
    }

    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      list = list.filter(c => {
        const name = (c.business_name || c.customer_name || '').toLowerCase();
        return (
          name.includes(term) ||
          (c.customer_code || '').toLowerCase().includes(term) ||
          (c.phone || '').includes(term)
        );
      });
    }

    // Apply interactive column sort
    return list.slice().sort((a, b) => {
      if (agingSortField === 'name') {
        const aN = (a.business_name || a.customer_name || '').toLowerCase();
        const bN = (b.business_name || b.customer_name || '').toLowerCase();
        return agingSortAsc ? aN.localeCompare(bN) : bN.localeCompare(aN);
      }
      let aVal = 0;
      let bVal = 0;
      if (agingSortField === '0-15') {
        aVal = parseFloat(a?.current_0_15_days ?? a?.current_0_15 ?? 0);
        bVal = parseFloat(b?.current_0_15_days ?? b?.current_0_15 ?? 0);
      } else if (agingSortField === '16-30') {
        aVal = parseFloat(a?.aging_16_30_days ?? a?.days_16_30 ?? 0);
        bVal = parseFloat(b?.aging_16_30_days ?? b?.days_16_30 ?? 0);
      } else if (agingSortField === '31-60') {
        aVal = parseFloat(a?.aging_31_60_days ?? a?.days_31_60 ?? 0);
        bVal = parseFloat(b?.aging_31_60_days ?? b?.days_31_60 ?? 0);
      } else if (agingSortField === '60+') {
        aVal = parseFloat(a?.aging_60_plus_days ?? a?.days_60_plus ?? 0);
        bVal = parseFloat(b?.aging_60_plus_days ?? b?.days_60_plus ?? 0);
      } else {
        // 'total_due'
        aVal = parseFloat(a?.total_outstanding ?? a?.total_due ?? 0);
        bVal = parseFloat(b?.total_outstanding ?? b?.total_due ?? 0);
      }
      return agingSortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [customerAging, debouncedSearch, selectedAgingBucket, agingSortField, agingSortAsc]);

  // Sorted SKU Sales Velocity
  const sortedProductSales = useMemo(() => {
    let list = productSales || [];
    return list.slice().sort((a, b) => {
      if (velocitySortField === 'name') {
        const aN = (a.name || a.product_name || '').toLowerCase();
        const bN = (b.name || b.product_name || '').toLowerCase();
        return velocitySortAsc ? aN.localeCompare(bN) : bN.localeCompare(aN);
      }
      if (velocitySortField === 'sku') {
        const aS = (a.sku || '').toLowerCase();
        const bS = (b.sku || '').toLowerCase();
        return velocitySortAsc ? aS.localeCompare(bS) : bS.localeCompare(aS);
      }
      if (velocitySortField === 'volume') {
        const aV = parseFloat(a.units_sold ?? a.total_quantity_sold ?? 0);
        const bV = parseFloat(b.units_sold ?? b.total_quantity_sold ?? 0);
        return velocitySortAsc ? aV - bV : bV - aV;
      }
      // default: revenue
      const aR = parseFloat(a.revenue ?? a.total_revenue ?? 0);
      const bR = parseFloat(b.revenue ?? b.total_revenue ?? 0);
      return velocitySortAsc ? aR - bR : bR - aR;
    });
  }, [productSales, velocitySortField, velocitySortAsc]);

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

      {/* ─── DESKTOP UNIFIED COMMAND RIBBON (>= md) ─── */}
      <div className="hidden md:flex items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-1.5 shrink-0 shadow-md min-h-[46px]">
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-black text-white whitespace-nowrap">
              Financial Reports
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
              {filteredCustomerAging.length}/{customerAging.length} Outlets
            </span>
          </div>
        </div>

        {/* Center: 1-Click Aging Bucket Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedAgingBucket('ALL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedAgingBucket === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Dues
          </button>
          <button
            onClick={() => setSelectedAgingBucket(prev => prev === '0-15' ? 'ALL' : '0-15')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedAgingBucket === '0-15'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
            title="Filter 0–15 Days Balances"
          >
            <span>🟢 0–15d</span>
            <span className="font-mono text-[10px]">
              ₹{parseFloat(reconciledAging?.current_0_15_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.current_0_15_days || 0)/1000).toFixed(0)}k` : parseFloat(reconciledAging?.current_0_15_days || 0).toFixed(0)}
            </span>
          </button>
          <button
            onClick={() => setSelectedAgingBucket(prev => prev === '16-30' ? 'ALL' : '16-30')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedAgingBucket === '16-30'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
            title="Filter 16–30 Days Balances"
          >
            <span>🔵 16–30d</span>
            <span className="font-mono text-[10px]">
              ₹{parseFloat(reconciledAging?.aging_16_30_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_16_30_days || 0)/1000).toFixed(0)}k` : parseFloat(reconciledAging?.aging_16_30_days || 0).toFixed(0)}
            </span>
          </button>
          <button
            onClick={() => setSelectedAgingBucket(prev => prev === '31-60' ? 'ALL' : '31-60')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedAgingBucket === '31-60'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
            title="Filter 31–60 Days Balances"
          >
            <span>🟡 31–60d</span>
            <span className="font-mono text-[10px]">
              ₹{parseFloat(reconciledAging?.aging_31_60_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_31_60_days || 0)/1000).toFixed(0)}k` : parseFloat(reconciledAging?.aging_31_60_days || 0).toFixed(0)}
            </span>
          </button>
          <button
            onClick={() => setSelectedAgingBucket(prev => prev === '60+' ? 'ALL' : '60+')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedAgingBucket === '60+'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
            }`}
            title="Filter 60+ Days Severe Risk Balances"
          >
            <span>🔴 60+d</span>
            <span className="font-mono text-[10px]">
              ₹{parseFloat(reconciledAging?.aging_60_plus_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_60_plus_days || 0)/1000).toFixed(0)}k` : parseFloat(reconciledAging?.aging_60_plus_days || 0).toFixed(0)}
            </span>
          </button>
        </div>

        {/* Center-Right: Omni-Search Input with Clear */}
        <div className="relative flex-1 max-w-[220px] min-w-[130px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search outlet, phone..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
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

        {/* Live Total Outstanding Micro-Ticker */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-[11px] shrink-0">
          <span className="text-amber-400">Due: <strong className="font-bold">₹{totalOutstandingVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
        </div>

        {/* Right: FIFO Reconcile CTA */}
        <button
          onClick={() => setFifoModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-105 shrink-0"
          title="Open FIFO Reconciliation Dialog"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>FIFO Reconcile</span>
        </button>
      </div>

      {/* ─── MOBILE NATIVE ULTRA-COMPACT CONTROLS (< md) ─── */}
      <div className="flex md:hidden flex-col gap-1.5 shrink-0">
        {/* Row 1: Search + View Switcher + FIFO */}
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
        </div>

        {/* Row 2: 1-Line Sleek Aging Buckets & Due Micro-Strip */}
        <div className="flex items-center justify-between gap-1 px-2 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] font-mono overflow-x-auto no-scrollbar shrink-0">
          <button 
            onClick={() => setSelectedAgingBucket('ALL')}
            className={`px-1.5 py-0.5 rounded transition-all font-bold whitespace-nowrap flex items-center gap-1 active:scale-95 cursor-pointer ${
              selectedAgingBucket === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30'
                : 'text-amber-400 hover:text-white'
            }`}
            title="Show All Outlets with Dues"
          >
            <span className="text-[9px] uppercase font-sans text-slate-400">Due:</span>
            <span>₹{totalOutstandingVal >= 1000 ? `${(totalOutstandingVal/1000).toFixed(1)}k` : totalOutstandingVal.toFixed(0)}</span>
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setSelectedAgingBucket(prev => prev === '0-15' ? 'ALL' : '0-15')}
            className={`px-1.5 py-0.5 rounded transition-all font-bold whitespace-nowrap active:scale-95 cursor-pointer ${
              selectedAgingBucket === '0-15'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 ring-1 ring-emerald-500/40 shadow-sm'
                : 'text-emerald-400 hover:text-emerald-200'
            }`}
            title="Filter Outlets with 0–15 Days Balances"
          >
            <span className="text-slate-400 text-[9px]">0-15d:</span> ₹{parseFloat(reconciledAging?.current_0_15_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.current_0_15_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.current_0_15_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setSelectedAgingBucket(prev => prev === '16-30' ? 'ALL' : '16-30')}
            className={`px-1.5 py-0.5 rounded transition-all font-bold whitespace-nowrap active:scale-95 cursor-pointer ${
              selectedAgingBucket === '16-30'
                ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50 ring-1 ring-blue-500/40 shadow-sm'
                : 'text-blue-400 hover:text-blue-200'
            }`}
            title="Filter Outlets with 16–30 Days Balances"
          >
            <span className="text-slate-400 text-[9px]">16-30d:</span> ₹{parseFloat(reconciledAging?.aging_16_30_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_16_30_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.aging_16_30_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setSelectedAgingBucket(prev => prev === '31-60' ? 'ALL' : '31-60')}
            className={`px-1.5 py-0.5 rounded transition-all font-bold whitespace-nowrap active:scale-95 cursor-pointer ${
              selectedAgingBucket === '31-60'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 ring-1 ring-amber-500/40 shadow-sm'
                : 'text-amber-400 hover:text-amber-200'
            }`}
            title="Filter Outlets with 31–60 Days Balances"
          >
            <span className="text-slate-400 text-[9px]">31-60d:</span> ₹{parseFloat(reconciledAging?.aging_31_60_days || 0) >= 1000 ? `${(parseFloat(reconciledAging?.aging_31_60_days || 0)/1000).toFixed(1)}k` : parseFloat(reconciledAging?.aging_31_60_days || 0).toFixed(0)}
          </button>
          <span className="text-slate-700">|</span>
          <button 
            onClick={() => setSelectedAgingBucket(prev => prev === '60+' ? 'ALL' : '60+')}
            className={`px-1.5 py-0.5 rounded transition-all font-bold whitespace-nowrap active:scale-95 cursor-pointer ${
              selectedAgingBucket === '60+'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 ring-1 ring-rose-500/40 shadow-sm'
                : 'text-rose-400 hover:text-rose-200'
            }`}
            title="Filter Outlets with 60+ Days Severe Risk Balances"
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Customer Aging Matrix ({filteredCustomerAging.length}
                {selectedAgingBucket !== 'ALL' ? ` in ${selectedAgingBucket}d` : ' Outlets'})
              </span>
              {selectedAgingBucket !== 'ALL' && (
                <button
                  onClick={() => setSelectedAgingBucket('ALL')}
                  className="text-[10px] text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 transition"
                  title="Clear bucket filter"
                >
                  <span>Reset</span>
                  <span>✕</span>
                </button>
              )}
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
                  <th 
                    onClick={() => handleAgingSort('name')}
                    className="py-2 px-2 cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer</span>
                      {agingSortField === 'name' ? (
                        agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleAgingSort('0-15')}
                    className="py-2 px-2 text-right cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>0–15d</span>
                      {agingSortField === '0-15' && (agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleAgingSort('16-30')}
                    className="py-2 px-2 text-right cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>16–30d</span>
                      {agingSortField === '16-30' && (agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleAgingSort('31-60')}
                    className="py-2 px-2 text-right cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>31–60d</span>
                      {agingSortField === '31-60' && (agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleAgingSort('60+')}
                    className="py-2 px-2 text-right cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>60+d</span>
                      {agingSortField === '60+' && (agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />)}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleAgingSort('total_due')}
                    className="py-2 px-2 text-right cursor-pointer select-none hover:text-white transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Due</span>
                      {agingSortField === 'total_due' ? (
                        agingSortAsc ? <ArrowUp className="w-3 h-3 text-amber-400" /> : <ArrowDown className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 text-slate-600" />
                      )}
                    </div>
                  </th>
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
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white shrink-0 flex-wrap gap-1.5">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              <span>SKU Velocity ({productSales.length})</span>
            </div>

            {/* Quick 1-Click Sort Pills for SKU Velocity */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                onClick={() => handleVelocitySort('revenue')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  velocitySortField === 'revenue' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Revenue"
              >
                ₹ Rev {velocitySortField === 'revenue' && (velocitySortAsc ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleVelocitySort('volume')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  velocitySortField === 'volume' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="Sort by Volume (Packs Sold)"
              >
                Packs {velocitySortField === 'volume' && (velocitySortAsc ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleVelocitySort('name')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  velocitySortField === 'name' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
                title="Sort A-Z"
              >
                A-Z {velocitySortField === 'name' && (velocitySortAsc ? '↑' : '↓')}
              </button>
            </div>

            <button
              onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: 'Product Category Sales Deep-Dive' })}
              className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 transition active:scale-95 ml-auto sm:ml-0"
              title="Drilldown into product categories and SKUs"
            >
              <span>Drill</span>
              <span>→</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 pb-20 sm:pb-2">
            {sortedProductSales.map((prod, idx) => (
              <div 
                key={idx}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
              >
                <div className="overflow-hidden pr-2">
                  <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">{prod.sku}</span>
                  <h5 className="font-bold text-white text-xs truncate mt-0.5">{prod.name || prod.product_name}</h5>
                  <p className="text-[10px] text-slate-400">{prod.units_sold ?? prod.total_quantity_sold ?? 0} packs sold</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                    ₹{parseFloat(prod.revenue ?? prod.total_revenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
