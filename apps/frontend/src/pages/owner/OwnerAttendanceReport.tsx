import React from "react";
import {
  OwnerAttendanceEmployeeViews,
  OwnerAttendanceHeaderAndFilters,
  OwnerAttendanceReportModal,
  useOwnerAttendanceReportController,
} from "./attendance-report";

const OwnerAttendanceReport: React.FC = () => {
  const {
    isLoading,
    isExporting,
    reportData,
    searchQuery,
    setSearchQuery,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    viewMode,
    setViewMode,
    expandedEmployees,
    sortBy,
    setSortBy,
    showReportModal,
    setShowReportModal,
    reportOptions,
    setReportOptions,
    isGeneratingReport,
    selectedPreset,
    setSelectedPreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handlePresetChange,
    companies,
    filteredEmployees,
    toggleEmployeeExpand,
    handleGenerateReport,
    handleExport,
  } = useOwnerAttendanceReportController();

  if (isLoading && !reportData) {
    return (
      <div className="space-y-6 w-full pb-8">
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <OwnerAttendanceHeaderAndFilters
        selectedPreset={selectedPreset}
        onPresetChange={handlePresetChange}
        startDate={startDate}
        onStartDateChange={(val) => {
          setStartDate(val);
          setSelectedPreset("custom");
        }}
        endDate={endDate}
        onEndDateChange={(val) => {
          setEndDate(val);
          setSelectedPreset("custom");
        }}
        onOpenReportModal={() => setShowReportModal(true)}
        onExport={handleExport}
        isExporting={isExporting}
        overview={reportData?.overview}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCompanyFilter={selectedCompanyFilter}
        onCompanyFilterChange={setSelectedCompanyFilter}
        companies={companies}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filteredCount={filteredEmployees.length}
      />

      <OwnerAttendanceEmployeeViews
        viewMode={viewMode}
        filteredEmployees={filteredEmployees}
        expandedEmployees={expandedEmployees}
        onToggleExpand={toggleEmployeeExpand}
      />

      <OwnerAttendanceReportModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportOptions={reportOptions}
        onOptionsChange={setReportOptions}
        startDate={startDate}
        endDate={endDate}
        filteredCount={filteredEmployees.length}
        isGeneratingReport={isGeneratingReport}
        onGenerateReport={handleGenerateReport}
      />
    </div>
  );
};

export default OwnerAttendanceReport;
