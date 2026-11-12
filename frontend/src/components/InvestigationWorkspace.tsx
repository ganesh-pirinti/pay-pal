import React, { useState, useEffect } from 'react';
import type {
  CaseManagerResult,
  InvestigationMemoryRecord,
  HumanReviewActionInput
} from '../../../shared/src/types';
import { GraphVisualizer } from './GraphVisualizer';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface InvestigationWorkspaceProps {
  onSelectCaseForCopilot?: (caseResult: CaseManagerResult) => void;
  onOpenCopilot?: () => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  onSelectCaseForCopilot,
  onOpenCopilot
}) => {
  const [cases, setCases] = useState<InvestigationMemoryRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<CaseManagerResult | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Active sub-tab inside case view
  const [caseTab, setCaseTab] = useState<
    'overview' | 'evidence' | 'decision-science' | 'replay' | 'exhibits' | 'notes' | 'override'
  >('overview');

  // Case Replay step index
  const [currentReplayStep, setCurrentReplayStep] = useState(0);

  // Override action state
  const [overrideAction, setOverrideAction] = useState<HumanReviewActionInput['action']>('Place on 48h Rolling Monitor');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Note state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteFlag, setNewNoteFlag] = useState<'info' | 'urgent' | 'decision'>('info');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Fetch Case Queue
  const fetchCases = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
        if (data.cases?.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data.cases[0].caseId);
        }
      }
    } catch (e) {
      console.error('Failed to load cases', e);
    } finally {
      setIsLoadingList(false);
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
            setSelectedCaseId(prev => prev || data.cases[0].caseId);
          }
        }
      })
      .catch(e => console.error('Failed to load cases', e))
      .finally(() => {
        if (isSubscribed) setIsLoadingList(false);
      });
    return () => { isSubscribed = false; };
  }, []);

  // Fetch full case details when selectedCaseId changes
  useEffect(() => {
    if (!selectedCaseId) return;

    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const res = await fetch(`/api/cases/${selectedCaseId}`);
        if (res.ok) {
          const detail: CaseManagerResult = await res.json();
          setActiveCase(detail);
          setCurrentReplayStep((detail.replaySteps?.length || 1) - 1);
          if (onSelectCaseForCopilot) {
            onSelectCaseForCopilot(detail);
          }
        }
      } catch (err) {
        console.error('Failed to load case detail', err);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedCaseId, onSelectCaseForCopilot]);

  // Handle Underwriter Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || isSubmittingOverride) return;

    if (!overrideNotes.trim()) {
      setOverrideMessage({ type: 'error', text: 'Written underwriter justification is strictly required.' });
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideMessage(null);

    try {
      const res = await fetch(`/api/orchestrator/cases/${selectedCaseId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'underwriter',
          'x-user-id': 'SEC-USER-001'
        },
        body: JSON.stringify({
          action: overrideAction,
          notes: overrideNotes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit review');
      }

      setOverrideMessage({
        type: 'success',
        text: `Underwriter decision "${overrideAction}" recorded successfully.`
      });
      setOverrideNotes('');
      // Refresh case details and list
      fetchCases();
      const ref = await fetch(`/api/cases/${selectedCaseId}`);
      if (ref.ok) {
        setActiveCase(await ref.json());
      }
    } catch (err: any) {
      setOverrideMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newNoteContent.trim() || isSubmittingNote) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'underwriter',
          'x-user-id': 'Sarah Chen (Senior Underwriter)'
        },
        body: JSON.stringify({
          content: newNoteContent,
          flag: newNoteFlag
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (activeCase) {
          setActiveCase({
            ...activeCase,
            underwriterNotes: [data.note, ...(activeCase.underwriterNotes || [])]
          });
        }
        setNewNoteContent('');
      }
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.merchantId && c.merchantId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const isResolved = Boolean(c.humanReviewAction && c.humanReviewAction !== 'Pending Review');
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !isResolved) ||
      (statusFilter === 'resolved' && isResolved);

    const isHigh = c.riskScore >= 70;
    const isMedium = c.riskScore >= 40 && c.riskScore < 70;
    const priority = isHigh ? 'critical' : isMedium ? 'medium' : 'low';
    const matchesPriority = priorityFilter === 'all' || priorityFilter === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[820px] text-slate-100">
      {/* ======================================================== */}
      {/* LEFT COLUMN: CASE QUEUE                                   */}
      {/* ======================================================== */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Queue Header & Filters */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <h3 className="font-bold text-sm text-slate-100">Underwriting Queue</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredCases.length} Cases
            </span>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Case ID, Merchant, or Keyword..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />

          {/* Status & Priority Toggles */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex rounded-lg bg-slate-800 p-0.5">
              {(['all', 'pending', 'resolved'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2 py-1 rounded capitalize ${
                    statusFilter === tab ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {isLoadingList ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No matching cases in queue.</div>
          ) : (
            filteredCases.map(c => {
              const isSelected = c.caseId === selectedCaseId;
              const isResolved = Boolean(c.humanReviewAction && c.humanReviewAction !== 'Pending Review');
              const isHigh = c.riskScore >= 70;
              const isMedium = c.riskScore >= 40 && c.riskScore < 70;

              return (
                <div
                  key={c.caseId}
                  onClick={() => setSelectedCaseId(c.caseId)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-l-4 border-blue-500'
                      : 'hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-200">{c.caseId}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        isHigh
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isMedium
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {c.riskScore}/100
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium line-clamp-1 mb-1">
                    {c.merchantId ? `Merchant: ${c.merchantId}` : c.summary.slice(0, 45)}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                      {isResolved ? 'Resolved' : 'Pending Review'}
                    </span>
                    <span className="font-mono text-slate-500">
                      SLA: {isHigh ? '2h (Urgent)' : '24h'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: INSPECTOR & WORKSPACE TABS                 */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            <span>Loading case intelligence and decision graphs...</span>
          </div>
        ) : !activeCase ? (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            Select a case from the queue to start investigating.
          </div>
        ) : (
          <>
            {/* Inspector Top Banner */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-white font-mono">{activeCase.caseId}</h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      activeCase.overallRiskCategory === 'High Risk'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : activeCase.overallRiskCategory === 'Medium Risk'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {activeCase.overallRiskCategory} ({activeCase.overallRiskScore}/100)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Priority: <strong className="uppercase text-amber-400">{activeCase.priority || 'Medium'}</strong>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    SLA: {activeCase.slaDueHours || 24}h
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-2xl break-words">{activeCase.finalVerdict}</p>
              </div>

              {/* Quick Actions in Header */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {onOpenCopilot && (
                  <button
                    onClick={onOpenCopilot}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-semibold shadow hover:opacity-95 transition-opacity"
                  >
                    <span>💬</span> Ask Copilot
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  🖨️ Export PDF / Print
                </button>
              </div>
            </div>

            {/* Inner Sub-Tabs Navigation */}
            <div className="px-5 border-b border-slate-800 bg-slate-900/80 flex items-center gap-2 overflow-x-auto text-xs">
              {[
                { id: 'overview', label: '📊 Overview & Graph' },
                { id: 'evidence', label: `🔍 Evidence (${activeCase.rankedEvidence?.length || 0})` },
                { id: 'decision-science', label: '⚖️ Calibration & Hypotheses' },
                { id: 'replay', label: '⏱️ Case Replay' },
                { id: 'exhibits', label: `📁 Exhibits (${activeCase.attachments?.length || 0})` },
                { id: 'notes', label: `📝 Notes (${activeCase.underwriterNotes?.length || 0})` },
                { id: 'override', label: '🛡️ Underwriter Override' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCaseTab(tab.id as any)}
                  className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                    caseTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-Tab Contents */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* TAB 1: OVERVIEW & GRAPH */}
              {caseTab === 'overview' && (
                <div className="space-y-6">
                  {/* Entity Relationship Network Graph */}
                  <GraphVisualizer
                    data={activeCase.networkGraph}
                    height={340}
                    title={`Entity Relationship Network: Case ${activeCase.caseId}`}
                  />

                  {/* 2-Column Grid: Executive Explanation & Risk Evolution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Executive Explanation */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span>🤖</span> Multi-Agent Synthesis Brief
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {activeCase.humanReadableExplanation}
                      </p>

                      <div className="pt-3 border-t border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                          Standard Operating Recommended Workflow:
                        </span>
                        <ul className="space-y-1 text-xs text-slate-300">
                          {activeCase.recommendedWorkflow.map((act, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-blue-400">›</span> {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 90-Day Risk Evolution Curve */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-3">
                        <span className="flex items-center gap-1.5">
                          <span>📈</span> Longitudinal Risk Evolution (90 Days)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Temporal Drift</span>
                      </h4>
                      <div className="flex-1 h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activeCase.riskEvolution || []}>
                            <defs>
                              <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                            <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                            <Area type="monotone" dataKey="riskScore" stroke="#ef4444" fillOpacity={1} fill="url(#riskGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CATEGORIZED & RANKED EVIDENCE */}
              {caseTab === 'evidence' && (
                <div className="space-y-6">
                  {/* Ranked Evidence List */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Ranked Evidence by Weight of Evidence (WoE Log-Odds)
                      </h4>
                      <span className="text-xs text-slate-500">
                        Prioritized for Level-2 Underwriter Review
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeCase.rankedEvidence && activeCase.rankedEvidence.length > 0 ? (
                        activeCase.rankedEvidence.map(item => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.category}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    item.direction === 'Inculpatory'
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                                >
                                  {item.direction}
                                </span>
                                <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                              </div>
                              <p className="text-xs text-slate-400">{item.rawDetail}</p>
                            </div>

                            <div className="text-right whitespace-nowrap">
                              <span className="font-mono font-bold text-xs text-blue-400 block">
                                {item.weightOfEvidence > 0 ? `+${item.weightOfEvidence}` : item.weightOfEvidence} WoE
                              </span>
                              <span className="text-[10px] text-slate-500">{item.confidence}% Conf</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500">No ranked evidence items available.</div>
                      )}
                    </div>
                  </div>

                  {/* Missing Information / Uncertainty Factors */}
                  {activeCase.missingEvidence && activeCase.missingEvidence.length > 0 && (
                    <div className="bg-slate-950/60 border border-amber-900/40 rounded-2xl p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>⚠️</span> Missing Telemetry Signals & Uncertainty Contributors
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeCase.missingEvidence.map(miss => (
                          <div key={miss.id} className="p-3 bg-slate-900/80 border border-amber-800/30 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-200">{miss.signalName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                                +{miss.uncertaintyContributionPercentage}% Uncertainty
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Recommended acquisition: <span className="text-slate-300">{miss.suggestedAcquisitionMethod}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CALIBRATION & ALTERNATIVE HYPOTHESES */}
              {caseTab === 'decision-science' && (
                <div className="space-y-6">
                  {/* Calibration Metrics Card */}
                  {activeCase.calibrationMetrics && (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <span>📐</span> Confidence Calibration & Brier Score
                        </h4>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                          ECE: {(activeCase.calibrationMetrics.expectedCalibrationError * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-xs text-slate-400 block mb-1">Brier Score</span>
                          <span className="font-mono text-xl font-bold text-white">
                            {activeCase.calibrationMetrics.brierScore}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1">0.0 = Perfect calibration</span>
                        </div>
                        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-xs text-slate-400 block mb-1">Expected Calibration Error</span>
                          <span className="font-mono text-xl font-bold text-emerald-400">
                            {(activeCase.calibrationMetrics.expectedCalibrationError * 100).toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1">Target &lt; 5.0%</span>
                        </div>
                        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-xs text-slate-400 block mb-1">Calibration Status</span>
                          <span className="font-mono text-sm font-bold text-slate-200">
                            {activeCase.calibrationMetrics.isWellCalibrated ? 'Well Calibrated' : 'High Uncertainty'}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1 line-clamp-1">
                            {activeCase.calibrationMetrics.reliabilityAssessment}
                          </span>
                        </div>
                      </div>

                      {/* Calibration Curve Chart */}
                      <div className="h-44 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={activeCase.calibrationMetrics.calibrationCurve}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="bin" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={9} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="predictedProb" name="Predicted Probability" fill="#3b82f6" />
                            <Bar dataKey="observedProb" name="Observed Ground Truth" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Alternative Hypotheses */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span>⚖️</span> Competing Hypothesis Generation (Debias Underwriting)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {activeCase.alternativeHypotheses?.map(hyp => (
                        <div
                          key={hyp.id}
                          className={`p-4 rounded-xl border flex flex-col justify-between space-y-2 ${
                            hyp.type === 'Primary Threat'
                              ? 'bg-red-950/20 border-red-900/50'
                              : hyp.type === 'Benign Alternative'
                              ? 'bg-emerald-950/20 border-emerald-900/50'
                              : 'bg-amber-950/20 border-amber-900/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400">{hyp.type}</span>
                              <span className="font-mono font-bold text-sm text-white">{hyp.probability}%</span>
                            </div>
                            <h5 className="font-bold text-xs text-slate-200 mb-1">{hyp.title}</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{hyp.rationale}</p>
                          </div>
                          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
                            {hyp.supportingEvidence.length} supporting signals
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contradiction Detection */}
                  {activeCase.contradictions && activeCase.contradictions.length > 0 && (
                    <div className="bg-slate-950/60 border border-red-900/40 rounded-2xl p-5 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <span>⚡</span> Contradictory Evidence Detected
                      </h4>
                      {activeCase.contradictions.map(c => (
                        <div key={c.id} className="p-3 bg-slate-900/90 border border-red-800/40 rounded-xl space-y-1 text-xs">
                          <span className="font-bold text-red-300">{c.description}</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 text-[11px] mt-1">
                            <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                              <strong className="text-slate-400 block">Signal A:</strong> {c.signalA}
                            </div>
                            <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                              <strong className="text-slate-400 block">Signal B:</strong> {c.signalB}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CASE REPLAY */}
              {caseTab === 'replay' && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Incident Time-Scrubber & Fraud Replay
                      </h4>
                      <p className="text-xs text-slate-500">
                        Step through how transaction velocity shifted and how agents reacted.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-blue-400 font-bold">
                      Step {currentReplayStep + 1} of {activeCase.replaySteps?.length || 1}
                    </span>
                  </div>

                  {/* Step Scrubber Slider */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={(activeCase.replaySteps?.length || 1) - 1}
                      value={currentReplayStep}
                      onChange={e => setCurrentReplayStep(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>{activeCase.replaySteps?.[0]?.timestamp || 'Start'}</span>
                      <span>{activeCase.replaySteps?.[activeCase.replaySteps.length - 1]?.timestamp || 'Current'}</span>
                    </div>
                  </div>

                  {/* Current Replay Card */}
                  {activeCase.replaySteps && activeCase.replaySteps[currentReplayStep] && (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400 font-bold">
                          {activeCase.replaySteps[currentReplayStep].timestamp} · {activeCase.replaySteps[currentReplayStep].actor}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Risk Score: <strong>{activeCase.replaySteps[currentReplayStep].riskScoreAtStep}/100</strong>
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-100">
                        {activeCase.replaySteps[currentReplayStep].title}
                      </h5>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeCase.replaySteps[currentReplayStep].description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: EXHIBITS & ATTACHMENTS */}
              {caseTab === 'exhibits' && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Case Evidence Exhibits & Document Scans
                    </h4>
                    <span className="text-xs text-slate-500">Documentary Evidence Store</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {activeCase.attachments?.map(att => (
                      <div key={att.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xl">📄</span>
                            <span className="text-[10px] text-slate-500 font-mono">{att.size}</span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-200 line-clamp-1">{att.name}</h5>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{att.previewText}</p>
                        </div>
                        <button
                          onClick={() => alert(`Viewing document exhibit: ${att.name}`)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                        >
                          View Exhibit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: UNDERWRITER NOTES */}
              {caseTab === 'notes' && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Underwriter Discussion & Case Notes
                  </h4>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                    <textarea
                      value={newNoteContent}
                      onChange={e => setNewNoteContent(e.target.value)}
                      placeholder="Add an internal underwriter note or phone verification summary..."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Tag:</span>
                        {(['info', 'urgent', 'decision'] as const).map(flag => (
                          <button
                            type="button"
                            key={flag}
                            onClick={() => setNewNoteFlag(flag)}
                            className={`px-2 py-0.5 rounded capitalize text-[11px] ${
                              newNoteFlag === flag ? 'bg-blue-600 text-white font-medium' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {flag}
                          </button>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNoteContent.trim()}
                        className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
                      >
                        Add Note
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-3">
                    {activeCase.underwriterNotes?.map(note => (
                      <div key={note.id} className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">{note.author} ({note.role})</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: UNDERWRITER OVERRIDE */}
              {caseTab === 'override' && (
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-5">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Human Underwriter Decision & Manual Override
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      As a fraud risk specialist, select the proportionate mitigation action. All overrides are cryptographically recorded to the immutable audit log.
                    </p>
                  </div>

                  {overrideMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs font-medium ${
                        overrideMessage.type === 'success'
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
                          : 'bg-red-950/40 text-red-300 border border-red-800'
                      }`}
                    >
                      {overrideMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleSubmitOverride} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-2">Select Mitigation Action:</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {[
                          'Approve Standard Flow',
                          'Place on 48h Rolling Monitor',
                          'Request Additional Documentation',
                          'Escalate to Compliance Specialist'
                        ].map(act => (
                          <button
                            type="button"
                            key={act}
                            onClick={() => setOverrideAction(act as any)}
                            className={`p-3 rounded-xl border text-left transition-colors ${
                              overrideAction === act
                                ? 'bg-blue-600/20 border-blue-500 text-white font-semibold'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {act}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-semibold block mb-1">
                        Underwriter Rationale & Written Justification (Mandatory):
                      </label>
                      <textarea
                        value={overrideNotes}
                        onChange={e => setOverrideNotes(e.target.value)}
                        placeholder="Detail the evidence examined, customer verification calls, or inventory invoice checks..."
                        rows={3}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingOverride || !overrideNotes.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-opacity"
                    >
                      {isSubmittingOverride ? 'Recording Decision...' : 'Record Underwriter Decision'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
