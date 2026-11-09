import React from "react";
import { AlertCircle, UserX, UserCheck } from "lucide-react";
import {
  formatDate,
  MyAttendanceClockAndActionsCard,
  MyAttendanceModals,
  MyAttendanceStatsAndLogTable,
  useMyAttendanceController,
} from "./attendance";

const MyAttendance: React.FC = () => {
  const {
    t,
    user,
    timezone,
    loading,
    todayAttendance,
    isNotAnEmployee,
    requestingLink,
    handleRequestEmployeeLink,
    stats,
    recentAttendance,
    hasMoreRecent,
    currentTime,
    checkingIn,
    checkingOut,
    errorMessages,
    duration,
    showMapModal,
    setShowMapModal,
    selectedLocation,
    workMode,
    setWorkMode,
    todayGoals,
    goalProgressDrafts,
    setGoalProgressDrafts,
    showGoalsReviewDialog,
    setShowGoalsReviewDialog,
    selectedMonth,
    setSelectedMonth,
    recentPage,
    setRecentPage,
    openLocationInMap,
    handleCheckIn,
    handleCheckOut,
    submitGoalUpdatesAndCheckOut,
    canCheckIn,
    canCheckOut,
    checkInDate,
    showOvernightWarning,
    recordDateLabel,
    formattedCheckIn,
    formattedCheckOut,
    staleHours,
    geofenceModalData,
    showGeofenceModal,
    setShowGeofenceModal,
    queuedPunches,
    retryingQueue,
    handleRetryQueue,
    showRegularizationModal,
    setShowRegularizationModal,
    regularizeInitialTime,
    handleOpenRegularize,
    fetchTodayAttendance,
    fetchRecentAttendance,
    fetchStats,
  } = useMyAttendanceController();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full" dir="rtl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("employee.attendance.myAttendance")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("employee.attendance.myAttendanceDesc")}
          </p>
          {user && (
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-2">
              {t("employee.attendance.employee", {
                name: `${user.firstName} ${user.lastName}`,
              })}
            </p>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400 sm:mt-0">
          {formatDate(currentTime)}
        </p>
      </div>

      {errorMessages.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div className="space-y-1">
              {errorMessages.map((message, idx) => (
                <p key={idx} className="text-sm">
                  {message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {isNotAnEmployee && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30 p-6 text-center space-y-3 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">
              أنت غير مسجل كموظف في الشركة
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300/90 mt-1 max-w-xl mx-auto">
              حسابك الحالي مسجل في النظام بدور ({user?.role || "مستخدم"}) لكنه غير مقيد في سجل الموظفين (HR Employees).
              لذلك لا يمكن تسجيل الحضور والانصراف حتى يتم ربط ملفك الوظيفي أو اعتماد طلبك من قِبل إدارة الشركة.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRequestEmployeeLink}
              disabled={requestingLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" />
              {requestingLink ? "جاري إرسال الطلب للإدارة..." : "طلب ربط حسابي كموظف في الشركة"}
            </button>
          </div>
        </div>
      )}

      <MyAttendanceClockAndActionsCard
        t={t}
        timezone={timezone}
        currentTime={currentTime}
        todayAttendance={todayAttendance}
        showOvernightWarning={showOvernightWarning}
        recordDateLabel={recordDateLabel}
        formattedCheckIn={formattedCheckIn}
        formattedCheckOut={formattedCheckOut}
        duration={duration}
        checkInDate={checkInDate}
        staleHours={staleHours}
        canCheckIn={canCheckIn}
        canCheckOut={canCheckOut}
        checkingIn={checkingIn}
        checkingOut={checkingOut}
        workMode={workMode}
        onWorkModeChange={setWorkMode}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        todayGoals={todayGoals}
        queuedPunches={queuedPunches}
        retryingQueue={retryingQueue}
        onRetryQueue={handleRetryQueue}
        onOpenRegularize={handleOpenRegularize}
      />

      <MyAttendanceStatsAndLogTable
        t={t}
        timezone={timezone}
        stats={stats}
        recentAttendance={recentAttendance}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          setRecentPage(1);
        }}
        recentPage={recentPage}
        onPageChange={setRecentPage}
        hasMoreRecent={hasMoreRecent}
        onOpenLocationInMap={openLocationInMap}
      />

      <MyAttendanceModals
        t={t}
        showGoalsReviewDialog={showGoalsReviewDialog}
        onGoalsDialogChange={setShowGoalsReviewDialog}
        checkingOut={checkingOut}
        todayGoals={todayGoals}
        goalProgressDrafts={goalProgressDrafts}
        onGoalDraftChange={(goalId, val) =>
          setGoalProgressDrafts((prev) => ({ ...prev, [goalId]: val }))
        }
        onSubmitGoalsAndCheckout={submitGoalUpdatesAndCheckOut}
        showMapModal={showMapModal}
        onMapModalChange={setShowMapModal}
        selectedLocation={selectedLocation}
        showGeofenceModal={showGeofenceModal}
        onGeofenceModalChange={setShowGeofenceModal}
        geofenceModalData={geofenceModalData}
        showRegularizationModal={showRegularizationModal}
        onRegularizationModalChange={setShowRegularizationModal}
        regularizeInitialTime={regularizeInitialTime}
        onRegularizationSuccess={() => {
          fetchTodayAttendance();
          fetchStats();
          fetchRecentAttendance();
        }}
      />
    </div>
  );
};

export default MyAttendance;
