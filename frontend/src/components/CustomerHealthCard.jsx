import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  Search,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { openWhatsApp } from '../utils/mobileHelpers';

export const CustomerHealthCard = ({ onSelectCustomer }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, AT_RISK, WATCH, HEALTHY
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getCustomerHealth();
      setHealthData(res);
    } catch (err) {
      console.error('Failed to fetch customer health:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppReminder = (customer) => {
    const bal = parseFloat(customer?.outstanding_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const overdue = parseFloat(customer?.overdue_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const text = `*RAIS AGENCIES — Payment Statement Reminder*\n\nDear *${customer?.name || 'Customer'}*,\nYour total outstanding ledger balance is *₹${bal}* (Overdue: *₹${overdue}*).\n\nPlease arrange UPI settlement (*9347453135@ybl*) to avoid delivery holds.\n\n*RAIS Agencies*, Rayachoty\nHotline: 9347453135`;
    openWhatsApp(customer?.phone || '9347453135', text);
  };

  const filteredCustomers = useMemo(() => {
    if (!healthData?.customers) return [];
    let list = healthData.customers;

    if (filter !== 'ALL') {
      list = list.filter(c => c?.health_status === filter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => {
        const name = (c?.name || '').toLowerCase();
        const code = (c?.code || '').toLowerCase();
        const phone = (c?.phone || '').toLowerCase();
        const person = (c?.contact_person || '').toLowerCase();
        return name.includes(term) || code.includes(term) || phone.includes(term) || person.includes(term);
      });
    }

    return list;
  }, [healthData, filter, searchTerm]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl animate-pulse space-y-3">
        <div className="h-6 w-48 bg-slate-800 rounded"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const totalOverdue = parseFloat(healthData?.total_overdue_risk || 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col h-full overflow-hidden gap-2.5">
      
      {/* ─── TOP SEARCH & FILTER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search outlet name, phone..."
              className="w-full pl-8 pr-6 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {totalOverdue > 0 && (
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2.5 py-1 bg-rose-500/10 text-rose-300 rounded-xl border border-rose-500/30 whitespace-nowrap">
              Overdue Risk: ₹{totalOverdue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>

        {/* Traffic Light Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              filter === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({healthData?.total_customers ?? 0})
          </button>
          <button
            onClick={() => setFilter('AT_RISK')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              filter === 'AT_RISK' 
                ? 'bg-rose-500 text-white shadow-sm' 
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            🔴 Risk ({healthData?.at_risk_count ?? 0})
          </button>
          <button
            onClick={() => setFilter('WATCH')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              filter === 'WATCH' 
                ? 'bg-amber-500 text-slate-950 shadow-sm' 
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            🟡 Watch ({healthData?.watch_count ?? 0})
          </button>
          <button
            onClick={() => setFilter('HEALTHY')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              filter === 'HEALTHY' 
                ? 'bg-emerald-500 text-white shadow-sm' 
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            🟢 Good ({healthData?.healthy_count ?? 0})
          </button>
        </div>
      </div>

      {/* ─── OUTLET HEALTH LIST (HIGH-DENSITY, INTERNAL SCROLL) ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 custom-scrollbar">
        {filteredCustomers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No outlets matching your filter.
          </div>
        ) : (
          filteredCustomers.map(c => {
            const isAtRisk = c?.health_status === 'AT_RISK';
            const isWatch = c?.health_status === 'WATCH';
            const balance = parseFloat(c?.outstanding_balance || 0);
            const overdue = parseFloat(c?.overdue_balance || 0);

            return (
              <div
                key={c?.customer_id}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  isAtRisk 
                    ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50' 
                    : isWatch
                    ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Outlet Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isAtRisk ? 'bg-rose-500 animate-pulse' : isWatch ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <h4 className="font-bold text-white text-xs truncate max-w-[180px] sm:max-w-[260px]">
                      {c?.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {c?.code}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full border ${
                      isAtRisk 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                        : isWatch 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {isAtRisk ? 'At Risk' : isWatch ? 'Watch' : 'Healthy'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                    <span>{c?.contact_person || 'Owner'}</span>
                    <span>•</span>
                    <span className="font-mono">{c?.phone}</span>
                    {c?.avg_days_late > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 font-medium">Avg {c?.avg_days_late}d late</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Ledger Metrics & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                  <div className="text-left sm:text-right">
                    <div className="font-mono font-bold text-xs text-white">
                      Due: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    {overdue > 0 ? (
                      <div className="font-mono text-[11px] font-bold text-rose-400">
                        Overdue: ₹{overdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Zero overdue
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {overdue > 0 && (
                      <button
                        onClick={() => handleSendWhatsAppReminder(c)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                        title="Send WhatsApp Payment Statement"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>
                    )}

                    {c?.phone && (
                      <a
                        href={`tel:${c?.phone}`}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                        title={`Call ${c?.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {onSelectCustomer && (
                      <button
                        onClick={() => onSelectCustomer(c)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition"
                        title="View Customer Ledgers"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
