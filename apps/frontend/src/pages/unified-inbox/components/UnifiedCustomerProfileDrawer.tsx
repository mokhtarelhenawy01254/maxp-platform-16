import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  EnvelopeIcon,
  ArchiveBoxIcon,
  NoSymbolIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { Activity, ShoppingBag, User } from 'lucide-react';
import type {
  UnifiedConversation,
  CustomerProfile,
} from '../types/unifiedInboxTypes';
import StatusDropdown from '@/components/facebook-inbox/StatusDropdown/StatusDropdown';
import AssignmentDropdown from '@/components/facebook-inbox/AssignmentDropdown/AssignmentDropdown';
import type { ConversationStatus } from '@/types/inbox.types';
import { CustomerInfoTab } from './CustomerInfoTab';
import { CustomerOrdersTab } from './CustomerOrdersTab';
import { CustomerTimelineTab } from './CustomerTimelineTab';

interface UnifiedCustomerProfileDrawerProps {
  selectedConversation: UnifiedConversation | null;
  showProfilePanel: boolean;
  onClose: () => void;
  customerProfile: CustomerProfile | null;
  loadingProfile: boolean;
  profileActiveTab: 'timeline' | 'orders' | 'info';
  setProfileActiveTab: (tab: 'timeline' | 'orders' | 'info') => void;
  onStatusChange: (status: ConversationStatus) => void;
  onAssign: (userId: string | null) => void;
  onMarkUnread: () => void;
  onArchiveConversation: () => void;
  onBlockCustomer: () => void;
  editNote: boolean;
  setEditNote: (val: boolean) => void;
  noteText: string;
  setNoteText: (val: string) => void;
  onSaveNote: () => void;
}

export const UnifiedCustomerProfileDrawer: React.FC<
  UnifiedCustomerProfileDrawerProps
