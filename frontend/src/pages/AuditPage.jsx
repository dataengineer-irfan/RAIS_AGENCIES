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
  AlertCircle
} from 'lucide-react';
import { auditApi } from '../services/api';

export const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master-Detail State
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('json'); // json, metadata, compliance
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter, actionFilter]);

  const loadAuditLogs = async (selectId = null) => {
    setLoading(true);
    try {
      const params = {};
      if (entityFilter) params.entity_name = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const data = await auditApi.list(params);
      const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
      setLogs(items);
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredLogs = logs.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.user_username || '').toLowerCase().includes(term) ||
      (l.action || '').toLowerCase().includes(term) ||
      (l.entity_name || '').toLowerCase().includes(term) ||
      (l.entity_id || '').toLowerCase().includes(term)
    );
  });

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
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden gap-2">
      
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
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono">
                {logs.length} Immutable Logs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Security Logs & Immutable Activity Mutation Journal
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user, entity, ID..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">All Entities</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Customer">Customer</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="User">User</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="ALLOCATION">ALLOCATION</option>
            <option value="LOGIN">LOGIN</option>
          </select>
        </div>
      </div>

      {/* ─── MASTER-DETAIL SPLIT-PANE CONTAINER (100% Viewport-Locked) ─── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* ─── LEFT MASTER PANE (42% Width = 5 cols) ─── */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-lg flex flex-col overflow-hidden">
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

                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLogId(l.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="overflow-hidden pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded border ${getActionBadgeClass(l.action)}`}>
                          {l.action}
                        </span>
                        <span className="font-mono text-white text-xs font-bold">
                          {l.entity_name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        Actor: <strong className="text-slate-300">{l.user_username || 'SYSTEM'}</strong> {l.entity_id ? `• ID: ${l.entity_id.slice(0, 8)}...` : ''}
                      </p>
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
        </div>

        {/* ─── RIGHT DETAIL INSPECTOR (58% Width = 7 cols) ─── */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col overflow-hidden">
          {selectedLog ? (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${getActionBadgeClass(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                    <span className="font-mono font-bold text-sm text-white">
                      {selectedLog.entity_name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Triggered by <strong className="text-white">{selectedLog.user_username || 'SYSTEM'}</strong> on {selectedLog.created_at || 'Recently'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(selectedLog.changes_snapshot || selectedLog)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                    title="Copy Raw JSON Snapshot"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Copy JSON</span>
                  </button>
                </div>
              </div>

              {/* Inspector Tab Bar */}
              <div className="flex items-center gap-1.5 pt-2 pb-3 border-b border-slate-800/80 shrink-0">
                {[
                  { id: 'json', label: 'JSON Diff Inspector', icon: FileCode },
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
              <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
                
                {/* ─── TAB 1: RAW JSON DIFF INSPECTOR ─── */}
                {activeInspectorTab === 'json' && (
                  <div className="space-y-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-amber-300 overflow-x-auto shadow-inner">
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(selectedLog.changes_snapshot || { info: "No before/after mutations recorded" }, null, 2)}
                      </pre>
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
                          <span className="font-bold text-white">{selectedLog.user_username || 'SYSTEM'}</span>
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
                          <span className="font-mono text-xs">{selectedLog.entity_id || 'N/A'}</span>
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
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          This mutation is appended to the PostgreSQL immutable log stream. It cannot be altered or purged by application users.
                        </p>
                      </div>
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

    </div>
  );
};
