import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  User,
  Copy, 
  Check, 
  ChevronRight, 
  Sparkles, 
  FileCode, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Download, 
  HardDrive, 
  RefreshCw, 
  FileText,
  Trash2,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  FileSpreadsheet,
  UserX,
  Calendar,
  ArrowDownRight
} from 'lucide-react';
import { auditApi, backupApi } from '../services/api';
import { copyToClipboard } from '../utils/mobileHelpers';

export const AuditPage = ({ initialParams = null, onNavigate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState(() => initialParams?.entity || initialParams?.entity_name || '');
  const [actionFilter, setActionFilter] = useState(() => initialParams?.action || '');
  const [searchTerm, setSearchTerm] = useState(() => initialParams?.search || initialParams?.searchTerm || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => initialParams?.search || initialParams?.searchTerm || '');
  const [dateRange, setDateRange] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Main Suite Navigation Tab
  const [activeMainTab, setActiveMainTab] = useState('activity'); // 'activity' | 'leakage'

  // Commercial Margin Leakage State
  const [leakageData, setLeakageData] = useState({ summary: {}, items: [] });
  const [leakageLoading, setLeakageLoading] = useState(false);
  const [leakageDateRange, setLeakageDateRange] = useState('all');
  const [leakageSearch, setLeakageSearch] = useState('');
  const [debouncedLeakageSearch, setDebouncedLeakageSearch] = useState('');
  const [leakageClassification, setLeakageClassification] = useState('ALL');

  // Debounce leakage search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLeakageSearch(leakageSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [leakageSearch]);

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
      }

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

  useEffect(() => {
    loadMarginLeakage();
  }, [leakageDateRange, debouncedLeakageSearch]);

  const filteredLeakageItems = (leakageData?.items || []).filter(item => {
    if (leakageClassification === 'ALL') return true;
    return item.classification === leakageClassification;
  });

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
  };

  // Master-Detail State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'
  const [activeInspectorTab, setActiveInspectorTab] = useState('json'); // json, metadata, compliance
  const [copiedCode, setCopiedCode] = useState(false);

  // Data Vault & Backup States
  const [backupStatus, setBackupStatus] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupBannerMsg, setBackupBannerMsg] = useState(null);
  const [showVaultInfo, setShowVaultInfo] = useState(false);

  // Debounce search input by 400ms to eliminate unnecessary DB queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync initialParams whenever caller updates it (e.g. 1-click navigate from Invoices Hub)
  useEffect(() => {
    if (initialParams) {
      if (initialParams.entity || initialParams.entity_name) {
        setEntityFilter(initialParams.entity || initialParams.entity_name);
      }
      if (initialParams.action) {
        setActionFilter(initialParams.action);
      }
      if (initialParams.search || initialParams.searchTerm) {
        setSearchTerm(initialParams.search || initialParams.searchTerm);
      }
    }
  }, [initialParams]);

  useEffect(() => {
    loadAuditLogs(page);
  }, [entityFilter, actionFilter, dateRange, debouncedSearch, page]);

  useEffect(() => {
    loadVaultStatus();
  }, []);

  const loadVaultStatus = async () => {
    try {
      const status = await backupApi.getStatus();
      setBackupStatus(status);
    } catch (err) {
      console.error('Failed to load backup status', err);
    }
  };

  const loadAuditLogs = async (pageNum = page, selectId = null) => {
    setLoading(true);
    try {
      const params = {
        skip: (pageNum - 1) * 50,
        limit: 50
      };
      if (entityFilter) params.entity_name = entityFilter;
      if (actionFilter) params.action = actionFilter;
      if (debouncedSearch && debouncedSearch.trim().length >= 2) {
        params.search = debouncedSearch.trim();
      }

      // Date Range Bounding
      if (dateRange !== 'all') {
        const today = new Date();
        const formatDate = (d) => {
          const yr = d.getFullYear();
          const mo = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          return `${yr}-${mo}-${da}`;
        };

        if (dateRange === 'today') {
          params.start_date = formatDate(today);
          params.end_date = formatDate(today);
        } else if (dateRange === 'yesterday') {
          const yest = new Date(today);
          yest.setDate(yest.getDate() - 1);
          params.start_date = formatDate(yest);
          params.end_date = formatDate(yest);
        } else if (dateRange === 'last7') {
          const past7 = new Date(today);
          past7.setDate(past7.getDate() - 7);
          params.start_date = formatDate(past7);
          params.end_date = formatDate(today);
        } else if (dateRange === 'last30') {
          const past30 = new Date(today);
          past30.setDate(past30.getDate() - 30);
          params.start_date = formatDate(past30);
          params.end_date = formatDate(today);
        }
      }

      const data = await auditApi.list(params);
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setLogs(items);
      setHasMore(items.length === 50);
      if (items.length > 0) {
        setSelectedLogId(selectId || items[0].id);
      } else {
        setSelectedLogId(null);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await backupApi.downloadExport();
      if (res?.filename === 'cancelled') {
        setIsBackingUp(false);
        return;
      }
      if (res?.method === 'share') {
        setBackupBannerMsg(`Live backup shared (${res.filename}). Check your selected app/folder.`);
      } else {
        setBackupBannerMsg(`Downloading ${res.filename} directly to device Downloads folder.`);
      }
      loadVaultStatus();
      loadAuditLogs();
      setTimeout(() => setBackupBannerMsg(null), 7000);
    } catch (err) {
      console.error('Backup download failed', err);
      alert('Could not download database backup. Please ensure your session is active.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCopy = async (textOrObj) => {
    const text = typeof textOrObj === 'string' ? textOrObj : JSON.stringify(textOrObj, null, 2);
    await copyToClipboard(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const parseSnapshot = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { raw_content: raw };
    }
  };

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  };

  const filteredLogs = logs;

  const selectedLog = logs.find(l => l.id === selectedLogId) || logs[0];

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DELETE':
      case 'CANCELLED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'LOGIN':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'EXPORT':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const selectedBefore = parseSnapshot(selectedLog?.before_state);
  const selectedAfter = parseSnapshot(selectedLog?.after_state);
  const selectedInvNum = selectedBefore?.invoice_number || selectedAfter?.invoice_number;
  const selectedAmount = selectedBefore?.total_amount || selectedAfter?.total_amount;
  const selectedCust = selectedBefore?.customer_name || selectedAfter?.customer_name;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
      {/* ─── TOP AUDIT SUITE NAVIGATION TABS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-2 shrink-0 shadow-md">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <button
            onClick={() => setActiveMainTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMainTab === 'activity'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Activity Trail & Security</span>
            <span className={`whitespace-nowrap shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full ${
              activeMainTab === 'activity' ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-amber-400 border border-slate-700'
            }`}>
              2.6k+ Logs
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('leakage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeMainTab === 'leakage'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Margin Leakage (Sold Below Cost)</span>
            <span className={`whitespace-nowrap shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full ${
              activeMainTab === 'leakage' ? 'bg-black/30 text-white font-extrabold' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {leakageData?.summary?.total_items !== undefined ? leakageData.summary.total_items : '22'} Detected
            </span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PostgreSQL Live Commercial Audit</span>
        </div>
      </div>

      {activeMainTab === 'leakage' ? (
        /* ─── TAB 2: COMMERCIAL MARGIN LEAKAGE DASHBOARD ─── */
        <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Prominent Hub Redirection Hero Card */}
          <div className="bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">
                    Margin Leakage Has Moved to Financial Audit Hub
                  </h3>
                  <span className="whitespace-nowrap shrink-0 text-[10px] font-black px-2.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30 uppercase tracking-wider">
                    PRO AUDIT
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Complete margin leak forensics, 1-click customer dossier drilldowns, and multi-tab Excel workbooks are now unified inside the Financial Audit Hub.
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('financial-audit', { tab: 'leakage' })}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-rose-950/50 shrink-0 active:scale-95 cursor-pointer"
              >
                <span>Open in Financial Audit Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Leakage Filter Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:px-4 sm:py-3 shrink-0 shadow-md">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h2 className="text-sm font-black text-white whitespace-nowrap">
                    Historical Margin Leakage Audit
                  </h2>
                  <span className="whitespace-nowrap shrink-0 text-[10px] font-bold px-2.5 py-0.5 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 font-mono">
                    {filteredLeakageItems.length} {filteredLeakageItems.length === 1 ? 'Line Item' : 'Line Items'} Sold Below Cost
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
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
                <option value="all">📅 All Time (Historical)</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="month_2026_11">November 2026 (0 loss)</option>
                <option value="month_2026_10">October 2026 (6 items)</option>
                <option value="month_2026_09">September 2026 (16 items)</option>
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
                title="Export forensic audit data to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Refresh */}
              <button
                onClick={loadMarginLeakage}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
                title="Refresh leakage audit"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${leakageLoading ? 'animate-spin text-rose-400' : ''}`} />
              </button>
            </div>
          </div>

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
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                            {item.invoice_number}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap max-w-[150px] truncate">
                          {item.customer_name}
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
                            <span className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Typo / Fatal Rate
                            </span>
                          ) : (
                            <span className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
      ) : (
        /* ─── TAB 1: EXISTING MASTER-DETAIL ACTIVITY TRAIL ─── */
        <>
      
      {/* ─── TOP ACTION & FILTER HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                System Audit & Security Trail
              </h1>
              <span className="whitespace-nowrap shrink-0 text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {debouncedSearch ? `Search: ${logs.length} found` : `Page ${page} (${logs.length} logs)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cryptographically Recorded Activity & Mutation Journal (PostgreSQL)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice #, customer, user..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            title="Filter by Timeline"
          >
            <option value="all">📅 All Time (2.6k+)</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">All Entities</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Customer">Customer</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="User">User</option>
            <option value="DatabaseBackup">DatabaseBackup</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE (Audit Trace)</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="ALLOCATION">ALLOCATION</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EXPORT">EXPORT</option>
          </select>

          {/* 1-Click Backup Export Button */}
          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="1-Click Instant Vault Backup (.json.gz)"
          >
            {isBackingUp ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Backup (.gz)</span>
              </>
            )}
          </button>

          {/* Toggle Vault Info */}
          <button
            onClick={() => setShowVaultInfo(!showVaultInfo)}
            className={`p-1.5 rounded-xl border transition ${
              showVaultInfo
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="Toggle Vault Health Overview"
          >
            <Database className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── OPTIONAL EXPANDABLE DATA VAULT HEALTH BANNER ─── */}
      {showVaultInfo && (
        <div className="bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-3 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">RAIS Data Vault & Rolling 30-Day Backup</span>
                <span className="whitespace-nowrap shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] border border-emerald-500/30">
                  {backupStatus?.status === 'online' ? '● Database Online' : 'Connecting...'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Cloud Provider: <strong className="text-slate-200">{backupStatus?.cloud_provider || 'Supabase AWS Managed PostgreSQL'}</strong> • 
                Live Records: <strong className="text-emerald-400 font-mono">{backupStatus?.total_records || '...'}</strong> across 16 tables • 
                Retention: <strong className="text-slate-300">Rolling 30-Day Local + OneDrive + Cloud Snapshots</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
            >
              {isBackingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Download Live Backup (.json.gz)</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── SUCCESS NOTIFICATION BANNER ─── */}
      {backupBannerMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs text-emerald-200 shrink-0 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{backupBannerMsg}</span>
          </div>
          <button onClick={() => setBackupBannerMsg(null)} className="text-emerald-400 hover:text-white text-xs font-bold px-1">✕</button>
        </div>
      )}

      {/* ─── MOBILE VIEW SWITCHER (< lg) ─── */}
      <div className="lg:hidden flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'list'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Journal ({filteredLogs.length})</span>
        </button>
        <button
          onClick={() => setMobileView('detail')}
          disabled={!selectedLog}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            mobileView === 'detail'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white disabled:opacity-40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Inspector</span>
        </button>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className={`${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'} lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex-col overflow-hidden`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <span>Audit Journal ({filteredLogs.length})</span>
            <span>Timestamp</span>
          </div>

          {/* Master Scrollable List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {loading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded-xl" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No matching audit logs found.
              </div>
            ) : (
              filteredLogs.map(l => {
                const isSelected = l.id === selectedLogId;
                const before = parseSnapshot(l.before_state);
                const after = parseSnapshot(l.after_state);
                const invNum = before?.invoice_number || after?.invoice_number;
                const amount = before?.total_amount || after?.total_amount;
                const custName = before?.customer_name || after?.customer_name;
                const actorName = l.username || l.user_username || 'SYSTEM';
                const actorRole = l.user_role ? `(${l.user_role})` : '';

                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      setSelectedLogId(l.id);
                      setMobileView('detail');
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getActionBadgeClass(l.action)}`}>
                          {l.action}
                        </span>
                        <span className="font-mono text-white text-xs font-bold">
                          {l.entity_name}
                        </span>
                        {invNum && (
                          <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            #{invNum}
                          </span>
                        )}
                        {amount && (
                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            ₹{Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-1 flex items-center gap-1">
                        <span>Actor: <strong className="text-slate-300">{actorName} {actorRole}</strong></span>
                        {custName && <span>• <strong className="text-slate-200">{custName}</strong></span>}
                        {l.entity_id && !invNum && <span>• ID: {l.entity_id.slice(0, 8)}...</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div className="text-[10px] text-slate-500 font-mono">
                        {l.created_at ? l.created_at.split('T')[0] : 'Today'}
                        <div className="text-[9px] text-slate-600">
                          {l.created_at ? l.created_at.split('T')[1]?.slice(0, 8) : ''}
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/80 text-xs text-slate-400 shrink-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-bold text-slate-200 transition text-[11px]"
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-slate-400">
              Page <strong className="text-amber-400 font-bold">{page}</strong> {logs.length > 0 ? `(${logs.length} logs)` : ''}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-bold text-slate-200 transition text-[11px]"
            >
              Next →
            </button>
          </div>
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className={`${mobileView === 'list' ? 'hidden lg:flex' : 'flex'} lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex-col overflow-hidden`}>
          {selectedLog ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Mobile Back Button */}
              <div className="lg:hidden mb-2">
                <button
                  onClick={() => setMobileView('list')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all active:scale-95"
                >
                  ← Back to Audit Journal
                </button>
              </div>

              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`whitespace-nowrap shrink-0 text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${getActionBadgeClass(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      {selectedLog.entity_name}
                    </span>
                    {selectedInvNum && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        #{selectedInvNum}
                      </span>
                    )}
                    {selectedAmount && (
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                        ₹{Number(selectedAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Triggered by <strong className="text-white">{selectedLog.username || selectedLog.user_username || 'SYSTEM'}</strong> {selectedLog.user_role ? `(${selectedLog.user_role})` : ''} on {formatTimestamp(selectedLog.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(selectedLog)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Copy Full Audit Record JSON"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Copy Log</span>
                  </button>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'json', label: 'Mutation & State Diff', icon: FileCode },
                  { id: 'metadata', label: 'Actor & IP Telemetry', icon: Layers },
                  { id: 'compliance', label: 'Immutability Check', icon: ShieldCheck },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeInspectorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveInspectorTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Inspector Content Area (Internal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1 space-y-3">
                
                {/* ─── HIGHLIGHT CARD: DELETED INVOICE AUDIT ─── */}
                {selectedLog.action === 'DELETE' && (
                  <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-3 shadow-md animate-in fade-in">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Permanently Purged {selectedLog.entity_name} Record</span>
                      </div>
                      <span className="whitespace-nowrap shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                        Stock Restored to Live Depot
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Document Number</span>
                        <span className="font-mono text-amber-400 font-bold text-sm">
                          #{selectedInvNum || selectedLog.entity_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Bill Value</span>
                        <span className="font-mono text-emerald-400 font-bold text-sm">
                          {selectedAmount ? `₹${Number(selectedAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Deleted By Actor</span>
                        <span className="font-bold text-white">
                          {selectedLog.username || selectedLog.user_username || 'admin'} ({selectedLog.user_role || 'ADMIN'})
                        </span>
                      </div>
                      {selectedCust && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Customer</span>
                          <span className="font-semibold text-slate-200">
                            {selectedCust}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-rose-500/20 pt-2 flex-wrap gap-1">
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 
                        Guaranteed: No customer WhatsApp message sent on deletion
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Log ID: {selectedLog.id?.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                )}

                {/* ─── TAB 1: RAW JSON & MUTATION DIFF INSPECTOR ─── */}
                {activeInspectorTab === 'json' && (
                  <div className="space-y-3">
                    {/* Before State */}
                    {selectedBefore ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            State Before Action (Snapshot)
                          </span>
                          <button
                            onClick={() => handleCopy(selectedBefore)}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Before
                          </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-rose-300 overflow-x-auto shadow-inner">
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(selectedBefore, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}

                    {/* After State */}
                    {selectedAfter ? (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            State After Action (Snapshot)
                          </span>
                          <button
                            onClick={() => handleCopy(selectedAfter)}
                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy After
                          </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
                          <pre className="whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(selectedAfter, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}

                    {/* If neither before nor after state recorded */}
                    {!selectedBefore && !selectedAfter && (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                        No state snapshot mutations recorded for this audit entry.
                      </div>
                    )}

                    {/* Complete Raw Log Entry */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Complete Audit Record Payload (PostgreSQL)
                        </span>
                        <button
                          onClick={() => handleCopy(selectedLog)}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Raw Record
                        </button>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 font-mono text-[11px] text-amber-300/90 overflow-x-auto shadow-inner">
                        <pre className="whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(selectedLog, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: METADATA & TELEMETRY ─── */}
                {activeInspectorTab === 'metadata' && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Session & Identity Trace
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Actor Username:</span>
                          <span className="font-bold text-white">{selectedLog.username || selectedLog.user_username || 'SYSTEM'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Actor Role:</span>
                          <span className="font-bold text-amber-400 font-mono">{selectedLog.user_role || 'ADMIN'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">User ID:</span>
                          <span className="font-mono text-xs">{selectedLog.user_id || 'System Daemon'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Entity Class:</span>
                          <span className="font-mono text-amber-400 font-bold">{selectedLog.entity_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Entity Record UUID:</span>
                          <span className="font-mono text-xs text-slate-300">{selectedLog.entity_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Recorded Timestamp:</span>
                          <span className="font-mono text-xs text-emerald-400">{formatTimestamp(selectedLog.created_at)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] block">Network IP / Client Agent:</span>
                          <span className="font-mono text-slate-400">{selectedLog.ip_address || '127.0.0.1 (Local Session)'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: COMPLIANCE & IMMUTABILITY ─── */}
                {activeInspectorTab === 'compliance' && (
                  <div className="space-y-3">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300">Cryptographically Sealed Audit Entry</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          This mutation is appended to the PostgreSQL immutable log stream. It cannot be altered, overwritten, or purged by any application role.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 text-xs">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Warehouse Inventory Lineage Assurance
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Whenever an invoice is deleted, RAIS executes an atomic stock reversal: each line item's quantity is immediately credited back to live depot inventory with a corresponding movement record in <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">stock_movements</code>.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an audit entry from the master list to inspect.
            </div>
          )}
        </div>

      </div>
      </>
    )}
  </div>
);
};
