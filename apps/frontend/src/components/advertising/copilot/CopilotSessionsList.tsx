import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    <div className="flex h-full flex-col bg-card text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card px-3.5 py-3">
        <button
          type="button"
          onClick={onBackToChat}
          className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="size-4" />
          <span>العودة للمحادثة</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">
            الجلسات السابقة
          </span>
          <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold font-mono tabular-nums">
            {sessions.length}
          </span>
        </div>
      </div>

      {/* Action Button: Start New Session */}
      <div className="p-3 border-b border-border/40">
        <button
          type="button"
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground p-2.5 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
        >
          <Plus className="size-4" />
          <span>بدء جلسة جديدة</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3 no-scrollbar">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const lastMsg = session.messages[session.messages.length - 1];
          const msgCount = session.messages.length;

          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition-all duration-150",
                isActive
                  ? "border-primary/50 bg-primary/5 shadow-2xs"
                  : "border-border/60 bg-card hover:border-border/90 hover:bg-muted/30 shadow-2xs",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg shadow-2xs",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5" />
                  </div>
                  <span className="truncate text-xs font-semibold text-foreground">
                    {typeof session.title === "string" && session.title.trim() ? session.title : "محادثة ميديا باير"}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold font-mono tabular-nums">
                      <CheckCircle2 className="size-2.5" />
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
                      className="rounded-lg p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {lastMsg && (
                <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">
                  {lastMsg.sender === "user" ? "أنت: " : "الإيجنت: "}
                  {typeof lastMsg.text === "string" ? lastMsg.text : ""}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between border-t border-border/40 pt-1.5 text-[10px] text-muted-foreground font-mono tabular-nums">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
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
        <div className="border-t border-border/60 bg-muted/20 p-2.5 text-center">
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors"
          >
            مسح كافة الجلسات القديمة
          </button>
        </div>
      )}
    </div>
  );
};

export default CopilotSessionsList;
