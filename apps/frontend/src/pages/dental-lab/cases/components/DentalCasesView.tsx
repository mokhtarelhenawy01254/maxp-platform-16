import React from "react";
import { DentalCasesTable } from "./DentalCasesTable";
import { DentalCasesKanban } from "./DentalCasesKanban";
import type { DentalCase } from "../../shared";

export interface DentalCasesViewProps {
  layoutMode: "TABLE" | "KANBAN";
  viewMode: string;
  cases: DentalCase[];
  selectedCaseIds: Set<string>;
  toggleSelect: (caseId: string) => void;
  toggleSelectAllPage: () => void;
  actionBusyId: string | null;
  isCaseOverdue: (c: DentalCase) => boolean;
  getDaysOverdue: (c: DentalCase) => number;
  applyFilter: (key: string, val: string | null) => void;
  onAdvanceCase: (c: DentalCase) => void;
  onAssignCase: (c: DentalCase) => void;
  onEditCase: (c: DentalCase) => void;
  onInspectCase: (c: DentalCase) => void;
  onPrintPanLabel: (caseId: string) => void;
  onTrashCase: (c: DentalCase) => void;
  onRestoreCase: (c: DentalCase) => void;
  onPermanentDelete: (c: DentalCase) => void;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
}

export const DentalCasesView: React.FC<DentalCasesViewProps> = ({
  layoutMode,
  viewMode,
  cases,
  selectedCaseIds,
  toggleSelect,
  toggleSelectAllPage,
  actionBusyId,
  isCaseOverdue,
  getDaysOverdue,
  applyFilter,
  onAdvanceCase,
  onAssignCase,
  onEditCase,
  onInspectCase,
  onPrintPanLabel,
  onTrashCase,
  onRestoreCase,
  onPermanentDelete,
  page,
  totalPages,
  setPage,
}) => {
  if (layoutMode === "KANBAN" && viewMode === "ACTIVE") {
    return (
      <DentalCasesKanban
        cases={cases}
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
  }

  return (
    <DentalCasesTable
      cases={cases}
      viewMode={viewMode}
      selectedCaseIds={selectedCaseIds}
      toggleSelect={toggleSelect}
      toggleSelectAllPage={toggleSelectAllPage}
      actionBusyId={actionBusyId}
      isCaseOverdue={isCaseOverdue}
      getDaysOverdue={getDaysOverdue}
      onInspectCase={onInspectCase}
      onAdvanceCase={onAdvanceCase}
      onEditCase={onEditCase}
      onPrintPanLabel={onPrintPanLabel}
      onTrashCase={onTrashCase}
      onRestoreCase={onRestoreCase}
      onPermanentDelete={onPermanentDelete}
      page={page}
      totalPages={totalPages}
      setPage={setPage}
    />
  );
};

export default DentalCasesView;
