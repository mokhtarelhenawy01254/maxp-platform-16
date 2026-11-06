import React from "react";
import { Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAttendanceController,
  formatAttendanceDate,
  AttendanceStatsCards,
  AttendanceAutoCloseBanner,
  AttendanceFilters,
  AttendanceTable,
  ManualAttendanceDialog,
  AutoCloseReviewDialog,
  AttendanceDeleteDialog,
  AttendanceNotesDialog,
  AttendanceMapDialog,
  AttendanceExceptionRequestsSection,
  AttendanceMissingPunchesSection,
} from "./attendance/index";

export const Attendance: React.FC = () => {
  const {
    loading,
    todayStats,
    records,
    attendanceTimezone,
    pagination,
    setPagination,
    autoCloseSummary,
    selectedDate,
    setSelectedDate,
    endDate,
    setEndDate,
    useDateRange,
    setUseDateRange,
    statusFilter,
    setStatusFilter,
    employeeId,
    setEmployeeId,
    autoClosedOnly,
    setAutoClosedOnly,
    autoCloseReviewStatus,
    setAutoCloseReviewStatus,
    employees,
    showManualDialog,
    setShowManualDialog,
    showMapModal,
    setShowMapModal,
    selectedLocation,
    manualForm,
    setManualForm,
    manualOverrides,
    setManualOverrides,
    isEditMode,
    showNotesDialog,
    setShowNotesDialog,
    selectedNotes,
    setSelectedNotes,
    showAutoCloseReviewDialog,
    setShowAutoCloseReviewDialog,
    selectedAutoCloseRecord,
    autoCloseReviewForm,
    setAutoCloseReviewForm,
    deleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
    executeDelete,
    openAutoCloseReview,
    submitAutoCloseReview,
    handleCheckIn,
    handleCheckOut,
    handleManualAttendance,
    resetManualForm,
    handleEditClick,
    openLocationInMap,
    handleExport,
    fetchAttendance,
    fetchTodayStats,
  } = useAttendanceController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">الحضور والانصراف</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 tabular-nums">
            {formatAttendanceDate(
              selectedDate,
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              },
              "-",
              attendanceTimezone,
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetManualForm();
              setShowManualDialog(true);
            }}
            className="gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Clock className="h-4 w-4" /> تسجيل يدوي
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="h-4 w-4" /> تصدير
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <AttendanceStatsCards todayStats={todayStats} />

      {/* Auto-Close Review Summary Banner */}
      <AttendanceAutoCloseBanner
        autoCloseSummary={autoCloseSummary}
        autoClosedOnly={autoClosedOnly}
        setAutoClosedOnly={setAutoClosedOnly}
        autoCloseReviewStatus={autoCloseReviewStatus}
        setAutoCloseReviewStatus={setAutoCloseReviewStatus}
      />

      {/* طلبات استثناء البصمة */}
      <AttendanceExceptionRequestsSection
        onDecisionSuccess={() => {
          fetchAttendance();
          fetchTodayStats();
        }}
      />

      {/* تقرير ومطابقة البصمات المفقودة من أجهزة الشركة */}
      <AttendanceMissingPunchesSection
        onResolveSuccess={() => {
          fetchAttendance();
          fetchTodayStats();
        }}
      />

      {/* Search & Filter Controls */}
      <AttendanceFilters
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        endDate={endDate}
        setEndDate={setEndDate}
        useDateRange={useDateRange}
        setUseDateRange={setUseDateRange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        employeeId={employeeId}
        setEmployeeId={setEmployeeId}
        employees={employees}
        autoClosedOnly={autoClosedOnly}
        setAutoClosedOnly={setAutoClosedOnly}
        autoCloseReviewStatus={autoCloseReviewStatus}
        setAutoCloseReviewStatus={setAutoCloseReviewStatus}
      />

      {/* Main Attendance Table */}
      <AttendanceTable
        loading={loading}
        records={records}
        attendanceTimezone={attendanceTimezone}
        pagination={pagination}
        setPagination={setPagination}
        handleCheckIn={handleCheckIn}
        handleCheckOut={handleCheckOut}
        handleEditClick={handleEditClick}
        confirmDelete={confirmDelete}
        openAutoCloseReview={openAutoCloseReview}
        setSelectedNotes={setSelectedNotes}
        setShowNotesDialog={setShowNotesDialog}
        openLocationInMap={openLocationInMap}
      />

      {/* Manual / Edit Attendance Dialog */}
      <ManualAttendanceDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        isEditMode={isEditMode}
        manualForm={manualForm}
        setManualForm={setManualForm}
        manualOverrides={manualOverrides}
        setManualOverrides={setManualOverrides}
        employees={employees}
        attendanceTimezone={attendanceTimezone}
        onSubmit={handleManualAttendance}
        onReset={resetManualForm}
      />

      {/* Auto-Close Review Dialog */}
      <AutoCloseReviewDialog
        open={showAutoCloseReviewDialog}
        onOpenChange={setShowAutoCloseReviewDialog}
        selectedAutoCloseRecord={selectedAutoCloseRecord}
        attendanceTimezone={attendanceTimezone}
        autoCloseReviewForm={autoCloseReviewForm}
        setAutoCloseReviewForm={setAutoCloseReviewForm}
        onSubmitReview={submitAutoCloseReview}
        onOpenEdit={handleEditClick}
      />

      {/* Delete Confirmation Dialog */}
      <AttendanceDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirmDelete={executeDelete}
      />

      {/* Notes Dialog */}
      <AttendanceNotesDialog
        open={showNotesDialog}
        onOpenChange={setShowNotesDialog}
        notes={selectedNotes}
      />

      {/* Map Dialog */}
      <AttendanceMapDialog
        open={showMapModal}
        onOpenChange={setShowMapModal}
        selectedLocation={selectedLocation}
      />
    </div>
  );
};

export default Attendance;
