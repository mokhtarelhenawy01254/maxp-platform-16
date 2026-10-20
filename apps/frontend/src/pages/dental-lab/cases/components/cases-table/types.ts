import type { DentalLabCase } from "../../../shared";

export type DentalCasesTableViewMode = "ACTIVE" | "OVERDUE" | "TRASH";

export interface DentalCasesTableProps {
  cases: DentalLabCase[];
  viewMode: DentalCasesTableViewMode;
  selectedCaseIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAllPage: () => void;
  actionBusyId: string | null;
  isCaseOverdue: (c: DentalLabCase) => boolean;
  getDaysOverdue: (c: DentalLabCase) => number;
  onInspectCase: (c: DentalLabCase) => void;
  onAdvanceCase: (c: DentalLabCase) => void;
  onEditCase: (c: DentalLabCase) => void;
  onPrintPanLabel: (c: DentalLabCase) => void;
  onTrashCase: (c: DentalLabCase) => void;
  onRestoreCase: (c: DentalLabCase) => void;
  onPermanentDelete: (c: DentalLabCase) => void;
  page: number;
  totalPages: number;
  setPage: (p: number | ((prev: number) => number)) => void;
}
