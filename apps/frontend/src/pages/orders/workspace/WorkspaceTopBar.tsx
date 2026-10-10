import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FilterTab, WorkspaceStats } from './types';

interface WorkspaceTopBarProps {
  activeTab: FilterTab;
  onSelectTab: (tab: FilterTab) => void;
  stats: WorkspaceStats | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortOption: 'recent' | 'oldest' | 'attempts';
  onSortChange: (sort: 'recent' | 'oldest' | 'attempts') => void;
  /** آخر نجاح جلب — لشارة «حدث قبل X» بجانب زر التحديث */
  lastFetchedAt: number | null;
  isManager?: boolean;
  totalOrdersCount?: number;
}

export const WorkspaceTopBar: React.FC<WorkspaceTopBarProps> = ({
  activeTab,
  onSelectTab,
  stats,
  searchQuery,
  onSearchChange,
  refreshing,
  onRefresh,
  sortOption,
  onSortChange,
  lastFetchedAt,
  isManager,
  totalOrdersCount,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  // نبض دقيقة لتحديث شارة الحداثة دون إعادة رندر الصفحة كلها
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const freshnessLabel = () => {
    if (!lastFetchedAt) return null;
    const mins = Math.floor((Date.now() - lastFetchedAt) / 60000);
    if (mins < 1) return isArabic ? 'حدث الآن' : 'fresh';
    if (mins < 60) return isArabic ? `حدث قبل ${mins} د` : `${mins}m old`;
    const hrs = Math.floor(mins / 60);
    return isArabic ? `حدث قبل ${hrs} س` : `${hrs}h old`;
  };

  const getTabCount = (tabKey: FilterTab): number | undefined => {
    switch (tabKey) {
      case 'pending':
        return stats?.pending;
      case 'incomplete':
        return stats?.incomplete;
      default:
        return undefined;
    }
  };

  // تابات الفلتر السريع الحصرية: قيد الانتظار والسلات المتروكة فقط
  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'pending', label: isArabic ? 'قيد الانتظار' : 'Pending', count: getTabCount('pending') },
    { key: 'incomplete', label: isArabic ? 'السلات المتروكة' : 'Abandoned Carts', count: getTabCount('incomplete') },
  ];

  return (
    <header className="border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Quick Filter Tabs — شريط التابات السريع الفعلي */}
        <div
          role="tablist"
          aria-label={isArabic ? 'فلترة سريعة للطلبات' : 'Quick order filters'}
          className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0 select-none">
            <span>{isArabic ? 'سريع' : 'Quick'}</span>
            <span className="text-border/80">|</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const hasCount = typeof tab.count === 'number';
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTab(tab.key)}
                  className={`relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 sm:px-3.5 py-1 text-xs sm:text-sm font-medium transition-all active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-500'
                      : 'border border-border/70 bg-card/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  {hasCount && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] sm:text-[11px] font-bold tabular-nums min-w-[18px] leading-tight ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-muted text-foreground/80 border border-border/50'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* End (Left in RTL): Search + Sort + Freshness + Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Bar */}
          <div className="relative w-36 sm:w-48 lg:w-56 transition-all">
            <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isArabic ? 'بحث بالاسم، الهاتف…' : 'Search name, phone…'}
              className="h-8 w-full rounded-md border border-border/50 bg-background pe-7 ps-8 text-xs font-medium placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as any)}
            className="h-8 rounded-md border border-border/50 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            aria-label={isArabic ? 'ترتيب الطلبات' : 'Sort orders'}
          >
            <option value="recent">{isArabic ? 'الأحدث' : 'Recent'}</option>
            <option value="oldest">{isArabic ? 'الأقدم' : 'Oldest'}</option>
            <option value="attempts">{isArabic ? 'الأكثر محاولات' : 'Most Calls'}</option>
          </select>

          {/* Freshness + Refresh: الموظف يرى حيوية البيانات بلا ضغطة */}
          <div
            className="flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-background px-2"
            title={isArabic ? 'آخر جلب ناجح للبيانات' : 'Last successful fetch'}
          >
            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
              {freshnessLabel() ?? (isArabic ? '…' : '…')}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-busy={refreshing}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              title={t('common.refresh')}
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
