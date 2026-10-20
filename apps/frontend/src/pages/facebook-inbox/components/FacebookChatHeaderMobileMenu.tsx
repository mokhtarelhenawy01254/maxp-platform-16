import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Check, Copy, StickyNote } from 'lucide-react';
import {
  CheckCircleIcon,
  ClockIcon,
  ShoppingCartIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface FacebookChatHeaderMobileMenuProps {
  showMobileActionMenu: boolean;
  setShowMobileActionMenu: React.Dispatch<React.SetStateAction<boolean>>;
  isAiActive: boolean;
  onToggleAi: () => void;
  onOpenQuickOrderModal: () => void;
  conversationId: string;
  onCopyConversationLink: (id: string) => void;
  copiedLink: boolean;
  showNotes: boolean;
  onToggleNotesPanel: () => void;
  onMarkDone: () => void;
  isPriority: boolean;
  onTogglePriority: () => void;
  onOpenSnoozeModal: () => void;
  onDeleteConversation: () => void;
}

export const FacebookChatHeaderMobileMenu: React.FC<FacebookChatHeaderMobileMenuProps> = ({
  showMobileActionMenu,
  setShowMobileActionMenu,
  isAiActive,
  onToggleAi,
  onOpenQuickOrderModal,
  conversationId,
  onCopyConversationLink,
  copiedLink,
  showNotes,
  onToggleNotesPanel,
  onMarkDone,
  isPriority,
  onTogglePriority,
  onOpenSnoozeModal,
  onDeleteConversation,
}) => {
  const { t } = useTranslation();

  if (!showMobileActionMenu) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/10 md:hidden"
        onClick={() => setShowMobileActionMenu(false)}
        aria-label={t('facebookInbox.closeMenu')}
      />
      <div className="business-inbox-mobile-action-menu business-dropdown-surface absolute inset-x-3 top-full z-30 mt-2 p-2 md:hidden shadow-2xl">
        <button
          type="button"
          className="business-dropdown-option"
          onClick={() => {
            setShowMobileActionMenu(false);
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
            setShowMobileActionMenu(false);
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
            setShowMobileActionMenu(false);
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
          onClick={onToggleNotesPanel}
        >
          <StickyNote className="h-4 w-4" />
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
            setShowMobileActionMenu(false);
            onMarkDone();
          }}
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span>{t('facebookInbox.markAsDone')}</span>
        </button>

        <button
          type="button"
          className="business-dropdown-option"
          onClick={() => {
            setShowMobileActionMenu(false);
            onTogglePriority();
          }}
        >
          <StarIcon className="h-5 w-5" />
          <span>
            {isPriority
              ? t('facebookInbox.clearPriority')
              : t('facebookInbox.setPriority')}
          </span>
        </button>

        <button
          type="button"
          className="business-dropdown-option"
          onClick={() => {
            setShowMobileActionMenu(false);
            onOpenSnoozeModal();
          }}
        >
          <ClockIcon className="h-5 w-5" />
          <span>{t('facebookInbox.snooze')}</span>
        </button>

        <button
          type="button"
          className="business-dropdown-option"
          style={{ color: 'var(--business-danger)' }}
          onClick={() => {
            setShowMobileActionMenu(false);
            onDeleteConversation();
          }}
        >
          <TrashIcon className="h-5 w-5" />
          <span>{t('facebookInbox.deleteConversation')}</span>
        </button>
      </div>
    </>
  );
};

export default FacebookChatHeaderMobileMenu;
