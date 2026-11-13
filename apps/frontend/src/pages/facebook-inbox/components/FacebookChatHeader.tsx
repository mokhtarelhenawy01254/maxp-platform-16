import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  StickyNote,
  UserCircle2,
} from 'lucide-react';
import ConversationActionsBar from '@/components/facebook-inbox/ConversationActionsBar/ConversationActionsBar';
import type { InboxConversation } from '@/types/inbox.types';
import type {
  InboxVerticalAction,
  InboxVerticalActionId,
} from '../hooks/useInboxVerticalCapabilities';
import FacebookChatHeaderDesktopMenu, {
  renderVerticalActionIcon,
} from './FacebookChatHeaderDesktopMenu';
import FacebookChatHeaderMobileMenu from './FacebookChatHeaderMobileMenu';

interface FacebookChatHeaderProps {
  selectedConversation: InboxConversation;
  selectedConversationAvatarUrl: string | null;
  onBackToConversationList: () => void;
  isMobileViewport: boolean;
  isWideDesktop: boolean;
  shouldCollapseActions: boolean;
  isAiActive: boolean;
  onToggleAi: () => void;
  isProfilePanelActive: boolean;
  profilePanelToggleTitle: string;
  onOpenProfilePanel: () => void;
  showMobileActionMenu: boolean;
  setShowMobileActionMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showDesktopMoreMenu: boolean;
  setShowDesktopMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
  copiedLink: boolean;
  onCopyConversationLink: (id: string) => void;
  primaryAction?: InboxVerticalAction;
  availableActions?: InboxVerticalAction[];
  onTriggerVerticalAction?: (actionId: InboxVerticalActionId) => void;
  onOpenQuickOrderModal?: () => void;
  showNotes: boolean;
  onToggleNotesPanel: () => void;
  onOpenSnoozeModal: () => void;
  onDeleteConversation: () => void;
  onTogglePriority: () => void;
  onMarkDone: () => void;
  updating: boolean;
}

