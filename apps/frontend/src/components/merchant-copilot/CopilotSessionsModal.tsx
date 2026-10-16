import React, { useState } from 'react';
import { Trash2, Plus, MessageSquare, Link2, Check, ExternalLink } from 'lucide-react';
import type { CopilotSession } from './types';
import { copyCopilotSessionLink, openCopilotSessionInNewTab } from './copilotLinkUtils';
import { cn } from '@/lib/utils';

interface CopilotSessionsModalProps {
  sessions: CopilotSession[];
  activeSessionId: string | null;
  loading?: boolean;
  sessionsError?: string | null;
  onRetry?: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const CopilotSessionsModal: React.FC<CopilotSessionsModalProps> = ({
  sessions,
  activeSessionId,
  loading = false,
  sessionsError = null,
  onRetry,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyCopilotSessionLink(id);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const handleOpen = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openCopilotSessionInNewTab(id);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-card text-foreground select-none">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <MessageSquare className="size-3.5" />
          </span>
          <span className="text-xs font-semibold text-foreground">سجل الجلسات السحابية</span>
          <span className="rounded-md bg-muted border border-border/60 px-1.5 py-0.2 text-[10px] font-mono tabular-nums text-muted-foreground">
            {sessions.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>جلسة جديدة</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-muted-foreground animate-pulse">
          جاري مزامنة وسحب الجلسات السحابية...
        </div>
      ) : sessionsError ? (
        <div className="text-center py-12 px-4 space-y-3">
          <div className="size-9 rounded-xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center border border-destructive/20">
            <MessageSquare className="size-4" />
          </div>
          <div className="text-xs font-semibold text-destructive">
            تعذر تحميل الجلسات السحابية
          </div>
          <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
            {sessionsError}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium cursor-pointer active:scale-95 transition-all"
            >
              <span>إعادة المحاولة</span>
            </button>
          )}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-xs text-muted-foreground">
          لا توجد جلسات محفوظة. سيتم حفظ محادثاتك تلقائياً في السحابة.
        </div>
      ) : (
        <div className="space-y-1.5">
          {sessions.map((s) => {
            const isActive = activeSessionId === s.id;
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSession(s.id);
                  }
                }}
                className={cn(
                  "group w-full flex items-center justify-between p-3 rounded-xl border transition-all text-right cursor-pointer",
                  isActive
                    ? "border-primary/50 bg-primary/5 text-foreground font-semibold shadow-2xs"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <div className="truncate text-xs font-medium max-w-[180px] sm:max-w-[240px]">
                  {s.title || 'محادثة بدون عنوان'}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums ml-1">
                    {new Date(s.updatedAt).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopy(s.id, e)}
                    className="p-1 text-muted-foreground hover:text-primary opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-muted cursor-pointer"
                    title="انسخ لينك الجلسة"
                    aria-label="انسخ لينك الجلسة"
                  >
                    {copiedId === s.id ? (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Link2 className="size-3.5" />
                    )}
                  </button>

                  {/* Open in new tab Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpen(s.id, e)}
                    className="p-1 text-muted-foreground hover:text-primary opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-muted cursor-pointer"
                    title="افتح في تاب جديد"
                    aria-label="افتح في تاب جديد"
                  >
                    <ExternalLink className="size-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-destructive/10 cursor-pointer"
                    title="حذف الجلسة"
                    aria-label="حذف الجلسة"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CopilotSessionsModal;
