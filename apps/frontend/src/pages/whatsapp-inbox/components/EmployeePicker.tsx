import { useTranslation } from 'react-i18next';
import React, { useMemo, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import type { Employee, RoutingMode } from '../types';

interface EmployeePickerProps {
  employees: Employee[];
  selectedEmployeeIds: string[];
  routingMode: RoutingMode;
  showInactive: boolean;
  onToggleInactive: (show: boolean) => void;
  onToggleEmployee: (employeeId: string) => void;
  onSelectAll?: (employeeIds: string[]) => void;
}

const getInitials = (firstName = '', lastName = '') =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'U';

const accentClasses: Record<string, { border: string; bg: string; avatar: string; avatarText: string; check: string; ring: string }> = {
  primary: {
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    avatar: 'bg-primary text-primary-foreground',
    avatarText: 'text-primary-foreground',
    check: 'text-primary',
    ring: 'ring-primary/30',
  },
  secondary: {
    border: 'border-secondary/50',
    bg: 'bg-secondary/10',
    avatar: 'bg-secondary text-secondary-foreground',
    avatarText: 'text-secondary-foreground',
    check: 'text-secondary',
    ring: 'ring-secondary/30',
  },
  tertiary: {
    border: 'border-tertiary/50',
    bg: 'bg-tertiary/10',
    avatar: 'bg-tertiary text-tertiary-foreground',
    avatarText: 'text-tertiary-foreground',
    check: 'text-tertiary',
    ring: 'ring-tertiary/30',
  },
};

const getAccent = (mode: RoutingMode) =>
  mode === 'NUMBER_OWNER' ? accentClasses.primary : mode === 'SHARED_INBOX' ? accentClasses.tertiary : accentClasses.secondary;

const EmployeePicker: React.FC<EmployeePickerProps> = ({
  employees,
  selectedEmployeeIds,
  routingMode,
  showInactive,
  onToggleInactive,
  onToggleEmployee,
  onSelectAll,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const accent = getAccent(routingMode);

  const resolveRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      AGENT: t('whatsappInbox.moderator'),
      MANAGER: t('whatsappInbox.teamLeader'),
      COMPANY_ADMIN: t('whatsappInbox.admin'),
      OWNER: t('whatsappInbox.owner'),
      SUPER_ADMIN: t('whatsappInbox.superAdmin'),
    };
    return labels[role] || role;
  };

  const filteredEmployees = useMemo(() => {
    let pool = employees;
    if (!showInactive) pool = pool.filter((e) => e.isActive !== false);
    if (!query.trim()) return pool;
    const q = query.trim().toLowerCase();
    return pool.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q),
    );
  }, [employees, showInactive, query]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">
            {routingMode === 'NUMBER_OWNER'
              ? t('whatsappInbox.workspaceEmployeesDirectHint')
              : routingMode === 'SHARED_INBOX'
                ? t('whatsappInbox.workspaceEmployeesSharedInboxHint')
                : t('whatsappInbox.workspaceEmployeesRoundRobinHint')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 size-3 -translate-y-1/2 text-muted-foreground ltr:left-2 rtl:right-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('whatsappInbox.searchEmployees') as string}
              className="w-32 rounded-md border border-border bg-transparent py-1 pr-6 text-xs text-foreground outline-none transition-colors focus:border-ring ltr:pl-6 rtl:pr-6"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground ltr:right-1 rtl:left-1"
              >
                <X className="size-2.5" />
              </button>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => onToggleInactive(e.target.checked)}
              className="size-3 rounded border-border text-primary"
            />
            {t('whatsappInbox.showInactiveModerators')}
          </label>
        </div>
      </div>

      {onSelectAll && filteredEmployees.length > 0 && (
        <div className="mt-2 flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => onSelectAll(filteredEmployees.map((e) => e.id))}
            className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
          >
            {t('whatsappInbox.selectAll')}
          </button>
          {selectedEmployeeIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll([])}
              className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/80"
            >
              {t('whatsappInbox.clearSelection')}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {filteredEmployees.length === 0 && (
          <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
            {t('whatsappInbox.noEmployeesMatch')}
          </div>
        )}

        {filteredEmployees.map((employee) => {
          const isSelected = selectedEmployeeIds.includes(employee.id);

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => onToggleEmployee(employee.id)}
              className={`flex items-center gap-2 rounded-md border-2 px-3 py-2 text-start transition-colors ${
                isSelected
                  ? `${accent.border} ${accent.bg} ring-1 ${accent.ring}`
                  : 'border-border hover:border-border/80 hover:bg-muted'
              }`}
            >
              <div className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                isSelected
                  ? accent.avatar
                  : 'bg-muted text-muted-foreground'
              }`}>
                {getInitials(employee.firstName, employee.lastName)}
                {isSelected && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-card shadow">
                    <Check className={`size-2 ${accent.check}`} />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {employee.firstName} {employee.lastName}
                  {employee.isActive === false && (
                    <span className="ml-1 inline rounded border border-border px-1 py-0 text-[9px] font-medium text-muted-foreground">
                      {t('whatsappInbox.inactiveLabel')}
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                  <span>{resolveRoleLabel(employee.role)}</span>
                  {typeof employee.currentChatCount === 'number' && (
                    <span>· {employee.currentChatCount} {t('whatsappInbox.chatsSuffix')}</span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeePicker;
