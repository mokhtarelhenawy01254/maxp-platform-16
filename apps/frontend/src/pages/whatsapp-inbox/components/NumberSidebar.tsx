import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { WorkspaceNumber } from '../types';

interface NumberSidebarProps {
  numbers: WorkspaceNumber[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

const resolveConnectionClasses = (status: string): string => {
  const styles: Record<string, string> = {
    CONNECTED:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    DISCONNECTED:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
    CONNECTING:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    ERROR:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
  };
  return (
    styles[status] ||
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
  );
};

const NumberSidebar: React.FC<NumberSidebarProps> = ({
  numbers,
  selectedSessionId,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONNECTED' | 'DISCONNECTED'>('ALL');

  const resolveConnectionLabel = (status: string) => {
    const labels: Record<string, string> = {
      CONNECTED: t('whatsappInbox.statusConnected'),
      DISCONNECTED: t('whatsappInbox.statusDisconnected'),
      CONNECTING: t('whatsappInbox.statusConnecting'),
      ERROR: t('whatsappInbox.statusError'),
    };
    return labels[status] || status;
  };

  const filteredNumbers = useMemo(() => {
    return numbers.filter((number) => {
      if (statusFilter === 'CONNECTED' && number.connectionStatus !== 'CONNECTED') return false;
      if (statusFilter === 'DISCONNECTED' && number.connectionStatus === 'CONNECTED') return false;

      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const name = (number.session.name || number.session.profileName || '').toLowerCase();
      const phone = number.session.phoneNumber.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [numbers, query, statusFilter]);

  return (
    <section className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="border-b border-border/50 px-4 py-4">
        <h2 className="text-base font-semibold text-foreground">
          {t('whatsappInbox.workspaceNumbersTitle')}
        </h2>

        <div className="mt-3 space-y-2">
          <div className="relative">
            <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('whatsappInbox.searchNumbers')}
              className="w-full rounded-lg border border-border/50 bg-card py-2 text-sm text-foreground outline-none focus:border-ring ltr:pl-9 rtl:pr-9"
            />
          </div>

          <div className="flex gap-1.5">
            {(['ALL', 'CONNECTED', 'DISCONNECTED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === filter
                    ? 'bg-primary text-primary-foreground'
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
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
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

          return (
            <button
              key={number.sessionId}
              onClick={() => onSelect(number.sessionId)}
              className={`w-full rounded-lg border p-3 text-start transition ${
                isSelected
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20'
                  : 'border-border/50 bg-card hover:border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    {number.session.phoneNumber}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${resolveConnectionClasses(number.connectionStatus)}`}
                >
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