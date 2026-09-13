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
} from "lucide-react";
import { chatWithMediaBuyer } from "../../../services/facebookAdsService";
import { useCopilotSessions } from "../../../components/advertising/copilot/useCopilotSessions";
import type { MarketingProduct } from "./types";
import type { Message, CopilotSession } from "../../../components/advertising/copilot/types";
import { MarketingMarkdownMessage } from "./MarketingMarkdownMessage";

interface MarketingSquadChatFeedProps {
  selectedProduct: MarketingProduct | null;
  companyId: string | null;
  onDraftGenerated?: (draftData: any) => void;
  activeSession?: CopilotSession;
  addMessageToActiveSession?: (msg: Message) => void;
  createNewSession?: () => void;
}

export const MarketingSquadChatFeed: React.FC<MarketingSquadChatFeedProps> = ({
  selectedProduct,
  companyId,
  onDraftGenerated,
  activeSession: propActiveSession,
  addMessageToActiveSession: propAddMessage,
  createNewSession: propCreateSession,
}) => {
  const fallback = useCopilotSessions(companyId);
  const activeSession = propActiveSession || fallback.activeSession;
  const addMessageToActiveSession = propAddMessage || fallback.addMessageToActiveSession;
  const createNewSession = propCreateSession || fallback.createNewSession;

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    // Context-aware: attach product specs if selected and not already in prompt
    let promptForAgent = textToSend;
    if (selectedProduct && !textToSend.includes(selectedProduct.name)) {
      promptForAgent = `[المنتج المحدد في الرادار: "${selectedProduct.name}" | السعر: ${selectedProduct.price} ج.م | المخزون: ${selectedProduct.stock} قطعة | التكلفة: ${selectedProduct.cost || 0} ج.م]\n\n${textToSend}`;
    }

    try {
      const res = await chatWithMediaBuyer(promptForAgent, activeSession.id);
      if (res.success) {
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: res.reply || "تم استلام الطلب وتجهيز الخطة التسويقية.",
          toolCalls: res.tool_calls,
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
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: `حدث خطأ أثناء التواصل مع الأيجنت: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      addMessageToActiveSession(errorMsg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Dynamic quick prompts adapted to current product
  const quickActions = [
    {
      label: "🎯 3 زوايا إعلانية للمنتج",
      prompt: selectedProduct
        ? `عايزك تقترح لي 3 زوايا إعلانية مختلفة لمنتج "${selectedProduct.name}" مع هوكس قوية ونوع المحتوى المقترح.`
        : "اقترح لي 3 زوايا إعلانية رابحة لمنتجات المتجر.",
    },
    {
      label: "📦 اقتراح باقة Upsell وعرض",
      prompt: selectedProduct
        ? `اقترح لي فكرة باقة ترويجية (Bundle / Upsell) لمنتج "${selectedProduct.name}" لرفع متوسط قيمة السلة، مع حساب هامش الربح بسعر بيع ${selectedProduct.price} ج.م.`
        : "اقترح لي باقة ترويجية لرفع متوسط قيمة السلة (AOV).",
    },
    {
      label: "📊 حساب سقف CPA ونقطة التعادل",
      prompt: selectedProduct
        ? `احسب لي سقف تكلفة الشراء (Target CPA) والـ Break-even ROAS لمنتج "${selectedProduct.name}" بسعر ${selectedProduct.price} ج.م وتكلفة ${selectedProduct.cost || 0} ج.م.`
        : "كيف نحسب نقطة التعادل والـ Target CPA للحملات الجديدة؟",
    },
    {
      label: "🛡️ مراجعة الحملات والإرهاق الإعلاني",
      prompt:
        "افحص الحملات الإعلانية الحالية للمتجر وقلي هل في أي إعلان بيعاني من إرهاق (Ad Fatigue) أو محتاج إيقاف؟",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Feed Header */}
      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              فريق التسويق الذكي
            </h2>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              متصل
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => createNewSession()}
          className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1 transition shadow-sm"
          title="بدء جلسة جديدة"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">جلسة جديدة</span>
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 min-h-0">
        {activeSession.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              ابدأ التخطيط التسويقي
            </h3>
            <p className="text-[11px] text-slate-500 max-w-sm mb-2">
              اكتب طلبك أو اختر أحد الأوامر السريعة بالأسفل لتجهيز الزوايا والمسودة فوراً.
            </p>
          </div>
        ) : (
          activeSession.messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${isUser ? "flex-row-reverse" : "flex-row"}`}
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
                  className={`rounded-xl p-2.5 sm:p-3 space-y-1.5 leading-relaxed ${
                    isUser
                      ? "max-w-[85%] bg-blue-600 text-white rounded-tr-none shadow-sm"
                      : "max-w-[95%] sm:max-w-[90%] bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700/60 shadow-sm"
                  }`}
                >
                  {/* Tool execution badge if present */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {msg.toolCalls.map((tc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-medium"
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          {tc.name || "أداة فحص المتجر"}
                        </span>
                      ))}
                    </div>
                  )}

                  <MarketingMarkdownMessage content={msg.text} isUser={isUser} />

                  <span className="block text-[9px] opacity-60 text-left pt-0.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-2.5 text-xs items-center text-slate-400">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              فريق التسويق يحلل بيانات المتجر واقتصاديات المنتج...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Pills */}
      <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
        {quickActions.map((qa, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSend(qa.prompt)}
            disabled={loading}
            className="flex-shrink-0 px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 transition font-medium"
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-2 sm:p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder={
              selectedProduct
                ? `اطلب من فريق التسويق خطة لـ ${selectedProduct.name}...`
                : "وجه فريق التسويق أو اسأل عن أي حملة..."
            }
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-40 flex items-center justify-center"
            title="إرسال"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
