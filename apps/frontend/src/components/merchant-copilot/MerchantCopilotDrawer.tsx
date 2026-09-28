import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpRight, Cpu, AlertCircle, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useExecutiveContext } from './useExecutiveContext';
import { useCopilotCloudSessions } from './useCopilotCloudSessions';
import { useCopilotSpecialists } from './useCopilotSpecialists';
import type { SpecialistAgent } from './specialists';
import { CopilotActionCard } from './CopilotActionCard';
import { CopilotSessionsModal } from './CopilotSessionsModal';
import { CopilotInputFooter } from './CopilotInputFooter';
import { CopilotHeader } from './CopilotHeader';
import { AgentStudioMarkdownMessage } from '../agent-studio/AgentStudioMarkdownMessage';
import type { CopilotMessage, ActionCardData } from './types';

interface MerchantCopilotDrawerProps {
  isOpen: boolean;
  initialSessionId?: string | null;
  onClose: () => void;
}

export const MerchantCopilotDrawer: React.FC<MerchantCopilotDrawerProps> = ({
  isOpen,
  initialSessionId,
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
    rewindActiveSession,
  } = useCopilotCloudSessions(context.companyId, initialSessionId);

  const {
    specialists,
    selectedAgent,
    setSelectedAgent,
    contextReason,
  } = useCopilotSpecialists({
    companyId: context.companyId,
    pathname: context.pathname,
  });

  const [showSessionsList, setShowSessionsList] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sessionError, setSessionError] = useState<{
    code: 'SESSION_NOT_FOUND' | 'FORBIDDEN_SESSION' | 'LOAD_ERROR';
    message: string;
  } | null>(null);

  const handleSelectAgent = useCallback((agent: SpecialistAgent) => {
    setSelectedAgent(agent);
    if (messages.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `switch_${Date.now()}`,
          sender: 'agent',
          text: `🔄 **تم التبديل إلى ${agent.name}**\n*${agent.description}*`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  }, [setSelectedAgent, messages.length]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState<{ model?: string; latency_ms?: number } | null>(null);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input and scroll down when opened
  useEffect(() => {
    if (isOpen && !showSessionsList && !sessionError) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, showSessionsList, messages, sessionError]);

  // Load history when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      setSessionError(null);
      return;
    }
    let isMounted = true;
    setLoadingHistory(true);
    setSessionError(null);

    (async () => {
      try {
        const result = await loadSessionHistory(activeSessionId);
        if (!isMounted) return;

        if (result.success) {
          setMessages(result.messages);
          setSessionError(null);
        } else {
          setMessages([]);
          setSessionError({
            code: result.errorCode || 'LOAD_ERROR',
            message: result.error || 'الجلسة غير متاحة',
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setMessages([]);
        setSessionError({
          code: 'LOAD_ERROR',
          message: 'تعذر الاتصال بالمساعد التنفيذي.',
        });
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
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
    const text = (typeof textToSend === 'string' ? textToSend : inputValue).trim();
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
      const res = await apiClient.post<any>(
        '/ai/chat/message',
        {
          message: text,
          sessionId: targetSessionId,
          agentId: selectedAgent.slug,
          images: currentImages.length > 0 ? currentImages : undefined,
          executiveContext: context,
        },
        { timeout: 120000 }
      );

      const replyText = res.data?.reply || res.data?.message || 'تمت معالجة طلبك بنجاح.';
      const toolCalls = res.data?.toolCalls || res.data?.tool_calls || [];

      // Extract action cards if tools require approval or return structured action proposals
      const detectedActionCards: ActionCardData[] = [];
      const mapActionType = (raw: string): ActionCardData['actionType'] => {
        const norm = (raw || '').toLowerCase().replace(/[.-]/g, '_');
        if (norm.includes('price')) return 'price_update';
        if (norm.includes('cancel')) return 'order_cancel';
        if (norm.includes('confirm')) return 'order_confirm';
        if (norm.includes('discount')) return 'discount_create';
        if (norm.includes('inventory')) return 'inventory_adjust';
        if (norm.includes('shipping')) return 'shipping_update';
        if (norm.includes('learned_rule') || norm.includes('rule')) return 'learned_rule';
        if (norm.includes('agent_skill') || norm.includes('skill')) return 'agent_skill';
        if (norm.includes('agent_spawn') || norm.includes('spawn')) return 'agent_spawn';
        return 'generic';
      };

      for (const tc of toolCalls) {
        const toolName = tc.tool || tc.name || tc.action_type || '';
        const isAwaiting =
          tc.status === 'awaiting_approval' ||
          tc.status === 'pending_approval' ||
          tc.output?.status === 'awaiting_approval' ||
          tc.output?.status === 'PENDING_APPROVAL' ||
          Boolean(tc.draft_id) ||
          tc.arguments?.requireConfirmation ||
          toolName.includes('price') ||
          toolName.includes('cancel') ||
          toolName.includes('discount') ||
          toolName.includes('learned_rule') ||
          toolName.includes('agent_skill') ||
          toolName.includes('agent_spawn') ||
          toolName.includes('agent.spawn');

        if (isAwaiting) {
          const cardId = tc.draft_id || tc.id || `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const rawParams = tc.action_args || tc.output?.action_args || tc.arguments || {};
          const summaryText =
            tc.message ||
            tc.output?.summary ||
            tc.output?.message ||
            rawParams?.reason ||
            rawParams?.rule_title ||
            rawParams?.name ||
            'إجراء تشغيلي ينتظر اعتمادك النهائي لتطبيقه.';

          detectedActionCards.push({
            id: cardId,
            toolCallId: tc.draft_id || tc.id,
            title: toolName || 'إجراء بانتظار الاعتماد',
            actionType: mapActionType(tc.action_type || toolName),
            summary: summaryText,
            parameters: rawParams,
            status: 'pending',
          });
        }
      }

      const rawModel = res.data?.modelSelection?.model || res.data?.model || undefined;
      const assistantMsg: CopilotMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
        toolCalls,
        actionCards: detectedActionCards.length > 0 ? detectedActionCards : undefined,
        telemetry: {
          model: rawModel,
          latency_ms: Date.now() - startTime,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setTelemetry({
        model: rawModel,
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
    setSessionError(null);
    await createNewCloudSession();
    setMessages([]);
  };

  const handleRewind = useCallback(async () => {
    if (loading || messages.length === 0) return;
    setLoading(true);
    try {
      const res = await rewindActiveSession();
      if (res.success && res.messages) {
        setMessages(res.messages);
      } else {
        setMessages((prev) => prev.slice(0, Math.max(0, prev.length - 2)));
      }
    } catch (e) {
      console.warn('[Copilot] Rewind error:', e);
    } finally {
      setLoading(false);
    }
  }, [loading, messages.length, rewindActiveSession]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Precision Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Drawer Surface - Theme Harmonized Chassis */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <aside className="w-screen max-w-md sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-250">
          {/* Header */}
          <CopilotHeader
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
            specialists={specialists}
            contextReason={contextReason}
            pageContextLabel={context.pageTitle || context.pathname}
            showSessionsList={showSessionsList}
            onToggleSessionsList={() => setShowSessionsList((prev) => !prev)}
            onNewSession={startNewSession}
            onClose={onClose}
            activeSessionId={activeSessionId}
          />

          {showSessionsList ? (
            <CopilotSessionsModal
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                setSessionError(null);
                setActiveSessionId(id);
                setShowSessionsList(false);
              }}
              onNewSession={startNewSession}
              onDeleteSession={deleteCloudSession}
            />
          ) : sessionError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div
                className={`p-4 rounded-2xl mb-4 border ${
                  sessionError.code === 'FORBIDDEN_SESSION'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                }`}
              >
                {sessionError.code === 'FORBIDDEN_SESSION' ? (
                  <ShieldAlert className="h-8 w-8" />
                ) : (
                  <AlertCircle className="h-8 w-8" />
                )}
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2">
                {sessionError.code === 'FORBIDDEN_SESSION'
                  ? 'لا تملك صلاحية الوصول إلى هذه الجلسة'
                  : 'الجلسة غير متاحة'}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
                {sessionError.code === 'FORBIDDEN_SESSION'
                  ? 'هذا الرابط يخص حساباً أو شركة أخرى ولا يمكن فتحه إلا لصاحب الحساب المسجل.'
                  : 'الجلسة المطلوبة قد تكون حُذفت مسبقاً أو أن رابط الجلسة غير صحيح.'}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSessionError(null);
                    startNewSession();
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  بدء جلسة جديدة
                </button>

                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessionError(null);
                      setShowSessionsList(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    عرض سجل جلساتي
                  </button>
                )}
              </div>
            </div>
          ) : loadingHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2.5 text-xs py-3">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>جاري استرجاع سجل الجلسة السحابية…</span>
              </div>
            </div>
          ) : (
            <>
              {/* Messages Timeline */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-xs">
                {messages.length === 0 ? (
                  /* Harmonized Onboarding State - Only shown before first message */
                  <div className="py-6 px-1 space-y-6">
                    <div className="space-y-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-xs">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white text-wrap: balance">
                        {selectedAgent.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-pretty max-w-md">
                        {selectedAgent.description}
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                        اقتراحات لبدء المحادثة — اختر موضوعاً أو اسأل بحرية:
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        {((quickPrompts && quickPrompts.length > 0)
                          ? quickPrompts.slice(0, 3).map((qp) => qp.prompt)
                          : selectedAgent.suggestedPrompts.slice(0, 3)
                        ).map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleSendMessage(prompt)}
                            className="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 text-right transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                          >
                            <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-relaxed">
                              {prompt}
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0 mr-2" />
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
                        /* User Message: Indigo Accent Capsule (Matches Platform Theme) */
                        <div className="flex flex-col items-end max-w-[85%]">
                          <div className="rounded-2xl rounded-br-xs bg-indigo-600 text-white px-4 py-2.5 text-xs sm:text-sm shadow-xs leading-relaxed">
                            <p className="whitespace-pre-line text-pretty">{msg.text}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 tabular-nums font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        /* Assistant Turn: Seamless Surface Integration */
                        <div className="w-full space-y-2 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                              <Cpu className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {selectedAgent.name}
                            </span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                              {msg.telemetry?.model || 'DeepSeek-V3'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums font-mono mr-auto">
                              {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="pr-8 text-slate-800 dark:text-slate-200 leading-relaxed text-xs sm:text-sm">
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
                  <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-xs py-3 pr-8">
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                    <span>جاري فحص مؤشرات المنظومة وتوليد القرار التشغيلي…</span>
                    {telemetry?.model && (
                      <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 mr-auto">{telemetry.model}</span>
                    )}
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
                onSendMessage={() => handleSendMessage()}
                onRewind={handleRewind}
                canRewind={messages.length > 0 && !loading}
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
