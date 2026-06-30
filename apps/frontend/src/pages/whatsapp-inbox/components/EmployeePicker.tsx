import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { Employee, RoutingMode } from '../types';

interface EmployeePickerProps {
  employees: Employee[];
  selectedEmployeeIds: string[];
  routingMode: RoutingMode;
  showInactive: boolean;
  onToggleInactive: (show: boolean) => void;
  onToggleEmployee: (employeeId: string) => void;
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
    <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {t('whatsappInbox.workspaceEmployeesTitle')}
        </h3>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('whatsappInbox.searchEmployees') as string}
              className="w-full rounded-lg border border-border/50 bg-card py-1.5 text-sm text-foreground outline-none focus:border-ring ltr:pl-9 rtl:pr-9"
            />
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => onToggleInactive(event.target.checked)}
              className="size-4 rounded border-border text-primary"
            />
            {t('whatsappInbox.showInactiveModerators')}
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {filteredEmployees.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {t('whatsappInbox.noEmployeesMatch')}
          </div>
        )}

        {filteredEmployees.map((employee) => {
          const isSelected = selectedEmployeeIds.includes(employee.id);
          const selectedClasses =
            routingMode === 'NUMBER_OWNER'
              ? 'border-emerald-300 bg-card shadow-sm dark:border-emerald-800'
              : 'border-amber-300 bg-card shadow-sm dark:border-amber-800';

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => onToggleEmployee(employee.id)}
              className={`rounded-lg border p-3 text-start transition ${
                isSelected ? selectedClasses : 'border-border/50 bg-card hover:border-border'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {getInitials(employee.firstName, employee.lastName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {employee.firstName} {employee.lastName}
                    {employee.isActive === false && (
                      <span className="ml-1 rounded-full border border-border px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                        {t('whatsappInbox.inactiveLabel')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.email}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
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
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {isSelected ? '✓' : ''}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EmployeePicker;