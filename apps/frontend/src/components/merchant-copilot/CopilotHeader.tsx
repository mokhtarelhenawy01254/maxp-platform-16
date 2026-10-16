import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, History, RotateCcw, X, Cpu, Check, Link2, ExternalLink, SlidersHorizontal, Bot } from 'lucide-react';
import { SPECIALIST_AGENTS, SpecialistAgent } from './specialists';
import { copyCopilotSessionLink, openCopilotSessionInNewTab } from './copilotLinkUtils';
import { apiClient } from '../../services/apiClient';
import { cn } from '@/lib/utils';

/**
 * عدّاد المسودات المعلقة — يظهر بجوار اسم الوكيل حتى لا تموت مسودة اعتماد
 * منسية في الطابور من غير ما التاجر يشوفها (يظهر العدد عند فتح المساعد).
 */
const PendingApprovalsBadge: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ approvals?: unknown[]; count?: number }>('/agent-approvals?status=pending')
      .then((res) => {
        if (cancelled) return;
        const approvals = res.data?.approvals;
        setCount(Array.isArray(approvals) ? approvals.length : res.data?.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null || count <= 0) return null;
  const label = `${count} مسودة اعتماد معلقة`;
  return (
    <span
      className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400"
      title={label}
      aria-label={label}
    >
      {count}
    </span>
  );
};

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
    <header className="relative flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/60 bg-card/95 text-foreground backdrop-blur-md select-none">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAgentMenuOpen((prev) => !prev)}
          className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-muted/40 transition-colors group text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          aria-label="تبديل تخصص الوكيل"
        >
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary/20 transition-colors shadow-2xs text-sm shrink-0">
            {selectedAgent.icon || <Cpu className="size-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight">
                {selectedAgent.name}
              </h3>
              <PendingApprovalsBadge />
              {selectedAgent.isDefault && (
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.2 font-medium font-mono">
                  لوحة التحكم
                </span>
              )}
              <ChevronDown
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform duration-150",
                  isAgentMenuOpen && "rotate-180 text-foreground",
                )}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{pageContextLabel}</span>
              {contextReason && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-1.5 py-0.2 text-[9px] font-medium text-foreground">
                  <span className="size-1 rounded-full bg-emerald-500" />
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
          className="absolute top-14 right-4 z-50 w-80 rounded-2xl border border-border/70 bg-card p-1.5 shadow-xl text-foreground backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1 flex items-center justify-between">
            <span>فريق وكلاء المتجر المتاحين</span>
            <span className="text-[10px] text-muted-foreground font-sans font-normal">اختر للتحدث معه</span>
          </div>
          <div className="space-y-0.5 max-h-72 overflow-y-auto no-scrollbar">
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
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-right transition-all",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                      : "hover:bg-muted/40 text-foreground border border-transparent",
                  )}
                >
                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="size-4 shrink-0 flex items-center justify-center">
                        {agent.icon || <Bot className="size-3.5" />}
                      </span>
                      <span className="text-xs truncate">{agent.name}</span>
                      {agent.isDefault && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-mono">
                          لوحة التحكم
                        </span>
                      )}
                      {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5 font-normal">
                      {agent.title}
                    </div>
                  </div>
                  <span className="rounded-md bg-muted border border-border/60 px-1.5 py-0.5 text-[9px] font-mono tabular-nums text-muted-foreground shrink-0">
                    {agent.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                setIsAgentMenuOpen(false);
                navigate('/admin/ai-hub?tab=routing');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
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
          className={cn(
            "size-8 rounded-lg flex items-center justify-center transition-colors active:scale-95",
            showSessionsList
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
          title="سجل الجلسات السحابية"
          aria-label="سجل الجلسات السحابية"
        >
          <History className="size-4" />
        </button>

        <button
          type="button"
          onClick={onNewSession}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95 cursor-pointer"
          title="بدء محادثة جديدة"
          aria-label="بدء محادثة جديدة"
        >
          <RotateCcw className="size-4" />
        </button>

        {activeSessionId && (
          <>
            <button
              type="button"
              onClick={handleCopyCurrentSession}
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors active:scale-95 cursor-pointer"
              title="نسخ لينك الجلسة الحالية"
              aria-label="نسخ لينك الجلسة الحالية"
            >
              {hasCopied ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Link2 className="size-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openCopilotSessionInNewTab(activeSessionId)}
              className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/40 transition-colors active:scale-95 cursor-pointer"
              title="افتح في تاب جديد"
              aria-label="افتح في تاب جديد"
            >
              <ExternalLink className="size-4" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95 mr-1 cursor-pointer"
          title="إغلاق (Esc)"
          aria-label="إغلاق المساعد"
        >
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
};

export default CopilotHeader;
