import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileCheck,
  Home,
  Laptop,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Target,
} from "lucide-react";
import type { TFunction } from "i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { TodayAttendance, TodayGoal } from "./types";
import {
  formatDateWithTZ,
  formatTime,
  formatTimeWithTZ,
  statusConfig,
} from "./helpers";
import { QueuedPunch, formatTimeArabic } from "../../../services/attendanceQueueService";

interface MyAttendanceClockAndActionsCardProps {
  t: TFunction;
  timezone: string;
  currentTime: Date;
  todayAttendance: TodayAttendance | null;
  showOvernightWarning: boolean;
  recordDateLabel: string;
  formattedCheckIn: string;
  formattedCheckOut: string;
  duration: string;
  checkInDate: Date | null;
  staleHours: number | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  checkingIn: boolean;
  checkingOut: boolean;
  workMode: "OFFICE" | "HOME";
  onWorkModeChange: (mode: "OFFICE" | "HOME") => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  todayGoals: TodayGoal[];
  queuedPunches?: QueuedPunch[];
  retryingQueue?: boolean;
  onRetryQueue?: () => void;
  onOpenRegularize?: (timeStr?: string) => void;
}

export const MyAttendanceClockAndActionsCard: React.FC<
  MyAttendanceClockAndActionsCardProps
