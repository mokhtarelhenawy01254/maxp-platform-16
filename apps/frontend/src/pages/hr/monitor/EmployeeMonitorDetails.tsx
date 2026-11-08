import React from "react";
import ActivityTimelineBar from "./components/ActivityTimelineBar";
import AppUsageList from "./components/AppUsageList";
import WebUsageList from "./components/WebUsageList";
import TaskPerformanceCard from "./components/TaskPerformanceCard";
import BreakDetailsCard from "./components/BreakDetailsCard";
import {
  EmployeeMonitorDetailsProps,
  useEmployeeMonitorDetailsController,
  EmployeeMonitorHeaderChassis,
  EmployeeMonitorTelemetryAndTabs,
} from "./details";

export const EmployeeMonitorDetails: React.FC<EmployeeMonitorDetailsProps> = (
  props,
) => {
  const {
    activeTab,
    setActiveTab,
    selectedDate,
    setSelectedDate,
    loading,
    data,
    fetchDetails,
    handleDateStep,
    todayStr,
    isToday,
    yesterdayStr,
    teamMembersProp,
    currentMemberIndex,
    hasPrevMember,
    hasNextMember,
    handleSwitchEmployee,
    handleBack,
    employeeName,
    departmentName,
    jobTitle,
    totalActive,
    totalIdle,
    prodScore,
    clockInStr,
    firstActivityStr,
    activityLagMinutes,
  } = useEmployeeMonitorDetailsController(props);

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <EmployeeMonitorHeaderChassis
        employeeName={employeeName}
        departmentName={departmentName}
        jobTitle={jobTitle}
        summary={data.summary}
        teamMembersProp={teamMembersProp}
        currentMemberIndex={currentMemberIndex}
        hasPrevMember={hasPrevMember}
        hasNextMember={hasNextMember}
        onSwitchEmployee={handleSwitchEmployee}
        onBack={handleBack}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        todayStr={todayStr}
        isToday={isToday}
        yesterdayStr={yesterdayStr}
        onDateStep={handleDateStep}
        loading={loading}
        onRefresh={() => void fetchDetails()}
      />

      <EmployeeMonitorTelemetryAndTabs
        data={data}
        totalActive={totalActive}
        totalIdle={totalIdle}
        prodScore={prodScore}
        clockInStr={clockInStr}
        firstActivityStr={firstActivityStr}
        activityLagMinutes={activityLagMinutes}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {activeTab === "tasks" && (
        <TaskPerformanceCard
          taskPerformance={data.taskPerformance}
          totalActiveSeconds={totalActive}
          totalIdleSeconds={totalIdle}
        />
      )}

      {activeTab === "timeline" && (
        <div className="space-y-4">
          <ActivityTimelineBar activities={data.activities} />
          <BreakDetailsCard breaksSummary={data.breaksSummary} />
        </div>
      )}

      {activeTab === "apps" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AppUsageList apps={data.apps} totalWorkSeconds={totalActive} />
          <WebUsageList
            websites={data.websites}
            totalWorkSeconds={totalActive}
          />
        </div>
      )}
    </div>
  );
};

export default EmployeeMonitorDetails;
