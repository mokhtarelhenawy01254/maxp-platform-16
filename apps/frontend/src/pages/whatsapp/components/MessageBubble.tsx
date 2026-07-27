import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  Clock3,
  Download,
  FileText,
  MapPin,
  Pencil,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../../services/api";

import { cn } from "@/lib/utils";
import LinkifiedText from "../../../components/common/LinkifiedText";

import { Message } from "../../../hooks/useWhatsAppQueries";
import { buildWhatsAppMediaUrl } from "../utils/mediaUrl";

interface MessageBubbleProps {
  message: Message;
  previousMessage?: Message;
  isGroup: boolean;
  sessionId?: string;
  onContextMenu: (event: React.MouseEvent, message: Message) => void;
  getParticipantName: (jid: string) => string;
  onQuotedMessageClick?: (quotedMessageId: string) => void;
  onCorrect?: () => void;
  highlighted?: boolean;
}

function shouldShowDateSeparator(
  currentMessage: Message,
  previousMessage: Message | undefined,
) {
  if (!previousMessage) {
    return true;
  }

  const currentDate = new Date(currentMessage.timestamp).toDateString();
  const previousDate = new Date(previousMessage.timestamp).toDateString();
  return currentDate !== previousDate;
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "SENT":
      return <Check className="size-3.5 text-[color:var(--color-muted-foreground)]" />;
    case "DELIVERED":
      return (
        <CheckCheck className="size-3.5 text-[color:var(--color-muted-foreground)]" />
      );
    case "READ":
      return <CheckCheck className="size-3.5 text-sky-500" />;
    case "ERROR":
      return <AlertTriangle className="size-3.5 text-rose-500" />;
    case "PENDING":
    default:
      return <Clock3 className="size-3.5 text-[color:var(--color-muted-foreground)]" />;
  }
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(
  ({
    message,
    previousMessage,
    isGroup,
    sessionId,
    onContextMenu,
    getParticipantName,
    onQuotedMessageClick,
    onCorrect,
    highlighted,
  }) => {
    const { t } = useTranslation();
    const senderName = message.fromMe && message.senderName ? message.senderName : null;

    // ── AI Correction State ──
    const [isEditing, setIsEditing] = useState(false);
    const [correctionText, setCorrectionText] = useState('');
    const [saving, setSaving] = useState(false);

    const isAI = message.fromMe && message.isAIResponse;

    const submitCorrection = async () => {
      if (!correctionText.trim() || !sessionId) return;
      try {
        setSaving(true);
        await api.post(`/whatsapp/messages/${encodeURIComponent(message.messageId)}/correct`, {
          sessionId,
          correction: correctionText,
        });
        toast.success('تم تصحيح الرد وتعليم الوكيل ✅');
        setIsEditing(false);
        setCorrectionText('');
        onCorrect?.();
      } catch (err: any) {
        console.error('Correction failed:', err);
        toast.error(err?.response?.data?.error || 'فشل تصحيح الرد');
      } finally {
        setSaving(false);
      }
    };

    const getDateSeparatorText = (timestamp: string) => {
      const date = new Date(timestamp);
      if (isToday(date)) {
        return t("whatsapp.window.today");
      }
      if (isYesterday(date)) {
        return t("whatsapp.window.yesterday");
      }
      return format(date, "dd/MM/yyyy");
    };

    const renderMessageContent = () => {
      if (message.mediaUrl === "FAILED_DOWNLOAD") {
        return (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/70 bg-rose-500/10 px-3 py-2 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="size-4" />
            <span className="text-sm">{t("whatsapp.dialogs.failedDownload")}</span>
          </div>
        );
      }

      if (message.mediaUrl) {
        const fullMediaUrl = buildWhatsAppMediaUrl(message.mediaUrl, message.id);

        switch (message.messageType) {
          case "IMAGE":
            return (
              <div className="space-y-1.5">
                <a href={fullMediaUrl} target="_blank" rel="noreferrer">
                  <img
                    src={fullMediaUrl}
                    alt="Message media"
                    loading="lazy"
                    className="max-h-[12rem] max-w-full rounded-lg object-cover sm:max-h-[18rem]"
                  />
                </a>
                {message.content ? (
                  <LinkifiedText
                    text={message.content}
                    className="block whitespace-pre-wrap text-sm leading-[1.45] text-[color:var(--color-foreground)]"
                  />
                ) : null}
              </div>
            );
          case "VIDEO":
            return (
              <div className="space-y-1">
                <video
                  src={fullMediaUrl}
                  controls
                  className="max-h-[12rem] max-w-full rounded-lg sm:max-h-[18rem]"
                />
                {message.content ? (
                  <LinkifiedText
                    text={message.content}
                    className="block whitespace-pre-wrap text-[13px] leading-[1.35] text-[color:var(--color-foreground)]"
                  />
                ) : null}
              </div>
            );
          case "AUDIO":
            return <audio src={fullMediaUrl} controls className="min-w-[12rem] max-w-full sm:min-w-[14rem]" />;
          case "DOCUMENT":
            return (
              <div className="flex min-w-[14rem] items-center gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[var(--whatsapp-surface-muted)] px-3 py-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                    {message.mediaFileName || "Document"}
                  </p>
                  <p className="text-xs text-[color:var(--color-muted-foreground)]">
                    {t("common.download") || "Download"}
                  </p>
                </div>
                <a
                  href={fullMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                >
                  <Download className="size-4" />
                </a>
              </div>
            );
          default:
            return (
              <div className="space-y-2">
                <p className="text-sm text-rose-700 dark:text-rose-200">
                  Unsupported media type: {message.messageType}
                </p>
                <a
                  href={fullMediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                >
                  <Download className="size-4" />
                  {t("common.download") || "Download"}
                </a>
              </div>
            );
        }
      }

      if (message.messageType === "LOCATION") {
        try {
          const location = message.content ? JSON.parse(message.content) : {};
          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

          return (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[var(--whatsapp-surface-muted)] px-3 py-3 transition-colors hover:bg-[var(--whatsapp-surface)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                  <MapPin className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {t("whatsapp.window.location")}
                  </p>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {location.address ||
                      location.name ||
                      `${location.latitude}, ${location.longitude}`}
                  </p>
                </div>
              </div>
            </a>
          );
        } catch {
          return (
            <LinkifiedText
              text={message.content ?? ''}
              className="block whitespace-pre-wrap text-sm leading-[1.45] text-[color:var(--color-foreground)]"
            />
          );
        }
      }

      if (message.messageType === "TEMPLATE") {
        let templateName = '';
        let bodyContent = message.content || '';
        try {
          const interactive = message.interactiveData ? JSON.parse(message.interactiveData) : null;
          if (interactive?.templateName) templateName = interactive.templateName;
          if (!templateName && bodyContent.startsWith('Template: ')) {
            templateName = bodyContent.replace('Template: ', '').trim();
          }
          if (templateName && bodyContent.startsWith(templateName + '\n')) {
            bodyContent = bodyContent.slice(templateName.length).trim();
          }
          if ((!bodyContent || bodyContent === `Template: ${templateName}` || bodyContent === templateName) && interactive?.templateBody) {
            bodyContent = interactive.templateBody;
          }
        } catch {}

        const isFallbackText = templateName ? (bodyContent === `Template: ${templateName}` || bodyContent === templateName) : false;
        const showBodyText = Boolean(bodyContent && !isFallbackText);

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {templateName || 'Template'}
              </span>
            </div>
            {showBodyText ? (
              <LinkifiedText
                text={bodyContent}
                className="block whitespace-pre-wrap text-sm leading-[1.45] text-[color:var(--color-foreground)]"
              />
            ) : null}
          </div>
        );
      }

      return (
        <LinkifiedText
          text={message.content ?? ''}
          className="block whitespace-pre-wrap text-sm leading-[1.45] text-[color:var(--color-foreground)]"
        />
      );
    };

    return (
      <div className="w-full px-2 py-0.5">
        {shouldShowDateSeparator(message, previousMessage) ? (
          <div className="mb-2 flex justify-center">
            <div className="rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)] shadow-sm">
              {getDateSeparatorText(message.timestamp)}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "flex w-full px-1.5",
            message.fromMe ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "wa-bubble wa-bubble-enter min-w-[5rem] cursor-context-menu rounded-xl px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2",
              "border border-transparent",
              message.fromMe
              ? "rounded-tr-[6px] bg-[var(--whatsapp-message-outgoing)] text-[var(--whatsapp-message-outgoing-text)]"
              : "rounded-tl-[6px] bg-[var(--whatsapp-message-incoming)] text-[var(--whatsapp-message-incoming-text)]",
          highlighted && "wa-highlight",
        )}
            onContextMenu={(event) => onContextMenu(event, message)}
          >
            {isGroup && !message.fromMe && message.participant ? (
              <p className="mb-1 text-xs font-semibold text-[color:var(--color-secondary)]">
                {getParticipantName(message.participant)}
              </p>
            ) : null}

            {message.quotedMessageId ? (
              <div
                className="mb-2 cursor-pointer rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[var(--whatsapp-surface-muted)] px-3 py-2 transition-colors hover:bg-primary/8"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuotedMessageClick?.(message.quotedMessageId!);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onQuotedMessageClick?.(message.quotedMessageId!);
                  }
                }}
                role="button"
                tabIndex={0}
                title={t("whatsapp.window.goToMessage") || "Go to message"}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-primary)]">
                  {t("whatsapp.window.replyingTo")}
                </p>
                <p className="mt-1 truncate text-xs text-[color:var(--color-muted-foreground)]">
                  {message.quotedContent || t("whatsapp.window.message")}
                </p>
              </div>
            ) : null}

            {message.fromMe && message.metadata?.isBroadcast ? (
              <div className="mb-1 flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-sky-600/10 to-blue-600/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 dark:from-sky-400/20 dark:to-blue-400/20 dark:text-sky-300">
                  <Radio className="size-3" />
                  <span>Broadcast</span>
                </div>
              </div>
            ) : null}

            {isAI ? (
              <div className="mb-1 flex items-center justify-between gap-1.5">
                <div className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-purple-600/10 to-violet-600/10 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:from-purple-400/20 dark:to-violet-400/20 dark:text-purple-300">
                  <Bot className="size-3" />
                  <span>AI</span>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setCorrectionText(message.content || '');
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-purple-600 transition-colors hover:bg-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-400/10"
                  >
                    <Pencil className="size-2.5" />
                    <span>تصحيح الرد</span>
                  </button>
                )}
              </div>
            ) : senderName ? (
              <p className="mb-1 text-xs font-semibold text-[color:var(--color-primary)]">
                {senderName}
              </p>
            ) : null}

            {renderMessageContent()}

            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                {format(new Date(message.timestamp), "HH:mm")}
              </span>
              {message.fromMe ? <MessageStatusIcon status={message.status} /> : null}
            </div>
          </div>
        </div>

        {/* Inline Correction Editor */}
        {isEditing && isAI && (
          <div className={cn(
            "mt-1 w-full px-1.5",
            message.fromMe ? "flex justify-end" : "flex justify-start"
          )}>
            <div className="w-[75%] rounded-xl border border-purple-300/50 bg-[var(--whatsapp-surface)] p-2.5 shadow-sm dark:border-purple-500/30">
              <p className="mb-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                تصحيح رد الوكيل:
              </p>
              <textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                className="w-full min-h-[3.5rem] resize-none rounded-lg border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-muted)] p-2 text-sm text-[color:var(--color-foreground)] outline-none focus:border-purple-500 dark:focus:border-purple-400"
                placeholder="اكتب الرد الصحيح للعميل هنا..."
              />
              <div className="mt-1.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setCorrectionText('');
                  }}
                  className="rounded-lg px-3 py-1 text-xs font-medium text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={submitCorrection}
                  disabled={saving || !correctionText.trim()}
                  className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ وتصحيح'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
