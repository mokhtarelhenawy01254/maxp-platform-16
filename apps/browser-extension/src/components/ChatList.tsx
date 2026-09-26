import React, { useEffect, useRef } from 'react';
import { Globe, User, Bot, AlertCircle, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../types/extension';

interface ChatListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onRetry?: (message: ChatMessage) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ messages, isLoading, onRetry }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isError = msg.status === 'error';

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
          >
            {/* Header info */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
              {isUser ? (
                <>
                  <span>أنت</span>
                  <User className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-indigo-400" />
                  <span className="font-medium text-slate-300">MaxP Copilot</span>
                </>
              )}
              <span className="text-[9px] font-mono opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Bubble */}
            <div
              className={`relative group rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[92%] break-words ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : isError
                  ? 'bg-rose-950/40 text-rose-200 border border-rose-800/40 rounded-bl-xs'
                  : 'bg-[#151518] text-slate-200 border border-white/10 rounded-bl-xs'
              }`}
            >
              {/* Tab context pill if user attached it */}
              {isUser && msg.tabContext && (
                <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-indigo-400/30 text-[10px] text-indigo-100">
                  <Globe className="w-3 h-3 shrink-0 opacity-80" />
                  <span className="truncate max-w-[200px]" title={msg.tabContext.url}>
                    {msg.tabContext.title}
                  </span>
                </div>
              )}

              {/* Message text with basic whitespace preservation */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Action tools on bot message */}
              {!isUser && !isError && (
                <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
                    title="نسخ الإجابة"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {/* Error retry */}
              {isError && onRetry && (
                <div className="mt-2 flex items-center gap-2 text-[10px]">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>فشل الإرسال.</span>
                  <button
                    type="button"
                    onClick={() => onRetry(msg)}
                    className="underline text-rose-300 hover:text-white font-medium cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#151518] border border-white/5 text-slate-400 max-w-[140px]">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-100" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse delay-200" />
          </span>
          <span className="text-[10px] font-mono">جارِ المعالجة…</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};
