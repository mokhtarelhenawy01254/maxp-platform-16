import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Zap,
  Target,
  ShoppingBag,
  Plus,
  MessageSquare,
  Copy,
  Check,
  Undo2,
} from "lucide-react";
import { chatWithMediaBuyer } from "../../../services/facebookAdsService";
import { useCopilotSessions } from "../../../components/advertising/copilot/useCopilotSessions";
import { useTranslation } from "react-i18next";
import type { MarketingProduct } from "./types";
import type { Message, CopilotSession } from "../../../components/advertising/copilot/types";
import { MarketingMarkdownMessage } from "./MarketingMarkdownMessage";

interface MarketingSquadChatFeedProps {
  selectedProduct: MarketingProduct | null;
  companyId: string | null;
  activeAgent?: { id: string; name: string; role: string } | null;
  onDraftGenerated?: (draftData: any) => void;
  activeSession?: CopilotSession;
  addMessageToActiveSession?: (msg: Message) => void;
  createNewSession?: () => void;
  onRewind?: () => void;
  isRewinding?: boolean;
}

export const MarketingSquadChatFeed: React.FC<MarketingSquadChatFeedProps> = ({
  selectedProduct,
  companyId,
  activeAgent,
  onDraftGenerated,
  activeSession: propActiveSession,
  addMessageToActiveSession: propAddMessage,
  createNewSession: propCreateSession,
  onRewind,
  isRewinding = false,
}) => {
  const fallback = useCopilotSessions(companyId);
  const activeSession = propActiveSession || fallback.activeSession;
  const addMessageToActiveSession = propAddMessage || fallback.addMessageToActiveSession;
  const createNewSession = propCreateSession || fallback.createNewSession;

  const { i18n } = useTranslation();
  const isRtl = (i18n?.dir ? i18n.dir() === "rtl" : true) || document.documentElement.dir === "rtl" || i18n?.language?.startsWith("ar");

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  }, [activeSession.messages, loading]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    addMessageToActiveSession(userMsg);
    setInputMessage("");
    setLoading(true);

    // 2026 SOTA Standard: Keep user prompt 100% pristine.
    // Transmit active entity via structured ephemeral state channel (activeProduct payload).
    const productPayload = selectedProduct
      ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          stock: selectedProduct.stock,
          cost: selectedProduct.cost || 0,
        }
      : undefined;

    try {
      const res = await chatWithMediaBuyer(textToSend, activeSession.id, productPayload, activeAgent?.id);
      if (res.success) {
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: res.reply || "تم استلام الطلب وتجهيز الخطة التسويقية.",
          toolCalls: res.tool_calls,
          telemetry: res.telemetry,
          timestamp: new Date().toISOString(),
        };
        addMessageToActiveSession(agentMsg);

        if (res.tool_calls && onDraftGenerated) {
          const draftTool = res.tool_calls.find(
            (t: any) =>
              t.name === "facebook_ad_create_full_draft" ||
              t.name === "facebook_ad_analyze_product"
          );
          if (draftTool) onDraftGenerated(draftTool);
        }
      } else {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          sender: "agent",
          text: res.error || "تعذّر الحصول على رد، يرجى المحاولة لاحقاً.",
          timestamp: new Date().toISOString(),
        };
        addMessageToActiveSession(errorMsg);
      }
    } catch (err: any) {
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        String(err?.message || "").toLowerCase().includes("timeout");
      const errText = isTimeout
        ? "استغرق الأيجنت وقتاً أطول في تحليل أرقام المتجر وتجهيز المسودة. تم حفظ الإجراء في الخلفية، يمكنك متابعة المحادثة أو مراجعة المسودة في اللوحة الجانبية."
        : `حدث خطأ أثناء التواصل مع الأيجنت: ${err.message || "يرجى المحاولة مرة أخرى"}`;
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: errText,
        timestamp: new Date().toISOString(),
      };
      addMessageToActiveSession(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };


  const QUICK_COPY_PROMPTS = [
    {
      label: "3 زوايا إعلانية (AIDA / PAS / UGC)",
      icon: Sparkles,
      prompt: selectedProduct
        ? `اكتب لي 3 زوايا إعلانية متكاملة لـ ${selectedProduct.name} بنماذج AIDA و PAS و UGC مع هوك وعنوان جذاب لكل زاوية، واحفظ المسودات في النظام.`
        : "اكتب لي 3 زوايا إعلانية تسويقية متكاملة للمتجر بنماذج AIDA و PAS و UGC مع هوك جذاب لكل زاوية.",
    },
    {
      label: "5 هوكات خاطفة للريلز وفيسبوك",
      icon: Zap,
      prompt: selectedProduct
        ? `ولد لي 5 هوكات إعلانية خاطفة للانتباه لأول 3 ثوانٍ في فيديو إعلان ${selectedProduct.name} لمنع التمرير (Stop the Scroll).`
        : "ولد لي 5 هوكات إعلانية خاطفة للانتباه لأول 3 ثوانٍ في ريلز وتيك توك وفيسبوك لمنتجات المتجر.",
    },
    {
      label: "عرض باقة 2+1 وشحن مجاني",
      icon: ShoppingBag,
      prompt: selectedProduct
        ? `صيغ لي عرض توفير قوي باقة 2+1 لـ ${selectedProduct.name} مع شحن مجاني وضمان معاينة قبل الدفع واحفظ المسودة في النظام.`
        : "صيغ لي عرض باقة 2+1 مع شحن مجاني وضمان معاينة للمنتج الأكثر طلباً في المتجر.",
    },
    {
      label: "صياغة بلهجة مصرية عامية قوية",
      icon: MessageSquare,
      prompt: selectedProduct
        ? `أعد كتابة نص الإعلان لـ ${selectedProduct.name} بلهجة مصرية عامية بيعية وسلسة بدون ابتذال وركز على كسر التردد.`
        : "اكتب نص إعلاني مميز بلهجة مصرية عامية بيعية تكسر التردد وتوضح ميزة المعاينة قبل الدفع.",
    },
    {
      label: "كسر الخوف والمعاينة قبل الدفع",
      icon: Target,
      prompt: selectedProduct
        ? `صيغ إعلان يركز بالكامل على ميزة الفحص والمعاينة مع المندوب قبل دفع أي جنيه لـ ${selectedProduct.name} لزيادة معدل التحويل.`
        : "صيغ إعلان يركز بالكامل على ميزة المعاينة قبل الدفع لكسر الخوف من الشراء أونلاين.",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 min-h-0 overflow-hidden">
      {/* Messages List */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {activeSession.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              مركز الصياغة والتخطيط الإعلاني الذكي
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {selectedProduct
                ? `جاهز لصياغة أفضل إعلانات لـ "${selectedProduct.name}". اختر طلباً سريعاً أو وجه الفريق مباشرة:`
                : "اختر أحد مسارات الصياغة الإعلانية الموصى بها للبدء فوراً:"}
            </p>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full text-start">
              {QUICK_COPY_PROMPTS.slice(0, 4).map((item, qIdx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    disabled={loading}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 group shadow-2xs text-start active:scale-[0.98]"
                  >
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition flex-shrink-0">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          activeSession.messages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            // Arabic: Speaker (User) on Right, Bot on Left.
            // English: Speaker (User) on Left (opposite of Arabic), Bot on Right.
            const rowDirectionClass = isUser ? "flex-row" : "flex-row-reverse";
            const bubbleCornerClass = isRtl
              ? (isUser ? "rounded-tr-none" : "rounded-tl-none")
              : (isUser ? "rounded-tl-none" : "rounded-tr-none");

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${rowDirectionClass}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[11px] font-bold ${
                    isUser ? "bg-slate-800" : "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-sm"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div
                  className={`rounded-2xl p-3.5 space-y-2 leading-relaxed ${bubbleCornerClass} ${
                    isUser
                      ? "max-w-[85%] bg-blue-600 text-white shadow-sm"
                      : "max-w-[95%] sm:max-w-[90%] bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 shadow-sm"
                  }`}
                >
                  {/* Tool execution badge if present */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {msg.toolCalls.map((tc, tcIdx) => (
                        <span
                          key={tcIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-medium"
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          {tc.name || "أداة فحص المتجر"}
                        </span>
                      ))}
                    </div>
                  )}

                  <MarketingMarkdownMessage content={msg.text} isUser={isUser} />

                  {/* Hermes Telemetry HUD & Performance Stats */}
                  {!isUser && msg.telemetry && (
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 mt-1 border-t border-slate-200/60 dark:border-slate-700/40 text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span className="px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                        {msg.telemetry.model || "Hermes-Engine"}
                      </span>
                      {typeof msg.telemetry.latency_ms === "number" && (
                        <span>{msg.telemetry.latency_ms}ms</span>
                      )}
                      {typeof msg.telemetry.tokens === "number" && (
                        <span>• {msg.telemetry.tokens} tkn</span>
                      )}
                      {msg.telemetry.p95_sla && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          • SLA {msg.telemetry.p95_sla}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {!isUser && idx === activeSession.messages.length - 1 && onRewind ? (
                      <button
                        type="button"
                        onClick={onRewind}
                        disabled={isRewinding}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer active:scale-95 disabled:opacity-40"
                        title="التراجع عن هذه الخطوة واستعادة الحالة السابقة"
                      >
                        <Undo2 className={`w-3 h-3 ${isRewinding ? "animate-spin" : ""}`} />
                        <span>تراجع</span>
                      </button>
                    ) : (
                      <span />
                    )}

                    <span className="text-[9px] opacity-60 tabular-nums">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex flex-row-reverse gap-3 text-xs items-center text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              {activeAgent?.name ? `${activeAgent.name} يحلل بيانات المتجر واقتصاديات المنتج...` : "فريق التسويق يحلل بيانات المتجر واقتصاديات المنتج..."}
            </div>
          </div>
        )}
      </div>


      {/* Input Bar (Sticky Mobile Composer) */}
      <div className="p-2 sm:p-3 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex-shrink-0 z-10 space-y-2">
        {/* Horizontal Quick Actions Chips Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <span className="text-[10px] text-slate-400 font-bold flex-shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            صياغة سريعة:
          </span>
          {QUICK_COPY_PROMPTS.map((item, pIdx) => {
            const IconComp = item.icon;
            return (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSend(item.prompt)}
                disabled={loading}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0 transition cursor-pointer active:scale-95 disabled:opacity-40"
              >
                <IconComp className="w-2.5 h-2.5 text-indigo-500" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Multiline Composer Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-1.5 sm:gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              placeholder={
                selectedProduct
                  ? `اطلب من ${activeAgent?.name || "فريق التسويق"} زوايا، هوكات، أو صياغة إعلانات لـ ${selectedProduct.name}... (Enter للإرسال)`
                  : `وجه ${activeAgent?.name || "فريق التسويق"} بصياغة أي زاوية أو اسأل عن حملة... (Enter للإرسال)`
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
            />
          </div>
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition disabled:opacity-40 flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 shadow-xs mb-0.5"
            title="إرسال (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
