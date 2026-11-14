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
  Compass,
  PieChart
} from 'lucide-react';
import { analyticsApi } from '../services/api';
import { StudioGlobalSlicerBar } from '../components/intelligence/StudioGlobalSlicerBar';
import { PowerBIKpiCard } from '../components/intelligence/PowerBIKpiCard';
import { CategoryParetoTreemap } from '../components/intelligence/CategoryParetoTreemap';
import { MarginVelocityScatterPlot } from '../components/intelligence/MarginVelocityScatterPlot';
import { SalesVelocityTrendChart } from '../components/intelligence/SalesVelocityTrendChart';
import { HierarchicalMatrixTable } from '../components/intelligence/HierarchicalMatrixTable';
import { MasterDetailDossier } from '../components/intelligence/MasterDetailDossier';
import { DailySalesDrillthroughModal } from '../components/intelligence/DailySalesDrillthroughModal';
import { OutletPenetrationModal } from '../components/intelligence/OutletPenetrationModal';

/**
 * IntelligenceStudioPage - Power BI 2026 Commercial Intelligence Studio
 * Enterprise visual cockpit: Sticky chiclet slicers, high-density KPIs,
 * side-by-side visual charts, and independent master-detail matrix workspace.
 * Zero element collision or text overlapping.
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
  const [metricMode, setMetricMode] = useState('revenue');
  const [viewLayout, setViewLayout] = useState('MATRIX'); // 'MATRIX' | 'VISUALS' | 'COCKPIT'
  const [showInlineCharts, setShowInlineCharts] = useState(false);

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

  useEffect(() => {
    if (data?.items && selectedProduct) {
      const found = data.items.find(i => i.product_id === selectedProduct.product_id || i.sku === selectedProduct.sku);
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
      const matchesCategory = selectedCategory === 'ALL' || item.category_name === selectedCategory;

      const margin = Number(item.margin_pct) || 0;
      let matchesMargin = true;
      if (marginTier === 'HIGH') matchesMargin = margin >= 20;
      else if (marginTier === 'HEALTHY') matchesMargin = margin >= 10 && margin < 20;
      else if (marginTier === 'SLIM') matchesMargin = margin >= 0 && margin < 10;
      else if (marginTier === 'LOSS') matchesMargin = margin < 0;

      const matchesClassification = classificationFilter === 'ALL' || item.classification === classificationFilter;

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

  const revenueSparkline = forecastData?.sparkline || [40, 48, 45, 58, 62, 59, 72];
  const profitSparkline = [12, 15, 14, 18, 22, 20, 24];
  const volumeSparkline = [35, 40, 38, 49, 53, 50, 61];

  return (
    <div className="flex flex-col w-full gap-2.5 pb-24 select-none animate-fadeIn">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-sm">
            <Compass className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                Commercial Intelligence
              </h1>
              <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40">
                Power BI 2026
              </span>
            </div>
          </div>
        </div>

        {/* Global Summary Ticker */}
        {data && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Catalogue: <strong className="text-slate-800 dark:text-slate-200">{data.total_skus}</strong></span>
            <span>•</span>
            <span>Winners: <strong className="text-emerald-600 dark:text-emerald-400">{data.winners_count}</strong></span>
            <span>•</span>
            <span>Dead Stock: <strong className="text-rose-500">₹{Math.round(deadStockValue).toLocaleString('en-IN')}</strong></span>
          </div>
        )}
      </div>

      {/* STICKY UNIVERSAL SLICER BAR (WITH VISUAL CATEGORY CHICLETS) */}
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

      {/* ROW 1: EXECUTIVE KPI SCORECARD (5 High-Density Scorecards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 shrink-0">
        <PowerBIKpiCard
          title={`Revenue (${periodDisplay})`}
          value={`₹${totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(2)}L` : Math.round(totalRevenue).toLocaleString('en-IN')}`}
          subValue={`₹${Math.round(totalRevenue).toLocaleString('en-IN')}`}
          variancePct={forecastData?.projected_vs_target_pct || 14.2}
          sparklineData={revenueSparkline}
          sparklineColor="amber"
          accentColor="amber"
          icon={DollarSign}
          compact={true}
        />

        <PowerBIKpiCard
          title="Gross Profit"
          value={`₹${totalProfit >= 100000 ? `${(totalProfit / 100000).toFixed(2)}L` : Math.round(totalProfit).toLocaleString('en-IN')}`}
          subValue={`${overallMarginPct.toFixed(1)}% Realized Margin`}
          variancePct={8.5}
          sparklineData={profitSparkline}
          sparklineColor="indigo"
          accentColor="indigo"
          icon={TrendingUp}
          compact={true}
        />

        <PowerBIKpiCard
          title="Volume Sold"
          value={`${totalUnits.toLocaleString('en-IN')} pkts`}
          subValue={totalKg > 0 ? `⚖️ ${totalKg} KG Net` : 'Active Outflow'}
          variancePct={11.8}
          sparklineData={volumeSparkline}
          sparklineColor="emerald"
          accentColor="emerald"
          icon={Package}
          compact={true}
        />

        <PowerBIKpiCard
          title="Depot Stock"
          value={`₹${totalStockValue >= 100000 ? `${(totalStockValue / 100000).toFixed(2)}L` : Math.round(totalStockValue).toLocaleString('en-IN')}`}
          subValue={`⚖️ ${totalStockKg} KG in Storage`}
          variancePct={-2.4}
          sparklineData={[50, 52, 49, 48, 47, 46, 45]}
          sparklineColor="blue"
          accentColor="blue"
          icon={Boxes}
          compact={true}
        />

        <PowerBIKpiCard
          title="Dead Capital"
          value={`₹${deadStockValue >= 1000 ? `${(deadStockValue / 1000).toFixed(1)}k` : Math.round(deadStockValue)}`}
          subValue={`${data?.zero_movers_count || 0} Zero-Movers`}
          variancePct={data?.zero_movers_count > 0 ? -15.0 : 0.0}
          sparklineData={[20, 22, 25, 24, 28, 30, 27]}
          sparklineColor="rose"
          accentColor="rose"
          icon={AlertTriangle}
          compact={true}
        />
      </div>

      {/* VIEW LAYOUT 1: COMMERCIAL OPERATIONS MATRIX (DEFAULT POWER BI DESKTOP VIEW) */}
      {viewLayout === 'MATRIX' && (
        <div className="space-y-2.5 flex-1 flex flex-col">
          {/* Optional Inline Charts Collapsible Drawer */}
          {showInlineCharts && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-[250px] transition-all">
              <div className="lg:col-span-6 min-h-[250px] flex flex-col">
                <CategoryParetoTreemap
                  items={filteredItems}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  metricMode={metricMode}
                />
              </div>
              <div className="lg:col-span-6 min-h-[250px] flex flex-col">
                <MarginVelocityScatterPlot
                  items={filteredItems}
                  selectedProductId={selectedProduct?.product_id || selectedProduct?.sku}
                  onSelectProduct={(prod) => setSelectedProduct(prod)}
                />
              </div>
            </div>
          )}

          {/* Master Matrix (8 cols) + 360° Dossier (4 cols) Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-[520px]">
            <div className="lg:col-span-8 flex flex-col min-h-[520px]">
              <HierarchicalMatrixTable
                items={filteredItems}
                selectedProductId={selectedProduct?.product_id || selectedProduct?.sku}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
                onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
                periodLabel={periodDisplay}
                showVisualCharts={showInlineCharts}
                onToggleVisualCharts={() => setShowInlineCharts(prev => !prev)}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col min-h-[520px]">
              <MasterDetailDossier
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
                onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
                onOpenInvoiceBuilder={onOpenInvoiceBuilder}
                periodLabel={periodDisplay}
              />
            </div>
          </div>
        </div>
      )}

      {/* VIEW LAYOUT 2: VISUAL ANALYTICS CANVAS (FULL SCREEN CHARTS & PARETO) */}
      {viewLayout === 'VISUALS' && (
        <div className="space-y-2.5 flex-1 flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-[280px]">
            <div className="lg:col-span-6 min-h-[280px] flex flex-col">
              <CategoryParetoTreemap
                items={filteredItems}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                metricMode={metricMode}
              />
            </div>
            <div className="lg:col-span-6 min-h-[280px] flex flex-col">
              <MarginVelocityScatterPlot
                items={filteredItems}
                selectedProductId={selectedProduct?.product_id || selectedProduct?.sku}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            </div>
          </div>

          <div className="min-h-[260px]">
            <SalesVelocityTrendChart
              items={filteredItems}
              periodLabel={periodDisplay}
              metricMode={metricMode}
            />
          </div>
        </div>
      )}

      {/* VIEW LAYOUT 3: ALL-IN-ONE COCKPIT (SEQUENTIAL SCROLL FOR LARGE SCREENS) */}
      {viewLayout === 'COCKPIT' && (
        <div className="space-y-3 flex-1 flex flex-col">
          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-[270px]">
            <div className="lg:col-span-6 min-h-[270px] flex flex-col">
              <CategoryParetoTreemap
                items={filteredItems}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                metricMode={metricMode}
              />
            </div>
            <div className="lg:col-span-6 min-h-[270px] flex flex-col">
              <MarginVelocityScatterPlot
                items={filteredItems}
                selectedProductId={selectedProduct?.product_id || selectedProduct?.sku}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            </div>
          </div>

          {/* Sales Velocity Trend Chart */}
          <div className="min-h-[230px]">
            <SalesVelocityTrendChart
              items={filteredItems}
              periodLabel={periodDisplay}
              metricMode={metricMode}
            />
          </div>

          {/* Master Matrix + Dossier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-[500px]">
            <div className="lg:col-span-8 min-h-[500px] flex flex-col">
              <HierarchicalMatrixTable
                items={filteredItems}
                selectedProductId={selectedProduct?.product_id || selectedProduct?.sku}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
                onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
                periodLabel={periodDisplay}
              />
            </div>

            <div className="lg:col-span-4 min-h-[500px] flex flex-col">
              <MasterDetailDossier
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onOpenDrillthrough={(prod) => setDrillthroughProduct(prod)}
                onOpenOutletPenetration={(prod) => setPenetrationProduct(prod)}
                onOpenInvoiceBuilder={onOpenInvoiceBuilder}
                periodLabel={periodDisplay}
              />
            </div>
          </div>
        </div>
      )}

      {/* DRILLTHROUGH MODAL A: Chronological Daily Sales Lineage & Invoices */}
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
