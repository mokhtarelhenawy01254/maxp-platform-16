import React from 'react';
import {
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InboxIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { WorkspaceReportsData } from './useWorkspaceReports';

interface ReportsKpiCardsProps {
  kpis: WorkspaceReportsData['kpis'];
  isArabic: boolean;
}

export const ReportsKpiCards: React.FC<ReportsKpiCardsProps> = ({ kpis, isArabic }) => {
  const formatSeconds = (totalSecs: number) => {
    if (!totalSecs || totalSecs <= 0) return isArabic ? '0 ث' : '0s';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return isArabic ? `${secs} ث` : `${secs}s`;
    return isArabic ? `${mins} د ${secs > 0 ? `${secs} ث` : ''}` : `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const formatHandlingMinutes = (mins: number) => {
    if (!mins || mins <= 0) return isArabic ? '0 دقيقة' : '0 min';
    if (mins < 60) return isArabic ? `${mins} دقيقة` : `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return isArabic ? `${hrs} س ${remMins > 0 ? `${remMins} د` : ''}` : `${hrs}h ${remMins > 0 ? `${remMins}m` : ''}`;
  };

  const renderDelta = (deltaPercent?: number, prevValue?: number) => {
    if (deltaPercent === undefined || prevValue === undefined) return null;
    const isPositive = deltaPercent > 0;
    const isNeutral = deltaPercent === 0;

    return (
      <div
        className={`flex items-center gap-1 text-[11px] font-semibold tabular-nums ${
          isNeutral
            ? 'text-muted-foreground dark:text-slate-400'
            : isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
        title={isArabic ? `السابق: ${prevValue}` : `Previous: ${prevValue}`}
      >
        {isPositive ? (
          <ArrowTrendingUpIcon className="h-3 w-3" />
        ) : isNeutral ? null : (
          <ArrowTrendingDownIcon className="h-3 w-3" />
        )}
        <span>
          {isPositive ? '+' : ''}
          {deltaPercent}%
        </span>
        <span className="text-[10px] text-muted-foreground/80 font-normal dark:text-slate-400">
          ({isArabic ? 'سابق' : 'prev'}: {prevValue})
        </span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {/* 1. Contacted Orders */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'أوردرات تم التواصل بها' : 'Contacted Orders'}</span>
          <PhoneIcon className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground dark:text-slate-100">
            {kpis.contactedOrders.value}
          </span>
          {renderDelta(kpis.contactedOrders.deltaPercent, kpis.contactedOrders.prevValue)}
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400" title={kpis.contactedOrders.source}>
          {isArabic ? 'المصدر: call_attempt_logs' : 'source: call_attempt_logs'}
        </div>
      </div>

      {/* 2. Confirmed Orders */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'طلبات مؤكدة' : 'Confirmed Orders'}</span>
          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
            {kpis.confirmedOrders.value}
          </span>
          {renderDelta(kpis.confirmedOrders.deltaPercent, kpis.confirmedOrders.prevValue)}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground/80 dark:text-slate-400">
          <span className="truncate">{isArabic ? 'المصدر: orders.CONFIRMED' : 'source: orders.CONFIRMED'}</span>
          <span className="font-bold text-foreground tabular-nums dark:text-slate-200">
            {kpis.confirmationRate.value}% {isArabic ? 'نجاح' : 'rate'}
          </span>
        </div>
      </div>

      {/* 3. Follow-up Orders */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'طلبات متابعة لاحقة' : 'Follow-up Orders'}</span>
          <ClockIcon className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
            {kpis.followUpOrders.value}
          </span>
          {renderDelta(kpis.followUpOrders.deltaPercent, kpis.followUpOrders.prevValue)}
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: callback / followUpDate' : 'source: callback / followUpDate'}
        </div>
      </div>

      {/* 4. Cancelled Orders */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'طلبات ملغية' : 'Cancelled Orders'}</span>
          <XCircleIcon className="h-4 w-4 text-rose-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
            {kpis.cancelledOrders.value}
          </span>
          {renderDelta(kpis.cancelledOrders.deltaPercent, kpis.cancelledOrders.prevValue)}
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: orders.CANCELLED' : 'source: orders.CANCELLED'}
        </div>
      </div>

      {/* 5. Currently Open Orders */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'أوردرات مفتوحة الآن' : 'Open Orders Now'}</span>
          <InboxIcon className="h-4 w-4 text-indigo-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground dark:text-slate-100">
            {kpis.openOrders.value}
          </span>
          <span className="text-[10px] rounded bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 px-1.5 py-0.5 font-semibold">
            {isArabic ? 'قيد العمل' : 'active'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: order_assignments' : 'source: order_assignments'}
        </div>
      </div>

      {/* 6. Total Calls and Duration */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'المكالمات ومجموع مدتها' : 'Calls & Total Duration'}</span>
          <PhoneIcon className="h-4 w-4 text-sky-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tracking-tight tabular-nums text-foreground dark:text-slate-100">
            {kpis.totalCalls.value} <span className="text-xs font-normal text-muted-foreground dark:text-slate-400">{isArabic ? 'اتصال' : 'calls'}</span>
          </span>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {formatSeconds(kpis.totalDurationSeconds.value)}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: call_attempt_logs.duration' : 'source: call_attempt_logs.duration'}
        </div>
      </div>

      {/* 7. Avg Attempts Per Order */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'متوسط المحاولات / طلب' : 'Avg Attempts / Order'}</span>
          <ChartBarIcon className="h-4 w-4 text-purple-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground dark:text-slate-100">
            {kpis.avgAttemptsPerOrder.value}
          </span>
          <span className="text-xs font-medium text-muted-foreground dark:text-slate-400">
            {isArabic ? 'محاولة' : 'att.'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: إجمالي المكالمات ÷ الطلبات' : 'source: calls ÷ contacted orders'}
        </div>
      </div>

      {/* 8. Avg Handling Time */}
      <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-xs transition-all hover:border-border dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700">
        <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1 dark:text-slate-400">
          <span className="text-xs font-semibold">{isArabic ? 'متوسط زمن المعالجة' : 'Avg Handling Time'}</span>
          <ClockIcon className="h-4 w-4 text-teal-500" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tracking-tight tabular-nums text-foreground dark:text-slate-100">
            {formatHandlingMinutes(kpis.avgHandlingTimeMinutes.value)}
          </span>
          <span className="text-[10px] text-muted-foreground dark:text-slate-400">
            {isArabic ? 'من الاستلام للتأكيد' : 'assign to confirm'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate dark:text-slate-400">
          {isArabic ? 'المصدر: orders (confirmedAt - createdAt)' : 'source: orders (confirmedAt - createdAt)'}
        </div>
      </div>
    </div>
  );
};
