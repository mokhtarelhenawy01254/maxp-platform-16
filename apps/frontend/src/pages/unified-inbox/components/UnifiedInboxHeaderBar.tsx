import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';

interface UnifiedInboxHeaderBarProps {
  selectedPlatforms: string[];
  setSelectedPlatforms: (platforms: string[]) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => void;
  loading: boolean;
  selectMode: boolean;
  setSelectMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UnifiedInboxHeaderBar: React.FC<UnifiedInboxHeaderBarProps> = ({
  selectedPlatforms,
  setSelectedPlatforms,
  activeTab,
  setActiveTab,
  onRefresh,
  loading,
  selectMode,
  setSelectMode,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="unified-inbox-header px-5 pt-4 pb-3 border-b shrink-0"
      style={{
        borderColor: 'var(--business-muted-line)',
        background: 'var(--business-surface-panel)',
      }}
    >
      <h1
        className="text-[22px] font-bold mb-1"
        style={{ color: 'var(--color-foreground)' }}
      >
        {t('unifiedInbox.pageTitle', 'البريد الوارد')}
      </h1>

      {/* Platform Dropdown + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Platform pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedPlatforms([]);
              setActiveTab('all');
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={selectedPlatforms.length === 0 && activeTab === 'all'}
          >
            {t('unifiedInbox.filters.allPlatforms', 'كل المنصات')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlatforms(['facebook']);
              setActiveTab('all');
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={
              selectedPlatforms.length === 1 &&
              selectedPlatforms[0] === 'facebook' &&
              activeTab === 'all'
            }
          >
            Messenger
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlatforms(['instagram']);
              setActiveTab('all');
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={
              selectedPlatforms.length === 1 &&
              selectedPlatforms[0] === 'instagram' &&
              activeTab === 'all'
            }
          >
            Instagram
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedPlatforms(['whatsapp']);
              setActiveTab('all');
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={
              selectedPlatforms.length === 1 &&
              selectedPlatforms[0] === 'whatsapp' &&
              activeTab === 'all'
            }
          >
            {t('unifiedInbox.tabs.whatsapp', 'واتساب')}
          </button>

          <div
            className="w-px h-5"
            style={{ background: 'var(--business-card-border)' }}
          />

          <button
            type="button"
            onClick={() => {
              setActiveTab('fb-comments');
              setSelectedPlatforms([]);
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={activeTab === 'fb-comments'}
          >
            {t('unifiedInbox.tabs.fbComments', 'تعليقات فيسبوك')}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ig-comments');
              setSelectedPlatforms([]);
            }}
            className="inbox-filter-chip text-xs whitespace-nowrap"
            style={{ borderRadius: '999px', padding: '0.3rem 0.85rem' }}
            data-active={activeTab === 'ig-comments'}
          >
            {t('unifiedInbox.tabs.igComments', 'تعليقات Instagram')}
          </button>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 mr-auto rtl:mr-auto rtl:ml-0 ltr:ml-auto ltr:mr-0">
          <button
            type="button"
            onClick={onRefresh}
            className="inbox-filter-chip p-1.5 rounded-lg"
            aria-label={t('unifiedInbox.refresh', 'تحديث')}
            title={t('unifiedInbox.refresh', 'تحديث')}
          >
            <ArrowPathIcon
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            type="button"
            onClick={() => setSelectMode((prev) => !prev)}
            className="inbox-filter-chip p-1.5 rounded-lg"
            data-active={selectMode ? 'true' : 'false'}
            aria-label={t('unifiedInbox.select', 'تحديد')}
            title={t('unifiedInbox.select', 'تحديد')}
          >
            <CheckIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedInboxHeaderBar;
