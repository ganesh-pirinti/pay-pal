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
  }, [messages, isLoading]);

  // Update messages when active case changes
  useEffect(() => {
    if (activeCase && activeCase.caseId !== lastCaseIdRef.current) {
      lastCaseIdRef.current = activeCase.caseId;
      const caseId = activeCase.caseId;
      const score = activeCase.overallRiskScore;
      const cat = activeCase.overallRiskCategory;
      const merchant = activeCase.merchantId || 'Documentary Entity';
      const status = activeCase.humanInTheLoop.status;
      const timer = setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: `case-focus-${Date.now()}`,
            sender: 'copilot',
            text: `🔍 **Context Switch:** Now focused on **Case ${caseId}**.\n• Risk Score: **${score}/100** (${cat})\n• Merchant: **${merchant}**\n• HITL Status: **${status}**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            actionSuggestions: [
              'Summarize this investigation',
              'Explain key risk drivers',
              'Evaluate counter-hypotheses',
              'Suggest next underwriting actions'
            ]
          }
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeCase]);

  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'underwriter',
          'x-user-id': 'SEC-USER-001'
        },
        body: JSON.stringify({
          message: query,
          caseId: activeCase?.caseId
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
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col h-full shadow-2xl animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg">
              <span className="font-black text-sm">AI</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                PayPal Copilot
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Grounded
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {activeCase ? `Focused on Case ${activeCase.caseId}` : 'Platform Wide Investigation Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Copilot Drawer"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Grounding Evidence Citations */}
                {msg.citedEvidence && msg.citedEvidence.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Cited Evidence Sources:
                    </span>
                    <ul className="space-y-0.5 text-[11px] text-cyan-300">
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
              <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>

              {/* Suggested Quick Action Chips */}
              {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[92%]">
                  {msg.actionSuggestions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(act)}
                      disabled={isLoading}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-left"
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
            <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200"></span>
              <span>Copilot cross-referencing case telemetry & SOPs...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90">
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
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-colors shadow-md"
            >
              Send
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
            <span>Press Enter to send · Grounded in case telemetry</span>
            <span>Zero hallucination policy</span>
          </div>
        </div>
      </div>
    </div>
  );
};
