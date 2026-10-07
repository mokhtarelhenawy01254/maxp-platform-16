import React, { useEffect, useRef, useState, memo } from "react";
import {
  Trash2,
  Reply,
  Forward,
  Star,
  Smile,
  MoreHorizontal,
} from "lucide-react";
import ReactionSelector from "../Generic/ReactionSelector";
import LinkifiedText from "../../common/LinkifiedText";
import {
  buildProxyImageUrl,
  getInboxExternalImageUrl,
  getInboxMessageMediaUrl,
} from "../../../utils/imageUrl";
import { apiClient } from "../../../services/apiClient";
import { VoiceNotePlayer } from "./VoiceNotePlayer";

interface ReplyReference {
  senderName?: string;
  type?: string;
  content?: string;
  imageUrl?: string;
  mediaUrl?: string;
  messageId?: string;
}

interface MessageMetadata {
  isStarred?: boolean;
  replyTo?: ReplyReference;
  replyToResolvedMessageId?: string;
  replyToContentSnippet?: string;
  replyToType?: string;
  replyToFacebookMessageId?: string;
  myReaction?: string;
  reactions?: Record<string, unknown>;
  isOrderConfirmation?: boolean;
  eventType?: string;
  orderNumber?: string;
  orderId?: string;
  total?: number;
}

interface TemplateButton {
  type?: string;
  title?: string;
  url?: string;
}

interface TemplateElement {
  image_url?: string;
  title?: string;
  subtitle?: string;
  buttons?: TemplateButton[];
}

interface MessageAttachment {
  type?: string;
  url?: string;
  file_url?: string;
  image_url?: string;
  mime_type?: string;
  image_data?: {
    url?: string;
  };
  name?: string;
  payload?: {
    template_type?: string;
    text?: string;
    url?: string;
    image_url?: string;
    elements?: TemplateElement[];
    buttons?: TemplateButton[];
  };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type:
    | "text"
    | "image"
    | "file"
    | "video"
    | "audio"
    | "template"
    | "IMAGE"
    | "FILE"
    | "VIDEO"
    | "AUDIO"
    | "TEMPLATE";
  isFromCustomer: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: MessageMetadata | string | null;
  attachments?: MessageAttachment[];
  isStarred?: boolean; // We will map this from metadata in parent or handle it here
}

interface MessageBubbleProps {
  message: Message;
  parentMessage?: Message;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onStar?: (messageId: string, isStarred: boolean) => void;
  onReaction?: (messageId: string, reaction: string) => void;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  currentUserId?: string;
  hasBeenReplied?: boolean; // جديد: هل تم الرد على هذه الرسالة
  onCorrect?: () => void; // جديد: عند تصحيح الرد
}

type MediaKind = "image" | "video" | "audio" | "file";

const MEDIA_URL_TOKEN_PATTERN =
  /\s*\|(IMAGE|FILE|VIDEO|AUDIO)_URL\|[^\s|]+/gi;
const ATTACHMENT_PLACEHOLDER_PREFIX = /^\s*\[attachment\]\s*/i;
const GENERIC_ATTACHMENT_LABELS = new Set([
  "[attachment]",
  "attachment",
  "مرفق",
  "ملف",
  "صورة",
  "فيديو",
  "صوت",
]);

const normalizeAttachmentType = (type?: string): string =>
  (type || "").trim().toLowerCase();

const isPotentialMediaPath = (value: string): boolean =>
  /^(https?:\/\/|\/|uploads\/|assets\/|data:|blob:)/i.test(value.trim());

const extractMediaTokenUrl = (
  value: string | null | undefined,
  kind: MediaKind,
): string => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const token = kind.toUpperCase();
  const match = value.match(new RegExp(`\\|${token}_URL\\|([^\\s|]+)`, "i"));
  return match?.[1]?.trim() || "";
};

const getDirectMediaUrl = (
  kind: MediaKind,
  ...values: Array<string | null | undefined>
): string => {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }

    const tokenUrl = extractMediaTokenUrl(value, kind);
    if (tokenUrl) {
      return tokenUrl;
    }

    const trimmed = value.trim();
    if (isPotentialMediaPath(trimmed)) {
      return trimmed;
    }
  }

  return "";
};

