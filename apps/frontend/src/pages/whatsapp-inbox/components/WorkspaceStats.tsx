import React from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceStats as WorkspaceStatsType } from '../types';

interface WorkspaceStatsProps {
  stats: WorkspaceStatsType;
}

const WorkspaceStats: React.FC<WorkspaceStatsProps> = ({ stats }) => {
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
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-border/50 bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceStats;