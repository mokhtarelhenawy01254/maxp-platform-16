import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Send,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Layers,
  ArrowUpRight,
  History,
  Plus,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  chatWithMediaBuyer,
  publishAiDraft,
} from "../../services/facebookAdsService";
import { useAuth } from "../../hooks/useAuthSimple";
import type { Message, DraftItem, QuickPrompt } from "./copilot/types";
import { useCopilotSessions } from "./copilot/useCopilotSessions";
import { CopilotSessionsList } from "./copilot/CopilotSessionsList";

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: "👟 إعلان لمنتج Dash",
    prompt:
      "عايزك تعمل إعلان ممول لمنتج الداش https://swan.maxp.online/product/dash بميزانية 400 جنيه يومياً وافحص اقتصادياته واكتب المسودات.",
  },
  {
    label: "📊 حساب نقطة التعادل والـ CPA",
    prompt:
      "كيف تحسب نقطة التعادل وسقف تكلفة الشراء (Target CPA) قبل إطلاق أي حملة؟",
  },
  {
    label: "⚡ صياغة 3 زوايا إعلانية",
    prompt:
      "اقترح لي 3 زوايا إعلانية مختلفة لحملة تحويلات لمبيعات متجري.",
  },
];

export const MediaBuyerCopilotWidget: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || null;

  const {
    sessions,
    activeSession,
    activeSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    addMessageToActiveSession,
  } = useCopilotSessions(companyId);

  const [isOpen, setIsOpen] = useState(false);
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !showSessionsList) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, showSessionsList, activeSession.messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    addMessageToActiveSession(userMsg);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await chatWithMediaBuyer(text, activeSession.id);
      if (res.success) {
        const agentMsg: Message = {
          id: "agent-" + Date.now(),
          sender: "agent",
          text: res.reply || "تم استلام طلبك وتنفيذه بنجاح.",
          toolCalls: res.tool_calls,
          timestamp: new Date().toISOString(),
        };
        addMessageToActiveSession(agentMsg);
      } else {
        toast.error(res.error || "تعذر التواصل مع الميديا باير");
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء التواصل مع الإيجنت");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishDraft = async (draftId: string) => {
    try {
      setPublishingDraftId(draftId);
      const res = await publishAiDraft(draftId);
      if (res.success) {
        toast.success("✅ تم نشر الحملة الإعلانية بنجاح إلى حساب إعلانات فيسبوك!");
      } else {
        toast.error(res.error || "فشل نشر المسودة إلى فيسبوك");
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذر نشر المسودة");
    } finally {
      setPublishingDraftId(null);
    }
  };

  const formatMsgTime = (timestamp: Date | string) => {
    try {
      const d = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
      return d.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const extractDraftsFromMessage = (msg: Message): DraftItem[] => {
    if (!msg.toolCalls) return [];
    for (const tc of msg.toolCalls) {
      if (tc.tool === "facebook_ad_create_full_draft" && tc.result?.drafts) {
        return tc.result.drafts;
      }
    }
    return [];
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-5 left-5 z-50">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-3 sm:px-4 sm:py-2.5 text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-blue-500/25 active:scale-95"
            aria-label="مساعد الميديا باير بالذكاء الاصطناعي"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <Bot className="h-5 w-5 transition-transform group-hover:rotate-12" />
            <div className="hidden sm:block text-right">
              <span className="block text-xs font-black tracking-tight">
                الميديا باير الذكي
              </span>
              <span className="block text-[9px] font-medium text-blue-100/90">
                DeepSeek Copilot
              </span>
            </div>
            <Sparkles className="hidden sm:inline h-3.5 w-3.5 text-amber-300 animate-pulse" />
          </button>
        )}
      </div>

      {/* Floating Chat Flyout / Drawer */}
      {isOpen && (
        <div
          dir="rtl"
          className="fixed bottom-6 left-6 z-50 flex h-[640px] max-h-[85vh] w-[94vw] sm:w-[450px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-purple-50/80 p-3.5 dark:border-slate-800 dark:from-slate-800/80 dark:to-slate-900/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white">
                    Facebook Media Buyer
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    أونلاين
                  </span>
                </div>
                {/* Active Session Title Chip */}
                <button
                  type="button"
                  onClick={() => setShowSessionsList((prev) => !prev)}
                  title="عرض الجلسات السابقة أو التبديل بينها"
                  className="flex max-w-[200px] items-center gap-1 truncate text-right text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate">{activeSession.title || "جلسة المحادثة"}</span>
                </button>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  createNewSession();
                  setShowSessionsList(false);
                }}
                title="بدء جلسة جديدة (+ New Chat)"
                className="flex items-center gap-1 rounded-xl bg-blue-50 px-2 py-1.5 text-[11px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSessionsList((prev) => !prev)}
                title={showSessionsList ? "العودة للمحادثة" : "سجل الجلسات السابقة"}
                className={`relative rounded-xl p-2 transition-colors ${
                  showSessionsList
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <History className="h-4 w-4" />
                {sessions.length > 1 && !showSessionsList && (
                  <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">
                    {sessions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="إغلاق"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Main Body: Either Session History or Active Chat */}
          {showSessionsList ? (
            <CopilotSessionsList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={(id) => {
                switchSession(id);
                setShowSessionsList(false);
              }}
              onNewSession={() => {
                createNewSession();
                setShowSessionsList(false);
              }}
              onDeleteSession={deleteSession}
              onBackToChat={() => setShowSessionsList(false)}
              onClearAll={clearAllSessions}
            />
          ) : (
            <>
              {/* Quick Suggestion Chips */}
              {activeSession.messages.length <= 2 && (
                <div className="flex gap-2 overflow-x-auto border-b border-slate-100 p-2.5 scrollbar-none dark:border-slate-800">
                  {QUICK_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="whitespace-nowrap rounded-xl border border-blue-100 bg-blue-50/60 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100/80 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
                {activeSession.messages.map((msg) => {
                  const drafts = extractDraftsFromMessage(msg);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === "user" ? "items-start" : "items-end"
                      }`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "rounded-tr-none bg-blue-600 text-white shadow-sm"
                            : "rounded-tl-none border border-slate-100 bg-slate-50 text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100"
                        }`}
                      >
                        {/* Tool Calls execution chips */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="mb-2.5 flex flex-wrap gap-1.5 border-b border-slate-200/60 pb-2 dark:border-slate-700/60">
                            {msg.toolCalls.map((tc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-xs dark:bg-slate-900 dark:text-slate-300"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                {tc.tool === "facebook_ad_analyze_product"
                                  ? "فحص اقتصاديات المنتج"
                                  : tc.tool === "product_search"
                                  ? "التحقق من المخزون"
                                  : tc.tool === "facebook_ad_create_full_draft"
                                  ? "إنشاء 3 مسودات إعلانية"
                                  : tc.tool === "facebook_ad_publish_draft"
                                  ? "نشر الحملة مباشرة لفيسبوك"
                                  : tc.tool}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="whitespace-pre-wrap font-sans">
                          {msg.text}
                        </div>

                        {/* Interactive Draft Cards */}
                        {drafts.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-2.5 dark:border-slate-700">
                            <div className="flex items-center justify-between text-[11px] font-black text-slate-700 dark:text-slate-300">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5 text-blue-500" />
                                المسودات المنشأة ({drafts.length} زوايا تسويقية):
                              </span>
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                مسودة (DRAFT)
                              </span>
                            </div>

                            {drafts.map((draft) => (
                              <div
                                key={draft.draft_id}
                                className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-700 dark:bg-slate-900"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-black text-slate-900 dark:text-white">
                                    {draft.headline}
                                  </span>
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                                    {draft.angle === "pain_point"
                                      ? "زاوية الألم والراحة"
                                      : draft.angle === "direct_offer"
                                      ? "زاوية العرض المباشر"
                                      : "زاوية الدليل الاجتماعي"}
                                  </span>
                                </div>

                                <p className="mt-1 line-clamp-2 text-[10px] text-slate-500 dark:text-slate-400">
                                  {draft.primary_text}
                                </p>

                                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                    الميزانية: {draft.budget_amount} ج.م/يوم
                                  </span>
                                  <button
                                    type="button"
                                    disabled={publishingDraftId === draft.draft_id}
                                    onClick={() => handlePublishDraft(draft.draft_id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                                  >
                                    {publishingDraftId === draft.draft_id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        جاري النشر...
                                      </>
                                    ) : (
                                      <>
                                        <ArrowUpRight className="h-3 w-3" />
                                        اعتماد ونشر لفيسبوك
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="mt-1 px-1 text-[9px] text-slate-400">
                        {formatMsgTime(msg.timestamp)}
                      </span>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <span>الإيجنت يحلل المنتج وينفذ طلبك...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Guardrail Guarantee & Input */}
              <div className="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="mb-2 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    ضمان الأمان: لن يتم تفعيل أو خصم أي ميزانية إلا بعد موافقتك واعتماد الحملة.
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="اطلب إعلاناً لمنتج، ميزانية، أو خطة تسويقية..."
                    disabled={loading}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-950"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 disabled:opacity-50 active:scale-95"
                  >
                    <Send className="h-4 w-4 rotate-180" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default MediaBuyerCopilotWidget;
