import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

export const UnifiedEmptyChatPlaceholder: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/30">
      <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-inner mb-4">
        <MessageSquare className="h-10 w-10 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {t('unifiedInbox.selectConversation', {
          defaultValue: 'اختر محادثة للبدء',
        })}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t('unifiedInbox.selectConversationHint', {
          defaultValue: 'اختر محادثة من القائمة الجانبية لعرض الرسائل والتفاصيل',
        })}
      </p>
    </div>
  );
};

export default UnifiedEmptyChatPlaceholder;
