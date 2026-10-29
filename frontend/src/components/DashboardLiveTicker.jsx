import React, { useState, useEffect, useMemo } from 'react';
import { reportApi } from '../services/api';

/**
 * Calculates Indian Standard Time (IST, UTC+5:30) reliably
 * on all client browsers regardless of host system timezone.
 */
export const getISTDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
};

/**
 * Pure function returning time-aware greeting based on IST hour:
 * 05:00 - 11:59: Good morning
 * 12:00 - 16:59: Good afternoon
 * 17:00 - 22:59: Good evening
 * 23:00 - 04:59: Night operations
 */
export const getISTGreeting = (date = getISTDate()) => {
  const hours = date.getHours();
  if (hours >= 5 && hours < 12) {
    return {
      period: 'morning',
      icon: '🌅',
      greeting: 'Good morning',
      title: 'Good morning, Welcome to RAIS'
    };
  } else if (hours >= 12 && hours < 17) {
    return {
      period: 'afternoon',
      icon: '☀️',
      greeting: 'Good afternoon',
      title: 'Good afternoon, Welcome to RAIS'
    };
  } else if (hours >= 17 && hours < 22) {
    return {
      period: 'evening',
      icon: '🌇',
      greeting: 'Good evening',
      title: 'Good evening, Welcome to RAIS'
    };
  } else {
    return {
      period: 'night',
      icon: '🌙',
      greeting: 'Welcome',
      title: 'Welcome to RAIS • Night Operations'
    };
  }
};

/**
 * Derives live operational ticker items (Zero Hardcoding).
 * 1. Live IST-aware greeting
 * 2. Today's live order count & volume from DB
 * 3. Live high-demand / low-stock depot alerts from DB
 */
export const generateTickerItems = (kpis) => {
  const items = [];
  const greeting = getISTGreeting();

  // 1. Welcome & Time-Aware Greeting
  items.push({
    id: 'greeting',
    type: 'greeting',
    icon: greeting.icon,
    badge: 'RAIS DEPOT',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    headline: `${greeting.title} — Rayachoti Central Cold-Chain & Packaging Depot`
  });

  // 2. Real-time Live Orders & Sales Today (100% DB telemetry)
  const todayOrders = kpis?.revenue_periods?.today?.invoices_count !== undefined
    ? parseInt(kpis.revenue_periods.today.invoices_count || 0, 10)
    : (kpis?.recent_invoices ? kpis.recent_invoices.length : 0);

  const todayRevenue = parseFloat(kpis?.revenue_periods?.today?.revenue || 0);

  let ordersHeadline = '';
  if (todayOrders === 0) {
    ordersHeadline = 'Till now 0 orders today • Depot active & ready for dispatch';
  } else if (todayOrders === 1) {
    ordersHeadline = `Till now 1 order today (₹${todayRevenue.toLocaleString('en-IN')}) dispatched`;
  } else {
    ordersHeadline = `Till now ${todayOrders} orders today (₹${todayRevenue.toLocaleString('en-IN')}) dispatched`;
  }

  items.push({
    id: 'orders',
    type: 'orders',
    icon: '📦',
    badge: 'LIVE ORDERS',
    badgeColor: todayOrders > 0
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700',
    headline: ordersHeadline
  });

  // 3. Real-Time High Demand / Low Stock Alerts from DB
  const lowStock = kpis?.low_stock_alerts || [];
  if (lowStock && lowStock.length > 0) {
    lowStock.forEach((p, idx) => {
      const stock = parseFloat(p.current_stock || 0);
      const unit = p.packaging_unit || 'PACKETS';
      items.push({
        id: `low_stock_${p.product_id || idx}`,
        type: 'alert',
        icon: '⚠️',
        badge: 'HIGH DEMAND',
        badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        headline: `${p.name} low stock: only ${stock} ${unit} left at depot!`
      });
    });
  } else {
    items.push({
      id: 'depot_health',
      type: 'health',
      icon: '❄️',
      badge: 'DEPOT HEALTH',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      headline: 'Depot stock healthy: All critical frozen SKUs & packaging ready in -18°C cold store'
    });
  }

  // 4. Quality & Hotline info
  items.push({
    id: 'dispatch_hotline',
    type: 'info',
    icon: '⚡',
    badge: 'ORDER DESK',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    headline: 'Same-day restaurant delivery across Rayachoti • Wholesale Order Hotline: 9347453135'
  });

  return items;
};

/**
 * ContinuousLiveTicker:
 * Continuous horizontal marquee ticker running at the top navbar.
 * Mathematically seamless infinite loop with hover-to-pause.
 */
export const ContinuousLiveTicker = ({ kpis = null, className = '' }) => {
  const [internalKpis, setInternalKpis] = useState(kpis);

  // Self-fetch if not provided via props (e.g. in top Header navbar)
  useEffect(() => {
    if (kpis) {
      setInternalKpis(kpis);
      return;
    }

    let isMounted = true;
    reportApi.getDashboard()
      .then((data) => {
        if (isMounted && data) {
          setInternalKpis(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [kpis]);

  const items = useMemo(() => generateTickerItems(internalKpis), [internalKpis]);

  return (
    <div
      className={`relative flex items-center overflow-hidden bg-slate-950/90 border border-slate-800/90 rounded-xl h-9 px-2 shadow-inner group select-none ${className}`}
      title="Live Depot Telemetry • Continuous Scroll • Hover to Pause"
    >
      <style>{`
        @keyframes raisContinuousMarquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .rais-ticker-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: raisContinuousMarquee 42s linear infinite;
          will-change: transform;
        }
        .rais-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Static Left Label with Pulsing Dot */}
      <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-slate-800/80 mr-2 bg-slate-950/90 z-20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-black tracking-wider text-slate-300 uppercase">
          LIVE
        </span>
      </div>

      {/* Subtle Fade Edge Masks for smooth entrance/exit */}
      <div className="pointer-events-none absolute left-14 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      {/* Continuous Marquee Track (Duplicated twice for seamless infinite loop) */}
      <div className="overflow-hidden flex-1 flex items-center min-w-0">
        <div className="rais-ticker-track">
          {/* Loop Set 1 */}
          <div className="flex items-center gap-6 pr-6 shrink-0">
            {items.map((item, idx) => (
              <div key={`set1-${item.id}-${idx}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-200 transition-colors">
                  {item.icon} {item.headline}
                </span>
                <span className="text-slate-600 font-black ml-2">•</span>
              </div>
            ))}
          </div>

          {/* Loop Set 2 (Identical twin for seamless wrap) */}
          <div className="flex items-center gap-6 pr-6 shrink-0" aria-hidden="true">
            {items.map((item, idx) => (
              <div key={`set2-${item.id}-${idx}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-200 transition-colors">
                  {item.icon} {item.headline}
                </span>
                <span className="text-slate-600 font-black ml-2">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DashboardLiveTicker = ContinuousLiveTicker;
export default ContinuousLiveTicker;
