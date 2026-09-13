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
}

export const MarketingSquadChatFeed: React.FC<MarketingSquadChatFeedProps> = ({
  selectedProduct,
  companyId,
  activeAgent,
  onDraftGenerated,
  activeSession: propActiveSession,
  addMessageToActiveSession: propAddMessage,
  createNewSession: propCreateSession,
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


  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 min-h-0 overflow-hidden">
      {/* Messages List */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {activeSession.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Sparkles className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              ابدأ التخطيط التسويقي
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              اكتب طلبك أو اختر أحد الأوامر السريعة بالأسفل لتجهيز الزوايا والمسودة فوراً.
            </p>
          </div>
        ) : (
          activeSession.messages.map((msg) => {
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

                  <span className="block text-[9px] opacity-60 text-end pt-1">
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
      <div className="p-2 sm:p-3 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex-shrink-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            placeholder={
              selectedProduct
                ? `اطلب من ${activeAgent?.name || "فريق التسويق"} خطة لـ ${selectedProduct.name}...`
                : `وجه ${activeAgent?.name || "فريق التسويق"} أو اسأل عن أي حملة...`
            }
            className="flex-1 px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-40 flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 shadow-xs"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
