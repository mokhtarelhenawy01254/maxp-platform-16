import React, { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import {
  Send,
  Bot,
  User,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  BookOpen,
  Image as ImageIcon,
  X,
  Loader2,
  Upload
} from "lucide-react";
import type { ChatMessage, AgentConfig, ModelConfig, ToolCall } from "../types/sandbox.types";
import type { AgentSkillDetail } from "../services/sandboxApi";

interface ChatAreaProps {
  messages: ChatMessage[];
  agent: AgentConfig | null;
  model: string;
  providers: ModelConfig[];
  isLoading: boolean;
  isStreaming: boolean;
  canSend: boolean;
  typingStage?: string | null;
  activeToolCalls?: ToolCall[];
  onSendMessage: (
    message: string,
    attachments?: Array<{ type: string; url: string; dataUrl?: string; base64Data?: string }>
  ) => void;
  isSuper?: boolean;
  agentSkills?: AgentSkillDetail[];
}

const TEST_IMAGES = [
  {
    label: "Classic Watch",
    url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80",
    icon: "⌚",
  },
  {
    label: "Platform Sneakers",
    url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80",
    icon: "👟",
  },
  {
    label: "Linen Shirt",
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80",
    icon: "👔",
  },
];

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  agent,
  model,
  providers,
  isLoading,
  isStreaming,
  canSend,
  typingStage,
  activeToolCalls,
  onSendMessage,
  isSuper = false,
  agentSkills = [],
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 100;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  };

  useEffect(() => {
    if (!isAtBottom) return;
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isAtBottom]);

  const renderFormattedText = (content: string) => {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"'()]+)/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(content.slice(lastIndex, match.index));
      }

      if (match[1] && match[2]) {
        const label = match[1];
        const url = match[2];
        elements.push(
          <a
            key={`md-link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-700 dark:hover:text-indigo-300 break-all inline-flex items-center gap-0.5 cursor-pointer"
          >
            {label}
          </a>
        );
      } else if (match[3]) {
        const url = match[3];
        elements.push(
          <a
            key={`url-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-700 dark:hover:text-indigo-300 break-all inline-flex items-center gap-0.5 cursor-pointer"
          >
            {url}
          </a>
        );
      }

      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      elements.push(content.slice(lastIndex));
    }

    return elements.length > 0 ? elements : content;
  };

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
        <span className="text-sm font-semibold select-none">
          {t("aiHub.sandbox.chat.selectAgent")}
        </span>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 800;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setSelectedImageUrl(dataUrl);
        } else {
          setSelectedImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    const hasAttachments = Boolean(selectedImageUrl.trim());
    if ((!trimmedInput && !hasAttachments) || isLoading || !canSend) return;

    let attachments;
    if (hasAttachments) {
      const isDataUrl = selectedImageUrl.startsWith("data:");
      attachments = [{
        type: "image",
        url: selectedImageUrl.trim(),
        dataUrl: isDataUrl ? selectedImageUrl.trim() : undefined,
        base64Data: isDataUrl ? selectedImageUrl.split(",")[1] : undefined
      }];
    }

    onSendMessage(trimmedInput, attachments);
    setInput("");
    setSelectedImageUrl("");
    setShowAttachmentPanel(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseMessageContent = (content: string) => {
    const mdImageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    const images: string[] = [];
    while ((match = mdImageRegex.exec(content)) !== null) {
      images.push(match[2]);
    }

    const plainImageRegex = /(https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:\?[^\s<>"]*)?)/gi;
    while ((match = plainImageRegex.exec(content)) !== null) {
      if (!images.includes(match[1])) {
        images.push(match[1]);
      }
    }

    let cleanText = content
      .replace(mdImageRegex, "")
      .replace(plainImageRegex, "")
      .trim();

    // Filter reasoning/draft lines that should never reach users
    const bulletRe = /^\s*[-*]\s*\*?\s*/;
    const draftRe = /Draft\s+\d+/i;
    const reasoningKeywordRe = /^\s*[-*]\s*\*?\s*(?:Option|Goal|Context|Constraint|User\s*Question|Agent\s*(?:Identity|Persona)|Persona|Knowledge\s*Base|Knowledge|Refined|Analysis|Reasoning|Input|Meaning|Language|Plan|Step|Note|Consideration|Evaluation|Draft|Final(?:\s*Answer)?|Response|Output)[\s\d]*:/i;
    const checklistRe = /\?\s*(?:Yes|No|Maybe|Y|N|true|false|✓|✗)\b/i;
    const bracketReasoningRe = /^\s*\[[^\]]+\]\s*(?:Yes|No|Maybe|Y|N|true|false|✓|✗)?\s*$/i;
    const monologueRe = /^\s*[-*]\s*\*?\s*(?:The\s+user|I\s+(?:need|should|will|must|think|can|have)|Usually,|The\s+goal|The\s+persona|Agent\s+(?:Identity|Persona)|Knowledge\s*Base|Final(?:\s+answer)?|Response|Output)\b/i;

    const kept: string[] = [];
    for (const rawLine of cleanText.split('\n')) {
      const trimmed = rawLine.trim();
      const isBullet = bulletRe.test(trimmed);
      if (isBullet && (draftRe.test(trimmed) || reasoningKeywordRe.test(trimmed) || checklistRe.test(trimmed) || monologueRe.test(trimmed))) continue;
      if (bracketReasoningRe.test(trimmed)) continue;
      kept.push(rawLine);
    }
    cleanText = kept.join('\n').trim();

    return { images, text: cleanText };
  };

  return (
    <div className="flex-1 flex flex-col self-stretch min-w-0 bg-slate-50/20 dark:bg-slate-905 overflow-hidden">
      {/* Scrollable Chat Message History */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Quick action chips for merchants when chat is empty */}
        {!isSuper && messages.length === 0 && agent && canSend && (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <p className="text-sm text-slate-500 font-medium">بماذا تريد أن يساعدك {agent.name}؟</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {[
                { icon: "📊", label: "كيف حال المبيعات اليوم؟" },
                { icon: "📦", label: "تفقد آخر الطلبات" },
                { icon: "🏪", label: "ما حالة المخزون؟" },
                { icon: "📋", label: "أريد تقرير سريع عن المتجر" },
                { icon: "💰", label: "كم إجمالي الإيرادات هذا الشهر؟" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => onSendMessage(chip.label)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const parsed = parseMessageContent(msg.content);
          const attachmentImages = (msg.responseAttachments || [])
            .filter((attachment) => attachment.type === "image" && attachment.url)
            .map((attachment) => attachment.url);
          const images = Array.from(new Set([...parsed.images, ...attachmentImages]));
          const text = parsed.text;
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`size-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 select-none ${
                isUser ? "bg-slate-500" : "bg-indigo-600 dark:bg-indigo-500"
              }`}>
                {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>

              {/* Message Body */}
              <div className="flex flex-col max-w-[80%] min-w-0">
                <div
                  className={`p-3.5 rounded-2xl relative group shadow-sm text-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none"
                  }`}
                >
                  {images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt="Attachment"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                      className={`max-w-full max-h-[200px] rounded-lg object-cover shadow-sm transition-transform duration-200 hover:scale-[1.01] ${
                        text ? "mb-3" : "mb-0"
                      }`}
                    />
                  ))}
                  
                  {text && (
                    <p className="whitespace-pre-wrap leading-relaxed pr-7">
                      {renderFormattedText(text)}
                    </p>
                  )}

                  {/* Copy Button */}
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded shadow-xs z-10"
                    title={t("aiHub.sandbox.chat.copyMessage")}
                    aria-label={t("aiHub.sandbox.chat.copyMessage")}
                  >
                    {copiedId === msg.id ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3 text-slate-400 hover:text-slate-650" />
                    )}
                  </button>

                  {/* Message Runtime Info */}
                  {!isUser && msg.runtime && (
                    <div className="mt-2 flex items-center">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        msg.runtime === "local-nodejs"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      }`}>
                        {msg.runtime === "local-nodejs" ? "⬡ Node" : "🐍 Python"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tool Calls Chips */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.toolCalls.map((tc, idx) => (
                      <Badge
                        key={`${tc.id || tc.name}-${idx}`}
                        variant={
                          tc.status === "success"
                            ? "success"
                            : tc.status === "error"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] py-0 px-2 flex items-center gap-1 font-medium select-none"
                      >
                        {tc.status === "success" ? (
                          <CheckCircle2 className="size-3" />
                        ) : tc.status === "error" ? (
                          <AlertCircle className="size-3" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                        <span>{tc.name}</span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Model & Skill Info */}
                {!isUser && (msg.model || msg.metadata?.activeSkill) && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.model && (
                      <Badge variant="outline" className="text-[10px] py-0 px-2 flex items-center gap-1 font-medium select-none border-slate-300 dark:border-slate-700">
                        <Cpu className="size-3" />
                        <span>{msg.provider ? `${msg.provider}/${msg.model}` : msg.model}</span>
                      </Badge>
                    )}
                    {msg.metadata?.activeSkill && (() => {
                      const skillId = msg.metadata.activeSkill.skillId;
                      const skillDetail = agentSkills.find((s) => s.id === skillId);
                      const displayName = skillDetail?.displayName || skillDetail?.name || skillId;
                      return (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 flex items-center gap-1 font-medium select-none border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400" title={skillDetail?.description || skillId}>
                          <BookOpen className="size-3" />
                          <span>{displayName}</span>
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Generating Placeholder */}
        {isLoading && (
          <div className="flex gap-3 items-start">
            <div className="size-8 rounded-full bg-indigo-650 dark:bg-indigo-500 flex items-center justify-center text-white text-xs flex-shrink-0 select-none">
              <Bot className="size-4 animate-pulse" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-sm space-y-2 max-w-[80%] min-w-[180px]">
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="size-3.5 animate-spin text-indigo-600" />
                <span className="text-xs font-medium">
                  {typingStage || (isStreaming ? t("aiHub.sandbox.chat.generating") : t("aiHub.sandbox.chat.thinking"))}
                </span>
              </div>

              {activeToolCalls && activeToolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {activeToolCalls.map((tc, idx) => (
                    <Badge
                      key={`${tc.id || tc.name}-${idx}`}
                      variant={
                        tc.status === "success"
                          ? "success"
                          : tc.status === "error"
                          ? "destructive"
                          : "outline"
                      }
                      className="text-[10px] py-0 px-2 flex items-center gap-1 select-none"
                    >
                      {tc.status === "success" ? (
                        <CheckCircle2 className="size-3" />
                      ) : tc.status === "error" ? (
                        <AlertCircle className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      <span>{tc.name}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Panel */}
      {showAttachmentPanel && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-550 uppercase tracking-wider">
              {t("aiHub.sandbox.chat.imageAttachment")}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setShowAttachmentPanel(false);
                setSelectedImageUrl("");
              }}
              aria-label={t("aiHub.sandbox.chat.closeAttachmentPanel")}
              title={t("aiHub.sandbox.chat.closeAttachmentPanel")}
              className="size-6 text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-850"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-inner scale-[0.99]"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <Upload className="size-6 mx-auto text-slate-400 dark:text-slate-550 mb-1.5 animate-pulse" />
            <span className="text-xs text-slate-600 dark:text-slate-300 block font-medium">
              {t("aiHub.sandbox.chat.dragDropImage")}{" "}
              <span className="text-indigo-650 dark:text-indigo-400 font-semibold hover:underline">
                {t("aiHub.sandbox.chat.browse")}
              </span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-550 block mt-0.5">
              {t("aiHub.sandbox.chat.supportedFormats")}
            </span>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-850"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-400 uppercase tracking-wider font-bold">
              {t("aiHub.sandbox.chat.orPasteUrl")}
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-850"></div>
          </div>

          <input
            type="text"
            placeholder={t("aiHub.sandbox.chat.imageUrlPlaceholder")}
            value={selectedImageUrl.startsWith("data:") ? "" : selectedImageUrl}
            onChange={(e) => setSelectedImageUrl(e.target.value)}
            className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-650"
          />

          {isSuper && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-450 font-medium">{t("aiHub.sandbox.chat.quickSelect")}</span>
            {TEST_IMAGES.map((img) => (
              <Badge
                key={img.label}
                variant={selectedImageUrl === img.url ? "default" : "outline"}
                onClick={() => setSelectedImageUrl(img.url)}
                className="cursor-pointer text-[10px] py-0.5 px-2 hover:scale-[1.01] transition-transform select-none"
              >
                <span className="mr-1">{img.icon}</span>
                <span>{img.label}</span>
              </Badge>
            ))}
          </div>
          )}

          {selectedImageUrl && (
            <div className="relative size-20">
              <img
                src={selectedImageUrl}
                alt="Preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594322436404-5a0526db4d13?auto=format&fit=crop&w=100&q=80";
                }}
                className="w-full h-full rounded-lg object-cover border border-slate-200 dark:border-slate-800"
              />
              <button
                onClick={() => setSelectedImageUrl("")}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white flex items-center justify-center p-0 hover:bg-red-650 transition-colors shadow-xs"
                aria-label={t("aiHub.sandbox.chat.clearImage")}
                title={t("aiHub.sandbox.chat.clearImage")}
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Message Input Box */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-950 flex items-end gap-2.5">
        <Button
          size="icon"
          variant={showAttachmentPanel || selectedImageUrl ? "default" : "ghost"}
          onClick={() => setShowAttachmentPanel(!showAttachmentPanel)}
          disabled={isLoading || !canSend}
          aria-label={t("aiHub.sandbox.chat.attachImage")}
          title={t("aiHub.sandbox.chat.attachImage")}
          className="size-9 rounded-xl flex-shrink-0 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850"
        >
          <ImageIcon className="size-5" />
        </Button>

        <div className="flex-1 min-w-0 relative">
          <Textarea
            placeholder={canSend
              ? t("aiHub.sandbox.chat.messagePlaceholder", { agentName: agent.name })
              : t("aiHub.sandbox.chat.selectCentralModel")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !canSend}
            rows={1}
            className="w-full min-h-[36px] max-h-[120px] text-sm resize-none rounded-xl dark:bg-slate-955 dark:border-slate-800 pr-10 focus-visible:ring-indigo-650"
          />
          {!canSend && (
            <span className="absolute bottom-1 right-2 text-[9px] text-red-500 font-semibold select-none">
              {t("aiHub.sandbox.chat.configureApiKey")}
            </span>
          )}
        </div>

        <Button
          size="icon"
          variant="default"
          onClick={handleSend}
          disabled={(!input.trim() && !selectedImageUrl) || isLoading || !canSend}
          aria-label={t("aiHub.sandbox.chat.sendMessage")}
          title={t("aiHub.sandbox.chat.sendMessage")}
          className="size-9 rounded-xl flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};
