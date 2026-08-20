import React from 'react';
import { useTranslation } from 'react-i18next';
import { COMPETITOR_STATUSES, type CompetitorStatus } from './CompetitorStatusBar';
import i18n from '../../i18n';

export type StatusFilter = CompetitorStatus | 'ALL';

interface StatusCounts {
  total: number;
  NEW: number;
  FOLLOWING: number;
  COMPLETED: number;
}

interface GlobalCompetitorStatusBarProps {
  selectedFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  counts: StatusCounts;
  isLoading?: boolean;
}

const filterConfig: Record<StatusFilter, {
  activeBg: string;
  activeText: string;
  inactiveBg: string;
  inactiveText: string;
  hoverBg: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
}> = {
  ALL: {
    activeBg: 'bg-gray-800 dark:bg-gray-200',
    activeText: 'text-white dark:text-gray-900',
    inactiveBg: 'bg-gray-100 dark:bg-gray-800/50',
    inactiveText: 'text-gray-600 dark:text-gray-400',
    hoverBg: 'hover:bg-gray-200 dark:hover:bg-gray-700/50',
    dotColor: 'bg-gray-500',
    badgeBg: 'bg-gray-200 dark:bg-gray-700',
    badgeText: 'text-gray-700 dark:text-gray-300',
  },
  NEW: {
    activeBg: 'bg-blue-600 dark:bg-blue-500',
    activeText: 'text-white',
    inactiveBg: 'bg-blue-50 dark:bg-blue-900/20',
    inactiveText: 'text-blue-700 dark:text-blue-300',
    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
  },
  FOLLOWING: {
    activeBg: 'bg-amber-500 dark:bg-amber-400',
    activeText: 'text-white',
    inactiveBg: 'bg-amber-50 dark:bg-amber-900/20',
    inactiveText: 'text-amber-700 dark:text-amber-300',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  COMPLETED: {
    activeBg: 'bg-emerald-600 dark:bg-emerald-500',
    activeText: 'text-white',
    inactiveBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    inactiveText: 'text-emerald-700 dark:text-emerald-300',
    hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
  },
};

const filterItems: StatusFilter[] = ['ALL', ...COMPETITOR_STATUSES];

function GlobalCompetitorStatusBar({
  selectedFilter,
  onFilterChange,
  counts,
  isLoading = false,
}: GlobalCompetitorStatusBarProps) {
  const { t } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const getCount = (filter: StatusFilter): number => {
    if (filter === 'ALL') return counts.total;
    return counts[filter];
  };

  const getLabelKey = (filter: StatusFilter): string => {
    if (filter === 'ALL') return 'competitors.statusFilterAll';
    return `competitors.statuses.${filter}`;
  };

  return (
    <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className={`
        flex items-center gap-1.5 sm:gap-2
        p-1.5 sm:p-2
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        rounded-xl shadow-sm
        overflow-x-auto
        ${isRtl ? 'flex-row' : 'flex-row'}
      `}>
        {filterItems.map((filter) => {
          const config = filterConfig[filter];
          const isActive = filter === selectedFilter;
          const count = getCount(filter);

          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              disabled={isLoading}
              className={`
                relative flex items-center gap-1.5 sm:gap-2
                px-2.5 sm:px-4 py-1.5 sm:py-2
                rounded-lg text-xs sm:text-sm font-medium
                transition-all duration-200 ease-in-out
                whitespace-nowrap
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400
                ${isActive
                  ? `${config.activeBg} ${config.activeText} shadow-sm`
                  : `${config.inactiveBg} ${config.inactiveText} ${config.hoverBg}`
                }
                ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
              `}
              title={t(getLabelKey(filter))}
            >
              {isActive && (
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
              )}
              <span>{t(getLabelKey(filter))}</span>
              <span className={`
                inline-flex items-center justify-center
                min-w-[1.25rem] sm:min-w-[1.5rem]
                h-4 sm:h-5
                px-1 sm:px-1.5
                rounded-full text-[10px] sm:text-xs font-bold
                leading-none
                ${isActive
                  ? `${config.badgeBg} ${config.badgeText}`
                  : `bg-white/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400`
                }
                transition-colors duration-200
              `}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GlobalCompetitorStatusBar;
