import React from 'react';

export interface ReturnReasonItem {
  id: string;
  reason: string;
  description?: string;
  categoryId?: string;
  category?: { defaultRole?: string };
}

export interface ReturnCategoryItem {
  id: string;
  name: string;
  defaultRole?: string;
}

export interface ReturnReasonAndNotesSectionProps {
  responsibleParty: string;
  setResponsibleParty: (val: string) => void;
  responsiblePartyOptions: { value: string; label: string }[];
  reasonId: string;
  setReasonId: (val: string) => void;
  reasons: ReturnReasonItem[];
  categories: ReturnCategoryItem[];
  customerNotes: string;
  setCustomerNotes: (val: string) => void;
  adminNotes: string;
  setAdminNotes: (val: string) => void;
  t: (key: string) => string;
}

export const ReturnReasonAndNotesSection: React.FC<ReturnReasonAndNotesSectionProps> = ({
  responsibleParty,
  setResponsibleParty,
  responsiblePartyOptions,
  reasonId,
  setReasonId,
  reasons,
  categories,
  customerNotes,
  setCustomerNotes,
  adminNotes,
  setAdminNotes,
  t,
}) => {
  const matchingCategories = categories.filter((cat) => cat.defaultRole === responsibleParty);
  const otherReasons = reasons.filter((r) => {
    const cat = categories.find((c) => c.id === r.categoryId);
    return !cat || cat.defaultRole === 'OTHER';
  });

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {t('returns.k_202')}
        </label>
        <select
          value={responsibleParty}
          onChange={(e) => {
            setResponsibleParty(e.target.value);
            setReasonId('');
          }}
          className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
        >
          <option value="">{t('returns.k_30')}</option>
          {responsiblePartyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {t('returns.k_154')}
        </label>
        <select
          value={reasonId}
          onChange={(e) => {
            const selectedReason = reasons.find((r) => r.id === e.target.value);
            setReasonId(e.target.value);
            if (selectedReason?.category?.defaultRole) {
              setResponsibleParty(selectedReason.category.defaultRole);
            }
          }}
          className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
        >
          <option value="">{t('returns.k_30')}</option>
          {matchingCategories.map((cat) => (
            <optgroup key={cat.id} label={cat.name}>
              {reasons
                .filter((r) => r.categoryId === cat.id)
                .map((reason) => (
                  <option key={reason.id} value={reason.id}>
                    {reason.reason}
                    {reason.description && ` - ${reason.description}`}
                  </option>
                ))}
            </optgroup>
          ))}
          {otherReasons.length > 0 && (
            <optgroup label={t('returns.k_31')}>
              {otherReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.reason}
                  {reason.description && ` - ${reason.description}`}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {t('returns.k_156')}
        </label>
        <textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={2}
          placeholder={t('returns.k_35')}
          className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {t('returns.k_207')}
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
          className="w-full text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
        />
      </div>
    </>
  );
};
