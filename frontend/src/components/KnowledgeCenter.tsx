import React, { useState, useEffect } from 'react';
import type { FraudTypology, KnowledgeBaseArticle } from '../../../shared/src/types';

export const KnowledgeCenter: React.FC = () => {
  const [typologies, setTypologies] = useState<FraudTypology[]>([]);
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [selectedItem, setSelectedItem] = useState<FraudTypology | KnowledgeBaseArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'typologies' | 'articles'>('typologies');

  useEffect(() => {
    fetch('/api/knowledge/articles')
      .then(res => res.json())
      .then(data => {
        setTypologies(data.typologies || []);
        setArticles(data.articles || []);
        if (data.typologies?.length > 0) {
          setSelectedItem(data.typologies[0]);
        }
      })
      .catch(e => console.error('Failed to load knowledge base', e));
  }, []);

  const filteredTypologies = typologies.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.indicators.some(ind => ind.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredArticles = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-100">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-xs uppercase font-bold text-blue-400 tracking-wider font-mono">
              Operational Playbooks & Regulatory Standards
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Threat Knowledge Base & Playbooks</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Verified PayPal fraud typologies, underwriting standard operating procedures (SOPs), and statutory compliance frameworks.
          </p>
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search typologies, SOPs, or regulations..."
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-72"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('typologies')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'typologies' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🛡️ Fraud Typologies ({filteredTypologies.length})
        </button>
        <button
          onClick={() => setActiveTab('articles')}
          className={`pb-3 px-2 border-b-2 transition-colors ${
            activeTab === 'articles' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📚 SOPs & Regulatory Standards ({filteredArticles.length})
        </button>
      </div>

      {/* 2-Column Split: List + Reader View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Left: Item Selector */}
        <div className="lg:col-span-1 space-y-3">
          {activeTab === 'typologies' ? (
            filteredTypologies.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedItem(t)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedItem && 'id' in selectedItem && selectedItem.id === t.id
                    ? 'bg-blue-950/40 border-blue-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-500">{t.id}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      t.severity === 'critical'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {t.severity}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-200">{t.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.description}</p>
              </div>
            ))
          ) : (
            filteredArticles.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedItem(a)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedItem && 'id' in selectedItem && selectedItem.id === a.id
                    ? 'bg-blue-950/40 border-blue-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-500">{a.category}</span>
                  <span className="text-[10px] text-slate-500">{a.readTime}</span>
                </div>
                <h4 className="font-bold text-xs text-slate-200">{a.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{a.summary}</p>
              </div>
            ))
          )}
        </div>

        {/* Right: Full Detail Reader View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm overflow-y-auto">
          {selectedItem ? (
            'indicators' in selectedItem ? (
              // Typology View
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono text-blue-400">{selectedItem.id} · {selectedItem.category}</span>
                    <h3 className="text-lg font-bold text-white mt-1">{selectedItem.name}</h3>
                  </div>
                  <span className="text-xs uppercase font-bold px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                    {selectedItem.severity}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Typology Overview</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedItem.description}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Key Diagnostic Indicators</h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {selectedItem.indicators.map((ind, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 font-bold">›</span> {ind}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <h4 className="text-xs font-bold uppercase text-blue-400">Standard Operating Procedure (SOP)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedItem.standardOperatingProcedure}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Applicable Statutory Regulations</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.applicableRegulations.map((reg, i) => (
                      <span key={i} className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {reg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Article View
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-800">
                  <span className="text-xs font-mono text-blue-400">{selectedItem.category} · {selectedItem.readTime}</span>
                  <h3 className="text-lg font-bold text-white mt-1">{selectedItem.title}</h3>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 italic">
                  "{selectedItem.summary}"
                </div>

                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans space-y-2">
                  {selectedItem.content}
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Select an item to view full documentation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
