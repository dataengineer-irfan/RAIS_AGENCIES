import React, { useState, useEffect } from 'react';
import { 
  Home,
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Phone, 
  MessageSquare, 
  Boxes, 
  Users, 
  Clock, 
  DollarSign, 
  Wallet, 
  CreditCard, 
  Truck, 
  Sparkles, 
  ChevronRight, 
  ArrowUpRight, 
  Save, 
  Edit3, 
  FileText,
  PlusCircle,
  ShieldAlert,
  Flame,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { executiveApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const HomePage = ({
  onOpenInvoiceBuilder,
  onOpenPaymentModal,
  onNavigate
}) => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en'); // 'en' | 'te'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);

  // Memo state
  const [memoText, setMemoText] = useState('');
  const [memoAuthor, setMemoAuthor] = useState('');
  const [memoTime, setMemoTime] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoSaveSuccess, setMemoSaveSuccess] = useState(false);

  const fetchBriefingData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      const res = await executiveApi.getBriefing(force);
      setBriefing(res);
      if (res?.handover_memo) {
        setMemoText(res.handover_memo.memo || '');
        setMemoAuthor(res.handover_memo.updated_by || 'Operator');
        setMemoTime(res.handover_memo.updated_at || '');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching executive briefing:', err);
      setError('Unable to fetch live briefing. Retrying...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBriefingData();
  }, []);

  const handleSaveMemo = async () => {
    try {
      setSavingMemo(true);
      const author = user?.full_name || 'Brother / Operator';
      const updated = await executiveApi.updateMemo(memoText, author);
      setMemoAuthor(updated.updated_by);
      setMemoTime(updated.updated_at);
      setIsEditingMemo(false);
      setMemoSaveSuccess(true);
      setTimeout(() => setMemoSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save memo:', err);
      alert('Failed to save memo. Please try again.');
    } finally {
      setSavingMemo(false);
    }
  };

  const isTe = lang === 'te';

  if (loading && !briefing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm font-semibold tracking-wide">
          {isTe ? 'రాయచోటి వ్యాపార సమాచారం సేకరిస్తోంది...' : 'Loading Executive Morning Briefing...'}
        </p>
      </div>
    );
  }

  const vitals = briefing?.vital_signs || {};
  const trafficLights = briefing?.traffic_lights || [];
  const priorities = briefing?.priorities || [];
  const marketIntel = briefing?.market_intelligence || [];

  const p1 = priorities.find(p => p.id === 'debt_recovery') || priorities[0];
  const p2 = priorities.find(p => p.id === 'depot_stockouts') || priorities[1];
  const p3 = priorities.find(p => p.id === 'customer_churn') || priorities[2];

  // Helper for Indian currency
  const formatINR = (val) => {
    if (val === undefined || val === null) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO HEADER & BILINGUAL TOGGLE BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isTe ? 'VP / యజమాని ఉదయపు సమీక్ష' : 'VP / Owner Morning Cockpit'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {briefing?.today_date} • Rayachoty Depot
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            {isTe ? 'వ్యాపార స్థితిగతులు & తక్షణ నిర్ణయాలు' : 'Operational Situational Awareness'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
            {isTe 
              ? 'ఈ రోజు మార్కెట్ బకాయిలు, డిపో స్టాక్ అవసరాలు, మరియు రాయచోటి విక్రయ అవకాశాలు.'
              : 'Real-time decision intelligence: debt collection, depot stockouts, customer retention & market opportunities.'}
          </p>
        </div>

        {/* Action Controls: Language Toggle & Refresh */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Language Switcher Pill */}
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 flex items-center shadow-inner">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isTe 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
            <button
              onClick={() => setLang('te')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isTe 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇮🇳</span>
              <span>తెలుగు</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchBriefingData(true)}
            disabled={refreshing}
            title={isTe ? "సమాచారం రీఫ్రెష్ చేయండి" : "Refresh Briefing Data"}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXECUTIVE TRAFFIC LIGHTS (Vital Signs Status)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {trafficLights.map((tl) => {
          const isGreen = tl.status === 'GREEN';
          const isAmber = tl.status === 'AMBER';
          const bgBadge = isGreen 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
            : isAmber 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
              : 'bg-rose-500/15 border-rose-500/30 text-rose-400';
          const dotColor = isGreen ? 'bg-emerald-400' : isAmber ? 'bg-amber-400' : 'bg-rose-400';

          return (
            <div 
              key={tl.key}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400 tracking-wide">
                  {isTe ? tl.label_te : tl.label_en}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 ${bgBadge}`}>
                  <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
                  {tl.metric}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-medium leading-relaxed">
                {isTe ? tl.desc_te : tl.desc_en}
              </p>
            </div>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. KEY COMMERCIAL VITAL NUMBERS (Live Pulse)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Today's Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "ఈ రోజు బిల్లింగ్" : "Today's Billing"}
          </span>
          <div className="mt-1">
            <p className="text-lg font-black text-white">{formatINR(vitals.today_revenue)}</p>
            <span className="text-[10px] text-amber-400/90 font-medium">
              {vitals.today_invoices_count} {isTe ? 'బిల్లులు' : 'bills issued'}
            </span>
          </div>
        </div>

        {/* Today's Collections */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "ఈ రోజు వసూళ్లు" : "Today Collected"}
          </span>
          <div className="mt-1">
            <p className="text-lg font-black text-emerald-400">{formatINR(vitals.today_collections)}</p>
            <span className="text-[10px] text-slate-400 font-mono">
              Cash: {formatINR(vitals.today_cash)} • UPI: {formatINR(vitals.today_upi)}
            </span>
          </div>
        </div>

        {/* Market Overdue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "మార్కెట్ బకాయిలు" : "Total Overdue"}
          </span>
          <div className="mt-1">
            <p className="text-lg font-black text-rose-400">{formatINR(vitals.total_overdue)}</p>
            <span className="text-[10px] text-slate-400">
              {isTe ? 'మొత్తం బ్యాలెన్స్: ' : 'Net Dues: '}{formatINR(vitals.total_receivables)}
            </span>
          </div>
        </div>

        {/* MTD Profit */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "ఈ నెల లాభం" : "MTD Profit"}
          </span>
          <div className="mt-1">
            <p className="text-lg font-black text-emerald-300">{formatINR(vitals.mtd_profit)}</p>
            <span className="text-[10px] text-amber-400 font-bold">
              {vitals.mtd_margin_pct}% {isTe ? 'సగటు మార్జిన్' : 'Margin'}
            </span>
          </div>
        </div>

        {/* Depot Stockouts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "డిపో స్టాక్ లోటు" : "Low Stock SKUs"}
          </span>
          <div className="mt-1">
            <p className={`text-lg font-black ${vitals.depot_stockouts_count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {vitals.depot_stockouts_count}
            </p>
            <span className="text-[10px] text-slate-400">
              {vitals.depot_stockouts_count > 0 ? (isTe ? 'రీఆర్డర్ అవసరం' : 'Needs reorder') : (isTe ? 'సమృద్ధిగా ఉంది' : 'Stock healthy')}
            </span>
          </div>
        </div>

        {/* Active Outlets */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isTe ? "క్రియాశీల షాపులు" : "Active Outlets"}
          </span>
          <div className="mt-1">
            <p className="text-lg font-black text-white">{vitals.active_outlets_count}</p>
            <span className="text-[10px] text-slate-400">
              {vitals.open_invoices_count} {isTe ? 'ఓపెన్ బిల్లులు' : 'open invoices'}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. VP ACTION PRIORITIES (1, 2, 3 QUEUE)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            {isTe ? "ఉదయపు అత్యవసర ప్రాధాన్యతలు (VP యాక్షన్ క్యూ)" : "Morning Operational Priorities (VP Action Queue)"}
          </h2>
          <span className="text-xs text-slate-400">
            {isTe ? "ప్రాధాన్యతా క్రమం: రికవరీ • ఇన్వెంటరీ • కస్టమర్ రిటెన్షన్" : "Ranked: Cash • Stock • Retention"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ─── PRIORITY 1: DEBT RECOVERY ─── */}
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-rose-500/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  {isTe ? "ప్రాధాన్యత 1 • నగదు రికవరీ" : "Priority 1 • Cash Recovery"}
                </span>
                <span className="text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-800/50">
                  {isTe ? p1?.badge_te : p1?.badge_en}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">
                {isTe ? p1?.title_te : p1?.title_en}
              </h3>
              
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {isTe ? p1?.summary_te : p1?.summary_en}
              </p>

              {p1?.amount > 0 && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isTe ? "అత్యధిక బకాయి మొత్తం" : "Top Debtor Overdue"}
                    </span>
                    <p className="text-lg font-black text-rose-400">{formatINR(p1.amount)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isTe ? "పాత బిల్లు ఆలస్యం" : "Oldest Overdue"}
                    </span>
                    <p className="text-sm font-bold text-amber-300">
                      {p1.days_overdue} {isTe ? 'రోజులు' : 'days'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {p1?.amount > 0 ? (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                {p1.actions?.map((act, idx) => {
                  if (act.type === 'WHATSAPP') {
                    const waUrl = isTe ? (p1.whatsapp_url_te || p1.whatsapp_url) : p1.whatsapp_url;
                    return (
                      <a
                        key={idx}
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isTe ? act.label_te : act.label_en}</span>
                      </a>
                    );
                  }
                  if (act.type === 'CALL') {
                    return (
                      <a
                        key={idx}
                        href={act.tel}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTe ? act.label_te : act.label_en}</span>
                      </a>
                    );
                  }
                  if (act.type === 'COLLECT') {
                    return (
                      <button
                        key={idx}
                        onClick={() => onOpenPaymentModal && onOpenPaymentModal({ id: p1.customer_id, business_name: p1.customer_name })}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>{isTe ? act.label_te : act.label_en}</span>
                      </button>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTe ? "అన్ని ఖాతాలు సక్రమంగా ఉన్నాయి" : "All customer balances healthy"}</span>
              </div>
            )}
          </div>

          {/* ─── PRIORITY 2: DEPOT STOCKOUTS (Dynamic Velocity Ranking) ─── */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Boxes className="w-3 h-3" />
                  {isTe ? "ప్రాధాన్యత 2 • డిపో ఇన్వెంటరీ" : "Priority 2 • Depot Inventory"}
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-800/50">
                  {isTe ? p2?.badge_te : p2?.badge_en}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">
                {isTe ? p2?.title_te : p2?.title_en}
              </h3>
              
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {isTe ? p2?.summary_te : p2?.summary_en}
              </p>

              {/* Dynamic Velocity List */}
              {p2?.items && p2.items.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {p2.items.slice(0, 3).map((item, i) => (
                    <div key={item.product_id || i} className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <p className="font-bold text-slate-200 truncate">{item.name}</p>
                        <span className="text-[10px] text-slate-400">{item.sku} • {item.units_sold_velocity} {isTe ? 'అమ్మకాలు' : 'sold'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black shrink-0 ${
                        item.current_stock <= 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.current_stock} {item.packaging_unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inward Shortcut Button */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => onNavigate && onNavigate('inventory')}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isTe ? "స్టాక్ నమోదు చేయండి (ఇన్‌వర్డ్)" : "Inward / Adjust Stock in Inventory"}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* ─── PRIORITY 3: CUSTOMER RETENTION & CADENCE ─── */}
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-blue-500/60 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {isTe ? "ప్రాధాన్యత 3 • కస్టమర్ రిటెన్షన్" : "Priority 3 • Retention Radar"}
                </span>
                <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-800/50">
                  {isTe ? p3?.badge_te : p3?.badge_en}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">
                {isTe ? p3?.title_te : p3?.title_en}
              </h3>
              
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {isTe ? p3?.summary_te : p3?.summary_en}
              </p>

              {/* Inactive Customers List */}
              {p3?.customers && p3.customers.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {p3.customers.slice(0, 2).map((c, i) => (
                    <div key={c.customer_id || i} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <p className="font-bold text-slate-200 truncate">{c.business_name}</p>
                        <span className="text-[10px] text-slate-400">
                          {c.city} • {isTe ? 'ఇష్టమైన వస్తువు: ' : 'Fav: '}{c.favorite_item}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {c.days_inactive} {isTe ? 'రోజులు' : 'days inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Retention Re-engagement Button */}
            {p3?.top_customer ? (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex gap-2">
                <a
                  href={isTe ? (p3.top_customer.whatsapp_url_te || p3.top_customer.whatsapp_url_en) : p3.top_customer.whatsapp_url_en}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isTe ? "వాట్సాప్ రీఆర్డర్ మెసేజ్" : "WhatsApp Reorder Invite"}</span>
                </a>
                <a
                  href={`tel:${p3.top_customer.phone}`}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4 text-blue-400" />
                </a>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isTe ? "అన్ని రెగ్యులర్ కేఫ్‌లు ఆర్డర్ చేశాయి" : "All regular clients active"}</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. RAYACHOTY LOCAL MARKET & COMMERCIAL INTELLIGENCE
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            {isTe ? "రాయచోటి స్థానిక వ్యాపార అవకాశాలు & సూచనలు" : "Rayachoty Market & Commercial Intelligence"}
          </h2>
          <span className="text-xs text-slate-400">
            {isTe ? "ఇన్‌వాయిస్ డేటా ఆధారిత సూచనలు" : "Inferred from live billing & order basket patterns"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marketIntel.map((intel, idx) => (
            <div 
              key={intel.id || idx}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all"
            >
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {isTe ? intel.tag_te : intel.tag_en}
                </span>

                <h4 className="text-sm font-bold text-white mt-2.5 leading-snug">
                  {isTe ? intel.title_te : intel.title_en}
                </h4>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                  {isTe ? intel.insight_te : intel.insight_en}
                </p>
              </div>

              {intel.action_recommended_en && (
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-2 text-amber-300 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="leading-tight">
                    {isTe ? intel.action_recommended_te : intel.action_recommended_en}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. BROTHER COLLABORATIVE HANDOVER MEMO (Live 2-Brothers Sync)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isTe ? "సోదరుల సమన్వయ నోట్ (షిఫ్ట్ హ్యాండోవర్ మెమో)" : "Brother Operational Handover Memo"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isTe ? `చివరిగా అప్‌డేట్ చేసినవారు: ${memoAuthor} (${memoTime})` : `Last updated by: ${memoAuthor} (${memoTime})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {memoSaveSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isTe ? "సేవ్ అయ్యింది!" : "Saved live!"}
              </span>
            )}
            <button
              onClick={() => {
                if (isEditingMemo) {
                  handleSaveMemo();
                } else {
                  setIsEditingMemo(true);
                }
              }}
              disabled={savingMemo}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isEditingMemo 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-500/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {savingMemo ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isEditingMemo ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isTe ? "సేవ్ చేయండి" : "Save Memo"}</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTe ? "నోట్ రాయండి" : "Edit Memo"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isEditingMemo ? (
          <div className="space-y-2">
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder={isTe 
                ? "ఉదాహరణ: బ్యాంకులో ₹15,000 నగదు డిపాజిట్ చేశాను. మధ్యాహ్నం 3 గంటలకు సుండుపల్లె వ్యాన్ వెళ్తుంది..."
                : "e.g. Deposited ₹15,000 cash in SBI bank today. Sundupalli route delivery van leaves at 3:00 PM..."}
              rows={3}
              className="w-full bg-slate-950/90 border border-amber-500/40 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono leading-relaxed"
            />
            <p className="text-[11px] text-slate-400">
              {isTe 
                ? "ఈ నోట్‌ను మీ సోదరుడు వారి స్క్రీన్‌లో నేరుగా చూడగలరు."
                : "Both brothers can read and update this shared live memo from their respective devices."}
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed min-h-[48px] flex items-center">
            {memoText ? (
              <p className="whitespace-pre-line">{memoText}</p>
            ) : (
              <span className="text-slate-500 italic">
                {isTe ? "ఇంకా నోట్స్ రాయలేదు. ఇక్కడ క్లిక్ చేసి రాయండి." : "No handover notes yet. Click 'Edit Memo' to leave a reminder for your brother."}
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
