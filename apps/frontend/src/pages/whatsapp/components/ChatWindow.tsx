import React, { useState, useEffect, type TouchEvent as ReactTouchEvent } from "react";
import { useTranslation } from "react-i18next";
import EmojiPicker from "emoji-picker-react";
import { VirtualItem } from "@tanstack/react-virtual";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Info,
  List,
  MapPin,
  Mic,
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
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Contact, Message } from "../../../hooks/useWhatsAppQueries";
import {
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
  onOpenTasks?: () => void;
  onOpenTemplate?: () => void;
  onBackToList?: () => void;
  onTouchStart?: (e: ReactTouchEvent) => void;
  onTouchEnd?: (e: ReactTouchEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onQuotedMessageClick?: (quotedMessageId: string) => void;
  highlightedMessageId?: string | null;
  messagesError?: boolean;
  onRetryMessages?: () => void;
  onToggleAi?: (contact: Contact, aiEnabled: boolean) => void;
}

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
  showRightPanel,
  onToggleRightPanel,
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
  onOpenTemplate,
  onBackToList,
  onTouchStart,
  onTouchEnd,
  fileInputRef,
  onQuotedMessageClick,
  highlightedMessageId,
  messagesError,
  onRetryMessages,
  onToggleAi,
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
            <AvatarImage src={selectedContact.profilePicUrl || undefined} />
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
      </div>

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

      <div className="wa-input-bar border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:var(--color-card)] px-2 py-2 sm:px-3 sm:py-3 shrink-0">
        {replyingTo ? (
          <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] px-3 py-2">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-primary)]">
                {replyingTo.fromMe
                  ? t("whatsapp.window.you")
                  : replyingTo.participant || replyingTo.participantName
                    ? (replyingTo.participantName || getParticipantName(replyingTo.participant || ''))
                    : getContactName(selectedContact)}
              </p>
              <p className="line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
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
              <>
                <div className="wa-rich-tools-backdrop sm:hidden" aria-hidden="true" {...({inert: true} as any)} onClick={() => setShowEmojiPicker(false)} />
                <div className="whatsapp-emoji-picker absolute bottom-full start-0 z-20 mb-3 overflow-hidden rounded-3xl border border-[color:var(--shell-control-border)] shadow-lg">
                  <EmojiPicker
                    onEmojiClick={(data) => setNewMessage(newMessage + data.emoji)}
                  />
                </div>
              </>
            ) : null}

            <div className="order-1 flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "rounded-full border-0 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[var(--whatsapp-surface-hover)]",
                  showEmojiPicker && "bg-primary/10 text-[color:var(--color-primary)]",
                )}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-full border-0 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[var(--whatsapp-surface-hover)]"
                onClick={() => fileInputRef.current?.click()}
                title={t("whatsapp.tooltips.attach") as string}
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "rounded-full border-0 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[var(--whatsapp-surface-hover)]",
                  showRichTools && "bg-primary/10 text-[color:var(--color-primary)]",
                )}
                onClick={() => setShowRichTools(!showRichTools)}
                title="أدوات إضافية"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {showRichTools ? (
              <>
                {/* Mobile: bottom tray */}
                <div className="wa-rich-tools-backdrop sm:hidden" aria-hidden="true" {...({inert: true} as any)} onClick={() => setShowRichTools(false)} />
                <div className="wa-rich-tools-tray sm:order-2 sm:static sm:inset-auto sm:z-auto sm:w-auto sm:animate-none sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:dark:shadow-none">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenPoll}
                  title={t("whatsapp.tooltips.poll") as string}
                >
                  <BarChart3 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenButtons}
                  title={t("whatsapp.tooltips.buttons") as string}
                >
                  <Menu className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenList}
                  title={t("whatsapp.tooltips.list") as string}
                >
                  <List className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenCatalog}
                  title={t("whatsapp.tooltips.catalog") as string}
                >
                  <Store className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenLocation}
                  title={t("whatsapp.tooltips.location") as string}
                >
                  <MapPin className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={onOpenOrder}
                  title={t("whatsapp.tooltips.order") as string}
                >
                  <ShoppingCart className="size-4" />
                </Button>
                {onOpenTasks && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={onOpenTasks}
                    title={t("whatsapp.tooltips.task") as string}
                  >
                    <ClipboardList className="size-4" />
                  </Button>
                )}
                {onOpenTemplate && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={onOpenTemplate}
                    title={t("whatsapp.tooltips.template") as string}
                  >
                    <FileText className="size-4" />
                  </Button>
                )}
                  </div>
                </div>
              </>
            ) : null}

            <input type="file" ref={fileInputRef} hidden onChange={onFileUpload} />

            <textarea
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder={t("whatsapp.window.inputPlaceholder") as string}
              aria-label={t("whatsapp.window.inputPlaceholder") as string}
              className="wa-auto-textarea order-2 min-h-[2.5rem] min-w-[10rem] flex-1 resize-none rounded-xl border border-[color:var(--shell-control-border)] bg-background dark:bg-[var(--whatsapp-surface-strong)] px-3.5 py-2 text-sm leading-6 text-[color:var(--color-foreground)] outline-none transition-colors placeholder:text-[color:var(--color-muted-foreground)] focus:border-[color:var(--color-primary)] sm:order-3 sm:min-h-[2.5rem] sm:min-w-[14rem] sm:py-2"
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
                className="order-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-10 p-0 shrink-0 flex items-center justify-center shadow-sm"
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
                variant="ghost"
                className="order-4 rounded-full border-0 text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-foreground)] hover:bg-[var(--whatsapp-surface-hover)] w-10 h-10 p-0 shrink-0 flex items-center justify-center"
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
