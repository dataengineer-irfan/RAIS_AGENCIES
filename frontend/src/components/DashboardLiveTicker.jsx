import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
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
 * Formats time in Indian Standard Time (e.g., "08:05 PM IST")
 */
export const formatISTTime = (date = new Date()) => {
  try {
    const istStr = date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${istStr} IST`;
  } catch {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const mStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${h12}:${mStr} ${ampm} IST`;
  }
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
 * Derives enterprise-grade live operational ticker items (Zero Hardcoding).
 * 1. Live IST-aware greeting
 * 2. Today's live invoice count & billed volume (strictly separated from dispatches)
 * 3. Physical order fulfillment (dispatched/delivered) if order records exist
 * 4. Prioritized inventory: zero-stock first, then critical low stock
 * 5. Rotating popular products from actual sales data
 * 6. Cold-chain certified operating standards
 * 7. Actionable order desk (tap-to-call & prefilled WhatsApp)
 */
export const generateTickerItems = (kpis) => {
  const items = [];
  const greeting = getISTGreeting();

  // 1. Time-Aware Salutation & Welcome
  items.push({
    id: 'greeting',
    type: 'greeting',
    icon: greeting.icon,
    badge: 'RAIS DEPOT',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    headline: `${greeting.title} — Rayachoti Central Cold-Chain & Packaging Depot`
  });

  // 2. Verified Billed Invoices Today (Strictly separated from dispatches)
  const todayInvoices = kpis?.revenue_periods?.today?.invoices_count !== undefined
    ? parseInt(kpis.revenue_periods.today.invoices_count || 0, 10)
    : (kpis?.recent_invoices ? kpis.recent_invoices.length : 0);

  const todayRevenue = parseFloat(kpis?.revenue_periods?.today?.revenue || 0);

  let invoiceHeadline = '';
  if (todayInvoices === 0) {
    invoiceHeadline = 'Invoices Today: 0 bills recorded';
  } else if (todayInvoices === 1) {
    invoiceHeadline = `Invoices Today: 1 bill (₹${todayRevenue.toLocaleString('en-IN')}) billed`;
  } else {
    invoiceHeadline = `Invoices Today: ${todayInvoices} bills (₹${todayRevenue.toLocaleString('en-IN')}) billed`;
  }

  items.push({
    id: 'invoices',
    type: 'invoices',
    icon: '🧾',
    badge: 'INVOICES TODAY',
    badgeColor: todayInvoices > 0
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700',
    headline: invoiceHeadline
  });

  // 3. Physical Order Fulfillment (Only when verified order records exist today)
  const orderFulfillment = kpis?.today_order_fulfillment;
  if (orderFulfillment && orderFulfillment.total_orders > 0) {
    const { total_orders, dispatched_count, delivered_count } = orderFulfillment;
    items.push({
      id: 'order_fulfillment',
      type: 'orders',
      icon: '🚚',
      badge: 'FULFILLMENT',
      badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      headline: `Today's Deliveries: ${dispatched_count} dispatched • ${delivered_count} delivered (of ${total_orders} orders)`
    });
  }

  // 4. Real-Time High-Demand & Low-Stock Alerts (Zero-stock first, deduplicated)
  const lowStock = kpis?.low_stock_alerts || [];
  const seenProductIds = new Set();
  const prioritizedStock = [...lowStock].sort((a, b) => {
    const aStock = parseFloat(a.current_stock || 0);
    const bStock = parseFloat(b.current_stock || 0);
    if (aStock <= 0 && bStock > 0) return -1;
    if (bStock <= 0 && aStock > 0) return 1;
    return aStock - bStock;
  });

  let addedStockAlerts = 0;
  prioritizedStock.forEach((p, idx) => {
    const pId = p.product_id || p.sku || `item_${idx}`;
    if (seenProductIds.has(pId)) return;
    seenProductIds.add(pId);

    const stock = parseFloat(p.current_stock || 0);
    const unit = p.packaging_unit || 'PACKETS';
    const sku = p.sku ? `(${p.sku})` : '';

    if (stock <= 0) {
      items.push({
        id: `oos_${pId}`,
        type: 'critical',
        icon: '🚨',
        badge: 'OUT OF STOCK',
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        headline: `${p.name} ${sku} — 0 ${unit} available • Immediate reorder required`
      });
      addedStockAlerts++;
    } else {
      items.push({
        id: `low_stock_${pId}`,
        type: 'warning',
        icon: '⚠️',
        badge: 'LOW STOCK',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        headline: `${p.name} ${sku} — only ${stock} ${unit} left (Alert: ${p.min_stock_alert || 5})`
      });
      addedStockAlerts++;
    }
  });

  if (addedStockAlerts === 0) {
    items.push({
      id: 'depot_health',
      type: 'health',
      icon: '❄️',
      badge: 'DEPOT HEALTH',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      headline: 'Depot stock healthy: All critical frozen SKUs & packaging ready in -18°C storage'
    });
  }

  // 5. Rotating Section: Fast-Moving / Popular Products from actual sales
  const topProducts = kpis?.top_selling_products || [];
  if (topProducts.length > 0) {
    const topItem = topProducts[0];
    const topName = topItem.name || topItem.product_name || 'Top Volume SKU';
    const topQty = topItem.quantity_sold || topItem.total_quantity || topItem.quantity || topItem.units_sold;
    const topQtyStr = topQty ? ` (${topQty} units moved)` : '';
    items.push({
      id: 'top_seller',
      type: 'popular',
      icon: '🔥',
      badge: 'TOP MOVER',
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      headline: `Fast Moving: ${topName}${topQtyStr} — High Restaurant Demand`
    });
  }

  // 6. Cold-Chain Facility Standard (Honesty Rule: No fake sensor temperatures)
  items.push({
    id: 'cold_chain_standard',
    type: 'facility',
    icon: '❄️',
    badge: 'COLD-CHAIN',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    headline: 'Certified -18°C Deep-Freeze Storage Depot • Verified Dispatch Standards'
  });

  // 7. Actionable Order Desk (Tap-to-Call & Prefilled WhatsApp)
  items.push({
    id: 'order_desk_actions',
    type: 'action',
    icon: '⚡',
    badge: 'ORDER DESK',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    headline: 'Wholesale Order Desk:',
    isOrderDesk: true
  });

  return items;
};

/**
 * ContinuousLiveTicker:
 * Enterprise-grade cold-chain and packaging operations ribbon.
 * Features:
 * - Data freshness tracking with IST timestamp (LIVE / DATA DELAYED / CONNECTION ERROR).
 * - Never clears previous data on fetch error.
 * - 72-second continuous infinite marquee animation.
 * - 1-Click user pause/play toggle, hover pause, keyboard focus pause.
 * - Pauses when tab is hidden and respects prefers-reduced-motion.
 */
export const ContinuousLiveTicker = ({ kpis = null, className = '' }) => {
  const [internalKpis, setInternalKpis] = useState(kpis);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date());
  const [connectionStatus, setConnectionStatus] = useState('live'); // 'live' | 'delayed' | 'error'
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);

  const isMountedRef = useRef(true);

  // Sync prop changes
  useEffect(() => {
    if (kpis) {
      setInternalKpis(kpis);
      setLastSyncTime(new Date());
      setConnectionStatus('live');
    }
  }, [kpis]);

  // Tab visibility listener: Pause marquee when backgrounded
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      setIsTabHidden(hidden);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  // Background Data Fetcher with Sensible Interval (90 seconds)
  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Skip poll if tab is in background
      }
      try {
        const data = await reportApi.getDashboard();
        if (isMountedRef.current && data) {
          setInternalKpis(data);
          setLastSyncTime(new Date());
          setConnectionStatus('live');
        }
      } catch (err) {
        if (isMountedRef.current) {
          // Rule 1: Never replace a failed query with zero values; retain existing data!
          setConnectionStatus('error');
        }
      }
    };

    // Initial fetch if not provided via props
    if (!kpis) {
      fetchData();
    }

    // 90-second refresh interval
    const intervalId = setInterval(fetchData, 90000);

    // Stale data watchdog (if no fresh sync for > 150 seconds, mark as delayed)
    const watchdogId = setInterval(() => {
      if (!isMountedRef.current) return;
      const ageSeconds = (Date.now() - lastSyncTime.getTime()) / 1000;
      if (ageSeconds > 150 && connectionStatus === 'live') {
        setConnectionStatus('delayed');
      }
    }, 15000);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      clearInterval(watchdogId);
    };
  }, [kpis, lastSyncTime, connectionStatus]);

  const items = useMemo(() => generateTickerItems(internalKpis), [internalKpis]);
  const formattedSyncTime = useMemo(() => formatISTTime(lastSyncTime), [lastSyncTime]);

  const isPaused = isUserPaused || isHovered || isFocused || isTabHidden;

  return (
    <div
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center overflow-hidden bg-slate-950/90 border border-slate-800/90 rounded-xl h-9 px-2 shadow-inner group select-none outline-none focus:border-amber-500/50 transition-colors ${className}`}
      title={
        isUserPaused
          ? "Live ticker paused • Click PLAY to resume"
          : `Live Depot Telemetry • Synced ${formattedSyncTime} • Hover or click ⏸ to pause`
      }
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
          animation: raisContinuousMarquee 72s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .rais-ticker-track {
            animation: none !important;
          }
        }
      `}</style>

      {/* Static Left Control Badge with Freshness Dot, Status & 1-Click Pause/Play */}
      <div className="flex items-center gap-1.5 shrink-0 pr-2.5 border-r border-slate-800/80 mr-2 bg-slate-950/90 z-20">
        {/* Connection Freshness Indicator */}
        <span className="relative flex h-2 w-2">
          {connectionStatus === 'live' && (
            <>
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isUserPaused ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isUserPaused ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </>
          )}
          {connectionStatus === 'delayed' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          )}
          {connectionStatus === 'error' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          )}
        </span>

        {/* Status Label with Tooltip */}
        <span
          className={`text-[9.5px] font-black tracking-wider uppercase ${
            connectionStatus === 'live'
              ? (isUserPaused ? 'text-amber-400' : 'text-emerald-400')
              : (connectionStatus === 'delayed' ? 'text-amber-400' : 'text-rose-400')
          }`}
          title={`Data Freshness: ${connectionStatus.toUpperCase()} (Synced ${formattedSyncTime})`}
        >
          {connectionStatus === 'live'
            ? 'LIVE'
            : (connectionStatus === 'delayed' ? 'DATA DELAYED' : 'CONN ERROR')}
        </span>

        {/* 1-Click Pause / Play Toggle Button (Manual toggle is latching and sticky) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsUserPaused((prev) => !prev);
          }}
          title={isUserPaused ? "Click to resume scrolling" : "Click to freeze/pause scrolling"}
          className="ml-1 p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-amber-500/50 text-slate-300 hover:text-white transition-all flex items-center justify-center active:scale-95"
          aria-label={isUserPaused ? "Resume live scrolling" : "Pause live scrolling"}
        >
          {isUserPaused ? (
            <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
          ) : (
            <Pause className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          )}
        </button>
      </div>

      {/* Subtle Fade Edge Masks for smooth entrance/exit */}
      <div className="pointer-events-none absolute left-24 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent z-10" />

      {/* Continuous Marquee Track (Duplicated twice for seamless infinite loop) */}
      <div className="overflow-hidden flex-1 flex items-center min-w-0">
        <div
          className="rais-ticker-track"
          style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
        >
          {/* Loop Set 1 */}
          <div className="flex items-center gap-6 pr-6 shrink-0">
            {items.map((item, idx) => (
              <div key={`set1-${item.id}-${idx}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${item.badgeColor}`}>
                  {item.badge}
                </span>

                {item.isOrderDesk ? (
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>{item.icon} {item.headline}</span>
                    <a
                      href="tel:+919347453135"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline underline-offset-2 font-bold px-1 py-0.5 rounded hover:bg-slate-800 transition"
                      title="Tap to call RAIS Order Desk"
                    >
                      📞 9347453135
                    </a>
                    <span className="text-slate-500">•</span>
                    <a
                      href="https://wa.me/919347453135?text=Hello%20RAIS%20Agencies%2C%20I%20would%20like%20to%20place%20a%20wholesale%20order."
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-bold px-1 py-0.5 rounded hover:bg-slate-800 transition"
                      title="Open WhatsApp to place wholesale order"
                    >
                      📲 WhatsApp Order
                    </a>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-200 transition-colors">
                    {item.icon} {item.headline}
                  </span>
                )}

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

                {item.isOrderDesk ? (
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span>{item.icon} {item.headline}</span>
                    <a
                      href="tel:+919347453135"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 underline underline-offset-2 font-bold px-1 py-0.5 rounded hover:bg-slate-800 transition"
                      title="Tap to call RAIS Order Desk"
                    >
                      📞 9347453135
                    </a>
                    <span className="text-slate-500">•</span>
                    <a
                      href="https://wa.me/919347453135?text=Hello%20RAIS%20Agencies%2C%20I%20would%20like%20to%20place%20a%20wholesale%20order."
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-bold px-1 py-0.5 rounded hover:bg-slate-800 transition"
                      title="Open WhatsApp to place wholesale order"
                    >
                      📲 WhatsApp Order
                    </a>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-200 transition-colors">
                    {item.icon} {item.headline}
                  </span>
                )}

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
