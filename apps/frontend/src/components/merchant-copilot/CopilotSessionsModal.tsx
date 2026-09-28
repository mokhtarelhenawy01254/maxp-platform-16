import React, { useState } from 'react';
import { Trash2, Plus, MessageSquare, Link2, Check, ExternalLink } from 'lucide-react';
import type { CopilotSession } from './types';
import { copyCopilotSessionLink, openCopilotSessionInNewTab } from './copilotLinkUtils';

interface CopilotSessionsModalProps {
  sessions: CopilotSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const CopilotSessionsModal: React.FC<CopilotSessionsModalProps> = ({
  sessions,
  activeSessionId,
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
    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">سجل الجلسات السحابية</span>
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
            {sessions.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>جلسة جديدة</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-xs text-slate-400 dark:text-slate-500">
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
                className={`group w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-right cursor-pointer ${
                  isActive
                    ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-semibold shadow-2xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="truncate text-xs font-medium max-w-[180px] sm:max-w-[240px]">
                  {s.title || 'محادثة بدون عنوان'}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums ml-1">
                    {new Date(s.updatedAt).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopy(s.id, e)}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-750 cursor-pointer"
                    title="انسخ لينك الجلسة"
                    aria-label="انسخ لينك الجلسة"
                  >
                    {copiedId === s.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Open in new tab Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpen(s.id, e)}
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-750 cursor-pointer"
                    title="افتح في تاب جديد"
                    aria-label="افتح في تاب جديد"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-all rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-750 cursor-pointer"
                    title="حذف الجلسة"
                    aria-label="حذف الجلسة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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

