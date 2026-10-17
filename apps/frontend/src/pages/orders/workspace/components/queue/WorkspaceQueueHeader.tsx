import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface WorkspaceQueueHeaderProps {
  ordersCount: number;
  totalCount: number;
  activeTab: string;
  riskOnly: boolean;
  onToggleRiskOnly: () => void;
  loadingMore: boolean;
  isArabic: boolean;
}

export const WorkspaceQueueHeader: React.FC<WorkspaceQueueHeaderProps> = ({
  ordersCount,
  totalCount,
  activeTab,
  riskOnly,
  onToggleRiskOnly,
  loadingMore,
  isArabic,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-border/30 bg-muted/15 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shrink-0 dark:border-slate-800 dark:bg-slate-900/60">
      <span className="font-mono tabular-nums text-foreground/80 dark:text-slate-300">
        {isArabic
          ? `معروض ${ordersCount} من ${totalCount || ordersCount} ${activeTab === 'incomplete' ? 'سلة' : 'طلب'}`
          : `Showing ${ordersCount} of ${totalCount || ordersCount}`}
      </span>
      <button
        type="button"
        data-risk-filter-toggle="1"
        onClick={onToggleRiskOnly}
        aria-pressed={riskOnly}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors ${
          riskOnly
            ? 'border-destructive/40 bg-destructive/15 text-destructive dark:border-destructive/50 dark:bg-destructive/20 dark:text-red-400'
            : 'border-border/60 bg-background/60 text-muted-foreground hover:border-destructive/30 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-600'
        }`}
        title={isArabic ? 'عرض الطلبات عالية الخطورة فقط' : 'Show high-risk orders only'}
      >
        {isArabic ? 'خطر عالي' : 'High risk'}
      </button>
      <span
        className="hidden items-center gap-1 sm:inline-flex text-muted-foreground/70 dark:text-slate-400"
        title={isArabic ? 'تنقل بالكيبورد: j أو ↓ للطلب التالي، k أو ↑ للسابق، Enter لاختيار الصف' : 'Keyboard: j/↓ next, k/↑ previous, Enter to select'}
      >
        <kbd className="rounded border border-border/60 bg-background px-1 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">j</kbd>
        <kbd className="rounded border border-border/60 bg-background px-1 font-mono text-[9px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">k</kbd>
      </span>
      {loadingMore && (
        <span className="flex items-center gap-1 text-primary">
          <ArrowPathIcon className="h-3 w-3 animate-spin" />
          <span className="text-[10px]">{isArabic ? 'تحميل المزيد…' : 'Loading…'}</span>
        </span>
      )}
    </div>
  );
};
