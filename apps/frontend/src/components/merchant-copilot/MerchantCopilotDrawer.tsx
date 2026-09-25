import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  Bot,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  CornerDownLeft,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useExecutiveContext } from './useExecutiveContext';
import { CopilotActionCard } from './CopilotActionCard';
import AgentStudioMarkdownMessage from '../agent-studio/AgentStudioMarkdownMessage';
import type { CopilotMessage, ActionCardData } from './types';

interface MerchantCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MerchantCopilotDrawer: React.FC<MerchantCopilotDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { context, quickPrompts } = useExecutiveContext();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    return `exec_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  });
  const [telemetry, setTelemetry] = useState<{ model?: string; latency_ms?: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input and scroll to bottom when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  // Initial welcome message tailored to current business vertical
  useEffect(() => {
    if (messages.length === 0) {
      const companyLabel = context.companyName || 'منشأتك';
      const welcome: CopilotMessage = {
        id: 'welcome-msg',
        sender: 'assistant',
        text: `أهلاً بك يا فندم! أنا **كريم — المساعد التشغيلي لـ ${companyLabel}**.\n\nأنا متابع معاك كل تفاصيل المنظومة والشاشة الحالية (**${context.pageTitle || context.pathname}**).\n\nيمكنك سؤالي عن الطلبات، المخزون، الإعلانات، أو اتخاذ أي إجراء تشغيلي فوراً دون الحاجة لفتح الإعدادات بنفسك.`,
        timestamp: new Date().toISOString(),
      };
      setMessages([welcome]);
    }
  }, [context.companyName, context.pageTitle, context.pathname, messages.length]);

  // Handle action approvals from Action Cards
  const handleDecision = useCallback(
    async (cardId: string, approved: boolean) => {
      try {
        await apiClient.post(`/agent-approvals/${cardId}/${approved ? 'approve' : 'reject'}`, {
          threadId: sessionId,
          reason: approved ? 'اعتمد بواسطة التاجر من المساعد المباشر' : 'ألغيت بواسطة التاجر',
        });

        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.actionCards) return msg;
            return {
              ...msg,
              actionCards: msg.actionCards.map((c) =>
                c.id === cardId
                  ? { ...c, status: approved ? 'approved' : 'rejected' }
                  : c
              ),
            };
          })
        );
      } catch (err: any) {
        console.error('[Copilot] Approval error:', err);
      }
    },
    [sessionId]
  );

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    const startTime = Date.now();

    try {
      const res = await apiClient.post('/ai/chat/message', {
        message: text,
        sessionId,
        agentId: 'store-manager-agent',
        executiveContext: context,
      });

      const replyText = res.data?.reply || res.data?.message || 'تمت معالجة طلبك بنجاح.';
      const toolCalls = res.data?.toolCalls || res.data?.tool_calls || [];

      // Extract action cards if tools require approval or returned pending drafts
      const detectedActionCards: ActionCardData[] = [];
      for (const tc of toolCalls) {
        if (
          tc.status === 'pending_approval' ||
          tc.output?.status === 'PENDING_APPROVAL' ||
          tc.arguments?.requireConfirmation ||
          tc.name?.includes('price') ||
          tc.name?.includes('cancel') ||
          tc.name?.includes('discount')
        ) {
          detectedActionCards.push({
            id: tc.id || `action-${Date.now()}`,
            toolCallId: tc.id,
            title: tc.name,
            actionType: tc.name?.includes('price')
              ? 'price_update'
              : tc.name?.includes('cancel')
              ? 'order_cancel'
              : tc.name?.includes('discount')
              ? 'discount_create'
              : 'generic',
            summary: tc.output?.summary || tc.output?.message || 'إجراء ينتظر اعتمادك النهائي لتطبيقه في قاعدة البيانات.',
            parameters: tc.arguments || {},
            status: 'pending',
          });
        }
      }

      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
        toolCalls,
        actionCards: detectedActionCards.length > 0 ? detectedActionCards : undefined,
        telemetry: {
          model: res.data?.modelSelection?.model || 'DeepSeek-V3',
          latency_ms: Date.now() - startTime,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setTelemetry({
        model: assistantMsg.telemetry?.model,
        latency_ms: assistantMsg.telemetry?.latency_ms,
      });
    } catch (err: any) {
      const errorText =
        err.response?.data?.error || err.message || 'تعذر الاتصال بالمساعد الذكي.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ عذراً يا فندم: ${errorText}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionId(`exec_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Surface */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-md sm:max-w-lg bg-[#09090b] text-slate-100 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#121214]">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Bot className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">كريم — المساعد التنفيذي</h3>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 text-[10px] font-mono">
                    STORE_OPS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                  سياق الشاشة: {context.pageTitle || context.pathname}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetSession}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="بدء جلسة جديدة"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                title="إغلاق (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Quick Prompts Bar */}
          {quickPrompts && quickPrompts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/5 bg-[#09090b]/80 scrollbar-none">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95 flex-shrink-0"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-[#18181b] border border-white/10 text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <AgentStudioMarkdownMessage content={msg.text} isUser={msg.sender === 'user'} />

                  {/* Render Action Cards */}
                  {msg.actionCards?.map((card) => (
                    <CopilotActionCard key={card.id} card={card} onDecision={handleDecision} />
                  ))}
                </div>

                <span className="text-[10px] text-slate-500 mt-1 px-1 tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>كريم يفحص بيانات المنظومة ويجهز الرد...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <footer className="p-3 border-t border-white/10 bg-[#121214]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center"
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="اكتب أمرك أو استفسارك (Enter للإرسال)..."
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-3.5 py-2.5 pl-11 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none max-h-28"
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="absolute left-2.5 p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="إرسال"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>اختصار سريع: <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-slate-400 font-mono">Ctrl + J</kbd></span>
              {telemetry && (
                <span className="font-mono tabular-nums text-slate-400">
                  {telemetry.model} · {telemetry.latency_ms}ms
                </span>
              )}
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
};
