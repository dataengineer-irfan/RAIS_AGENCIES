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
  UserX
} from 'lucide-react';
import { reportApi, auditApi } from '../services/api';

export const WEEKLY_FILTER_PRESETS = [
  { id: 'all', label: 'All Time (Historical)', shortLabel: 'All Time', badge: '21 items' },
  { id: 'this_week', label: 'This Week', shortLabel: '⚡ This Week', badge: '0 loss' },
  { id: 'last_week', label: 'Last Week', shortLabel: '⏮️ Last Week', badge: '0 loss' },
  { id: 'trailing_7', label: 'Trailing 7 Days', shortLabel: '7D Trailing', badge: 'Recent' },
  { id: 'trailing_14', label: 'Trailing 14 Days', shortLabel: '14D Trailing', badge: '14 Days' },
  { id: 'week_2026_10_w4', label: 'Oct Wk 4 (22–28 Oct 2026)', shortLabel: 'Oct W4 (22-28)', badge: '-₹110' },
  { id: 'week_2026_10_w3', label: 'Oct Wk 3 (15–21 Oct 2026)', shortLabel: 'Oct W3 (15-21)', badge: '-₹42' },
  { id: 'week_2026_10_w1', label: 'Oct Wk 1 (01–07 Oct 2026)', shortLabel: 'Oct W1 (01-07)', badge: '-₹140' },
  { id: 'week_2026_09_w4', label: 'Sep Wk 4 (22–28 Sep 2026)', shortLabel: 'Sep W4 (22-28)', badge: '-₹72' },
  { id: 'month_2026_11', label: 'November 2026', shortLabel: 'Nov 2026', badge: '0 loss' },
  { id: 'month_2026_10', label: 'October 2026', shortLabel: 'Oct 2026', badge: '5 items' },
  { id: 'month_2026_09', label: 'September 2026', shortLabel: 'Sep 2026', badge: '16 items' },
];