> = ({
  t,
  timezone,
  currentTime,
  todayAttendance,
  showOvernightWarning,
  recordDateLabel,
  formattedCheckIn,
  formattedCheckOut,
  duration,
  checkInDate,
  staleHours,
  canCheckIn,
  canCheckOut,
  checkingIn,
  checkingOut,
  workMode,
  onWorkModeChange,
  onCheckIn,
  onCheckOut,
  todayGoals,
  queuedPunches = [],
  retryingQueue = false,
  onRetryQueue,
  onOpenRegularize,
}) => {
  return (
    <>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 animate-pulse" />
            </div>

            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                {formatTime(currentTime)}
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {t("employee.attendance.currentTime")}
              </p>
            </div>

            {todayAttendance && (
              <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      className={`h-5 w-5 ${
                        showOvernightWarning
                          ? "text-amber-600"
                          : "text-green-500 dark:text-green-400"
                      }`}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t("employee.attendance.todayStatus")}
                    </span>
                  </div>
                  <Badge
                    className={
                      showOvernightWarning
                        ? "bg-amber-100 text-amber-800"
                        : statusConfig[todayAttendance.status]?.color || ""
                    }
                  >
                    {showOvernightWarning
                      ? t("employee.attendance.shiftNotClosed")
                      : t(
                          statusConfig[todayAttendance.status]?.labelKey ||
                            todayAttendance.status,
                        )}
                  </Badge>
                </div>
                {recordDateLabel && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("employee.attendance.linkedToDate", {
                      date: recordDateLabel,
                    })}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("employee.attendance.checkIn")}
                    </p>
                    <p className="font-bold font-mono tabular-nums text-lg text-gray-900 dark:text-white">
                      {formattedCheckIn}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("employee.attendance.checkOut")}
                    </p>
                    <p className="font-bold font-mono tabular-nums text-lg text-gray-900 dark:text-white">
                      {formattedCheckOut}
                    </p>
                  </div>
                </div>

                {(todayAttendance.checkIn || todayAttendance.checkOut) && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                    {!todayAttendance.checkOut && todayAttendance.checkIn && (
                      <Badge className="bg-blue-100 text-blue-800 font-mono tabular-nums">
                        <Clock className="h-3.5 w-3.5 ml-1 inline" />
                        {t("employee.attendance.shiftDuration", { duration })}
                      </Badge>
                    )}
                    {todayAttendance.lateMinutes !== null &&
                      todayAttendance.lateMinutes > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800 font-mono tabular-nums">
                          {t("employee.attendance.lateMinutes", {
                            minutes: todayAttendance.lateMinutes,
                          })}
                        </Badge>
                      )}
                    {todayAttendance.earlyLeaveMinutes !== null &&
                      todayAttendance.earlyLeaveMinutes > 0 && (
                        <Badge className="bg-amber-100 text-amber-800 font-mono tabular-nums">
                          {t("employee.attendance.earlyLeave", {
                            minutes: todayAttendance.earlyLeaveMinutes,
                          })}
                        </Badge>
                      )}
                  </div>
                )}

                {!todayAttendance.checkOut && todayAttendance.checkIn && (
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/75 px-3 py-2 text-xs text-blue-800 dark:text-blue-300 font-medium">
                    <Laptop className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>
                      {t(
                        "employee.attendance.desktopPrompt",
                        "تذكير: يرجى التأكد من تشغيل تطبيق سطح المكتب MaxP Workspace لتوثيق فترات النشاط وساعات العمل بدقة.",
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {showOvernightWarning && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-right">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {t("employee.attendance.openShiftWarning")}
                    </p>
                    {checkInDate && (
                      <p className="text-xs text-amber-800 font-mono tabular-nums">
                        {t("employee.attendance.checkinTime")}{" "}
                        {formatTimeWithTZ(checkInDate, timezone)} •{" "}
                        {formatDateWithTZ(checkInDate, timezone)}
                        {staleHours !== null &&
                          ` • ${t("employee.attendance.hoursElapsed", {
                            hours: staleHours,
                          })}`}
                      </p>
                    )}
                    <p className="text-xs text-amber-800">
                      {t("employee.attendance.closeShiftFirst")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="destructive"
                    onClick={onCheckOut}
                    disabled={checkingOut}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {checkingOut
                      ? t("employee.attendance.closing")
                      : t("employee.attendance.closePendingShift")}
                  </Button>
                </div>
              </div>
            )}

            {/* بنر طابور البصمات المعلقة (Queue & Retry) */}
            {queuedPunches.length > 0 && (
              <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-200 text-amber-900 font-bold">بصمات معلقة ({queuedPunches.length})</Badge>
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>تم حفظ البصمة محلياً على جهازك لضمان عدم ضياعها وسيتم إرسالها تلقائياً</span>
                  </div>
                </div>
                {queuedPunches.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white/80 dark:bg-gray-800/80 border border-amber-200 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.action === "CHECK_IN" ? "بصمة حضور" : "بصمة انصراف"}
                      </span>
                      <span className="mx-2 text-gray-600 dark:text-gray-300 font-mono">
                        الوقت الأصلي: {formatTimeArabic(item.originalTimestamp)}
                      </span>
                      {item.lastError && (
                        <p className="text-red-600 dark:text-red-400 mt-0.5 font-medium">السبب: {item.lastError}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={retryingQueue}
                        onClick={onRetryQueue}
                        className="text-xs h-8 gap-1 bg-white hover:bg-amber-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${retryingQueue ? "animate-spin" : ""}`} />
                        إعادة المحاولة الآن
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenRegularize?.(item.originalTimestamp)}
                        className="text-xs h-8 text-blue-600 hover:text-blue-700"
                      >
                        طلب اعتماد
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(canCheckIn || canCheckOut) && (
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
                  <button
                    onClick={() => onWorkModeChange("OFFICE")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 ${
                      workMode === "OFFICE"
                        ? "bg-white dark:bg-gray-700 text-blue-600 shadow-md scale-105"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <MapPin
                      className={`h-4 w-4 ${
                        workMode === "OFFICE" ? "text-blue-500" : ""
                      }`}
                    />
                    <span className="font-bold">
                      {t("employee.attendance.fromOffice")}
                    </span>
                  </button>
                  <button
                    onClick={() => onWorkModeChange("HOME")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 ${
                      workMode === "HOME"
                        ? "bg-white dark:bg-gray-700 text-purple-600 shadow-md scale-105"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <Home
                      className={`h-4 w-4 ${
                        workMode === "HOME" ? "text-purple-500" : ""
                      }`}
                    />
                    <span className="font-bold">
                      {t("employee.attendance.fromHome")}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              {canCheckIn && (
                <Button
                  data-testid="attendance-checkin-button"
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={onCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("employee.attendance.registering")}
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-6 w-6" />
                      {t("employee.attendance.login")}
                    </>
                  )}
                </Button>
              )}

              {canCheckOut && (
                <Button
                  data-testid="attendance-checkout-button"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={onCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("employee.attendance.registering")}
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-6 w-6" />
                      {t("employee.attendance.checkOut")}
                    </>
                  )}
                </Button>
              )}

              {!canCheckIn && !canCheckOut && (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t("employee.attendance.alreadyChecked")}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenRegularize?.()}
                className="gap-2 text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <FileCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                طلب بصمة معتمدة (اعتماد يدوي للمالك)
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>{t("employee.attendance.locationAuto")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {todayGoals.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-900/10">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                <Target className="h-5 w-5" />
                {t("employee.attendance.dailyGoals")}
              </CardTitle>
              <p className="text-sm text-indigo-800/80 dark:text-indigo-200/80">
                {t("employee.attendance.dailyGoalsDesc")}
              </p>
            </div>
            {canCheckOut ? (
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100">
                {t("employee.attendance.reviewBeforeCheckout")}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {todayGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-indigo-200/70 bg-white/80 p-4 dark:border-indigo-800/60 dark:bg-slate-950/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {goal.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {goal.parentGoal?.title
                        ? t("employee.attendance.belongsTo", {
                            title: goal.parentGoal.title,
                          })
                        : t("employee.attendance.directDailyGoal")}
                      {goal.project?.name ? ` • ${goal.project.name}` : ""}
                    </div>
                  </div>
                  <div className="text-sm font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {Number(goal.currentValue || 0).toLocaleString("ar-EG")} /{" "}
                    {Number(goal.targetValue || 0).toLocaleString("ar-EG")}{" "}
                    {goal.unit || ""}
                  </div>
                </div>
                <Progress
                  value={Math.max(
                    0,
                    Math.min(100, Number(goal.progress || 0)),
                  )}
                  className="mt-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
};
