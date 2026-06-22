import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  bg: string;
  text: string;
  dotColor: string;
  hoverBg: string;
}> = {
  NEW: {
    bg: 'bg-blue-600 dark:bg-blue-500',
    text: 'text-white',
    dotColor: 'bg-blue-400',
    hoverBg: 'hover:bg-blue-700 dark:hover:bg-blue-600',
  },
  FOLLOWING: {
    bg: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-white',
    dotColor: 'bg-amber-300',
    hoverBg: 'hover:bg-amber-600 dark:hover:bg-amber-500',
  },
  COMPLETED: {
    bg: 'bg-emerald-600 dark:bg-emerald-500',
    text: 'text-white',
    dotColor: 'bg-emerald-400',
    hoverBg: 'hover:bg-emerald-700 dark:hover:bg-emerald-600',
  },
};

const sizeClasses = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1 gap-1.5',
  lg: 'text-base px-4 py-1.5 gap-2',
};

const dotSizes = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

const chevronSizes = {
  sm: 12,
  md: 14,
  lg: 16,
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
  const config = statusConfig[currentStatus];

  const handleChange = (status: CompetitorStatus) => {
    if (disabled || loading || status === currentStatus) return;
    if (onChange) onChange(status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || loading}>
        <button
          className={`
            inline-flex items-center ${sizeClasses[size]} rounded-full font-medium
            transition-all duration-200 ease-in-out
            ${config.bg} ${config.text}
            ${config.hoverBg}
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            ${loading ? 'animate-pulse' : ''}
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400
            shadow-sm
          `}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <span className={`${dotSizes[size]} rounded-full ${config.dotColor} shrink-0`} />
          <span>{t(`competitors.statuses.${currentStatus}`)}</span>
          <ChevronDown size={chevronSizes[size]} className="shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRtl ? 'start' : 'end'} sideOffset={4}>
        {COMPETITOR_STATUSES.map((status) => {
          const cfg = statusConfig[status];
          const isActive = status === currentStatus;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleChange(status)}
              disabled={isActive || disabled || loading}
              className={isActive ? 'opacity-60' : ''}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
              <span className="flex-1">{t(`competitors.statuses.${status}`)}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 ml-auto rtl:mr-auto rtl:ml-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CompetitorStatusBar;
