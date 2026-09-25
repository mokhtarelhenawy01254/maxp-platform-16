import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useExecutiveContext } from './useExecutiveContext';
import { useCopilotCloudSessions } from './useCopilotCloudSessions';
import { SPECIALIST_AGENTS, SpecialistAgent } from './specialists';
import { CopilotActionCard } from './CopilotActionCard';
import { CopilotSessionsModal } from './CopilotSessionsModal';
import { CopilotInputFooter } from './CopilotInputFooter';
import { CopilotHeader } from './CopilotHeader';
import { AgentStudioMarkdownMessage } from '../agent-studio/AgentStudioMarkdownMessage';
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
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createNewCloudSession,
    deleteCloudSession,
    loadSessionHistory,
  } = useCopilotCloudSessions(context.companyId);

  const [selectedAgent, setSelectedAgent] = useState<SpecialistAgent>(SPECIALIST_AGENTS[0]!);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<{ model?: string; latency_ms?: number } | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input and scroll down when opened
  useEffect(() => {
    if (isOpen && !showSessionsList) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, showSessionsList, messages]);

  // Load history when active session changes
  useEffect(() => {
    if (!activeSessionId) return;
    let isMounted = true;
    (async () => {
      const history = await loadSessionHistory(activeSessionId);
      if (isMounted) {
        if (history.length > 0) {
          setMessages(history);
        } else {
          const companyLabel = context.companyName || 'منشأتك';
          const welcome: CopilotMessage = {
            id: 'welcome-msg',
            sender: 'assistant',
            text: `أهلاً بك يا فندم في **${companyLabel}**! أنا **${selectedAgent.name}**.\n\nأنا متابع معاك كل تفاصيل المنظومة والشاشة الحالية (**${context.pageTitle || context.pathname}**).\n\nيمكنك سؤالي عن الطلبات، المخزون، الإعلانات، أو اتخاذ أي إجراء تشغيلي فوراً دون الحاجة لفتح الإعدادات بنفسك.`,
            timestamp: new Date().toISOString(),
          };
          setMessages([welcome]);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId, loadSessionHistory, context.companyName, context.pageTitle, context.pathname, selectedAgent.name]);

  // Handle action approvals
  const handleDecision = useCallback(
    async (cardId: string, approved: boolean) => {
      try {
        await apiClient.post(`/agent-approvals/${cardId}/${approved ? 'approve' : 'reject'}`, {
          threadId: activeSessionId,
          reason: approved ? 'اعتمد بواسطة التاجر من المساعد المباشر' : 'ألغيت بواسطة التاجر',
        });

        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.actionCards) return msg;
            return {
              ...msg,
              actionCards: msg.actionCards.map((c) =>
                c.id === cardId ? { ...c, status: approved ? 'approved' : 'rejected' } : c
              ),
            };
          })
        );
      } catch (err: any) {
        console.error('[Copilot] Approval error:', err);
      }
    },
    [activeSessionId]
  );

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const base64 = uploadEvent.target?.result as string;
          if (base64) {
            setAttachedImages((prev) => [...prev, base64]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if ((!text && attachedImages.length === 0) || loading) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      targetSessionId = await createNewCloudSession(text.slice(0, 30));
    }

    const currentImages = [...attachedImages];
    setAttachedImages([]);

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
      const res = await apiClient.post<any>('/ai/chat/message', {
        message: text,
        sessionId: targetSessionId,
        agentId: selectedAgent.slug,
        images: currentImages.length > 0 ? currentImages : undefined,
        executiveContext: context,
      });

      const replyText = res.data?.reply || res.data?.message || 'تمت معالجة طلبك بنجاح.';
      const toolCalls = res.data?.toolCalls || res.data?.tool_calls || [];

      // Extract action cards if tools require approval
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
            summary: tc.output?.summary || tc.output?.message || 'إجراء ينتظر اعتمادك النهائي لتطبيقه.',
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
      const errorText = err.response?.data?.error || err.message || 'تعذر الاتصال بالمساعد الذكي.';
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

  const startNewSession = async () => {
    setShowSessionsList(false);
    await createNewCloudSession();
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
          <CopilotHeader
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
            pageContextLabel={context.pageTitle || context.pathname}
            showSessionsList={showSessionsList}
            onToggleSessionsList={() => setShowSessionsList((prev) => !prev)}
            onNewSession={startNewSession}
            onClose={onClose}
          />

          {showSessionsList ? (
            <CopilotSessionsModal
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                setActiveSessionId(id);
                setShowSessionsList(false);
              }}
              onNewSession={startNewSession}
              onDeleteSession={deleteCloudSession}
            />
          ) : (
            <>
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
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
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
                    <span>{selectedAgent.name} يفحص بيانات المنظومة ويجهز الرد...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <CopilotInputFooter
                inputValue={inputValue}
                setInputValue={setInputValue}
                loading={loading}
                attachedImages={attachedImages}
                onRemoveImage={(idx) => setAttachedImages((prev) => prev.filter((_, i) => i !== idx))}
                onFileUpload={handleFileUpload}
                onSendMessage={handleSendMessage}
                telemetry={telemetry}
                inputRef={inputRef}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
