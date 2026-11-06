import React from "react";
import { Tabs } from "@/components/ui/tabs";
import {
  useHRReportsController,
  HRReportsHeader,
  HRReportsFilters,
  HRReportsTabsList,
  AttendanceReportTab,
  LeavesReportTab,
  PayrollReportTab,
  WarningsReportTab,
  TrainingReportTab,
  PerformanceReportTab,
  KpiReportTab,
  LateAbsenceReportTab,
  OvertimeReportTab,
  TurnoverReportTab,
  EmployeeDemographicsTab,
} from "./hr-reports/index";

export const HRReports: React.FC = () => {
  const {
    loading,
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    attendanceReport,
    leaveReport,
    payrollReport,
    warningReport,
    trainingReport,
    performanceReport,
    fetchReport,
    handleExport,
  } = useHRReportsController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Header */}
      <HRReportsHeader
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onRefresh={fetchReport}
        onExport={handleExport}
      />

      {/* Filters */}
      <HRReportsFilters
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <HRReportsTabsList />

        {/* Tab Contents */}
        <AttendanceReportTab
          loading={loading}
          attendanceReport={attendanceReport}
        />
        <LeavesReportTab loading={loading} leaveReport={leaveReport} />
        <PayrollReportTab
          loading={loading}
          payrollReport={payrollReport}
        />
        <WarningsReportTab
          loading={loading}
          warningReport={warningReport}
        />
        <TrainingReportTab
          loading={loading}
          trainingReport={trainingReport}
        />
        <PerformanceReportTab
          loading={loading}
          performanceReport={performanceReport}
        />
        <KpiReportTab />
        <LateAbsenceReportTab />
        <OvertimeReportTab />
        <TurnoverReportTab />
        <EmployeeDemographicsTab />
      </Tabs>
    </div>
  );
};

export default HRReports;
