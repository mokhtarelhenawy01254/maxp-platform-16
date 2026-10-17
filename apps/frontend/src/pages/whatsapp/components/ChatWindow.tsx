import React, { useState, useEffect, type TouchEvent as ReactTouchEvent } from "react";
import { useTranslation } from "react-i18next";
import EmojiPicker from "emoji-picker-react";
import { VirtualItem } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ImageIcon,
  Info,
  List,
  MapPin,
  Mic,
  Package,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Send,
  ShoppingCart,
  Smile,
  Menu,
  Plus,
  Store,
  ClipboardList,
  FileText,
  Link2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Contact, Message } from "../../../hooks/useWhatsAppQueries";
import {
  getContactDisplayPhone,
} from "../whatsappContactDisplay";
import { getInboxExternalImageUrl } from "@/utils/imageUrl";
import MessageBubble from "./MessageBubble";
import PinnedMessageBanner from "./PinnedMessageBanner";
import MessageInput from "../../../components/facebook-inbox/MessageInput/MessageInput";

interface ChatWindowProps {
  className?: string;
  user?: any;
  onSendFile?: (file: File) => void;
  onSendMessageText?: (text: string) => void;
  selectedContact: Contact | null;
  messages: Message[];
  loadingMessages: boolean;
  virtualItems: VirtualItem[];
  totalHeight: number;
  measureElement: (node: HTMLElement | null) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  typingUsers: Set<string>;
  newMessage: string;
  setNewMessage: (text: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  replyingTo: Message | null;
  setReplyingTo: (msg: Message | null) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  isSendingMessage: boolean;
  onSendMessage: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceNoteSend: (blob: Blob) => void;
  showRightPanel?: boolean;
  onToggleRightPanel?: () => void;
  onOpenContactInfo: () => void;
  onMessageContextMenu: (event: React.MouseEvent, message: Message) => void;
  getContactName: (contact: Contact) => string;
  getParticipantName: (participantJid: string) => string;
  onOpenPoll: () => void;
  onOpenButtons: () => void;
  onOpenList: () => void;
  onOpenCatalog: () => void;
  onOpenLocation: () => void;
  onOpenOrder: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  onOpenTemplate?: () => void;
  onOpenProducts?: () => void;
  onOpenImageGallery?: () => void;
  onBackToList?: () => void;
  onTouchStart?: (e: ReactTouchEvent) => void;
  onTouchEnd?: (e: ReactTouchEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onQuotedMessageClick?: (quotedMessageId: string) => void;
  highlightedMessageId?: string | null;
  messagesError?: boolean;
  onRetryMessages?: () => void;
  onToggleAi?: (contact: Contact, aiEnabled: boolean) => void;
  isUploadingMedia?: boolean;
  onOpenInteractive?: () => void;
  pinnedMessage?: Message | null;
  onScrollToPinnedMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onSendReaction?: (messageId: string, emoji: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  className,
  user,
  onSendFile,
  onSendMessageText,
  selectedContact,
  messages,
  loadingMessages,
  virtualItems,
  totalHeight,
  measureElement,
  messagesContainerRef,
  typingUsers,
  newMessage,
  setNewMessage,
  showEmojiPicker,
  setShowEmojiPicker,
  replyingTo,
  setReplyingTo,
  isRecording,
  setIsRecording,
  isSendingMessage,
  onSendMessage,
  onFileUpload,
  onVoiceNoteSend,
  showRightPanel,
  onToggleRightPanel,
  onOpenContactInfo,
  onMessageContextMenu,
  getContactName,
  getParticipantName,
  onOpenPoll,
  onOpenButtons,
  onOpenInteractive,
  pinnedMessage,
  onScrollToPinnedMessage,
  onUnpinMessage,
  onSendReaction,
  onOpenList,
  onOpenCatalog,
  onOpenLocation,
  onOpenOrder,
  onOpenServiceOrder,
  onOpenTasks,
  onOpenTemplate,
  onOpenProducts,
  onOpenImageGallery,
  onBackToList,
  onTouchStart,
  onTouchEnd,
  fileInputRef,
  onQuotedMessageClick,
  highlightedMessageId,
  messagesError,
  onRetryMessages,
  onToggleAi,
  isUploadingMedia,
}) => {
  const { t, i18n } = useTranslation();
  const [showRichTools, setShowRichTools] = useState(false);

  useEffect(() => {
    setShowRichTools(false);
  }, [selectedContact]);

  if (!selectedContact) {
    return (
      <div
        className={cn(
          "whatsapp-theme-transition flex h-full min-h-0 flex-1 flex-col items-center justify-center bg-[color:var(--color-muted)]/40 px-space-6 text-center",
          className,
        )}
      >
        <div className="max-w-sm space-y-space-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-primary)] shadow-raised">
            <Send className="size-7" />
          </div>
          <p className="text-lg font-semibold text-[color:var(--color-foreground)]">
            {t("whatsapp.window.selectChat")}
          </p>
          <p className="text-sm leading-6 text-[color:var(--color-muted-foreground)]">
            اختر محادثة من القائمة لقراءة الرسائل والرد من الجلسة المتصلة.
          </p>
        </div>
      </div>
    );
  }

  const replyPreview = replyingTo?.content || replyingTo?.mediaType || t("whatsapp.window.message");

  const isUnresolvedLid = Boolean(
    selectedContact?.jid?.includes("@lid") &&
      (!selectedContact?.phoneNumber ||
        selectedContact.phoneNumber.startsWith("lid:") ||
        selectedContact.phoneNumber.startsWith("group:"))
  );

  const handleSendMessageFromBar = (content: string) => {
    if (isUnresolvedLid) {
      toast.error(
        "لا يمكن إرسال رسالة إلى جهة اتصال بدون رقم هاتف (معرّف LID غير محلول). يرجى حفظ رقم هاتف العميل أولاً من لوحة التفاصيل الجانبية."
      );
      if (onToggleRightPanel && !showRightPanel) {
        onToggleRightPanel();
      }
      return;
    }
    setNewMessage(content);
    if (onSendMessageText) {
      onSendMessageText(content);
    } else {
      onSendMessage();
    }
  };

  const handleSendFileFromBar = (file: File) => {
    if (isUnresolvedLid) {
      toast.error(
        "لا يمكن إرسال وسائط أو تسجيلات إلى جهة اتصال بدون رقم هاتف (معرّف LID غير محلول). يرجى حفظ رقم هاتف العميل أولاً من لوحة التفاصيل الجانبية."
      );
      if (onToggleRightPanel && !showRightPanel) {
        onToggleRightPanel();
      }
      return;
    }
    if (onSendFile) {
      onSendFile(file);
    } else if (onVoiceNoteSend && (file.name.startsWith("voice-") || file.type.startsWith("audio/"))) {
      onVoiceNoteSend(file);
    }
  };

  const replyToData = replyingTo
    ? {
        senderName: replyingTo.fromMe
          ? t("whatsapp.window.you")
          : replyingTo.participant || replyingTo.participantName
            ? replyingTo.participantName || getParticipantName(replyingTo.participant || "")
            : getContactName(selectedContact),
        content: replyPreview,
        type: replyingTo.mediaType || "text",
      }
    : null;

  const conversationData = selectedContact
    ? {
        id: selectedContact.jid,
        name: getContactName(selectedContact),
        customer_name: getContactName(selectedContact),
        customer_phone: selectedContact.phoneNumber || getContactDisplayPhone(selectedContact),
        platform: "whatsapp",
      }
    : null;

  const handleCopyChatLink = () => {
    if (!selectedContact) return;
    const sessionId = selectedContact.sessionId || "";
    if (!sessionId) {
      toast.error("لا يمكن نسخ رابط المحادثة");
      return;
    }
    const jid = encodeURIComponent(selectedContact.jid);
    const url = `${window.location.origin}/whatsapp/chat?session=${encodeURIComponent(sessionId)}&jid=${jid}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("تم نسخ رابط المحادثة"))
      .catch(() => toast.error("تعذر نسخ الرابط"));
  };

  return (
    <div
      className={cn(
        "whatsapp-theme-transition flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--app-panel-bg)]",
        className,
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="wa-glass-header flex items-center justify-between gap-space-2 border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-space-3 py-space-1 shrink-0">
        <div className="flex min-w-0 items-center gap-space-2">
          {onBackToList ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-full hover:bg-[var(--whatsapp-surface-hover)] lg:hidden"
              onClick={onBackToList}
              title={t("whatsapp.sidebar.all") as string}
            >
              <ArrowLeft
                className={cn("size-4", i18n.dir() === "rtl" && "rotate-180")}
              />
              <span className="sr-only">{t("whatsapp.sidebar.all")}</span>
            </Button>
          ) : null}
          <Avatar className="size-8">
            <AvatarImage src={getInboxExternalImageUrl(selectedContact.profilePicUrl) || undefined} />
            <AvatarFallback className="bg-primary/10 text-xs text-[color:var(--color-primary)]">
              {getContactName(selectedContact).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                {getContactName(selectedContact)}
              </p>
              {selectedContact.isGroup ? (
                <Badge
                  variant="outline"
                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[9px] text-[color:var(--color-muted-foreground)] px-1 py-0"
                >
                  {t("whatsapp.window.group")}
                </Badge>
              ) : null}
              {selectedContact.isNewsletter ? (
                <Badge
                  variant="outline"
                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[9px] text-[color:var(--color-muted-foreground)] px-1 py-0"
                >
                  {t("whatsapp.window.channel")}
                </Badge>
              ) : null}
              {selectedContact.unreadCount > 0 ? (
                <Badge className="bg-[color:var(--color-primary)] text-white text-[10px] h-4 min-w-4 px-1">
                  {selectedContact.unreadCount}
                </Badge>
              ) : null}
              <span className="hidden text-[11px] text-[color:var(--color-muted-foreground)] sm:inline" dir="ltr">
                · {getContactDisplayPhone(selectedContact)}
              </span>
              {selectedContact.isMuted ? <span className="text-[10px] text-[color:var(--color-muted-foreground)]">مكتوم</span> : null}
            </div>
          </div>
        </div>

        {(() => {
          if (!selectedContact || !onToggleAi) return null;
          const hasActiveConversation = selectedContact.customer?.conversations && selectedContact.customer.conversations.length > 0;
          const aiEnabled = hasActiveConversation ? selectedContact.customer?.conversations?.[0]?.aiEnabled !== false : true;
          return (
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(
                "size-8 shrink-0 rounded-full",
                aiEnabled
                  ? "text-[color:var(--color-primary)] hover:bg-[color:var(--color-primary)]/10"
                  : "text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
              )}
              onClick={() => onToggleAi(selectedContact, !aiEnabled)}
              title={aiEnabled ? "إيقاف الرد الآلي" : "تشغيل الرد الآلي"}
            >
              <span className="text-base">🤖</span>
            </Button>
          );
        })()}

        {onToggleRightPanel ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 shrink-0 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
            onClick={onToggleRightPanel}
          >
            {showRightPanel ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            <span className="sr-only">{showRightPanel ? t("common.close") : t("common.open")}</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
          onClick={onOpenContactInfo}
        >
          <Info className="size-4" />
          <span className="sr-only">{t("common.info")}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 rounded-full text-[color:var(--color-muted-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
          onClick={handleCopyChatLink}
          title="نسخ رابط المحادثة"
        >
          <Link2 className="size-4" />
          <span className="sr-only">نسخ رابط المحادثة</span>
        </Button>
      </div>

      <PinnedMessageBanner
        pinnedMessage={pinnedMessage || null}
        onScrollToMessage={onScrollToPinnedMessage || (() => {})}
        onUnpin={onUnpinMessage || (() => {})}
      />

      <div
        ref={messagesContainerRef}
        className="wa-messages-scroll wa-messages-container wa-slim-scroll whatsapp-messages-area relative min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-4 sm:py-4"
      >
        {messagesError ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 px-6">
            <AlertTriangle className="size-10 text-rose-500" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                {t("whatsapp.dialogs.error")}
              </p>
              <p className="text-sm text-[color:var(--color-muted-foreground)]">
                {t("whatsapp.window.selectChat")}
              </p>
            </div>
            {onRetryMessages ? (
              <Button
                variant="outline"
                className="rounded-full border-[color:var(--shell-control-border)]"
                onClick={onRetryMessages}
              >
                <RefreshCw className="size-4 ml-2" />
                {t("conversations.retry")}
              </Button>
            ) : null}
          </div>
        ) : loadingMessages && messages.length === 0 ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3">
            <RefreshCw className="size-6 animate-spin text-[color:var(--color-primary)]" />
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("common.loading")}
            </p>
          </div>
        ) : !loadingMessages && messages.length === 0 ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-3xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-muted-foreground)] shadow-md">
              <Send className="size-6" />
            </div>
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {t("conversations.noMessages")}
            </p>
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${totalHeight}px` }}
          >
            {virtualItems.map((virtualItem) => {
              const message = messages[virtualItem.index];
              const previousMessage = messages[virtualItem.index - 1];

              return (
                <div
                  key={virtualItem.key}
                  ref={measureElement}
                  data-index={virtualItem.index}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <MessageBubble
                    message={message!}
                    previousMessage={previousMessage || undefined}
                    isGroup={selectedContact.isGroup}
                    sessionId={selectedContact.sessionId}
                    onContextMenu={onMessageContextMenu}
                    getParticipantName={getParticipantName}
                    onQuotedMessageClick={onQuotedMessageClick}
                    onReaction={onSendReaction}
                    highlighted={highlightedMessageId === message?.messageId}
                  />
                </div>
              );
            })}
          </div>
        )}

        {typingUsers.size > 0 ? (
          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-start">
            <div className="pointer-events-auto rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-typing-bg)] px-3 py-1.5 text-xs text-[color:var(--color-muted-foreground)] shadow-sm">
              {t("whatsapp.window.typing")}
            </div>
          </div>
        ) : null}
      </div>

      <div className="wa-input-bar border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:var(--color-card)] shrink-0">
        {(selectedContact?.session?.provider === 'META_CLOUD' && selectedContact?.window && !selectedContact.window.isOpen) || isUnresolvedLid ? (
          <div className="px-2 pt-2 sm:px-3 sm:pt-2.5 space-y-2">
            {selectedContact?.session?.provider === 'META_CLOUD' && selectedContact?.window && !selectedContact.window.isOpen ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="truncate">
                    انتهت نافذة الـ 24 ساعة المسموحة من Meta. يجب استخدام قالب رسمي معتمد للمراسلة.
                  </span>
                </div>
                {onOpenTemplate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenTemplate}
                    className="shrink-0 h-7 text-xs border-amber-500/40 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100"
                  >
                    <FileText className="size-3.5 me-1" />
                    إرسال قالب رسمي
                  </Button>
                )}
              </div>
            ) : null}

            {isUnresolvedLid ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="truncate sm:whitespace-normal">
                    جهة الاتصال هذه تستخدم معرّف واتساب مشفر (LID). لإرسال واستلام الرسائل بنجاح، يُرجى حفظ رقم هاتف العميل.
                  </span>
                </div>
                {onToggleRightPanel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!showRightPanel) onToggleRightPanel();
                    }}
                    className="shrink-0 h-7 text-xs border-amber-500/40 text-amber-900 hover:bg-amber-500/20 dark:text-amber-100 font-medium"
                  >
                    {showRightPanel ? "اللوحة مفتوحة" : "إضافة رقم الهاتف"}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <MessageInput
          platform="whatsapp"
          onSendMessage={handleSendMessageFromBar}
          onSendFile={handleSendFileFromBar}
          isSending={isSendingMessage}
          sending={isSendingMessage}
          uploadingFile={isUploadingMedia}
          disabled={isUnresolvedLid}
          disabledReason="يرجى حفظ رقم هاتف العميل أولاً لإرسال واستلام الرسائل"
          draftMessage={newMessage}
          onDraftMessageHandled={() => setNewMessage("")}
          user={user}
          conversation={conversationData}
          replyTo={replyToData}
          onCancelReply={() => setReplyingTo(null)}
          onOpenOrder={onOpenOrder}
          onOpenServiceOrder={onOpenServiceOrder}
          onOpenTasks={onOpenTasks}
          onOpenInteractive={onOpenInteractive}
          onOpenPoll={onOpenPoll}
          onOpenButtons={onOpenButtons}
          onOpenList={onOpenList}
          onOpenCatalog={onOpenCatalog}
          onOpenLocation={onOpenLocation}
          onOpenTemplate={onOpenTemplate}
          onOpenImageGallery={onOpenImageGallery}
          onOpenProductPicker={onOpenProducts}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
