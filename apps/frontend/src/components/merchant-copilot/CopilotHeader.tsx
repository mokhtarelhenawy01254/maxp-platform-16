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
    <header className="relative flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAgentMenuOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="تبديل تخصص الوكيل"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors shadow-2xs">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
                {selectedAgent.name}
              </h3>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-160 ${
                  isAgentMenuOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[200px]">{pageContextLabel}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Specialist Dropdown Menu */}
      {isAgentMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-14 right-4 z-50 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span>تخصص الوكيل التنفيذي</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-normal">اختر لتغيير الدور</span>
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
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-right transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-800/70 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs truncate">{agent.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                      {agent.title}
                    </div>
                  </div>
                  <span className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 px-2 py-0.5 text-[9px] font-mono text-slate-600 dark:text-slate-400 flex-shrink-0">
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
          className={`p-2 rounded-xl transition-colors active:scale-95 ${
            showSessionsList
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="سجل الجلسات السحابية"
          aria-label="سجل الجلسات السحابية"
        >
          <History className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
          title="بدء محادثة جديدة"
          aria-label="بدء محادثة جديدة"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 mr-1"
          title="إغلاق (Esc)"
          aria-label="إغلاق المساعد"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
