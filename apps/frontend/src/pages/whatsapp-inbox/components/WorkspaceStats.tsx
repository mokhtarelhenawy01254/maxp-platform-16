import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceStats as WorkspaceStatsType } from '../types';

interface WorkspaceStatsProps {
  stats: WorkspaceStatsType;
  onStatClick?: (key: string) => void;
}

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
    <div className="-mx-4 flex divide-x divide-border border-y border-border px-1 md:-mx-6 md:px-3 lg:-mx-8">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onStatClick?.(item.key)}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50"
        >
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {item.value}
          </span>
          <span className="text-xs leading-tight text-muted-foreground">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default WorkspaceStats;
