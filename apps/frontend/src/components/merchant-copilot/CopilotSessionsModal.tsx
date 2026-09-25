import React from 'react';
import { Trash2, Plus, MessageSquare } from 'lucide-react';
import type { CopilotSession } from './types';

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
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#09090b]">
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">سجل الجلسات السحابية</span>
          <span className="rounded bg-white/[0.05] border border-white/[0.06] px-1.5 py-0.2 text-[9px] font-mono text-zinc-400">
            {sessions.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-950 hover:bg-white active:scale-95 transition-all shadow-sm"
        >
          <Plus className="h-3 w-3" />
          <span>جلسة جديدة</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-xs text-zinc-500">
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
                className={`group w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-right cursor-pointer ${
                  isActive
                    ? 'border-white/[0.14] bg-zinc-800/90 text-zinc-100 shadow-sm'
                    : 'border-white/[0.04] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-100'
                }`}
              >
                <div className="truncate text-xs font-medium max-w-[230px]">
                  {s.title || 'محادثة بدون عنوان'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 tabular-nums">
                    {new Date(s.updatedAt).toLocaleDateString('ar-EG', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="p-1 text-zinc-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity"
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
