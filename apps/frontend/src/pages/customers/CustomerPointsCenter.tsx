import React from "react";
import {
  useCustomerPointsController,
  CustomerPointsHeader,
  CustomerPointsTelemetryStrip,
  CustomerPointsTable,
  CustomerPointsActionPanel,
  CustomerPointsCampaignsRibbon,
  CustomerPointsEnrollModal,
  CustomerPointsHistoryModal,
} from "./components/customer-points";

export * from "./components/customer-points/types";

export const CustomerPointsCenter: React.FC = () => {
  const {
    records,
    programs,
    allSystemCustomers,
    isLoading,
    isSubmitting,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedRecords,
    selectedRecordId,
    setSelectedRecordId,
    selectedRecord,
    selectedProgram,
    earningRuleText,
    selectedCurrentPoints,
    nextTier,
    progressToNextTier,
    pointsToNextTier,
    stats,
    actionType,
    setActionType,
    pointsValue,
    setPointsValue,
    reason,
    setReason,
    isEnrollModalOpen,
    setIsEnrollModalOpen,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    enrollData,
    setEnrollData,
    errorMessage,
    successMessage,
    fetchData,
    handleSubmitAction,
    handleEnrollCustomer,
  } = useCustomerPointsController();

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <CustomerPointsHeader
        onOpenEnroll={() => setIsEnrollModalOpen(true)}
        onRefresh={() => void fetchData()}
      />

      {/* Telemetry Strip */}
      <CustomerPointsTelemetryStrip stats={stats} />

      {/* Main Grid: Table (left/2col) + Action Panel (right/1col) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CustomerPointsTable
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          paginatedRecords={paginatedRecords}
          selectedRecordId={selectedRecordId}
          onSelectRecord={setSelectedRecordId}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <CustomerPointsActionPanel
          selectedRecord={selectedRecord}
          selectedProgram={selectedProgram}
          selectedCurrentPoints={selectedCurrentPoints}
          nextTier={nextTier}
          progressToNextTier={progressToNextTier}
          pointsToNextTier={pointsToNextTier}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          actionType={actionType}
          onActionTypeChange={setActionType}
          pointsValue={pointsValue}
          onPointsValueChange={setPointsValue}
          reason={reason}
          onReasonChange={setReason}
          errorMessage={errorMessage}
          successMessage={successMessage}
          isSubmitting={isSubmitting}
          onSubmitAction={() => void handleSubmitAction()}
        />
      </div>

      {/* Campaign Strategy Cards Ribbon */}
      <CustomerPointsCampaignsRibbon
        earningRuleText={earningRuleText}
        atRiskCount={stats.atRiskCount}
        onFilterModeChange={setFilterMode}
      />

      {/* Enroll Modal */}
      <CustomerPointsEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        enrollData={enrollData}
        onEnrollDataChange={setEnrollData}
        allSystemCustomers={allSystemCustomers}
        programs={programs}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onEnrollCustomer={() => void handleEnrollCustomer()}
      />

      {/* History Modal */}
      <CustomerPointsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        selectedRecord={selectedRecord}
      />
    </div>
  );
};

export default CustomerPointsCenter;
