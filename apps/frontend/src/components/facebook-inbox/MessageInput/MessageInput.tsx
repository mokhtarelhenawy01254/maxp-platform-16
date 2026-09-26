import React, { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  XMarkIcon,
  PlusIcon,
  PhotoIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { Mic, Trash2, Loader2 } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useAudioRecorder } from "../../../hooks/useAudioRecorder";
import QuickReplyDropdown, {
  QuickReply,
} from "../QuickReplyDropdown/QuickReplyDropdown";
import {
  replaceVariables,
  getContextVariables,
} from "../../../utils/quickReplyUtils";

interface MessageInputProps {
  onSendMessage?: (content: string) => void;
  onSendFile?: (file: File) => void;
  sending?: boolean;
  uploadingFile?: boolean;
  conversation?: any;
  user?: any;
  replyTo?: any;
  onCancelReply?: () => void;
  onOpenTextGallery?: () => void;
  onOpenImageGallery?: () => void;
  onOpenProductPicker?: () => void;
  // Compatibility with other inbox pages
  onSend?: (content: string) => void;
  isSending?: boolean;
  platform?: string;
  draftMessage?: string;
  onDraftMessageHandled?: () => void;
  onSendQuickReply?: (reply: QuickReply) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  sending = false,
  uploadingFile = false,
  conversation,
  user,
  replyTo,
  onCancelReply,
  onOpenTextGallery,
  onOpenImageGallery,
  onOpenProductPicker,
  onSend,
  isSending = false,
  draftMessage,
  onDraftMessageHandled,
  onSendQuickReply,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Voice recording integration
  const {
    status: recordingStatus,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl,
    error: recordingError,
  } = useAudioRecorder();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingVoiceRef = useRef(false);

  const handleStartVoiceRecording = () => {
    setShowMobileTools(false);
    setShowEmojiPicker(false);
    setShowQuickReplies(false);
    setIsRecording(true);
    setRecordingSeconds(0);
    startRecording();
  };

  const handleCancelVoiceRecording = () => {
    setIsRecording(false);
    stopRecording();
    clearBlobUrl();
    setRecordingSeconds(0);
    isSubmittingVoiceRef.current = false;
  };

  const handleStopAndSendVoice = () => {
    isSubmittingVoiceRef.current = true;
    stopRecording();
  };

