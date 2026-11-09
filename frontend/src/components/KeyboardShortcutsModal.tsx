import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + K / Ctrl + K', desc: 'Toggle AI Copilot Assistant' },
    { key: '1', desc: 'Go to Executive Dashboard' },
    { key: '2', desc: 'Go to Investigation Workspace (Case Queue)' },
    { key: '3', desc: 'Go to AI Operations Center' },
    { key: '4', desc: 'Go to Merchant Intelligence' },
    { key: '5', desc: 'Go to Invoice Intelligence' },
    { key: '6', desc: 'Go to Fraud Intelligence & Network Graph' },
    { key: '7', desc: 'Go to AI Agent Center' },
    { key: '8', desc: 'Go to System Monitoring' },
    { key: '9', desc: 'Go to Threat Knowledge Base' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'Escape', desc: 'Close modals & drawers' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">⌨️</span>
            <h3 id="shortcuts-title" className="text-sm font-bold text-white">
              Accessibility & Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 text-xs divide-y divide-slate-800/60">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-blue-400 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
          <span>WCAG 2.1 AAA Compliant · High Contrast</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
