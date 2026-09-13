import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioEntity, StudioMessage, StudioSession, StudioQuickPrompt } from "./types";
import { AgentStudioMarkdownMessage } from "./AgentStudioMarkdownMessage";

export interface AgentStudioChatFeedProps {
  selectedEntity?: StudioEntity | null;
  activeSession: StudioSession;
  loading: boolean;
  onSendMessage: (text: string) => void;
  quickPrompts?: StudioQuickPrompt[];
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  emptyStateIcon?: LucideIcon;
  inputPlaceholder?: string;
  onNewSession?: () => void;
}

export const AgentStudioChatFeed: React.FC<AgentStudioChatFeedProps> = ({
  selectedEntity,
  activeSession,
  loading,
  onSendMessage,
  quickPrompts = [],
  emptyStateTitle = "ابدأ المحادثة مع الوكيل الذكي",
  emptyStateSubtitle = "أنا هنا لمساعدتك في تحليل البيانات واتخاذ القرارات وتنفيذ الإجراءات بسرعة وأمان.",
  emptyStateIcon: EmptyIcon = Sparkles,
  inputPlaceholder = "اكتب سؤالك أو اطلب تحليلاً أو تعديلاً...",
  onNewSession,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopySessionId = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeSession?.id) return;
    navigator.clipboard.writeText(activeSession.id);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, loading]);

  const handleSend = (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    onSendMessage(textToSend);
    setInputMessage("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = Array.isArray(activeSession?.messages) ? activeSession.messages : [];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 min-h-0 overflow-hidden">
      {/* Messages List Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <EmptyIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              {emptyStateTitle}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {emptyStateSubtitle}
            </p>

            {/* Quick action prompts in empty state */}
            {quickPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.generatePrompt(selectedEntity))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition text-right cursor-pointer active:scale-[0.98]"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-xs ${
                    isUser
                      ? "bg-indigo-600"
                      : "bg-slate-900 dark:bg-slate-800 text-indigo-400 border border-slate-700/50"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-xs"
                      : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
                  }`}
                >
                  {/* Tool execution indicators */}
                  {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-1">
                      {msg.toolCalls.map((t: any, idx: number) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 ml-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{t.name || "أداة ذكية"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Markdown Content */}
                  <AgentStudioMarkdownMessage content={msg.text} isUser={isUser} />

                  {/* Timestamp */}
                  {msg.timestamp && (
                    <div
                      className={`text-[9px] mt-1.5 opacity-60 tabular-nums ${
                        isUser ? "text-indigo-200 text-left" : "text-slate-400 text-right"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 flex-row items-center">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-800 text-indigo-400 border border-slate-700/50">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>جاري التحليل واستدعاء الأدوات...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Carousel bar above input */}
      {quickPrompts.length > 0 && (
        <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto flex gap-1.5 no-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => handleSend(qp.generatePrompt(selectedEntity))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition whitespace-nowrap cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input & Footer Controls */}
      <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputMessage.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
            title="إرسال"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 rtl:-scale-x-100" />
            )}
          </button>
        </div>

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              الجلسة: {activeSession?.id ? activeSession.id.slice(-8) : "—"}
            </span>
            <button
              type="button"
              onClick={handleCopySessionId}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="نسخ معرف الجلسة"
            >
              {copiedSessionId ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span>الذاكرة السحابية نشطة</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </footer>
    </div>
  );
};