  useEffect(() => {
    if (isRecording && recordingStatus === "recording") {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recordingStatus]);

  useEffect(() => {
    if (!isSubmittingVoiceRef.current || !mediaBlobUrl || recordingStatus !== "stopped") {
      return;
    }

    isSubmittingVoiceRef.current = false;
    setIsRecording(false);

    const submitVoiceBlob = async () => {
      try {
        const response = await fetch(mediaBlobUrl);
        const blob = await response.blob();
        if (blob.size < 500) {
          console.warn("Audio recording too small or empty, skipping send:", blob.size);
          return;
        }

        const ext = blob.type.includes("mp4")
          ? "m4a"
          : blob.type.includes("ogg")
            ? "ogg"
            : "webm";
        const file = new File(
          [blob],
          `voice-${Date.now()}.${ext}`,
          { type: blob.type || "audio/mp4" },
        );

        if (onSendFile) {
          onSendFile(file);
        }
      } catch (err) {
        console.error("Failed to process voice note recording:", err);
      } finally {
        clearBlobUrl();
        setRecordingSeconds(0);
      }
    };

    submitVoiceBlob();
  }, [clearBlobUrl, mediaBlobUrl, onSendFile, recordingStatus]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const isBusy = sending || isSending;
  const handleSendAction = onSendMessage || onSend;

  // Insert draft text when provided from TextGallery or QuickReplies
  React.useEffect(() => {
    if (draftMessage !== undefined && draftMessage !== null && draftMessage !== "") {
      setMessage((prev) => (prev ? `${prev}\n${draftMessage}` : draftMessage));
      if (onDraftMessageHandled) {
        onDraftMessageHandled();
      }
      setTimeout(() => {
        if (messageInputRef.current) {
          if (!isCompactMobile) {
            messageInputRef.current.focus();
          }
          messageInputRef.current.style.height = "auto";
          messageInputRef.current.style.height =
            Math.min(messageInputRef.current.scrollHeight, 120) + "px";
        }
      }, 50);
    }
  }, [draftMessage, onDraftMessageHandled, isCompactMobile]);

  // Focus input on mount (desktop only to prevent unwanted mobile keyboard popups)
  React.useEffect(() => {
    if (!isCompactMobile && messageInputRef.current && !isBusy && !uploadingFile) {
      messageInputRef.current.focus();
    }
  }, [isCompactMobile]);

  // Keep input focused after sending message (desktop only)
  React.useEffect(() => {
    if (!isCompactMobile && !isBusy && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  }, [isBusy, isCompactMobile]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewportMode = () => {
      setIsCompactMobile(window.innerWidth < 640);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  // Close mobile tools dropdown on outside click
  React.useEffect(() => {
    if (!showMobileTools) return undefined;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setShowMobileTools(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMobileTools]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (message.trim() && !isBusy && handleSendAction) {
      handleSendAction(message);
      setMessage("");
      setShowQuickReplies(false);
      setShowMobileTools(false);
      setShowEmojiPicker(false);
      if (messageInputRef.current) {
        messageInputRef.current.style.height = "auto";
      }
      if (!isCompactMobile) {
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showQuickReplies) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Trigger quick replies if starting with / or preceded by space
    if (value.startsWith("/") || /(?:^|\s)\/([^\s]*)$/.test(value)) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }

    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  const handleSelectQuickReply = (reply: QuickReply) => {
    const contextVars = getContextVariables(conversation, user);
    const rawText = reply.content || (reply as any).text || "";
    const processedContent = replaceVariables(rawText, contextVars);

    // If message contains slash command, replace the slash portion or append cleanly
    const lastSlashIndex = message.lastIndexOf("/");
    if (lastSlashIndex > 0) {
      const preceding = message.slice(0, lastSlashIndex).trim();
      setMessage(preceding ? `${preceding}\n${processedContent}` : processedContent);
    } else if (lastSlashIndex === 0) {
      setMessage(processedContent);
    } else if (message.trim()) {
      setMessage(`${message.trim()}\n${processedContent}`);
    } else {
      setMessage(processedContent);
    }

    setShowQuickReplies(false);
    setShowMobileTools(false);
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
      messageInputRef.current.style.height =
        Math.min(messageInputRef.current.scrollHeight, 120) + "px";

      // On desktop, re-focus for continuous typing.
      // On mobile, DO NOT force focus: prevents keyboard from closing and immediately re-opening (bouncing/jittering).
      if (!isCompactMobile) {
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 50);
      }
    }
  };

  const handleDirectSendQuickReply = (reply: QuickReply) => {
    const contextVars = getContextVariables(conversation, user);
    const rawText = reply.content || (reply as any).text || "";
    const processedContent = replaceVariables(rawText, contextVars);

    setShowQuickReplies(false);
    setShowMobileTools(false);
    setMessage("");

    if (messageInputRef.current) {
      messageInputRef.current.style.height = "auto";
    }

    if (onSendQuickReply) {
      onSendQuickReply({
        ...reply,
        content: processedContent,
      });
    } else if (handleSendAction) {
      handleSendAction(processedContent);
    }
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !uploadingFile && onSendFile) {
      onSendFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowMobileTools(false);
  };

  return (
    <div className="business-chat-composer business-chat-composer--facebook relative">
      {/* Quick Replies Dropdown */}
      {showQuickReplies && (
        <QuickReplyDropdown
          inputValue={message}
          onSelectReply={handleSelectQuickReply}
          onDirectSend={handleDirectSendQuickReply}
          onClose={() => setShowQuickReplies(false)}
          conversation={conversation}
          user={user}
        />
      )}

      {/* Reply Banner */}
      {replyTo && (
        <div
          className="flex justify-between items-center text-xs sm:text-sm px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2"
          style={{
            background:
              "var(--business-surface-subtle, color-mix(in srgb, var(--color-foreground) 8%, var(--color-background)))",
            borderBottom: "1px solid var(--business-muted-line)",
          }}
        >
          <div className="flex flex-col max-w-[85%] sm:max-w-[90%] flex-1 min-w-0">
            <span
              className="font-semibold text-xs truncate"
              style={{ color: "var(--color-primary)" }}
            >
              الرد على {replyTo.senderName}:
            </span>
            <span
              className="truncate text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {replyTo.type === "text"
                ? replyTo.content
                : replyTo.type === "image"
                  ? "🖼️ صورة"
                  : "📎 ملف"}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="business-chip-button p-1 sm:p-1.5 rounded-full flex-shrink-0"
          >
            <XMarkIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Main Single-Line Composer Form */}
      <form
        onSubmit={handleSend}
        className="business-chat-composer-form flex items-end gap-1.5 sm:gap-2 p-2 sm:p-2.5"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
        />

        {isRecording ? (
          <div className="flex w-full items-center gap-2 rounded-xl bg-red-500/10 px-3 py-1.5 border border-red-500/30">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancelVoiceRecording}
              className="p-1.5 sm:p-2 rounded-full text-red-500 hover:bg-red-500/20 active:scale-95 transition-all flex items-center justify-center"
              title="إلغاء التسجيل"
              aria-label="إلغاء التسجيل"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Recording pulse & time */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500"></span>
              </span>
              <Mic className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                {formatRecordingTime(recordingSeconds)}
              </span>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                {recordingStatus === "recording" ? "جاري تسجيل صوتي..." : "جاري المعالجة..."}
              </span>
              {recordingError && (
                <span className="text-xs text-red-500 truncate">
                  يرجى السماح بالميكروفون
                </span>
              )}
            </div>

            {/* Send Voice Button */}
            <button
              type="button"
              onClick={handleStopAndSendVoice}
              disabled={recordingStatus === "acquiring_media" || recordingSeconds === 0}
              className="business-chip-button flex h-[34px] sm:h-[38px] items-center gap-1.5 rounded-xl px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              style={{
                background: "var(--color-primary, #3b82f6)",
              }}
              title="إرسال الفويس"
            >
              <PaperAirplaneIcon className="h-4 w-4 rtl:-scale-x-100" />
              <span>إرسال</span>
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Tools Plus Button & Popover (hidden on sm+) */}
            <div className="relative flex-shrink-0 sm:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setShowMobileTools((prev) => !prev)}
            className={`business-icon-button flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-all duration-200 ${
              showMobileTools
                ? "text-white"
                : "text-foreground"
            }`}
            style={{
              background: showMobileTools
                ? "var(--color-primary)"
                : "color-mix(in srgb, var(--color-foreground) 8%, transparent)",
              transform: showMobileTools ? "rotate(45deg)" : "none",
            }}
            title="المرفقات والأدوات"
            aria-label="المرفقات والأدوات"
          >
            <PlusIcon className="h-5 w-5" />
          </button>

          {/* Mobile Tools Popover */}
          {showMobileTools && (
            <div
              className="absolute bottom-[calc(100%+8px)] start-0 z-50 min-w-[210px] max-w-[260px] rounded-2xl p-1.5 shadow-2xl border animate-in fade-in zoom-in-95 duration-150"
              style={{
                background: "var(--business-surface-strong, #182234)",
                borderColor: "var(--business-card-border, rgba(255,255,255,0.12))",
                boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.45)",
              }}
            >
              <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground border-b border-white/10 flex items-center justify-between mb-1">
                <span>أدوات المحادثة</span>
                <span className="text-[10px] opacity-70">مرفقات سريعة</span>
              </div>

              <div className="flex flex-col gap-0.5">
                {/* Image Gallery */}
                {onOpenImageGallery && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenImageGallery();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <PhotoIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">معرض الصور</span>
                      <span className="text-[10px] text-muted-foreground truncate">إرسال صور من الحافظة</span>
                    </div>
                  </button>
                )}

                {/* Text Gallery */}
                {onOpenTextGallery && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenTextGallery();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <DocumentTextIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">النصوص والقوالب</span>
                      <span className="text-[10px] text-muted-foreground truncate">ردود مجهزة مسبقاً</span>
                    </div>
                  </button>
                )}

                {/* Product Picker */}
                {onOpenProductPicker && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenProductPicker();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <ShoppingBagIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">اختيار منتج</span>
                      <span className="text-[10px] text-muted-foreground truncate">مشاركة كارت منتج</span>
                    </div>
                  </button>
                )}

                {/* Voice Note Recording */}
                {onSendFile && (
                  <button
                    type="button"
                    onClick={handleStartVoiceRecording}
                    disabled={uploadingFile}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                      <Mic className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">تسجيل صوتي</span>
                      <span className="text-[10px] text-muted-foreground truncate">تسجيل رسالة صوتية</span>
                    </div>
                  </button>
                )}

                {/* File Upload */}
                {onSendFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingFile}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                      <PaperClipIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">إرفاق ملف</span>
                      <span className="text-[10px] text-muted-foreground truncate">صور أو مستندات أو صوت</span>
                    </div>
                  </button>
                )}

