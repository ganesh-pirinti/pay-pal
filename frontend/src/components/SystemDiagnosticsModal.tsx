import React, { useState, useEffect } from 'react';

interface DiagnosticsData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
  };
  metrics: {
    totalRequests: number;
    errorRatePercentage: number;
    averageApiLatencyMs: number;
    p95ApiLatencyMs: number;
    statusCodes: Record<string, number>;
  };
  agentPerformance: Record<string, { count: number; avgDurationMs: number }>;
  cache: {
    size: number;
    hits: number;
    misses: number;
    hitRatePercentage: number;
    evictions: number;
  };
  activeCircuitBreakers: Record<string, string>;
  version: string;
}

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDiagnosticsModal: React.FC<SystemDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<DiagnosticsData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isSubscribed = true;
    fetch('/api/diagnostics')
      .then(res => res.json())
      .then(json => {
        if (isSubscribed) setData(json);
      })
      .catch(err => console.error('Failed to load diagnostics', err));
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#e1e2e4] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e4]">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base font-bold text-[#191c1e]">System Diagnostics &amp; Observability</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
              {data?.version || 'v2.0 Enterprise'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#434655] hover:text-[#191c1e] p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {!data ? (
          <div className="py-12 text-center text-xs text-[#434655]">Loading live telemetry snapshot...</div>
        ) : data ? (
          <div className="space-y-4 text-xs font-sans">
            {/* Health & Uptime Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4]">
                <span className="text-[#434655] text-[10px] uppercase font-semibold block">Health Status</span>
                <span className="text-emerald-700 font-bold text-sm capitalize">{data.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4]">
                <span className="text-[#434655] text-[10px] uppercase font-semibold block">Uptime</span>
                <span className="text-[#191c1e] font-bold text-sm">{Math.floor(data.uptimeSeconds / 60)}m {data.uptimeSeconds % 60}s</span>
              </div>
              <div className="p-3 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4]">
                <span className="text-[#434655] text-[10px] uppercase font-semibold block">p95 Latency</span>
                <span className="text-blue-700 font-bold text-sm">{data.metrics.p95ApiLatencyMs}ms</span>
              </div>
              <div className="p-3 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4]">
                <span className="text-[#434655] text-[10px] uppercase font-semibold block">Cache Hit Rate</span>
                <span className="text-indigo-700 font-bold text-sm">{data.cache.hitRatePercentage}%</span>
              </div>
            </div>

            {/* Memory & Traffic Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4] space-y-1.5">
                <h4 className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider">Node.js Memory Footprint</h4>
                <div className="grid grid-cols-2 gap-2 text-[#434655] text-[11px] font-mono">
                  <div>Heap Used: <span className="text-[#191c1e] font-semibold">{data.memory.heapUsedMB} MB</span></div>
                  <div>Heap Total: <span className="text-[#191c1e] font-semibold">{data.memory.heapTotalMB} MB</span></div>
                  <div>RSS: <span className="text-[#191c1e] font-semibold">{data.memory.rssMB} MB</span></div>
                  <div>External: <span className="text-[#191c1e] font-semibold">{data.memory.externalMB} MB</span></div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4] space-y-1.5">
                <h4 className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider">HTTP Traffic &amp; Error Rate</h4>
                <div className="grid grid-cols-2 gap-2 text-[#434655] text-[11px] font-mono">
                  <div>Total Requests: <span className="text-[#191c1e] font-semibold">{data.metrics.totalRequests}</span></div>
                  <div>Error Rate: <span className="text-emerald-700 font-semibold">{data.metrics.errorRatePercentage}%</span></div>
                  <div>Status 2xx: <span className="text-[#191c1e] font-semibold">{data.metrics.statusCodes['2xx'] || 0}</span></div>
                  <div>Status 4xx/5xx: <span className="text-amber-700 font-semibold">{(data.metrics.statusCodes['4xx'] || 0) + (data.metrics.statusCodes['5xx'] || 0)}</span></div>
                </div>
              </div>
            </div>

            {/* AI Agent Execution Timing Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4] space-y-2">
              <h4 className="text-[11px] font-bold text-[#191c1e] uppercase tracking-wider">Agent Execution Telemetry</h4>
              <div className="space-y-1.5">
                {Object.entries(data.agentPerformance).map(([agent, stats]) => (
                  <div key={agent} className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e1e2e4] text-[11px]">
                    <span className="text-[#191c1e] font-medium">{agent}</span>
                    <span className="text-blue-700 font-mono font-medium">
                      {stats.count > 0 ? `${stats.avgDurationMs}ms avg (${stats.count} runs)` : 'Standby (0 runs)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Circuit Breakers */}
            <div className="p-3.5 rounded-xl bg-[#f8f9fb] border border-[#e1e2e4] flex items-center justify-between text-xs">
              <span className="text-[#434655]">PayPal Orders v2 API Circuit:</span>
              <span className="font-mono text-emerald-700 font-bold">{data.activeCircuitBreakers.paypalOrdersApi}</span>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-[#e1e2e4]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#edeef0] hover:bg-[#e1e2e4] text-[#191c1e] text-xs font-semibold transition cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
