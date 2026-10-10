import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceReports, ReportRange } from './reports/useWorkspaceReports';
import { ReportsTrendChart } from './reports/ReportsTrendChart';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InboxIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface WorkspaceReportsTabProps {
  isManager: boolean;
}

export const WorkspaceReportsTab: React.FC<WorkspaceReportsTabProps> = ({ isManager }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.toLowerCase().startsWith('ar');

  const {
    range,
    startDate,
    endDate,
    selectedAgentId,
    data,
    loading,
    refreshing,
    error,
    handleRangeChange,
    handleCustomDatesChange,
    handleAgentChange,
    refresh,
    exportCsv,
  } = useWorkspaceReports(isManager);

  const rangeButtons: { key: ReportRange; label: string }[] = [
    { key: 'today', label: isArabic ? 'اليوم' : 'Today' },
    { key: 'yesterday', label: isArabic ? 'أمس' : 'Yesterday' },
    { key: '7d', label: isArabic ? 'آخر ٧ أيام' : 'Last 7 Days' },
    { key: '30d', label: isArabic ? 'آخر ٣٠ يوم' : 'Last 30 Days' },
    { key: 'custom', label: isArabic ? 'مدى مخصص' : 'Custom Range' },
  ];

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
            ? 'text-muted-foreground'
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
        <span className="text-[10px] text-muted-foreground/80 font-normal">
          ({isArabic ? 'سابق' : 'prev'}: {prevValue})
        </span>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background/95 p-3 sm:p-5 scrollbar-thin">
      {/* 1. Control Toolbar: Date Presets + Agent Picker + Export + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3 mb-4">
        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground me-1 select-none">
            {isArabic ? 'الفترة:' : 'Period:'}
          </span>
          {rangeButtons.map((btn) => {
            const isActive = range === btn.key;
            return (
              <button
                key={btn.key}
                type="button"
                onClick={() => handleRangeChange(btn.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.97] ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'border border-border/60 bg-card hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Inputs (if range === 'custom') */}
        {range === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDatesChange(e.target.value, endDate)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 font-medium text-foreground outline-none focus:border-primary"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDatesChange(startDate, e.target.value)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 font-medium text-foreground outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Right side: Agent Selector (if manager) + Actions */}
        <div className="flex items-center gap-2 shrink-0 ms-auto">
          {isManager && data?.agents && (
            <select
              value={selectedAgentId}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value="all">{isArabic ? 'كل الفريق' : 'All Team'}</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || !data?.agentBreakdown?.length}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
            title={isArabic ? 'تصدير التقرير كملف CSV' : 'Export report as CSV'}
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5 text-primary" />
            <span>{isArabic ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={refresh}
            disabled={loading || refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
            title={isArabic ? 'تحديث البيانات' : 'Refresh'}
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-bold underline hover:no-underline"
          >
            {isArabic ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg border border-border/40 bg-muted/40" />
            ))}
          </div>
          <div className="h-44 animate-pulse rounded-lg border border-border/40 bg-muted/40" />
          <div className="h-64 animate-pulse rounded-lg border border-border/40 bg-muted/40" />
        </div>
      )}

      {/* KPI Cards Bento Grid */}
      {data && data.kpis && (
        <div className="space-y-5">
          {/* 8 Primary Operational Metrics */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {/* 1. Contacted Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'أوردرات تم التواصل بها' : 'Contacted Orders'}</span>
                <PhoneIcon className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data.kpis.contactedOrders.value}
                </span>
                {renderDelta(data.kpis.contactedOrders.deltaPercent, data.kpis.contactedOrders.prevValue)}
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate" title={data.kpis.contactedOrders.source}>
                {isArabic ? 'المصدر: call_attempt_logs' : 'source: call_attempt_logs'}
              </div>
            </div>

            {/* 2. Confirmed Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'طلبات مؤكدة' : 'Confirmed Orders'}</span>
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                  {data.kpis.confirmedOrders.value}
                </span>
                {renderDelta(data.kpis.confirmedOrders.deltaPercent, data.kpis.confirmedOrders.prevValue)}
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground/80">
                <span className="truncate">{isArabic ? 'المصدر: orders.CONFIRMED' : 'source: orders.CONFIRMED'}</span>
                <span className="font-bold text-foreground tabular-nums">
                  {data.kpis.confirmationRate.value}% {isArabic ? 'نجاح' : 'rate'}
                </span>
              </div>
            </div>

            {/* 3. Follow-up Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'طلبات متابعة لاحقة' : 'Follow-up Orders'}</span>
                <ClockIcon className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
                  {data.kpis.followUpOrders.value}
                </span>
                {renderDelta(data.kpis.followUpOrders.deltaPercent, data.kpis.followUpOrders.prevValue)}
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: callback / followUpDate' : 'source: callback / followUpDate'}
              </div>
            </div>

            {/* 4. Cancelled Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'طلبات ملغية' : 'Cancelled Orders'}</span>
                <XCircleIcon className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
                  {data.kpis.cancelledOrders.value}
                </span>
                {renderDelta(data.kpis.cancelledOrders.deltaPercent, data.kpis.cancelledOrders.prevValue)}
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: orders.CANCELLED' : 'source: orders.CANCELLED'}
              </div>
            </div>

            {/* 5. Currently Open Orders */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'أوردرات مفتوحة الآن' : 'Open Orders Now'}</span>
                <InboxIcon className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data.kpis.openOrders.value}
                </span>
                <span className="text-[10px] rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 font-semibold">
                  {isArabic ? 'قيد العمل' : 'active'}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: order_assignments' : 'source: order_assignments'}
              </div>
            </div>

            {/* 6. Total Calls and Duration */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'المكالمات ومجموع مدتها' : 'Calls & Total Duration'}</span>
                <PhoneIcon className="h-4 w-4 text-sky-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                  {data.kpis.totalCalls.value} <span className="text-xs font-normal text-muted-foreground">{isArabic ? 'اتصال' : 'calls'}</span>
                </span>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                  {formatSeconds(data.kpis.totalDurationSeconds.value)}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: call_attempt_logs.duration' : 'source: call_attempt_logs.duration'}
              </div>
            </div>

            {/* 7. Avg Attempts Per Order */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'متوسط المحاولات / طلب' : 'Avg Attempts / Order'}</span>
                <ChartBarIcon className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {data.kpis.avgAttemptsPerOrder.value}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {isArabic ? 'محاولة' : 'att.'}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: إجمالي المكالمات ÷ الطلبات' : 'source: calls ÷ contacted orders'}
              </div>
            </div>

            {/* 8. Avg Handling Time */}
            <div className="flex flex-col justify-between rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-border">
              <div className="flex items-center justify-between gap-1 text-muted-foreground pb-1">
                <span className="text-xs font-semibold">{isArabic ? 'متوسط زمن المعالجة' : 'Avg Handling Time'}</span>
                <ClockIcon className="h-4 w-4 text-teal-500" />
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl font-bold tracking-tight tabular-nums text-foreground">
                  {formatHandlingMinutes(data.kpis.avgHandlingTimeMinutes.value)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isArabic ? 'من الاستلام للتأكيد' : 'assign to confirm'}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground/80 truncate">
                {isArabic ? 'المصدر: orders (confirmedAt - createdAt)' : 'source: orders (confirmedAt - createdAt)'}
              </div>
            </div>
          </div>

          {/* Daily Trend Chart Section */}
          {Array.isArray(data.dailyTrend) && data.dailyTrend.length > 0 && (
            <ReportsTrendChart data={data.dailyTrend} isArabic={isArabic} />
          )}

          {/* Detailed Performance Table */}
          {Array.isArray(data.agentBreakdown) && (
            <div className="rounded-lg border border-border/50 bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 bg-muted/20">
                <span className="text-xs font-bold text-foreground">
                  {isManager
                    ? isArabic ? 'تفاصيل أداء فريق التأكيد' : 'Confirmation Team Breakdown'
                    : isArabic ? 'تفاصيل أدائي الفردي' : 'My Individual Performance'}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  {data.agentBreakdown.length} {isArabic ? 'وكيل' : 'agents'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3 text-start">{isArabic ? 'الوكيل' : 'Agent'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'تواصل بها' : 'Contacted'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'مؤكدة' : 'Confirmed'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'نسبة التأكيد' : 'Conf. Rate'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'مؤجلة' : 'Follow-up'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'ملغية' : 'Cancelled'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'مفتوحة الآن' : 'Open'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'المكالمات' : 'Calls'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'المدة' : 'Duration'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'المحاولات/طلب' : 'Attempts/Ord'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'زمن المعالجة' : 'Handling Time'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {data.agentBreakdown.map((row) => (
                      <tr
                        key={row.agentId}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{row.agentName}</span>
                            {row.role && (
                              <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                                {row.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums text-foreground">
                          {row.contactedOrders}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {row.confirmedOrders}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                          {row.confirmationRate}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-amber-600 dark:text-amber-400">
                          {row.followUpOrders}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-rose-600 dark:text-rose-400">
                          {row.cancelledOrders}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground">
                          {row.openOrders}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground">
                          {row.totalCalls}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-muted-foreground">
                          {formatSeconds(row.totalDurationSeconds)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground">
                          {row.avgAttemptsPerOrder}
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium tabular-nums text-muted-foreground">
                          {formatHandlingMinutes(row.avgHandlingTimeMinutes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Table Footer: Totals */}
                  {data.agentBreakdown.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-border/60 bg-muted/20 font-bold">
                        <td className="py-2.5 px-3 text-foreground">{isArabic ? 'إجمالي الفريق' : 'Team Total'}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-foreground">
                          {data.kpis.contactedOrders.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                          {data.kpis.confirmedOrders.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-foreground">
                          {data.kpis.confirmationRate.value}%
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-amber-600 dark:text-amber-400">
                          {data.kpis.followUpOrders.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-rose-600 dark:text-rose-400">
                          {data.kpis.cancelledOrders.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-foreground">
                          {data.kpis.openOrders.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-foreground">
                          {data.kpis.totalCalls.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">
                          {formatSeconds(data.kpis.totalDurationSeconds.value)}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-foreground">
                          {data.kpis.avgAttemptsPerOrder.value}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">
                          {formatHandlingMinutes(data.kpis.avgHandlingTimeMinutes.value)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
