import React, { useState, useRef, useEffect } from 'react';
import type { CaseManagerResult, CopilotChatResponse } from '../../../shared/src/types';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase?: CaseManagerResult | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  actionSuggestions?: string[];
  citedEvidence?: string[];
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeCase
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'copilot',
      text: `Hello! I am your **PayPal TrustShield AI Copilot**.\n\nI am grounded strictly in PayPal fraud typologies, merchant processing baselines, and multi-agent audit telemetry.\n\n${
        activeCase
          ? `Currently examining **Case ${activeCase.caseId}** (${activeCase.overallRiskCategory}, Score: ${activeCase.overallRiskScore}/100).\nHow can I assist your investigation?`
          : 'Select a case in the Investigation Workspace or choose a quick prompt below.'
      }`,
      timestamp: 'Just now',
      actionSuggestions: [
        'Summarize this investigation',
        'Explain key risk drivers',
        'Evaluate counter-hypotheses',
        'Suggest next underwriting actions',
        'Draft formal case report'
      ]
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastCaseIdRef = useRef<string | undefined>(undefined);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Context switch notification when activeCase changes
  useEffect(() => {
    if (activeCase && activeCase.caseId !== lastCaseIdRef.current) {
      lastCaseIdRef.current = activeCase.caseId;
      setMessages(prev => [
        ...prev,
        {
          id: `switch-${Date.now()}`,
          sender: 'copilot',
          text: `🔄 Switched focus to **Case ${activeCase.caseId}** (${activeCase.overallRiskCategory}, Score: ${activeCase.overallRiskScore}/100).\nVerdict: "${activeCase.finalVerdict || activeCase.humanReadableExplanation}"\n\nHow can I help with this case?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionSuggestions: [
            'Summarize case findings',
            'Check for policy violations',
            'Assess false positive probability'
          ]
        }
      ]);
    }
  }, [activeCase]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: activeCase?.caseId || 'CASE-MEM-2026-001',
          query: userText,
          investigationContext: activeCase ? {
            merchantId: activeCase.merchantId,
            riskScore: activeCase.overallRiskScore,
            category: activeCase.overallRiskCategory,
            primaryDriver: activeCase.finalVerdict || activeCase.humanReadableExplanation
          } : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Copilot API responded with status ${response.status}`);
      }

      const data: CopilotChatResponse = await response.json();

      const copilotMsg: ChatMessage = {
        id: `copilot-${Date.now()}`,
        sender: 'copilot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionSuggestions: data.actionSuggestions,
        citedEvidence: data.citedEvidence
      };

      setMessages(prev => [...prev, copilotMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'copilot',
          text: '⚠️ An error occurred connecting to the Copilot intelligence service. Please ensure the backend is running.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white border-l border-[#e1e2e4] flex flex-col h-full shadow-2xl animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#e1e2e4] bg-[#f8f9fb] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191c1e] flex items-center gap-2">
                TrustShield Copilot
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Grounded
                </span>
              </h3>
              <p className="text-xs text-[#434655]">
                {activeCase ? `Focused on Case ${activeCase.caseId}` : 'Platform Wide Investigation Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Copilot Drawer"
            className="p-1.5 text-[#434655] hover:text-[#191c1e] rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                    : 'bg-[#f2f4f6] text-[#191c1e] border border-[#e1e2e4] rounded-bl-none shadow-sm'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Grounding Evidence Citations */}
                {msg.citedEvidence && msg.citedEvidence.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#e1e2e4]">
                    <span className="text-[10px] uppercase font-semibold text-[#434655] block mb-1">
                      Cited Evidence Sources:
                    </span>
                    <ul className="space-y-0.5 text-[11px] text-blue-700 font-mono">
                      {msg.citedEvidence.map((ev, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>›</span> <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-[#737686] mt-1 px-1">{msg.timestamp}</span>

              {/* Suggested Quick Action Chips */}
              {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                  {msg.actionSuggestions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(act)}
                      disabled={isLoading}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#f8f9fb] hover:bg-[#edeef0] text-[#191c1e] border border-[#e1e2e4] transition-colors text-left shadow-xs cursor-pointer"
                    >
                      💡 {act}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#434655] p-2 bg-[#f8f9fb] rounded-lg">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce delay-200"></span>
              <span>Copilot cross-referencing case telemetry &amp; SOPs...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#e1e2e4] bg-[#f8f9fb]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage(inputPrompt);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder={activeCase ? `Ask Copilot about Case ${activeCase.caseId}...` : "Ask Copilot about PayPal fraud patterns..."}
              className="flex-1 bg-white border border-[#e1e2e4] rounded-lg px-3.5 py-2 text-xs text-[#191c1e] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Send
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[#737686]">
            <span>Press Enter to send · Grounded in case telemetry</span>
            <span>Zero hallucination policy</span>
          </div>
        </div>
      </div>
    </div>
  );
};
