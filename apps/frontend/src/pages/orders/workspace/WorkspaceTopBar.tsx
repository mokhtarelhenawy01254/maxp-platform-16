import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
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

  const pendingCount = (stats?.pending || 0) + (stats?.incomplete || 0);
  const totalCount = (stats?.total || 0) + (stats?.incomplete || 0);

  // طابور عمل فقط: الانتظار والمتابعة — «الكل» هو النشط فقط (بدون أرشيف المؤكد/الملغي
  // الذي تديره صفحة الطلبات الرئيسية بفلاترها الكاملة)
  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'pending', label: t('orders.workspacePending'), count: pendingCount },
    { key: 'followup', label: t('orders.workspaceFollowUpLater'), count: stats?.followup },
    { key: 'all', label: t('orders.workspaceAll'), count: totalCount },
  ];

  return (
    <header className="border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Start (Right in RTL): Status Filter Tabs — مكوّن التابات القياسي للموقع */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => onSelectTab(v as FilterTab)}
        >
          <TabsList
            className="justify-start overflow-x-auto rounded-2xl bg-muted/60 p-1"
            aria-label={t('orders.workspaceFilters')}
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
              >
                <span className="whitespace-nowrap">{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-foreground">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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
