import React from 'react';
import { Trash2 } from 'lucide-react';
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
    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#09090b]">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <span className="text-xs font-semibold text-slate-300">الجلسات السحابية المحفوظة</span>
        <button
          type="button"
          onClick={onNewSession}
          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs text-white hover:bg-emerald-500 active:scale-95 transition-all"
        >
          + جلسة جديدة
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500">
          لا توجد جلسات سابقة. ابدأ محادثة جديدة وسيتم حفظها سحابياً تلقائياً.
        </div>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
              activeSessionId === s.id
                ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                : 'border-white/5 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
            onClick={() => onSelectSession(s.id)}
          >
            <div className="truncate text-xs font-medium max-w-[240px]">{s.title}</div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 tabular-nums">
                {new Date(s.updatedAt).toLocaleDateString('ar-EG')}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(s.id);
                }}
                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                title="حذف الجلسة"
                aria-label="حذف الجلسة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
