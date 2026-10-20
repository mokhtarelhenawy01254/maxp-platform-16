import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCartIcon,
  UserCircleIcon,
  EllipsisVerticalIcon,
  CheckIcon,
  TrashIcon,
  LinkIcon,
  BellSnoozeIcon,
  XMarkIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import type { UnifiedConversation } from '../types/unifiedInboxTypes';

interface UnifiedChatHeaderProps {
  selectedConversation: UnifiedConversation;
  onBackToList: () => void;
  onToggleAi: () => void;
  onOpenQuickOrder: () => void;
  showProfilePanel: boolean;
  onToggleProfilePanel: () => void;
  onMarkResolved: () => void;
  onTogglePriority: () => void;
  onCopyLink: () => void;
  onSnooze: (date: Date) => void;
  onDeleteConversation: () => void;
}

export const UnifiedChatHeader: React.FC<UnifiedChatHeaderProps> = ({
  selectedConversation,
  onBackToList,
  onToggleAi,
  onOpenQuickOrder,
  showProfilePanel,
  onToggleProfilePanel,
  onMarkResolved,
  onTogglePriority,
  onCopyLink,
  onSnooze,
  onDeleteConversation,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(e.target as Node)
      ) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  return (
    <>
      <div className="business-inbox-header">
        <div className="business-inbox-header-row">
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Mobile back button */}
            <button
              type="button"
              onClick={onBackToList}
              className="lg:hidden business-chip-button shrink-0"
              aria-label={t('unifiedInbox.backToList', 'رجوع')}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="relative">
              {selectedConversation.contactAvatar ? (
                <img
                  src={selectedConversation.contactAvatar}
                  alt=""
                  className="business-conversation-avatar !w-10 !h-10"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="business-conversation-fallback !w-10 !h-10">
                  {selectedConversation.contactName?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3
                  className="font-semibold text-sm"
                  style={{ color: 'var(--color-foreground)' }}
                  translate="no"
                >
                  {selectedConversation.contactName}
                </h3>
                {selectedConversation.lastOrderNumber && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none font-mono tabular-nums"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-primary) 12%, var(--color-background))',
                      color: 'var(--color-primary)',
                      border:
                        '1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)',
                    }}
                    title={`${t('unifiedInbox.orders')}: #${selectedConversation.lastOrderNumber}`}
                  >
                    #{selectedConversation.lastOrderNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="business-platform-indicator"
                  data-platform={selectedConversation.platform}
                >
                  {getPlatformLabel(selectedConversation.platform)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {t(
                    `unifiedInbox.status.${selectedConversation.status.toLowerCase()}`,
                    {
                      defaultValue: selectedConversation.status,
                    },
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleAi}
              className="business-chip-button"
              style={{
                background:
                  selectedConversation.aiEnabled !== false
                    ? 'color-mix(in srgb, var(--color-primary) 12%, var(--color-background))'
                    : 'none',
                color:
                  selectedConversation.aiEnabled !== false
                    ? 'var(--color-primary)'
                    : 'var(--color-muted-foreground)',
              }}
              title={
                selectedConversation.aiEnabled !== false
                  ? t(
                      'unifiedInbox.aiToggleOn',
                      'الرد الذكي مفعّل (اضغط للإيقاف)',
                    )
                  : t(
                      'unifiedInbox.aiToggleOff',
                      'الرد الذكي متوقف (تدخل بشري - اضغط لإعادة التفعيل)',
                    )
              }
              aria-label="AI Assistant Toggle"
            >
              <CpuChipIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenQuickOrder}
              className="business-chip-button"
              aria-label={t('unifiedInbox.quickOrder', 'طلب سريع')}
            >
              <ShoppingCartIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onToggleProfilePanel}
              className="business-chip-button"
              data-active={showProfilePanel ? 'true' : 'false'}
              aria-label={t('unifiedInbox.profile', 'الملف الشخصي')}
            >
              <UserCircleIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                className="business-chip-button"
                onClick={() => setShowActionsMenu((prev) => !prev)}
                aria-label={t('unifiedInbox.options', 'خيارات')}
              >
                <EllipsisVerticalIcon className="w-5 h-5" aria-hidden="true" />
              </button>
              {showActionsMenu && (
                <div
                  className="inbox-platform-dropdown"
                  style={{
                    top: 'calc(100% + 6px)',
                    [isRtl ? 'left' : 'right']: 0,
                    left: isRtl ? 0 : 'auto',
                    right: isRtl ? 'auto' : 0,
                    minWidth: 180,
                    zIndex: 200,
                  }}
                >
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onMarkResolved();
                    }}
                  >
                    <CheckIcon
                      className="w-4 h-4"
                      style={{ color: 'var(--business-success)' }}
                      aria-hidden="true"
                    />
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.markAsResolved', 'تحديد كمكتمل')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onTogglePriority();
                    }}
                  >
                    <StarSolidIcon
                      className="w-4 h-4"
                      style={{
                        color: selectedConversation.isPinned
                          ? 'var(--business-warning)'
                          : 'var(--color-muted-foreground)',
                      }}
                    />
                    <span className="inbox-platform-text">
                      {selectedConversation.isPinned
                        ? t('unifiedInbox.unstar', 'إلغاء التمييز')
                        : t('unifiedInbox.star', 'تمييز')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onCopyLink();
                    }}
                  >
                    <LinkIcon
                      className="w-4 h-4"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    />
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.copyLink', 'نسخ الرابط')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      setShowSnoozePicker(true);
                    }}
                  >
                    <BellSnoozeIcon
                      className="w-4 h-4"
                      style={{ color: 'var(--color-muted-foreground)' }}
                    />
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.snooze', 'تأجيل')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onToggleProfilePanel();
                    }}
                  >
                    <UserCircleIcon
                      className="w-4 h-4"
                      style={{ color: 'var(--color-muted-foreground)' }}
                      aria-hidden="true"
                    />
                    <span className="inbox-platform-text">
                      {showProfilePanel
                        ? t('unifiedInbox.hideProfile', 'إخفاء الملف')
                        : t('unifiedInbox.showProfile', 'عرض الملف')}
                    </span>
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: 'var(--business-card-border)',
                      margin: '4px 8px',
                    }}
                  />
                  <button
                    type="button"
                    className="inbox-dropdown-item w-full"
                    onClick={() => {
                      setShowActionsMenu(false);
                      onDeleteConversation();
                    }}
                    style={{ color: 'var(--business-danger, #ef4444)' }}
                  >
                    <TrashIcon className="w-4 h-4" aria-hidden="true" />
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.deleteConversation', 'حذف المحادثة')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snooze Picker Modal */}
      {showSnoozePicker && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-xl p-4"
          style={{
            background: 'var(--business-surface-panel)',
            border: '1px solid var(--business-card-border)',
            minWidth: 200,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('unifiedInbox.snooze', 'تأجيل')}
            </span>
            <button
              type="button"
              onClick={() => setShowSnoozePicker(false)}
              className="business-chip-button"
              aria-label={t('unifiedInbox.close', 'إغلاق')}
            >
              <XMarkIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {[
              {
                label: t('unifiedInbox.snooze1h', 'ساعة واحدة'),
                ms: 60 * 60 * 1000,
              },
              {
                label: t('unifiedInbox.snooze3h', '3 ساعات'),
                ms: 3 * 60 * 60 * 1000,
              },
              {
                label: t('unifiedInbox.snoozeTomorrow', 'حتى الغد'),
                ms: 24 * 60 * 60 * 1000,
              },
              {
                label: t('unifiedInbox.snoozeWeek', 'أسبوع'),
                ms: 7 * 24 * 60 * 60 * 1000,
              },
            ].map((opt) => (
              <button
                type="button"
                key={opt.label}
                className="inbox-dropdown-item w-full"
                onClick={() => {
                  setShowSnoozePicker(false);
                  onSnooze(new Date(Date.now() + opt.ms));
                }}
              >
                <BellSnoozeIcon
                  className="w-4 h-4"
                  style={{ color: 'var(--color-muted-foreground)' }}
                />
                <span className="inbox-platform-text">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
