import React from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, MessageSquare } from 'lucide-react';

interface FacebookEmptyChatPlaceholderProps {
  onShowSidebar: () => void;
}

export const FacebookEmptyChatPlaceholder: React.FC<FacebookEmptyChatPlaceholderProps> = ({
  onShowSidebar,
}) => {
  const { t } = useTranslation();

  return (
    <div className="business-chat-stage flex items-center justify-center h-full bg-background/60">
      <div className="text-center px-4">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onShowSidebar}
          className="md:hidden mb-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-md mx-auto flex items-center justify-center transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={t('facebookInbox.showConversations')}
          aria-label={t('facebookInbox.showConversations')}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 stroke-[1.5]" />
          </div>
        </div>

        <h3 className="text-lg font-medium mb-2 text-foreground">
          {t('facebookInbox.selectConversation')}
        </h3>
        <p className="text-sm max-w-xs mx-auto text-muted-foreground">
          {t('facebookInbox.selectConversationHint')}
        </p>
      </div>
    </div>
  );
};

export default FacebookEmptyChatPlaceholder;
