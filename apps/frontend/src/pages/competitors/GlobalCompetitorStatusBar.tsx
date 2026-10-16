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
    return counts[filter] || 0;
  };

  const getLabelKey = (filter: StatusFilter): string => {
    if (filter === 'ALL') return 'competitors.statusFilterAll';
    return `competitors.statuses.${filter}`;
  };

  return (
    <div className="w-full" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-card border border-border/70 rounded-2xl shadow-xs overflow-x-auto">
        {filterItems.map((filter) => {
          const isActive = filter === selectedFilter;
          const count = getCount(filter);

          return (
            <button
              key={filter}
              onClick={() => onFilterChange(filter)}
              disabled={isLoading}
              className={`
                relative flex items-center gap-1.5 sm:gap-2
                px-3 py-1.5 sm:py-2
                rounded-xl text-xs sm:text-sm font-semibold
                transition-all duration-150 ease-out
                whitespace-nowrap
                focus:outline-none focus-visible:ring-1 focus-visible:ring-primary
                ${isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }
                ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer active:scale-[0.98]'}
              `}
              title={t(getLabelKey(filter))}
            >
              <span>{t(getLabelKey(filter))}</span>
              <span className={`
                inline-flex items-center justify-center
                min-w-[1.25rem] sm:min-w-[1.5rem]
                h-4 sm:h-5
                px-1.5
                rounded-md text-[10px] sm:text-xs font-mono font-bold tabular-nums
                leading-none
                ${isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground border border-border/60'
                }
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
