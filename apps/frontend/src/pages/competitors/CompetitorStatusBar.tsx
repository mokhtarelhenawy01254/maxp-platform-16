import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

export const COMPETITOR_STATUSES = ['NEW', 'FOLLOWING', 'COMPLETED'] as const;
export type CompetitorStatus = (typeof COMPETITOR_STATUSES)[number];

interface CompetitorStatusBarProps {
  currentStatus: CompetitorStatus;
  competitorId?: string;
  onChange?: (newStatus: CompetitorStatus) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

const statusConfig: Record<CompetitorStatus, {
  activeBg: string;
  activeText: string;
  inactiveBg: string;
  inactiveText: string;
  hoverBg: string;
  indicatorColor: string;
}> = {
  NEW: {
    activeBg: 'bg-blue-600 dark:bg-blue-500',
    activeText: 'text-white',
    inactiveBg: 'bg-blue-50 dark:bg-blue-900/20',
    inactiveText: 'text-blue-700 dark:text-blue-300',
    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    indicatorColor: 'bg-blue-500',
  },
  FOLLOWING: {
    activeBg: 'bg-amber-500 dark:bg-amber-400',
    activeText: 'text-white',
    inactiveBg: 'bg-amber-50 dark:bg-amber-900/20',
    inactiveText: 'text-amber-700 dark:text-amber-300',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
    indicatorColor: 'bg-amber-500',
  },
  COMPLETED: {
    activeBg: 'bg-emerald-600 dark:bg-emerald-500',
    activeText: 'text-white',
    inactiveBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    inactiveText: 'text-emerald-700 dark:text-emerald-300',
    hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    indicatorColor: 'bg-emerald-500',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-2 py-1 gap-1',
  md: 'text-xs px-3 py-1.5 gap-1.5',
  lg: 'text-sm px-4 py-2 gap-2',
};

function CompetitorStatusBar({
  currentStatus,
  competitorId,
  onChange,
  size = 'sm',
  disabled = false,
  loading = false,
}: CompetitorStatusBarProps) {
  const { t } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const handleChange = (status: CompetitorStatus) => {
    if (disabled || loading || status === currentStatus) return;
    if (onChange) onChange(status);
  };

  return (
    <div
      className={`inline-flex ${isRtl ? 'flex-row' : 'flex-row'} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 divide-x divide-gray-200 dark:divide-gray-700 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {COMPETITOR_STATUSES.map((status, index) => {
        const config = statusConfig[status];
        const isActive = status === currentStatus;
        const isFirst = index === 0;
        const isLast = index === COMPETITOR_STATUSES.length - 1;

        return (
          <button
            key={status}
            onClick={() => handleChange(status)}
            disabled={disabled || loading || isActive}
            className={`
              relative ${sizeClasses[size]} font-medium
              transition-all duration-300 ease-in-out
              flex items-center justify-center gap-1.5
              focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400
              ${isFirst ? (isRtl ? 'rounded-r-lg' : 'rounded-l-lg') : ''}
              ${isLast ? (isRtl ? 'rounded-l-lg' : 'rounded-r-lg') : ''}
              ${
                isActive
                  ? `${config.activeBg} ${config.activeText} shadow-sm cursor-default`
                  : `${config.inactiveBg} ${config.inactiveText} ${config.hoverBg} cursor-pointer`
              }
              ${loading && isActive ? 'animate-pulse' : ''}
            `}
            title={t(`competitors.statuses.${status}`)}
          >
            {loading && isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
            )}
            {!loading && isActive && (
              <span className={`w-1.5 h-1.5 rounded-full ${config.indicatorColor} bg-opacity-70`} />
            )}
            <span>{t(`competitors.statuses.${status}`)}</span>
            {isActive && (
              <span className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-[inherit]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default CompetitorStatusBar;
