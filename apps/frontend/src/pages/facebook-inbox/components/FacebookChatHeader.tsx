import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  StickyNote,
} from 'lucide-react';
import {
  ShoppingCartIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import ConversationActionsBar from '@/components/facebook-inbox/ConversationActionsBar/ConversationActionsBar';
import type { InboxConversation } from '@/types/inbox.types';
import FacebookChatHeaderDesktopMenu from './FacebookChatHeaderDesktopMenu';
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
  onOpenQuickOrderModal: () => void;
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

  return (
    <div className="business-inbox-header business-inbox-chat-header p-2 sm:p-3">
      <div className="business-inbox-header-row business-inbox-chat-header-row">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onBackToConversationList}
          className="md:hidden business-chip-button dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20 p-2 rounded-lg transition-colors"
          title={t('facebookInbox.backToConversations')}
          aria-label={t('facebookInbox.backToConversations')}
        >
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Customer Identity */}
        <div className="business-inbox-chat-identity flex min-w-0 items-center gap-3">
          {selectedConversationAvatarUrl ? (
            <img
              src={selectedConversationAvatarUrl}
              alt={selectedConversation.customerName}
              className="business-conversation-avatar !w-10 !h-10"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling;
                if (fallback) (fallback as HTMLElement).style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="business-conversation-fallback !w-10 !h-10"
            style={{ display: selectedConversationAvatarUrl ? 'none' : 'flex' }}
          >
            {selectedConversation.customerName?.charAt(0)?.toUpperCase() || '؟'}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-base sm:text-lg font-semibold leading-tight"
              style={{ color: 'var(--color-foreground)' }}
            >
              {selectedConversation.customerName}
            </h2>
            {selectedConversation.pageName && (
              <p
                className="truncate text-xs mt-0.5"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {selectedConversation.pageName}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="business-inbox-chat-actions">
          {isMobileViewport ? (
            <>
              <button
                type="button"
                onClick={onToggleAi}
                className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                data-tone={isAiActive ? 'primary' : 'warning'}
                style={
                  isAiActive
                    ? {
                        background:
                          'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                        color: 'var(--color-primary)',
                        borderColor:
                          'color-mix(in srgb, var(--color-primary) 28%, transparent)',
                      }
                    : {
                        background:
                          'color-mix(in srgb, var(--business-warning) 14%, transparent)',
                        color: 'var(--business-warning)',
                        borderColor:
                          'color-mix(in srgb, var(--business-warning) 32%, transparent)',
                      }
                }
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
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isAiActive ? 'bg-emerald-500' : 'bg-amber-500'
                    } border border-white dark:border-slate-900`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className="business-icon-button rounded-xl transition-colors"
                data-tone={isProfilePanelActive ? 'primary' : undefined}
                title={profilePanelToggleTitle}
                aria-label={profilePanelToggleTitle}
                aria-pressed={isProfilePanelActive}
              >
                <UserCircleIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowMobileActionMenu((current) => !current)}
                className="business-icon-button rounded-xl transition-colors"
                data-tone={showMobileActionMenu ? 'primary' : undefined}
                title={t('facebookInbox.more')}
                aria-expanded={showMobileActionMenu}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          ) : shouldCollapseActions ? (
            <>
              <button
                type="button"
                onClick={onToggleAi}
                className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                data-tone={isAiActive ? 'primary' : 'warning'}
                style={
                  isAiActive
                    ? {
                        background:
                          'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                        color: 'var(--color-primary)',
                        borderColor:
                          'color-mix(in srgb, var(--color-primary) 28%, transparent)',
                      }
                    : {
                        background:
                          'color-mix(in srgb, var(--business-warning) 14%, transparent)',
                        color: 'var(--business-warning)',
                        borderColor:
                          'color-mix(in srgb, var(--business-warning) 32%, transparent)',
                      }
                }
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
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isAiActive ? 'bg-emerald-500' : 'bg-amber-500'
                    } border border-white dark:border-slate-900`}
                  />
                </span>
              </button>

              <ConversationActionsBar
                isPriority={selectedConversation.priority}
                onTogglePriority={onTogglePriority}
                onMarkDone={onMarkDone}
                disabled={updating}
              />

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className="business-icon-button rounded-xl transition-colors"
                data-tone={isProfilePanelActive ? 'primary' : undefined}
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

              <div
                className="business-inbox-chat-separator h-6 w-px mx-1"
                style={{ background: 'var(--business-muted-line)' }}
              />

              <FacebookChatHeaderDesktopMenu
                showDesktopMoreMenu={showDesktopMoreMenu}
                setShowDesktopMoreMenu={setShowDesktopMoreMenu}
                isAiActive={isAiActive}
                onToggleAi={onToggleAi}
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
                onClick={() => onCopyConversationLink(selectedConversation.id)}
                className="business-icon-button rounded-xl transition-colors"
                data-tone={copiedLink ? 'success' : 'primary'}
                style={
                  copiedLink
                    ? { color: 'var(--business-success)' }
                    : { color: 'var(--color-primary)' }
                }
                title={String(
                  copiedLink ? t('sidebar.linkCopied') : t('sidebar.copyLink'),
                )}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onOpenQuickOrderModal}
                className="business-icon-button rounded-xl transition-colors"
                data-tone="warning"
                title={t('facebookInbox.createQuickOrder')}
              >
                <ShoppingCartIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={onOpenProfilePanel}
                className="business-icon-button rounded-xl transition-colors"
                data-tone={isProfilePanelActive ? 'primary' : undefined}
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

              <button
                type="button"
                onClick={onToggleAi}
                className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                data-tone={isAiActive ? 'primary' : 'warning'}
                style={
                  isAiActive
                    ? {
                        background:
                          'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                        color: 'var(--color-primary)',
                        borderColor:
                          'color-mix(in srgb, var(--color-primary) 28%, transparent)',
                      }
                    : {
                        background:
                          'color-mix(in srgb, var(--business-warning) 14%, transparent)',
                        color: 'var(--business-warning)',
                        borderColor:
                          'color-mix(in srgb, var(--business-warning) 32%, transparent)',
                      }
                }
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
                <Bot className="h-5 w-5" />
                <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isAiActive ? 'bg-emerald-500' : 'bg-amber-500'
                    } border border-white dark:border-slate-900`}
                  />
                </span>
              </button>

              <div
                className="business-inbox-chat-separator h-6 w-px mx-1"
                style={{ background: 'var(--business-muted-line)' }}
              />

              <button
                type="button"
                onClick={onToggleNotesPanel}
                className="business-chip-button p-2 rounded-full transition-colors"
                style={
                  showNotes
                    ? {
                        color: 'var(--business-warning)',
                        background:
                          'color-mix(in srgb, var(--business-warning) 10%, white)',
                      }
                    : undefined
                }
                title={String(t('inbox.notes'))}
              >
                <StickyNote className="h-5 w-5" />
              </button>

              <ConversationActionsBar
                isPriority={selectedConversation.priority}
                onTogglePriority={onTogglePriority}
                onMarkDone={onMarkDone}
                onSnooze={onOpenSnoozeModal}
                onDelete={onDeleteConversation}
                disabled={updating}
              />
            </>
          )}
        </div>
      </div>

      <FacebookChatHeaderMobileMenu
        showMobileActionMenu={showMobileActionMenu}
        setShowMobileActionMenu={setShowMobileActionMenu}
        isAiActive={isAiActive}
        onToggleAi={onToggleAi}
        onOpenQuickOrderModal={onOpenQuickOrderModal}
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
