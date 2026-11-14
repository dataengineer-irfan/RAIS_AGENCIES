import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  Store, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  DollarSign, 
  Scale, 
  RefreshCw, 
  Package, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { analyticsApi } from '../../services/api';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { ThermalReceiptModal } from '../ThermalReceiptModal';

/**
 * DailySalesDrillthroughModal - Power BI 2026 Style Chronological Sales Drillthrough
 * Day-by-day sales records, customer invoices, and thermal slip audit.
 */
export const DailySalesDrillthroughModal = ({
  isOpen,
  onClose,
  product,
  period = '30d',
  start_date,
  end_date
}) => {
  useBodyScrollLock(isOpen);

  const [loading, setLoading] = useState(true);
  const [drillData, setDrillData] = useState(null);
  const [error, setError] = useState('');
  const [expandedDays, setExpandedDays] = useState({});
  const [previewInvoiceId, setPreviewInvoiceId] = useState(null);

  const fetchDrilldown = async () => {
    if (!product?.id && !product?.product_id) return;
    const prodId = product.id || product.product_id;
    setLoading(true);
    setError('');
    try {
      const params = { period };
      if (start_date && end_date) {
        params.start_date = start_date;
        params.end_date = end_date;
      }
      const data = await analyticsApi.getProductSalesDrilldown(prodId, params);
      setDrillData(data);
    } catch (err) {
      console.error('Failed to fetch product daily drilldown:', err);
      setError('Failed to load chronological sales records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDrilldown();
    }
  }, [isOpen, product, period, start_date, end_date]);

  if (!isOpen) return null;

  const toggleDay = (dateStr) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  const handleExportCsv = () => {
    if (!drillData?.daily_breakdown || drillData.daily_breakdown.length === 0) return;
    const rows = [];
    rows.push(['Date', 'Day', 'Invoice No', 'Customer Name', 'Quantity', 'Unit', 'Rate (₹)', 'Total (₹)', 'Margin %', 'Status']);

    drillData.daily_breakdown.forEach(day => {
      day.invoices.forEach(inv => {
        rows.push([
          day.date,
          day.day_name,
          inv.invoice_number,
          `"${inv.customer_name}"`,
          inv.quantity,
          inv.packaging_unit,
          inv.unit_price,
          inv.line_total,
          `${inv.margin_pct}%`,
          inv.status
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_daily_sales_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = drillData?.summary || {};
  const dailyBreakdown = drillData?.daily_breakdown || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden select-none">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {product?.sku}
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Power BI 2026 Drillthrough
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {product?.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={loading || dailyBreakdown.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 sm:px-4 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Units Sold ({period}):</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
              {summary.total_units_sold || 0} pkts
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Weight Moved:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              ⚖️ {summary.total_kg_sold || 0} KG
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Total Billed:</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
              ₹{Number(summary.total_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Net Profit (₹):</span>
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
              +₹{Number(summary.total_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Gross Margin %:</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {summary.margin_pct || 0}%
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
              <p className="text-xs font-mono">Aggregating chronological sales records from database...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs text-center">
              {error}
            </div>
          ) : dailyBreakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              No sales recorded for {product?.name} in the selected time period ({period}).
            </div>
          ) : (
            dailyBreakdown.map((day) => {
              const isExpanded = expandedDays[day.date] !== false; // default expanded

              return (
                <div
                  key={day.date}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Day Header Row */}
                  <div
                    onClick={() => toggleDay(day.date)}
                    className="flex items-center justify-between p-2.5 sm:px-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {day.date}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans font-medium">
                        ({day.day_name})
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {day.invoices.length} {day.invoices.length === 1 ? 'invoice' : 'invoices'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {day.total_units} pkts {day.total_kg > 0 ? `(${day.total_kg} KG)` : ''}
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        ₹{day.total_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {day.margin_pct}% mrg
                      </span>
                    </div>
                  </div>

                  {/* Nested Invoices Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-1.5 px-3">Invoice #</th>
                            <th className="py-1.5 px-3">Customer Outlet</th>
                            <th className="py-1.5 px-3 text-right">Quantity</th>
                            <th className="py-1.5 px-3 text-right">Billed Rate</th>
                            <th className="py-1.5 px-3 text-right">Line Total</th>
                            <th className="py-1.5 px-3 text-right">Margin %</th>
                            <th className="py-1.5 px-3 text-right">Slip Audit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {day.invoices.map((inv) => (
                            <tr
                              key={inv.invoice_id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-mono"
                            >
                              <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                                {inv.invoice_number}
                              </td>
                              <td className="py-2 px-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                                  {inv.customer_name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {inv.customer_code} • {inv.territory}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                                {inv.quantity} {inv.packaging_unit}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-300">
                                ₹{inv.unit_price.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                                ₹{inv.line_total.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  inv.margin_pct >= 15 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                  {inv.margin_pct}%
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-sans">
                                <button
                                  onClick={() => setPreviewInvoiceId(inv.invoice_id)}
                                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] font-bold transition-all border border-slate-200 dark:border-slate-700"
                                >
                                  View Slip
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Embedded Thermal / Invoice Slip Preview */}
      {previewInvoiceId && (
        <ThermalReceiptModal
          isOpen={!!previewInvoiceId}
          onClose={() => setPreviewInvoiceId(null)}
          invoiceId={previewInvoiceId}
        />
      )}
    </div>
  );
};