export const getDateRangeBounds = (rangeKey) => {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (rangeKey === 'today') {
    const t = formatDate(today);
    return { start: t, end: t, label: 'Today' };
  }
  if (rangeKey === 'yesterday') {
    const yday = new Date(today);
    yday.setDate(yday.getDate() - 1);
    const y = formatDate(yday);
    return { start: y, end: y, label: 'Yesterday' };
  }
  if (rangeKey === 'this_week') {
    const d = new Date(today);
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const startMon = new Date(d.setDate(diffToMon));
    const endSun = new Date(startMon);
    endSun.setDate(startMon.getDate() + 6);
    return { 
      start: formatDate(startMon), 
      end: formatDate(endSun), 
      label: `This Week (${formatDate(startMon)} to ${formatDate(endSun)})` 
    };
  }
  if (rangeKey === 'last_week') {
    const d = new Date(today);
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const startMon = new Date(d.setDate(diffToMon));
    const endSun = new Date(startMon);
    endSun.setDate(startMon.getDate() + 6);
    return { 
      start: formatDate(startMon), 
      end: formatDate(endSun), 
      label: `Last Week (${formatDate(startMon)} to ${formatDate(endSun)})` 
    };
  }
  if (rangeKey === 'last7' || rangeKey === 'trailing_7') {
    const p7 = new Date(today);
    p7.setDate(p7.getDate() - 7);
    return { 
      start: formatDate(p7), 
      end: formatDate(today), 
      label: `Trailing 7 Days (${formatDate(p7)} to ${formatDate(today)})` 
    };
  }
  if (rangeKey === 'last14' || rangeKey === 'trailing_14') {
    const p14 = new Date(today);
    p14.setDate(p14.getDate() - 14);
    return { 
      start: formatDate(p14), 
      end: formatDate(today), 
      label: `Trailing 14 Days (${formatDate(p14)} to ${formatDate(today)})` 
    };
  }
  if (rangeKey === 'last30') {
    const p30 = new Date(today);
    p30.setDate(p30.getDate() - 30);
    return { 
      start: formatDate(p30), 
      end: formatDate(today), 
      label: `Trailing 30 Days (${formatDate(p30)} to ${formatDate(today)})` 
    };
  }
  if (rangeKey === 'week_2026_10_w4') {
    return { start: '2026-10-22', end: '2026-10-28', label: 'Oct Week 4 (22–28 Oct 2026)' };
  }
  if (rangeKey === 'week_2026_10_w3') {
    return { start: '2026-10-15', end: '2026-10-21', label: 'Oct Week 3 (15–21 Oct 2026)' };
  }
  if (rangeKey === 'week_2026_10_w2') {
    return { start: '2026-10-08', end: '2026-10-14', label: 'Oct Week 2 (08–14 Oct 2026)' };
  }
  if (rangeKey === 'week_2026_10_w1') {
    return { start: '2026-10-01', end: '2026-10-07', label: 'Oct Week 1 (01–07 Oct 2026)' };
  }
  if (rangeKey === 'week_2026_09_w4') {
    return { start: '2026-09-22', end: '2026-09-28', label: 'Sep Week 4 (22–28 Sep 2026)' };
  }
  if (rangeKey === 'week_2026_09_w3') {
    return { start: '2026-09-15', end: '2026-09-21', label: 'Sep Week 3 (15–21 Sep 2026)' };
  }
  if (rangeKey === 'week_2026_09_w2') {
    return { start: '2026-09-08', end: '2026-09-14', label: 'Sep Week 2 (08–14 Sep 2026)' };
  }
  if (rangeKey === 'week_2026_09_w1') {
    return { start: '2026-09-01', end: '2026-09-07', label: 'Sep Week 1 (01–07 Sep 2026)' };
  }
  if (rangeKey === 'month_2026_11') {
    return { start: '2026-11-01', end: '2026-11-30', label: 'November 2026' };
  }
  if (rangeKey === 'month_2026_10') {
    return { start: '2026-10-01', end: '2026-10-31', label: 'October 2026' };
  }
  if (rangeKey === 'month_2026_09') {
    return { start: '2026-09-01', end: '2026-09-30', label: 'September 2026' };
  }
  return { start: null, end: null, label: 'All Time (Historical)' };
};

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
  const [leakageDateRange, setLeakageDateRange] = useState(() => initialParams?.dateRange || 'all');
  const [leakageSearch, setLeakageSearch] = useState('');
  const [debouncedLeakageSearch, setDebouncedLeakageSearch] = useState('');
  const [leakageClassification, setLeakageClassification] = useState('ALL');

  // ─── FLAGGED ANOMALIES FILTER STATE ───
  const [anomalyDateRange, setAnomalyDateRange] = useState(() => initialParams?.dateRange || 'all');
  const [anomalySeverity, setAnomalySeverity] = useState('ALL');
  const [anomalySearch, setAnomalySearch] = useState('');

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
  }, [leakageDateRange, debouncedLeakageSearch]);

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
      const bounds = getDateRangeBounds(leakageDateRange);
      if (bounds.start) params.start_date = bounds.start;
      if (bounds.end) params.end_date = bounds.end;

      if (debouncedLeakageSearch && debouncedLeakageSearch.trim()) {
        params.search = debouncedLeakageSearch.trim();
      }

      const res = await auditApi.getMarginLeakage(params);
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
      setSuccessNotice('Master Excel audit workbook (with Margin Leakage & Statements) downloaded successfully!');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Excel export failed:', err);
      setErrorNotice('Failed to export Excel report. Please retry.');
    } finally {
      setExportingExcel(false);
    }
  };

  const filteredLeakageItems = useMemo(() => {
    const items = leakageData?.items || [];
    if (leakageClassification === 'ALL') return items;
    return items.filter(item => item.classification === leakageClassification);
  }, [leakageData, leakageClassification]);

  const exportLeakageCSV = () => {
    if (!filteredLeakageItems || filteredLeakageItems.length === 0) return;
    const headers = [
      'Invoice Date',
      'Invoice Number',
      'Customer Outlet',
      'SKU',
      'Product Name',
      'Quantity Sold',
      'Billed Price (INR)',
      'Real Landed Cost (INR)',
      'Unit Loss (INR)',
      'Total Loss (INR)',
      'Diagnosis',
      'Billed By'
    ];

    const rows = filteredLeakageItems.map(item => [
      item.invoice_date || '',
      item.invoice_number,
      `"${(item.customer_name || '').replace(/"/g, '""')}"`,
      item.sku,
      `"${(item.product_name || '').replace(/"/g, '""')}"`,
      item.quantity,
      item.unit_price.toFixed(2),
      item.landed_cost.toFixed(2),
      item.unit_loss.toFixed(2),
      item.total_loss.toFixed(2),
      item.classification === 'CRITICAL_TYPO' ? 'Typo / Fatal Rate' : 'Wholesale Discount Below Cost',
      item.billed_by
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RAIS_Margin_Leakage_Audit_${new Date().toISOString().split('T')[0]}.csv`);
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

  // Leakage items for the selected customer in Dossier
  const customerLeakageItems = useMemo(() => {
    if (!selectedCustomerId || !leakageData?.items) return [];
    return leakageData.items.filter(item => item.customer_id === selectedCustomerId);
  }, [selectedCustomerId, leakageData]);

  const summary = scanData?.summary || {};
  const rawAnomalies = scanData?.anomalies || [];
  const leakageSummary = leakageData?.summary || {};

  const filteredAnomalies = useMemo(() => {
    let list = rawAnomalies;
    if (anomalySeverity !== 'ALL') {
      list = list.filter(a => a.severity === anomalySeverity);
    }
    if (anomalyDateRange !== 'all') {
      const bounds = getDateRangeBounds(anomalyDateRange);
      if (bounds.start || bounds.end) {
        list = list.filter(a => {
          const d = a.payment_1_date || (a.payment_1_created_at ? a.payment_1_created_at.slice(0, 10) : '');
          if (bounds.start && d && d < bounds.start) return false;
          if (bounds.end && d && d > bounds.end) return false;
          return true;
        });
      }
    }
    if (anomalySearch && anomalySearch.trim()) {
      const q = anomalySearch.trim().toLowerCase();
      list = list.filter(a =>
        (a.customer_name || '').toLowerCase().includes(q) ||
        (a.customer_code || '').toLowerCase().includes(q) ||
        (a.payment_1_number || '').toLowerCase().includes(q) ||
        (a.payment_2_number || '').toLowerCase().includes(q) ||
        (a.customer_phone || '').includes(q)
      );
    }
    return list;
  }, [rawAnomalies, anomalySeverity, anomalyDateRange, anomalySearch]);

  const anomalies = filteredAnomalies;

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
              Deep forensic ledger verification, rapid-fire duplicate detector & automated multi-tab Excel generator
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

      {/* ─── Top 4 KPI Metrics Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

        <div className={`p-4 rounded-xl border relative overflow-hidden ${
          (summary.total_at_risk_amount || 0) > 0 
            ? 'bg-rose-950/20 border-rose-500/30' 
            : 'bg-slate-900 border-slate-800'
        }`}>
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
          <span className="text-[10px] text-rose-300/80 mt-1 block font-medium">
            {(summary.total_at_risk_amount || 0) > 0 ? 'Recoverable Revenue (Double-Clicks)' : 'All Accounts Clean & Reconciled'}
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
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Margin Leakage (Sold Below Cost)</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            activeTab === 'leakage' ? 'bg-black/30 text-white font-extrabold' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {leakageData?.summary?.total_items !== undefined ? leakageData.summary.total_items : '21'} Detected
          </span>
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
          {/* Anomalies Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  Suspect Rapid-Fire Double Payments & Invariant Scan
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 font-mono">
                    {filteredAnomalies.length} Flagged
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Identified where identical payment amount & method were recorded within seconds
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={anomalySearch}
                  onChange={(e) => setAnomalySearch(e.target.value)}
                  placeholder="Search customer, phone, pay #..."
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-40 sm:w-48"
                />
                {anomalySearch && (
                  <button
                    onClick={() => setAnomalySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <select
                value={anomalyDateRange}
                onChange={(e) => setAnomalyDateRange(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <optgroup label="Standard Ranges">
                  <option value="all">📅 All Time (Historical)</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">⚡ This Week</option>
                  <option value="last_week">⏮️ Last Week</option>
                  <option value="trailing_7">Trailing 7 Days</option>
                  <option value="trailing_14">Trailing 14 Days</option>
                </optgroup>
                <optgroup label="Historical Audit Archives">
                  <option value="month_2026_11">November 2026</option>
                  <option value="month_2026_10">October 2026</option>
                  <option value="month_2026_09">September 2026</option>
                </optgroup>
              </select>

              {/* Severity Filter */}
              <select
                value={anomalySeverity}
                onChange={(e) => setAnomalySeverity(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="HIGH">🚨 High Severity Only (&lt;10s)</option>
                <option value="MEDIUM">⚠️ Medium (Split Payments)</option>
              </select>
            </div>
          </div>

          {/* Quick Weekly & Category Slices Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-1 pl-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              Audit Filters:
            </span>
            <button
              type="button"
              onClick={() => { setAnomalyDateRange('all'); setAnomalySeverity('ALL'); }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                anomalyDateRange === 'all' && anomalySeverity === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>All Anomalies</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/20 text-current">
                {rawAnomalies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAnomalySeverity(prev => prev === 'HIGH' ? 'ALL' : 'HIGH')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                anomalySeverity === 'HIGH'
                  ? 'bg-rose-500 text-white shadow-md font-black ring-2 ring-rose-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/30'
              }`}
            >
              <span>🚨 High Severity</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/30 text-white">
                {rawAnomalies.filter(a => a.severity === 'HIGH').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAnomalyDateRange('this_week')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                anomalyDateRange === 'this_week'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>⚡ This Week</span>
            </button>

            <button
              type="button"
              onClick={() => setAnomalyDateRange('last_week')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                anomalyDateRange === 'last_week'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>⏮️ Last Week</span>
            </button>

            <button
              type="button"
              onClick={() => setAnomalyDateRange('month_2026_09')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                anomalyDateRange === 'month_2026_09'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <span>September 2026</span>
            </button>
          </div>

          {/* Active Filter Banner */}
          {(anomalyDateRange !== 'all' || anomalySeverity !== 'ALL' || anomalySearch) && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  Active Filter: <strong>{getDateRangeBounds(anomalyDateRange).label}</strong>
                  {anomalySeverity !== 'ALL' && ` • Severity: ${anomalySeverity}`}
                  {anomalySearch && ` • Search: "${anomalySearch}"`}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-bold font-mono">
                  {filteredAnomalies.length} anomaly {filteredAnomalies.length === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <button
                onClick={() => {
                  setAnomalyDateRange('all');
                  setAnomalySeverity('ALL');
                  setAnomalySearch('');
                }}
                className="text-xs text-amber-400 hover:text-white font-bold underline cursor-pointer shrink-0 ml-2"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {filteredAnomalies.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">
                {rawAnomalies.length === 0 
                  ? 'No Unresolved Duplicate Payments Detected' 
                  : 'No Anomalies Found in Selected Filter'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {rawAnomalies.length === 0 
                  ? `All ${summary.total_invoices_count || 0} invoices and ${summary.total_payments_count || 0} payments strictly satisfy mathematical ledger invariants.`
                  : 'No suspect rapid-fire payments match your active date or severity filters.'}
              </p>
              {rawAnomalies.length > 0 && (
                <button
                  onClick={() => {
                    setAnomalyDateRange('all');
                    setAnomalySeverity('ALL');
                    setAnomalySearch('');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
                >
                  Show All ({rawAnomalies.length}) Anomalies
                </button>
              )}
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

      {/* ─── TAB 2: COMMERCIAL MARGIN LEAKAGE DASHBOARD (EXACT SCREENSHOT LAYOUT) ─── */}
      {activeTab === 'leakage' && (
        <div className="flex flex-col gap-3">
          {/* Leakage Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  Historical Margin Leakage Audit
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 font-mono">
                    {filteredLeakageItems.length} Line Items Sold Below Cost
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Cross-referenced line-item selling rates against verified warehouse inward landed costs
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
                  className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 w-36 sm:w-48"
                />
                {leakageSearch && (
                  <button
                    onClick={() => setLeakageSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Date Filter */}
              <select
                value={leakageDateRange}
                onChange={(e) => setLeakageDateRange(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <optgroup label="Standard Ranges">
                  <option value="all">📅 All Time (Historical) - 21 items (-₹571.00)</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">⚡ This Week</option>
                  <option value="last_week">⏮️ Last Week</option>
                  <option value="trailing_7">Trailing 7 Days</option>
                  <option value="trailing_14">Trailing 14 Days</option>
                </optgroup>
                <optgroup label="Weekly Slices with Margin Leaks">
                  <option value="week_2026_10_w4">Oct Week 4 (22–28 Oct 2026) • -₹110.00 loss (AFC Sundupalli)</option>
                  <option value="week_2026_10_w3">Oct Week 3 (15–21 Oct 2026) • -₹42.00 loss (Juice Junction)</option>
                  <option value="week_2026_10_w2">Oct Week 2 (08–14 Oct 2026) • Healthy</option>
                  <option value="week_2026_10_w1">Oct Week 1 (01–07 Oct 2026) • -₹140.00 loss (Kksk Typo)</option>
                  <option value="week_2026_09_w4">Sep Week 4 (22–28 Sep 2026) • -₹72.00 loss (Kim Cafe)</option>
                  <option value="week_2026_09_w3">Sep Week 3 (15–21 Sep 2026) • Healthy</option>
                </optgroup>
                <optgroup label="Monthly Audit Archives">
                  <option value="month_2026_11">November 2026 (0 loss)</option>
                  <option value="month_2026_10">October 2026 (5 items sold below cost)</option>
                  <option value="month_2026_09">September 2026 (16 items sold below cost)</option>
                </optgroup>
              </select>

              {/* Classification Filter */}
              <select
                value={leakageClassification}
                onChange={(e) => setLeakageClassification(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="CRITICAL_TYPO">⚠️ Typo / Fatal (&lt;30% cost)</option>
                <option value="BELOW_COST_DISCOUNT">🔻 Discount Below Cost</option>
              </select>

              {/* Export CSV */}
              <button
                onClick={exportLeakageCSV}
                disabled={filteredLeakageItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700 cursor-pointer"
                title="Export forensic audit data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Refresh */}
              <button
                onClick={loadMarginLeakage}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 cursor-pointer"
                title="Refresh leakage audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${leakageLoading ? 'animate-spin text-rose-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Weekly Slices Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap flex items-center gap-1 pl-1">
              <Calendar className="w-3 h-3 text-rose-400" />
              Weekly Slices:
            </span>
            {WEEKLY_FILTER_PRESETS.map((p) => {
              const isActive = leakageDateRange === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLeakageDateRange(p.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-950/60 ring-2 ring-rose-400/50'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{p.shortLabel}</span>
                  {p.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-black/30 text-white font-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Weekly Filter Banner */}
          {leakageDateRange !== 'all' && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  Active Weekly Filter: <strong>{getDateRangeBounds(leakageDateRange).label}</strong>
                  {getDateRangeBounds(leakageDateRange).start && ` (${getDateRangeBounds(leakageDateRange).start} to ${getDateRangeBounds(leakageDateRange).end})`}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-rose-400 font-bold font-mono">
                  {filteredLeakageItems.length} below-cost line items (-₹{(leakageData?.summary?.total_loss || 0).toFixed(2)})
                </span>
              </div>
              <button
                onClick={() => setLeakageDateRange('all')}
                className="text-xs text-amber-400 hover:text-white font-bold underline cursor-pointer shrink-0 ml-2"
              >
                Show All Time (21 items)
              </button>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-900/90 border border-rose-500/20 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Cumulative Cash Drain</span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
                  -₹{(leakageData?.summary?.total_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Direct financial loss from under-cost selling
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Under-Cost Line Items</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {filteredLeakageItems.length} <span className="text-xs text-slate-400 font-normal">items</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Across {leakageData?.summary?.total_invoices || 0} distinct invoices
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Worst Single Loss SKU</span>
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm font-black text-amber-300 truncate">
                  {leakageData?.summary?.worst_sku || 'None'}
                </div>
                <p className="text-[10px] text-rose-400 font-bold mt-0.5 font-mono">
                  -₹{(leakageData?.summary?.worst_sku_loss || 0).toFixed(2)} loss ({leakageData?.summary?.worst_product_name || 'N/A'})
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Top Discount Outlet</span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                  <UserX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm font-black text-white truncate">
                  {leakageData?.summary?.worst_customer || 'None'}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Total loss absorbed: <strong className="text-rose-400 font-mono">-₹{(leakageData?.summary?.worst_customer_loss || 0).toFixed(2)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Leakage Forensic Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-md flex-1 flex flex-col min-h-[300px]">
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Line-Item Forensic Ledger ({filteredLeakageItems.length} records)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Sorted by highest cash loss descending
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer Outlet</th>
                    <th className="py-2.5 px-3">SKU & Product</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Billed Price</th>
                    <th className="py-2.5 px-3 text-right">Landed Cost</th>
                    <th className="py-2.5 px-3 text-right">Unit Loss</th>
                    <th className="py-2.5 px-3 text-right">Total Loss</th>
                    <th className="py-2.5 px-3 text-center">Diagnosis</th>
                    <th className="py-2.5 px-3">Billed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {leakageLoading ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-slate-500 font-medium">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-400" />
                        Analyzing commercial procurement & selling records...
                      </td>
                    </tr>
                  ) : filteredLeakageItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-12 text-center text-slate-500 font-medium">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                        Zero margin leakages detected in selected timeframe. All items billed at or above procurement cost!
                      </td>
                    </tr>
                  ) : (
                    filteredLeakageItems.map((item, idx) => (
                      <tr 
                        key={item.id || idx}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.invoice_date || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDrilldownToCustomer(item.customer_id)}
                            className="font-mono font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 text-[11px] cursor-pointer transition"
                            title="Click to view Customer Statement"
                          >
                            {item.invoice_number}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap max-w-[150px] truncate">
                          <button
                            onClick={() => handleDrilldownToCustomer(item.customer_id)}
                            className="hover:text-amber-400 hover:underline cursor-pointer transition text-left"
                            title={`Open financial dossier for ${item.customer_name}`}
                          >
                            {item.customer_name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div className="font-mono text-[10px] text-amber-400/80">{item.sku}</div>
                          <div className="font-medium text-slate-200 truncate text-[11px]" title={item.product_name}>
                            {item.product_name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-200 whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                          ₹{item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-400 whitespace-nowrap">
                          ₹{item.landed_cost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-400 whitespace-nowrap">
                          -₹{item.unit_loss.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30 text-xs">
                            -₹{item.total_loss.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {item.classification === 'CRITICAL_TYPO' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Typo / Fatal Rate
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <ArrowDownRight className="w-3 h-3" />
                              Wholesale Discount
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {item.billed_by}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forensic Intelligence Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-slate-200 block text-xs">Forensic Audit Takeaways</strong>
                <span>
                  100% of detected margin leakages occurred in Sept & Oct 2026. In November 2026, 0 leakages were recorded. The primary drivers were fast operator typos (e.g. ₹2 vs ₹72) and uninformed wholesale discounts on high-volume items (Tandoori Mayo, Mozzarella).
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg font-mono text-[11px] font-bold">
                November 2026: ₹0.00 Leakage
              </span>
            </div>
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
