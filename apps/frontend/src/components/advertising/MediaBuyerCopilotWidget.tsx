import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Send,
  X,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowUpRight,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  chatWithMediaBuyer,
  publishAiDraft,
} from "../../services/facebookAdsService";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  toolCalls?: Array<{
    tool: string;
    status: string;
    result?: any;
  }>;
  timestamp: Date;
}

interface DraftItem {
  draft_id: string;
  angle: string;
  campaign_name: string;
  headline: string;
  primary_text: string;
  budget_amount: number;
  status: string;
}

export const MediaBuyerCopilotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "agent",
      text: "أهلاً بك يا فندم! أنا إيجنت الميديا باير الخاص بمتجرك 🎯.\n\nأستطيع مساعدتك في فحص اقتصاديات أي منتج، تحديد سقف تكلفة الشراء (Target CPA)، صياغة 3 نسخ إعلانية بزوايا سيكولوجية مختلفة (Pain-Point، Direct Offer، Social Proof)، وتجهيز حملات إعلانية احترافية بنقرة واحدة.\n\nعايز نعلن عن أي منتج النهاردة؟",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await chatWithMediaBuyer(text);
      if (res.success) {
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: res.reply || "تم استلام طلبك وتنفيذه بنجاح.",
          toolCalls: res.tool_calls,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);
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

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-fresh",
        sender: "agent",
        text: "بدأنا محادثة جديدة! ما هو المنتج أو الحملة الإعلانية التي تريد تجهيزها؟",
        timestamp: new Date(),
      },
    ]);
  };

  // Extract drafts if created inside tool calls
  const extractDraftsFromMessage = (msg: Message): DraftItem[] => {
    if (!msg.toolCalls) return [];
    for (const tc of msg.toolCalls) {
      if (tc.tool === "facebook_ad_create_full_draft" && tc.result?.drafts) {
        return tc.result.drafts;
      }
    }
    return [];
  };

  const QUICK_PROMPTS = [
    { label: "👟 إعلان لمنتج Dash", prompt: "عايزك تعمل إعلان ممول لمنتج الداش https://swan.maxp.online/product/dash بميزانية 400 جنيه يومياً وافحص اقتصادياته واكتب المسودات." },
    { label: "📊 حساب نقطة التعادل والـ CPA", prompt: "كيف تحسب نقطة التعادل وسقف تكلفة الشراء (Target CPA) قبل إطلاق أي حملة؟" },
    { label: "⚡ صياغة 3 زوايا إعلانية", prompt: "اقترح لي 3 زوايا إعلانية مختلفة لحملة تحويلات لمبيعات متجري." },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-6 z-50">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3.5 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25 active:scale-95"
            aria-label="مساعد الميديا باير بالذكاء الاصطناعي"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
            </span>
            <Bot className="h-6 w-6 transition-transform group-hover:rotate-12" />
            <div className="text-right">
              <span className="block text-sm font-black tracking-wide">
                الميديا باير الذكي
              </span>
              <span className="block text-[10px] font-medium text-blue-100 opacity-90">
                DeepSeek-Flash Copilot
              </span>
            </div>
            <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          </button>
        )}
      </div>

      {/* Floating Chat Flyout / Drawer */}
      {isOpen && (
        <div
          dir="rtl"
          className="fixed bottom-6 left-6 z-50 flex h-[620px] max-h-[85vh] w-[94vw] sm:w-[440px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-purple-50/80 p-4 dark:border-slate-800 dark:from-slate-800/80 dark:to-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Facebook Media Buyer
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    أونلاين
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  مدعوم بنموذج DeepSeek-Flash السريع
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                title="بدء محادثة جديدة"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="إغلاق"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
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
            {messages.map((msg) => {
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

                            <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
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
                    {msg.timestamp.toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <span>الإيجنت يحلل المنتج ويكتب المسودات الإعلانية...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Guardrail Guarantee & Input */}
          <div className="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-2 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                ضمان الأمان: لن يتم صرف أي مبلغ من بطاقتك إلا بعد مراجعتك ونقرك على اعتماد الحملة.
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
        </div>
      )}
    </>
  );
};

export default MediaBuyerCopilotWidget;
