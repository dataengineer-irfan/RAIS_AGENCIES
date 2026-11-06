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
  ChevronLeft,
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
  onNavigate,
  dataRefreshKey
}) => {
  const { user } = useAuth();
  const [lang, setLang] = useState('en'); // 'en' | 'te'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [error, setError] = useState(null);

  // Rotation indices for multi-item intelligence cards (Minimum 3 items each)
  const [basketGapIdx, setBasketGapIdx] = useState(0);
  const [trendIdx, setTrendIdx] = useState(0);
  const [routeIdx, setRouteIdx] = useState(0);

  // Hover states to pause auto-scrolling
  const [isHoveredBasket, setIsHoveredBasket] = useState(false);
  const [isHoveredTrend, setIsHoveredTrend] = useState(false);
  const [isHoveredRoute, setIsHoveredRoute] = useState(false);

  // Memo state
  const [memoText, setMemoText] = useState('');
  const [memoAuthor, setMemoAuthor] = useState('');
  const [memoTime, setMemoTime] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [savingMemo, setSavingMemo] = useState(false);
  const [memoSaveSuccess, setMemoSaveSuccess] = useState(false);

  const fetchBriefingData = async (isManual = false, isBackground = false) => {
    try {
      if (isManual || isBackground) {
        setRefreshing(true);
      }
      if (!briefing && !isBackground) {
        setLoading(true);
      }

      const res = await executiveApi.getBriefing(isManual);
      setBriefing(res);
      setLastSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      if (res?.handover_memo) {
        setMemoText(res.handover_memo.memo || '');
        setMemoAuthor(res.handover_memo.updated_by || 'Operator');
        setMemoTime(res.handover_memo.updated_at || '');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching executive briefing:', err);
      if (!briefing) {
        setError('Unable to fetch live briefing. Retrying...');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial mount + real-time 12s polling + tab visibility / focus sync + event bus
  useEffect(() => {
    fetchBriefingData();

    // 12-second live telemetry polling heartbeat for real-time operations
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchBriefingData(false, true);
      }
    }, 12000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBriefingData(true, true);
      }
    };

    const handleWindowFocus = () => {
      fetchBriefingData(true, true);
    };

    const handleDataUpdated = () => {
      fetchBriefingData(true, true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('rais:data-updated', handleDataUpdated);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('rais:data-updated', handleDataUpdated);
    };
  }, []);

  // React immediately to global invoices/payments/orders events
  useEffect(() => {
    if (dataRefreshKey && dataRefreshKey > 0) {
      fetchBriefingData(true, true);
    }
  }, [dataRefreshKey]);

  const handleSaveMemo = async () => {
    try {
      setSavingMemo(true);
      const author = user?.full_name || 'Operator';
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

  // Counts for auto-scrolling intervals
  const basketGapsCount = briefing?.basket_gaps?.length || (briefing?.market_intelligence?.filter(m => m.type === 'BASKET_OPPORTUNITY').length || 1);
  const demandTrendsCount = briefing?.demand_trends?.length || (briefing?.market_intelligence?.filter(m => m.type === 'DEMAND_SURGE').length || 1);
  const routeStrategiesCount = briefing?.route_strategies?.length || (briefing?.market_intelligence?.filter(m => m.type === 'LOGISTICS_OPTIMIZATION').length || 1);

  // Continuous Auto-Scrolling Carousels with Hover-to-Pause
  // Card 1: Basket Gaps rotation (every 5.5s)
  useEffect(() => {
    if (isHoveredBasket || basketGapsCount <= 1) return;
    const timer = setInterval(() => {
      setBasketGapIdx(prev => (prev + 1) % basketGapsCount);
    }, 5500);
    return () => clearInterval(timer);
  }, [isHoveredBasket, basketGapsCount]);

  // Card 2: Dynamic Demand Trends rotation (every 6.0s)
  useEffect(() => {
    if (isHoveredTrend || demandTrendsCount <= 1) return;
    const timer = setInterval(() => {
      setTrendIdx(prev => (prev + 1) % demandTrendsCount);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHoveredTrend, demandTrendsCount]);

  // Card 3: Route Strategies rotation (every 6.5s)
  useEffect(() => {
    if (isHoveredRoute || routeStrategiesCount <= 1) return;
    const timer = setInterval(() => {
      setRouteIdx(prev => (prev + 1) % routeStrategiesCount);
    }, 6500);
    return () => clearInterval(timer);
  }, [isHoveredRoute, routeStrategiesCount]);

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
  const priorities = briefing?.priorities || [];
  const marketIntel = briefing?.market_intelligence || [];
  const execStory = briefing?.executive_story || {};

  // Extract Minimum 3 Basket Gaps, Demand Trends, and Route Rotation Strategies
  const basketGaps = (briefing?.basket_gaps && briefing.basket_gaps.length > 0)
    ? briefing.basket_gaps
    : (marketIntel.filter(m => m.type === 'BASKET_OPPORTUNITY').length > 0
        ? marketIntel.filter(m => m.type === 'BASKET_OPPORTUNITY')
        : [marketIntel[0] || {}]);

  const demandTrends = (briefing?.demand_trends && briefing.demand_trends.length > 0)
    ? briefing.demand_trends
    : (marketIntel.filter(m => m.type === 'DEMAND_SURGE').length > 0
        ? marketIntel.filter(m => m.type === 'DEMAND_SURGE')
        : [marketIntel[1] || {}]);

  const routeStrategies = (briefing?.route_strategies && briefing.route_strategies.length > 0)
    ? briefing.route_strategies
    : (marketIntel.filter(m => m.type === 'LOGISTICS_OPTIMIZATION').length > 0
        ? marketIntel.filter(m => m.type === 'LOGISTICS_OPTIMIZATION')
        : [marketIntel[2] || {}]);

  const currentBasketGap = basketGaps[Math.abs(basketGapIdx) % (basketGaps.length || 1)] || basketGaps[0] || {};
  const currentTrend = demandTrends[Math.abs(trendIdx) % (demandTrends.length || 1)] || demandTrends[0] || {};
  const currentRoute = routeStrategies[Math.abs(routeIdx) % (routeStrategies.length || 1)] || routeStrategies[0] || {};

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
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isTe ? 'కార్యాచరణ ఉదయపు సమీక్ష' : 'Operations Command Cockpit'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {briefing?.today_date} • Rayachoty Depot
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${refreshing ? 'animate-ping' : 'animate-pulse'}`} />
              <span>LIVE</span>
              {lastSyncTime && (
                <span className="text-slate-400 font-mono text-[9px] hidden sm:inline">
                  • {lastSyncTime}
                </span>
              )}
            </div>
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
          2. EXECUTIVE OPERATIONAL STORY & GAME PLAN (No Bookkeeping Clutter)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-300">
              {isTe ? "నేటి వ్యాపార కార్యాచరణ ప్రణాళిక" : "Today's Operational Game Plan"}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 font-mono">
            {isTe ? "ప్రత్యక్ష డేటా ఆధారితం" : "Inferred from Live DB Telemetry"}
          </span>
        </div>

        <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed mt-1">
          {isTe 
            ? (execStory.summary_te || "ఈ రోజు రాయచోటి డిపో ప్రధాన కార్యచరణలు: పాత బకాయిలు వసూలు చేయడం, ఖాళీ అయిన ముఖ్యమైన సరుకులు రీఆర్డర్ చేయడం, మరియు ఆర్డర్లు ఆపిన రెగ్యులర్ కేఫ్‌లను తిరిగి సంప్రదించడం.")
            : (execStory.summary_en || "Today's primary operational focus for Rayachoty depot: 1) Follow up on top overdue debt to protect liquidity. 2) Replenish high-velocity stockouts before the weekend rush. 3) Re-engage regular cafe accounts past their ordering cadence.")}
        </p>

        {/* Quick Decision Status Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${p1?.amount > 0 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            <span>{isTe ? "నగదు రికవరీ: " : "Cash Recovery: "}</span>
            <span className={p1?.amount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {p1?.amount > 0 ? `${p1.customer_name} (${formatINR(p1.amount)})` : (isTe ? "సక్రమం" : "Healthy")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${p2?.stockouts_count > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span>{isTe ? "డిపో స్టాక్: " : "Depot Stock: "}</span>
            <span className={p2?.stockouts_count > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {p2?.stockouts_count > 0 ? `${p2.stockouts_count} ${isTe ? 'సరుకులు లోటు' : 'SKUs Depleted'}` : (isTe ? "సమృద్ధిగా ఉంది" : "Fully Stocked")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${p3?.inactive_count > 0 ? 'bg-blue-400' : 'bg-emerald-400'}`} />
            <span>{isTe ? "కస్టమర్ రిటెన్షన్: " : "Customer Retention: "}</span>
            <span className={p3?.inactive_count > 0 ? 'text-blue-400 font-bold' : 'text-emerald-400 font-bold'}>
              {p3?.inactive_count > 0 ? `${p3.inactive_count} ${isTe ? 'కేఫ్‌లు సంప్రదించాలి' : 'Cafes Inactive'}` : (isTe ? "అందరూ యాక్టివ్" : "All Active")}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. ACTION PRIORITIES (1, 2, 3 QUEUE)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            {isTe ? "ఉదయపు అత్యవసర ప్రాధాన్యతలు" : "Daily Operational Priorities (Action Queue)"}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-extrabold text-white">
              {isTe ? "రాయచోటి స్థానిక వ్యాపార అవకాశాలు & సూచనలు" : "Rayachoty Market & Commercial Intelligence"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-950/80 text-amber-300 border border-slate-800 shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{isTe ? "ఆటో-స్క్రోలింగ్ • ఆపడానికి మౌస్ ఉంచండి" : "Auto-Scrolling Carousel • Hover to Pause"}</span>
            </span>
            <span className="text-xs text-slate-400 hidden md:inline">
              {isTe ? "ఇన్‌వాయిస్ డేటా ఆధారిత సూచనలు" : "Inferred from live billing & order basket patterns"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ─── CARD 1: RAYACHOTY BASKET GAP (Minimum 3 Rotation) ─── */}
          <div
            onMouseEnter={() => setIsHoveredBasket(true)}
            onMouseLeave={() => setIsHoveredBasket(false)}
            onTouchStart={() => setIsHoveredBasket(true)}
            onTouchEnd={() => setIsHoveredBasket(false)}
            className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              {/* Header with Rotation Controls */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {isTe ? (currentBasketGap.tag_te || "రాయచోటి బాస్కెట్ గ్యాప్") : (currentBasketGap.tag_en || "Rayachoty Basket Gap")}
                </span>

                {basketGaps.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBasketGapIdx(prev => (prev - 1 + basketGaps.length) % basketGaps.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "మునుపటి బాస్కెట్ అవకాశం" : "Previous Basket Gap"}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-amber-400 px-1">
                      {(Math.abs(basketGapIdx) % basketGaps.length) + 1}/{basketGaps.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBasketGapIdx(prev => (prev + 1) % basketGaps.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "తదుపరి బాస్కెట్ అవకాశం" : "Next Basket Gap"}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    {isHoveredBasket ? (
                      <span className="text-[8px] font-mono font-bold text-amber-400 px-1 bg-amber-500/10 rounded">PAUSED</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mx-0.5" title="Auto-rotating" />
                    )}
                  </div>
                )}
              </div>

              {/* Progress Dots */}
              {basketGaps.length > 1 && (
                <div className="flex items-center gap-1 mt-2">
                  {basketGaps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBasketGapIdx(i)}
                      className={`h-1 rounded-full transition-all ${
                        (Math.abs(basketGapIdx) % basketGaps.length) === i
                          ? 'w-4 bg-amber-400'
                          : 'w-1 bg-slate-700 hover:bg-slate-600'
                      }`}
                      title={`Opportunity ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <h4 className="text-sm font-bold text-white mt-2.5 leading-snug">
                {isTe ? currentBasketGap.title_te : currentBasketGap.title_en}
              </h4>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                {isTe ? currentBasketGap.insight_te : currentBasketGap.insight_en}
              </p>
            </div>

            <div className="mt-3.5 space-y-2">
              {(currentBasketGap.action_recommended_en || currentBasketGap.action_recommended_te) && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-amber-300 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="leading-tight">
                    {isTe ? currentBasketGap.action_recommended_te : currentBasketGap.action_recommended_en}
                  </span>
                </div>
              )}

              {currentBasketGap.whatsapp_url && (
                <a
                  href={currentBasketGap.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isTe ? "వాట్సాప్ ఆఫర్ పంపండి" : "1-Tap WhatsApp Pitch"}</span>
                </a>
              )}
            </div>
          </div>

          {/* ─── CARD 2: WEEKEND & COMMERCIAL DEMAND SURGE (Continuous Auto-Scroll) ─── */}
          <div
            onMouseEnter={() => setIsHoveredTrend(true)}
            onMouseLeave={() => setIsHoveredTrend(false)}
            onTouchStart={() => setIsHoveredTrend(true)}
            onTouchEnd={() => setIsHoveredTrend(false)}
            className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              {/* Header with Rotation Controls */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {isTe ? (currentTrend.tag_te || "డిమాండ్ ట్రెండ్") : (currentTrend.tag_en || "Demand Trend")}
                </span>

                {demandTrends.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setTrendIdx(prev => (prev - 1 + demandTrends.length) % demandTrends.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "మునుపటి ట్రెండ్" : "Previous Demand Trend"}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-amber-400 px-1">
                      {(Math.abs(trendIdx) % demandTrends.length) + 1}/{demandTrends.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTrendIdx(prev => (prev + 1) % demandTrends.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "తదుపరి ట్రెండ్" : "Next Demand Trend"}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    {isHoveredTrend ? (
                      <span className="text-[8px] font-mono font-bold text-amber-400 px-1 bg-amber-500/10 rounded">PAUSED</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mx-0.5" title="Auto-rotating" />
                    )}
                  </div>
                )}
              </div>

              {/* Progress Dots */}
              {demandTrends.length > 1 && (
                <div className="flex items-center gap-1 mt-2">
                  {demandTrends.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTrendIdx(i)}
                      className={`h-1 rounded-full transition-all ${
                        (Math.abs(trendIdx) % demandTrends.length) === i
                          ? 'w-4 bg-amber-400'
                          : 'w-1 bg-slate-700 hover:bg-slate-600'
                      }`}
                      title={`Trend ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <h4 className="text-sm font-bold text-white mt-2.5 leading-snug">
                {isTe ? currentTrend.title_te : currentTrend.title_en}
              </h4>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                {isTe ? currentTrend.insight_te : currentTrend.insight_en}
              </p>
            </div>

            <div className="mt-3.5 space-y-2">
              {(currentTrend.action_recommended_en || currentTrend.action_recommended_te) && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-amber-300 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="leading-tight">
                    {isTe ? currentTrend.action_recommended_te : currentTrend.action_recommended_en}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('inventory')}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>{isTe ? "డిపో స్టాక్ వివరాలు చూడండి" : "Inspect Depot Stock & Inward"}</span>
              </button>
            </div>
          </div>

          {/* ─── CARD 3: DISPATCH ROUTE SYNERGY (Minimum 3 Rotation on My Data & External Factors) ─── */}
          <div
            onMouseEnter={() => setIsHoveredRoute(true)}
            onMouseLeave={() => setIsHoveredRoute(false)}
            onTouchStart={() => setIsHoveredRoute(true)}
            onTouchEnd={() => setIsHoveredRoute(false)}
            className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              {/* Header with Rotation Controls */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {isTe ? (currentRoute.tag_te || "డెలివరీ రూట్ సమన్వయం") : (currentRoute.tag_en || "Dispatch Route Synergy")}
                </span>

                {routeStrategies.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRouteIdx(prev => (prev - 1 + routeStrategies.length) % routeStrategies.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "మునుపటి డెలివరీ రూట్" : "Previous Route Strategy"}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 px-1">
                      {(Math.abs(routeIdx) % routeStrategies.length) + 1}/{routeStrategies.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRouteIdx(prev => (prev + 1) % routeStrategies.length)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors active:scale-95"
                      title={isTe ? "తదుపరి డెలివరీ రూట్" : "Next Route Strategy"}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    {isHoveredRoute ? (
                      <span className="text-[8px] font-mono font-bold text-amber-400 px-1 bg-amber-500/10 rounded">PAUSED</span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mx-0.5" title="Auto-rotating" />
                    )}
                  </div>
                )}
              </div>

              {/* Progress Dots */}
              {routeStrategies.length > 1 && (
                <div className="flex items-center gap-1 mt-2">
                  {routeStrategies.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRouteIdx(i)}
                      className={`h-1 rounded-full transition-all ${
                        (Math.abs(routeIdx) % routeStrategies.length) === i
                          ? 'w-4 bg-emerald-400'
                          : 'w-1 bg-slate-700 hover:bg-slate-600'
                      }`}
                      title={`Route ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Status Pill & Route Logistics KPI Badges */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {currentRoute.status_pill_en && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {isTe ? currentRoute.status_pill_te : currentRoute.status_pill_en}
                  </span>
                )}
                {currentRoute.total_dues !== undefined && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                    {formatINR(currentRoute.total_dues)} {isTe ? 'బకాయి' : 'Dues'}
                  </span>
                )}
                {currentRoute.fuel_savings_inr && (
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                    ~₹{currentRoute.fuel_savings_inr} {isTe ? 'ఇంధనం ఆదా' : 'Fuel Saved'}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                {isTe ? currentRoute.title_te : currentRoute.title_en}
              </h4>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                {isTe ? currentRoute.insight_te : currentRoute.insight_en}
              </p>
            </div>

            <div className="mt-3.5 space-y-2">
              {(currentRoute.action_recommended_en || currentRoute.action_recommended_te) && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-amber-300 text-[11px] font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="leading-tight">
                    {isTe ? currentRoute.action_recommended_te : currentRoute.action_recommended_en}
                  </span>
                </div>
              )}

              <a
                href={`https://wa.me/919347453135?text=Van%20Dispatch%20Route%3A%20${encodeURIComponent(currentRoute.corridor_name || 'Delivery Route')}%20-%20Total%20Dues%20to%20Collect%3A%20${encodeURIComponent(formatINR(currentRoute.total_dues || 0))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-600/90 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{isTe ? "వ్యాన్ రూట్ మేనిఫెస్ట్" : "WhatsApp Route Manifest"}</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. OPERATIONS SHIFT HANDOVER MEMO (Live Team Sync)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {isTe ? "కార్యాచరణ షిఫ్ట్ హ్యాండోవర్ మెమో" : "Operations Shift Handover Memo"}
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
                ? "ఈ నోట్‌ను మీ సహ-ఆపరేటర్ వారి స్క్రీన్‌లో నేరుగా చూడగలరు."
                : "All operations team members can view and update this live shared memo from their devices."}
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed min-h-[48px] flex items-center">
            {memoText ? (
              <p className="whitespace-pre-line">{memoText}</p>
            ) : (
              <span className="text-slate-500 italic">
                {isTe ? "ఇంకా నోట్స్ నమోదు కాలేదు. ఇక్కడ క్లిక్ చేసి రాయండి." : "No handover notes yet. Click 'Edit Memo' to leave a reminder for the operations team."}
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
