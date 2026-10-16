import React, { useState } from "react";
import {
  FolderArchive,
  Plus,
  Trash2,
  X,
  Search,
  MessageSquare,
  Clock,
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
        className="w-full max-w-md h-full bg-card border-r border-border/70 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جلسة جديدة</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              aria-label="إغلاق السجل"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/50">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="البحث في الجلسات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
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
                      ? "border-primary/60 bg-primary/5 text-foreground shadow-xs"
                      : "border-border/60 hover:border-border bg-card/60 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                        )}
                        <h3 className="text-xs font-semibold text-foreground truncate">
                          {session.title || "جلسة جديدة"}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.updatedAt || session.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 font-mono tabular-nums">
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
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                      title="حذف الجلسة"
                      aria-label="حذف الجلسة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Confirmation modal if deleting */}
                  {sessionToDelete === session.id && (
                    <div
                      className="absolute inset-0 bg-card/98 rounded-xl flex items-center justify-between p-3 z-10 animate-in fade-in border border-destructive/30 shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs font-semibold text-destructive">
                        تأكيد حذف هذه الجلسة؟
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSession(session.id);
                            setSessionToDelete(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold transition cursor-pointer"
                        >
                          حذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(null)}
                          className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-medium transition cursor-pointer hover:bg-muted/80"
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
