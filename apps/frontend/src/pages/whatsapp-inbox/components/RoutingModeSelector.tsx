import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RoutingMode } from '../types';

interface RoutingModeSelectorProps {
  mode: RoutingMode;
  onChange: (mode: RoutingMode) => void;
}

const RoutingModeSelector: React.FC<RoutingModeSelectorProps> = ({
  mode,
  onChange,
}) => {
  const { t } = useTranslation();

  const modes: Array<{
    value: RoutingMode;
    label: string;
    description: string;
    activeClasses: string;
    indicatorClasses: string;
  }> = [
    {
      value: 'NUMBER_OWNER',
      label: t('whatsappInbox.modeDirect'),
      description: t('whatsappInbox.modeDirectDescription'),
      activeClasses:
        'border-primary/30 bg-primary/10 shadow-sm dark:border-primary/50 dark:bg-primary/20',
      indicatorClasses: 'border-primary bg-[color:var(--color-card)]',
    },
    {
      value: 'ROUND_ROBIN',
      label: t('whatsappInbox.modeRoundRobin'),
      description: t('whatsappInbox.modeRoundRobinDescription'),
      activeClasses:
        'border-secondary/30 bg-secondary/10 shadow-sm dark:border-secondary/50 dark:bg-secondary/20',
      indicatorClasses: 'border-secondary bg-[color:var(--color-card)]',
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {modes.map((option) => {
        const isActive = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border p-4 text-start transition ${
              isActive ? option.activeClasses : 'border-border/50 bg-card hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {option.label}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <span
                className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                  isActive ? option.indicatorClasses : 'border-border bg-transparent'
                }`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default RoutingModeSelector;