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
    () => selectedEmployeeIds.map((id) => employeeLookup[id]).filter(Boolean) as Employee[],
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
      .filter((e): e is Employee => Boolean(e))
      .filter((e) => showInactive || e.isActive !== false)
      .filter((e) => e.isActive);

    if (candidates.length === 0) {
      onPreviewResult({ nextUserId: null, candidateCount: 0, skippedOffline: 0, skippedOverCapacity: 0 });
      return;
    }
    const cursor = selectedNumber.roundRobinCursor || 0;
    onPreviewResult({
      nextUserId: candidates[cursor % candidates.length]?.id || null,
      candidateCount: candidates.length,
      skippedOffline: 0,
      skippedOverCapacity: 0,
    });
  }, [routingMode, selectedEmployeeIds, selectedNumber, employeeLookup, showInactive, onPreviewResult]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t('whatsappInbox.selectedEmployeesTitle')}
        </h3>
        {selectedEmployees.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('whatsappInbox.selectedEmployeesEmpty')}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedEmployees.map((employee) => (
              <span
                key={employee.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-card text-[7px] font-bold text-primary shadow">
                  {getInitials(employee.firstName, employee.lastName)}
                </span>
                {employee.firstName} {employee.lastName}
              </span>
            ))}
          </div>
        )}
      </div>

      {routingMode === 'ROUND_ROBIN' && selectedEmployeeIds.length >= 2 && (
        <div className="rounded-md border border-secondary/30 bg-secondary/5 p-3">
          <h3 className="text-xs font-semibold text-foreground">
            {t('whatsappInbox.routingPreviewTitle')}
          </h3>

          {previewResult && (
            <div className="mt-2">
              {previewResult.nextUserId ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                    <Users className="size-3" />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {t('whatsappInbox.nextAssignmentWillGoTo', {
                      name:
                        `${employeeLookup[previewResult.nextUserId]?.firstName || ''} ${employeeLookup[previewResult.nextUserId]?.lastName || ''}`.trim() ||
                        t('whatsappInbox.notAvailable'),
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="size-3" />
                  <span className="text-xs font-medium">
                    {t('whatsappInbox.routingPreviewNoCandidate')}
                  </span>
                </div>
              )}
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                <span>{t('whatsappInbox.routingPreviewCandidates', { count: previewResult.candidateCount })}</span>
                {previewResult.skippedOffline > 0 && (
                  <span>{t('whatsappInbox.routingPreviewSkippedOffline', { count: previewResult.skippedOffline })}</span>
                )}
                {previewResult.skippedOverCapacity > 0 && (
                  <span>{t('whatsappInbox.routingPreviewSkippedCapacity', { count: previewResult.skippedOverCapacity })}</span>
                )}
              </div>
            </div>
          )}

          {lastDistributedUser && selectedNumber?.lastDistributedAt && (
            <div className="mt-2 border-t border-secondary/20 pt-2 text-[11px] text-muted-foreground">
              {t('whatsappInbox.lastDistribution')}: {lastDistributedUser.firstName} {lastDistributedUser.lastName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeSummary;
