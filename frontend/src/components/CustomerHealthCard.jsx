import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Phone, MessageSquare, ChevronRight, UserCheck, Clock } from 'lucide-react';
import { analyticsApi } from '../services/api';

export const CustomerHealthCard = ({ onSelectCustomer }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, AT_RISK, WATCH, HEALTHY

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
    const text = `*RAIS AGENCIES — Payment Statement Reminder*%0A%0ADear ${customer.name},%0AYour current outstanding balance is *₹${customer.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}* (Overdue: *₹${customer.overdue_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*).%0A%0APlease arrange settlement to maintain uninterrupted frozen supplies.%0A%0A*RAIS Agencies*, Rayachoty%0AHotline: 9347453135`;
    window.open(`https://wa.me/91${customer.phone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4"></div>
        <div className="h-24 bg-slate-800/40 rounded-2xl mb-4"></div>
      </div>
    );
  }

  if (!healthData) return null;

  const displayCustomers = healthData.customers.filter(c => {
    if (filter === 'ALL') return true;
    return c.health_status === filter;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide">
              Customer Health & Proactive Early Warning
            </h3>
            <p className="text-xs text-slate-400">
              DSO, payment punctuality history, and automated collections risk scoring.
            </p>
          </div>
        </div>

        {/* Traffic Light Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({healthData.total_customers})
          </button>
          <button
            onClick={() => setFilter('AT_RISK')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'AT_RISK' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-red-400/80 hover:text-red-400'
            }`}
          >
            🔴 At Risk ({healthData.at_risk_count})
          </button>
          <button
            onClick={() => setFilter('WATCH')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'WATCH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-amber-400/80 hover:text-amber-400'
            }`}
          >
            🟡 Watch ({healthData.watch_count})
          </button>
          <button
            onClick={() => setFilter('HEALTHY')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              filter === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-emerald-400/80 hover:text-emerald-400'
            }`}
          >
            🟢 Healthy ({healthData.healthy_count})
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-300 font-semibold">
          {healthData.insight_summary}
        </div>
        {healthData.total_overdue_risk > 0 && (
          <div className="text-xs font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 whitespace-nowrap">
            Overdue Capital: ₹{healthData.total_overdue_risk.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Customer Health Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
        {displayCustomers.map(c => {
          const isAtRisk = c.health_status === 'AT_RISK';
          const isWatch = c.health_status === 'WATCH';
          const isHealthy = c.health_status === 'HEALTHY';

          return (
            <div
              key={c.customer_id}
              className={`bg-slate-950/80 border rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all ${
                isAtRisk ? 'border-red-500/40 bg-red-950/10' :
                isWatch ? 'border-amber-500/30 bg-amber-950/10' :
                'border-slate-800 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isAtRisk ? 'bg-red-500 animate-pulse' :
                      isWatch ? 'bg-amber-400' :
                      'bg-emerald-400'
                    }`}></span>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{c.name}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {c.code} • {c.contact_person} ({c.phone})
                  </p>
                </div>

                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  isAtRisk ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  isWatch ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {c.health_status.replace('_', ' ')}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-slate-900">
                <div>
                  <span className="text-slate-500">Balance:</span>
                  <div className="font-bold text-white font-mono mt-0.5">
                    ₹{c.outstanding_balance.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Overdue:</span>
                  <div className={`font-bold font-mono mt-0.5 ${c.overdue_balance > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    ₹{c.overdue_balance.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">DSO / Delay:</span>
                  <div className="font-bold text-slate-300 font-mono mt-0.5">
                    {c.dso_days}d / {c.avg_days_late}d late
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                  {c.risk_reason}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  {c.overdue_balance > 0 && (
                    <button
                      onClick={() => handleSendWhatsAppReminder(c)}
                      className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Send WhatsApp Reminder"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Remind
                    </button>
                  )}
                  {onSelectCustomer && (
                    <button
                      onClick={() => onSelectCustomer(c)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
