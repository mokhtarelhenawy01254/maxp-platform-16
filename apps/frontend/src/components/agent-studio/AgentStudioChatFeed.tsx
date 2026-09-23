import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Plus,
  ImageIcon,
  X,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StudioEntity, StudioMessage, StudioSession, StudioQuickPrompt } from "./types";
import { AgentStudioMarkdownMessage } from "./AgentStudioMarkdownMessage";
import uploadService from "../../services/uploadService";

export interface AgentStudioChatFeedProps {
  selectedEntity?: StudioEntity | null;
  activeSession: StudioSession;
  loading: boolean;
  onSendMessage: (text: string, images?: string[]) => void;
  quickPrompts?: StudioQuickPrompt[];
  emptyStateTitle?: string;
  emptyStateSubtitle?: string;
  emptyStateIcon?: LucideIcon;
  inputPlaceholder?: string;
  onNewSession?: () => void;
  allowImageUpload?: boolean;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  serverUrl?: string;
  uploading: boolean;
  error?: string;
}

export const AgentStudioChatFeed: React.FC<AgentStudioChatFeedProps> = ({
  selectedEntity,
  activeSession,
  loading,
  onSendMessage,
  quickPrompts = [],
  emptyStateTitle = "ابدأ المحادثة مع الوكيل الذكي",
  emptyStateSubtitle = "أنا هنا لمساعدتك في تحليل البيانات واتخاذ القرارات وتنفيذ الإجراءات بسرعة وأمان.",
  emptyStateIcon: EmptyIcon = Sparkles,
  inputPlaceholder = "اكتب سؤالك أو اطلب تحليلاً أو تعديلاً...",
  onNewSession,
  allowImageUpload = true,
}) => {
  const [inputMessage, setInputMessage] = useState("");
  const [copiedSessionId, setCopiedSessionId] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [activeSession?.messages, loading]);

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) return;

    const newItems: PendingImage[] = fileList.map((f) => ({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      uploading: true,
    }));

    setPendingImages((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      try {
        const res = await uploadService.uploadProductImage(item.file);
        if (res.success && res.data?.url) {
          setPendingImages((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, serverUrl: res.data!.url, uploading: false } : p))
          );
        } else {
          setPendingImages((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, uploading: false, error: res.error || "فشل الرفع" } : p))
          );
        }
      } catch (err: any) {
        setPendingImages((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, uploading: false, error: err.message || "فشل الرفع" } : p))
        );
      }
    }
  };

  const handleRemoveImage = (id: string) => {
    setPendingImages((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!allowImageUpload) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleUploadFiles(files);
    }
  };

  const handleSend = (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    const readyImages = pendingImages.filter((p) => p.serverUrl && !p.uploading).map((p) => p.serverUrl!);
    const hasUploading = pendingImages.some((p) => p.uploading);

    if (hasUploading) return;
    if ((!textToSend && readyImages.length === 0) || loading) return;

    const finalText = textToSend || "يرجى فحص صورة المنتج المرفقة وتحليل مواصفاته وإنشائه في المتجر والمخزن.";
    setInputMessage("");
    setPendingImages([]);
    try {
      onSendMessage(finalText, readyImages.length > 0 ? readyImages : undefined);
    } catch (err) {
      console.error("[AgentStudioChatFeed] onSendMessage error:", err);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = Array.isArray(activeSession?.messages) ? activeSession.messages : [];

  return (
    <div
      onDragOver={(e) => {
        if (!allowImageUpload) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        if (!allowImageUpload) return;
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          handleUploadFiles(e.dataTransfer.files);
        }
      }}
      className={`relative flex flex-col h-full bg-white dark:bg-slate-950 min-h-0 overflow-hidden ${
        isDragging ? "ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20" : ""
      }`}
    >
      {/* Drag & Drop Visual Indicator */}
      {isDragging && (
        <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none p-6 text-center">
          <div className="p-4 rounded-2xl bg-indigo-600 mb-3 shadow-lg">
            <ImageIcon className="w-8 h-8 animate-bounce" />
          </div>
          <p className="text-sm font-bold">أفلت صورة المنتج هنا لرفعها للوكيل الذكي</p>
        </div>
      )}
      {/* Messages List Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <EmptyIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              {emptyStateTitle}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {emptyStateSubtitle}
            </p>

            {/* Quick action prompts in empty state */}
            {quickPrompts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.generatePrompt(selectedEntity))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-700 dark:text-slate-300 transition text-right cursor-pointer active:scale-[0.98]"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-xs ${
                    isUser
                      ? "bg-indigo-600"
                      : "bg-slate-900 dark:bg-slate-800 text-indigo-400 border border-slate-700/50"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tr-xs"
                      : "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs"
                  }`}
                >
                  {/* Tool execution indicators */}
                  {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 space-y-1">
                      {msg.toolCalls.map((t: any, idx: number) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 ml-1.5"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{t.name || "أداة ذكية"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attached images in message */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      {msg.images.map((imgUrl, imgIdx) => (
                        <a
                          key={imgIdx}
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block rounded-xl overflow-hidden border border-white/20 dark:border-slate-700 max-w-[220px] max-h-48 group shadow-xs cursor-pointer"
                          title="عرض الصورة بحجمها الكامل"
                        >
                          <img
                            src={imgUrl}
                            alt={`صورة مرفقة ${imgIdx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Maximize2 className="w-4 h-4 text-white drop-shadow-md" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Markdown Content */}
                  <AgentStudioMarkdownMessage content={msg.text} isUser={isUser} />

                  {/* Timestamp */}
                  {msg.timestamp && (
                    <div
                      className={`text-[9px] mt-1.5 opacity-60 tabular-nums ${
                        isUser ? "text-indigo-200 text-left" : "text-slate-400 text-right"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 flex-row items-center">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-slate-900 dark:bg-slate-800 text-indigo-400 border border-slate-700/50">
              <Bot className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="px-4 py-2.5 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span>جاري التحليل واستدعاء الأدوات...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Carousel bar above input */}
      {quickPrompts.length > 0 && (
        <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-x-auto flex gap-1.5 no-scrollbar">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => handleSend(qp.generatePrompt(selectedEntity))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition whitespace-nowrap cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input & Footer Controls */}
      <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90">
        {/* Pending Images Preview Bar */}
        {pendingImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 overflow-x-auto">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="relative group flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-2xs"
              >
                <img src={img.previewUrl} alt="معاينة" className="w-full h-full object-cover" />
                {img.uploading && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    <span className="text-[9px] mt-0.5 font-bold">رفع...</span>
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 bg-rose-950/70 flex flex-col items-center justify-center text-white p-1 text-center">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[8px] leading-tight text-rose-200">{img.error}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white transition cursor-pointer shadow-xs"
                  title="حذف الصورة"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {allowImageUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    handleUploadFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-40 shadow-2xs"
                title="إرفاق صورة منتج للوكيل الذكي"
              >
                <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </button>
            </>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={inputPlaceholder}
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={
              (!inputMessage.trim() && pendingImages.length === 0) ||
              loading ||
              pendingImages.some((p) => p.uploading)
            }
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
            title="إرسال"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 rtl:-scale-x-100" />
            )}
          </button>
        </div>

        {/* Telemetry Footer */}
        <div className="flex items-center justify-between mt-2 pt-1 text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              الجلسة: {activeSession?.id ? activeSession.id.slice(-8) : "—"}
            </span>
            <button
              type="button"
              onClick={handleCopySessionId}
              className="hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="نسخ معرف الجلسة"
            >
              {copiedSessionId ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span>الذاكرة السحابية نشطة</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </footer>
    </div>
  );
};
