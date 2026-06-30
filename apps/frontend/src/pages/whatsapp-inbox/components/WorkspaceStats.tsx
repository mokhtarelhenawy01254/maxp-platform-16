import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Phone,
  UserCheck,
  Shuffle,
  Wifi,
} from 'lucide-react';
import type { WorkspaceStats as WorkspaceStatsType } from '../types';

interface WorkspaceStatsProps {
  stats: WorkspaceStatsType;
  onStatClick?: (key: string) => void;
}

const STAT_ICONS: Record<string, React.ElementType> = {
  configured: Phone,
  exclusive: UserCheck,
  roundRobin: Shuffle,
  connected: Wifi,
};

const WorkspaceStats: React.FC<WorkspaceStatsProps> = ({ stats, onStatClick }) => {
  const { t } = useTranslation();

  const items = [
    {
      key: 'configured',
      label: t('whatsappInbox.workspaceConfiguredNumbers'),
      value: stats.configuredNumbers,
    },
    {
      key: 'exclusive',
      label: t('whatsappInbox.workspaceExclusiveNumbers'),
      value: stats.exclusiveNumbers,
    },
    {
      key: 'roundRobin',
      label: t('whatsappInbox.workspaceRoundRobinNumbers'),
      value: stats.roundRobinNumbers,
    },
    {
      key: 'connected',
      label: t('whatsappInbox.workspaceConnectedNumbers'),
      value: stats.connectedNumbers,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const Icon = STAT_ICONS[item.key];
        return (
          <button
            type="button"
            key={item.key}
            onClick={() => onStatClick?.(item.key)}
            className="group relative w-full overflow-hidden rounded-xl border border-border/50 bg-card p-4 text-start shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 opacity-0 transition-all duration-300 group-hover:scale-150 group-hover:opacity-100" />
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              {Icon && (
                <Icon className="size-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:opacity-80" />
              )}
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground transition-all duration-300 group-hover:text-primary">
              {item.value}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default WorkspaceStats;