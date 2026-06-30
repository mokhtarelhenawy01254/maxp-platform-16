import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
    if (!showInactive) {
      pool = pool.filter((employee) => employee.isActive !== false);
    }
    if (!query.trim()) return pool;

    const q = query.trim().toLowerCase();
    return pool.filter(
      (employee) =>
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q),
    );
  }, [employees, showInactive, query]);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {t('whatsappInbox.workspaceEmployeesTitle')}
          {selectedEmployeeIds.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({selectedEmployeeIds.length})
            </span>
          )}
        </h3>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-48">
            <Search className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-all duration-200 ltr:left-3 rtl:right-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('whatsappInbox.searchEmployees') as string}
              className="w-full rounded-lg border border-border/50 bg-card py-1.5 pr-8 text-sm text-foreground outline-none transition-all duration-200 focus:border-ring focus:ring-1 focus:ring-ring/20 ltr:pl-9 rtl:pr-9"
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

          <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-muted-foreground transition-colors hover:text-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => onToggleInactive(event.target.checked)}
              className="size-4 rounded border-border text-primary transition-all"
            />
            {t('whatsappInbox.showInactiveModerators')}
          </label>
        </div>
      </div>

      {onSelectAll && filteredEmployees.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-b border-border/50 pb-3">
          <button
            type="button"
            onClick={() => onSelectAll(filteredEmployees.map((e) => e.id))}
            className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/20"
          >
            {t('whatsappInbox.selectAll')}
          </button>
          {selectedEmployeeIds.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll([])}
              className="rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/80"
            >
              {t('whatsappInbox.clearSelection')}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {filteredEmployees.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t('whatsappInbox.noEmployeesMatch')}
          </div>
        )}

        {filteredEmployees.map((employee) => {
          const isSelected = selectedEmployeeIds.includes(employee.id);
          const isOwnerMode = routingMode === 'NUMBER_OWNER';

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => onToggleEmployee(employee.id)}
              className={`group relative rounded-lg border p-3 text-start transition-all duration-200 ${
                isSelected
                  ? isOwnerMode
                    ? 'border-primary/40 bg-card shadow-sm dark:border-primary/60'
                    : 'border-secondary/40 bg-card shadow-sm dark:border-secondary/60'
                  : 'border-border/50 bg-card hover:border-border hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-200 ${
                    isSelected
                      ? isOwnerMode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                  }`}
                >
                  {getInitials(employee.firstName, employee.lastName)}
                  {isSelected && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card shadow-sm">
                      <Check className={`size-3 ${isOwnerMode ? 'text-primary' : 'text-secondary'}`} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                    {employee.firstName} {employee.lastName}
                    {employee.isActive === false && (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-border px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                        {t('whatsappInbox.inactiveLabel')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.email}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {resolveRoleLabel(employee.role)}
                  </span>
                  {typeof employee.currentChatCount === 'number' && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {employee.currentChatCount} {t('whatsappInbox.chatsSuffix')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeePicker;