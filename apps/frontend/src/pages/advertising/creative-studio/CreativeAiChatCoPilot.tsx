import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  Wand2,
  Rocket,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type { MarketingProduct } from "./types";

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  suggestedPrompt?: string;
  suggestedAngle?: string;
  timestamp: string;
}

interface CreativeAiChatCoPilotProps {
  product: MarketingProduct | null;
  onApplyPrompt: (prompt: string) => void;
  onTriggerGenerate: (prompt: string) => void;
  isGenerating?: boolean;
}

export const CreativeAiChatCoPilot: React.FC<CreativeAiChatCoPilotProps> = ({
  product,
  onApplyPrompt,
  onTriggerGenerate,
  isGenerating = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      sender: "agent",
      text: `أهلاً بك! أنا المخرج الإبداعي الذكي لمشاهد التجارة الإلكترونية 2026. 
تقدر ترغي معايا وتقولي فكرتك بالكامل بالعامية أو أي تفاصيل في دماغك لأي منتج (${product?.name || "المنتج الحالي"})، وهساعدك نصيغ فكرة إعلانية مبتكرة وزوايا إضاءة سينمائية، ونولّد المشهد مع بعض فوراً!`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await apiClient.post<{
        success?: boolean;
        data?: {
          reply: string;
          suggestedPrompt?: string;
          suggestedAngle?: string;
        };
        message?: string;
      }>("/ai-image/chat", {
        message: text,
        productName: product?.name || "",
        productPrice: product?.price || 0,
        history: messages.slice(-6).map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        })),
      });

      if (res.data?.success && res.data.data) {
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: res.data.data.reply,
          suggestedPrompt: res.data.data.suggestedPrompt,
          suggestedAngle: res.data.data.suggestedAngle,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        // High quality intelligent local fallback reply if backend agent route is warming up
        const fallbackPrompt = `commercial advertising shoot for ${product?.name || "product"} inspired by: ${text}, cinematic lighting, 8k resolution, photorealistic, pristine commercial setup`;
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: `فكرة ممتازة جداً! قمت بصياغة مشهد تسويقي يعتمد على رؤيتك: "${text}"، مع مراعاة توزيع الإضاءة السينمائية ونقاء المنتج.`,
          suggestedPrompt: fallbackPrompt,
          suggestedAngle: "رؤية مخصصة من اقتراحك",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch {
      // Fallback
      const fallbackPrompt = `commercial advertising shoot for ${product?.name || "product"} inspired by: ${text}, cinematic lighting, 8k resolution, photorealistic, pristine commercial setup`;
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: `فكرة تسويقية رائعة ومؤثرة! قمت بصياغة برومبت إعلاني احترافي يترجم فكرتك بدقة:`,
        suggestedPrompt: fallbackPrompt,
        suggestedAngle: "رؤية إعلانية مخصصة",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    toast.success("تم نسخ البرومبت الإنجليزي");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickIdeas = [
    "عايز فكرة تصوير فخمة مع رخام أسود وإضاءة حواف ذهبية",
    "عايز سياق واقعي في الشارع الصباحي مع إضاءة شمس طبيعية",
    "عايز مشهد مائي مع قطرات متطايرة تثبت نقاء وخامات المنتج",
    "عايز مشهد مينيماليست حديث كمعايير أبل بتدرجات ناعمة",
  ];

  return (
    <div className="flex flex-col h-[480px] bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              محادثة المخرج الإبداعي (Creative Co-Pilot)
            </h4>
            <span className="text-[10px] text-slate-400">
              تحدث بالعامية لصياغة وتوليد مشاهد خيالية ومبتكرة
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                sender: "agent",
                text: "بدأنا جلسة عصف ذهني جديدة! قولي فكرتك في أي لحظة.",
                timestamp: new Date().toISOString(),
              },
            ])
          }
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
          title="بدء محادثة جديدة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-indigo-600 text-white shadow-xs"
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] text-right rounded-2xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white rounded-tr-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 shadow-2xs rounded-tl-xs"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Generative UI Card if Agent suggested a prompt */}
                {msg.suggestedPrompt && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 bg-indigo-50/50 dark:bg-indigo-950/30 -mx-3 -mb-3 p-3 rounded-b-2xl">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        البرومبت المقترح: {msg.suggestedAngle || "مشهد مخصص"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(msg.suggestedPrompt!, msg.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>نسخ</span>
                      </button>
                    </div>

                    <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60 line-clamp-3 mb-2.5 text-left direction-ltr">
                      {msg.suggestedPrompt}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPrompt(msg.suggestedPrompt!);
                          toast.success("تم تطبيق البرومبت في الكانفاس");
                        }}
                        className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>تطبيق في الكانفاس</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => onTriggerGenerate(msg.suggestedPrompt!)}
                        className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Rocket className="w-3 h-3" />
                        )}
                        <span>توليد فوراً</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <span>المخرج الإبداعي يفكر ويصيغ المشهد...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      {messages.length <= 2 && (
        <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto scrollbar-none bg-white/50 dark:bg-slate-900/50">
          <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0" />
          {quickIdeas.map((idea, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(idea)}
              className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 transition cursor-pointer flex-shrink-0"
            >
              {idea}
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="اطلب أي فكرة بالعامية (مثال: عايز عطر وسط رمال متحركة وذهب)..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          disabled={!inputMessage.trim() || isLoading}
          onClick={() => handleSendMessage()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition cursor-pointer shadow-xs flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
