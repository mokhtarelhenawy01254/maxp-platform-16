import React from "react";
import type { DentalCasesTableProps, DentalCasesTableViewMode } from "./cases-table/types";
import { DentalCasesTableHeader } from "./cases-table/components/DentalCasesTableHeader";
import { DentalCasesTableRow } from "./cases-table/components/DentalCasesTableRow";
import { DentalCasesTablePagination } from "./cases-table/components/DentalCasesTablePagination";

export type { DentalCasesTableProps, DentalCasesTableViewMode };

export const DentalCasesTable: React.FC<DentalCasesTableProps> = ({
  cases,
  viewMode,
  selectedCaseIds,
  toggleSelect,
  toggleSelectAllPage,
  actionBusyId,
  isCaseOverdue,
  getDaysOverdue,
  onInspectCase,
  onAdvanceCase,
  onEditCase,
  onPrintPanLabel,
  onTrashCase,
  onRestoreCase,
  onPermanentDelete,
  page,
  totalPages,
  setPage,
}) => {
  const isAllSelected = cases.length > 0 && cases.every((c) => selectedCaseIds.has(c.id));

  return (
    <div className="space-y-3">
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xs border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <DentalCasesTableHeader
              isAllSelected={isAllSelected}
              onToggleSelectAll={toggleSelectAllPage}
            />
            <tbody>
              {cases.map((c) => {
                const overdue = isCaseOverdue(c);
                const daysOverdue = overdue ? getDaysOverdue(c) : 0;
                const isBusy = actionBusyId === c.id;
                const isSelected = selectedCaseIds.has(c.id);

                return (
                  <DentalCasesTableRow
                    key={c.id}
                    dentalCase={c}
                    viewMode={viewMode}
                    isSelected={isSelected}
                    isOverdue={overdue}
                    daysOverdue={daysOverdue}
                    isBusy={isBusy}
                    toggleSelect={toggleSelect}
                    onInspectCase={onInspectCase}
                    onAdvanceCase={onAdvanceCase}
                    onEditCase={onEditCase}
                    onPrintPanLabel={onPrintPanLabel}
                    onTrashCase={onTrashCase}
                    onRestoreCase={onRestoreCase}
                    onPermanentDelete={onPermanentDelete}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DentalCasesTablePagination
        page={page}
        totalPages={totalPages}
        setPage={setPage}
      />
    </div>
  );
};

export default DentalCasesTable;
