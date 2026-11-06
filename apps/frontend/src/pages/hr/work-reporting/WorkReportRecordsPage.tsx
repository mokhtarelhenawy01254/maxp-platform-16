import React from "react";
import {
  useWorkReportRecordsController,
  WorkReportRecordsHeaderAndCharts,
  WorkReportRecordsTablesSection,
} from "./records";

const WorkReportRecordsPage: React.FC = () => {
  const {
    loading,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedUserId,
    setSelectedUserId,
    payload,
    fetchRecords,
    visibleFields,
    primaryMetric,
    secondaryMetric,
    chartData,
    employeeChartData,
    exportCsv,
  } = useWorkReportRecordsController();

  if (loading) {
    return (
      <div
        className="min-h-[350px] flex items-center justify-center text-center text-sm text-muted-foreground w-full"
        dir="rtl"
      >
        جاري تحميل السجلات والتحليل...
      </div>
    );
  }

  if (!payload) {
    return (
      <div
        className="min-h-[350px] flex items-center justify-center text-center text-sm text-muted-foreground w-full"
        dir="rtl"
      >
        لا توجد بيانات للعرض.
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
        <WorkReportRecordsHeaderAndCharts
          payload={payload}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          selectedUserId={selectedUserId}
          onSelectedUserIdChange={setSelectedUserId}
          onRefresh={() => void fetchRecords()}
          onExportCsv={exportCsv}
          chartData={chartData}
          employeeChartData={employeeChartData}
          primaryMetric={primaryMetric}
          secondaryMetric={secondaryMetric}
        />

        <WorkReportRecordsTablesSection
          payload={payload}
          visibleFields={visibleFields}
        />
      </div>
    </div>
  );
};

export default WorkReportRecordsPage;