> = ({
  selectedConversation,
  showProfilePanel,
  onClose,
  customerProfile,
  loadingProfile,
  profileActiveTab,
  setProfileActiveTab,
  onStatusChange,
  onAssign,
  onMarkUnread,
  onArchiveConversation,
  onBlockCustomer,
  editNote,
  setEditNote,
  noteText,
  setNoteText,
  onSaveNote,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  if (!showProfilePanel || !selectedConversation) return null;

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
    <div className="business-inbox-column business-inbox-column--profile overflow-y-auto">
      {/* Profile Header */}
      <div className="business-inbox-header text-center relative">
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-3 p-1 rounded business-chip-button ${
            isRtl ? 'left-3' : 'right-3'
          }`}
          aria-label={t('unifiedInbox.close', 'إغلاق')}
        >
          <XMarkIcon className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="relative inline-block mb-3">
          {selectedConversation.contactAvatar ? (
            <img
              src={selectedConversation.contactAvatar}
              className="w-20 h-20 rounded-full object-cover border-2"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--color-primary) 30%, var(--color-background))',
              }}
              alt=""
              width={80}
              height={80}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--color-primary) 30%, var(--color-background))',
                background: 'var(--color-primary)',
              }}
            >
              {selectedConversation.contactName?.charAt(0) || '?'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-1">
          <h3
            className="font-bold text-lg"
            style={{ color: 'var(--color-foreground)' }}
            translate="no"
          >
            {customerProfile?.name || selectedConversation.contactName}
          </h3>
          {selectedConversation.lastOrderNumber && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums font-mono"
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
        <span
          className="business-platform-indicator"
          data-platform={selectedConversation.platform}
        >
          {getPlatformLabel(selectedConversation.platform)}
        </span>
      </div>

      {/* Status & Assignment & Actions */}
      <div
        className="px-4 pb-4 border-b"
        style={{ borderColor: 'var(--business-muted-line)' }}
      >
        <div
          className="mt-2 grid gap-1.5"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}
        >
          <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1.5 [&>div>button]:text-xs [&>div>button_span]:truncate">
            <StatusDropdown
              currentStatus={selectedConversation.status as ConversationStatus}
              onStatusChange={onStatusChange}
              disabled={loadingProfile}
            />
          </div>
          <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1.5 [&>div>button]:text-xs [&>div>button_span]:truncate">
            <AssignmentDropdown
              currentAssignee={selectedConversation.assignedTo?.id || null}
              currentAssigneeName={
                selectedConversation.assignedTo?.name || undefined
              }
              onAssign={onAssign}
              disabled={loadingProfile}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onMarkUnread}
            className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
            style={{
              color: 'var(--color-primary)',
              background:
                'color-mix(in srgb, var(--color-primary) 10%, var(--color-background))',
              borderColor:
                'color-mix(in srgb, var(--color-primary) 20%, transparent)',
            }}
            title={t('unifiedInbox.markUnread', 'تحديد كغير مقروء')}
          >
            <EnvelopeIcon className="w-5 h-5 shrink-0" />
          </button>
          <button
            type="button"
            onClick={onArchiveConversation}
            className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
            style={{
              color: 'var(--business-warning)',
              background:
                'color-mix(in srgb, var(--business-warning) 10%, var(--color-background))',
              borderColor:
                'color-mix(in srgb, var(--business-warning) 20%, transparent)',
            }}
            title={t('unifiedInbox.archive', 'أرشفة')}
          >
            <ArchiveBoxIcon className="w-5 h-5 shrink-0" />
          </button>
          <button
            type="button"
            onClick={onBlockCustomer}
            className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
            style={{
              color: 'var(--business-danger)',
              background:
                'color-mix(in srgb, var(--business-danger) 10%, var(--color-background))',
              borderColor:
                'color-mix(in srgb, var(--business-danger) 20%, transparent)',
            }}
            title={t('unifiedInbox.block', 'حظر')}
          >
            <NoSymbolIcon className="w-5 h-5 shrink-0" />
          </button>
        </div>
      </div>

      {loadingProfile ? (
        <div className="business-inbox-empty py-10">
          <div
            className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
            style={{
              borderColor:
                'color-mix(in srgb, var(--color-primary) 24%, transparent)',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      ) : customerProfile ? (
        <>
          {/* Stats */}
          <div className="mt-4 px-4">
            <div
              className="grid grid-cols-2 overflow-hidden rounded-[20px] border bg-transparent text-center w-full"
              style={{
                borderColor:
                  'var(--business-muted-line, var(--business-card-border))',
              }}
            >
              <div className="flex-1 py-3 text-center">
                <p
                  className="mb-1 text-xs font-bold"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {t('unifiedInbox.customer.orders', { defaultValue: 'الطلبات' })}
                </p>
                <p
                  className="text-lg font-bold tabular-nums font-mono"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {customerProfile.totalOrders || 0}
                </p>
              </div>
              <div
                className="flex-1 py-3 text-center"
                style={{
                  borderInlineStart:
                    '1px solid var(--business-muted-line, var(--business-card-border))',
                }}
              >
                <p
                  className="mb-1 text-xs font-bold"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {t('unifiedInbox.customer.ltv', { defaultValue: 'القيمة' })}
                </p>
                <p
                  className="flex items-baseline justify-center gap-1 text-lg font-bold tabular-nums font-mono"
                  style={{ color: 'var(--business-success)' }}
                >
                  {customerProfile.ltv?.toLocaleString() || 0}{' '}
                  <span className="text-xs font-medium">
                    {t('unifiedInbox.egp', { defaultValue: 'ج.م' })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="business-inbox-tabs mx-4 mt-4">
            <button
              type="button"
              onClick={() => setProfileActiveTab('timeline')}
              className="business-inbox-tab"
              data-active={profileActiveTab === 'timeline'}
            >
              <span className="flex items-center justify-center gap-1">
                <Activity size={16} />{' '}
                {t('unifiedInbox.activity', { defaultValue: 'نشاط' })}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setProfileActiveTab('orders')}
              className="business-inbox-tab"
              data-active={profileActiveTab === 'orders'}
            >
              <span className="flex items-center justify-center gap-1">
                <ShoppingBag size={16} />{' '}
                {t('unifiedInbox.orders', { defaultValue: 'طلبات' })}
                {customerProfile.recentOrders?.length > 0 && (
                  <span className="business-inbox-tab-count tabular-nums font-mono">
                    {customerProfile.recentOrders.length}
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setProfileActiveTab('info')}
              className="business-inbox-tab"
              data-active={profileActiveTab === 'info'}
            >
              <span className="flex items-center justify-center gap-1">
                <User size={16} />{' '}
                {t('unifiedInbox.info', { defaultValue: 'معلومات' })}
              </span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {profileActiveTab === 'info' && (
              <CustomerInfoTab
                customerProfile={customerProfile}
                editNote={editNote}
                setEditNote={setEditNote}
                noteText={noteText}
                setNoteText={setNoteText}
                onSaveNote={onSaveNote}
              />
            )}

            {profileActiveTab === 'orders' && (
              <CustomerOrdersTab
                customerProfile={customerProfile}
                contactId={selectedConversation.contactId}
              />
            )}

            {profileActiveTab === 'timeline' && (
              <CustomerTimelineTab customerProfile={customerProfile} />
            )}
          </div>
        </>
      ) : (
        <div className="business-inbox-empty py-10">
          <UserCircleIcon
            className="w-12 h-12 mb-2"
            style={{
              color:
                'color-mix(in srgb, var(--color-primary) 18%, var(--color-muted-foreground))',
            }}
          />
          <p className="text-sm">
            {t('unifiedInbox.customer.noData', 'لا تتوفر بيانات لهذا العميل')}
          </p>
        </div>
      )}
    </div>
  );
};
