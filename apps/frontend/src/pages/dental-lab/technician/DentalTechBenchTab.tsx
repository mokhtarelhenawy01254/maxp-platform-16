import React, { useCallback } from "react";
import { DentalTechBenchTabProps } from "./bench/types/dentalTechBenchTypes";
import { useBenchTimers } from "./bench/hooks/useBenchTimers";
import { useBenchCases } from "./bench/hooks/useBenchCases";
import { BenchFilterBar } from "./bench/components/BenchFilterBar";
import { BenchOverdueAlert } from "./bench/components/BenchOverdueAlert";
import { BenchEmptyState } from "./bench/components/BenchEmptyState";
import { BenchCaseCard } from "./bench/components/BenchCaseCard";
import { BenchTable } from "./bench/components/BenchTable";
import { Bench3DViewerModal } from "./bench/components/Bench3DViewerModal";
import { BenchUploadModal } from "./bench/components/BenchUploadModal";

export const DentalTechBenchTab: React.FC<DentalTechBenchTabProps> = ({
  cases,
  onReload,
  initialFilter = "ALL",
}) => {
  const { timers, toggleTimer, fmtTimer } = useBenchTimers();

  const handleStopTimer = useCallback(
    (caseId: string) => {
      if (timers[caseId]?.running) {
        toggleTimer(caseId);
      }
    },
    [timers, toggleTimer]
  );

  const {
    search,
    setSearch,
    filterPriority,
    setFilterPriority,
    viewMode,
    setViewMode,
    busyId,
    safeCases,
    overdueCasesList,
    filteredCases,
    isCaseOverdue,
    getOverdueDays,
    handleAdvance,
    // 3D modal
    active3DAttachment,
    setActive3DAttachment,
    // Upload modal
    uploadCaseId,
    uploadFile,
    setUploadFile,
    uploadingFile,
    handleUploadSubmit,
    openUploadModal,
    closeUploadModal,
  } = useBenchCases({
    cases,
    initialFilter,
    onReload,
    onStopTimer: handleStopTimer,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <BenchFilterBar
        totalCount={safeCases.length}
        overdueCount={overdueCasesList.length}
        filterPriority={filterPriority}
        onFilterChange={setFilterPriority}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Overdue Warning Alert */}
      <BenchOverdueAlert
        overdueCount={overdueCasesList.length}
        filterPriority={filterPriority}
        onFilterOverdue={() => setFilterPriority("OVERDUE")}
      />

      {/* Main List Display */}
      {filteredCases.length === 0 ? (
        <BenchEmptyState
          filterPriority={filterPriority}
          onResetFilter={() => setFilterPriority("ALL")}
        />
      ) : viewMode === "CARDS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredCases.map((c) => (
            <BenchCaseCard
              key={c.id}
              caseItem={c}
              isOverdue={isCaseOverdue(c)}
              overdueDays={getOverdueDays(c)}
              timerState={timers[c.id] || { running: false, elapsedSeconds: 0 }}
              onToggleTimer={toggleTimer}
              fmtTimer={fmtTimer}
              onOpenUpload={openUploadModal}
              onAdvance={handleAdvance}
              isBusy={busyId === c.id}
              onPreview3D={setActive3DAttachment}
            />
          ))}
        </div>
      ) : (
        <BenchTable
          cases={filteredCases}
          isCaseOverdue={isCaseOverdue}
          onAdvance={handleAdvance}
          busyId={busyId}
        />
      )}

      {/* 3D Model Viewer Modal */}
      <Bench3DViewerModal
        attachment={active3DAttachment}
        onClose={() => setActive3DAttachment(null)}
      />

      {/* Upload Modal */}
      <BenchUploadModal
        uploadCaseId={uploadCaseId}
        onClose={closeUploadModal}
        onSubmit={handleUploadSubmit}
        uploadFile={uploadFile}
        onFileChange={setUploadFile}
        uploading={uploadingFile}
      />
    </div>
  );
};

export default DentalTechBenchTab;
