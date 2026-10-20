import type { DentalLabCase } from "../../../shared";

export interface DentalCasesKanbanProps {
  cases: DentalLabCase[];
  selectedCaseIds: Set<string>;
  toggleSelect: (id: string) => void;
  isCaseOverdue: (c: DentalLabCase) => boolean;
  getDaysOverdue: (c: DentalLabCase) => number;
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onAssignCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
}
