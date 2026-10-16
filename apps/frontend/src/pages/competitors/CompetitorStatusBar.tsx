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
  border: string;
}> = {
  NEW: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    dotColor: 'bg-primary',
    border: 'border-primary/25',
    hoverBg: 'hover:bg-primary/15',
  },
  FOLLOWING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    border: 'border-amber-500/25',
    hoverBg: 'hover:bg-amber-500/15',
  },
  COMPLETED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
    border: 'border-emerald-500/25',
    hoverBg: 'hover:bg-emerald-500/15',
  },
};

const sizeClasses = {
  sm: 'text-[11px] px-2.5 py-0.5 gap-1.5',
  md: 'text-xs px-3 py-1 gap-2',
  lg: 'text-sm px-4 py-1.5 gap-2.5',
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
  const config = statusConfig[currentStatus] || statusConfig.NEW;

  const handleChange = (status: CompetitorStatus) => {
    if (disabled || loading || status === currentStatus) return;
    if (onChange) onChange(status);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || loading}>
        <button
          className={`
            inline-flex items-center ${sizeClasses[size]} rounded-lg font-semibold
            transition-all duration-150 ease-out border
            ${config.bg} ${config.text} ${config.border}
            ${config.hoverBg}
            ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
            ${loading ? 'animate-pulse' : ''}
            focus:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs
          `}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <span className={`${dotSizes[size]} rounded-full ${config.dotColor} shrink-0`} />
          <span>{t(`competitors.statuses.${currentStatus}`)}</span>
          <ChevronDown size={chevronSizes[size]} className="shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRtl ? 'start' : 'end'} sideOffset={4} className="bg-card border border-border/70 rounded-xl shadow-xl p-1">
        {COMPETITOR_STATUSES.map((status) => {
          const cfg = statusConfig[status];
          const isActive = status === currentStatus;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleChange(status)}
              disabled={isActive || disabled || loading}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors ${
                isActive ? 'opacity-60 bg-muted/40 font-bold' : 'hover:bg-muted/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
              <span className="flex-1">{t(`competitors.statuses.${status}`)}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-80 ml-auto rtl:mr-auto rtl:ml-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CompetitorStatusBar;
