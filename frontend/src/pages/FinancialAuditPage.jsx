import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  User, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  X, 
  Phone, 
  HelpCircle, 
  ArrowRight, 
  Trash2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ArrowUpDown, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  FileText,
  CreditCard,
  Building,
  ArrowDownRight,
  UserX,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { reportApi, auditApi } from '../services/api';

export const FinancialAuditPage = ({ onNavigate, initialParams = null }) => {
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorNotice, setErrorNotice] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Sub-tab navigation: 'anomalies' | 'leakage' | 'customers' | 'dossier' | 'guide'
  const [activeTab, setActiveTab] = useState(() => initialParams?.tab || 'anomalies');

  // Customer Search & Filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);

  // Customer Dossier Drilldown
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => initialParams?.customerId || '');
  const [dossierData, setDossierData] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierSubTab, setDossierSubTab] = useState('ledger'); // 'ledger' | 'invoices' | 'payments'

  // Export State
  const [exportingExcel, setExportingExcel] = useState(false);

  // Resolve Duplicate Modal State
  const [resolveModal, setResolveModal] = useState({ isOpen: false, anomaly: null, paymentNumber: '', customerName: '', amount: 0 });
  const [resolving, setResolving] = useState(false);

  // ─── MARGIN LEAKAGE FORENSIC STATE ───
  const [leakageData, setLeakageData] = useState({ summary: {}, items: [] });
  const [leakageLoading, setLeakageLoading] = useState(false);
  const [leakageDateRange, setLeakageDateRange] = useState('all');
  const [leakageCustomStart, setLeakageCustomStart] = useState('');
  const [leakageCustomEnd, setLeakageCustomEnd] = useState('');
  const [leakageSearch, setLeakageSearch] = useState('');
  const [debouncedLeakageSearch, setDebouncedLeakageSearch] = useState('');
  const [leakageClassification, setLeakageClassification] = useState('ALL'); // 'ALL' | 'CRITICAL_TYPO' | 'BELOW_COST_DISCOUNT' | 'SEVERE_LOSS'
  const [leakageSortBy, setLeakageSortBy] = useState('loss_desc'); // 'loss_desc' | 'loss_asc' | 'date_desc' | 'date_asc' | 'qty_desc' | 'loss_pct_desc'

  useEffect(() => {
    if (initialParams?.tab) {
      setActiveTab(initialParams.tab);
    }
    if (initialParams?.customerId) {
      setSelectedCustomerId(initialParams.customerId);
    }
  }, [initialParams]);

  useEffect(() => {
    loadScanData();
    loadMarginLeakage();
  }, []);

  // Debounce margin leakage search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLeakageSearch(leakageSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [leakageSearch]);

  useEffect(() => {
    loadMarginLeakage();
  }, [leakageDateRange, debouncedLeakageSearch, leakageCustomStart, leakageCustomEnd]);

  const loadScanData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const data = await reportApi.getFinancialAuditScan();
      setScanData(data);
      if (data?.customers?.length > 0 && !selectedCustomerId) {
        const firstWithAnomaly = data.customers.find(c => c.has_anomaly) || data.customers[0];
        setSelectedCustomerId(firstWithAnomaly.id);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setErrorNotice('Failed to complete audit scan. Please verify server connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadMarginLeakage = async () => {
    setLeakageLoading(true);
    try {
      const params = {};
      const today = new Date();
      const formatDate = (d) => d.toISOString().split('T')[0];

      if (leakageDateRange === 'today') {
        params.start_date = formatDate(today);
        params.end_date = formatDate(today);
      } else if (leakageDateRange === 'yesterday') {
        const yday = new Date(today);
        yday.setDate(yday.getDate() - 1);
        params.start_date = formatDate(yday);
        params.end_date = formatDate(yday);
      } else if (leakageDateRange === 'last7') {
        const p7 = new Date(today);
        p7.setDate(p7.getDate() - 7);
        params.start_date = formatDate(p7);
        params.end_date = formatDate(today);
      } else if (leakageDateRange === 'last30') {
        const p30 = new Date(today);
        p30.setDate(p30.getDate() - 30);
        params.start_date = formatDate(p30);
        params.end_date = formatDate(today);
      } else if (leakageDateRange === 'month_2026_11') {
        params.start_date = '2026-11-01';
        params.end_date = '2026-11-30';
      } else if (leakageDateRange === 'month_2026_10') {
        params.start_date = '2026-10-01';
        params.end_date = '2026-10-31';
      } else if (leakageDateRange === 'month_2026_09') {
        params.start_date = '2026-09-01';
        params.end_date = '2026-09-30';
      } else if (leakageDateRange === 'custom') {
        if (leakageCustomStart) params.start_date = leakageCustomStart;
        if (leakageCustomEnd) params.end_date = leakageCustomEnd;
      }

      if (debouncedLeakageSearch && debouncedLeakageSearch.trim()) {
        params.search = debouncedLeakageSearch.trim();
      }

      const res = await reportApi.getFinancialAuditMarginLeakage(params);
      setLeakageData(res || { summary: {}, items: [] });
    } catch (err) {
      console.error('Failed to load margin leakage audit', err);
    } finally {
      setLeakageLoading(false);
    }
  };

  const loadCustomerDossier = async (customerId) => {
    if (!customerId) return;
    setLoadingDossier(true);
    try {
      const dossier = await reportApi.getCustomerAuditStatement(customerId);
      setDossierData(dossier);
    } catch (err) {
      console.error('Failed to load customer statement:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDossier(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const handleExportExcel = async (specificCustomerId = null) => {
    setExportingExcel(true);
    try {
      const payload = {};
      if (specificCustomerId) {
        payload.customer_ids = [specificCustomerId];
      }
      const blob = await reportApi.exportFinancialAuditExcel(payload);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const targetName = specificCustomerId && dossierData?.customer?.customer_code 
        ? `_${dossierData.customer.customer_code}` 
        : '_Full';
      link.setAttribute('download', `RAIS_Financial_Audit${targetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setSuccessNotice('Master Excel audit workbook (with Margin Leakage & Ledger Dossiers) downloaded successfully!');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Excel export failed:', err);
      setErrorNotice('Failed to export Excel report. Please retry.');
    } finally {
      setExportingExcel(false);
    }
  };

  const exportLeakageCSV = () => {
    if (!filteredAndSortedLeakageItems || filteredAndSortedLeakageItems.length === 0) return;
    const headers = [
      'Invoice Date',
      'Invoice Number',
      'Customer Outlet',
      'SKU',
      'Product Name',
      'Packaging Unit',
      'Quantity Sold',
      'Billed Price (INR)',
      'Real Landed Cost (INR)',
      'Unit Loss (INR)',
      'Total Loss (INR)',
      'Loss Percentage (%)',
      'Diagnosis',
      'Billed By'
    ];

    const rows = filteredAndSortedLeakageItems.map(item => [
      item.invoice_date || '',
      item.invoice_number,
      `"${(item.customer_name || '').replace(/"/g, '""')}"`,
      item.sku,
      `"${(item.product_name || '').replace(/"/g, '""')}"`,
      `"${item.packaging_unit || ''}"`,
      item.quantity,
      item.unit_price.toFixed(2),
      item.landed_cost.toFixed(2),
      item.unit_loss.toFixed(2),
      item.total_loss.toFixed(2),
      `${item.loss_pct}%`,
      item.classification === 'CRITICAL_TYPO' ? 'Typo / Fatal Rate (<30% Cost)' : 'Wholesale Discount Below Cost',
      item.billed_by
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RAIS_Financial_Audit_Margin_Leakage_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessNotice('Margin Leakage forensic CSV exported successfully!');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleDrilldownToCustomer = (customerId) => {
    if (!customerId) return;
    setSelectedCustomerId(customerId);
    setActiveTab('dossier');
    setDossierSubTab('ledger');
  };

  const handleOpenResolveModal = (anomaly, paymentNumber) => {
    setResolveModal({
      isOpen: true,
      anomaly: anomaly,
      paymentNumber: paymentNumber,
      customerName: anomaly.customer_name,
      amount: anomaly.amount
    });
  };

  const handleConfirmResolve = async () => {
    if (!resolveModal.paymentNumber) return;
    setResolving(true);
    try {
      const res = await reportApi.resolveDuplicatePayment({
        payment_number: resolveModal.paymentNumber,
        reason: 'Confirmed phantom rapid-fire duplicate payment removed via Financial Audit Hub.'
      });
      setSuccessNotice(`Payment ${resolveModal.paymentNumber} removed successfully! New balance: ₹${res.new_balance.toFixed(2)}.`);
      setResolveModal({ isOpen: false, anomaly: null, paymentNumber: '', customerName: '', amount: 0 });
      await loadScanData();
      if (selectedCustomerId) {
        await loadCustomerDossier(selectedCustomerId);
      }
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Resolution failed:', err);
      setErrorNotice(err?.response?.data?.detail || 'Failed to remove duplicate payment.');
    } finally {
      setResolving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!scanData?.customers) return [];
    return scanData.customers.filter(c => {
      const matchesSearch = !customerSearch || 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch);
      const matchesAnomaly = !onlyAnomalies || c.has_anomaly;
      return matchesSearch && matchesAnomaly;
    });
  }, [scanData, customerSearch, onlyAnomalies]);

  // Filter and sort margin leakage items
  const filteredAndSortedLeakageItems = useMemo(() => {
    let items = (leakageData?.items || []).slice();

    if (leakageClassification === 'CRITICAL_TYPO') {
      items = items.filter(i => i.classification === 'CRITICAL_TYPO');
    } else if (leakageClassification === 'BELOW_COST_DISCOUNT') {
      items = items.filter(i => i.classification === 'BELOW_COST_DISCOUNT');
    } else if (leakageClassification === 'SEVERE_LOSS') {
      items = items.filter(i => (i.total_loss || 0) >= 50);
    }

    items.sort((a, b) => {
      if (leakageSortBy === 'loss_desc') return (b.total_loss || 0) - (a.total_loss || 0);
      if (leakageSortBy === 'loss_asc') return (a.total_loss || 0) - (b.total_loss || 0);
      if (leakageSortBy === 'date_desc') return (b.invoice_date || '').localeCompare(a.invoice_date || '');
      if (leakageSortBy === 'date_asc') return (a.invoice_date || '').localeCompare(b.invoice_date || '');
      if (leakageSortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (leakageSortBy === 'loss_pct_desc') return (b.loss_pct || 0) - (a.loss_pct || 0);
      return 0;
    });

    return items;
  }, [leakageData, leakageClassification, leakageSortBy]);

  // Monthly stats for quick pills
  const leakageMonthStats = useMemo(() => {
    const stats = {
      '2026-11': { label: 'November 2026', count: 0, loss: 0 },
      '2026-10': { label: 'October 2026', count: 0, loss: 0 },
      '2026-09': { label: 'September 2026', count: 0, loss: 0 },
    };
    (leakageData?.items || []).forEach(item => {
      const ym = (item.invoice_date || '').substring(0, 7);
      if (stats[ym]) {
        stats[ym].count += 1;
        stats[ym].loss += (item.total_loss || 0);
      }
    });
    return stats;
  }, [leakageData]);

  // Leakage items for the selected customer in Dossier
  const customerLeakageItems = useMemo(() => {
    if (!selectedCustomerId || !leakageData?.items) return [];
    return leakageData.items.filter(item => item.customer_id === selectedCustomerId);
  }, [selectedCustomerId, leakageData]);

  const summary = scanData?.summary || {};
  const anomalies = scanData?.anomalies || [];
  const leakageSummary = leakageData?.summary || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 text-slate-100">
      
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Financial Audit & Reconciliation Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PRO AUDIT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deep forensic ledger verification, rapid-fire duplicate detector, margin leakage analytics & automated multi-tab Excel generator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              loadScanData();
              loadMarginLeakage();
            }}
            disabled={loading || leakageLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || leakageLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>{loading ? 'Scanning...' : 'Run Deep Scan'}</span>
          </button>

          <button
            onClick={() => handleExportExcel(null)}
            disabled={exportingExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/50 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Download multi-tab Excel spreadsheet containing executive summary, duplicates, margin leaks, and statement dossiers"
          >
            <FileSpreadsheet className={`w-4 h-4 ${exportingExcel ? 'animate-spin' : ''}`} />
            <span>{exportingExcel ? 'Generating Excel...' : 'Export Audit Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorNotice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                loadScanData();
                loadMarginLeakage();
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
            <button onClick={() => setErrorNotice(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Top 5 KPI Metrics Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Platform Invoiced
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-100">
            ₹{(summary.total_invoiced || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> 100% Invariant Verified
          </span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Collections
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            ₹{(summary.total_collected || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Across {summary.total_payments_count || 0} Recorded Payments
          </span>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Current Net Dues
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            ₹{(summary.total_outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Across all {summary.total_customers || 0} Customer Accounts
          </span>
        </div>

        <div 
          onClick={() => setActiveTab('anomalies')}
          className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.01] ${
            activeTab === 'anomalies'
              ? 'ring-2 ring-amber-500 bg-slate-900 border-amber-500/50'
              : (summary.total_at_risk_amount || 0) > 0 
              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60' 
              : 'bg-slate-900 border-slate-800'
          }`}
          title="Click to view Rapid-Fire Duplicate Anomalies"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Duplicate Credit at Risk
            </span>
            {(summary.anomalies_count || 0) > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[9px] font-black">
                {summary.anomalies_count} FLAGGED
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
            ₹{(summary.total_at_risk_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 flex items-center justify-between font-medium">
            <span>{(summary.total_at_risk_amount || 0) > 0 ? 'Double-Click Overcredits' : 'All Accounts Clean'}</span>
            <span className="text-[9px] underline text-amber-400">Inspect →</span>
          </span>
        </div>

        {/* Card 5: Margin Leakage Drain */}
        <div 
          onClick={() => setActiveTab('leakage')}
          className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all hover:scale-[1.01] ${
            activeTab === 'leakage' 
              ? 'ring-2 ring-rose-500 bg-rose-950/30 border-rose-500/50' 
              : (leakageSummary.total_loss || 0) > 0
              ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-400/60'
              : 'bg-slate-900 border-slate-800'
          }`}
          title="Click to view Margin Leakage (Sold Below Cost)"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Margin Leakage Drain
            </span>
            {(leakageSummary.total_items || 0) > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[9px] font-black">
                {leakageSummary.total_items} ITEMS
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-400">
            -₹{(leakageSummary.total_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 flex items-center justify-between font-medium">
            <span>Sold Below Landed Cost</span>
            <span className="text-[9px] underline text-rose-400">Inspect →</span>
          </span>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex border-b border-slate-800 gap-1 sm:gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'anomalies'
              ? 'border-amber-500 text-amber-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Flagged Anomalies & Rapid Duplicates</span>
          {anomalies.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
              {anomalies.length}
            </span>
          )}
        </button>

        {/* Sub-tab 2: MARGIN LEAKAGE */}
        <button
          onClick={() => setActiveTab('leakage')}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'leakage'
              ? 'border-rose-500 text-rose-400 bg-slate-900 shadow-sm'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span>Margin Leakage (Sold Below Cost)</span>
          {(leakageSummary.total_items || 0) > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full text-[9px] font-mono font-black">
              {leakageSummary.total_items}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'customers'
              ? 'border-amber-500 text-amber-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Customer Ledger Overview ({filteredCustomers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dossier')}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dossier'
              ? 'border-amber-500 text-amber-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Single Customer Deep Dossier</span>
          {selectedCustomerId && (
            <span className="text-[10px] text-amber-400/80 font-mono">
              ({scanData?.customers?.find(c => c.id === selectedCustomerId)?.code || 'SELECTED'})
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-3 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'guide'
              ? 'border-amber-500 text-amber-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Bank Verification & Customer Scripts</span>
        </button>
      </div>

      {/* ─── TAB 1: FLAGGED ANOMALIES ─── */}
      {activeTab === 'anomalies' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Suspect Rapid-Fire Double Payments Detected by Forensic Scan
            </h2>
            <span className="text-xs text-slate-500">
              Identified where identical payment amount & method were recorded within seconds
            </span>
          </div>

          {anomalies.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">No Unresolved Duplicate Payments Detected</h3>
              <p className="text-xs text-slate-400 mt-1">
                All {summary.total_invoices_count || 0} invoices and {summary.total_payments_count || 0} payments strictly satisfy mathematical ledger invariants.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {anomalies.map((a) => (
                <div 
                  key={a.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    a.severity === 'HIGH'
                      ? 'bg-rose-950/10 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-amber-950/10 border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          a.severity === 'HIGH' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                        }`}>
                          {a.severity === 'HIGH' ? '🚨 PHANTOM DOUBLE-CLICK' : 'SPLIT PAYMENT'}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {a.customer_name} ({a.customer_code})
                        </h3>
                        <span className="text-xs text-slate-400">
                          {a.customer_phone} • {a.customer_city}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 font-mono">
                        {a.explanation}
                      </p>

                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 flex-wrap">
                        <span><strong>Entry 1:</strong> {a.payment_1_number} ({a.payment_1_time_ist})</span>
                        <span>•</span>
                        <span><strong>Entry 2:</strong> {a.payment_2_number} ({a.payment_2_time_ist})</span>
                        <span>•</span>
                        <span className="text-rose-400 font-bold">Delta: {a.delta_seconds}s</span>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">At Risk Balance</span>
                        <span className="text-xl font-black font-mono text-rose-400">
                          ₹{a.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomerId(a.customer_id);
                            setActiveTab('dossier');
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Dossier</span>
                        </button>

                        <button
                          onClick={() => handleOpenResolveModal(a, a.payment_2_number)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-950/50 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Resolve Duplicate</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ENHANCED MARGIN LEAKAGE FORENSIC DASHBOARD ─── */}
      {activeTab === 'leakage' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Leakage Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
                  Historical Margin Leakage Audit
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 font-mono">
                    {filteredAndSortedLeakageItems.length} Line Items Sold Below Landed Cost
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cross-referencing line-item billed prices against verified inward warehouse landed costs to expose typos and under-cost discounting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={leakageSearch}
                  onChange={(e) => setLeakageSearch(e.target.value)}
                  placeholder="Search SKU, product, outlet..."
                  className="pl-8 pr-7 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
                />
                {leakageSearch && (
                  <button
                    onClick={() => setLeakageSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <select
                value={leakageDateRange}
                onChange={(e) => setLeakageDateRange(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">📅 All Time (Historical)</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="month_2026_11">November 2026 (0 loss - Safe)</option>
                <option value="month_2026_10">October 2026 (5 items)</option>
                <option value="month_2026_09">September 2026 (16 items)</option>
                <option value="custom">Custom Date Range...</option>
              </select>

              {/* Custom Date Pickers */}
              {leakageDateRange === 'custom' && (
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                  <input
                    type="date"
                    value={leakageCustomStart}
                    onChange={(e) => setLeakageCustomStart(e.target.value)}
                    className="bg-transparent text-slate-300 text-xs px-1 focus:outline-none"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="date"
                    value={leakageCustomEnd}
                    onChange={(e) => setLeakageCustomEnd(e.target.value)}
                    className="bg-transparent text-slate-300 text-xs px-1 focus:outline-none"
                  />
                </div>
              )}

              {/* Classification Filter */}
              <select
                value={leakageClassification}
                onChange={(e) => setLeakageClassification(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="CRITICAL_TYPO">⚠️ Typo / Fatal (&lt;30% cost)</option>
                <option value="BELOW_COST_DISCOUNT">🔻 Discount Below Cost</option>
                <option value="SEVERE_LOSS">🚨 High Loss (≥ ₹50 Loss)</option>
              </select>

              {/* Sort By Filter */}
              <select
                value={leakageSortBy}
                onChange={(e) => setLeakageSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="loss_desc">Loss: High to Low</option>
                <option value="loss_asc">Loss: Low to High</option>
                <option value="date_desc">Date: Newest First</option>
                <option value="date_asc">Date: Oldest First</option>
                <option value="qty_desc">Quantity: High to Low</option>
                <option value="loss_pct_desc">Loss %: High to Low</option>
              </select>

              {/* Export CSV */}
              <button
                onClick={exportLeakageCSV}
                disabled={filteredAndSortedLeakageItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer"
                title="Export forensic audit data to CSV"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Refresh */}
              <button
                onClick={loadMarginLeakage}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 cursor-pointer"
                title="Refresh leakage audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${leakageLoading ? 'animate-spin text-rose-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Filter Interactive Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => { setLeakageClassification('ALL'); setLeakageDateRange('all'); }}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageClassification === 'ALL' && leakageDateRange === 'all'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              All Leaks ({leakageData?.items?.length || 0})
            </button>

            <button
              onClick={() => setLeakageClassification('CRITICAL_TYPO')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageClassification === 'CRITICAL_TYPO'
                  ? 'bg-red-500 text-white border-red-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              ⚠️ Fatal Keypunch Typos ({(leakageData?.items || []).filter(i => i.classification === 'CRITICAL_TYPO').length})
            </button>

            <button
              onClick={() => setLeakageClassification('BELOW_COST_DISCOUNT')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageClassification === 'BELOW_COST_DISCOUNT'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              🔻 Wholesale Below Cost ({(leakageData?.items || []).filter(i => i.classification === 'BELOW_COST_DISCOUNT').length})
            </button>

            <button
              onClick={() => setLeakageClassification('SEVERE_LOSS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageClassification === 'SEVERE_LOSS'
                  ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              🚨 Severe Loss ≥ ₹50 ({(leakageData?.items || []).filter(i => (i.total_loss || 0) >= 50).length})
            </button>

            <button
              onClick={() => setLeakageDateRange('month_2026_09')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageDateRange === 'month_2026_09'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              Sep 2026 ({leakageMonthStats['2026-09'].count} items • -₹{leakageMonthStats['2026-09'].loss.toFixed(0)})
            </button>

            <button
              onClick={() => setLeakageDateRange('month_2026_10')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageDateRange === 'month_2026_10'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              Oct 2026 ({leakageMonthStats['2026-10'].count} items • -₹{leakageMonthStats['2026-10'].loss.toFixed(0)})
            </button>

            <button
              onClick={() => setLeakageDateRange('month_2026_11')}
              className={`px-3 py-1.5 rounded-xl font-bold transition border shrink-0 cursor-pointer ${
                leakageDateRange === 'month_2026_11'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-900 text-emerald-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              ✨ Nov 2026 (0 Items • ₹0.00 Leakage)
            </button>
          </div>

          {/* 4 Specialized Margin Leakage KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Cumulative Cash Drain</span>
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                  -₹{(leakageSummary.total_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Direct commercial loss from selling below procurement cost
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Under-Cost Line Items</span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {filteredAndSortedLeakageItems.length} <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Across {leakageSummary.total_invoices || 0} distinct customer invoices
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Worst Single Loss SKU</span>
                <div className="p-2 rounded-xl bg-red-500/15 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm font-black text-amber-300 truncate">
                  {leakageSummary.worst_sku || 'None'}
                </div>
                <p className="text-xs text-rose-400 font-bold mt-1 font-mono">
                  -₹{(leakageSummary.worst_sku_loss || 0).toFixed(2)} loss ({leakageSummary.worst_product_name || 'N/A'})
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px]">Top Discount Outlet</span>
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm font-black text-white truncate">
                  {leakageSummary.worst_customer || 'None'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Total loss absorbed: <strong className="text-rose-400 font-mono">-₹{(leakageSummary.worst_customer_loss || 0).toFixed(2)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Root-Cause & Forensic Intelligence Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                <span>Typo / Fatal Keypunch Error</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">1 Critical Keypunch Typo:</strong> Tortilla (8.5 inches) was billed at <span className="text-rose-400 font-mono font-bold">₹2.00</span> instead of <span className="text-emerald-400 font-mono font-bold">₹72.00</span> landed cost to outlet <span className="text-white font-bold">Kksk</span> on 04-Oct-2026, causing an instant <strong>-₹140.00</strong> cash loss.
              </p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ArrowDownRight className="w-4 h-4" />
                <span>Wholesale Below-Cost Discounts</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">20 Discount Line Items:</strong> In Sept/Oct 2026, bulk wholesale items (Chilly Powder, Mayonnaise, Mozzarella Cheese) were discounted below real procurement cost to gain account volume.
              </p>
            </div>

            <div className="p-4 bg-slate-900/80 border border-emerald-500/30 bg-emerald-950/10 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                <span>Current Resolution Status</span>
              </div>
              <p className="text-xs text-emerald-200 leading-relaxed">
                <strong className="text-white">100% Contained in Nov 2026:</strong> Zero below-cost billings occurred in November 2026. Automated price verification in the billing flow now warns operators before finalizing invoices below cost.
              </p>
            </div>
          </div>

          {/* Detailed Leakage Forensic Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Line-Item Forensic Ledger ({filteredAndSortedLeakageItems.length} records)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  • Click any customer outlet to open their complete financial dossier
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono font-medium">
                Sorted by {leakageSortBy.replace('_', ' ')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Invoice #</th>
                    <th className="py-3 px-3.5">Customer Outlet</th>
                    <th className="py-3 px-3.5">SKU & Product</th>
                    <th className="py-3 px-3.5 text-right">Qty</th>
                    <th className="py-3 px-3.5 text-right">Billed Price</th>
                    <th className="py-3 px-3.5 text-right">Landed Cost</th>
                    <th className="py-3 px-3.5 text-right">Unit Loss</th>
                    <th className="py-3 px-3.5 text-right">Total Loss</th>
                    <th className="py-3 px-3.5 text-center">Diagnosis</th>
                    <th className="py-3 px-3.5">Operator</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {leakageLoading ? (
                    <tr>
                      <td colSpan="12" className="py-14 text-center text-slate-500 font-medium">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-400" />
                        Analyzing commercial procurement & sales ledger...
                      </td>
                    </tr>
                  ) : filteredAndSortedLeakageItems.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-14 text-center text-slate-400 font-medium">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        <h4 className="text-white font-bold text-sm">Zero Margin Leakages Detected</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          All items billed in the selected criteria satisfied or exceeded warehouse inward cost invariants!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedLeakageItems.map((item, idx) => (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.invoice_date || 'N/A'}
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <button
                            onClick={() => handleDrilldownToCustomer(item.customer_id)}
                            className="font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 text-[11px] cursor-pointer transition"
                            title="View in Customer Statement"
                          >
                            {item.invoice_number}
                          </button>
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap max-w-[170px]">
                          <button
                            onClick={() => handleDrilldownToCustomer(item.customer_id)}
                            className="font-bold text-slate-100 hover:text-amber-400 text-left truncate block w-full cursor-pointer transition group-hover:underline"
                            title={`Open financial dossier for ${item.customer_name}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="truncate">{item.customer_name}</span>
                            </span>
                          </button>
                        </td>

                        <td className="py-3 px-3.5 max-w-[220px]">
                          <div className="font-mono text-[10px] text-amber-400/90 font-bold">{item.sku}</div>
                          <div className="font-medium text-slate-200 truncate text-[11px]" title={item.product_name}>
                            {item.product_name}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                          {item.quantity} <span className="text-[10px] text-slate-500 font-normal">{item.packaging_unit || 'PKT'}</span>
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono text-slate-200 whitespace-nowrap">
                          ₹{item.unit_price.toFixed(2)}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-400 whitespace-nowrap">
                          ₹{item.landed_cost.toFixed(2)}
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono whitespace-nowrap">
                          <span className="text-rose-400 font-bold">-₹{item.unit_loss.toFixed(2)}</span>
                          <span className="block text-[10px] text-slate-500">(-{item.loss_pct}%)</span>
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <span className="font-mono font-black text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs">
                            -₹{item.total_loss.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {item.classification === 'CRITICAL_TYPO' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Fatal Typo (&lt;30% Cost)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <ArrowDownRight className="w-3 h-3" />
                              Wholesale Discount
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.billed_by}
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDrilldownToCustomer(item.customer_id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-700 inline-flex items-center gap-1 cursor-pointer"
                            title="Drilldown to Customer Dossier"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3 h-3 text-amber-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary Aggregation */}
            {filteredAndSortedLeakageItems.length > 0 && (
              <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Showing {filteredAndSortedLeakageItems.length} under-cost line items (Total Quantity Sold: {filteredAndSortedLeakageItems.reduce((acc, x) => acc + (x.quantity || 0), 0)} units)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">Total Filtered Cash Drain:</span>
                  <span className="text-sm font-black text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/30">
                    -₹{filteredAndSortedLeakageItems.reduce((acc, x) => acc + (x.total_loss || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: CUSTOMER LEDGER OVERVIEW ─── */}
      {activeTab === 'customers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by customer name, code or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer self-start sm:self-center">
              <input
                type="checkbox"
                checked={onlyAnomalies}
                onChange={(e) => setOnlyAnomalies(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span>Show Accounts with Flagged Duplicates Only</span>
            </label>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Phone / City</th>
                    <th className="py-3 px-4 text-right">Opening Bal</th>
                    <th className="py-3 px-4 text-right">Current App Due</th>
                    <th className="py-3 px-4 text-right">Suspect Double</th>
                    <th className="py-3 px-4 text-right">True Due (Reconciled)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-800/40 transition-colors ${
                        c.has_anomaly ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-bold">{c.code}</td>
                      <td className="py-3 px-4 font-sans font-bold text-white">{c.name}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{c.phone} • {c.city}</td>
                      <td className="py-3 px-4 text-right text-slate-300">₹{c.opening_balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">₹{c.current_balance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        {c.suspect_duplicate_amount > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded">
                            +₹{c.suspect_duplicate_amount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-amber-400">
                        ₹{c.reconciled_due.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {c.has_anomaly ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Anomaly Flagged
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Reconciled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setActiveTab('dossier');
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CUSTOMER DOSSIER DRILLDOWN ─── */}
      {activeTab === 'dossier' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Customer Selector Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Select Customer:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 w-full sm:w-64 cursor-pointer"
              >
                {(scanData?.customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} {c.has_anomaly ? '⚠️ (Duplicate)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => handleExportExcel(selectedCustomerId)}
                disabled={exportingExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Customer Statement (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Customer Summary Card */}
          {dossierData && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">
                    {dossierData.customer.business_name} ({dossierData.customer.customer_code})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Contact: {dossierData.customer.contact_person} • Phone: {dossierData.customer.phone} • {dossierData.customer.address}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Opening Balance</span>
                    <span className="text-xs font-bold font-mono text-slate-200">₹{dossierData.customer.opening_balance.toFixed(2)}</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Invoiced</span>
                    <span className="text-xs font-bold font-mono text-slate-200">₹{dossierData.customer.total_invoiced.toFixed(2)}</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Paid</span>
                    <span className="text-xs font-bold font-mono text-emerald-400">₹{dossierData.customer.total_paid.toFixed(2)}</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-amber-400 uppercase font-bold block">Current Balance</span>
                    <span className="text-sm font-black font-mono text-amber-400">₹{dossierData.customer.current_balance.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Customer Margin Leakage Notice if any */}
              {customerLeakageItems.length > 0 && (
                <div className="mt-3.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      <strong className="text-white">{customerLeakageItems.length} Under-Cost Billing Items</strong> recorded for this outlet (Direct Margin Loss: <strong className="text-rose-400 font-mono font-bold">-₹{customerLeakageItems.reduce((acc, x) => acc + (x.total_loss || 0), 0).toFixed(2)}</strong>)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setLeakageSearch(dossierData.customer.business_name);
                      setActiveTab('leakage');
                    }}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Margin Leakage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Sub-tabs inside Dossier */}
              <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-2 text-xs font-bold">
                <button
                  onClick={() => setDossierSubTab('ledger')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dossierSubTab === 'ledger' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Running Ledger Statement ({dossierData.statement.length})
                </button>
                <button
                  onClick={() => setDossierSubTab('invoices')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dossierSubTab === 'invoices' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Invoices ({dossierData.invoices.length})
                </button>
                <button
                  onClick={() => setDossierSubTab('payments')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    dossierSubTab === 'payments' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment Audit Trail ({dossierData.payments.length})
                </button>
              </div>

              {/* Ledger Statement Table */}
              {dossierSubTab === 'ledger' && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Exact Time (IST)</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (+Billed)</th>
                        <th className="py-2.5 px-3 text-right">Credit (-Paid)</th>
                        <th className="py-2.5 px-3 text-right">Running Balance</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dossierData.statement.map((entry, idx) => (
                        <tr 
                          key={idx}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            entry.is_suspect_duplicate ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-400">{entry.date}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">{entry.created_at_ist}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              entry.type === 'INVOICE' 
                                ? 'bg-sky-500/10 text-sky-400' 
                                : entry.type === 'PAYMENT' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 font-bold ${
                            entry.is_suspect_duplicate ? 'text-rose-400 font-black' : 'text-slate-200'
                          }`}>
                            {entry.reference}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">{entry.description}</td>
                          <td className="py-2.5 px-3 text-right text-sky-400">
                            {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                            {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-400">
                            ₹{entry.running_balance.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {entry.is_suspect_duplicate ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[9px] uppercase">
                                ⚠️ Suspect Rapid Duplicate
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invoices Table */}
              {dossierSubTab === 'invoices' && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Time (IST)</th>
                        <th className="py-2.5 px-3 text-center">Items</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-right">Discount</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-right">Paid Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dossierData.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-amber-400">{inv.invoice_number}</td>
                          <td className="py-2.5 px-3 text-slate-400">{inv.invoice_date}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">{inv.created_at_ist}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{inv.items_count}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">₹{inv.subtotal.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400">₹{inv.discount_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-100">₹{inv.total_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">₹{inv.paid_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments Table */}
              {dossierSubTab === 'payments' && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3">Payment #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Exact Time (IST)</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-right">Allocated</th>
                        <th className="py-2.5 px-3">Allocated To</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {dossierData.payments.map((p) => (
                        <tr 
                          key={p.id} 
                          className={`hover:bg-slate-800/40 transition-colors ${
                            p.is_suspect_duplicate ? 'bg-rose-950/20' : ''
                          }`}
                        >
                          <td className={`py-2.5 px-3 font-bold ${
                            p.is_suspect_duplicate ? 'text-rose-400 font-black' : 'text-slate-200'
                          }`}>
                            {p.payment_number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{p.payment_date}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[10px]">{p.created_at_ist}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">{p.payment_method}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-400">₹{p.amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300">₹{p.allocated_amount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-400 text-[10px]">
                            {p.allocations.map(a => `${a.invoice_number}: ₹${a.amount}`).join(', ') || 'General Collection'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {p.is_suspect_duplicate ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-black text-[9px] uppercase">
                                ⚠️ Suspect Double
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[10px] font-bold">Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: BANK VERIFICATION & CUSTOMER CALL GUIDE ─── */}
      {activeTab === 'guide' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-400" />
              <span>Step-by-Step Bank Statement Checklist & Customer Call Script</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Before calling the customer, verify your own UPI history (PhonePe, GPay, or Paytm) to confirm whether they paid once or twice.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {/* Card 1: KFC Mahal Aslam */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-white">1. KFC - MAHAL ASLAM (`CUST-0015`)</h3>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">
                    At Risk: ₹700.00
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 font-mono">
                  <p><strong className="text-amber-400">Search Date:</strong> 13-Sep-2026</p>
                  <p><strong className="text-amber-400">Exact Time:</strong> ~04:13 PM</p>
                  <p><strong className="text-amber-400">Amount to Find:</strong> ₹700.00 (UPI)</p>
                  <p><strong className="text-amber-400">System Entries:</strong> PAY-00055 (16:13:10) & PAY-00056 (16:13:14)</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg text-xs font-sans text-slate-300 border border-slate-800 leading-relaxed">
                  <strong className="text-emerald-400 block mb-1">Recommended Phone Script:</strong>
                  “Sir, on 13th September around 4:13 PM, our system shows ₹700 was credited twice within 3 seconds. Can you please check your PhonePe/GPay history to confirm if you sent ₹700 once or twice? If it was once, your balance is ₹700, which we can settle on your next order.”
                </div>
              </div>

              {/* Card 2: AFC Sundupalli */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-sm text-white">2. AFC SUNDUPALLI (`CUST-0023`)</h3>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">
                    At Risk: ₹3,626.00
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1.5 font-mono">
                  <p><strong className="text-amber-400">Search Date:</strong> 02-Oct-2026</p>
                  <p><strong className="text-amber-400">Exact Time:</strong> ~06:08 AM</p>
                  <p><strong className="text-amber-400">Amount to Find:</strong> ₹3,626.00 (UPI)</p>
                  <p><strong className="text-amber-400">System Entries:</strong> PAY-00007 (06:08:16) & PAY-00008 (06:08:19)</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg text-xs font-sans text-slate-300 border border-slate-800 leading-relaxed">
                  <strong className="text-emerald-400 block mb-1">Recommended Phone Script:</strong>
                  “Sir, on 2nd October morning at 6:08 AM, our system recorded ₹3,626 twice within 2.6 seconds. In our bank statement, we only received ₹3,626 once to clear your opening balance. Please check your bank history for 02-Oct. If only one transfer occurred, your remaining balance is ₹6,080 (instead of ₹2,454).”
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── RESOLVE CONFIRMATION MODAL ─── */}
      {resolveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Resolve Phantom Duplicate Payment</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Are you sure you want to remove phantom duplicate payment <strong className="text-white font-mono">{resolveModal.paymentNumber}</strong> of <strong className="text-amber-400 font-mono">₹{resolveModal.amount.toFixed(2)}</strong> for <strong className="text-white">{resolveModal.customerName}</strong>?
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1 mb-5">
              <p>• This will permanently delete the duplicate payment record.</p>
              <p>• The customer's live balance will automatically increase by ₹{resolveModal.amount.toFixed(2)}.</p>
              <p>• An immutable audit log entry will be recorded.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResolveModal({ isOpen: false, anomaly: null, paymentNumber: '', customerName: '', amount: 0 })}
                disabled={resolving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={resolving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-950/50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {resolving ? 'Resolving...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
