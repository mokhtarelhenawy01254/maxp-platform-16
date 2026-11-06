import React from "react";
import { toast } from "sonner";
import {
  useTeamPerformance360Controller,
  TeamPerformance360Header,
  TeamPerformance360KPIs,
  TeamPerformance360Filters,
  TeamPerformance360Table,
  PerformanceDrilldownDialog,
  PerformancePIPModal,
} from "./team-performance-360/index";

export const TeamPerformance360Page: React.FC = () => {
  const {
    loading,
    data,
    searchQuery,
    setSearchQuery,
    selectedTier,
    setSelectedTier,
    selectedDepartment,
    setSelectedDepartment,
    selectedPeriodMode,
    setSelectedPeriodMode,
    selectedEmployeeForPIP,
    setSelectedEmployeeForPIP,
    selectedEmployeeForDrilldown,
    setSelectedEmployeeForDrilldown,
    fetchLeaderboard,
    departments,
    filteredEmployees,
  } = useTeamPerformance360Controller();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Top Header */}
      <TeamPerformance360Header
        selectedPeriodMode={selectedPeriodMode}
        onPeriodModeChange={setSelectedPeriodMode}
        activePeriodLabel={data?.period || "الفترة النشطة"}
        loading={loading}
        onRefresh={fetchLeaderboard}
      />

      {/* KPI Overview Cards */}
      <TeamPerformance360KPIs summary={data?.summary} />

      {/* Filter and Search Bar */}
      <TeamPerformance360Filters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        selectedDepartment={selectedDepartment}
        onDepartmentChange={setSelectedDepartment}
        departments={departments}
      />

      {/* Leaderboard Table Card */}
      <TeamPerformance360Table
        employees={filteredEmployees}
        totalCount={data?.leaderboard.length ?? 0}
        onSelectForDrilldown={setSelectedEmployeeForDrilldown}
        onSelectForPIP={setSelectedEmployeeForPIP}
      />

      {/* Drill-down Audit Dialog */}
      <PerformanceDrilldownDialog
        employee={selectedEmployeeForDrilldown}
        onClose={() => setSelectedEmployeeForDrilldown(null)}
      />

      {/* PIP Generation Modal */}
      <PerformancePIPModal
        employee={selectedEmployeeForPIP}
        onClose={() => setSelectedEmployeeForPIP(null)}
        onConfirmPIP={(emp) => {
          toast.success(
            `تم حفظ وإشعار الموظف ${emp.name} بخطة تحسين الأداء بنجاح.`,
          );
          setSelectedEmployeeForPIP(null);
        }}
      />
    </div>
  );
};

export default TeamPerformance360Page;
