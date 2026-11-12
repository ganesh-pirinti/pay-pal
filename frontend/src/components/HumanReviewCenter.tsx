import React, { useState, useEffect } from 'react';
import type { InvestigationMemoryRecord, HumanReviewActionInput } from '../../../shared/src/types.js';

interface HumanReviewCenterProps {
  onSelectCase?: (caseId: string) => void;
}

export const HumanReviewCenter: React.FC<HumanReviewCenterProps> = () => {
  const [cases, setCases] = useState<InvestigationMemoryRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<InvestigationMemoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'high_risk' | 'ato'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Underwriter Review Form State
  const [reviewAction, setReviewAction] = useState<HumanReviewActionInput['action']>('Place on 48h Rolling Monitor');
  const [underwriterNotes, setUnderwriterNotes] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        if (data.cases?.length > 0 && !selectedCase) {
          setSelectedCase(data.cases[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load investigation cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    fetch('/api/cases')
      .then(res => res.json())
      .then(data => {
        if (isSubscribed) {
          setCases(data.cases || []);
          if (data.cases?.length > 0) {
            setSelectedCase(prev => prev ?? data.cases[0]);
          }
        }
      })
      .catch(err => console.error('Failed to load investigation cases', err))
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
    return () => { isSubscribed = false; };
  }, []);

  const handleRecordDecision = async () => {
    if (!selectedCase) return;
    setSubmittingDecision(true);
    setDecisionFeedback(null);

    try {
      const res = await fetch(`/api/orchestrator/cases/${selectedCase.caseId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'underwriter'
        },
        body: JSON.stringify({
          action: reviewAction,
          notes: underwriterNotes.trim() || `Human reviewer decision: ${reviewAction}`
        })
      });

      if (res.ok) {
        setDecisionFeedback(`Decision recorded: "${reviewAction}". Logged in investigation memory.`);
        // Refresh case list
        await fetchCases();
        setSelectedCase(prev => prev ? {
          ...prev,
          humanReviewAction: reviewAction,
          summary: `${prev.summary} | Reviewer Decision: ${reviewAction} (${underwriterNotes})`
        } : null);
      }
    } catch {
      setDecisionFeedback('Network error recording decision.');
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleExportReport = () => {
    if (!selectedCase) return;
    const reportData = {
      reportTitle: 'PayPal TrustShield AI — Fraud Investigation Case File',
      exportedAt: new Date().toISOString(),
      caseId: selectedCase.caseId,
      merchantId: selectedCase.merchantId || 'N/A',
      riskScore: selectedCase.riskScore,
      riskCategory: selectedCase.riskCategory,
      summary: selectedCase.summary,
      merchantBaseline: selectedCase.merchantBaseline,
      humanReviewStatus: selectedCase.humanReviewAction || 'Pending Review',
      complianceStandard: 'PayPal Seller Protection & Anti-Fraud Architecture v2.0'
    };

    const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TrustShield_Report_${selectedCase.caseId}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setExportNotice(`Case report for ${selectedCase.caseId} downloaded as JSON.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  const filteredCases = cases.filter(c => {
    if (filter === 'pending' && c.humanReviewAction && c.humanReviewAction !== 'Pending Review') return false;
    if (filter === 'high_risk' && c.riskScore < 70) return false;
    if (filter === 'ato' && !c.summary.toLowerCase().includes('account takeover') && !c.summary.toLowerCase().includes('ato')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.caseId.toLowerCase().includes(q) ||
        (c.merchantId && c.merchantId.toLowerCase().includes(q)) ||
        c.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Workspace Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              UNDERWRITER WORKSPACE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 shrink-0">
              Role: Underwriter (RBAC Enforced)
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap break-words">
            Human-in-the-Loop Review Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl break-words">
            Audit high-risk escalations, inspect empirical evidence, cross-reference longitudinal memory, and record manual overrides without balance holds.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchCases()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Queue</span>
          </button>

          {selectedCase && (
            <button
              onClick={handleExportReport}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Case Report (JSON)</span>
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main Review Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Case Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg space-y-3">
            {/* Search and Filters */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search case ID, merchant, keyword..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: 'all', label: `All (${cases.length})` },
                  { id: 'pending', label: 'Pending Review' },
                  { id: 'high_risk', label: 'High Risk (Score ≥70)' },
                  { id: 'ato', label: 'ATO Suspected' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilter(p.id as typeof filter)}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      filter === p.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Case List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredCases.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No investigation cases match the selected filter.
                </div>
              ) : (
                filteredCases.map(item => {
                  const isSelected = selectedCase?.caseId === item.caseId;
                  const isHighRisk = item.riskScore >= 70;
                  return (
                    <div
                      key={item.caseId}
                      onClick={() => setSelectedCase(item)}
                      className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-200">{item.caseId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isHighRisk
                            ? 'text-rose-400 bg-rose-950/40 border-rose-500/30'
                            : 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                        }`}>
                          {item.riskScore}/100 • {item.riskCategory}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-900">
                        <span>{item.merchantId ? `Merchant: ${item.merchantId}` : 'Document Scan'}</span>
                        <span className="font-medium text-slate-400">
                          {item.humanReviewAction ? item.humanReviewAction : 'Pending Review'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Case Deep-Dive Inspector */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedCase ? (
            <div className="p-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
              Select an investigation case from the queue to view full evidence and record underwriting decisions.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Case Header Card */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-400">{selectedCase.caseId}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs text-slate-400">{new Date(selectedCase.timestamp).toLocaleString()}</span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-1">
                      {selectedCase.merchantId ? `Merchant Case: ${selectedCase.merchantId}` : 'Document Threat Case'}
                    </h2>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                      selectedCase.riskScore >= 70
                        ? 'text-rose-400 bg-rose-950/50 border-rose-500/40'
                        : 'text-emerald-400 bg-emerald-950/50 border-emerald-500/40'
                    }`}>
                      Score: {selectedCase.riskScore}/100 • {selectedCase.riskCategory}
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans p-3 rounded-xl bg-slate-950 border border-slate-800">
                  {selectedCase.summary}
                </div>

                {/* Longitudinal Merchant Baseline (if present) */}
                {selectedCase.merchantBaseline && (
                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
                    <span className="font-semibold text-indigo-300 block mb-1">
                      Longitudinal Merchant Baseline (from Memory)
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 font-mono">
                      <div>Baseline Daily Sales: ${selectedCase.merchantBaseline.avgDailyVolume.toFixed(2)}</div>
                      <div>Baseline AOV: ${selectedCase.merchantBaseline.avgTicketSize.toFixed(2)}</div>
                      <div>Dispute Ratio: {(selectedCase.merchantBaseline.disputeRatio * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Override & Underwriter Action Panel */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white">Underwriter Manual Override</h3>
                    <p className="text-xs text-slate-400">Apply human judgment to confirm standard processing, request documentation, or escalate.</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    RBAC: Underwriter Access
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="text-slate-300 font-bold block">Select Review Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Approve Standard Flow', 'Request Additional Documentation', 'Place on 48h Rolling Monitor', 'Escalate to Compliance Specialist'] as const).map(action => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => setReviewAction(action)}
                        className={`p-3 rounded-xl border text-left font-semibold transition cursor-pointer ${
                          reviewAction === action
                            ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Underwriter Audit Notes</label>
                    <textarea
                      rows={2}
                      value={underwriterNotes}
                      onChange={e => setUnderwriterNotes(e.target.value)}
                      placeholder="Add compliance notes, justification, or tracking requirements..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
                    ></textarea>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Non-destructive: TrustShield AI never automatically freezes accounts.
                    </span>
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={handleRecordDecision}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-blue-500/20"
                    >
                      {submittingDecision ? 'Submitting...' : 'Commit Underwriter Decision'}
                    </button>
                  </div>

                  {decisionFeedback && (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{decisionFeedback}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
