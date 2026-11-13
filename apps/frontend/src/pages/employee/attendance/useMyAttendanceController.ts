import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../../../services/api";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  enqueuePunch,
  processAttendanceQueue,
  getQueuedPunches,
  subscribeToQueue,
  retryAllQueuedPunches,
  QueuedPunch,
} from "../../../services/attendanceQueueService";
import {
  AttendanceStats,
  GeofenceModalData,
  SelectedMapLocation,
  STALE_SHIFT_HOURS,
  TodayAttendance,
  TodayGoal,
} from "./types";
import {
  formatDateWithTZ,
  formatTimeWithTZ,
  getApiError,
  getLocationPayload,
  handleAttendanceActionError,
  isSameDayTZ,
} from "./helpers";

export const useMyAttendanceController = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [loading, setLoading] = useState(true);
  const [isNotAnEmployee, setIsNotAnEmployee] = useState(false);
  const [requestingLink, setRequestingLink] = useState(false);
  const [todayAttendance, setTodayAttendance] =
    useState<TodayAttendance | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<TodayAttendance[]>(
    [],
  );
  const [hasMoreRecent, setHasMoreRecent] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duration, setDuration] = useState<string>("00:00:00");
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedMapLocation | null>(null);
  const [workMode, setWorkMode] = useState<"OFFICE" | "HOME">("OFFICE");
  const [todayGoals, setTodayGoals] = useState<TodayGoal[]>([]);
  const [goalProgressDrafts, setGoalProgressDrafts] = useState<
    Record<string, string>
  >({});
  const [showGoalsReviewDialog, setShowGoalsReviewDialog] = useState(false);
  const [geofenceModalData, setGeofenceModalData] = useState<GeofenceModalData | null>(null);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [queuedPunches, setQueuedPunches] = useState<QueuedPunch[]>(() => getQueuedPunches());
  const [retryingQueue, setRetryingQueue] = useState(false);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);
  const [regularizeInitialTime, setRegularizeInitialTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    return subscribeToQueue((queue) => {
      setQueuedPunches(queue);
    });
  }, []);

  const handleOpenRegularize = (timeStr?: string) => {
    setRegularizeInitialTime(timeStr);
    setShowRegularizationModal(true);
  };

  const handleRetryQueue = async () => {
    try {
      setRetryingQueue(true);
      await retryAllQueuedPunches();
      await fetchTodayAttendance();
      await fetchStats();
      await fetchRecentAttendance();
    } finally {
      setRetryingQueue(false);
    }
  };
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [recentPage, setRecentPage] = useState(1);
  const dayKeyRef = useRef(
    new Date().toLocaleDateString("en-CA", { timeZone: timezone }),
  );

  const setErrorKey = (key: string, message: string) => {
    setErrors((prev) => ({ ...prev, [key]: message }));
  };

  const clearErrorKey = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    return true;
  };

  const syncGoalDrafts = (goals: TodayGoal[]) => {
    setGoalProgressDrafts(
      Object.fromEntries(
        goals.map((goal) => [goal.id, String(Number(goal.currentValue || 0))]),
      ),
    );
  };

  useEffect(() => {
    if (todayAttendance?.checkIn && !todayAttendance.checkOut) {
      const startTime = new Date(todayAttendance.checkIn).getTime();

      const interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = now - startTime;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setDuration(
          `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
        );
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [todayAttendance]);

  useEffect(() => {
    void processAttendanceQueue(() => {
      void fetchTodayAttendance();
      void fetchStats();
    });
    void fetchTodayAttendance();
    void fetchStats();
    void fetchTodayGoals();
    dayKeyRef.current = new Date().toLocaleDateString("en-CA", {
      timeZone: timezone,
    });

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const nextDayKey = now.toLocaleDateString("en-CA", {
        timeZone: timezone,
      });

      if (dayKeyRef.current !== nextDayKey) {
        dayKeyRef.current = nextDayKey;
        setDuration("00:00:00");
        void fetchTodayAttendance();
        void fetchStats();
        void fetchTodayGoals();

        if (selectedMonth === nextDayKey.slice(0, 7)) {
          setRecentPage(1);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, timezone]);

  useEffect(() => {
    void fetchRecentAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, recentPage]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/attendance/my-today");
      if (response.data?.timezone) {
        setTimezone(response.data.timezone);
      }
      if (response.data?.notAnEmployee) {
        setIsNotAnEmployee(true);
        setTodayAttendance(null);
      } else {
        setIsNotAnEmployee(false);
        setTodayAttendance(response.data.attendance);
      }
      clearErrorKey("today");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      const isNotEmp =
        apiError.response?.data?.notAnEmployee ||
        apiError.response?.data?.code === "NOT_AN_EMPLOYEE" ||
        apiError.response?.data?.error?.includes("غير مسجل كموظف") ||
        apiError.response?.data?.error?.includes("ملف الموظف");

      if (isNotEmp) {
        setIsNotAnEmployee(true);
        setTodayAttendance(null);
      } else {
        console.error("Error fetching today attendance:", error);
        const errorMessage =
          apiError.response?.data?.error ||
          t("employee.attendance.errorFetchToday");
        setErrorKey("today", errorMessage);
        toast.error(errorMessage, {
          description: t("employee.attendance.errorFetchTodayDesc"),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/hr/attendance/my-stats");
      if (response.data?.timezone) {
        setTimezone(response.data.timezone);
      }
      setStats(response.data.stats);
      clearErrorKey("stats");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error fetching stats:", error);
      const errorMessage =
        apiError.response?.data?.error ||
        t("employee.attendance.errorFetchStats");
      setErrorKey("stats", errorMessage);
      toast.error(errorMessage, {
        description: t("employee.attendance.errorFetchStatsDesc"),
      });
    }
  };

  const fetchTodayGoals = async () => {
    try {
      const response = await api.get("/tasks/goals/today");
      const goals = (response.data?.goals || []) as TodayGoal[];
      setTodayGoals(goals);
      syncGoalDrafts(goals);
      clearErrorKey("goals");
    } catch (error: unknown) {
      console.error("Error fetching today goals:", error);
      setTodayGoals([]);
      syncGoalDrafts([]);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const [year, month] = selectedMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const endDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(endDay).padStart(2, "0")}`;
      const response = await api.get(
        `/hr/attendance/my-recent?limit=15&page=${recentPage}&startDate=${startDate}&endDate=${endDate}`,
      );
      if (response.data?.timezone) {
        setTimezone(response.data.timezone);
      }
      setRecentAttendance(response.data.attendance || []);
      setHasMoreRecent(Boolean(response.data.pagination?.hasMore));
      clearErrorKey("recent");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error fetching recent attendance:", error);
      const errorMessage =
        apiError.response?.data?.error ||
        t("employee.attendance.errorFetchLog");
      setErrorKey("recent", errorMessage);
      setHasMoreRecent(false);
      toast.error(errorMessage, {
        description: t("employee.attendance.errorFetchLogDesc"),
      });
    }
  };

  const openLocationInMap = (
    latitude: number,
    longitude: number,
    type: string,
  ) => {
    setSelectedLocation({ latitude, longitude, type });
    setShowMapModal(true);
  };

  const finalizeCheckOut = async () => {
    const punchTime = new Date();
    let queuedLocation: string | null = null;
    try {
      setCheckingOut(true);
      const location = await getLocationPayload();
      queuedLocation = location ? JSON.stringify(location) : null;

      const res = await api.post("/hr/attendance/check-out", {
        method: "self_service",
        workMode,
        location: location ? JSON.stringify(location) : null,
        originalTimestamp: punchTime.toISOString(),
      });

      if (!res?.data?.success || !res?.data?.attendance) {
        throw new Error(res?.data?.error || "لم يؤكد السيرفر تسجيل الانصراف.");
      }

      const formattedTime = formatTimeWithTZ(punchTime, timezone);
      toast.success(`تم تسجيل الانصراف بنجاح ✅ ${formattedTime}`);
      await fetchTodayAttendance();
      await fetchStats();
      await fetchTodayGoals();
      setRecentPage(1);
      await fetchRecentAttendance();
      setShowGoalsReviewDialog(false);
    } catch (error: unknown) {
      const apiErr = getApiError(error);
      const isNotEmp =
        apiErr.response?.data?.code === "NOT_AN_EMPLOYEE" ||
        apiErr.response?.data?.notAnEmployee ||
        apiErr.response?.data?.error?.includes("غير مسجل كموظف") ||
        apiErr.response?.data?.error?.includes("ملف وظيفي");

      if (isNotEmp) {
        setIsNotAnEmployee(true);
        toast.error("لم تُسجّل — السبب: أنت غير مسجل كموظف في الشركة", {
          description: "حسابك لا يمتلك ملفاً في سجل موظفي الشركة. يرجى الضغط على زر طلب الربط بالأسفل.",
          duration: 9000,
        });
        return;
      }

      const isNetworkErr = !navigator.onLine || !apiErr.response || apiErr.code === "ERR_NETWORK" || apiErr.code === "ECONNABORTED";
      const isServerErr = Boolean(apiErr.response?.status && apiErr.response.status >= 500);

      if (isNetworkErr || isServerErr) {
        const location = await getLocationPayload().catch(() => null);
        enqueuePunch({
          action: "CHECK_OUT",
          originalTimestamp: punchTime.toISOString(),
          workMode,
          location: queuedLocation,
          method: "self_service",
          lastError: isNetworkErr ? "انقطاع الاتصال بالإنترنت" : `خطأ مؤقت بالسيرفر (${apiErr.response?.status})`,
        });
        toast.error(`لم تُسجّل — السبب: ${isNetworkErr ? "انقطاع الاتصال بالإنترنت" : "خطأ مؤقت بالسيرفر"}`, {
          description: "تم حفظ بصمة الانصراف محلياً وسيتم إرسالها تلقائياً فور عودة الاتصال.",
          duration: 8000,
        });
      } else {
        const errorReason = apiErr.response?.data?.error || apiErr.message || "خطأ غير متوقع";
        if (apiErr.response?.status === 403 && apiErr.response?.data?.geofenceData) {
          handleAttendanceActionError(error, t, "checkout", (data) => {
            setGeofenceModalData(data);
            setShowGeofenceModal(true);
          });
        } else {
          toast.error(`لم تُسجّل — السبب: ${errorReason}`);
        }
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const submitGoalUpdatesAndCheckOut = async () => {
    try {
      setCheckingOut(true);

      for (const goal of todayGoals) {
        const nextValue = Number.parseFloat(goalProgressDrafts[goal.id] || "0");

        if (!Number.isFinite(nextValue) || nextValue < 0) {
          toast.error(
            t("employee.attendance.invalidGoalValue", { title: goal.title }),
          );
          setCheckingOut(false);
          return;
        }

        if (nextValue === Number(goal.currentValue || 0)) {
          continue;
        }

        await api.post(`/tasks/goals/${goal.id}/progress`, {
          currentValue: nextValue,
        });
      }
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error updating today goals:", error);
      toast.error(
        apiError.response?.data?.error ||
          t("employee.attendance.goalsUpdateFailed"),
      );
      setCheckingOut(false);
      return;
    }

    setCheckingOut(false);
    await finalizeCheckOut();
  };

  const handleCheckIn = async () => {
    const punchTime = new Date();
    let queuedLocation: string | null = null;
    try {
      setCheckingIn(true);
      const location = await getLocationPayload();
      queuedLocation = location ? JSON.stringify(location) : null;

      const res = await api.post("/hr/attendance/check-in", {
        method: "self_service",
        workMode,
        location: location ? JSON.stringify(location) : null,
        originalTimestamp: punchTime.toISOString(),
      });

      if (!res?.data?.success || !res?.data?.attendance) {
        throw new Error(res?.data?.error || "لم يؤكد السيرفر تسجيل البصمة.");
      }

      const formattedTime = formatTimeWithTZ(punchTime, timezone);
      toast.success(`تم تسجيل البصمة بنجاح ✅ ${formattedTime}`, {
        description: t(
          "employee.attendance.desktopPrompt",
          "تذكير: يرجى التأكد من تشغيل تطبيق سطح المكتب MaxP Workspace لتوثيق فترات النشاط وساعات العمل بدقة.",
        ),
        duration: 7000,
      });
      await fetchTodayAttendance();
      await fetchStats();
      await fetchTodayGoals();
      setRecentPage(1);
      await fetchRecentAttendance();
    } catch (error: unknown) {
      const apiErr = getApiError(error);
      const isNotEmp =
        apiErr.response?.data?.code === "NOT_AN_EMPLOYEE" ||
        apiErr.response?.data?.notAnEmployee ||
        apiErr.response?.data?.error?.includes("غير مسجل كموظف") ||
        apiErr.response?.data?.error?.includes("ملف وظيفي");

      if (isNotEmp) {
        setIsNotAnEmployee(true);
        toast.error("لم تُسجّل — السبب: أنت غير مسجل كموظف في الشركة", {
          description: "حسابك لا يمتلك ملفاً في سجل موظفي الشركة. يرجى الضغط على زر طلب الربط بالأسفل.",
          duration: 9000,
        });
        return;
      }

      const isNetworkErr = !navigator.onLine || !apiErr.response || apiErr.code === "ERR_NETWORK" || apiErr.code === "ECONNABORTED";
      const isServerErr = Boolean(apiErr.response?.status && apiErr.response.status >= 500);

      if (isNetworkErr || isServerErr) {
        const location = await getLocationPayload().catch(() => null);
        enqueuePunch({
          action: "CHECK_IN",
          originalTimestamp: punchTime.toISOString(),
          workMode,
          location: queuedLocation,
          method: "self_service",
          lastError: isNetworkErr ? "انقطاع الاتصال بالإنترنت" : `خطأ مؤقت بالسيرفر (${apiErr.response?.status})`,
        });
        toast.error(`لم تُسجّل — السبب: ${isNetworkErr ? "انقطاع الاتصال بالإنترنت" : "خطأ مؤقت بالسيرفر"}`, {
          description: "تم حفظ البصمة محلياً وسيتم إرسالها تلقائياً بالوقت الأصلي فور عودة الاتصال.",
          duration: 8000,
        });
      } else {
        const errorReason = apiErr.response?.data?.error || apiErr.message || "خطأ غير متوقع";
        if (apiErr.response?.status === 403 && apiErr.response?.data?.geofenceData) {
          handleAttendanceActionError(error, t, "checkin", (data) => {
            setGeofenceModalData(data);
            setShowGeofenceModal(true);
          });
        } else {
          toast.error(`لم تُسجّل — السبب: ${errorReason}`);
        }
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (todayGoals.length > 0) {
      syncGoalDrafts(todayGoals);
      setShowGoalsReviewDialog(true);
      return;
    }

    await finalizeCheckOut();
  };

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = Boolean(
    todayAttendance?.checkIn && !todayAttendance?.checkOut,
  );
  const errorMessages = Object.values(errors);

  const checkInDate = todayAttendance?.checkIn
    ? new Date(todayAttendance.checkIn)
    : null;
  const checkOutDate = todayAttendance?.checkOut
    ? new Date(todayAttendance.checkOut)
    : null;

  const hasOpenShift = Boolean(
    todayAttendance?.checkIn && !todayAttendance?.checkOut,
  );
  const isCrossDay = Boolean(
    checkInDate && !isSameDayTZ(checkInDate, new Date(), timezone),
  );
  const isStaleShift = Boolean(
    hasOpenShift &&
      checkInDate &&
      (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60) >=
        STALE_SHIFT_HOURS,
  );
  const showOvernightWarning = Boolean(isCrossDay || isStaleShift);

  const recordDateLabel = todayAttendance?.date
    ? formatDateWithTZ(todayAttendance.date, timezone)
    : "";

  const formattedCheckIn = checkInDate
    ? `${formatTimeWithTZ(checkInDate, timezone)}${
        isCrossDay ? ` • ${formatDateWithTZ(checkInDate, timezone)}` : ""
      }`
    : "-";

  const formattedCheckOut = checkOutDate
    ? `${formatTimeWithTZ(checkOutDate, timezone)}${
        checkOutDate && !isSameDayTZ(checkOutDate, new Date(), timezone)
          ? ` • ${formatDateWithTZ(checkOutDate, timezone)}`
          : ""
      }`
    : "-";

  const staleHours = isStaleShift
    ? Math.floor(
        (Date.now() - (checkInDate?.getTime() || 0)) / (1000 * 60 * 60),
      )
    : null;

  const handleRequestEmployeeLink = async () => {
    try {
      setRequestingLink(true);
      const res = await api.post("/hr/employees/request-link");
      if (res.data?.success) {
        toast.success("تم إرسال طلب ربط الحساب لإدارة الشركة بنجاح ✅", {
          description: "سيتم إشعار مسؤولي الموارد البشرية لربط ملفك الوظيفي وتفعيل البصمة.",
        });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إرسال طلب الربط");
    } finally {
      setRequestingLink(false);
    }
  };

  return {
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
    fetchStats,
    fetchRecentAttendance,
  };
};
