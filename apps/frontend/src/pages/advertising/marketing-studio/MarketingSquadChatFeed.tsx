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
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopySessionId = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!activeSession?.id) return;
    navigator.clipboard.writeText(activeSession.id);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

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
      const res = await chatWithMediaBuyer(textToSend, activeSession.id, productPayload);
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
      {/* Feed Sub-Header */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            استوديو المحادثة والتوجيه الاستراتيجي
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <MessageSquare className="w-3 h-3 text-indigo-500" />
            <span className="font-medium truncate max-w-[130px]" title={activeSession.title || "جلسة جديدة"}>
              {activeSession.title || "جلسة جديدة"}
            </span>
            <button
              type="button"
              onClick={handleCopySessionId}
              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={copiedSessionId ? "تم نسخ معرف الجلسة!" : "نسخ معرف الجلسة للمراجعة والدعم الفني"}
              aria-label="نسخ معرف الجلسة"
            >
              {copiedSessionId ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => createNewSession()}
            className="px-2 py-1 text-[11px] rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1 transition cursor-pointer"
            title="بدء جلسة جديدة"
          >
            <Plus className="w-3 h-3" />
            <span>جلسة جديدة</span>
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  className={`rounded-2xl p-3.5 space-y-2 leading-relaxed ${
                    isUser
                      ? "max-w-[85%] bg-blue-600 text-white rounded-tr-none shadow-sm"
                      : "max-w-[95%] sm:max-w-[90%] bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700/60 shadow-sm"
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

                  <span className="block text-[9px] opacity-60 text-left pt-1">
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
          <div className="flex gap-3 text-xs items-center text-slate-400">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              فريق التسويق يحلل بيانات المتجر واقتصاديات المنتج...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>


      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
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
            className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-40 flex items-center justify-center"
            title="إرسال"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
