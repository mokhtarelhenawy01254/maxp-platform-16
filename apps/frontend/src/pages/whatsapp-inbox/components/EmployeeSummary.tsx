import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Users } from 'lucide-react';
import type { Employee, PreviewResult, RoutingMode, WorkspaceNumber } from '../types';

interface EmployeeSummaryProps {
  selectedEmployeeIds: string[];
  employeeLookup: Record<string, Employee>;
  routingMode: RoutingMode;
  selectedNumber: WorkspaceNumber | null;
  showInactive: boolean;
  previewResult: PreviewResult | null;
  onPreviewResult: (result: PreviewResult | null) => void;
}

const getInitials = (firstName = '', lastName = '') =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || 'U';

const EmployeeSummary: React.FC<EmployeeSummaryProps> = ({
  selectedEmployeeIds,
  employeeLookup,
  routingMode,
  selectedNumber,
  showInactive,
  previewResult,
  onPreviewResult,
}) => {
  const { t } = useTranslation();

  const selectedEmployees = useMemo(
    () =>
      selectedEmployeeIds
        .map((id) => employeeLookup[id])
        .filter(Boolean) as Employee[],
    [selectedEmployeeIds, employeeLookup],
  );

  const lastDistributedUser = useMemo(() => {
    if (!selectedNumber?.lastDistributedUserId) return null;
    return employeeLookup[selectedNumber.lastDistributedUserId] || null;
  }, [employeeLookup, selectedNumber?.lastDistributedUserId]);

  useEffect(() => {
    if (routingMode !== 'ROUND_ROBIN' || selectedEmployeeIds.length < 2 || !selectedNumber) {
      onPreviewResult(null);
      return;
    }

    const candidates = selectedEmployeeIds
      .map((id) => employeeLookup[id])
      .filter((employee): employee is Employee => Boolean(employee))
      .filter((employee) => showInactive || employee.isActive !== false)
      .filter((employee) => employee.isActive);

    if (candidates.length === 0) {
      onPreviewResult({
        nextUserId: null,
        candidateCount: 0,
        skippedOffline: 0,
        skippedOverCapacity: 0,
      });
      return;
    }

    const cursor = selectedNumber.roundRobinCursor || 0;
    const picked = candidates[cursor % candidates.length];

    onPreviewResult({
      nextUserId: picked?.id || null,
      candidateCount: candidates.length,
      skippedOffline: 0,
      skippedOverCapacity: 0,
    });
  }, [
    routingMode,
    selectedEmployeeIds,
    selectedNumber,
    employeeLookup,
    showInactive,
    onPreviewResult,
  ]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">
          {t('whatsappInbox.selectedEmployeesTitle')}
        </h3>

        {selectedEmployees.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t('whatsappInbox.selectedEmployeesEmpty')}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedEmployees.map((employee) => (
              <span
                key={employee.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-card text-[9px] font-bold text-primary">
                  {getInitials(employee.firstName, employee.lastName)}
                </span>
                <span>
                  {employee.firstName} {employee.lastName}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {routingMode === 'ROUND_ROBIN' && selectedEmployeeIds.length >= 2 && (
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <h3 className="text-base font-semibold text-foreground">
            {t('whatsappInbox.routingPreviewTitle')}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('whatsappInbox.routingPreviewDescription')}
          </p>

          {previewResult && (
            <div className="mt-3 rounded-lg border border-border/50 bg-muted p-3">
              {previewResult.nextUserId ? (
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {t('whatsappInbox.nextAssignmentWillGoTo', {
                      name:
                        `${employeeLookup[previewResult.nextUserId]?.firstName || ''} ${employeeLookup[previewResult.nextUserId]?.lastName || ''}`.trim() ||
                        t('whatsappInbox.notAvailable'),
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="size-4" />
                  <span className="text-sm font-medium">
                    {t('whatsappInbox.routingPreviewNoCandidate')}
                  </span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  {t('whatsappInbox.routingPreviewCandidates', {
                    count: previewResult.candidateCount,
                  })}
                </span>
                {previewResult.skippedOffline > 0 && (
                  <span>
                    {t('whatsappInbox.routingPreviewSkippedOffline', {
                      count: previewResult.skippedOffline,
                    })}
                  </span>
                )}
                {previewResult.skippedOverCapacity > 0 && (
                  <span>
                    {t('whatsappInbox.routingPreviewSkippedCapacity', {
                      count: previewResult.skippedOverCapacity,
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {lastDistributedUser && selectedNumber?.lastDistributedAt && (
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t('whatsappInbox.lastDistribution')}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {lastDistributedUser.firstName} {lastDistributedUser.lastName}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeSummary;