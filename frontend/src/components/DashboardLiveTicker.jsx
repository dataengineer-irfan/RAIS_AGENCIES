import React, { useState, useEffect, useMemo } from 'react';

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

  // Slide 1: Welcome & Live Greeting
  items.push({
    id: 'greeting',
    type: 'greeting',
    icon: greeting.icon,
    badge: 'RAIS DEPOT',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    headline: greeting.title,
    subtext: 'Central Cold-Chain & Packaging Depot'
  });

  // Slide 2: Real-time Live Orders & Sales Today (100% DB telemetry)
  const todayOrders = kpis?.revenue_periods?.today?.invoices_count !== undefined
    ? parseInt(kpis.revenue_periods.today.invoices_count || 0, 10)
    : (kpis?.recent_invoices ? kpis.recent_invoices.length : 0);

  const todayRevenue = parseFloat(kpis?.revenue_periods?.today?.revenue || 0);

  let ordersHeadline = '';
  if (todayOrders === 0) {
    ordersHeadline = 'Till now 0 orders today';
  } else if (todayOrders === 1) {
    ordersHeadline = `Till now 1 order today (₹${todayRevenue.toLocaleString('en-IN')})`;
  } else {
    ordersHeadline = `Till now ${todayOrders} orders today (₹${todayRevenue.toLocaleString('en-IN')})`;
  }

  items.push({
    id: 'orders',
    type: 'orders',
    icon: '📦',
    badge: 'TODAY',
    badgeColor: todayOrders > 0
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : 'bg-slate-800 text-slate-400 border-slate-700',
    headline: ordersHeadline,
    subtext: todayOrders > 0 ? 'Active dispatch from -18°C storage' : 'Depot ready for incoming orders'
  });

  // Slide 3: Real-Time High Demand / Low Stock Alerts
  const lowStock = kpis?.low_stock_alerts || [];
  if (lowStock && lowStock.length > 0) {
    lowStock.slice(0, 3).forEach((p, idx) => {
      const stock = parseFloat(p.current_stock || 0);
      const unit = p.packaging_unit || 'PACKETS';
      items.push({
        id: `low_stock_${p.product_id || idx}`,
        type: 'alert',
        icon: '⚠️',
        badge: 'LOW STOCK',
        badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        headline: `${p.name} low: only ${stock} ${unit} left`,
        subtext: `Stock (${stock}) below min safety alert (${p.min_stock_alert || 5})`
      });
    });
  } else {
    items.push({
      id: 'depot_health',
      type: 'health',
      icon: '❄️',
      badge: 'STOCK HEALTH',
      badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      headline: 'Depot Stock Healthy: All critical items available',
      subtext: 'Cold room & packaging depot fully supplied'
    });
  }

  return items;
};

export const DashboardLiveTicker = ({ kpis, className = '' }) => {
  const tickerItems = useMemo(() => generateTickerItems(kpis), [kpis]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (tickerItems.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [tickerItems.length, isPaused]);

  // Safe bounds guard
  const activeItem = tickerItems[currentIndex] || tickerItems[0];
  if (!activeItem) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={handleNext}
      title="Live Operational Ticker • Hover to pause, click to advance"
      className={`relative flex items-center overflow-hidden bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 rounded-lg px-2.5 py-1 transition-all duration-300 cursor-pointer select-none group shadow-inner ${className}`}
    >
      {/* Live Pulsing Dot */}
      <span className="relative flex h-2 w-2 mr-2 shrink-0">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            activeItem.type === 'alert' ? 'bg-rose-400' : 'bg-emerald-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            activeItem.type === 'alert' ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
        />
      </span>

      {/* Slide Content with smooth transition */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        {/* Category Pill */}
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${activeItem.badgeColor}`}
        >
          {activeItem.badge}
        </span>

        {/* Dynamic Headline */}
        <span className="text-xs font-bold text-slate-200 truncate group-hover:text-amber-300 transition-colors">
          {activeItem.icon} {activeItem.headline}
        </span>
      </div>

      {/* Cycle indicator dots */}
      <div className="flex items-center gap-1 ml-2 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
        {tickerItems.map((_, idx) => (
          <span
            key={idx}
            className={`h-1 rounded-full transition-all duration-300 ${
              idx === currentIndex ? 'w-2.5 bg-amber-400' : 'w-1 bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardLiveTicker;
