import React from "react";
import type { DentalLabDoctor, DentalTechnician, DentalWorkType } from "../../shared";
import { DentalCasesQuickPills } from "./DentalCasesQuickPills";
import { DentalCasesDropdowns } from "./DentalCasesDropdowns";
import { DentalCasesFilterModeTabs } from "./filter-bar/DentalCasesFilterModeTabs";
import { DentalCasesFilterSearch } from "./filter-bar/DentalCasesFilterSearch";
import { DentalCasesFilterActions } from "./filter-bar/DentalCasesFilterActions";

export interface DentalCasesFilterBarProps {
  total: number;
  trashCount: number;
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  onViewModeChange: (mode: "ACTIVE" | "OVERDUE" | "TRASH") => void;
  layoutMode: "TABLE" | "KANBAN";
  onLayoutModeChange: (mode: "TABLE" | "KANBAN") => void;
  searchInput: string;
  onSearchInputChange: (val: string) => void;
  onClearSearch: () => void;
  status: string;
  doctorId: string;
  workTypeId: string;
  priority: string;
  paymentStatus: string;
  technicianId: string;
  dateRangePreset: string;
  agendaDate: string;
  agendaField: "receivedDate" | "dueDate";
  activeFiltersCount: number;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  applyFilter: (key: string, value: string, resetOthers?: boolean) => void;
  clearAllFilters: () => void;
  onRefresh: () => void;
  onExportExcel: () => void;
  onOpenKiosk: () => void;
  onOpenQuickOrder: () => void;
  setAgendaDate: (val: string) => void;
  setAgendaField: (field: "receivedDate" | "dueDate") => void;
  setDateRangePreset: (val: string) => void;
  setPriority: (val: string) => void;
  setStatus: (val: string) => void;
  setTechnicianId: (val: string) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export const DentalCasesFilterBar: React.FC<DentalCasesFilterBarProps> = ({
  total,
  trashCount,
  viewMode,
  onViewModeChange,
  layoutMode,
  onLayoutModeChange,
  searchInput,
  onSearchInputChange,
  onClearSearch,
  status,
  doctorId,
  workTypeId,
  priority,
  paymentStatus,
  technicianId,
  dateRangePreset,
  agendaDate,
  agendaField,
  activeFiltersCount,
  doctors,
  workTypes,
  technicians,
  applyFilter,
  clearAllFilters,
  onRefresh,
  onExportExcel,
  onOpenKiosk,
  onOpenQuickOrder,
  setAgendaDate,
  setAgendaField,
  setDateRangePreset,
  setPriority,
  setStatus,
  setTechnicianId,
  setPage,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800/90 border border-slate-200 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5">
      {/* Top Header Row: Title, Segmented Tabs, Search & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <DentalCasesFilterModeTabs
          total={total}
          trashCount={trashCount}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          setPage={setPage}
        />

        <DentalCasesFilterSearch
          searchInput={searchInput}
          onSearchInputChange={onSearchInputChange}
          onClearSearch={onClearSearch}
          setPage={setPage}
        />

        <DentalCasesFilterActions
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
          onOpenKiosk={onOpenKiosk}
          onRefresh={onRefresh}
          onExportExcel={onExportExcel}
          onOpenQuickOrder={onOpenQuickOrder}
        />
      </div>

      {/* Quick Filter Pills Row */}
      <DentalCasesQuickPills
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        priority={priority}
        setPriority={setPriority}
        dateRangePreset={dateRangePreset}
        setDateRangePreset={setDateRangePreset}
        technicianId={technicianId}
        setTechnicianId={setTechnicianId}
        status={status}
        setStatus={setStatus}
        agendaDate={agendaDate}
        setAgendaDate={setAgendaDate}
        doctorId={doctorId}
        workTypeId={workTypeId}
        paymentStatus={paymentStatus}
        applyFilter={applyFilter}
        setPage={setPage}
      />

      {/* All Direct Dropdown Filters & Agenda */}
      <DentalCasesDropdowns
        viewMode={viewMode}
        status={status}
        doctorId={doctorId}
        workTypeId={workTypeId}
        priority={priority}
        paymentStatus={paymentStatus}
        technicianId={technicianId}
        dateRangePreset={dateRangePreset}
        agendaDate={agendaDate}
        agendaField={agendaField}
        activeFiltersCount={activeFiltersCount}
        doctors={doctors}
        workTypes={workTypes}
        technicians={technicians}
        applyFilter={applyFilter}
        clearAllFilters={clearAllFilters}
        setAgendaDate={setAgendaDate}
        setAgendaField={setAgendaField}
        setDateRangePreset={setDateRangePreset}
        setPage={setPage}
      />
    </div>
  );
};

export default DentalCasesFilterBar;
