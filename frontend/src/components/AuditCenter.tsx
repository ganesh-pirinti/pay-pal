import React, { useState, useEffect } from 'react';
import type { AuditLogEntry } from '../../../shared/src/types';

export const AuditCenter: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [integrityStatus, setIntegrityStatus] = useState<{
    isTamperFree: boolean;
    valid: number;
    total: number;
    algorithm: string;
    verifiedAt: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/audit/verify');
      if (res.ok) {
        const data = await res.json();
        setIntegrityStatus(data);
      }
    } catch (e) {
      console.error('Integrity check failed', e);
    } finally {
      setIsVerifying(false);
    }
  };

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
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SECURITY_ALERT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RULE_CHANGE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'COPILOT_QUERY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EXPORT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-[#191c1e]">
      {/* Banner */}
      <div className="bg-white border border-[#e1e2e4] rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs uppercase font-semibold text-blue-700 tracking-wider">
              Cryptographic Audit Compliance
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#191c1e]">Immutable Underwriting Audit Center</h2>
          <p className="text-xs text-[#434655] mt-1 max-w-2xl">
            Every underwriter review action, automated risk calculation, rule modification, and security quarantine is recorded with a tamper-evident SHA-256 checksum.
          </p>
        </div>

        {/* Export & Verify Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleVerifyIntegrity}
            disabled={isVerifying}
            className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Verify SHA-256 Payload Checksums Across All Log Records"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            {isVerifying ? 'Verifying...' : 'Verify Chain'}
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg bg-[#edeef0] hover:bg-[#e1e2e4] text-[#191c1e] border border-[#e1e2e4] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
          </button>
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-lg bg-[#edeef0] hover:bg-[#e1e2e4] text-[#191c1e] border border-[#e1e2e4] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">download</span> Export JSON
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-[#edeef0] hover:bg-[#e1e2e4] text-[#434655] border border-[#e1e2e4] transition-colors cursor-pointer"
            title="Refresh Audit Trail"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Integrity Verification Banner */}
      {integrityStatus && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
          integrityStatus.isTamperFree
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center space-x-2.5">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">
              {integrityStatus.isTamperFree ? 'check_circle' : 'warning'}
            </span>
            <div>
              <span className="font-bold">
                {integrityStatus.isTamperFree
                  ? `Cryptographic Integrity Confirmed: 100% of audit records (${integrityStatus.valid}/${integrityStatus.total}) matched their SHA-256 payload checksums.`
                  : `Integrity Alert: Checksum mismatch detected in ${integrityStatus.total - integrityStatus.valid} record(s).`}
              </span>
              <p className="text-[11px] text-[#434655] mt-0.5">
                Algorithm: {integrityStatus.algorithm} | Verified At: {new Date(integrityStatus.verifiedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIntegrityStatus(null)}
            className="text-[#434655] hover:text-[#191c1e] text-xs px-2 py-1 rounded hover:bg-slate-200/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'OVERRIDE', 'EVALUATION', 'SECURITY_ALERT', 'RULE_CHANGE', 'COPILOT_QUERY', 'EXPORT'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-[#e1e2e4] text-[#434655] hover:bg-slate-50'
              }`}
            >
              {type.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-[#737686] text-[16px]">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter details, case ID, user..."
            className="pl-8 pr-3 py-1.5 bg-white border border-[#e1e2e4] rounded-lg text-xs text-[#191c1e] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 w-64 shadow-sm"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-[#e1e2e4] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-[#e1e2e4]">
            <thead className="bg-[#f2f4f6] text-[#434655] font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Subject / Case</th>
                <th className="py-3 px-4">User &amp; Role</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">Checksum (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e2e4] text-[#191c1e]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#434655]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#434655]">
                    No matching audit records.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[#191c1e]">{l.id}</td>
                    <td className="py-3 px-4 font-mono text-[#434655] text-[11px]">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getEventBadge(l.eventType)}`}>
                        {l.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-medium">
                      {l.caseId || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#191c1e]">{l.userId}</span>
                      <span className="text-[10px] text-[#434655] block capitalize">{l.userRole}</span>
                    </td>
                    <td className="py-3 px-4 max-w-md text-[#434655]">
                      {l.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-emerald-700 truncate max-w-[120px]" title={l.checksum}>
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
