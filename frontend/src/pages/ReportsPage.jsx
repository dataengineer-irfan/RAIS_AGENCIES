import React, { useState, useEffect } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { reportApi } from '../services/api';
import { DrillableMetricModal } from '../components/DrillableMetricModal';

export const ReportsPage = () => {
  const [aging, setAging] = useState(null);
  const [customerAging, setCustomerAging] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drilldown Modal
  const [drillModal, setDrillModal] = useState({ isOpen: false, metric: 'revenue', title: '' });

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
    const total = parseFloat(cust.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const over60 = parseFloat(cust.aging_60_plus_days || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Payment Aging Statement*%0A%0ACustomer: *${cust.customer_name}*%0ATotal Outstanding: *₹${total}*%0AOverdue (>60 Days): *₹${over60}*%0A%0APlease arrange settlement via UPI (*9347453135@ybl*).%0A*RAIS Agencies*, Rayachoty.`;
    window.open(`https://wa.me/91${cust.phone || '9347453135'}?text=${text}`, '_blank');
  };

  const handleExportCSV = () => {
    const headers = ['Customer Code', 'Customer Name', 'Phone', '0-15 Days', '16-30 Days', '31-60 Days', '60+ Days', 'Total Outstanding'];
    const rows = customerAging.map(c => [
      `"${c.customer_code}"`,
      `"${c.customer_name}"`,
      `"${c.phone || ''}"`,
      c.current_0_15_days,
      c.aging_16_30_days,
      c.aging_31_60_days,
      c.aging_60_plus_days,
      c.total_outstanding
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

  const filteredCustomerAging = customerAging.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.customer_name || '').toLowerCase().includes(term) ||
      (c.customer_code || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term)
    );
  });

  const totalOutstandingVal = parseFloat(aging?.total_outstanding || 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP ACTION & HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
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
              Pattern #1 Power BI Sliced Analytics Hub + Pattern #4 Multi-Level Drillthrough
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
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
            />
          </div>

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

      {/* ─── 4 GLOWING KPI AGING BUCKETS RIBBON ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        <div 
          onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '0–15 Days Current Balances' })}
          className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/50 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">0–15 Days (Current)</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-lg font-black text-white mt-1 font-mono">
            ₹{parseFloat(aging?.current_0_15_days || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-slate-500">Normal healthy credit terms</span>
        </div>

        <div 
          onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '16–30 Days Balances' })}
          className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-blue-500/50 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">16–30 Days (Watch)</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-lg font-black text-white mt-1 font-mono">
            ₹{parseFloat(aging?.aging_16_30_days || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-slate-500">Approaching due limit</span>
        </div>

        <div 
          onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '31–60 Days Overdue Balances' })}
          className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-amber-500/50 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">31–60 Days (Aging)</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-lg font-black text-amber-400 mt-1 font-mono">
            ₹{parseFloat(aging?.aging_31_60_days || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-slate-500">Outreach settlement due</span>
        </div>

        <div 
          onClick={() => setDrillModal({ isOpen: true, metric: 'revenue', title: '60+ Days Severe Risk Balances' })}
          className="bg-slate-900 p-3 rounded-xl border border-slate-800 hover:border-rose-500/50 shadow-md cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">60+ Days (Severe Risk)</span>
            <ArrowUpRight className="w-3 h-3 text-slate-500" />
          </div>
          <p className="text-lg font-black text-rose-400 mt-1 font-mono">
            ₹{parseFloat(aging?.aging_60_plus_days || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[9px] text-slate-500">Supply restriction alert</span>
        </div>
      </div>

      {/* ─── 2-COLUMN SPLIT GRID (55% / 45%) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* Left Column: Customer Aging Table (55% = 7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-white shrink-0">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Customer Aging Matrix ({filteredCustomerAging.length})</span>
            </div>
            <span className="text-[10px] text-slate-500">1-Click WhatsApp reminder</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
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
                {filteredCustomerAging.map(c => {
                  const total = parseFloat(c.total_outstanding || 0);
                  const isSevere = parseFloat(c.aging_60_plus_days || 0) > 0;

                  return (
                    <tr key={c.customer_id} className="border-b border-slate-800/50 hover:bg-slate-950/40 transition-colors">
                      <td className="py-2 px-2">
                        <span className="font-bold text-white block text-xs truncate max-w-[140px]">{c.customer_name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">{c.customer_code}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">₹{parseFloat(c.current_0_15_days || 0).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">₹{parseFloat(c.aging_16_30_days || 0).toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-amber-400">₹{parseFloat(c.aging_31_60_days || 0).toFixed(0)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${isSevere ? 'text-rose-400' : 'text-slate-500'}`}>
                        ₹{parseFloat(c.aging_60_plus_days || 0).toFixed(0)}
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
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-xl flex flex-col overflow-hidden">
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
                  <h5 className="font-bold text-white text-xs truncate mt-0.5">{prod.name}</h5>
                  <p className="text-[10px] text-slate-400">{prod.units_sold} packs sold</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-emerald-400 text-xs">
                    ₹{parseFloat(prod.revenue || 0).toFixed(2)}
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
