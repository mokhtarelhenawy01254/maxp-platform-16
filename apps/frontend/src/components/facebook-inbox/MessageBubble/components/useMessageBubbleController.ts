import { Message, MessageMetadata } from "./types";
import {
  getAttachmentMediaUrl,
  extractMediaTokenUrl,
  getDirectMediaUrl,
  uniqueUrls,
  getDisplayTextContent,
  getInboxMessageMediaUrl,
  normalizeAttachmentType,
} from "./mediaUtils";

interface UseMessageBubbleControllerParams {
  message: Message;
  parentMessage?: Message;
  hasBeenReplied?: boolean;
  currentUserId?: string;
}

export function useMessageBubbleController({
  message,
  parentMessage,
  hasBeenReplied,
  currentUserId,
}: UseMessageBubbleControllerParams) {
  const isCustomer = !!message.isFromCustomer;

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
      ["image", "animated_image", "sticker"].includes(
        normalizeAttachmentType(att?.type),
      ) ||
      (att?.mime_type && att.mime_type.startsWith("image/")) ||
      att?.image_data?.url,
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
        reactionCounts[key] = (reactionCounts[key] || 0) + val;
      } else if (typeof val === "string" && val.trim()) {
        const emoji = val.trim();
        reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        if (currentUserId && key === currentUserId) {
          myReaction = emoji;
        }
      }
    });
  }

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
    .map((att) => getAttachmentMediaUrl(att, "image"))
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
          getInboxMessageMediaUrl(message.id, url, { attachmentIndex: index }),
        )
      : isImageMessage
        ? [getInboxMessageMediaUrl(message.id, null, { attachmentIndex: 0 })]
        : [];

  const rawVideoMediaUrl =
    uniqueUrls([
      ...attachments.map((att) => getAttachmentMediaUrl(att, "video")),
      extractMediaTokenUrl(message.content, "video"),
      extractMediaTokenUrl(message.fileUrl, "video"),
      isVideoMessage
        ? getDirectMediaUrl("video", message.fileUrl, message.content)
        : "",
    ])[0] || "";
  const videoMediaUrl = rawVideoMediaUrl
    ? getInboxMessageMediaUrl(message.id, rawVideoMediaUrl)
    : "";

  const rawAudioMediaUrl =
    uniqueUrls([
      ...attachments.map((att) => getAttachmentMediaUrl(att, "audio")),
      extractMediaTokenUrl(message.content, "audio"),
      extractMediaTokenUrl(message.fileUrl, "audio"),
      isAudioMessage
        ? getDirectMediaUrl("audio", message.fileUrl, message.content)
        : "",
    ])[0] || "";
  const audioMediaUrl =
    (rawAudioMediaUrl
      ? getInboxMessageMediaUrl(message.id, rawAudioMediaUrl, {
          media: "audio",
        })
      : isAudioMessage && message.id
        ? getInboxMessageMediaUrl(message.id, null, { media: "audio" })
        : "") || "";

  const rawFileMediaUrl =
    uniqueUrls([
      ...attachments.map((att) => getAttachmentMediaUrl(att, "file")),
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
  const isAnyMediaMessage =
    isImageMessage || isVideoMessage || isAudioMessage || isFileMessage;
  const displayTextContent = getDisplayTextContent(message.content, {
    hasRenderedMedia: hasRenderedMedia || isAnyMediaMessage,
  });
  const hasVideoMessage = isVideoMessage || Boolean(videoMediaUrl);
  const hasAudioMessage = isAudioMessage || Boolean(audioMediaUrl);
  const hasFileMessage = isFileMessage || Boolean(fileMediaUrl);
  const hasTemplateAttachments =
    message.type === "template" ||
    message.type === "TEMPLATE" ||
    attachments.some(
      (att) =>
        att.payload?.template_type === "generic" ||
        att.payload?.template_type === "button",
    );
  const messageFileLabel =
    message.fileName ||
    attachments.find((att) => getAttachmentMediaUrl(att, "file"))?.name ||
    displayTextContent ||
    "ملف";

  const isOrderConfirmation = Boolean(
    metadata?.isOrderConfirmation ||
    metadata?.eventType === "ORDER_CREATED" ||
    message.content?.includes("تم تأكيد طلبك بنجاح! 🎉") ||
    message.content?.includes("تم تأكيد طلبك بنجاح"),
  );
  const orderNumMatch = message.content?.match(
    /رقم الطلب:\s*#?([A-Za-z0-9_-]+)/,
  );
  const orderNum = metadata?.orderNumber || orderNumMatch?.[1];

  const parsedMetaAny = metadata as any;
  const rawSource = parsedMetaAny?.source;
  const isMetaExternal =
    message.senderType === 'META_EXTERNAL' ||
    parsedMetaAny?.senderType === 'META_EXTERNAL' ||
    rawSource === 'page_reply' ||
    (!isCustomer && !message.senderId && parsedMetaAny?.isFacebookReply && rawSource !== 'ai_reply');

  const isAIResponse =
    !isMetaExternal &&
    (message.senderType === 'AI' ||
      parsedMetaAny?.senderType === 'AI' ||
      message.senderId === 'ai' ||
      rawSource === 'ai_reply' ||
      Boolean(message.isAIResponse));

  const resolvedSenderType: 'AI' | 'META_EXTERNAL' | 'STAFF' | 'CUSTOMER' = isCustomer
    ? 'CUSTOMER'
    : isAIResponse
      ? 'AI'
      : isMetaExternal
        ? 'META_EXTERNAL'
        : 'STAFF';

  return {
    isCustomer,
    metadata,
    isStarred,
    replyTo,
    replyToResolvedId,
    replyImageUrl,
    myReaction,
    reactionCounts,
    bubbleStyle,
    bubbleSubtleText,
    attachments,
    imageMediaUrls,
    videoMediaUrl,
    hasVideoMessage,
    audioMediaUrl,
    hasAudioMessage,
    fileMediaUrl,
    hasFileMessage,
    displayTextContent,
    hasTemplateAttachments,
    messageFileLabel,
    isOrderConfirmation,
    orderNum,
    isAIResponse,
    isMetaExternal,
    senderType: resolvedSenderType,
  };
}
