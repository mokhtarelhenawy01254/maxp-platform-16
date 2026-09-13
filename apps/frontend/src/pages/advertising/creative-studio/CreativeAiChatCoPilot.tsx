import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Wand2,
  Rocket,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Lightbulb,
  Hash,
  Terminal,
  Zap,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { toast } from "sonner";
import type { MarketingProduct, SlashCommandItem } from "./types";

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

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    command: "/luxury",
    labelAr: "فخامة ورخام ملكي",
    labelEn: "Luxury Marble & Gold",
    promptSnippet: "Ultra-luxurious commercial shoot: Placed on polished black Nero Marquina marble with crisp gold rim lighting, subtle amber reflections, 8k resolution, cinematic lighting.",
    iconName: "💎",
    category: "فخامة",
  },
  {
    command: "/street",
    labelAr: "شارع عصري (Streetwear)",
    labelEn: "Urban Streetwear Context",
    promptSnippet: "Urban lifestyle commercial photography: In-situ on an authentic sunlit downtown concrete sidewalk, morning golden hour rim light, realistic asphalt contact shadows, 8k.",
    iconName: "👟",
    category: "لايف ستايل",
  },
  {
    command: "/model",
    labelAr: "عارض بشري (On-Model Swap)",
    labelEn: "On-Model Placement & Swap",
    promptSnippet: "High-fashion commercial with a real human model wearing and featuring {productName}, dynamic posture, natural skin texture, magazine cover composition, 8k resolution.",
    iconName: "🏃",
    category: "موديلز",
  },
  {
    command: "/water",
    labelAr: "انعكاسات مائية ورذاذ انتعاش",
    labelEn: "Water Droplets & Reflection",
    promptSnippet: "High-speed macro commercial: Clear crystal water splash droplets and reflections surrounding {productName}, crisp liquid refraction, ultra-fresh vibrant advertising.",
    iconName: "💧",
    category: "انتعاش",
  },
  {
    command: "/studio",
    labelAr: "استوديو ناصع ومحايد (Packshot)",
    labelEn: "Pristine Commercial Studio",
    promptSnippet: "Clean minimal commercial e-commerce studio: Pure soft off-white cyclorama backdrop, dual softbox diffusion lighting, razor-sharp product details, award-winning packshot.",
    iconName: "📸",
    category: "استوديو",
  },
  {
    command: "/swap",
    labelAr: "استبدال المنتج في المشهد (Swap)",
    labelEn: "Product Placement Swap",
    promptSnippet: "Commercial product swap: Seamlessly replace the item in the scene with {productName}, matching exact lighting angle, surface contact shadows, and realistic perspective.",
    iconName: "🔄",
    category: "استبدال",
  },
  {
    command: "/rain",
    labelAr: "مقاومة المطر واختبار المتانة",
    labelEn: "Durability & Rain Hook",
    promptSnippet: "Dramatic commercial hook: Resting on wet asphalt under light cinematic rainfall, glowing water beads, neon reflections in puddles, demonstrating endurance and durability.",
    iconName: "🌧️",
    category: "تفاعل",
  },
  {
    command: "/neon",
    labelAr: "سايبربانك ونيون ليلى",
    labelEn: "Cyberpunk & Neon Night",
    promptSnippet: "Cyber aesthetic commercial photography: Moody dark scene backlit with electric blue and crimson neon lighting, sleek tech reflections, ultra-modern nighttime vibe.",
    iconName: "⚡",
    category: "تقنية",
  },
];

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
تقدر ترغي معايا بالعامية وتقولي فكرتك بالكامل، أو تكتب ساش (/) لاختيار زاوية سريعة مثل (/luxury أو /street أو /model)، وهجهزلك البرومبت التجاري ونولّد المشهد مع بعض فوراً!`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Slash Command Popover State
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle Slash Autocomplete Filter
  const filteredCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.command.toLowerCase().includes(slashQuery.toLowerCase()) ||
    cmd.labelAr.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (val.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashQuery(val.slice(1));
      setSlashSelectedIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSlashCommand = (cmd: SlashCommandItem, autoTrigger: boolean = false) => {
    setShowSlashMenu(false);
    const resolvedPrompt = cmd.promptSnippet.replace(
      /\{productName\}/g,
      product?.name || "المنتج التجاري"
    );

    if (autoTrigger) {
      setInputMessage("");
      handleSendMessage(`أريد توليد مشهد: ${cmd.labelAr} (${cmd.command})`, resolvedPrompt, cmd.labelAr);
    } else {
      setInputMessage(`أريد تطبيق فكرة: ${cmd.labelAr} (${cmd.command})`);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectSlashCommand(filteredCommands[slashSelectedIndex], false);
        return;
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (textToSend?: string, customPromptOverride?: string, customAngleTitle?: string) => {
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
    setShowSlashMenu(false);
    setIsLoading(true);

    // If a slash command provided a pre-constructed high-converting prompt
    if (customPromptOverride) {
      setTimeout(() => {
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: `اختيار موفق جداً! جهزت لك البرومبت التجاري لزاوية "${customAngleTitle || 'مشهد مخصص'}" بأعلى معايير الإضاءة السينمائية 2026.`,
          suggestedPrompt: customPromptOverride,
          suggestedAngle: customAngleTitle || "مشهد مخصص",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
        setIsLoading(false);
      }, 350);
      return;
    }

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
        const fallbackPrompt = `commercial advertising shoot for ${product?.name || "product"} inspired by: ${text}, cinematic lighting, 8k resolution, photorealistic, pristine commercial setup`;
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: `فكرة ممتازة جداً! قمت بصياغة مشهد تسويقي متكامل يعتمد على رؤيتك: "${text}" مع ضبط الإضاءة والظلال.`,
          suggestedPrompt: fallbackPrompt,
          suggestedAngle: "رؤية تسويقية مخصصة",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      }
    } catch {
      const fallbackPrompt = `commercial advertising shoot for ${product?.name || "product"} inspired by: ${text}, cinematic lighting, 8k resolution, photorealistic, pristine commercial setup`;
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: `فكرة رائعة! قمت بصياغة برومبت إعلاني احترافي يترجم فكرتك بدقة متناهية:`,
        suggestedPrompt: fallbackPrompt,
        suggestedAngle: "مشهد مخصص",
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>محادثة المخرج الإبداعي (Creative Co-Pilot)</span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono px-1.5 py-0.2 rounded-full">
                Live AI
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              تحدث بالعامية لصياغة المشاهد أو اكتب <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">/</span> لأمر سريع
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setMessages([
              {
                id: `reset-${Date.now()}`,
                sender: "agent",
                text: "بدأنا جلسة عصف ذهني جديدة! قولي فكرتك في أي لحظة أو استخدم أوامر السلاش (/).",
                timestamp: new Date().toISOString(),
              },
            ])
          }
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="بدء محادثة جديدة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Scroll Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 min-h-0">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[92%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                  isUser
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-indigo-600 text-white shadow-2xs"
                }`}
              >
                {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Message Box */}
              <div className="space-y-2 flex-1 min-w-0">
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-xs"
                      : "bg-slate-100/90 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800 rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Generative UI Card for Prompts */}
                {msg.suggestedPrompt && (
                  <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900/60 p-3 space-y-2.5 shadow-2xs animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-indigo-100/80 dark:border-indigo-900/40 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-200">
                          {msg.suggestedAngle || "البرومبت التجاري المقترح"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(msg.suggestedPrompt!, msg.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-950/80 border border-slate-200/60 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 leading-relaxed max-h-24 overflow-y-auto no-scrollbar select-all">
                      {msg.suggestedPrompt}
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyPrompt(msg.suggestedPrompt!);
                          toast.success("تم تطبيق البرومبت في الكانفاس");
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>تطبيق في الكانفاس</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => onTriggerGenerate(msg.suggestedPrompt!)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>جارِ التوليد...</span>
                          </>
                        ) : (
                          <>
                            <Rocket className="w-3 h-3" />
                            <span>توليد فوراً 🚀</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2 mr-auto items-center text-slate-400 text-xs py-2 animate-pulse">
            <Bot className="w-4 h-4 text-indigo-500 animate-spin" />
            <span>المخرج الإبداعي يفكر ويحلل الفكرة تسويقياً...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Slash Commands Autocomplete Menu */}
      {showSlashMenu && filteredCommands.length > 0 && (
        <div className="absolute bottom-28 right-3 left-3 z-40 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/80 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Terminal className="w-3 h-3 text-indigo-500" />
              <span>أوامر السلاش السريعة (Slash Commands)</span>
            </span>
            <span className="text-[10px] text-slate-400">Enter للاختيار • Esc للإلغاء</span>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
            {filteredCommands.map((cmd, idx) => {
              const isSelected = idx === slashSelectedIndex;
              return (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => handleSelectSlashCommand(cmd, false)}
                  className={`w-full text-right px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cmd.iconName}</span>
                    <div>
                      <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {cmd.command}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 mr-2">
                        {cmd.labelAr}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {cmd.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer: Quick Idea Pills + Input Bar */}
      <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex-shrink-0 space-y-2">
        {/* Quick Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-0.5 flex-shrink-0">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>اقتراحات:</span>
          </span>
          {[
            { label: "💎 رخام أسود وذهب", cmd: "/luxury" },
            { label: "👟 شارع عصري", cmd: "/street" },
            { label: "💧 انعكاسات مائية", cmd: "/water" },
            { label: "🏃 عارض On-Model", cmd: "/model" },
            { label: "🌧️ قطرات مطر", cmd: "/rain" },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const found = SLASH_COMMANDS.find((c) => c.command === item.cmd);
                if (found) handleSelectSlashCommand(found, false);
              }}
              className="text-[11px] font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 transition whitespace-nowrap cursor-pointer flex-shrink-0 shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Input & Send Action */}
        <div className="relative flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="اكتب بالعامية أو اضغط / للأوامر السريعة (مثال: /luxury)..."
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-2xs"
          />

          <button
            type="button"
            disabled={!inputMessage.trim() || isLoading}
            onClick={() => handleSendMessage()}
            className="absolute left-1.5 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition cursor-pointer shadow-xs"
            title="إرسال الفكرة"
          >
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
