import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Eye, Clock, User } from 'lucide-react';
import { auditApi } from '../services/api';

export const AuditPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAuditLogs();
  }, [entityFilter, actionFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (entityFilter) params.entity_name = entityFilter;
      if (actionFilter) params.action = actionFilter;
      const data = await auditApi.list(params);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span>System Audit & Compliance Trail</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log of financial mutations, status transitions, and user logins
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Entity</label>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          >
            <option value="">All Entities</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Customer">Customer</option>
            <option value="Product">Product</option>
            <option value="User">User</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter by Action</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
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

      {/* Audit Log Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Actor / User</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity</th>
                <th className="py-3 px-3">Entity ID</th>
                <th className="py-3 px-4">Payload Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-xs">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 text-xs">
                    No audit records matching filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-slate-200">
                      <p className="font-bold">{log.username || 'System'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{log.user_role || '-'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 text-amber-400 border border-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-bold">{log.entity_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[120px]">{log.entity_id}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {log.after_state || log.before_state || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
