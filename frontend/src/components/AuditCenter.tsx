import React, { useState, useEffect } from 'react';
import type { AuditLogEntry } from '../../../shared/src/types';

export const AuditCenter: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchLogs = () => {
    setIsLoading(true);
    fetch('/api/audit/logs?limit=150')
      .then(res => res.json())
      .then(data => setLogs(data.logs || []))
      .catch(e => console.error('Failed to fetch audit logs', e))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let isSubscribed = true;
    fetch('/api/audit/logs?limit=150')
      .then(res => res.json())
      .then(data => {
        if (isSubscribed) setLogs(data.logs || []);
      })
      .catch(e => console.error('Failed to fetch audit logs', e))
      .finally(() => {
        if (isSubscribed) setIsLoading(false);
      });
    return () => { isSubscribed = false; };
  }, []);

  const handleExportCsv = () => {
    window.open('/api/audit/export?format=csv', '_blank');
  };

  const handleExportJson = () => {
    window.open('/api/audit/export?format=json', '_blank');
  };

  const filteredLogs = logs.filter(l => {
    const matchesType = selectedType === 'all' || l.eventType === selectedType;
    const matchesSearch =
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.userId.toLowerCase().includes(search.toLowerCase()) ||
      l.id.toLowerCase().includes(search.toLowerCase()) ||
      (l.caseId && l.caseId.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getEventBadge = (type: AuditLogEntry['eventType']) => {
    switch (type) {
      case 'OVERRIDE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'SECURITY_ALERT':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'RULE_CHANGE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'COPILOT_QUERY':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'EXPORT':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <span className="text-xs uppercase font-bold text-purple-400 tracking-wider font-mono">
              Cryptographic Audit Compliance
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Immutable Underwriting Audit Center</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Every underwriter review action, automated risk calculation, rule modification, and security quarantine is recorded with a tamper-evident SHA-256 checksum.
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>📥</span> Export JSON
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Audit Trail"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'OVERRIDE', 'EVALUATION', 'SECURITY_ALERT', 'RULE_CHANGE', 'COPILOT_QUERY', 'EXPORT'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter details, case ID, user..."
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-64"
        />
      </div>

      {/* Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Subject / Case</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Checksum (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">{l.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getEventBadge(l.eventType)}`}>
                        {l.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      {l.caseId || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{l.userId}</span>
                      <span className="text-[10px] text-slate-500 block capitalize">{l.userRole}</span>
                    </td>
                    <td className="py-3 px-4 max-w-md text-slate-300">
                      {l.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-emerald-400">
                      {l.checksum}
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
