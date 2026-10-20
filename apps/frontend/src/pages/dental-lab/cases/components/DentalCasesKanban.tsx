import React from "react";
import type { DentalCasesKanbanProps } from "./kanban/types";
import { CASE_STATUSES } from "../../shared";
import { DentalCasesKanbanColumn } from "./kanban/components/DentalCasesKanbanColumn";

export type { DentalCasesKanbanProps };

export const DentalCasesKanban: React.FC<DentalCasesKanbanProps> = ({
  cases,
  selectedCaseIds,
  toggleSelect,
  isCaseOverdue,
  getDaysOverdue,
  applyFilter,
  onAdvanceCase,
  onAssignCase,
  onPrintPanLabel,
  onEditCase,
}) => {
  const activeStages = CASE_STATUSES.filter((s) => s.id !== "CLOSED");

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-4 min-w-[1280px]">
          {activeStages.map((st) => {
            const stageCases = (cases || []).filter((c) => c.status === st.id);
            return (
              <DentalCasesKanbanColumn
                key={st.id}
                stage={st}
                stageCases={stageCases}
                selectedCaseIds={selectedCaseIds}
                toggleSelect={toggleSelect}
                isCaseOverdue={isCaseOverdue}
                getDaysOverdue={getDaysOverdue}
                applyFilter={applyFilter}
                onAdvanceCase={onAdvanceCase}
                onAssignCase={onAssignCase}
                onPrintPanLabel={onPrintPanLabel}
                onEditCase={onEditCase}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 px-1">
        <span>عرض خط الإنتاج (Kanban Pipeline) — إجمالي {cases?.length || 0} حالة</span>
        <span>يمكنك ترقية الحالة إلى المرحلة التالية بضغطة زر واحدة مباشرة</span>
      </div>
    </div>
  );
};

export default DentalCasesKanban;
