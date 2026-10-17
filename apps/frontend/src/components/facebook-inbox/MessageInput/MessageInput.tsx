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
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ChartBarIcon,
  Bars3Icon,
  ListBulletIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
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
  onSendFiles?: (files: File[]) => void;
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
  // Rich platform actions (e.g. WhatsApp)
  onOpenOrder?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  onOpenInteractive?: () => void;
  onOpenPoll?: () => void;
  onOpenButtons?: () => void;
  onOpenList?: () => void;
  onOpenCatalog?: () => void;
  onOpenLocation?: () => void;
  onOpenTemplate?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  fileAccept?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  onSendFiles,
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
  platform = "facebook",
  draftMessage,
  onDraftMessageHandled,
  onSendQuickReply,
  onOpenOrder,
  onOpenServiceOrder,
  onOpenTasks,
  onOpenInteractive,
  onOpenPoll,
  onOpenButtons,
  onOpenList,
  onOpenCatalog,
  onOpenLocation,
  onOpenTemplate,
  disabled = false,
  disabledReason,
  fileAccept,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showDesktopExtraTools, setShowDesktopExtraTools] = useState(false);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopExtraToolsRef = useRef<HTMLDivElement>(null);

  const hasExtraTools = Boolean(
    onOpenOrder ||
    onOpenServiceOrder ||
    onOpenTasks ||
    onOpenInteractive ||
    onOpenPoll ||
    onOpenButtons ||
    onOpenList ||
    onOpenCatalog ||
    onOpenLocation ||
    onOpenTemplate
  );

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
    if (disabled || isBusy || uploadingFile) return;
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

  // Close mobile & desktop extra tools dropdown on outside click
  React.useEffect(() => {
    if (!showMobileTools && !showDesktopExtraTools) return undefined;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        showMobileTools &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target)
      ) {
        setShowMobileTools(false);
      }
      if (
        showDesktopExtraTools &&
        desktopExtraToolsRef.current &&
        !desktopExtraToolsRef.current.contains(target)
      ) {
        setShowDesktopExtraTools(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showMobileTools, showDesktopExtraTools]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled) return;
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
    const files = e.target.files;
    if (files && files.length > 0 && !uploadingFile) {
      const fileList = Array.from(files);
      if (onSendFiles) {
        onSendFiles(fileList);
      } else if (onSendFile && fileList[0]) {
        onSendFile(fileList[0]);
      }
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
              الرد على {replyTo.senderName || replyTo.sender_name || "رسالة"}:
            </span>
            <span
              className="truncate text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {replyTo.content ||
                replyTo.text ||
                replyTo.message ||
                (replyTo.type === "image"
                  ? "🖼️ صورة"
                  : replyTo.type === "file"
                    ? "📎 ملف"
                    : "رسالة")}
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
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept={
            fileAccept ||
            "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.zip,.rar"
          }
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

                {/* Extra Tools for WhatsApp / Rich Actions */}
                {onOpenOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenOrder();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <ShoppingCartIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">إنشاء طلب سريع</span>
                      <span className="text-[10px] text-muted-foreground truncate">تسجيل أوردر للعميل</span>
                    </div>
                  </button>
                )}

                {onOpenServiceOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenServiceOrder();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                      <ClipboardDocumentListIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">طلب صيانة / خدمة</span>
                      <span className="text-[10px] text-muted-foreground truncate">خدمات فنية ودعم</span>
                    </div>
                  </button>
                )}

                {onOpenTasks && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenTasks();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
                      <SparklesIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">إدارة المهام</span>
                      <span className="text-[10px] text-muted-foreground truncate">إسناد مهمة للفريق</span>
                    </div>
                  </button>
                )}

                {onOpenInteractive && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenInteractive();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
                      <SparklesIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">رسائل تفاعلية</span>
                      <span className="text-[10px] text-muted-foreground truncate">كوبون، رابط، أو اتصال</span>
                    </div>
                  </button>
                )}

                {onOpenPoll && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenPoll();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <ChartBarIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">استطلاع رأي</span>
                      <span className="text-[10px] text-muted-foreground truncate">تصويت واستبيان</span>
                    </div>
                  </button>
                )}

                {onOpenButtons && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenButtons();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <Bars3Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">أزرار سريعة</span>
                      <span className="text-[10px] text-muted-foreground truncate">خيارات سريعة للعميل</span>
                    </div>
                  </button>
                )}

                {onOpenList && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenList();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                      <ListBulletIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">رسالة قائمة</span>
                      <span className="text-[10px] text-muted-foreground truncate">قائمة اختيارات متعددة</span>
                    </div>
                  </button>
                )}

                {onOpenTemplate && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenTemplate();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                      <DocumentTextIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">قوالب الرسائل</span>
                      <span className="text-[10px] text-muted-foreground truncate">قوالب رسمية معتمدة</span>
                    </div>
                  </button>
                )}

                {onOpenLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenLocation();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                      <MapPinIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">إرسال موقع</span>
                      <span className="text-[10px] text-muted-foreground truncate">موقع المتجر أو الفرع</span>
                    </div>
                  </button>
                )}

                {onOpenCatalog && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileTools(false);
                      onOpenCatalog();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-xs font-medium text-foreground transition-colors hover:bg-white/10 active:bg-white/15"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                      <BuildingStorefrontIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-xs truncate">كتالوج المنتجات</span>
                      <span className="text-[10px] text-muted-foreground truncate">كتالوج واتساب</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Tools Row (visible on sm+) */}
        <div className="hidden sm:flex flex-shrink-0 items-center gap-1 sm:gap-1.5 business-chat-composer-tools">
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

          {/* WhatsApp / Rich Actions Popover (Desktop) */}
          {hasExtraTools && (
            <div className="relative flex-shrink-0" ref={desktopExtraToolsRef}>
              <button
                type="button"
                onClick={() => setShowDesktopExtraTools((prev) => !prev)}
                className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
                  showDesktopExtraTools
                    ? "text-primary bg-primary/10 border-primary/30"
                    : ""
                }`}
                title="إجراءات وأدوات إضافية"
                aria-label="إجراءات إضافية"
              >
                <PlusIcon
                  className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 ${
                    showDesktopExtraTools ? "rotate-45" : ""
                  }`}
                />
              </button>

              {showDesktopExtraTools && (
                <div className="absolute bottom-full mb-2 start-0 z-50 flex w-56 flex-col gap-1 rounded-2xl border border-border/60 bg-popover/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground border-b border-border/40">
                    أدوات وإجراءات المحادثة
                  </div>

                  {onOpenOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenOrder();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <ShoppingCartIcon className="h-4 w-4 text-emerald-500" />
                      <span>إنشاء طلب سريع</span>
                    </button>
                  )}

                  {onOpenServiceOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenServiceOrder();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <ClipboardDocumentListIcon className="h-4 w-4 text-cyan-500" />
                      <span>طلب صيانة / خدمة</span>
                    </button>
                  )}

                  {onOpenTasks && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenTasks();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <SparklesIcon className="h-4 w-4 text-violet-500" />
                      <span>إدارة المهام</span>
                    </button>
                  )}

                  {onOpenInteractive && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenInteractive();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <SparklesIcon className="h-4 w-4 text-pink-500" />
                      <span>رسائل تفاعلية</span>
                    </button>
                  )}

                  {onOpenPoll && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenPoll();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <ChartBarIcon className="h-4 w-4 text-amber-500" />
                      <span>استطلاع رأي</span>
                    </button>
                  )}

                  {onOpenButtons && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenButtons();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Bars3Icon className="h-4 w-4 text-blue-500" />
                      <span>أزرار سريعة</span>
                    </button>
                  )}

                  {onOpenList && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenList();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <ListBulletIcon className="h-4 w-4 text-teal-500" />
                      <span>رسالة قائمة</span>
                    </button>
                  )}

                  {onOpenTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenTemplate();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <DocumentTextIcon className="h-4 w-4 text-indigo-500" />
                      <span>قوالب الرسائل</span>
                    </button>
                  )}

                  {onOpenLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenLocation();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <MapPinIcon className="h-4 w-4 text-red-500" />
                      <span>إرسال موقع</span>
                    </button>
                  )}

                  {onOpenCatalog && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDesktopExtraTools(false);
                        onOpenCatalog();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <BuildingStorefrontIcon className="h-4 w-4 text-teal-500" />
                      <span>كتالوج المنتجات</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Input Container - Takes flex-1 to maximize typing area */}
        <div className="relative min-w-0 flex-1 flex items-center">
          <textarea
            ref={messageInputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={
              disabled
                ? disabledReason || "يرجى إضافة رقم هاتف العميل أولاً للمراسلة..."
                : isCompactMobile
                  ? "اكتب رسالة..."
                  : "اكتب رسالة... (أو / للردود السريعة) - Shift+Enter لسطر جديد"
            }
            disabled={isBusy || uploadingFile || disabled}
            autoFocus={!isCompactMobile && !disabled}
            rows={1}
            className="business-chat-input w-full resize-none overflow-y-auto ps-3 pe-8 sm:pe-3 py-2 text-xs sm:text-sm md:text-base leading-relaxed disabled:opacity-50"
            style={{
              minHeight: "38px",
              maxHeight: "120px",
              height: "38px",
              ...(isBusy || uploadingFile || disabled
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
            disabled={disabled}
            className="absolute end-2 top-1/2 -translate-y-1/2 sm:hidden p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            title="إيموجي"
          >
            <FaceSmileIcon className="h-4 w-4" />
          </button>

          {/* Quick Reply Lightning Indicator */}
          {message.startsWith("/") && !showQuickReplies && !disabled && (
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
            disabled={!message.trim() || isBusy || uploadingFile || disabled}
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
            disabled={isBusy || uploadingFile || disabled}
            className="business-chip-button relative z-10 flex h-[38px] w-[38px] sm:h-[40px] sm:w-[40px] flex-shrink-0 items-center justify-center rounded-xl transition-transform active:scale-95 shadow-sm text-primary hover:text-primary-foreground hover:bg-primary disabled:opacity-50"
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
