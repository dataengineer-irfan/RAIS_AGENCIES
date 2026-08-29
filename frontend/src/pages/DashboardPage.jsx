import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  FileText, 
  PlusCircle, 
  CreditCard, 
  Users, 
  Package, 
  Printer,
  ArrowRight
} from 'lucide-react';
import { reportApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

export const DashboardPage = ({ onOpenInvoiceBuilder, onOpenPaymentModal, onNavigate }) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    setLoading(true);
    try {
      const data = await reportApi.getDashboard();
      setKpis(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-xs animate-pulse">
        Loading real-time business telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
            Rayachoty Wholesale Hub
          </span>
          <h1 className="text-xl md:text-2xl font-black text-white mt-2">
            RAIS Agencies Commercial Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time billing, inventory movements, and customer ledger balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenInvoiceBuilder}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
          <button
            onClick={onOpenPaymentModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Month Revenue */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue This Month</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 font-mono">
            ₹{parseFloat(kpis?.total_revenue_month || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Invoiced across {kpis?.total_invoices_count || 0} orders</p>
        </div>

        {/* Total Outstanding */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 mt-3 font-mono">
            ₹{parseFloat(kpis?.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{kpis?.open_invoices_count || 0} open unpaid invoices</p>
        </div>

        {/* Total Overdue */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-3 font-mono">
            ₹{parseFloat(kpis?.total_overdue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Past designated payment terms</p>
        </div>

        {/* Master Accounts */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Accounts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3 font-mono">
            {kpis?.active_customers_count || 0} <span className="text-sm font-normal text-slate-500">Clients</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{kpis?.total_products_count || 0} active catalogue SKUs</p>
        </div>
      </div>

      {/* Tables Row: Recent Invoices & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Invoices Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Recent Invoices</span>
            </h3>
            <button
              onClick={() => onNavigate('billing')}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {kpis?.recent_invoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-200">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-medium truncate max-w-[140px]">{inv.customer_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">₹{inv.total_amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">₹{inv.outstanding_amount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <a
                        href={`/api/invoices/${inv.id}/print-html`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-white inline-block"
                        title="Print / PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Catalogue Items (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-500" />
              <span>Top Catalogue Items</span>
            </h3>
            <button
              onClick={() => onNavigate('catalogue')}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Catalogue <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {kpis?.top_selling_products?.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No sales activity recorded yet.</p>
            ) : (
              kpis?.top_selling_products?.map((prod, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-200 truncate">{prod.product_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{prod.quantity_sold} packs sold</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-emerald-400">₹{prod.total_revenue.toFixed(2)}</p>
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Revenue</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
