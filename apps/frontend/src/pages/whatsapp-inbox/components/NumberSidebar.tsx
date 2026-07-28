import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
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

const STATUS_DOT: Record<string, string> = {
  CONNECTED: 'bg-success',
  DISCONNECTED: 'bg-destructive',
  CONNECTING: 'bg-warning',
  ERROR: 'bg-destructive',
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
    <div className="flex flex-col rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-foreground">
          {t('whatsappInbox.workspaceNumbersTitle')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {numbers.length}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground ltr:left-2 rtl:right-2" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('whatsappInbox.searchNumbers') as string}
            className="w-full rounded-md border border-border bg-transparent py-1.5 pr-7 text-xs text-foreground outline-none transition-colors focus:border-ring ltr:pl-7 rtl:pr-7"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground ltr:right-1 rtl:left-1"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <div className="flex">
          {(['ALL', 'CONNECTED', 'DISCONNECTED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onStatusFilterChange(f)}
              className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === f
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'ALL'
                ? t('whatsappInbox.filterAll')
                : f === 'CONNECTED'
                  ? t('whatsappInbox.statusConnected')
                  : t('whatsappInbox.statusDisconnected')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex-1 space-y-px overflow-y-auto">
        {filteredNumbers.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
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

          const norm = NORMALIZE_STATUS[number.connectionStatus] || number.connectionStatus;
          const dotColor = STATUS_DOT[norm] || 'bg-muted';

          return (
            <button
              key={number.sessionId}
              onClick={() => onSelect(number.sessionId)}
              className={`flex w-full items-center gap-3 rounded-md border-2 px-2 py-2 text-start transition-colors ${
                isSelected
                  ? 'border-primary/40 bg-primary/15'
                  : 'border-transparent hover:bg-muted'
              }`}
            >
              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  {number.session.phoneNumber}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {number.isConfigured
                    ? number.routingMode === 'NUMBER_OWNER'
                      ? t('whatsappInbox.modeDirect')
                      : t('whatsappInbox.modeRoundRobin')
                    : t('whatsappInbox.modeNotConfigured')}
                </span>
                {!number.isActive && (
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {t('whatsappInbox.inactiveLabel')}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NumberSidebar;
