import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Check, Copy, MoreHorizontal, StickyNote } from 'lucide-react';
import {
  ClockIcon,
  ShoppingCartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface FacebookChatHeaderDesktopMenuProps {
  showDesktopMoreMenu: boolean;
  setShowDesktopMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
  isAiActive: boolean;
  onToggleAi: () => void;
  onOpenQuickOrderModal: () => void;
  conversationId: string;
  onCopyConversationLink: (id: string) => void;
  copiedLink: boolean;
  showNotes: boolean;
  onToggleNotesPanel: () => void;
  onOpenSnoozeModal: () => void;
  onDeleteConversation: () => void;
}

export const FacebookChatHeaderDesktopMenu: React.FC<FacebookChatHeaderDesktopMenuProps> = ({
  showDesktopMoreMenu,
  setShowDesktopMoreMenu,
  isAiActive,
  onToggleAi,
  onOpenQuickOrderModal,
  conversationId,
  onCopyConversationLink,
  copiedLink,
  showNotes,
  onToggleNotesPanel,
  onOpenSnoozeModal,
  onDeleteConversation,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDesktopMoreMenu((current) => !current)}
        className="business-icon-button rounded-xl transition-colors"
        data-tone={showDesktopMoreMenu ? 'primary' : undefined}
        title={t('facebookInbox.moreActions')}
        aria-expanded={showDesktopMoreMenu}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {showDesktopMoreMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowDesktopMoreMenu(false)}
            aria-label={t('facebookInbox.closeMenu')}
          />
          <div className="business-dropdown-surface absolute left-0 top-full z-30 mt-2 p-2 w-56 flex flex-col gap-1 shadow-xl">
            <button
              type="button"
              className="business-dropdown-option"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onToggleAi();
              }}
            >
              <Bot
                className={`h-5 w-5 ${
                  isAiActive ? 'text-amber-500' : 'text-emerald-500'
                }`}
              />
              <span>
                {isAiActive
                  ? t('facebookInbox.stopAi', 'إيقاف الذكاء الاصطناعي')
                  : t('facebookInbox.startAi', 'تشغيل الذكاء الاصطناعي')}
              </span>
            </button>

            <button
              type="button"
              className="business-dropdown-option"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onOpenQuickOrderModal();
              }}
            >
              <ShoppingCartIcon className="h-5 w-5" />
              <span>{t('facebookInbox.createQuickOrder')}</span>
            </button>

            <button
              type="button"
              className="business-dropdown-option"
              onClick={() => {
                onCopyConversationLink(conversationId);
                setShowDesktopMoreMenu(false);
              }}
            >
              {copiedLink ? (
                <Check className="h-5 w-5 text-emerald-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
              <span>
                {copiedLink
                  ? String(t('sidebar.linkCopied'))
                  : String(t('sidebar.copyLink'))}
              </span>
            </button>

            <button
              type="button"
              className="business-dropdown-option"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onToggleNotesPanel();
              }}
            >
              <StickyNote className="h-5 w-5" />
              <span>
                {showNotes
                  ? t('facebookInbox.hideNotes')
                  : t('facebookInbox.showNotes')}
              </span>
            </button>

            <button
              type="button"
              className="business-dropdown-option"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onOpenSnoozeModal();
              }}
            >
              <ClockIcon className="h-5 w-5" />
              <span>{t('facebookInbox.snooze')}</span>
            </button>

            <div
              className="h-px my-1"
              style={{ background: 'var(--business-muted-line)' }}
            />

            <button
              type="button"
              className="business-dropdown-option"
              style={{ color: 'var(--business-danger)' }}
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onDeleteConversation();
              }}
            >
              <TrashIcon className="h-5 w-5" />
              <span>{t('facebookInbox.deleteConversation')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FacebookChatHeaderDesktopMenu;
