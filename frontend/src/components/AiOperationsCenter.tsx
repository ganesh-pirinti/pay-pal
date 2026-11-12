import React, { useState, useEffect } from 'react';
import type { ContinuousLearningStatus } from '../../../shared/src/types';

interface AiOperationsCenterProps {
  onRunScenario?: (scenarioName: string) => void;
  onOpenCopilot?: () => void;
}

export const AiOperationsCenter: React.FC<AiOperationsCenterProps> = ({
  onRunScenario,
  onOpenCopilot
}) => {
  const [learningStatus, setLearningStatus] = useState<ContinuousLearningStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'fleet' | 'drift' | 'scenarios'>('fleet');

  useEffect(() => {
    fetch('/api/ai/continuous-learning')
      .then(res => res.json())
      .then(data => setLearningStatus(data))
      .catch(err => console.error('Failed to fetch learning status', err));
  }, []);

  const agents = [
    {
      name: 'Agent 1: Fraud Investigation Agent',
      role: 'Seller Velocity & Account Takeover (ATO)',
      status: 'Online',
      latency: '42ms',
      accuracy: '99.4%',
      tools: ['Seller Analyzer', 'Risk Engine', 'Knowledge Base'],
      desc: 'Detects sudden ticket acceleration (>4x), unverified buyer cohorts, and credential compromise patterns.'
    },
    {
      name: 'Agent 2: Invoice Intelligence Agent',
      role: 'Phishing, Social Engineering & Injection Quarantine',
      status: 'Online',
      latency: '36ms',
      accuracy: '100.0%',
      tools: ['Invoice Analyzer', 'Knowledge Base'],
      desc: 'Scans raw billing text for fake toll-free callback centers, urgent coercion, and quarantines prompt injection.'
    },
    {
      name: 'Agent 3: Merchant Protection Agent',
      role: 'Sales Surge Classifier & Growth Protection',
      status: 'Online',
      latency: '28ms',
      accuracy: '100.0%',
      tools: ['Seller Analyzer', 'Risk Engine'],
      desc: 'Protects honest merchants by distinguishing viral spikes and holiday promotions from malicious fraud. Invariant: Never freezes accounts.'
    },
    {
      name: 'Agent 4: Case Manager Agent',
      role: 'Consensus Synthesis & Evidence Ranking',
      status: 'Online',
      latency: '51ms',
      accuracy: '98.9%',
      tools: ['Alert Generator', 'Risk Engine'],
      desc: 'Merges multi-agent evidence, reconciles contradictory signals, builds audit timelines, and triggers HITL review.'
    },
    {
      name: 'Copilot Assistant Agent',
      role: 'Conversational Underwriter Companion',
      status: 'Standby',
      latency: '18ms',
      accuracy: 'Grounded',
      tools: ['Knowledge Base', 'Audit Logger'],
      desc: 'Interactive explainability assistant grounded strictly in verified case telemetry and standard operating procedures.'
    }
  ];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider font-mono">
              Autonomous Agent Fleet Active
            </span>
          </div>
          <h2 className="text-xl font-black text-white break-words">AI Operations & Decision Control Center</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl break-words">
            Real-time multi-agent fleet telemetry, model confidence calibration, and shadow continuous learning pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-colors flex items-center gap-2"
            >
              <span>💬</span> Query Fleet with Copilot
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        {[
          { id: 'fleet', label: '🤖 Agent Fleet Telemetry' },
          { id: 'drift', label: '📊 Continuous Learning & Model Drift' },
          { id: 'scenarios', label: '⚡ Rapid Multi-Agent Simulation' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 px-2 border-b-2 transition-colors ${
              activeTab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: FLEET TELEMETRY */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((ag, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {ag.status}
                  </span>
                  <span className="text-xs font-mono text-slate-400">Avg Latency: {ag.latency}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-100">{ag.name}</h4>
                <p className="text-[11px] text-blue-400 font-medium mb-2">{ag.role}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{ag.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Permitted Tool Capabilities:
                </span>
                <div className="flex flex-wrap gap-1">
                  {ag.tools.map((tl, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {tl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: CONTINUOUS LEARNING & DRIFT */}
      {activeTab === 'drift' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <span>🧬</span> Continuous Learning Architecture & Shadow Pipeline
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              TrustShield AI enforces frozen model weights in production to guarantee deterministic, auditable decisions. Underwriter feedback and manual overrides are streamed into an offline shadow evaluation pipeline with automated Population Stability Index (PSI) drift monitoring.
            </p>

            {learningStatus && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl min-w-0">
                  <span className="text-xs text-slate-400 block mb-1">Shadow Model Status</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {learningStatus.shadowModelActive ? 'Active in Shadow' : 'Offline'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Zero impact on prod</span>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Population Stability (PSI)</span>
                  <span className="font-mono text-base font-bold text-blue-400">
                    {learningStatus.baselineDriftScore}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">PSI &lt; 0.10: Stable</span>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Annotated Retraining Queue</span>
                  <span className="font-mono text-base font-bold text-amber-400">
                    {learningStatus.candidateQueueSize} Samples
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Awaiting batch sign-off</span>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 block mb-1">Canary Rollout Safety</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    {learningStatus.canaryRolloutSafe ? 'Verified Safe' : 'Locked'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Human gating enforced</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
              {learningStatus?.note || 'Strict Invariant: Production models require human underwriter sign-off prior to deployment.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RAPID MULTI-AGENT SCENARIOS */}
      {activeTab === 'scenarios' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              title: 'Viral Flash Surge (Legitimate)',
              desc: '+218% volume jump on holiday promotion. Zero disputes.',
              tag: 'Low Risk',
              action: 'Holiday Sales Spike (Legitimate)'
            },
            {
              title: 'Coordinated ATO Cash-Out',
              desc: 'Sudden +300% volume jump with 30% disputes and luxury goods shift.',
              tag: 'High Risk',
              action: 'Compromised Surge (High Risk)'
            },
            {
              title: 'Geek Squad Phishing Lure',
              desc: 'Fake $499 invoice demanding recipient call toll-free helpline.',
              tag: 'High-Risk Scam',
              action: 'Geek Squad Fake Support Scam'
            },
            {
              title: 'Adversarial Prompt Injection',
              desc: 'Payload attempting "SYSTEM PROMPT OVERRIDE" in invoice note.',
              tag: 'Critical Security',
              action: 'Prompt Injection Defense Test'
            },
            {
              title: 'New Merchant (Sparse Baseline)',
              desc: '12 days active with zero history.',
              tag: 'Insufficient Evidence',
              action: 'New Merchant (Insufficient History)'
            },
            {
              title: 'Routine Commercial Renewal',
              desc: 'Authentic SaaS subscription invoice with standard terms.',
              tag: 'Legitimate',
              action: 'Clean Commercial Invoice'
            }
          ].map((sc, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {sc.tag}
                </span>
                <h4 className="font-bold text-sm text-slate-100 mt-2">{sc.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{sc.desc}</p>
              </div>

              {onRunScenario && (
                <button
                  onClick={() => onRunScenario(sc.action)}
                  className="w-full py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-xs border border-blue-500/40 transition-colors"
                >
                  Dispatch Agents →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
