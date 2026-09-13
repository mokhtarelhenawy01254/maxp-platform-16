import React, { useState } from "react";
import {
  FolderArchive,
  Plus,
  Trash2,
  X,
  Search,
  MessageSquare,
  Clock,
  Sparkles,
} from "lucide-react";
import type { StudioSession } from "./types";

interface AgentStudioSessionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudioSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  title?: string;
}

export const AgentStudioSessionsDrawer: React.FC<AgentStudioSessionsDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  title = "سجل الجلسات السحابية",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("ar-EG", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="flex-1 cursor-pointer" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        aria-label={title}
        className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {sessions.length} جلسة محفوظة سحابياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNewSession();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جلسة جديدة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="البحث في الجلسات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <FolderArchive className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs font-medium">لا توجد جلسات مطابقة</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const msgCount = Array.isArray(session.messages) ? session.messages.length : 0;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  className={`group p-3 rounded-xl border transition cursor-pointer relative ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-shrink-0 animate-pulse" />
                        )}
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {session.title || "جلسة جديدة"}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.updatedAt || session.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 tabular-nums">
                          <MessageSquare className="w-3 h-3" />
                          {msgCount} رسائل
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      title="حذف الجلسة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Confirmation modal if deleting */}
                  {sessionToDelete === session.id && (
                    <div
                      className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-xl flex items-center justify-between p-3 z-10 animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        تأكيد حذف هذه الجلسة؟
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSession(session.id);
                            setSessionToDelete(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
