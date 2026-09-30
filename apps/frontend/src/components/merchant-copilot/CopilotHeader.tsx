import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, History, RotateCcw, X, Cpu, Check, Link2, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { SPECIALIST_AGENTS, SpecialistAgent } from './specialists';
import { copyCopilotSessionLink, openCopilotSessionInNewTab } from './copilotLinkUtils';

interface CopilotHeaderProps {
  selectedAgent: SpecialistAgent;
  onSelectAgent: (agent: SpecialistAgent) => void;
  specialists?: SpecialistAgent[];
  contextReason?: string | null;
  pageContextLabel: string;
  showSessionsList: boolean;
  onToggleSessionsList: () => void;
  onNewSession: () => void;
  onClose: () => void;
  activeSessionId?: string | null;
}

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  selectedAgent,
  onSelectAgent,
  specialists,
  contextReason,
  pageContextLabel,
  showSessionsList,
  onToggleSessionsList,
  onNewSession,
  onClose,
  activeSessionId,
}) => {
  const navigate = useNavigate();
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopyCurrentSession = async () => {
    if (!activeSessionId) return;
    const ok = await copyCopilotSessionLink(activeSessionId);
    if (ok) {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1800);
    }
  };

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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors shadow-2xs text-sm">
            {selectedAgent.icon || <Cpu className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
                {selectedAgent.name}
              </h3>
              {selectedAgent.isDefault && (
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50 rounded px-1.5 py-0.2 font-medium">
                  لوحة التحكم
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-160 ${
                  isAgentMenuOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : ''
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{pageContextLabel}</span>
              {contextReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 text-[9px] font-medium text-slate-600 dark:text-slate-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  {contextReason}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Specialist Dropdown Menu */}
      {isAgentMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-14 right-4 z-50 w-84 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
            <span>فريق وكلاء المتجر المتاحين</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans font-normal">اختر للتحدث معه</span>
          </div>
          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {(specialists || SPECIALIST_AGENTS).map((agent) => {
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
                      <span className="text-sm shrink-0">{agent.icon || '🤖'}</span>
                      <span className="text-xs truncate">{agent.name}</span>
                      {agent.isDefault && (
                        <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 px-1 rounded">
                          لوحة التحكم
                        </span>
                      )}
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

          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsAgentMenuOpen(false);
                navigate('/admin/ai-hub?tab=routing');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
            >
              <SlidersHorizontal className="size-3" />
              <span>إعدادات وتوجيه الوكلاء والقنوات</span>
            </button>
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
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
          title="بدء محادثة جديدة"
          aria-label="بدء محادثة جديدة"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {activeSessionId && (
          <>
            <button
              type="button"
              onClick={handleCopyCurrentSession}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
              title="نسخ لينك الجلسة الحالية"
              aria-label="نسخ لينك الجلسة الحالية"
            >
              {hasCopied ? (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openCopilotSessionInNewTab(activeSessionId)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
              title="افتح في تاب جديد"
              aria-label="افتح في تاب جديد"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 mr-1 cursor-pointer"
          title="إغلاق (Esc)"
          aria-label="إغلاق المساعد"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
