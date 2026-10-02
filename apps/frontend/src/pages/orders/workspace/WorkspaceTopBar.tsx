import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  ShieldCheckIcon,
  ChartBarIcon,
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
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all', label: t('orders.workspaceAll'), count: stats?.total },
    { key: 'pending', label: t('orders.workspacePending'), count: stats?.pending },
    { key: 'confirmed', label: t('orders.workspaceConfirmed'), count: stats?.confirmed },
    { key: 'cancelled', label: t('orders.workspaceCancelled'), count: stats?.cancelled },
    { key: 'followup', label: t('orders.workspaceFollowUpLater'), count: stats?.followup },
    { key: 'confirmation', label: t('orders.workspaceConfirmationQueue') },
  ];

  return (
    <header className="border-b border-border/40 bg-card/95 px-3 py-2 backdrop-blur-sm sm:px-4">
      {/* Upper line: Perspective switcher + Search + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Perspectives Switcher */}
          <div
            className="flex items-center rounded-lg border border-border/40 bg-muted/30 p-0.5"
            role="radiogroup"
            aria-label={isArabic ? 'عدسة الدور' : 'Perspective Mode'}
          >
            <button
              type="button"
              onClick={() => onPerspectiveChange('operator')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                perspective === 'operator'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{isArabic ? 'المشغل' : 'Operator'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPerspectiveChange('supervisor')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                perspective === 'supervisor'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              <span>{isArabic ? 'المشرف' : 'Supervisor'}</span>
            </button>
            <button
              type="button"
              onClick={() => onPerspectiveChange('marketer')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                perspective === 'marketer'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChartBarIcon className="h-3.5 w-3.5" />
              <span>{isArabic ? 'الميديا باير' : 'Attribution'}</span>
            </button>
          </div>

          {/* Auto-advance toggle */}
          <button
            type="button"
            onClick={onToggleAutoAdvance}
            className={`hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors sm:inline-flex ${
              autoAdvance
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border/40 text-muted-foreground hover:bg-muted/40'
            }`}
            title={isArabic ? 'التمرير التلقائي للطلب التالي فور إنهاء الإجراء' : 'Auto-advance to next order after action'}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoAdvance ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            <span>{isArabic ? 'تمرير تلقائي' : 'Auto-Advance'}</span>
          </button>
        </div>

        {/* Search Bar + Refresh */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={isArabic ? 'بحث بالاسم، الهاتف، رقم الطلب…' : 'Search name, phone, #order…'}
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
        </div>
      </div>

      {/* Lower line: Tab navigation chips */}
      <div className="mt-2 flex items-center justify-between gap-2 overflow-x-auto border-t border-border/30 pt-2 no-scrollbar">
        <div className="flex items-center gap-1.5" role="tablist" aria-label={t('orders.workspaceFilters')}>
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
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
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

        {/* Mobile select fallback */}
        <select
          id="workspace-mobile-section"
          value={activeTab}
          onChange={(e) => onSelectTab(e.target.value as FilterTab)}
          className="h-7 rounded border border-border bg-background px-2 text-xs font-semibold text-foreground sm:hidden"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {typeof tab.count === 'number' ? `${tab.label} (${tab.count})` : tab.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
};