                {/* Quick Replies */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileTools(false);
                    setShowQuickReplies(true);
                    if (!isCompactMobile) {
                      messageInputRef.current?.focus();
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-400">
                    <BoltIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-xs truncate">الردود السريعة</span>
                    <span className="text-[10px] text-muted-foreground truncate">قائمة الردود (/)</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Tools Row (visible on sm+) */}
        <div className="hidden sm:flex flex-shrink-0 items-center gap-1 sm:gap-1.5 business-chat-composer-tools">
          {/* Voice Record Button (Desktop) */}
          {onSendFile && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={handleStartVoiceRecording}
                disabled={uploadingFile || isBusy}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 text-muted-foreground hover:text-primary"
                title="تسجيل رسالة صوتية"
                aria-label="تسجيل رسالة صوتية"
              >
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}

          {/* File Upload */}
          {onSendFile && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="business-icon-button rounded-xl p-1.5 transition-colors disabled:opacity-50 sm:p-2"
                title="إرفاق ملف"
              >
                {uploadingFile ? (
                  <div
                    className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent sm:h-5 sm:w-5"
                    style={{
                      borderColor: "var(--color-primary)",
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <PaperClipIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          )}

          {/* Text Gallery Button */}
          {onOpenTextGallery && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onOpenTextGallery}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                title="حافظة النصوص المحفوظة"
              >
                <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}

          {/* Image Gallery Button */}
          {onOpenImageGallery && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onOpenImageGallery}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                title="حافظة الصور المحفوظة"
              >
                <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}

          {/* Product Picker Button */}
          {onOpenProductPicker && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onOpenProductPicker}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                title="اختيار منتج من المتجر"
              >
                <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}

          {/* Quick Replies Button (Desktop) */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowQuickReplies((prev) => {
                  const nextState = !prev;
                  if (nextState) {
                    if (!isCompactMobile) {
                      setTimeout(() => messageInputRef.current?.focus(), 50);
                    }
                  }
                  return nextState;
                });
              }}
              className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
                showQuickReplies
                  ? "text-primary bg-primary/10 border-primary/30"
                  : ""
              }`}
              title="الردود السريعة (/)"
              aria-label="الردود السريعة"
            >
              <BoltIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Desktop Emoji Picker Button */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
              title="إيموجي"
            >
              <FaceSmileIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Text Input Container - Takes flex-1 to maximize typing area */}
        <div className="relative min-w-0 flex-1 flex items-center">
          <textarea
            ref={messageInputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={
              isCompactMobile
                ? "اكتب رسالة..."
                : "اكتب رسالة... (أو / للردود السريعة) - Shift+Enter لسطر جديد"
            }
            disabled={isBusy || uploadingFile}
            autoFocus={!isCompactMobile}
            rows={1}
            className="business-chat-input w-full resize-none overflow-y-auto ps-3 pe-8 sm:pe-3 py-2 text-xs sm:text-sm md:text-base leading-relaxed disabled:opacity-50"
            style={{
              minHeight: "38px",
              maxHeight: "120px",
              height: "38px",
              ...(isBusy || uploadingFile
                ? {
                    background:
                      "var(--business-chat-input-disabled-bg, rgba(255, 255, 255, 0.05))",
                  }
                : {}),
            }}
          />

          {/* Mobile Emoji Button inside input box */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute end-2 top-1/2 -translate-y-1/2 sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="إيموجي"
          >
            <FaceSmileIcon className="h-4 w-4" />
          </button>

          {/* Quick Reply Lightning Indicator */}
          {message.startsWith("/") && !showQuickReplies && (
            <div
              className="absolute end-8 sm:end-2 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              ⚡
            </div>
          )}
        </div>

        {/* Send or Mic Button */}
        {message.trim() || !onSendFile ? (
          <button
            type="submit"
            disabled={!message.trim() || isBusy || uploadingFile}
            className="business-chat-send-button business-chip-button relative z-10 flex h-[38px] w-[38px] sm:h-[40px] sm:w-auto flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-0 sm:px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:text-base shadow-sm transition-transform active:scale-95"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
              borderColor: "transparent",
              color: "white",
            }}
            title="إرسال"
            aria-label="إرسال الرسالة"
          >
            {isBusy ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent border-white sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">جاري الإرسال...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 sm:h-5 sm:w-5 rtl:-scale-x-100" />
                <span className="hidden md:inline">إرسال</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartVoiceRecording}
            disabled={isBusy || uploadingFile}
            className="business-chip-button relative z-10 flex h-[38px] w-[38px] sm:h-[40px] sm:w-[40px] flex-shrink-0 items-center justify-center rounded-xl transition-transform active:scale-95 shadow-sm text-primary hover:text-primary-foreground hover:bg-primary"
            style={{
              background: "color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent)",
            }}
            title="تسجيل رسالة صوتية"
            aria-label="تسجيل رسالة صوتية"
          >
            <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </button>
        )}
      </>
    )}
  </form>

      {/* Floating Emoji Picker Popover */}
      {showEmojiPicker && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="fixed bottom-16 inset-x-2 sm:inset-x-auto sm:start-4 z-50 flex justify-center sm:block overflow-visible rounded-xl shadow-2xl">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={
                isCompactMobile
                  ? Math.min(
                      typeof window !== "undefined"
                        ? window.innerWidth - 24
                        : 320,
                      320
                    )
                  : 350
              }
              height={isCompactMobile ? 360 : 420}
            />
          </div>
        </>
      )}

      {/* Helper Text */}
      {message.startsWith("/") && (
        <div
          className="mt-1 text-xs flex items-center gap-1.5 px-2.5 sm:px-3 md:px-4 pb-1.5"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <span>💡</span>
          <span className="hidden sm:inline">اضغط Tab أو Enter أو انقر لاختيار الرد السريع</span>
          <span className="sm:hidden">اضغط على أي رد لاختياره أو إرساله مباشرة</span>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
