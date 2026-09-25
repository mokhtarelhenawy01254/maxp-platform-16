import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpRight, Cpu } from 'lucide-react';
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
        setMessages(history);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId, loadSessionHistory]);

  // Handle action approvals
  const handleDecision = useCallback(
    async (cardId: string, approved: boolean) => {
      try {
        await apiClient.post(`/agent-approvals/${cardId}/${approved ? 'approve' : 'reject'}`, {
          threadId: activeSessionId,
          reason: approved ? 'اعتمد بواسطة التاجر من المساعد التنفيذي' : 'ألغي الإجراء من قبل التاجر',
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
      const errorText = err.response?.data?.error || err.message || 'تعذر الاتصال بالمساعد التنفيذي.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `تنبيه: ${errorText}`,
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
      {/* Precision Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer Surface - Single Seamless OLED Chassis */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <aside className="w-screen max-w-md sm:max-w-lg md:max-w-xl bg-[#09090b] text-zinc-100 border-l border-white/[0.08] flex flex-col shadow-[-32px_0_80px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-250">
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
                <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 py-2 border-b border-white/[0.06] bg-[#0c0c0e]/80 scrollbar-none">
                  {quickPrompts.map((qp) => (
                    <button
                      key={qp.id}
                      type="button"
                      onClick={() => handleSendMessage(qp.prompt)}
                      className="whitespace-nowrap rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-3 py-1 text-[11px] text-zinc-300 hover:text-white transition-all active:scale-95 flex-shrink-0"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {messages.length === 0 ? (
                  /* Minimalist Linear-Style Cockpit Welcome */
                  <div className="py-6 px-2 space-y-6">
                    <div className="space-y-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-white/[0.1] text-zinc-200 shadow-sm">
                        <Cpu className="h-4 w-4 text-emerald-400" />
                      </div>
                      <h2 className="text-sm font-semibold text-zinc-100 text-wrap: balance">
                        {selectedAgent.name}
                      </h2>
                      <p className="text-xs text-zinc-400 leading-relaxed text-pretty max-w-sm">
                        {selectedAgent.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        إجراءات مقترحة فورية
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {selectedAgent.suggestedPrompts.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSendMessage(prompt)}
                            className="group flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-[#121215] hover:border-white/[0.15] hover:bg-zinc-900/90 text-right transition-all active:scale-[0.98]"
                          >
                            <span className="text-xs text-zinc-200 group-hover:text-white transition-colors leading-relaxed">
                              {prompt}
                            </span>
                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-200 transition-colors flex-shrink-0 mr-2" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {msg.sender === 'user' ? (
                        /* User Message: Clean Architectural Pill (Ban WhatsApp Green) */
                        <div className="flex flex-col items-end max-w-[85%]">
                          <div className="rounded-2xl bg-zinc-800/80 border border-zinc-700/60 px-3.5 py-2.5 text-zinc-100 shadow-sm leading-relaxed text-xs">
                            <p className="whitespace-pre-line text-pretty">{msg.text}</p>
                          </div>
                          <span className="text-[10px] text-zinc-500 mt-1 px-1 tabular-nums font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        /* Assistant Turn: Seamless Chassis Integration */
                        <div className="w-full space-y-1.5 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 border border-white/[0.08] text-zinc-300">
                              <Cpu className="h-3 w-3 text-emerald-400" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-200">
                              {selectedAgent.name}
                            </span>
                            <span className="rounded bg-white/[0.04] border border-white/[0.06] px-1 py-0.2 font-mono text-[9px] text-zinc-500">
                              {msg.telemetry?.model || 'DeepSeek-V3'}
                            </span>
                            <span className="text-[10px] text-zinc-500 tabular-nums font-mono mr-auto">
                              {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="pr-7 text-zinc-200 leading-relaxed text-xs">
                            <AgentStudioMarkdownMessage content={msg.text} isUser={false} />

                            {/* Render Action Cards */}
                            {msg.actionCards?.map((card) => (
                              <CopilotActionCard key={card.id} card={card} onDecision={handleDecision} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 pr-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>جاري فحص مؤشرات المنظومة وتوليد القرار التشغيلي…</span>
                    <span className="font-mono text-[9px] text-zinc-500 mr-auto">DeepSeek-V3</span>
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
