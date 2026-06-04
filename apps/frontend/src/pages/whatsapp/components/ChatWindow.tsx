import React from "react";
import { useTranslation } from "react-i18next";
import EmojiPicker from "emoji-picker-react";
import { VirtualItem } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  BarChart3,
  Info,
  List,
  MapPin,
  Mic,
  Paperclip,
  RefreshCw,
  Send,
  ShoppingCart,
  Smile,
  Menu,
  Store,
  ClipboardList,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Contact, Message } from "../../../hooks/useWhatsAppQueries";
import {
  getBestContactDisplayName,
  getContactDisplayPhone,
} from "../whatsappContactDisplay";
import MessageBubble from "./MessageBubble";
import AudioRecorder from "./AudioRecorder";

interface ChatWindowProps {
  className?: string;
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
  onOpenTasks?: () => void;
  onBackToList?: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onQuotedMessageClick?: (quotedMessageId: string) => void;
  highlightedMessageId?: string | null;
}

const backgroundStyle: React.CSSProperties = {
  backgroundColor:
    "color-mix(in srgb, var(--color-background) 84%, var(--shell-control-bg) 16%)",
  backgroundImage:
    'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
  backgroundPosition: "center",
  backgroundSize: "cover",
  backgroundBlendMode: "normal",
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  className,
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
  onOpenContactInfo,
  onMessageContextMenu,
  getContactName,
  getParticipantName,
  onOpenPoll,
  onOpenButtons,
  onOpenList,
  onOpenCatalog,
  onOpenLocation,
  onOpenOrder,
  onOpenTasks,
  onBackToList,
  fileInputRef,
  onQuotedMessageClick,
  highlightedMessageId,
}) => {
  const { t, i18n } = useTranslation();

  if (!selectedContact) {
    return (
      <div
        className={cn(
          "whatsapp-theme-transition flex min-h-[24rem] flex-1 items-center justify-center bg-[color:color-mix(in_srgb,var(--app-panel-bg)_80%,var(--shell-control-bg)_20%)] px-6 text-center",
          className,
        )}
      >
        <div className="max-w-sm space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-[24px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] text-[color:var(--color-primary)] shadow-[0_16px_40px_rgba(15,27,45,0.08)]">
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

  return (
    <div
      className={cn(
        "whatsapp-theme-transition flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--app-panel-bg)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_88%,var(--shell-control-bg)_12%)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {onBackToList ? (
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)] xl:hidden"
              onClick={onBackToList}
              title={t("whatsapp.sidebar.all")}
            >
              <ArrowLeft
                className={cn("size-4", i18n.dir() === "rtl" && "rotate-180")}
              />
              <span className="sr-only">{t("whatsapp.sidebar.all")}</span>
            </Button>
          ) : null}
          <Avatar size="lg" className="shadow-[0_12px_30px_rgba(15,27,45,0.1)]">
            <AvatarImage src={selectedContact.profilePicUrl || undefined} />
            <AvatarFallback className="bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))] text-[color:var(--color-primary)]">
              {getContactName(selectedContact).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                {getContactName(selectedContact)}
              </p>
              {selectedContact.isGroup ? (
                <Badge
                  variant="outline"
                  className="border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] text-[10px] text-[color:var(--color-muted-foreground)]"
                >
                  {t("whatsapp.window.group")}
                </Badge>
              ) : null}
              {selectedContact.unreadCount > 0 ? (
                <Badge className="bg-[color:var(--color-primary)] text-white">
                  {selectedContact.unreadCount}
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
              <span dir="ltr">
                {getContactDisplayPhone(selectedContact)}
              </span>
              {selectedContact.isMuted ? <span>مكتوم</span> : null}
              {selectedContact.isPinned ? <span>مثبت</span> : null}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]"
          onClick={onOpenContactInfo}
        >
          <Info className="size-4" />
          <span className="sr-only">{t("common.info")}</span>
        </Button>
      </div>

      <div
        ref={messagesContainerRef}
        className="whatsapp-messages-area relative min-h-0 flex-1 overflow-auto px-4 py-4"
        style={backgroundStyle}
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3">
            <RefreshCw className="size-6 animate-spin text-[color:var(--color-primary)]" />
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("common.loading")}
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
                    message={message}
                    previousMessage={previousMessage || undefined}
                    isGroup={selectedContact.isGroup}
                    sessionId={selectedContact.sessionId}
                    onContextMenu={onMessageContextMenu}
                    getParticipantName={getParticipantName}
                    onQuotedMessageClick={onQuotedMessageClick}
                    highlighted={highlightedMessageId === message.messageId}
                  />
                </div>
              );
            })}
          </div>
        )}

        {typingUsers.size > 0 ? (
          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex justify-start">
            <div className="pointer-events-auto rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-typing-bg)] px-3 py-1.5 text-xs text-[color:var(--color-muted-foreground)] shadow-[0_10px_24px_rgba(15,27,45,0.08)]">
              {t("whatsapp.window.typing")}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_88%,white_12%)] px-3 py-3 sm:px-4 sm:py-4">
        {replyingTo ? (
          <div className="mb-3 flex items-start justify-between gap-3 rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] px-4 py-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-primary)]">
                {replyingTo.fromMe
                  ? t("whatsapp.window.you")
                  : replyingTo.participant
                    ? getParticipantName(replyingTo.participant)
                    : getContactName(selectedContact)}
              </p>
              <p className="truncate text-sm text-[color:var(--color-muted-foreground)]">
                {replyPreview}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setReplyingTo(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}

        {isRecording ? (
          <AudioRecorder
            onCancel={() => setIsRecording(false)}
            onSend={(blob) => {
              setIsRecording(false);
              onVoiceNoteSend(blob);
            }}
          />
        ) : (
          <div className="relative flex flex-wrap items-end gap-2">
            {showEmojiPicker ? (
              <div className="whatsapp-emoji-picker absolute bottom-full left-0 z-20 mb-3 overflow-hidden rounded-[24px] border border-[color:var(--shell-control-border)] shadow-[0_20px_50px_rgba(15,27,45,0.18)]">
                <EmojiPicker
                  onEmojiClick={(data) => setNewMessage(newMessage + data.emoji)}
                />
              </div>
            ) : null}

            <div className="order-1 flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className={cn(
                  "rounded-full border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]",
                  showEmojiPicker && "bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]",
                )}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]"
                onClick={() => fileInputRef.current?.click()}
                title={t("whatsapp.tooltips.attach")}
              >
                <Paperclip className="size-4" />
              </Button>
            </div>

            <div className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-2 sm:w-auto">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenPoll}
                title={t("whatsapp.tooltips.poll")}
              >
                <BarChart3 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenButtons}
                title={t("whatsapp.tooltips.buttons")}
              >
                <Menu className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenList}
                title={t("whatsapp.tooltips.list")}
              >
                <List className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenCatalog}
                title={t("whatsapp.tooltips.catalog")}
              >
                <Store className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenLocation}
                title={t("whatsapp.tooltips.location")}
              >
                <MapPin className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full"
                onClick={onOpenOrder}
                title={t("whatsapp.tooltips.order")}
              >
                <ShoppingCart className="size-4" />
              </Button>
              {onOpenTasks && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenTasks}
                  title={t("whatsapp.tooltips.task")}
                >
                  <ClipboardList className="size-4" />
                </Button>
              )}
            </div>

            <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />

            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={t("whatsapp.window.inputPlaceholder")}
              className="order-2 min-h-[2.75rem] min-w-[14rem] flex-1 resize-none rounded-[22px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-input-bg)] px-4 py-3 text-sm leading-6 text-[color:var(--color-foreground)] outline-none transition-colors placeholder:text-[color:var(--color-muted-foreground)] focus:border-[color:var(--color-primary)] sm:order-3"
              rows={1}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSendMessage();
                }
              }}
            />

            {newMessage.trim() ? (
              <Button
                className="order-4 rounded-full bg-[color:var(--business-success)] px-4 text-white hover:bg-[color:color-mix(in_srgb,var(--business-success)_76%,black)]"
                onClick={onSendMessage}
                disabled={isSendingMessage}
              >
                {isSendingMessage ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            ) : (
              <Button
                className="order-4 rounded-full bg-[color:var(--color-primary)] px-4 text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_78%,black)]"
                onClick={() => setIsRecording(true)}
              >
                <Mic className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
