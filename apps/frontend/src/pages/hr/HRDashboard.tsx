import React from "react";
import {
  useHRDashboardController,
  HRDashboardHero,
  HRDashboardStatsGrid,
  AttendanceOverviewCard,
  PendingLeavesCard,
  PendingPermissionsCard,
  PendingAdvancesCard,
  WarningsOverviewCard,
  RecruitmentOverviewCard,
  RecentHiresCard,
  DepartmentsOverviewCard,
  HRQuickActionsCard,
} from "./hr-dashboard/index";

const HRDashboard: React.FC = () => {
  const {
    loading,
    data,
    error,
    attendanceRate,
    handleLeaveAction,
    handlePermissionAction,
    handleAdvanceAction,
  } = useHRDashboardController();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        {error}
      </div>
    );
  }

  return (
    <div
      className="space-y-6 w-full pb-8"
      dir="rtl"
    >
      {/* Hero Welcome & Top Actions */}
      <HRDashboardHero />

      {/* Top 4 Stats Cards */}
      <HRDashboardStatsGrid data={data} />

      {/* Main Content: Attendance & Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AttendanceOverviewCard
          data={data}
          attendanceRate={attendanceRate}
        />
        <PendingLeavesCard
          pendingLeaves={data?.pendingLeaves}
          onAction={handleLeaveAction}
        />
      </div>

      {/* Action Center: Permissions, Advances, Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <PendingPermissionsCard
          pendingPermissions={data?.pendingPermissions}
          onAction={handlePermissionAction}
        />
        <PendingAdvancesCard
          pendingAdvances={data?.pendingAdvances}
          onAction={handleAdvanceAction}
        />
        <WarningsOverviewCard warnings={data?.warnings} />
      </div>

      {/* Recruitment Overview */}
      <RecruitmentOverviewCard recruitment={data?.recruitment} />

      {/* Bottom Section: Recent Hires & Departments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <RecentHiresCard recentHires={data?.employees?.recentHires} />
        <DepartmentsOverviewCard
          departments={data?.departments?.departments}
        />
      </div>

      {/* Quick Navigation Actions */}
      <HRQuickActionsCard />
    </div>
  );
};

export default HRDashboard;
