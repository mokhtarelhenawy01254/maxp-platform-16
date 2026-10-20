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
    <div className="business-chat-stage flex items-center justify-center h-full">
      <div className="text-center px-4">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onShowSidebar}
          className="md:hidden mb-4 business-icon-button !w-14 !h-14 rounded-full shadow-lg mx-auto flex items-center justify-center"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            color: 'white',
            borderColor: 'transparent',
          }}
          title={t('facebookInbox.showConversations')}
          aria-label={t('facebookInbox.showConversations')}
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner">
            <MessageSquare className="h-10 w-10 stroke-[1.5]" />
          </div>
        </div>

        <h3
          className="text-lg font-medium mb-2"
          style={{ color: 'var(--color-foreground)' }}
        >
          {t('facebookInbox.selectConversation')}
        </h3>
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {t('facebookInbox.selectConversationHint')}
        </p>
      </div>
    </div>
  );
};

export default FacebookEmptyChatPlaceholder;