const getAttachmentRawUrl = (attachment: MessageAttachment): string => {
  const candidates = [
    attachment.url,
    attachment.file_url,
    attachment.image_data?.url,
    attachment.payload?.url,
    attachment.payload?.image_url,
    attachment.image_url,
  ];

  // Prioritize local archived files (/uploads/ or /assets/) over expiring Facebook CDN links
  const localCandidate = candidates.find(
    (c) =>
      typeof c === "string" &&
      (c.startsWith("/uploads/") ||
        c.includes("/uploads/chat-media/") ||
        c.startsWith("/assets/")),
  );
  if (localCandidate) {
    return localCandidate.trim();
  }

  return (
    candidates.find((candidate) => typeof candidate === "string" && candidate.trim())
      ?.trim() || ""
  );
};

const getAttachmentMediaUrl = (
  attachment: MessageAttachment,
  kind: MediaKind,
): string => {
  const attachmentType = normalizeAttachmentType(attachment.type);
  const mimeType = normalizeAttachmentType(attachment.mime_type);
  const rawUrl = getAttachmentRawUrl(attachment);

  if (!rawUrl) {
    return "";
  }

  if (kind === "image") {
    const isImage =
      ["image", "animated_image", "sticker"].includes(attachmentType) ||
      mimeType.startsWith("image/") ||
      Boolean(attachment.image_data?.url);
    return isImage ? rawUrl : "";
  }

  if (kind === "video") {
    return attachmentType === "video" || mimeType.startsWith("video/")
      ? rawUrl
      : "";
  }

  if (kind === "audio") {
    const isAudioUrl =
      /\.(mp3|m4a|aac|ogg|oga|opus|wav|weba|webm)(\?.*)?$/i.test(rawUrl) ||
      /audioclip/i.test(rawUrl);
    return attachmentType === "audio" ||
      attachmentType === "voice" ||
      attachmentType === "audio_clip" ||
      mimeType.startsWith("audio/") ||
      isAudioUrl
      ? rawUrl
      : "";
  }

  return attachmentType === "file" || (!attachmentType && !mimeType)
    ? rawUrl
    : "";
};

const uniqueUrls = (urls: string[]): string[] => {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
};

