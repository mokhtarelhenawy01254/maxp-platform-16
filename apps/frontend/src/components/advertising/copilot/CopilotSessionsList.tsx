import React from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { CopilotSession } from "./types";

interface CopilotSessionsListProps {
  sessions: CopilotSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onBackToChat: () => void;
  onClearAll: () => void;
}

export const CopilotSessionsList: React.FC<CopilotSessionsListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onBackToChat,
  onClearAll,
}) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("ar-EG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBackToChat}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
        >
          <ChevronRight className="h-4 w-4" />
          <span>العودة للمحادثة</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800 dark:text-white">
            الجلسات السابقة
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {sessions.length}
          </span>
        </div>
      </div>

      {/* Action Button: Start New Session */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewSession}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-2.5 text-xs font-black text-white shadow-md shadow-blue-500/10 transition-all hover:scale-[1.01] hover:shadow-lg active:scale-95"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          <span>بدء جلسة جديدة (+ New Chat)</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 scrollbar-thin">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const lastMsg = session.messages[session.messages.length - 1];
          const msgCount = session.messages.length;

          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-3 transition-all duration-200 ${
                isActive
                  ? "border-blue-500 bg-blue-50/40 shadow-xs dark:border-blue-600 dark:bg-blue-950/20"
                  : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate text-xs font-black text-slate-900 dark:text-white">
                    {typeof session.title === "string" && session.title.trim() ? session.title : "محادثة ميديا باير"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      النشطة
                    </span>
                  )}
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      title="حذف الجلسة"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="rounded-lg p-1 text-slate-400 opacity-60 transition-opacity hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {lastMsg && (
                <p className="line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {lastMsg.sender === "user" ? "أنت: " : "الإيجنت: "}
                  {typeof lastMsg.text === "string" ? lastMsg.text : ""}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-1 text-[10px] text-slate-400 dark:border-slate-800/80">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(session.updatedAt || session.createdAt)}
                </span>
                <span>{msgCount} رسالة</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls */}
      {sessions.length > 2 && (
        <div className="border-t border-slate-100 bg-white p-2.5 text-center dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
          >
            مسح كافة الجلسات القديمة
          </button>
        </div>
      )}
    </div>
  );
};

export default CopilotSessionsList;
