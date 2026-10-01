import React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  MessageSquare,
  Search,
  Star,
  Pin,
  X,
  Loader2,
  Link2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import type { Session } from "../types/sandbox.types";

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  formatCost: (cost: number) => string;
  onCopySessionLink?: (sessionId: string) => void;
  collapsed?: boolean;
  isSessionsLoading?: boolean;
  width?: number;
  isSuper?: boolean;
  onClose?: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onUpdateTitle,
  formatCost,
  onCopySessionLink,
  collapsed = false,
  isSessionsLoading = false,
  width = 256,
  isSuper = false,
  onClose,
}) => {
  const [search, setSearch] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = React.useState<string | null>(null);

  const handleTogglePin = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const sortedSessions = React.useMemo(() => {
    const filtered = sessions.filter((s) =>
      s.title.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [sessions, search, pinnedIds]);

  const handleDoubleClick = (session: Session) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveTitle = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="self-stretch flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 overflow-hidden"
      style={{ width: collapsed ? 0 : width, minWidth: collapsed ? 0 : width }}
    >
      {/* Header & Add Button */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Sessions
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onCreateSession}
              className="size-7 hover:bg-slate-50 dark:hover:bg-slate-805 text-indigo-600 dark:text-indigo-400 cursor-pointer"
              title="New Session"
            >
              <Plus className="size-4" />
            </Button>
            {onClose && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="size-7 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 dark:bg-slate-950 dark:border-slate-800 focus-visible:ring-indigo-650"
          />
        </div>
      </div>

      {/* Session Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1 space-y-1">
        {isSessionsLoading && (
          <div className="px-3 py-4 space-y-2.5">
            <div className="h-9 bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
            <div className="h-9 bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
            <div className="h-9 bg-slate-50 dark:bg-slate-950/40 rounded-lg animate-pulse" />
          </div>
        )}

        {!isSessionsLoading && sortedSessions.length === 0 && sessions.length > 0 && (
          <div className="p-6 text-center space-y-2">
            <Search className="size-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No matches found</p>
          </div>
        )}

        {!isSessionsLoading && sortedSessions.length === 0 && sessions.length === 0 && (
          <div className="p-6 text-center space-y-2">
            <MessageSquare className="size-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No sessions yet</p>
            <p className="text-[10px] text-slate-400">Click + to start a session</p>
          </div>
        )}

        {sortedSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const score = session.score;
          const isPinned = pinnedIds.has(session.id);

          return (
            <div
              key={session.id}
              onClick={() => {
                onSelectSession(session.id);
                onClose?.();
              }}
              onDoubleClick={() => handleDoubleClick(session)}
              className={`p-2.5 rounded-lg cursor-pointer transition-all duration-150 relative group ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50"
                  : "hover:bg-slate-50 dark:hover:bg-slate-950 border border-transparent"
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <button
                  onClick={(e) => handleTogglePin(e, session.id)}
                  className={`flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity ${
                    isPinned ? "text-amber-500 opacity-100" : "text-slate-400"
                  }`}
                  title={isPinned ? "Unpin session" : "Pin session"}
                >
                  <Pin className={`size-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
                </button>

                {editingId === session.id ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 outline-none font-medium text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-indigo-650"
                  />
                ) : (
                  <span className={`flex-1 text-xs truncate font-medium ${
                    isActive ? "text-indigo-700 dark:text-indigo-400 font-bold" : "text-slate-700 dark:text-slate-350"
                  }`}>
                    {session.title}
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCopySessionLink) {
                      onCopySessionLink(session.id);
                    } else {
                      const origin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://maxp.online";
                      const link = `${origin}/admin/ai-hub?tab=sandbox&sessionId=${encodeURIComponent(session.id)}`;
                      navigator?.clipboard?.writeText?.(link);
                      toast.success("تم نسخ رابط المحادثة بنجاح");
                    }
                    setCopiedSessionId(session.id);
                    setTimeout(() => setCopiedSessionId(null), 2000);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity flex-shrink-0 p-0.5"
                  title="نسخ رابط المحادثة"
                  aria-label="نسخ رابط المحادثة"
                >
                  {copiedSessionId === session.id ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Link2 className="size-3.5" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0"
                  title="Delete session"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Meta details */}
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold select-none">
                {isSuper ? (
                  <>
                <span>{session.messageCount} msgs</span>
                <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <span>{session.toolCallCount} tools</span>

                {score !== undefined && (
                  <>
                    <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="flex items-center gap-0.5">
                      <Star className={`size-3 ${score >= 80 ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      <span>{score}</span>
                    </div>
                  </>
                )}

                <span className="ml-auto font-mono text-[9px] text-slate-400 dark:text-slate-500">
                  {formatCost(session.totalCost)}
                </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {session.messages?.slice(-1)[0]?.role === "user"
                      ? session.messages.slice(-1)[0].content.slice(0, 50) + (session.messages.slice(-1)[0].content.length > 50 ? "..." : "")
                      : session.messages?.slice(-2, -1)[0]?.content.slice(0, 50) || ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightweight Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Delete Session?</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This will permanently delete this session and all its messages. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="h-8 border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deleteConfirmId) {
                    onDeleteSession(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }
                }}
                className="h-8"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
