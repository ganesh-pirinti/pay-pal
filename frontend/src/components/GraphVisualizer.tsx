import React, { useState } from 'react';
import type { NetworkGraphData, NetworkGraphNode } from '../../../shared/src/types';

interface GraphVisualizerProps {
  data?: NetworkGraphData;
  height?: number;
  title?: string;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  data,
  height = 360,
  title = 'Entity Relationship & Risk Network Graph'
}) => {
  const [selectedNode, setSelectedNode] = useState<NetworkGraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Fallback demo graph if no data provided
  const graph: NetworkGraphData = data && data.nodes && data.nodes.length > 0 ? data : {
    nodes: [
      { id: 'n-merch', label: 'Merchant (Acme Corp)', type: 'merchant', riskScore: 78 },
      { id: 'n-bank', label: 'Chase Bank (****4891)', type: 'bank', riskScore: 12 },
      { id: 'n-ip', label: 'Subnet 198.51.100.0/24', type: 'ip', riskScore: 84 },
      { id: 'n-buyer1', label: 'Buyer Cluster #1', type: 'buyer', riskScore: 65 },
      { id: 'n-card', label: 'Visa BIN 411111', type: 'card', riskScore: 70 },
      { id: 'n-phone', label: '+1 (888) 555-0199', type: 'phone', riskScore: 92 }
    ],
    edges: [
      { id: 'e1', source: 'n-merch', target: 'n-bank', relationship: 'Settlement Payout', weight: 2, isSuspicious: false },
      { id: 'e2', source: 'n-merch', target: 'n-ip', relationship: 'Checkout IP', weight: 4, isSuspicious: true },
      { id: 'e3', source: 'n-merch', target: 'n-buyer1', relationship: 'Transaction Volume', weight: 5, isSuspicious: true },
      { id: 'e4', source: 'n-buyer1', target: 'n-card', relationship: 'Card Instrument', weight: 3, isSuspicious: true },
      { id: 'e5', source: 'n-merch', target: 'n-phone', relationship: 'Support Helpline', weight: 2, isSuspicious: true }
    ]
  };

  const filteredNodes = filterType === 'all'
    ? graph.nodes
    : graph.nodes.filter(n => n.type === filterType);

  // Layout node positions algorithmically in circle/constellation
  const width = 640;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 60;

  const nodePositions = new Map<string, { x: number; y: number }>();
  filteredNodes.forEach((node, idx) => {
    if (idx === 0) {
      nodePositions.set(node.id, { x: cx, y: cy });
    } else {
      const angle = ((idx - 1) / (filteredNodes.length - 1)) * 2 * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      nodePositions.set(node.id, { x, y });
    }
  });

  const getNodeColor = (node: NetworkGraphNode) => {
    if (node.riskScore >= 75) return '#ef4444'; // Red-500
    if (node.riskScore >= 50) return '#f59e0b'; // Amber-500
    if (node.type === 'merchant') return '#3b82f6'; // Blue-500
    if (node.type === 'bank') return '#a855f7'; // Purple-500
    if (node.type === 'buyer') return '#10b981'; // Emerald-500
    if (node.type === 'invoice') return '#06b6d4'; // Cyan-500
    return '#64748b'; // Slate-500
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Graph Toolbar */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {filteredNodes.length} Nodes · {graph.edges.length} Edges
          </span>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 mr-1">Filter:</span>
          {['all', 'merchant', 'buyer', 'bank', 'phone', 'ip'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2 py-1 rounded-md capitalize transition-colors ${
                filterType === type
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 overflow-hidden">
        {/* Subtle background coordinate grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Defs for gradients & markers */}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            <marker id="arrow-suspicious" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Edges */}
          {graph.edges.map(edge => {
            const p1 = nodePositions.get(edge.source);
            const p2 = nodePositions.get(edge.target);
            if (!p1 || !p2) return null;

            return (
              <g key={edge.id} className="transition-opacity">
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={edge.isSuspicious ? '#ef4444' : '#475569'}
                  strokeWidth={edge.weight || 2}
                  strokeDasharray={edge.isSuspicious ? '4 3' : undefined}
                  opacity={edge.isSuspicious ? 0.85 : 0.45}
                  markerEnd={edge.isSuspicious ? 'url(#arrow-suspicious)' : 'url(#arrow)'}
                />
                {/* Midpoint relationship tag */}
                <text
                  x={(p1.x + p2.x) / 2}
                  y={(p1.y + p2.y) / 2 - 4}
                  fill={edge.isSuspicious ? '#fca5a5' : '#94a3b8'}
                  fontSize="9"
                  textAnchor="middle"
                  className="bg-slate-900 px-1 font-mono"
                >
                  {edge.relationship}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {filteredNodes.map(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;
            const isSelected = selectedNode?.id === node.id;
            const nodeColor = getNodeColor(node);

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
              >
                {/* Outer Glow Halo on high risk or selection */}
                {(node.riskScore >= 70 || isSelected) && (
                  <circle
                    r={isSelected ? 26 : 22}
                    fill={nodeColor}
                    opacity="0.25"
                    className="animate-pulse"
                  />
                )}

                {/* Main Node Body */}
                <circle
                  r={isSelected ? 18 : 15}
                  fill="#0f172a"
                  stroke={nodeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200 group-hover:scale-110"
                />

                {/* Score badge / inner icon */}
                <text
                  y="4"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="pointer-events-none font-mono"
                >
                  {node.riskScore}
                </text>

                {/* Label below */}
                <text
                  y="28"
                  fill={isSelected ? '#38bdf8' : '#cbd5e1'}
                  fontSize="11"
                  fontWeight={isSelected ? '600' : '500'}
                  textAnchor="middle"
                  className="pointer-events-none drop-shadow"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Details Card Overlay */}
        {selectedNode && (
          <div className="absolute top-3 right-3 w-64 bg-slate-800/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs z-10 animate-fade-in">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700">
              <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getNodeColor(selectedNode) }}
                ></span>
                {selectedNode.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Node Type:</span>
                <span className="font-mono capitalize text-slate-200">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className={`font-mono font-bold ${selectedNode.riskScore >= 70 ? 'text-red-400' : selectedNode.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedNode.riskScore}/100
                </span>
              </div>
              {selectedNode.details && Object.entries(selectedNode.details).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400 capitalize">{k}:</span>
                  <span className="font-mono text-slate-200">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> High Risk (75+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate (50-74)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Merchant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Bank Payout
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Buyer Cohort
          </span>
        </div>
        <span className="text-slate-500 italic">Click any node to view entity attributes</span>
      </div>
    </div>
  );
};
