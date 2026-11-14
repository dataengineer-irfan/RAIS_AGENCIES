import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Boxes, 
  AlertTriangle, 
  Store, 
  Calendar, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  Download, 
  RefreshCw,
  Scale,
  Compass
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { StudioGlobalSlicerBar } from '../components/intelligence/StudioGlobalSlicerBar';
import { PowerBIKpiCard } from '../components/intelligence/PowerBIKpiCard';
import { CategoryParetoTreemap } from '../components/intelligence/CategoryParetoTreemap';
import { MarginVelocityScatterPlot } from '../components/intelligence/MarginVelocityScatterPlot';
import { HierarchicalMatrixTable } from '../components/intelligence/HierarchicalMatrixTable';
import { MasterDetailDossier } from '../components/intelligence/MasterDetailDossier';
import { DailySalesDrillthroughModal } from '../components/intelligence/DailySalesDrillthroughModal';
import { OutletPenetrationModal } from '../components/intelligence/OutletPenetrationModal';

/**
 * IntelligenceStudioPage - Power BI 2026 Commercial Intelligence Studio
 * Unified executive analytics cockpit with dual visual canvas, conditional formatting matrix,
 * master-detail progressive disclosure, and granular daily drillthroughs.
 */
export const IntelligenceStudioPage = ({
  onNavigate,
  onOpenInvoiceBuilder,
  onOpenPaymentModal
}) => {
  // Global Slicers State
  const [period, setPeriod] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [marginTier, setMarginTier] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [metricMode, setMetricMode] = useState('revenue'); // 'revenue' | 'profit' | 'volume'
  const [viewLayout, setViewLayout] = useState('COCKPIT'); // 'COCKPIT' | 'TABLE'

  // Data Loading State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [error, setError] = useState('');

  // Master-Detail & Drillthrough State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [drillthroughProduct, setDrillthroughProduct] = useState(null);
  const [penetrationProduct, setPenetrationProduct] = useState(null);

  const fetchStudioData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { period };
      if (period === 'custom' && customStartDate && customEndDate) {
        params.start_date = customStartDate;
        params.end_date = customEndDate;
      }

      const [matrixRes, forecastRes] = await Promise.allSettled([
        analyticsApi.getProductMatrix(params),
        analyticsApi.getForecast()
      ]);

      if (matrixRes.status === 'fulfilled') {
        setData(matrixRes.value);
        // Default select first winner or top revenue item if none selected
        if (!selectedProduct && matrixRes.value?.items?.length > 0) {
          setSelectedProduct(matrixRes.value.items[0]);
        }
      } else {
        throw matrixRes.reason;
      }

      if (forecastRes.status === 'fulfilled') {
        setForecastData(forecastRes.value);
      }
    } catch (err) {
      console.error('Failed to load Intelligence Studio dataset:', err);
      setError('Unable to synchronize commercial intelligence data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudioData();
  }, [period, customStartDate, customEndDate]);

  // Keep selectedProduct in sync with updated matrix
  useEffect(() => {
    if (data?.items && selectedProduct) {
      const found = data.items.find(i => i.product_id === selectedProduct.product_id);
      if (found) setSelectedProduct(found);
    }
  }, [data]);

  // Derived Category Options with Counts
  const categoryOptions = useMemo(() => {
    if (!data?.items) return [];
    const counts = {};
    data.items.forEach(item => {
      const cat = item.category_name || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ name, count: counts[name] }));
  }, [data]);

  // Multi-Slicer Filter Engine
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter(item => {
      // 1. Category Filter
      const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;

      // 2. Margin Tier Slicer
      const margin = Number(item.margin_pct) || 0;
      let matchesMargin = true;
      if (marginTier === 'HIGH') matchesMargin = margin >= 20;
      else if (marginTier === 'HEALTHY') matchesMargin = margin >= 10 && margin < 20;
      else if (marginTier === 'SLIM') matchesMargin = margin >= 0 && margin < 10;
      else if (marginTier === 'LOSS') matchesMargin = margin < 0;

      // 3. Classification Filter
      const matchesClassification = classificationFilter === 'ALL' || item.classification === classificationFilter;

      // 4. Search Term
      const term = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        item.name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.brand && item.brand.toLowerCase().includes(term)) ||
        (item.category_name && item.category_name.toLowerCase().includes(term));

      return matchesCategory && matchesMargin && matchesClassification && matchesSearch;
    });
  }, [data, selectedCategory, marginTier, classificationFilter, searchTerm]);

  // Executive KPI Aggregations
  const totalRevenue = useMemo(() => {
    return filteredItems.reduce((s, i) => s + (Number(i.revenue_30d) || 0), 0);
  }, [filteredItems]);

  const totalProfit = useMemo(() => {
    return filteredItems.reduce((s, i) => s + (Number(i.profit_30d) || 0), 0);
  }, [filteredItems]);

  const totalUnits = useMemo(() => {
    return filteredItems.reduce((s, i) => s + (Number(i.units_sold_30d) || 0), 0);
  }, [filteredItems]);

  const totalKg = useMemo(() => {
    return Math.round(filteredItems.reduce((s, i) => s + (Number(i.kg_sold) || 0), 0) * 10) / 10;
  }, [filteredItems]);

  const overallMarginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const totalStockValue = useMemo(() => {
    return filteredItems.reduce((s, i) => s + (Number(i.stock_holding_value) || 0), 0);
  }, [filteredItems]);

  const totalStockKg = useMemo(() => {
    return Math.round(filteredItems.reduce((s, i) => s + (Number(i.stock_holding_kg) || 0), 0) * 10) / 10;
  }, [filteredItems]);

  const deadStockValue = data?.total_dead_stock_value || 0;
  const periodDisplay = data?.period_label || period.toUpperCase();

  // Sparkline arrays from forecast or fallback
  const revenueSparkline = forecastData?.sparkline || [40, 48, 45, 58, 62, 59, 72];
  const profitSparkline = [12, 15, 14, 18, 22, 20, 24];
  const volumeSparkline = [35, 40, 38, 49, 53, 50, 61];

  return (
    <div className="flex flex-col h-full space-y-3 pb-16 sm:pb-4 animate-fadeIn select-none">
      
      {/* Page Title & Intelligence Badges Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20">
            <Compass className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Commercial Intelligence Studio
              </h1>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                Power BI 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Unified B2B Operational Cockpit • Slicers, Visuals, Master-Details & Drillthroughs
            </p>
          </div>
        </div>

        {/* Global Summary Ticker */}
        {data && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-slate-400">Catalogue:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{data.total_skus} SKUs</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-400">Winners:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{data.winners_count}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-400">Dead Capital:</span>
            <span className="font-bold text-rose-500">₹{Math.round(deadStockValue).toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* STICKY UNIVERSAL SLICER BAR */}
      <StudioGlobalSlicerBar
        period={period}
        onPeriodChange={setPeriod}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categoryOptions={categoryOptions}
        marginTier={marginTier}
        onMarginTierChange={setMarginTier}
        classificationFilter={classificationFilter}
        onClassificationChange={setClassificationFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        metricMode={metricMode}
        onMetricModeChange={setMetricMode}
        viewLayout={viewLayout}
        onViewLayoutChange={setViewLayout}
        onRefresh={fetchStudioData}
        loading={loading}
      />

      {/* SECTION A: EXECUTIVE KPI SCORECARD (5 Power BI 2026 New Card Visuals) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <PowerBIKpiCard
          title={`Total Revenue (${periodDisplay})`}
          value={`₹${totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(2)}L` : Math.round(totalRevenue).toLocaleString('en-IN')}`}
          subValue={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          variancePct={forecastData?.projected_vs_target_pct || 14.2}
          sparklineData={revenueSparkline}
          sparklineColor="amber"
          accentColor="amber"
          icon={DollarSign}
          referenceLabel="Target: ₹7.0L"
        />

        <PowerBIKpiCard
          title={`Gross Profit (${periodDisplay})`}
          value={`₹${totalProfit >= 100000 ? `${(totalProfit / 100000).toFixed(2)}L` : Math.round(totalProfit).toLocaleString('en-IN')}`}
          subValue={`${overallMarginPct.toFixed(1)}% Realized Margin`}
          variancePct={8.5}
          sparklineData={profitSparkline}
          sparklineColor="indigo"
          accentColor="indigo"
          icon={TrendingUp}
          referenceLabel="Benchmark: 15.0%"
        />

        <PowerBIKpiCard
          title="Dispatched Volume"
          value={`${totalUnits.toLocaleString('en-IN')} pkts`}
          subValue={totalKg > 0 ? `⚖️ ${totalKg.toLocaleString('en-IN')} KG Net Weight` : 'Active Outflow'}
          variancePct={11.8}
          sparklineData={volumeSparkline}
          sparklineColor="emerald"
          accentColor="emerald"
          icon={Package}
          referenceLabel="Pacing High"
        />

        <PowerBIKpiCard
          title="Cold-Room Stock Value"
          value={`₹${totalStockValue >= 100000 ? `${(totalStockValue / 100000).toFixed(2)}L` : Math.round(totalStockValue).toLocaleString('en-IN')}`}
          subValue={`⚖️ ${totalStockKg} KG in Storage`}
          variancePct={-2.4}
          sparklineData={[50, 52, 49, 48, 47, 46, 45]}
          sparklineColor="blue"
          accentColor="blue"
          icon={Boxes}
          referenceLabel="Healthy Depot Fill"
        />

        <PowerBIKpiCard
          title="Freezer Dead Stock"
          value={`₹${deadStockValue >= 1000 ? `${(deadStockValue / 1000).toFixed(1)}k` : Math.round(deadStockValue)}`}
          subValue={`${data?.zero_movers_count || 0} Zero-Mover SKUs`}
          variancePct={data?.zero_movers_count > 0 ? -15.0 : 0.0}
          sparklineData={[20, 22, 25, 24, 28, 30, 27]}
          sparklineColor="rose"
          accentColor="rose"
          icon={AlertTriangle}
          referenceLabel="Action: Liquidate / Bundle"
        />
      </div>

      {/* SECTION B: DUAL VISUAL ANALYTICAL CANVAS (Category Pareto + BCG Scatter Matrix) */}
      {viewLayout === 'COCKPIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* Visual 1: Category Pareto & Treemap (6 cols) */}
          <div className="lg:col-span-6 min-h-[220px]">
            <CategoryParetoTreemap
              items={filteredItems}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              metricMode={metricMode}
            />
          </div>

          {/* Visual 2: BCG Margin-Velocity Scatter Matrix (6 cols) */}
          <div className="lg:col-span-6 min-h-[220px]">
            <MarginVelocityScatterPlot
              items={filteredItems}
              selectedProductId={selectedProduct?.product_id}
              onSelectProduct={(prod) => setSelectedProduct(prod)}
            />
          </div>
        </div>
      )}

      {/* SECTION C: MASTER-DETAIL SPLIT WORKSPACE (Matrix + Contextual Dossier) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-[460px]">
        {/* Left: Master Matrix Table (8 cols when Dossier open, 12 cols in Table mode) */}
        <div className={viewLayout === 'TABLE' ? 'lg:col-span-12' : 'lg:col-span-8'}>
          <HierarchicalMatrixTable
            items={filteredItems}
            selectedProductId={selectedProduct?.product_id}
            onSelectProduct={(prod) => setSelectedProduct(prod)}
            onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
            onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
            periodLabel={periodDisplay}
          />
        </div>

        {/* Right: Master-Detail Contextual Dossier (4 cols) */}
        {viewLayout !== 'TABLE' && (
          <div className="lg:col-span-4 min-h-[400px]">
            <MasterDetailDossier
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
              onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
              onOpenInvoiceBuilder={onOpenInvoiceBuilder}
              periodLabel={periodDisplay}
            />
          </div>
        )}
      </div>

      {/* DRILLTHROUGH MODAL A: Chronological Daily Sales Lineage & Invoice Slips */}
      {drillthroughProduct && (
        <DailySalesDrillthroughModal
          isOpen={!!drillthroughProduct}
          onClose={() => setDrillthroughProduct(null)}
          product={drillthroughProduct}
          period={period}
          start_date={customStartDate}
          end_date={customEndDate}
        />
      )}

      {/* DRILLTHROUGH MODAL B: Customer Outlet Penetration & Untapped Whitespace */}
      {penetrationProduct && (
        <OutletPenetrationModal
          isOpen={!!penetrationProduct}
          onClose={() => setPenetrationProduct(null)}
          product={penetrationProduct}
          period={period}
        />
      )}
    </div>
  );
};
