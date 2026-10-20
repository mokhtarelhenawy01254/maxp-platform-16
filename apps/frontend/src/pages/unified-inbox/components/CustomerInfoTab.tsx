import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import type { CustomerProfile } from '../types/unifiedInboxTypes';

interface CustomerInfoTabProps {
  customerProfile: CustomerProfile | null;
  editNote: boolean;
  setEditNote: (val: boolean) => void;
  noteText: string;
  setNoteText: (val: string) => void;
  onSaveNote: () => void;
}

export const CustomerInfoTab: React.FC<CustomerInfoTabProps> = ({
  customerProfile,
  editNote,
  setEditNote,
  noteText,
  setNoteText,
  onSaveNote,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="space-y-4 pt-4">
      {/* Contact Info */}
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
          {t('unifiedInbox.customer.contactInfo', 'بيانات التواصل')}
        </h4>
        <div className="space-y-3">
          {customerProfile?.phone && (
            <div className="flex items-center justify-end gap-2 text-sm">
              <span
                className="font-medium tabular-nums font-mono"
                style={{ color: 'var(--color-foreground)' }}
                dir="ltr"
              >
                {customerProfile.phone}
              </span>
              <PhoneIcon
                className="w-4 h-4"
                style={{ color: 'var(--color-muted-foreground)' }}
              />
            </div>
          )}
          {customerProfile?.email &&
            !customerProfile.email.endsWith('@example.com') && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <span
                  className="truncate font-medium"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {customerProfile.email}
                </span>
                <EnvelopeIcon
                  className="w-4 h-4"
                  style={{ color: 'var(--color-muted-foreground)' }}
                />
              </div>
            )}
          <div className="flex items-center justify-end gap-2 text-sm">
            <span
              className="font-medium"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('unifiedInbox.customer.customerSince', {
                date: new Date(
                  customerProfile?.createdAt || new Date(),
                ).toLocaleDateString(
                  i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                  {
                    year: 'numeric',
                    month: 'long',
                  },
                ),
                defaultValue: `عميل منذ ${new Date(
                  customerProfile?.createdAt || new Date(),
                ).toLocaleDateString()}`,
              })}
            </span>
            <ClockIcon
              className="w-4 h-4"
              style={{ color: 'var(--color-muted-foreground)' }}
            />
          </div>
        </div>
      </div>

      {/* Tags */}
      {customerProfile?.tags && customerProfile.tags.length > 0 && (
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
            {t('unifiedInbox.customer.tags', 'الوسوم')}
          </h4>
          <div className="flex flex-wrap justify-end gap-1.5">
            {customerProfile.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    'color-mix(in srgb, var(--color-primary) 14%, var(--color-background))',
                  color: 'var(--color-primary)',
                  border:
                    '1px solid color-mix(in srgb, var(--color-primary) 24%, transparent)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div
        className="p-4 border rounded-[20px] bg-transparent"
        style={{
          borderColor:
            'var(--business-muted-line, var(--business-card-border))',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => {
              setNoteText(customerProfile?.notes || '');
              setEditNote(!editNote);
            }}
            className="business-chip-button"
            aria-label={t('unifiedInbox.customer.notes', 'الملاحظات')}
          >
            <PencilSquareIcon
              className="w-3.5 h-3.5"
              aria-hidden="true"
            />
          </button>
          <h4
            className="text-sm font-bold text-end"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {t('unifiedInbox.notes', 'ملاحظات')}
          </h4>
        </div>
        {editNote ? (
          <div className="space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={t(
                'unifiedInbox.notePlaceholder',
                'أضف ملاحظة حول هذا العميل...',
              )}
              className="business-chat-input w-full p-2 text-xs min-h-[80px] resize-none"
              style={{ color: 'var(--color-foreground)' }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveNote}
                className="inbox-filter-chip text-xs"
                data-active="true"
              >
                {t('unifiedInbox.save', 'حفظ')}
              </button>
              <button
                type="button"
                onClick={() => setEditNote(false)}
                className="inbox-filter-chip text-xs"
              >
                {t('unifiedInbox.cancel', 'إلغاء')}
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-xs leading-relaxed whitespace-pre-wrap"
            style={{
              color: customerProfile?.notes
                ? 'var(--color-foreground)'
                : 'var(--color-muted-foreground)',
            }}
          >
            {customerProfile?.notes ||
              t('unifiedInbox.noNotes', 'لا توجد ملاحظات')}
          </p>
        )}
      </div>
    </div>
  );
};