export const FacebookChatHeader: React.FC<FacebookChatHeaderProps> = ({
  selectedConversation,
  selectedConversationAvatarUrl,
  onBackToConversationList,
  isMobileViewport,
  shouldCollapseActions,
  isAiActive,
  onToggleAi,
  isProfilePanelActive,
  profilePanelToggleTitle,
  onOpenProfilePanel,
  showMobileActionMenu,
  setShowMobileActionMenu,
  showDesktopMoreMenu,
  setShowDesktopMoreMenu,
  copiedLink,
  onCopyConversationLink,
  primaryAction,
  availableActions,
  onTriggerVerticalAction,
  onOpenQuickOrderModal,
  showNotes,
  onToggleNotesPanel,
  onOpenSnoozeModal,
  onDeleteConversation,
  onTogglePriority,
  onMarkDone,
  updating,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 🆕 Wave 2b-1: من المحادثة في الانبوكس → سجل الليد في CRM مباشرة
  const handleOpenCRMLead = () => {
    if (selectedConversation.customerId) {
      navigate(`/customers/${selectedConversation.customerId}`);
    }
  };

  const isFacebook = !selectedConversation.platform || selectedConversation.platform === 'facebook';
  let isWindowExpired = Boolean(selectedConversation.isWindowExpired);
  let remainingHours: number | null = null;
  let hoursSinceExpiration = 0;

  if (isFacebook) {
    let convInboundTime = 0;
    if (selectedConversation.windowExpiresAt) {
      convInboundTime = new Date(selectedConversation.windowExpiresAt).getTime() - 24 * 60 * 60 * 1000;
    } else if (selectedConversation.lastInboundAt) {
      convInboundTime = new Date(selectedConversation.lastInboundAt).getTime();
    } else if (selectedConversation.lastMessageIsFromCustomer && selectedConversation.lastMessageTime) {
      convInboundTime = new Date(selectedConversation.lastMessageTime).getTime();
    }

    if (convInboundTime > 0 && !isNaN(convInboundTime)) {
      const expiresAt = convInboundTime + 24 * 60 * 60 * 1000;
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        isWindowExpired = true;
        hoursSinceExpiration = Math.max(0, Math.floor((Date.now() - expiresAt) / (1000 * 60 * 60)));
      } else {
        isWindowExpired = false;
        remainingHours = Math.max(1, Math.ceil(diff / (1000 * 60 * 60)));
      }
    } else if (selectedConversation.lastMessageTime) {
      const lastMsgTime = new Date(selectedConversation.lastMessageTime).getTime();
      if (!isNaN(lastMsgTime) && Date.now() - lastMsgTime < 24 * 60 * 60 * 1000) {
        isWindowExpired = false;
        remainingHours = Math.max(1, Math.ceil((lastMsgTime + 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60)));
      }
    }
  }

  const hasFailedDelivery = Boolean(
    selectedConversation.hasFailedDelivery ||
    selectedConversation.lastMessageDeliveryStatus === 'FAILED'
  );

  const resolvedPrimaryAction: InboxVerticalAction = primaryAction || {
    id: 'order',
    label: t('facebookInbox.createQuickOrder'),
  };

  const handlePrimaryClick = () => {
    if (onTriggerVerticalAction) {
      onTriggerVerticalAction(resolvedPrimaryAction.id);
    } else if (onOpenQuickOrderModal) {
      onOpenQuickOrderModal();
    }
  };

  const iconBtnCls =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer';

  const renderAiToggleButton = () => (
    <button
      type="button"
      onClick={onToggleAi}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
        isAiActive
          ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15'
      }`}
      title={
        isAiActive
          ? t(
              'facebookInbox.stopAiTooltip',
              'الرد الذكي مفعّل — اضغط لإيقاف الذكاء الاصطناعي عن هذه المحادثة',
            )
          : t(
              'facebookInbox.startAiTooltip',
              'الذكاء الاصطناعي متوقف (تدخل بشري) — اضغط لإعادة تشغيل الرد الآلي',
            )
      }
      aria-label={
        isAiActive
          ? t('facebookInbox.stopAi', 'إيقاف الذكاء الاصطناعي')
          : t('facebookInbox.startAi', 'تشغيل الذكاء الاصطناعي')
      }
    >
      <Bot className="h-4 w-4" />
      <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
        <span
          className={`relative inline-flex rounded-full h-2 w-2 border border-card ${
            isAiActive ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="business-inbox-header business-inbox-chat-header border-b border-border/50 bg-card/80 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
      <div className="business-inbox-header-row business-inbox-chat-header-row flex items-center justify-between gap-2">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onBackToConversationList}
          className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-foreground hover:bg-muted/60 transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={t('facebookInbox.backToConversations')}
          aria-label={t('facebookInbox.backToConversations')}
        >
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Customer Identity */}
        <div className="business-inbox-chat-identity flex min-w-0 flex-1 items-center gap-2.5">
          {selectedConversationAvatarUrl ? (
            <img
              src={selectedConversationAvatarUrl}
              alt={selectedConversation.customerName}
              className="h-9 w-9 shrink-0 rounded-full object-cover border border-border/60"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="h-9 w-9 shrink-0 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold items-center justify-center"
            style={{ display: selectedConversationAvatarUrl ? 'none' : 'flex' }}
          >
            {selectedConversation.customerName?.charAt(0)?.toUpperCase() || '؟'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="truncate text-sm sm:text-base font-semibold leading-tight text-foreground">
                {selectedConversation.customerName}
              </h2>

              {/* 24-hour Meta Window Status Pill */}
              {isFacebook && (
                isWindowExpired ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                    title="انتهت نافذة الـ 24 ساعة للرد حسب سياسة ميتا — لا يمكن إرسال رسائل جديدة"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                    <span>النافذة مغلقة {hoursSinceExpiration > 0 ? `(من ${hoursSinceExpiration}س)` : ''}</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25"
                    title="نافذة الرد متاحة — يمكنك الرد على هذه المحادثة الآن"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ينفع ترد {remainingHours ? `(متبقي ${remainingHours}س)` : ''}</span>
                  </span>
                )
              )}

              {/* Failed message notice in header */}
              {hasFailedDelivery && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/15 text-destructive border border-destructive/30"
                  title={selectedConversation.lastMessageFailureReason || "فشل إرسال رسالة إلى فيسبوك (Meta)"}
                >
                  <span>⚠️</span>
                  <span>فشل إرسال رسالة لميتا</span>
                </span>
              )}
            </div>

            {selectedConversation.pageName && (
              <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                {selectedConversation.pageName}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="business-inbox-chat-actions flex items-center gap-1.5 shrink-0">
          {isMobileViewport ? (
            <>
              {renderAiToggleButton()}

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className={`${iconBtnCls} ${
                  isProfilePanelActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : ''
                }`}
                title={profilePanelToggleTitle}
                aria-label={profilePanelToggleTitle}
                aria-pressed={isProfilePanelActive}
              >
                <UserCircle2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowMobileActionMenu((current) => !current)}
                className={`${iconBtnCls} ${
                  showMobileActionMenu
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : ''
                }`}
                title={t('facebookInbox.more')}
                aria-label={t('facebookInbox.more')}
                aria-expanded={showMobileActionMenu}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          ) : shouldCollapseActions ? (
            <>
              {renderAiToggleButton()}

              <ConversationActionsBar
                isPriority={selectedConversation.priority}
                onTogglePriority={onTogglePriority}
                onMarkDone={onMarkDone}
                disabled={updating}
              />

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className={`${iconBtnCls} ${
                  isProfilePanelActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : ''
                }`}
                title={profilePanelToggleTitle}
                aria-label={profilePanelToggleTitle}
                aria-pressed={isProfilePanelActive}
              >
                {isProfilePanelActive ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </button>

              <div className="h-5 w-px mx-0.5 bg-border/50" />

              <FacebookChatHeaderDesktopMenu
                showDesktopMoreMenu={showDesktopMoreMenu}
                setShowDesktopMoreMenu={setShowDesktopMoreMenu}
                isAiActive={isAiActive}
                onToggleAi={onToggleAi}
                primaryAction={resolvedPrimaryAction}
                availableActions={availableActions}
                onTriggerVerticalAction={onTriggerVerticalAction}
                onOpenQuickOrderModal={onOpenQuickOrderModal}
                conversationId={selectedConversation.id}
                onCopyConversationLink={onCopyConversationLink}
                copiedLink={copiedLink}
                showNotes={showNotes}
                onToggleNotesPanel={onToggleNotesPanel}
                onOpenSnoozeModal={onOpenSnoozeModal}
                onDeleteConversation={onDeleteConversation}
              />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                title={resolvedPrimaryAction.label}
                aria-label={resolvedPrimaryAction.label}
              >
                {renderVerticalActionIcon(resolvedPrimaryAction.id, 'h-3.5 w-3.5')}
                <span className="hidden xl:inline">{resolvedPrimaryAction.label}</span>
              </button>

              <button
                type="button"
                onClick={() => onCopyConversationLink(selectedConversation.id)}
                className={`${iconBtnCls} ${
                  copiedLink ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' : ''
                }`}
                title={String(
                  copiedLink ? t('sidebar.linkCopied') : t('sidebar.copyLink'),
                )}
                aria-label={String(
                  copiedLink ? t('sidebar.linkCopied') : t('sidebar.copyLink'),
                )}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className={`${iconBtnCls} ${
                  isProfilePanelActive
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : ''
                }`}
                title={profilePanelToggleTitle}
                aria-label={profilePanelToggleTitle}
                aria-pressed={isProfilePanelActive}
              >
                {isProfilePanelActive ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </button>

              {renderAiToggleButton()}

              <div className="h-5 w-px mx-0.5 bg-border/50" />

              <button
                type="button"
                onClick={onToggleNotesPanel}
                className={`${iconBtnCls} ${
                  showNotes
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : ''
                }`}
                title={String(t('inbox.notes'))}
                aria-label={String(t('inbox.notes'))}
              >
                <StickyNote className="h-4 w-4" />
              </button>

              {/* 🆕 Wave 2b-1: افتح الليد في CRM */}
              <button
                type="button"
                onClick={handleOpenCRMLead}
                className={iconBtnCls}
                title="افتح الليد في CRM"
                aria-label="افتح الليد في CRM"
                disabled={!selectedConversation.customerId}
              >
                <ExternalLink className="h-4 w-4" />
              </button>

              <ConversationActionsBar
                isPriority={selectedConversation.priority}
                onTogglePriority={onTogglePriority}
                onMarkDone={onMarkDone}
                onSnooze={onOpenSnoozeModal}
                onDelete={onDeleteConversation}
                disabled={updating}
              />

              {availableActions && availableActions.length > 1 && (
                <FacebookChatHeaderDesktopMenu
                  showDesktopMoreMenu={showDesktopMoreMenu}
                  setShowDesktopMoreMenu={setShowDesktopMoreMenu}
                  isAiActive={isAiActive}
                  onToggleAi={onToggleAi}
                  primaryAction={resolvedPrimaryAction}
                  availableActions={availableActions}
                  onTriggerVerticalAction={onTriggerVerticalAction}
                  onOpenQuickOrderModal={onOpenQuickOrderModal}
                  conversationId={selectedConversation.id}
                  onCopyConversationLink={onCopyConversationLink}
                  copiedLink={copiedLink}
                  showNotes={showNotes}
                  onToggleNotesPanel={onToggleNotesPanel}
                  onOpenSnoozeModal={onOpenSnoozeModal}
                  onDeleteConversation={onDeleteConversation}
                />
              )}
            </>
          )}
        </div>
      </div>

      <FacebookChatHeaderMobileMenu
        showMobileActionMenu={showMobileActionMenu}
        setShowMobileActionMenu={setShowMobileActionMenu}
        isAiActive={isAiActive}
        onToggleAi={onToggleAi}
        primaryAction={resolvedPrimaryAction}
        availableActions={availableActions}
        onTriggerVerticalAction={onTriggerVerticalAction}
        onOpenQuickOrderModal={onOpenQuickOrderModal}
        onOpenCRM={handleOpenCRMLead}
        conversationId={selectedConversation.id}
        onCopyConversationLink={onCopyConversationLink}
        copiedLink={copiedLink}
        showNotes={showNotes}
        onToggleNotesPanel={onToggleNotesPanel}
        onMarkDone={onMarkDone}
        isPriority={selectedConversation.priority}
        onTogglePriority={onTogglePriority}
        onOpenSnoozeModal={onOpenSnoozeModal}
        onDeleteConversation={onDeleteConversation}
      />
    </div>
  );
};

export default FacebookChatHeader;
