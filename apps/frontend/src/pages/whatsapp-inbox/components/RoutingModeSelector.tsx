import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserCheck, Shuffle, Eye } from 'lucide-react';
import type { RoutingMode } from '../types';

interface RoutingModeSelectorProps {
  mode: RoutingMode;
  onChange: (mode: RoutingMode) => void;
}

const MODE_META: Record<RoutingMode, { icon: React.ElementType; color: string }> = {
  NUMBER_OWNER: { icon: UserCheck, color: 'primary' },
  ROUND_ROBIN: { icon: Shuffle, color: 'secondary' },
  SHARED_INBOX: { icon: Eye, color: 'tertiary' },
};

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
        'border-2 border-primary/50 bg-primary/15 shadow-sm dark:border-primary/70 dark:bg-primary/25',
      indicatorClasses: 'border-primary bg-[color:var(--color-card)]',
    },
    {
      value: 'ROUND_ROBIN',
      label: t('whatsappInbox.modeRoundRobin'),
      description: t('whatsappInbox.modeRoundRobinDescription'),
      activeClasses:
        'border-2 border-secondary/50 bg-secondary/15 shadow-sm dark:border-secondary/70 dark:bg-secondary/25',
      indicatorClasses: 'border-secondary bg-[color:var(--color-card)]',
    },
    {
      value: 'SHARED_INBOX',
      label: t('whatsappInbox.modeSharedInbox'),
      description: t('whatsappInbox.modeSharedInboxDescription'),
      activeClasses:
        'border-2 border-tertiary/50 bg-tertiary/15 shadow-sm dark:border-tertiary/70 dark:bg-tertiary/25',
      indicatorClasses: 'border-tertiary bg-[color:var(--color-card)]',
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {modes.map((option) => {
        const isActive = mode === option.value;
        const Icon = MODE_META[option.value].icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`group relative rounded-lg border p-4 text-start transition-all duration-200 ${
              isActive
                ? option.activeClasses
                : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? option.value === 'NUMBER_OWNER'
                        ? 'bg-primary/20 text-primary'
                        : option.value === 'ROUND_ROBIN'
                          ? 'bg-secondary/20 text-secondary'
                          : 'bg-tertiary/20 text-tertiary'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {option.label}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <span
                className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-all duration-200 ${
                    isActive
                      ? `${option.indicatorClasses} ring-2 ring-offset-1 ${
                          option.value === 'NUMBER_OWNER'
                            ? 'ring-primary/30'
                            : option.value === 'ROUND_ROBIN'
                              ? 'ring-secondary/30'
                              : 'ring-tertiary/30'
                        }`
                    : 'border-border bg-transparent'
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