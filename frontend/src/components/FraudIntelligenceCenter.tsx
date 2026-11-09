import React, { useState, useEffect } from 'react';
import { GraphVisualizer } from './GraphVisualizer';
import type { HeatmapCell, NetworkGraphData } from '../../../shared/src/types';

export const FraudIntelligenceCenter: React.FC = () => {
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [globalGraph, setGlobalGraph] = useState<NetworkGraphData | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [activeTab, setActiveTab] = useState<'network' | 'heatmap' | 'rings'>('network');

  useEffect(() => {
    fetch('/api/fraud-intelligence/heatmap')
      .then(res => res.json())
      .then(data => setHeatmapCells(data.cells || []))
      .catch(e => console.error('Failed to load heatmap', e));

    fetch('/api/fraud-intelligence/network')
      .then(res => res.json())
      .then(data => setGlobalGraph(data))
      .catch(e => console.error('Failed to load network graph', e));
  }, []);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const periods = ['00:00-06:00', '06:00-12:00', '12:00-18:00', '18:00-24:00'];

  const getHeatmapColor = (density: number) => {
    if (density >= 75) return 'bg-red-500 text-white';
    if (density >= 50) return 'bg-amber-500 text-slate-900';
    if (density >= 25) return 'bg-blue-600/80 text-white';
    return 'bg-slate-800 text-slate-300';
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider font-mono">
              Global Risk Intelligence & Telemetry
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Fraud Intelligence & Graph Center</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Correlate cross-merchant entity rings, shared bank payout destinations, unverified toll-free call centers, and temporal fraud densities.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            Platform Heatmap: <strong className="text-emerald-400 font-bold">Simulated Data</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        {[
          { id: 'network', label: '🕸️ Platform Transaction Graph' },
          { id: 'heatmap', label: '🗺️ Temporal Risk Density Heatmap' },
          { id: 'rings', label: '💍 Cross-Store Entity Rings' }
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

      {/* TAB 1: PLATFORM GRAPH */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          <GraphVisualizer
            data={globalGraph || undefined}
            height={420}
            title="Cross-Merchant Multi-Entity Graph Visualizer"
          />
        </div>
      )}

      {/* TAB 2: TEMPORAL HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>🔥</span> Hourly Risk Concentration Grid (UTC)
              </h3>
              <p className="text-xs text-slate-400">
                Density indicates proportion of flagged transactions per time block (Simulated benchmark telemetry).
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Density:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px]">Low (&lt;25)</span>
              <span className="px-2 py-0.5 rounded bg-blue-600/80 text-[10px] text-white">Moderate (25-49)</span>
              <span className="px-2 py-0.5 rounded bg-amber-500 text-[10px] text-slate-900">Elevated (50-74)</span>
              <span className="px-2 py-0.5 rounded bg-red-500 text-[10px] text-white">Critical (75+)</span>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="overflow-x-auto">
            <div className="min-w-[600px] grid grid-cols-8 gap-2">
              <div className="text-xs font-bold text-slate-500 p-2">Time \ Day</div>
              {days.map(d => (
                <div key={d} className="text-xs font-bold text-slate-300 text-center p-2 bg-slate-950/40 rounded">
                  {d}
                </div>
              ))}

              {periods.map(period => (
                <React.Fragment key={period}>
                  <div className="text-xs font-mono text-slate-400 p-2 flex items-center">{period}</div>
                  {days.map(day => {
                    const cell = heatmapCells.find(c => c.xLabel === day && c.yLabel === period) || {
                      xLabel: day,
                      yLabel: period,
                      density: 20,
                      riskLevel: 'low' as const,
                      sampleCount: 150,
                      isSimulated: true as const
                    };

                    return (
                      <div
                        key={`${day}-${period}`}
                        onClick={() => setSelectedCell(cell)}
                        className={`p-3 rounded-xl cursor-pointer font-mono font-bold text-xs text-center transition-all hover:scale-105 shadow-sm ${getHeatmapColor(
                          cell.density
                        )}`}
                      >
                        {cell.density}%
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Selected Cell Overlay */}
          {selectedCell && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-200">
                  Selected Time Window: {selectedCell.xLabel} ({selectedCell.yLabel} UTC)
                </span>
                <p className="text-slate-400 mt-0.5">
                  Simulated Risk Density: <strong className="text-white">{selectedCell.density}%</strong> · Sampled Transactions: {selectedCell.sampleCount}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CROSS-STORE ENTITY RINGS */}
      {activeTab === 'rings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              High Risk Ring
            </span>
            <h4 className="font-bold text-sm text-slate-100">Shared Bank Routing Ring #481</h4>
            <p className="text-xs text-slate-400">
              4 distinct new merchant accounts configured the identical settlement bank routing number within a 72-hour window.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
              Associated IDs: MERCH_A91, MERCH_B02, MERCH_D19
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Suspicious Call Center
            </span>
            <h4 className="font-bold text-sm text-slate-100">VoIP Lure Cluster: +1-888-555-0144</h4>
            <p className="text-xs text-slate-400">
              Shared toll-free callback number appearing across 14 distinct invoice templates purporting to be Geek Squad and Norton.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
              Campaign: Fake Geek Squad $499 Auto-Renewal
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Shared Ingress Subnet
            </span>
            <h4 className="font-bold text-sm text-slate-100">ASN Proxy Cluster (198.51.100.0/24)</h4>
            <p className="text-xs text-slate-400">
              Commercial data center IP block exhibiting high transaction failure rates and rapid card instrument cycling.
            </p>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 font-mono">
              Trigger: Carding syndication pattern detected
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
