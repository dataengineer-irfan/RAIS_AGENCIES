import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, TrendingUp, DollarSign, Package } from 'lucide-react';
import { reportApi } from '../services/api';

export const ReportsPage = () => {
  const [aging, setAging] = useState(null);
  const [customerAging, setCustomerAging] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [agingData, custAgingData, prodData] = await Promise.all([
        reportApi.getAging(),
        reportApi.getCustomerAging(),
        reportApi.getProductSales()
      ]);
      setAging(agingData);
      setCustomerAging(custAgingData);
      setProductSales(prodData);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs animate-pulse">
        Generating real-time business reports...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <span>Financial Reports & Receivables Aging</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Receivables aging buckets, customer exposure, and catalogue sales velocity
        </p>
      </div>

      {/* Aging Summary Card */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Receivables Aging Buckets (Due Timeline)
            </h2>
          </div>
          <p className="text-xs font-mono font-bold text-slate-400">
            Total Outstanding: <span className="text-amber-400 font-black">₹{parseFloat(aging?.total_outstanding || 0).toFixed(2)}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400">0 - 15 Days (Current)</span>
            <p className="text-xl font-black font-mono text-white mt-2">
              ₹{parseFloat(aging?.current_0_15_days || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Healthy normal credit window</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-blue-400">16 - 30 Days</span>
            <p className="text-xl font-black font-mono text-white mt-2">
              ₹{parseFloat(aging?.aging_16_30_days || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Due for payment follow-up</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-400">31 - 60 Days</span>
            <p className="text-xl font-black font-mono text-amber-400 mt-2">
              ₹{parseFloat(aging?.aging_31_60_days || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Overdue settlement required</p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-rose-400">60+ Days (Critical)</span>
            <p className="text-xl font-black font-mono text-rose-400 mt-2">
              ₹{parseFloat(aging?.aging_60_plus_days || 0).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Critical debt exposure</p>
          </div>
        </div>
      </div>

      {/* Customer Aging Breakdown Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Customer Debt & Aging Exposure
          </h3>
          <span className="text-[11px] text-slate-400">{customerAging.length} Accounts with Open Balances</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3 text-right">0-15 Days</th>
                <th className="py-3 px-3 text-right">16-30 Days</th>
                <th className="py-3 px-3 text-right">31-60 Days</th>
                <th className="py-3 px-3 text-right">60+ Days</th>
                <th className="py-3 px-4 text-right font-black">Total Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {customerAging.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500 text-xs">
                    All customer accounts are fully settled. No overdue balances.
                  </td>
                </tr>
              ) : (
                customerAging.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-200">
                      <p className="font-bold">{c.business_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{c.customer_code}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{c.phone}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">₹{parseFloat(c.current_0_15).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">₹{parseFloat(c.days_16_30).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-400">₹{parseFloat(c.days_31_60).toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-mono text-rose-400">₹{parseFloat(c.days_60_plus).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-400">
                      ₹{parseFloat(c.total_due).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Sales Velocity Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <span>Catalogue Performance & Sales Volume</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-3">Product Description</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Brand</th>
                <th className="py-3 px-3 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right font-black">Revenue Generated (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {productSales.slice(0, 15).map((p) => (
                <tr key={p.product_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-500">{p.sku}</td>
                  <td className="py-3 px-3 text-slate-200 font-bold">{p.product_name}</td>
                  <td className="py-3 px-3 text-slate-400">{p.category_name}</td>
                  <td className="py-3 px-3 text-slate-400">{p.brand}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">{p.total_quantity_sold}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    ₹{parseFloat(p.total_revenue).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
