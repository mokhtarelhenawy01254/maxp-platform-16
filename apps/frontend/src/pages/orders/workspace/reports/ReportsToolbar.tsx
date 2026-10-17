import React from 'react';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { ReportRange } from './useWorkspaceReports';

interface ReportsToolbarProps {
  range: ReportRange;
  onRangeChange: (range: ReportRange) => void;
  startDate: string;
  endDate: string;
  onCustomDatesChange: (start: string, end: string) => void;
  isManager: boolean;
  agents?: { id: string; name: string }[];
  selectedAgentId: string;
  onAgentChange: (agentId: string) => void;
  onExportCsv: () => void;
  canExport: boolean;
  onRefresh: () => void;
  loading: boolean;
  refreshing: boolean;
  isArabic: boolean;
}

export const ReportsToolbar: React.FC<ReportsToolbarProps> = ({
  range,
  onRangeChange,
  startDate,
  endDate,
  onCustomDatesChange,
  isManager,
  agents,
  selectedAgentId,
  onAgentChange,
  onExportCsv,
  canExport,
  onRefresh,
  loading,
  refreshing,
  isArabic,
}) => {
  const rangeButtons: { key: ReportRange; label: string }[] = [
    { key: 'today', label: isArabic ? 'اليوم' : 'Today' },
    { key: 'yesterday', label: isArabic ? 'أمس' : 'Yesterday' },
    { key: '7d', label: isArabic ? 'آخر ٧ أيام' : 'Last 7 Days' },
    { key: '30d', label: isArabic ? 'آخر ٣٠ يوم' : 'Last 30 Days' },
    { key: 'custom', label: isArabic ? 'مدى مخصص' : 'Custom Range' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3 mb-4 dark:border-slate-800">
      {/* Date Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground me-1 select-none dark:text-slate-400">
          {isArabic ? 'الفترة:' : 'Period:'}
        </span>
        {rangeButtons.map((btn) => {
          const isActive = range === btn.key;
          return (
            <button
              key={btn.key}
              type="button"
              onClick={() => onRangeChange(btn.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'border border-border/60 bg-card hover:bg-muted/70 text-muted-foreground hover:text-foreground dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Custom Range Inputs */}
      {range === 'custom' && (
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => onCustomDatesChange(e.target.value, endDate)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 font-medium text-foreground outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <span className="text-muted-foreground dark:text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onCustomDatesChange(startDate, e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 font-medium text-foreground outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>
      )}

      {/* Right side: Agent Selector + Actions */}
      <div className="flex items-center gap-2 shrink-0 ms-auto">
        {isManager && agents && (
          <select
            value={selectedAgentId}
            onChange={(e) => onAgentChange(e.target.value)}
            className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">{isArabic ? 'كل الفريق' : 'All Team'}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        )}

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportCsv}
          disabled={loading || !canExport}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title={isArabic ? 'تصدير التقرير كملف CSV' : 'Export report as CSV'}
        >
          <ArrowDownTrayIcon className="h-3.5 w-3.5 text-primary dark:text-blue-400" />
          <span>{isArabic ? 'تصدير CSV' : 'Export CSV'}</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          title={isArabic ? 'تحديث البيانات' : 'Refresh'}
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
