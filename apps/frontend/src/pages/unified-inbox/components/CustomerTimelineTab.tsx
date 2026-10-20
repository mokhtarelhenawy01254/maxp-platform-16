import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomerProfile } from '../types/unifiedInboxTypes';
import { formatUnifiedTime } from '../utils/unifiedInboxUtils';

interface CustomerTimelineTabProps {
  customerProfile: CustomerProfile | null;
}

export const CustomerTimelineTab: React.FC<CustomerTimelineTabProps> = ({
  customerProfile,
}) => {
  const { t, i18n } = useTranslation();

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return 'Messenger';
      case 'instagram':
        return 'Instagram';
      case 'whatsapp':
        return t('unifiedInbox.tabs.whatsapp', 'WhatsApp');
      case 'telegram':
        return 'Telegram';
      default:
        return platform;
    }
  };

  if (
    !customerProfile?.recentConversations ||
    customerProfile.recentConversations.length === 0
  ) {
    return null;
  }

  return (
    <div className="space-y-4 pt-4">
      <div
        className="p-4 border rounded-[20px] bg-transparent"
        style={{
          borderColor:
            'var(--business-muted-line, var(--business-card-border))',
        }}
      >
        <h4
          className="mb-3 text-sm font-bold text-end"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {t('unifiedInbox.customer.history', 'سجل المحادثات')}
        </h4>
        <div className="space-y-2">
          {customerProfile.recentConversations.map((c) => (
            <div
              key={c.id}
              className="business-profile-item-card rounded-lg p-2.5"
              style={{
                background:
                  'color-mix(in srgb, var(--color-foreground) 5%, var(--color-background))',
                border: '1px solid var(--business-card-border)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="business-platform-indicator"
                  data-platform={c.platform}
                >
                  {getPlatformLabel(c.platform)}
                </span>
                <span
                  className="text-[10px] tabular-nums font-mono"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {formatUnifiedTime(c.lastMessageAt, i18n.language)}
                </span>
              </div>
              <p
                className="text-xs truncate"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {c.lastMessagePreview}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
