import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { FilterTab, PerspectiveMode, WorkspaceStats } from './types';

interface WorkspaceTopBarProps {
  activeTab: FilterTab;
  onSelectTab: (tab: FilterTab) => void;
  stats: WorkspaceStats | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  perspective: PerspectiveMode;
  onPerspectiveChange: (mode: PerspectiveMode) => void;
  refreshing: boolean;
  onRefresh: () => void;
  autoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  sortOption: 'recent' | 'oldest' | 'attempts';
  onSortChange: (sort: 'recent' | 'oldest' | 'attempts') => void;
  isManager?: boolean;
}

export const WorkspaceTopBar: React.FC<WorkspaceTopBarProps> = ({
  activeTab,
  onSelectTab,
  stats,
  searchQuery,
  onSearchChange,
  perspective,
  onPerspectiveChange,
  refreshing,
  onRefresh,
  autoAdvance,
  onToggleAutoAdvance,
  sortOption,
  onSortChange,
  isManager = false,
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const pendingCount = (stats?.pending || 0) + (stats?.incomplete || 0);
  const totalCount = (stats?.total || 0) + (stats?.incomplete || 0);

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'pending', label: t('orders.workspacePending'), count: pendingCount },
    { key: 'followup', label: t('orders.workspaceFollowUpLater'), count: stats?.followup },
    { key: 'confirmed', label: t('orders.workspaceConfirmed'), count: stats?.confirmed },
    { key: 'cancelled', label: t('orders.workspaceCancelled'), count: stats?.cancelled },
    { key: 'all', label: t('orders.workspaceAll'), count: totalCount },
  ];

  return (
    <header className="border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Start (Right in RTL): Status Filter Tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={t('orders.workspaceFilters')}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                role="tab"
                aria-selected={isActive}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* End (Left in RTL): Search + Sort + Refresh + Controls */}
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

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
            title={t('common.refresh')}
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Auto-advance toggle */}
          <button
            type="button"
            onClick={onToggleAutoAdvance}
            className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors lg:inline-flex ${
              autoAdvance
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border/40 text-muted-foreground hover:bg-muted/40'
            }`}
            title={isArabic ? 'التمرير التلقائي للطلب التالي فور إنهاء الإجراء' : 'Auto-advance to next order after action'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoAdvance ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            <span>{isArabic ? 'تمرير تلقائي' : 'Auto-Advance'}</span>
          </button>

          {/* Manager Perspective Switcher */}
          {isManager && (
            <div
              className="flex items-center rounded-lg border border-border/40 bg-muted/30 p-0.5"
              role="radiogroup"
              aria-label={isArabic ? 'عدسة الدور' : 'Perspective Mode'}
            >
              <button
                type="button"
                onClick={() => onPerspectiveChange('operator')}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all ${
                  perspective === 'operator'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'المشغل' : 'Operator'}</span>
              </button>
              <button
                type="button"
                onClick={() => onPerspectiveChange('supervisor')}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all ${
                  perspective === 'supervisor'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isArabic ? 'المشرف' : 'Supervisor'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
