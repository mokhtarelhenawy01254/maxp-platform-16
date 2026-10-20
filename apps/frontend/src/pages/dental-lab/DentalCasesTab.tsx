import { Loader2 } from "lucide-react";
import QuickOrderModal from "./QuickOrderModal";
import DentalCaseInspector from "./DentalCaseInspector";
import { useDentalCases } from "./cases/hooks/useDentalCases";
import { DentalCasesFilterBar } from "./cases/components/DentalCasesFilterBar";
import { DentalCasesBulkBar } from "./cases/components/DentalCasesBulkBar";
import { DentalCasesTable } from "./cases/components/DentalCasesTable";
import { DentalCasesKanban } from "./cases/components/DentalCasesKanban";
import { DentalCaseCreateModal } from "./cases/modals/DentalCaseCreateModal";
import { DentalCaseAdvanceModal } from "./cases/modals/DentalCaseAdvanceModal";
import { DentalCaseAssignModal } from "./cases/modals/DentalCaseAssignModal";
import { DentalCaseInvoiceModal } from "./cases/modals/DentalCaseInvoiceModal";
import { DentalCaseKioskScannerModal } from "./cases/modals/DentalCaseKioskScannerModal";

export function DentalCasesTab() {
  const {
    cases,
    total,
    trashCount,
    loading,
    status,
    setStatus,
    doctorId,
    workTypeId,
    priority,
    setPriority,
    paymentStatus,
    technicianId,
    setTechnicianId,
    dateRangePreset,
    setDateRangePreset,
    agendaDate,
    setAgendaDate,
    agendaField,
    setAgendaField,
    searchInput,
    setSearchInput,
    page,
    setPage,
    viewMode,
    setViewMode,
    actionBusyId,
    layoutMode,
    setLayoutMode,
    totalPages,
    doctors,
    workTypes,
    technicians,
    createOpen,
    setCreateOpen,
    kioskOpen,
    setKioskOpen,
    editingCase,
    setEditingCase,
    advanceCaseData,
    setAdvanceCaseData,
    assignCaseData,
    setAssignCaseData,
    invoiceCase,
    setInvoiceCase,
    quickOrderOpen,
    setQuickOrderOpen,
    uploadingId,
    selectedCase,
    selectedCaseIds,
    setSelectedCaseIds,
    bulkBusy,
    bulkStatusTarget,
    setBulkStatusTarget,
    bulkTechTarget,
    setBulkTechTarget,
    bulkPriorityTarget,
    setBulkPriorityTarget,
    bulkDoctorTarget,
    setBulkDoctorTarget,
    activeFiltersCount,
    applyFilter,
    clearAllFilters,
    refresh,
    toggleSelect,
    toggleSelectAllPage,
    handleBulkAdvance,
    handleBulkAssign,
    handleBulkPriority,
    handleBulkTrash,
    handleBulkRestore,
    handleBulkTransferDoctor,
    handleExportCasesExcel,
    handleSaved,
    handleTrashCase,
    handleRestoreCase,
    handlePermanentDelete,
    handleUpload,
    handlePrintPanLabel,
    handlePrintWorkOrder,
    isCaseOverdue,
    getDaysOverdue,
    inspectorOpen,
    setInspectorOpen,
    setSelectedCaseId,
  } = useDentalCases();

  if (loading && !cases) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-sm font-medium">جاري تحميل حالات المعمل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Command Bar */}
      <DentalCasesFilterBar
        total={total}
        trashCount={trashCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onClearSearch={() => setSearchInput("")}
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
        onRefresh={() => refresh()}
        onExportExcel={handleExportCasesExcel}
        onOpenKiosk={() => setKioskOpen(true)}
        onOpenQuickOrder={() => setQuickOrderOpen(true)}
        setAgendaDate={setAgendaDate}
        setAgendaField={setAgendaField}
        setDateRangePreset={setDateRangePreset}
        setPriority={setPriority}
        setStatus={setStatus}
        setTechnicianId={setTechnicianId}
        setPage={setPage}
      />

      {/* Bulk Operations Sticky Floating Bar */}
      {selectedCaseIds.size > 0 && (
        <DentalCasesBulkBar
          selectedCaseIds={selectedCaseIds}
          onClearSelection={() => setSelectedCaseIds(new Set())}
          viewMode={viewMode}
          bulkStatusTarget={bulkStatusTarget}
          onBulkStatusTargetChange={setBulkStatusTarget}
          bulkTechTarget={bulkTechTarget}
          onBulkTechTargetChange={setBulkTechTarget}
          bulkPriorityTarget={bulkPriorityTarget}
          onBulkPriorityTargetChange={setBulkPriorityTarget}
          bulkDoctorTarget={bulkDoctorTarget}
          onBulkDoctorTargetChange={setBulkDoctorTarget}
          bulkBusy={bulkBusy}
          technicians={technicians}
          doctors={doctors}
          onBulkAdvance={handleBulkAdvance}
          onBulkAssign={handleBulkAssign}
          onBulkPriority={handleBulkPriority}
          onBulkTransferDoctor={handleBulkTransferDoctor}
          onBulkTrash={handleBulkTrash}
          onBulkRestore={handleBulkRestore}
        />
      )}

      {/* Main View: Kanban or Table */}
      {layoutMode === "KANBAN" && viewMode === "ACTIVE" ? (
        <DentalCasesKanban
          cases={cases || []}
          selectedCaseIds={selectedCaseIds}
          toggleSelect={toggleSelect}
          isCaseOverdue={isCaseOverdue}
          getDaysOverdue={getDaysOverdue}
          applyFilter={applyFilter}
          onAdvanceCase={setAdvanceCaseData}
          onAssignCase={setAssignCaseData}
          onPrintPanLabel={handlePrintPanLabel}
          onEditCase={(c) => {
            setEditingCase(c);
            setCreateOpen(true);
          }}
        />
      ) : (
        <DentalCasesTable
          cases={cases || []}
          viewMode={viewMode}
          selectedCaseIds={selectedCaseIds}
          toggleSelect={toggleSelect}
          toggleSelectAllPage={toggleSelectAllPage}
          actionBusyId={actionBusyId}
          isCaseOverdue={isCaseOverdue}
          getDaysOverdue={getDaysOverdue}
          onInspectCase={(c) => {
            setSelectedCaseId(c.id);
            setInspectorOpen(true);
          }}
          onAdvanceCase={setAdvanceCaseData}
          onEditCase={(c) => {
            setEditingCase(c);
            setCreateOpen(true);
          }}
          onPrintPanLabel={handlePrintPanLabel}
          onTrashCase={handleTrashCase}
          onRestoreCase={handleRestoreCase}
          onPermanentDelete={handlePermanentDelete}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      )}

      {/* Modal Dialogs */}
      {createOpen && (
        <DentalCaseCreateModal
          initial={editingCase}
          doctors={doctors}
          workTypes={workTypes}
          technicians={technicians}
          onClose={() => {
            setCreateOpen(false);
            setEditingCase(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {kioskOpen && (
        <DentalCaseKioskScannerModal
          technicians={technicians}
          onClose={() => setKioskOpen(false)}
          onScanned={() => refresh({ silent: true })}
        />
      )}

      {quickOrderOpen && (
        <QuickOrderModal
          onClose={() => setQuickOrderOpen(false)}
          onSaved={() => {
            setQuickOrderOpen(false);
            refresh({ silent: true });
          }}
        />
      )}

      {advanceCaseData && (
        <DentalCaseAdvanceModal
          caseData={advanceCaseData}
          technicians={technicians}
          onClose={() => setAdvanceCaseData(null)}
          onSaved={() => {
            setAdvanceCaseData(null);
            refresh({ silent: true });
          }}
        />
      )}

      {assignCaseData && (
        <DentalCaseAssignModal
          caseData={assignCaseData}
          technicians={technicians}
          onClose={() => setAssignCaseData(null)}
          onSaved={() => {
            setAssignCaseData(null);
            refresh({ silent: true });
          }}
        />
      )}

      {invoiceCase && (
        <DentalCaseInvoiceModal
          caseData={invoiceCase}
          onClose={() => setInvoiceCase(null)}
          onSaved={() => {
            setInvoiceCase(null);
            refresh({ silent: true });
          }}
        />
      )}

      {/* On-Demand Slide-over Quick Inspector Drawer */}
      {inspectorOpen && selectedCase && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setInspectorOpen(false)}
        >
          <div
            className="w-full sm:w-[500px] md:w-[540px] bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-r dark:border-gray-800 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <DentalCaseInspector
              caseData={selectedCase}
              onClose={() => setInspectorOpen(false)}
              onAdvance={setAdvanceCaseData}
              onAssign={setAssignCaseData}
              onEdit={(c) => {
                setEditingCase(c);
                setCreateOpen(true);
              }}
              onInvoice={setInvoiceCase}
              onUpload={handleUpload}
              onPrintPanLabel={handlePrintPanLabel}
              onPrintWorkOrder={handlePrintWorkOrder}
              onTrash={handleTrashCase}
              isBusy={actionBusyId === selectedCase.id}
              uploadingId={uploadingId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DentalCasesTab;
