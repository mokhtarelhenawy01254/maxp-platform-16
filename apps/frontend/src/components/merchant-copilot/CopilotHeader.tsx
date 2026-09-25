import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, History, RotateCcw, X, Cpu, Check } from 'lucide-react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsAgentMenuOpen(false);
      }
    };
    if (isAgentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAgentMenuOpen]);

  return (
    <header className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-[#0c0c0e]/95 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAgentMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.04] transition-colors group text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
          aria-label="تبديل تخصص الوكيل"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 border border-white/[0.1] text-zinc-300 group-hover:border-zinc-500 group-hover:text-white transition-colors">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight">
                {selectedAgent.name}
              </h3>
              <ChevronDown
                className={`h-3 w-3 text-zinc-400 transition-transform duration-160 ${
                  isAgentMenuOpen ? 'rotate-180 text-zinc-200' : ''
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-emerald-400/90" />
              <span className="truncate max-w-[190px]">{pageContextLabel}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Specialist Dropdown Menu */}
      {isAgentMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-12 right-4 z-50 w-80 rounded-xl border border-white/[0.12] bg-[#121215] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] mb-1 flex items-center justify-between">
            <span>تخصص الوكيل</span>
            <span className="text-[9px] text-zinc-500 font-sans">اختر لتغيير الدور</span>
          </div>
          <div className="space-y-0.5">
            {SPECIALIST_AGENTS.map((agent) => {
              const isSelected = selectedAgent.id === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    onSelectAgent(agent);
                    setIsAgentMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-right transition-all ${
                    isSelected
                      ? 'bg-zinc-800/90 text-zinc-100 border border-white/[0.08]'
                      : 'hover:bg-white/[0.04] text-zinc-300 hover:text-zinc-100 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{agent.name}</span>
                      {isSelected && <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {agent.title}
                    </div>
                  </div>
                  <span className="rounded bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 flex-shrink-0">
                    {agent.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleSessionsList}
          className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
            showSessionsList
              ? 'bg-zinc-800 text-zinc-100 border border-white/[0.1]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
          }`}
          title="سجل الجلسات السحابية"
          aria-label="سجل الجلسات السحابية"
        >
          <History className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95"
          title="بدء محادثة جديدة"
          aria-label="بدء محادثة جديدة"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-white/[0.05] transition-colors active:scale-95 ml-1"
          title="إغلاق (Esc)"
          aria-label="إغلاق المساعد"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
