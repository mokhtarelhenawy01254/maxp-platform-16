import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  CalendarPlus,
  Check,
  Clock,
  Copy,
  ListTodo,
  MoreHorizontal,
  ShoppingBag,
  Stethoscope,
  StickyNote,
  Trash2,
  Wrench,
} from 'lucide-react';
import type {
  InboxVerticalAction,
  InboxVerticalActionId,
} from '../hooks/useInboxVerticalCapabilities';

export const renderVerticalActionIcon = (
  id: InboxVerticalActionId,
  className = 'h-4 w-4',
) => {
  switch (id) {
    case 'dental_case':
      return <Stethoscope className={className} />;
    case 'appointment':
      return <CalendarPlus className={className} />;
    case 'service_order':
      return <Wrench className={className} />;
    case 'task':
      return <ListTodo className={className} />;
    case 'order':
    default:
      return <ShoppingBag className={className} />;
  }
};

interface FacebookChatHeaderDesktopMenuProps {
  showDesktopMoreMenu: boolean;
  setShowDesktopMoreMenu: React.Dispatch<React.SetStateAction<boolean>>;
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
  onOpenSnoozeModal: () => void;
  onDeleteConversation: () => void;
}

export const FacebookChatHeaderDesktopMenu: React.FC<FacebookChatHeaderDesktopMenuProps> = ({
  showDesktopMoreMenu,
  setShowDesktopMoreMenu,
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
  onOpenSnoozeModal,
  onDeleteConversation,
}) => {
  const { t } = useTranslation();

  const actionsList: InboxVerticalAction[] =
    availableActions && availableActions.length > 0
      ? availableActions
      : [primaryAction || { id: 'order', label: t('facebookInbox.createQuickOrder') }];

  const handleActionClick = (actionId: InboxVerticalActionId) => {
    setShowDesktopMoreMenu(false);
    if (onTriggerVerticalAction) {
      onTriggerVerticalAction(actionId);
    } else if (actionId === 'order' && onOpenQuickOrderModal) {
      onOpenQuickOrderModal();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDesktopMoreMenu((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        data-tone={showDesktopMoreMenu ? 'primary' : undefined}
        title={t('facebookInbox.moreActions')}
        aria-label={t('facebookInbox.moreActions')}
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
          <div className="absolute left-0 top-full z-30 mt-2 p-1.5 w-56 rounded-xl border border-border/60 bg-popover text-popover-foreground flex flex-col gap-0.5 shadow-xl">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors text-start cursor-pointer"
              onClick={() => {
                setShowDesktopMoreMenu(false);
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
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors text-start cursor-pointer"
                onClick={() => handleActionClick(action.id)}
              >
                {renderVerticalActionIcon(action.id, 'h-4 w-4 text-primary')}
                <span>{action.label}</span>
              </button>
            ))}

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors text-start cursor-pointer"
              onClick={() => {
                onCopyConversationLink(conversationId);
                setShowDesktopMoreMenu(false);
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
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors text-start cursor-pointer"
              onClick={() => {
                setShowDesktopMoreMenu(false);
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
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors text-start cursor-pointer"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onOpenSnoozeModal();
              }}
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{t('facebookInbox.snooze')}</span>
            </button>

            <div className="h-px my-1 bg-border/50" />

            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-start cursor-pointer"
              onClick={() => {
                setShowDesktopMoreMenu(false);
                onDeleteConversation();
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>{t('facebookInbox.deleteConversation')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FacebookChatHeaderDesktopMenu;
