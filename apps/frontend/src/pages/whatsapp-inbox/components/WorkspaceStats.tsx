import { useTranslation } from 'react-i18next';
import React from 'react';
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
      key: 'sharedInbox',
      label: t('whatsappInbox.workspaceSharedInboxNumbers'),
      value: stats.sharedInboxNumbers || 0,
    },
    {
      key: 'connected',
      label: t('whatsappInbox.workspaceConnectedNumbers'),
      value: stats.connectedNumbers,
    },
  ];

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-sm">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onStatClick?.(item.key)}
          className="inline-flex items-baseline gap-1.5 rounded text-start transition-colors hover:text-primary"
        >
          <span className="text-lg font-semibold tabular-nums text-foreground">
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
