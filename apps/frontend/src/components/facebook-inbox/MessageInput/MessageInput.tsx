import { Circle as PaperAirplaneIcon, Circle as PaperClipIcon, Smile as FaceSmileIcon, X as XMarkIcon } from 'lucide-react';
import React, { useState, useRef } from "react";
;
import EmojiPicker from "emoji-picker-react";
import QuickReplyDropdown, {
  QuickReply,
} from "../QuickReplyDropdown/QuickReplyDropdown";
import {
  replaceVariables,
  getContextVariables,
} from "../../../utils/quickReplyUtils";

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendFile: (file: File) => void;
  sending: boolean;
  uploadingFile: boolean;
  conversation?: any;
  user?: any;
  replyTo?: any;
  onCancelReply?: () => void;
  onOpenTextGallery?: () => void;
  onOpenImageGallery?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendFile,
  sending,
  uploadingFile,
  conversation,
  user,
  replyTo,
  onCancelReply,
  onOpenTextGallery,
  onOpenImageGallery,
}) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isCompactMobile, setIsCompactMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount and after sending message
  React.useEffect(() => {
    // Focus input when component mounts
    if (messageInputRef.current && !sending && !uploadingFile) {
      messageInputRef.current.focus();
    }
  }, []);

  // Keep input focused after sending message
  React.useEffect(() => {
    if (!sending && messageInputRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  }, [sending]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewportMode = () => {
      setIsCompactMobile(window.innerWidth < 480);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sending) {
      onSendMessage(message);
      setMessage("");
      setShowQuickReplies(false);
      // Focus input after sending to allow immediate typing
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't send on Enter if quick replies dropdown is open
    if (e.key === "Enter" && !e.shiftKey && !showQuickReplies) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Show quick replies if starts with /
    if (value.startsWith("/")) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
  };

  const handleSelectQuickReply = (reply: QuickReply) => {
    // Replace variables in content
    const contextVars = getContextVariables(conversation, user);
    const processedContent = replaceVariables(reply.content, contextVars);

    setMessage(processedContent);
    setShowQuickReplies(false);
  };

  const handleEmojiClick = (emojiData: any) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !uploadingFile) {
      onSendFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="business-chat-composer business-chat-composer--facebook relative">
      {/* Quick Replies Dropdown */}
      {showQuickReplies && (
        <QuickReplyDropdown
          inputValue={message}
          onSelectReply={handleSelectQuickReply}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {/* Reply Banner - الآن داخل منطقة الإدخال */}
      {replyTo && (
        <div
          className="flex justify-between items-center text-xs sm:text-sm px-2 sm:px-3 md:px-4 py-1.5 sm:py-2"
          style={{
            background:
              "color-mix(in srgb, white 74%, var(--color-background) 26%)",
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

      <form
        onSubmit={handleSend}
        className="business-chat-composer-form flex items-end gap-2 p-2.5 sm:p-3"
      >
        <div className="business-chat-composer-tools flex flex-shrink-0 items-center gap-1 sm:gap-1.5">
          {/* File Upload */}
          <div className="relative flex-shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
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

          {/* Text Gallery Button */}
          {onOpenTextGallery && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onOpenTextGallery}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                title="حافظة النصوص المحفوظة"
              >
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
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
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Emoji Picker */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
              title="إيموجي"
            >
              <FaceSmileIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {showEmojiPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowEmojiPicker(false)}
                />
                <div className="fixed bottom-20 left-4 z-50 overflow-visible rounded-lg shadow-2xl">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={350}
                    height={450}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="business-chat-composer-main flex min-w-0 flex-1 items-end gap-2">
          {/* Text Input */}
          <div className="relative min-w-0 flex-1">
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
              disabled={sending || uploadingFile}
              autoFocus
              rows={1}
              className="business-chat-input resize-none overflow-hidden px-3 py-2 text-sm disabled:opacity-50 sm:px-4 sm:text-base"
              style={{
                minHeight: "42px",
                maxHeight: "150px",
                ...(sending || uploadingFile
                  ? {
                      background:
                        "color-mix(in srgb, white 70%, var(--color-background) 30%)",
                    }
                  : {}),
              }}
            />
            {message.startsWith("/") && !showQuickReplies && (
              <div
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                ⚡
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || sending || uploadingFile}
            className="business-chat-send-button business-chip-button flex h-[42px] flex-shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-base"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
              borderColor: "transparent",
              color: "white",
            }}
          >
            {sending ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent border-white sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">جاري الإرسال...</span>
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden md:inline">إرسال</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Helper Text */}
      {message.startsWith("/") && (
        <div
          className="mt-2 text-xs flex items-center gap-1 px-2 sm:px-3 md:px-4 pb-2"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <span>💡</span>
          <span>اضغط Tab أو Enter لاختيار رد سريع</span>
        </div>
      )}
    </div>
  );
};

export default MessageInput;
