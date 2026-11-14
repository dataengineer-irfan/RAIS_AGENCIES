import React from 'react';
import { 
  X, 
  Package, 
  TrendingUp, 
  Scale, 
  DollarSign, 
  Clock, 
  Store, 
  FileText, 
  ArrowUpRight, 
  Boxes, 
  Plus, 
  Share2, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Snowflake,
  ExternalLink
} from 'lucide-react';
import { ProductVisualBadge } from '../../utils/productIcons';

/**
 * MasterDetailDossier - Power BI 2026 Master-Detail Inspector Panel
 * Surfaced on the right when an SKU row is clicked in the Master Matrix.
 */
export const MasterDetailDossier = ({
  product,
  onClose,
  onOpenDrillthrough,
  onOpenOutletPenetration,
  onOpenInvoiceBuilder,
  periodLabel = 'Selected Period'
}) => {
  if (!product) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center justify-center h-full">
        <Package className="w-8 h-8 mb-2 opacity-30" />
        <p className="font-bold">Select any product row in the Master Matrix to inspect full 360° commercial dossier.</p>
      </div>
    );
  }

  const revenue = Number(product.revenue_30d) || 0;
  const profit = Number(product.profit_30d) || 0;
  const unitsSold = Number(product.units_sold_30d) || 0;
  const kgSold = Number(product.kg_sold) || 0;
  const marginPct = Number(product.margin_pct) || 0;
  const currentStock = Number(product.stock_holding_units) || 0;
  const stockKg = Number(product.stock_holding_kg) || 0;
  const stockVal = Number(product.stock_holding_value) || 0;
  const unitCost = Number(product.unit_cost) || 0;
  const basePrice = Number(product.base_price) || 0;
  const avgProfitPerUnit = unitsSold > 0 ? profit / unitsSold : (basePrice - unitCost);

  // Runway calculation: units sold per day
  const dailyRunRate = unitsSold / 30; // standard 30d denominator
  const runwayDays = dailyRunRate > 0 ? Math.round(currentStock / dailyRunRate) : (currentStock > 0 ? 999 : 0);

  const getStatusBadge = (classification) => {
    switch (classification) {
      case 'WINNER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
            <StarIcon className="w-2.5 h-2.5 inline" /> WINNER
          </span>
        );
      case 'STEADY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            📦 STEADY
          </span>
        );
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/40">
            📉 DECLINING
          </span>
        );
      case 'ZERO_MOVER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40">
            ❄️ DEAD STOCK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ACTIVE
          </span>
        );
    }
  };

  function StarIcon(props) {
    return <span {...props}>⭐</span>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-md flex flex-col h-full overflow-y-auto space-y-3.5 select-none">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductVisualBadge product={product} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {product.sku}
              </span>
              {getStatusBadge(product.classification)}
            </div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base leading-tight mt-0.5 truncate">
              {product.name}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {product.brand || 'RAIS'} • {product.category_name}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Primary Action Ribbon */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onOpenDrillthrough && onOpenDrillthrough(product)}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Daily Sales Lineage</span>
        </button>

        <button
          onClick={() => onOpenOutletPenetration && onOpenOutletPenetration(product)}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Outlet Penetration</span>
        </button>
      </div>

      {/* Card 1: 360° Commercial Economics */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-amber-500" /> 360° Unit Economics ({periodLabel})
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-normal">FIFO Wholesale</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Billed Revenue:</span>
            <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Net Gross Profit:</span>
            <div className={`font-mono font-black text-sm ${profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
              {profit >= 0 ? '+' : ''}₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Gross Margin %:</span>
            <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {marginPct.toFixed(1)}%
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Avg Profit / Pack:</span>
            <div className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">
              ₹{avgProfitPerUnit.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex justify-between">
          <span>Base Price: ₹{basePrice.toFixed(2)}</span>
          <span>Landed Cost: ₹{unitCost.toFixed(2)}</span>
        </div>
      </div>

      {/* Card 2: Physical Inventory & Cold-Room Runway */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-blue-500" /> Cold-Room Stock & Runway
          </span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
            runwayDays < 7 ? 'bg-rose-500/20 text-rose-500' : runwayDays < 15 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'
          }`}>
            {runwayDays >= 900 ? 'No Active Sales' : `${runwayDays}d runway`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Units on Hand:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{currentStock} pkts</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Weight Volume:</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">⚖️ {stockKg} KG</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Valuation:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              ₹{stockVal >= 1000 ? `${(stockVal/1000).toFixed(1)}k` : stockVal}
            </span>
          </div>
        </div>

        {/* Volume Moved in Period */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Dispatched in Period:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {unitsSold} pkts {kgSold > 0 ? `(${kgSold} KG)` : ''}
          </span>
        </div>
      </div>

      {/* Secondary Operational Actions */}
      <div className="pt-1 flex items-center gap-2">
        {onOpenInvoiceBuilder && (
          <button
            onClick={() => onOpenInvoiceBuilder(product)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>
    </div>
  );
};
