import React from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import TeamExecutiveSummary from "./components/TeamExecutiveSummary";
import EmployeeMonitorDetails from "./EmployeeMonitorDetails";
import {
  TeamMemberSummary,
  useMonitorDashboardController,
  MonitorControlHeader,
  MonitorAlertsAndKpis,
  MonitorDesktopTable,
  MonitorMobileCards,
} from "./dashboard/index";

export type { TeamMemberSummary };

export const MonitorDashboard: React.FC = () => {
  const {
    isManagerOrHR,
    isSuperOrOwner,
    loading,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortDirection,
    teamMembers,
    selectedEmployeeId,
    setSelectedEmployeeId,
    visibleAlerts,
    archiving,
    archiveSuccess,
    stats,
    isToday,
    yesterdayStr,
    handleDateStep,
    handleSort,
    handleDismissAlert,
    fetchData,
    handleTriggerArchive,
    sortedMembers,
  } = useMonitorDashboardController();

  if (!isManagerOrHR) {
    return (
      <div
        className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center"
        dir="rtl"
      >
        <ShieldAlert className="h-10 w-10 text-rose-400" />
        <h2 className="text-base font-bold text-foreground">
          غير مصرح بالوصول
        </h2>
        <p className="max-w-sm text-xs text-muted-foreground">
          شاشة مراقبة الأجهزة والإنتاجية مخصصة لمسؤولي الموارد البشرية والمدراء
          فقط.
        </p>
      </div>
    );
  }

  if (selectedEmployeeId) {
    return (
      <EmployeeMonitorDetails
        employeeIdProp={selectedEmployeeId}
        onBackProp={() => setSelectedEmployeeId(null)}
        teamMembersProp={teamMembers.map((m) => ({
          employeeId: m.employeeId,
          employeeName: m.employeeName,
        }))}
        onSelectEmployeeProp={(id) => setSelectedEmployeeId(id)}
      />
    );
  }

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <MonitorControlHeader
        activeNow={stats.activeNow}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        selectedDate={selectedDate}
        onSelectedDateChange={setSelectedDate}
        isToday={isToday}
        yesterdayStr={yesterdayStr}
        onDateStep={handleDateStep}
        loading={loading}
        onRefresh={fetchData}
      />

      <MonitorAlertsAndKpis
        visibleAlerts={visibleAlerts}
        onDismissAlert={handleDismissAlert}
        stats={stats}
      />

      <TeamExecutiveSummary
        stats={stats}
        isSuperOrOwner={isSuperOrOwner}
        archiving={archiving}
        archiveSuccess={archiveSuccess}
        onTriggerArchive={handleTriggerArchive}
      />

      <div className="overflow-hidden rounded-xl border border-border/40 bg-card/60 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              سجل نشاط وإنتاجية الفريق (
              <span className="font-mono tabular-nums">
                {sortedMembers.length}
              </span>
              )
            </h2>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو القسم..."
                className="h-7 w-36 sm:w-52 rounded-lg border border-border/60 bg-muted/50 dark:bg-zinc-900/60 pr-8 pl-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-sky-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === "all"
                  ? "bg-slate-200 dark:bg-zinc-800 text-foreground ring-1 ring-border/50 font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground"
              }`}
            >
              الكل (
              <span className="font-mono tabular-nums">
                {teamMembers.length}
              </span>
              )
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === "active"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20 font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground"
              }`}
            >
              نشط الآن (
              <span className="font-mono tabular-nums">{stats.activeNow}</span>)
            </button>
            <button
              onClick={() => setStatusFilter("idle")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === "idle"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-amber-500/20 font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground"
              }`}
            >
              استراحة / خمول
            </button>
            <button
              onClick={() => setStatusFilter("offline")}
              className={`rounded-lg px-2.5 py-1 font-medium transition ${
                statusFilter === "offline"
                  ? "bg-slate-200 dark:bg-zinc-800 text-foreground dark:text-zinc-300 ring-1 ring-border/40 font-semibold"
                  : "text-muted-foreground hover:bg-muted dark:hover:bg-zinc-800/60 hover:text-foreground"
              }`}
            >
              غير متصل
            </button>
          </div>
        </div>

        {loading && teamMembers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin ml-2 text-sky-400" />
            <span>جاري استرداد بيانات النشاط السحابية…</span>
          </div>
        ) : sortedMembers.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            لا توجد أجهزة مطابقة للبحث المسجل لهذا اليوم
          </div>
        ) : (
          <>
            <MonitorDesktopTable
              sortedMembers={sortedMembers}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onSelectEmployee={setSelectedEmployeeId}
            />
            <MonitorMobileCards
              sortedMembers={sortedMembers}
              onSelectEmployee={setSelectedEmployeeId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default MonitorDashboard;
