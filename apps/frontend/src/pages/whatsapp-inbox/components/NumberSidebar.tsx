import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Wifi, WifiOff, Loader2, X } from 'lucide-react';
import type { WorkspaceNumber } from '../types';

interface NumberSidebarProps {
  numbers: WorkspaceNumber[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
  statusFilter: 'ALL' | 'CONNECTED' | 'DISCONNECTED';
  onStatusFilterChange: (filter: 'ALL' | 'CONNECTED' | 'DISCONNECTED') => void;
}

const NORMALIZE_STATUS: Record<string, string> = {
  QR_PENDING: 'CONNECTING',
  LOGGED_OUT: 'DISCONNECTED',
};

const resolveConnectionClasses = (status: string): string => {
  const s = NORMALIZE_STATUS[status] || status;
  const styles: Record<string, string> = {
    CONNECTED:
      'border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/20',
    DISCONNECTED:
      'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20',
    CONNECTING:
      'border-warning/30 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/20',
    ERROR:
      'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20',
  };
  return styles[s] || 'border-border bg-muted text-muted-foreground';
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  CONNECTED: Wifi,
  DISCONNECTED: WifiOff,
  CONNECTING: Loader2,
};

const NumberSidebar: React.FC<NumberSidebarProps> = ({
  numbers,
  selectedSessionId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const resolveConnectionLabel = (status: string) => {
    const s = NORMALIZE_STATUS[status] || status;
    const labels: Record<string, string> = {
      CONNECTED: t('whatsappInbox.statusConnected'),
      DISCONNECTED: t('whatsappInbox.statusDisconnected'),
      CONNECTING: t('whatsappInbox.statusConnecting'),
      ERROR: t('whatsappInbox.statusError'),
    };
    return labels[s] || s;
  };

  const filteredNumbers = useMemo(() => {
    return numbers.filter((number) => {
      if (statusFilter === 'CONNECTED' && number.connectionStatus !== 'CONNECTED') return false;
      if (statusFilter === 'DISCONNECTED' && number.connectionStatus === 'CONNECTED') return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const name = (number.session.name || number.session.profileName || '').toLowerCase();
      const phone = (number.session.phoneNumber || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [numbers, query, statusFilter]);

  return (
    <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300">
      <div className="border-b border-border/50 px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {t('whatsappInbox.workspaceNumbersTitle')}
        </h2>

        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 ltr:left-3 rtl:right-3 peer-focus-within:text-primary" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('whatsappInbox.searchNumbers') as string}
              className="w-full rounded-lg border border-border/50 bg-card py-2 pr-8 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-1 focus:ring-ring/20 ltr:pl-9 rtl:pr-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground ltr:right-2 rtl:left-2"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            {(['ALL', 'CONNECTED', 'DISCONNECTED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => onStatusFilterChange(filter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                  statusFilter === filter
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {filter === 'ALL'
                  ? t('whatsappInbox.filterAll')
                  : filter === 'CONNECTED'
                    ? t('whatsappInbox.statusConnected')
                    : t('whatsappInbox.statusDisconnected')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
        {filteredNumbers.length === 0 && (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground transition-all duration-200">
            {query || statusFilter !== 'ALL'
              ? t('whatsappInbox.noNumbersMatchFilter')
              : t('whatsappInbox.workspaceNoNumbers')}
          </div>
        )}

        {filteredNumbers.map((number) => {
          const isSelected = number.sessionId === selectedSessionId;
          const displayName =
            number.session.name ||
            number.session.profileName ||
            number.session.phoneNumber;
          const StatusIcon = STATUS_ICONS[NORMALIZE_STATUS[number.connectionStatus] || number.connectionStatus];

          return (
            <button
              key={number.sessionId}
              onClick={() => onSelect(number.sessionId)}
              className={`w-full rounded-lg border p-3 text-start transition-all duration-200 ${
                isSelected
                  ? 'border-primary/30 bg-primary/10 shadow-sm dark:border-primary/50 dark:bg-primary/20'
                  : 'border-border/50 bg-card hover:translate-x-0.5 hover:border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    {number.session.phoneNumber}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${resolveConnectionClasses(number.connectionStatus)}`}
                >
                  {StatusIcon && (
                    <StatusIcon
                      className={`size-3 ${
                        number.connectionStatus === 'CONNECTING' ? 'animate-spin' : ''
                      }`}
                    />
                  )}
                  {resolveConnectionLabel(number.connectionStatus)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {number.isConfigured
                    ? number.routingMode === 'NUMBER_OWNER'
                      ? t('whatsappInbox.modeDirect')
                      : t('whatsappInbox.modeRoundRobin')
                    : t('whatsappInbox.modeNotConfigured')}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {t('whatsappInbox.selectedEmployeesCount', {
                    count: number.routingUserIds.length,
                  })}
                </span>
                {!number.isActive && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {t('whatsappInbox.inactiveLabel')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default NumberSidebar;