const getDisplayTextContent = (
  content: string,
  options: {
    hasRenderedMedia: boolean;
  },
): string => {
  if (!content) {
    return "";
  }

  // Strip leading internal Meta template slugs (e.g. swan_confirmed_msbtz1ov... or Template: ...)
  const strippedTemplate = content
    .replace(/^(?:Template:\s*)?[a-z0-9_]{10,}(?:\r?\n)+/i, "")
    .trim();

  const withoutMediaTokens = strippedTemplate.replace(MEDIA_URL_TOKEN_PATTERN, "").trim();
  const hasQueuePlaceholders = /\[\d+\]|\[attachment\]/i.test(
    withoutMediaTokens,
  );
  const withoutAttachmentPlaceholders = hasQueuePlaceholders
    ? withoutMediaTokens
        .replace(/\[\d+\]\s*/g, "")
        .replace(/\[attachment\]\s*/gi, "")
        .replace(/\s*\|\s*/g, " ")
        .trim()
    : withoutMediaTokens;
  const withoutAttachmentPrefix = withoutAttachmentPlaceholders
    .replace(ATTACHMENT_PLACEHOLDER_PREFIX, "")
    .trim();

  if (!withoutAttachmentPrefix) {
    return "";
  }

  if (
    options.hasRenderedMedia &&
    (isPotentialMediaPath(withoutAttachmentPrefix) ||
      GENERIC_ATTACHMENT_LABELS.has(withoutAttachmentPrefix.toLowerCase()))
  ) {
    return "";
  }

  return withoutAttachmentPrefix;
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({
    message,
    parentMessage,
    onDelete,
    onForward,
    onStar,
    onReaction,
    onReply,
    onScrollToMessage,
    hasBeenReplied,
    onCorrect,
    currentUserId,
  }) => {
    const isCustomer = !!message.isFromCustomer;
    const [showActions, setShowActions] = useState(false);
    const [showReactionSelector, setShowReactionSelector] = useState(false);
    const actionsRef = useRef<HTMLDivElement | null>(null);
    const reactionTriggerRef = useRef<HTMLButtonElement | null>(null);

    // AI Correction state
    const [isEditing, setIsEditing] = useState(false);
    const [correctionText, setCorrectionText] = useState("");
    const [saving, setSaving] = useState(false);

    const submitCorrection = async () => {
      if (!correctionText.trim()) return;
      setSaving(true);
      try {
        await apiClient.post(
          `/api/v1/unified-inbox/conversations/${message.conversationId}/messages/${message.id}/correct`,
          { correction: correctionText.trim() }
        );
        setIsEditing(false);
        setCorrectionText("");
        if (onCorrect) {
          onCorrect();
        }
      } catch (error: any) {
        alert(error.response?.data?.error || error.message || "فشل إرسال التصحيح");
      } finally {
        setSaving(false);
      }
    };

    useEffect(() => {
      if (!showActions) {
        setShowReactionSelector(false);
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (
          (event.target as HTMLElement)?.closest?.("[data-reaction-selector]")
        ) {
          return;
        }
        if (
          actionsRef.current &&
          !actionsRef.current.contains(event.target as Node)
        ) {
          setShowActions(false);
        }
      };

      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, [showActions]);

    // Parse metadata safely
    let metadata: MessageMetadata = {};
    try {
      if (typeof message.metadata === "string") {
        const parsedMetadata = JSON.parse(message.metadata) as MessageMetadata;
        metadata =
          parsedMetadata && typeof parsedMetadata === "object"
            ? parsedMetadata
            : {};
      } else if (message.metadata && typeof message.metadata === "object") {
        metadata = message.metadata;
      }
    } catch {
      // ignore
    }

    const isStarred = metadata?.isStarred || message.isStarred;
    const replyTo = metadata?.replyTo;
    const replyToResolvedId =
      metadata?.replyToResolvedMessageId ||
      replyTo?.messageId ||
      parentMessage?.id;

    const rawReplyImageUrl =
      replyTo?.imageUrl ||
      replyTo?.mediaUrl ||
      (parentMessage?.type?.toLowerCase() === "image"
        ? parentMessage.fileUrl || parentMessage.content
        : "") ||
      parentMessage?.attachments?.find((att: any) =>
        ["image", "animated_image", "sticker"].includes(normalizeAttachmentType(att?.type)) ||
        (att?.mime_type && att.mime_type.startsWith("image/")) ||
        att?.image_data?.url
      )?.url;

    const isQuotedImage =
      Boolean(rawReplyImageUrl) ||
      replyTo?.type?.toLowerCase() === "image" ||
      metadata?.replyToType?.toLowerCase() === "image" ||
      parentMessage?.type?.toLowerCase() === "image";

    const replyImageUrl = rawReplyImageUrl
      ? getInboxMessageMediaUrl(replyToResolvedId || message.id, rawReplyImageUrl)
      : isQuotedImage && replyToResolvedId
        ? getInboxMessageMediaUrl(replyToResolvedId, null)
        : "";

    let myReaction = metadata?.myReaction;
    const reactionCounts: Record<string, number> = {};

    const rawReactions = metadata?.reactions;
    if (rawReactions && typeof rawReactions === "object") {
      Object.entries(rawReactions).forEach(([key, val]) => {
        if (typeof val === "number") {
          // Format: { "👍": 2, "❤️": 1 }
          reactionCounts[key] = (reactionCounts[key] || 0) + val;
        } else if (typeof val === "string" && val.trim()) {
          // Format: { [userId]: "👍" }
          const emoji = val.trim();
          reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
          if (currentUserId && key === currentUserId) {
            myReaction = emoji;
          }
        }
      });
    }

    const formatTime = (date: Date) => {
      const now = new Date();
      const messageDate = new Date(date);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const msgDay = new Date(
        messageDate.getFullYear(),
        messageDate.getMonth(),
        messageDate.getDate(),
      );
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const diffDays = Math.floor(
        (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
      );

      const timeStr = messageDate.toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
        calendar: "gregory",
      });

      if (diffDays === 0) {
        // Today
        return timeStr;
      } else if (diffDays === 1) {
        // Yesterday
        return `أمس ${timeStr}`;
      } else if (diffDays < 7) {
        // Within this week
        return messageDate.toLocaleDateString("ar-EG", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          calendar: "gregory",
        });
      } else {
        // Older
        return messageDate.toLocaleDateString("ar-EG", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          calendar: "gregory",
        });
      }
    };

    const formatFileSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const bubbleStyle = isCustomer
      ? hasBeenReplied === false
        ? {
            background: "var(--business-message-incoming-bg)",
            color: "var(--color-foreground)",
            borderRadius: "1rem",
            borderBottomRightRadius: "0.35rem",
            border: "2px solid var(--business-message-unreplied-border)",
          }
        : {
            background: "var(--business-message-incoming-bg)",
            color: "var(--color-foreground)",
            borderRadius: "1rem",
            borderBottomRightRadius: "0.35rem",
            border: "1px solid var(--business-message-incoming-border)",
          }
      : {
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
          color: "white",
          borderRadius: "1rem",
          borderBottomLeftRadius: "0.35rem",
        };

    const bubbleSubtleText = isCustomer
      ? "var(--color-muted-foreground)"
      : "rgba(255,255,255,0.72)";
    const attachments = Array.isArray(message.attachments)
      ? message.attachments
      : [];
    const isImageMessage = message.type === "image" || message.type === "IMAGE";
    const isVideoMessage = message.type === "video" || message.type === "VIDEO";
    const isAudioMessage =
      message.type === "audio" ||
      message.type === "AUDIO" ||
      message.type === "voice" ||
      message.type === "VOICE";
    const isFileMessage = message.type === "file" || message.type === "FILE";
    const attachmentImageUrls = attachments
      .map((attachment) => getAttachmentMediaUrl(attachment, "image"))
      .filter((url) => Boolean(url && url.trim()));

    const fallbackImageUrls =
      attachmentImageUrls.length > 0
        ? []
        : uniqueUrls([
            extractMediaTokenUrl(message.content, "image"),
            extractMediaTokenUrl(message.fileUrl, "image"),
            isImageMessage
              ? getDirectMediaUrl("image", message.fileUrl, message.content)
              : "",
          ]);

    const rawImageMediaUrls = uniqueUrls([
      ...attachmentImageUrls,
      ...fallbackImageUrls,
    ]);
    const imageMediaUrls =
      rawImageMediaUrls.length > 0
        ? rawImageMediaUrls.map((url, index) =>
            getInboxMessageMediaUrl(message.id, url, { attachmentIndex: index })
          )
        : isImageMessage
          ? [getInboxMessageMediaUrl(message.id, null, { attachmentIndex: 0 })]
          : [];
    const rawVideoMediaUrl = uniqueUrls([
      ...attachments.map((attachment) =>
        getAttachmentMediaUrl(attachment, "video"),
      ),
      extractMediaTokenUrl(message.content, "video"),
      extractMediaTokenUrl(message.fileUrl, "video"),
      isVideoMessage
        ? getDirectMediaUrl("video", message.fileUrl, message.content)
        : "",
    ])[0] || "";
    const videoMediaUrl = rawVideoMediaUrl
      ? getInboxMessageMediaUrl(message.id, rawVideoMediaUrl)
      : "";
    const rawAudioMediaUrl = uniqueUrls([
      ...attachments.map((attachment) =>
        getAttachmentMediaUrl(attachment, "audio"),
      ),
      extractMediaTokenUrl(message.content, "audio"),
      extractMediaTokenUrl(message.fileUrl, "audio"),
      isAudioMessage
        ? getDirectMediaUrl("audio", message.fileUrl, message.content)
        : "",
    ])[0] || "";
    const audioMediaUrl =
      (rawAudioMediaUrl
        ? getInboxMessageMediaUrl(message.id, rawAudioMediaUrl, { media: "audio" })
        : isAudioMessage && message.id
          ? getInboxMessageMediaUrl(message.id, null, { media: "audio" })
          : "") || "";
    const rawFileMediaUrl = uniqueUrls([
      ...attachments.map((attachment) =>
        getAttachmentMediaUrl(attachment, "file"),
      ),
      extractMediaTokenUrl(message.content, "file"),
      extractMediaTokenUrl(message.fileUrl, "file"),
      isFileMessage
        ? getDirectMediaUrl("file", message.fileUrl, message.content)
        : "",
    ])[0] || "";
    const fileMediaUrl = rawFileMediaUrl
      ? getInboxMessageMediaUrl(message.id, rawFileMediaUrl)
      : "";
    const hasRenderedMedia =
      imageMediaUrls.length > 0 ||
      Boolean(videoMediaUrl) ||
      Boolean(audioMediaUrl) ||
      Boolean(fileMediaUrl);
    const displayTextContent = getDisplayTextContent(message.content, {
      hasRenderedMedia,
    });
    const hasVideoMessage = isVideoMessage || Boolean(videoMediaUrl);
    const hasAudioMessage = isAudioMessage || Boolean(audioMediaUrl);
    const hasFileMessage = isFileMessage || Boolean(fileMediaUrl);
    const hasTemplateAttachments =
      message.type === "template" ||
      message.type === "TEMPLATE" ||
      attachments.some(
        (attachment) =>
          attachment.payload?.template_type === "generic" ||
          attachment.payload?.template_type === "button",
      );
    const messageFileLabel =
      message.fileName ||
      attachments.find((attachment) => getAttachmentMediaUrl(attachment, "file"))
        ?.name ||
      displayTextContent ||
      "ملف";
    const hasMessageActions =
      !!onReaction ||
      !!onReply ||
      !!onStar ||
      !!onForward ||
      (!isCustomer && !!onDelete);
    const actionButtonClassName =
      "flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90 duration-150 border";

    const isOrderConfirmation = Boolean(
      metadata?.isOrderConfirmation ||
      metadata?.eventType === "ORDER_CREATED" ||
      message.content?.includes("تم تأكيد طلبك بنجاح! 🎉") ||
      message.content?.includes("تم تأكيد طلبك بنجاح")
    );
    const orderNumMatch = message.content?.match(/رقم الطلب:\s*#?([A-Za-z0-9_-]+)/);
    const orderNum = metadata?.orderNumber || orderNumMatch?.[1];

    return (
      <div className="flex flex-col w-full mb-4 relative">
        {isOrderConfirmation && (
          <div className="flex items-center justify-center my-2 w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>تم إنشاء طلب {orderNum ? `#${orderNum}` : ""} من هذه المحادثة</span>
              {orderNum && (
                <a
                  href={`/orders/${encodeURIComponent(orderNum)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-emerald-900 dark:hover:text-white mr-1 text-[11px]"
                >
                  عرض الطلب
                </a>
              )}
            </div>
          </div>
        )}
        <div
          className={`relative max-w-[85%] sm:max-w-xs lg:max-w-md ${isCustomer ? "ml-auto" : "mr-auto"}`}
          ref={actionsRef}
        >
          {hasMessageActions && (
            <button
              type="button"
              onClick={() => setShowActions((current) => !current)}
              className={`absolute z-20 flex h-7 w-7 sm:h-6 sm:w-6 items-center justify-center rounded-full shadow-md transition-all active:scale-90 ${
                isCustomer ? "-left-8 top-1 sm:-left-7 sm:top-1.5" : "-right-8 top-1 sm:-right-7 sm:top-1.5"
              }`}
              style={{
                background: "var(--business-floating-surface, rgba(255, 255, 255, 0.95))",
                border: "1px solid var(--business-card-border, rgba(203, 213, 225, 0.8))",
                color: "var(--color-muted-foreground)",
                backdropFilter: "blur(12px)",
              }}
              title="إجراءات الرسالة"
              aria-label="إجراءات الرسالة"
              aria-expanded={showActions}
            >
              <MoreHorizontal size={15} />
            </button>
          )}

          {/* Action Buttons Floating Bar - Touch-friendly & Safe positioning on mobile */}
          {showActions && hasMessageActions && (
            <div
              className={`absolute z-40 flex items-center gap-1.5 sm:gap-1 rounded-full p-1 shadow-xl border backdrop-blur-md transition-all duration-200 flex-nowrap whitespace-nowrap max-w-[calc(100vw-2.5rem)] ${
                isCustomer
                  ? "rtl:right-0 ltr:left-0 top-9"
                  : "rtl:left-0 ltr:right-0 top-9"
              }`}
              style={{
                background: "var(--business-floating-surface, rgba(255, 255, 255, 0.98))",
                borderColor: "var(--business-card-border, rgba(203, 213, 225, 0.8))",
              }}
            >
              {onReaction && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    ref={reactionTriggerRef}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowReactionSelector(!showReactionSelector);
                    }}
                    className={`${actionButtonClassName} w-8 h-8 sm:w-7 sm:h-7 ${
                      myReaction
                        ? "text-amber-600 bg-amber-100 border-amber-300"
                        : "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200/80 dark:border-amber-800/80"
                    }`}
                    title="إضافة تفاعل"
                  >
                    <Smile size={16} strokeWidth={2.4} />
                  </button>
                  {showReactionSelector && (
                    <ReactionSelector
                      triggerRef={reactionTriggerRef}
                      onSelect={(r) => {
                        if (onReaction) onReaction(message.id, r);
                        setShowReactionSelector(false);
                        setShowActions(false);
                      }}
                      onClose={() => setShowReactionSelector(false)}
                      currentReaction={myReaction}
                    />
                  )}
                </div>
              )}
              {onReply && (
                <button
                  onClick={() => {
                    onReply(message);
                    setShowActions(false);
                  }}
                  className={`${actionButtonClassName} w-8 h-8 sm:w-7 sm:h-7 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200/80 dark:border-blue-800/80`}
                  title="رد"
                >
                  <Reply size={16} strokeWidth={2.4} />
                </button>
              )}
              {onStar && (
                <button
                  onClick={() => onStar(message.id, !!isStarred)}
                  className={`${actionButtonClassName} w-8 h-8 sm:w-7 sm:h-7 ${
                    isStarred
                      ? "text-white bg-amber-500 hover:bg-amber-600 border-amber-600 shadow-sm"
                      : "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200/80 dark:border-amber-800/80"
                  }`}
                  title={isStarred ? "إلغاء التمييز" : "تمييز الرسالة"}
                >
                  <Star
                    size={16}
                    strokeWidth={2.4}
                    fill={isStarred ? "currentColor" : "none"}
                  />
                </button>
              )}
              {onForward && (
                <button
                  onClick={() => {
                    onForward(message);
                    setShowActions(false);
                  }}
                  className={`${actionButtonClassName} w-8 h-8 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200/80 dark:border-indigo-800/80`}
                  title="إعادة توجيه"
                >
                  <Forward size={16} strokeWidth={2.4} />
                </button>
              )}
              {!isCustomer && onDelete && (
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setShowActions(false);
                  }}
                  className={`${actionButtonClassName} w-8 h-8 sm:w-7 sm:h-7 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border-red-200/80 dark:border-red-800/80`}
                  title="حذف الرسالة"
                >
                  <Trash2 size={16} strokeWidth={2.4} />
                </button>
              )}
            </div>
          )}

          {/* Sender name for employee messages */}
          {!isCustomer && (
            <div
              className="text-xs mb-1 text-left"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {message.senderName}
            </div>
          )}

          {/* Unreplied indicator for customer messages */}
          {isCustomer && hasBeenReplied === false && (
            <div
              className="flex items-center gap-1 mb-1 text-xs font-medium"
              style={{ color: "var(--business-danger)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--business-danger)" }}
              ></span>
              <span>غير مردود عليها</span>
            </div>
          )}

          <div className="px-4 py-2 rounded-2xl" style={bubbleStyle}>
            {/* Reply Context */}
            {replyTo && (
              <div
                onClick={() => {
                  if (replyToResolvedId && onScrollToMessage) {
                    onScrollToMessage(replyToResolvedId);
                  }
                }}
                className={`mb-2 text-xs rounded-xl p-2 flex items-center justify-between gap-2.5 transition-all ${
                  replyToResolvedId && onScrollToMessage
                    ? "cursor-pointer hover:opacity-90 active:scale-[0.99]"
                    : ""
                }`}
                style={{
                  background: isCustomer
                    ? "color-mix(in srgb, var(--color-foreground) 6%, transparent)"
                    : "rgba(0, 0, 0, 0.2)",
                  borderInlineStart: `3px solid ${
                    isCustomer
                      ? "var(--color-primary)"
                      : "rgba(255, 255, 255, 0.9)"
                  }`,
                }}
                title={
                  replyToResolvedId && onScrollToMessage
                    ? "اضغط للانتقال إلى الرسالة الأصلية"
                    : undefined
                }
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold truncate mb-0.5 text-[11px]"
                    style={{
                      color: isCustomer
                        ? "var(--color-primary)"
                        : "#ffffff",
                    }}
                  >
                    {replyTo.senderName || "موظف"}
                  </div>
                  <div
                    className="truncate text-[11px]"
                    style={{
                      color: isCustomer
                        ? "var(--color-muted-foreground)"
                        : "rgba(255, 255, 255, 0.85)",
                    }}
                  >
                    {replyImageUrl
                      ? replyTo.content &&
                        replyTo.content !== "📷 صورة" &&
                        replyTo.content !== "مرفق/صورة"
                        ? replyTo.content
                        : "📷 صورة"
                      : replyTo.type === "text"
                        ? replyTo.content
                        : replyTo.content || "مرفق/صورة"}
                  </div>
                </div>

                {replyImageUrl && (
                  <div className="relative flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 shadow-xs">
                    <img
                      src={replyImageUrl}
                      alt="صورة مقتبسة"
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.dataset.retried && replyToResolvedId) {
                          target.dataset.retried = "true";
                          target.src = buildProxyImageUrl(null, { messageId: replyToResolvedId });
                          return;
                        }
                        target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Image message */}
            {imageMediaUrls.length > 0 && (
              <div className="mb-2 flex flex-col gap-2">
                {imageMediaUrls.map((imageUrl, index) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt="صورة"
                    loading="lazy"
                    className="rounded-lg max-w-full h-auto"
                    style={{ maxHeight: "300px" }}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (target.dataset.retried) {
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".fb-expired-img-notice")) {
                          const notice = document.createElement("div");
                          notice.className =
                            "fb-expired-img-notice flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs my-1";
                          notice.textContent = "⚠️ انتهت صلاحية عرض هذه الصورة من خوادم فيسبوك";
                          parent.appendChild(notice);
                        }
                        return;
                      }
                      target.dataset.retried = "true";
                      if (message.id) {
                        target.src = buildProxyImageUrl(null, {
                          messageId: message.id,
                          attachmentIndex: index,
                        });
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* Video message */}
            {hasVideoMessage && videoMediaUrl && (
              <div className="mb-2">
                <video
                  src={videoMediaUrl}
                  controls
                  className="rounded-lg max-w-full h-auto"
                  style={{ maxHeight: "300px" }}
                />
              </div>
            )}

            {/* Audio message */}
            {hasAudioMessage && audioMediaUrl && (
              <div className="mb-2">
                <VoiceNotePlayer
                  src={audioMediaUrl}
                  messageId={message.id}
                  isCustomer={isCustomer}
                />
              </div>
            )}

            {/* Template/Check for buttons in metadata or attachments */}
            {hasTemplateAttachments && (
              <div className="mb-2 flex flex-col gap-2">
                {attachments.map((att, i) => {
                  // Skip standard media as they might be handled above, unless we want to show everything from attachments
                  if (att.type === "image" || att.type === "IMAGE") return null;
                  if (att.type === "video" || att.type === "VIDEO") return null;
                  if (att.type === "audio" || att.type === "AUDIO") return null;

                  // Handle template
                  if (att.payload && att.payload.template_type === "generic") {
                    return (
                      <div
                        key={i}
                        className="flex flex-col gap-2 overflow-hidden rounded-lg border"
                        style={{
                          borderColor: isCustomer
                            ? "var(--business-card-border)"
                            : "rgba(255,255,255,0.2)",
                        }}
                      >
                        {att.payload.elements?.map((el, j) => (
                          <div
                            key={j}
                            className="p-2"
                            style={{
                              background: isCustomer
                                ? "var(--business-bubble-card-bg, rgba(255, 255, 255, 0.06))"
                                : "rgba(0,0,0,0.12)",
                            }}
                          >
                            {el.image_url && (
                              <img
                                src={getInboxExternalImageUrl(el.image_url, {
                                  messageId: message.id,
                                })}
                                alt=""
                                className="w-full h-32 object-cover rounded mb-2"
                              />
                            )}
                            {el.title && (
                              <div className="font-bold text-sm mb-1">
                                {el.title}
                              </div>
                            )}
                            {el.subtitle && (
                              <div className="text-xs opacity-80 mb-2">
                                {el.subtitle}
                              </div>
                            )}
                            <div className="flex flex-col gap-1">
                              {el.buttons &&
                                el.buttons.map((btn, k) => (
                                  <a
                                    key={k}
                                    href={btn.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center py-1.5 px-3 rounded text-xs transition-colors truncate"
                                    style={{
                                      background: isCustomer
                                        ? "var(--business-bubble-link-bg, rgba(59, 130, 246, 0.15))"
                                        : "rgba(255,255,255,0.2)",
                                      color: isCustomer
                                        ? "var(--color-primary)"
                                        : "white",
                                    }}
                                  >
                                    {btn.title}{" "}
                                    {btn.type === "web_url" ? "🔗" : ""}
                                  </a>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Handle button template
                  if (att.payload && att.payload.template_type === "button") {
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        <div className="text-sm opacity-90 mb-1">
                          {att.payload.text}
                        </div>
                        <div className="flex flex-col gap-1">
                          {att.payload.buttons &&
                            att.payload.buttons.map((btn, k) => (
                              <a
                                key={k}
                                href={btn.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center py-1.5 px-3 rounded text-xs transition-colors truncate"
                                style={{
                                  background: isCustomer
                                    ? "var(--business-bubble-link-bg, rgba(59, 130, 246, 0.15))"
                                    : "rgba(255,255,255,0.2)",
                                  color: isCustomer
                                    ? "var(--color-primary)"
                                    : "white",
                                }}
                              >
                                {btn.title}
                              </a>
                            ))}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}

            {/* File message */}
            {hasFileMessage && fileMediaUrl && (
                <a
                  href={fileMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg mb-2"
                  style={{
                    background: isCustomer
                      ? "color-mix(in srgb, var(--color-border) 34%, white)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: isCustomer
                        ? "rgba(255,255,255,0.55)"
                        : "rgba(255,255,255,0.3)",
                    }}
                  >
                    📎
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: isCustomer ? "var(--color-foreground)" : "white",
                      }}
                    >
                      {messageFileLabel}
                    </p>
                    <p className="text-xs" style={{ color: bubbleSubtleText }}>
                      {formatFileSize(message.fileSize)}
                    </p>
                  </div>
                  <div className="text-xs">⬇️</div>
                </a>
              )}

            {/* Text content */}
            {displayTextContent && (
              <LinkifiedText
                text={displayTextContent}
                className="block text-sm whitespace-pre-wrap break-words"
              />
            )}

            {/* Reactions Display */}
            {Object.keys(reactionCounts).length > 0 && (
              <div
                className={`business-reaction-pill absolute -bottom-3 ${isCustomer ? "right-2" : "left-2"} rounded-full shadow-md border flex items-center px-1.5 py-0.5 gap-1`}
                style={{
                  background: "var(--business-floating-surface)",
                  borderColor: "var(--business-card-border)",
                }}
              >
                {Object.entries(reactionCounts).map(([reaction, count]) => (
                  <span
                    key={reaction}
                    className="text-xs leading-none flex items-center"
                  >
                    <span className="text-sm">{reaction}</span>
                    {count > 1 && (
                      <span
                        className="text-[10px] ml-0.5 font-medium"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {count}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Timestamp and status */}
            <div className="flex items-center justify-end mt-1 gap-2">
              {isStarred && (
                <Star
                  size={10}
                  className="fill-current"
                  style={{ color: "var(--business-warning)" }}
                />
              )}
              <span className="text-xs opacity-75">
                {formatTime(message.timestamp)}
              </span>
              {!isCustomer && (
                <span className="text-xs flex items-center gap-0.5">
                  {message.status === "sending" && (
                    <span className="flex items-center gap-1 text-white/70">
                      <span className="animate-spin inline-block w-3 h-3 border border-white/50 border-t-white rounded-full"></span>
                    </span>
                  )}
                  {message.status === "sent" && (
                    <span className="text-white/90">✓</span>
                  )}
                  {message.status === "delivered" && (
                    <span className="text-white">✓✓</span>
                  )}
                  {message.status === "read" && (
                    <span style={{ color: "rgba(200, 235, 255, 0.92)" }}>
                      ✓✓
                    </span>
                  )}
                  {message.status === "error" && (
                    <span style={{ color: "rgba(255, 206, 206, 0.92)" }}>
                      ❌
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* AI message badge + correction button */}
            {!isCustomer && (!message.senderId || message.senderId === 'ai' || message.isAIResponse) && (
              <div className="mt-2 pt-1.5 flex justify-between items-center text-[10px]" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>🤖 رد تلقائي من الوكيل</span>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setCorrectionText(message.content || '');
                    }}
                    className="hover:underline font-medium cursor-pointer text-white"
                  >
                    ✏️ تصحيح الرد
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Correction textarea (shown below the bubble) */}
          {isEditing && (
            <div className={`mt-2 flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
              <div className="w-full rounded-xl p-3 space-y-2" style={{ background: 'var(--color-muted)', border: '1px solid var(--business-card-border)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>تصحيح رد الوكيل:</div>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  className="w-full min-h-[60px] p-2 text-sm rounded border outline-none resize-none"
                  style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--business-card-border)' }}
                  placeholder="اكتب الرد الصحيح للعميل هنا لتعليم الوكيل وتصحيح الخطأ..."
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setCorrectionText(''); }}
                    className="px-3 py-1.5 rounded font-medium"
                    style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={submitCorrection}
                    disabled={saving || !correctionText.trim()}
                    className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
                    style={{ background: 'var(--color-primary)', color: 'white' }}
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ وتصحيح'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.timestamp.getTime() ===
        nextProps.message.timestamp.getTime() &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.type === nextProps.message.type &&
      prevProps.message.fileUrl === nextProps.message.fileUrl &&
      prevProps.message.attachments === nextProps.message.attachments &&
      prevProps.message.metadata === nextProps.message.metadata &&
      prevProps.hasBeenReplied === nextProps.hasBeenReplied &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.parentMessage?.id === nextProps.parentMessage?.id &&
      prevProps.parentMessage?.content === nextProps.parentMessage?.content &&
      prevProps.parentMessage?.fileUrl === nextProps.parentMessage?.fileUrl &&
      prevProps.onScrollToMessage === nextProps.onScrollToMessage
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
