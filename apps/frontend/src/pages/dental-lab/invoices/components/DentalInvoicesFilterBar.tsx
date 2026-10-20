import React from "react";
import type {
  ActiveDoctorStats,
  DentalInvoicesFilterBarProps,
  InvoicesDatePreset,
} from "./filter-bar/types";
import { DentalInvoicesTopHeader } from "./filter-bar/components/DentalInvoicesTopHeader";
import { DentalInvoicesUninvoicedBanner } from "./filter-bar/components/DentalInvoicesUninvoicedBanner";
import { DentalInvoicesDoctorSelector } from "./filter-bar/components/DentalInvoicesDoctorSelector";
import { DentalInvoicesDoctorFinancialStrip } from "./filter-bar/components/DentalInvoicesDoctorFinancialStrip";
import { DentalInvoicesQueryFilters } from "./filter-bar/components/DentalInvoicesQueryFilters";

export type { ActiveDoctorStats, DentalInvoicesFilterBarProps, InvoicesDatePreset };

export const DentalInvoicesFilterBar: React.FC<DentalInvoicesFilterBarProps> = ({
  selectedDoctorId,
  onSelectDoctorId,
  doctors,
  activeDoctor,
  activeDoctorStats,
  uninvoicedSummary,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  datePreset,
  onDatePresetChange,
  fetchedCount,
  onCreateInvoice,
  onExportExcel,
  onBatchInvoice,
  onOpenSettlement,
  onRefresh,
  onOpenStatement,
  onBulkPayment,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <DentalInvoicesTopHeader
        onCreateInvoice={onCreateInvoice}
        onExportExcel={onExportExcel}
        onBatchInvoice={onBatchInvoice}
        onOpenSettlement={onOpenSettlement}
        onRefresh={onRefresh}
        selectedDoctorId={selectedDoctorId}
        uninvoicedCasesCount={uninvoicedSummary?.totalCases}
      />

      {/* Uninvoiced Billing Banner */}
      {uninvoicedSummary && uninvoicedSummary.totalCases > 0 && !selectedDoctorId && (
        <DentalInvoicesUninvoicedBanner
          uninvoicedSummary={uninvoicedSummary}
          onBatchInvoice={onBatchInvoice}
        />
      )}

      {/* Doctor Selection Bar & Active Doctor Dashboard */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 sm:p-4 shadow-sm space-y-3">
        <DentalInvoicesDoctorSelector
          selectedDoctorId={selectedDoctorId}
          onSelectDoctorId={onSelectDoctorId}
          doctors={doctors}
          activeDoctor={activeDoctor}
          activeDoctorStats={activeDoctorStats}
          onOpenStatement={onOpenStatement}
          onOpenSettlement={onOpenSettlement}
          onBulkPayment={onBulkPayment}
        />

        {/* Selected Doctor Financial Strip */}
        {activeDoctor && activeDoctorStats && (
          <DentalInvoicesDoctorFinancialStrip stats={activeDoctorStats} />
        )}
      </div>

      {/* Filters Bar */}
      <DentalInvoicesQueryFilters
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        datePreset={datePreset}
        onDatePresetChange={onDatePresetChange}
        fetchedCount={fetchedCount}
      />
    </div>
  );
};

export default DentalInvoicesFilterBar;
