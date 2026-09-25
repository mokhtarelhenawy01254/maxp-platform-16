import React, { useState } from 'react';
import { Bot, ChevronDown, History, RotateCcw, X } from 'lucide-react';
import { SPECIALIST_AGENTS, SpecialistAgent } from './specialists';

interface CopilotHeaderProps {
  selectedAgent: SpecialistAgent;
  onSelectAgent: (agent: SpecialistAgent) => void;
  pageContextLabel: string;
  showSessionsList: boolean;
  onToggleSessionsList: () => void;
  onNewSession: () => void;
  onClose: () => void;
}

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  selectedAgent,
  onSelectAgent,
  pageContextLabel,
  showSessionsList,
  onToggleSessionsList,
  onNewSession,
  onClose,
}) => {
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#121214]">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setIsAgentMenuOpen((prev) => !prev)}
          className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/5 transition-colors group text-right"
          aria-label="تبديل تخصص الوكيل"
        >
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bot className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {selectedAgent.name}
              </h3>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[210px]">
              سياق: {pageContextLabel}
            </p>
          </div>
        </button>
      </div>

      {/* Specialist Dropdown Menu */}
      {isAgentMenuOpen && (
        <div className="absolute top-14 right-4 z-50 w-72 rounded-xl border border-white/10 bg-[#18181b] p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1 text-[11px] font-medium text-slate-400 border-b border-white/5 mb-1">
            اختر تخصص الوكيل المطلوب:
          </div>
          {SPECIALIST_AGENTS.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => {
                onSelectAgent(agent);
                setIsAgentMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-right transition-colors ${
                selectedAgent.id === agent.id
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'hover:bg-white/5 text-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-medium">{agent.name}</div>
                <div className="text-[10px] text-slate-400">{agent.title}</div>
              </div>
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
                {agent.badge}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleSessionsList}
          className={`p-1.5 rounded-lg transition-colors ${
            showSessionsList ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="سجل الجلسات السحابية"
          aria-label="سجل الجلسات السحابية"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title="بدء جلسة جديدة"
          aria-label="بدء جلسة جديدة"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title="إغلاق (Esc)"
          aria-label="إغلاق المساعد"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
