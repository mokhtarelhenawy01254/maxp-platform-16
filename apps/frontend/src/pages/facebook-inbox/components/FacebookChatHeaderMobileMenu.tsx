import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Star,
  StickyNote,
  Trash2,
} from 'lucide-react';
import type {
  InboxVerticalAction,
  InboxVerticalActionId,
} from '../hooks/useInboxVerticalCapabilities';
import { renderVerticalActionIcon } from './FacebookChatHeaderDesktopMenu';

interface FacebookChatHeaderMobileMenuProps {
  showMobileActionMenu: boolean;
  setShowMobileActionMenu: React.Dispatch<React.SetStateAction<boolean>>;
  isAiActive: boolean;
  onToggleAi: () => void;
  primaryAction?: InboxVerticalAction;
  availableActions?: InboxVerticalAction[];
  onTriggerVerticalAction?: (actionId: InboxVerticalActionId) => void;
  onOpenQuickOrderModal?: () => void;
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
  primaryAction,
  availableActions,
  onTriggerVerticalAction,
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

  const actionsList: InboxVerticalAction[] =
    availableActions && availableActions.length > 0
      ? availableActions
      : [primaryAction || { id: 'order', label: t('facebookInbox.createQuickOrder') }];

  const handleActionClick = (actionId: InboxVerticalActionId) => {
    setShowMobileActionMenu(false);
    if (onTriggerVerticalAction) {
      onTriggerVerticalAction(actionId);
    } else if (actionId === 'order' && onOpenQuickOrderModal) {
      onOpenQuickOrderModal();
    }
  };

  const itemCls =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors text-start cursor-pointer';

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20 bg-black/15 md:hidden"
        onClick={() => setShowMobileActionMenu(false)}
        aria-label={t('facebookInbox.closeMenu')}
      />
      <div className="business-inbox-mobile-action-menu absolute inset-x-3 top-full z-30 mt-2 p-2 md:hidden rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-2xl flex flex-col gap-0.5">
        <button
          type="button"
          className={itemCls}
          onClick={() => {
            setShowMobileActionMenu(false);
            onToggleAi();
          }}
        >
          <Bot
            className={`h-4 w-4 ${
              isAiActive ? 'text-amber-500' : 'text-emerald-500'
            }`}
          />
          <span>
            {isAiActive
              ? t('facebookInbox.stopAi', 'إيقاف الذكاء الاصطناعي')
              : t('facebookInbox.startAi', 'تشغيل الذكاء الاصطناعي')}
          </span>
        </button>

        {actionsList.map((action) => (
          <button
            key={action.id}
            type="button"
            className={itemCls}
            onClick={() => handleActionClick(action.id)}
          >
            {renderVerticalActionIcon(action.id, 'h-4 w-4 text-primary')}
            <span>{action.label}</span>
          </button>
        ))}

        <button
          type="button"
          className={itemCls}
          onClick={() => {
            onCopyConversationLink(conversationId);
            setShowMobileActionMenu(false);
          }}
        >
          {copiedLink ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            {copiedLink
              ? String(t('sidebar.linkCopied'))
              : String(t('sidebar.copyLink'))}
          </span>
        </button>

        <button
          type="button"
          className={itemCls}
          onClick={() => {
            setShowMobileActionMenu(false);
            onToggleNotesPanel();
          }}
        >
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <span>
            {showNotes
              ? t('facebookInbox.hideNotes')
              : t('facebookInbox.showNotes')}
          </span>
        </button>

        <button
          type="button"
          className={itemCls}
          onClick={() => {
            setShowMobileActionMenu(false);
            onMarkDone();
          }}
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>{t('facebookInbox.markAsDone')}</span>
        </button>

        <button
          type="button"
          className={itemCls}
          onClick={() => {
            setShowMobileActionMenu(false);
            onTogglePriority();
          }}
        >
          <Star
            className={`h-4 w-4 ${
              isPriority ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'
            }`}
          />
          <span>
            {isPriority
              ? t('facebookInbox.clearPriority')
              : t('facebookInbox.setPriority')}
          </span>
        </button>

        <button
          type="button"
          className={itemCls}
          onClick={() => {
            setShowMobileActionMenu(false);
            onOpenSnoozeModal();
          }}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{t('facebookInbox.snooze')}</span>
        </button>

        <div className="h-px my-1 bg-border/50" />

        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-start cursor-pointer"
          onClick={() => {
            setShowMobileActionMenu(false);
            onDeleteConversation();
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span>{t('facebookInbox.deleteConversation')}</span>
        </button>
      </div>
    </>
  );
};

export default FacebookChatHeaderMobileMenu;
