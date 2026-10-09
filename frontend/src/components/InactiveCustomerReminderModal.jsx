import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  MessageSquare, 
  Phone, 
  ShoppingCart, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Building2, 
  ChevronRight, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { customerApi } from '../services/api';
import { openWhatsApp } from '../utils/mobileHelpers';

export const InactiveCustomerReminderModal = ({ isOpen, onClose, onSelectCustomerForOrder }) => {
  const [daysThreshold, setDaysThreshold] = useState(5);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [contactedMap, setContactedMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadAlerts(daysThreshold);
    }
  }, [isOpen, daysThreshold]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadAlerts = async (threshold) => {
    setLoading(true);
    setError('');
    try {
      const data = await customerApi.getReorderAlerts(threshold);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inactive re-order alerts:', err);
      setError('Unable to load re-order alerts. Tap below to retry.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsAppRestockPing = (cust) => {
    const text = `*RAIS AGENCIES — Restock & Order Reminder* 🍟🍗\n\nDear *${cust.business_name}*,\nIt has been *${cust.days_inactive} days* since your last stock replenishment with RAIS Agencies (Last order: *${cust.last_activity_str}*).\n\nDo you need to restock any of your fast-moving items today?\n• French Fries (Hiphop / Premium 6mm & 9mm)\n• Burger Patties & Veg/Non-Veg Nuggets\n• Momos & Finger Foods\n• Packaging & Boxes\n\nContact Wholesale Orders Hotline: *9347453135* to reserve delivery.\n\n*RAIS Agencies*.`;
    openWhatsApp(cust.phone, text);
    setContactedMap(prev => ({ ...prev, [cust.customer_id]: true }));
  };

  const handleDismissToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('rais_last_reorder_alert_date', today);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-t-4 border-t-amber-500 cursor-default"
      >
        
        {/* ─── MODAL HEADER ─── */}
        <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  Inactive Outlet Re-Order Reminder
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
                  {loading ? (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>Scanning...</span>
                    </span>
                  ) : alerts.length > 0 ? (
                    `${alerts.length} Outlets Need Ping`
                  ) : (
                    'All Replenished'
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Active commercial accounts with no wholesale orders placed in the last {daysThreshold}+ days.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── FILTER THRESHOLD SLICER BAR ─── */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-[11px]">Inactivity Filter:</span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: '5 Days (Standard)', val: 5 },
              { label: '7 Days (Critical)', val: 7 },
              { label: '14 Days (Dormant)', val: 14 }
            ].map(tab => (
              <button
                key={tab.val}
                onClick={() => setDaysThreshold(tab.val)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  daysThreshold === tab.val
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── SCROLLABLE CUSTOMER LIST ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-400" />
              <p className="text-xs">Analyzing customer order histories...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center space-y-2">
              <p>{error}</p>
              <button 
                onClick={() => loadAlerts(daysThreshold)}
                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-xs font-bold transition active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">All Outlets Active & Replenished!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every active account has ordered or been invoiced within the last {daysThreshold} days.
                </p>
              </div>
            </div>
          ) : (
            alerts.map((cust) => {
              const hasContacted = contactedMap[cust.customer_id];
              const balance = parseFloat(cust.outstanding_balance || 0);

              return (
                <div
                  key={cust.customer_id}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    hasContacted
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Outlet Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {cust.customer_code}
                      </span>
                      <h4 className="font-bold text-white text-xs truncate">
                        {cust.business_name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        📍 {cust.city}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-slate-400 text-[11px]">
                      <span>{cust.contact_person} • {cust.phone}</span>
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {cust.last_activity_str}
                      </span>
                      {balance > 0 && (
                        <span className="text-amber-400 font-mono font-bold">
                          Due: ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: 1-Click Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* WhatsApp Restock Ping */}
                    <button
                      onClick={() => handleSendWhatsAppRestockPing(cust)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        hasContacted
                          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20'
                      }`}
                      title="Send WhatsApp Restock Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{hasContacted ? 'Pinged' : 'WhatsApp'}</span>
                    </button>

                    {/* Direct Call */}
                    <a
                      href={`tel:${cust.phone}`}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                      title="Call Outlet Directly"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    {/* 1-Click New Order */}
                    {onSelectCustomerForOrder && (
                      <button
                        onClick={() => {
                          onSelectCustomerForOrder(cust);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                        title="Book New Wholesale Order"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Order</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── MODAL FOOTER ─── */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs shrink-0">
          <span className="text-[11px] text-slate-400 hidden sm:block">
            Tip: Consistent weekly contact boosts wholesale repeat re-orders by 35%.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDismissToday}
              className="flex-1 sm:flex-initial py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold text-center active:scale-95 transition-all"
            >
              Don't remind today
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black text-center shadow-md active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
