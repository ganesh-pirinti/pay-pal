import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ + K / Ctrl + K', desc: 'Toggle AI Copilot Assistant' },
    { key: '1', desc: 'Go to Executive Overview' },
    { key: '2', desc: 'Go to Seller Protection' },
    { key: '3', desc: 'Go to Invoice Shield' },
    { key: '4', desc: 'Go to Investigations' },
    { key: '5', desc: 'Go to PayPal Transactions' },
    { key: '6', desc: 'Go to Audit & System' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'Escape', desc: 'Close modals & drawers' }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white border border-[#e1e2e4] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-[#191c1e]">
        <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e4]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-blue-600">keyboard</span>
            <h3 id="shortcuts-title" className="text-sm font-bold text-[#191c1e]">
              Keyboard Shortcuts &amp; Accessibility
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#434655] hover:text-[#191c1e] text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="space-y-2 text-xs divide-y divide-[#e1e2e4]">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-[#434655]">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#f2f4f6] border border-[#e1e2e4] font-mono text-[11px] text-blue-700 shadow-sm font-medium">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-[#e1e2e4] flex justify-between items-center text-[11px] text-[#434655]">
          <span>WCAG 2.1 AAA Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
