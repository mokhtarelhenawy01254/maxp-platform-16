/**
 * 📍 My Attendance - Employee Self-Service
 * صفحة تسجيل الحضور والانصراف للموظف
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  MapPin,
  Home,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import api from "../../services/api";
import { toast } from "sonner";
import { envConfig } from "../../config/environment";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";

interface TodayAttendance {
  id?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  status: string;
  workMode?: "OFFICE" | "HOME" | null;
  workHours: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
}

interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
  attendanceRate: number;
}

interface TodayGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  unit?: string | null;
  project?: { id: string; name: string } | null;
  parentGoal?: { id: string; title: string } | null;
}

const STALE_SHIFT_HOURS = 24;

const statusConfig: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PRESENT: {
    label: "حاضر",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  ABSENT: { label: "غائب", color: "bg-red-100 text-red-800", icon: XCircle },
  LATE: {
    label: "متأخر",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
  },
  ON_LEAVE: {
    label: "إجازة",
    color: "bg-purple-100 text-purple-800",
    icon: Calendar,
  },
};

const MyAttendance: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const timezone = user?.timezone || "Africa/Cairo";
  const [loading, setLoading] = useState(true);
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
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    type: string;
  } | null>(null);
  const [workMode, setWorkMode] = useState<"OFFICE" | "HOME">("OFFICE");
  const [todayGoals, setTodayGoals] = useState<TodayGoal[]>([]);
  const [goalProgressDrafts, setGoalProgressDrafts] = useState<
    Record<string, string>
  >({});
  const [showGoalsReviewDialog, setShowGoalsReviewDialog] = useState(false);
  // Date filter and pagination for recent attendance
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

  const getApiError = (error: unknown) =>
    error as {
      response?: {
        status?: number;
        data?: {
          error?: string;
          geofenceData?: {
            distance: number;
            allowedRadius: number;
          };
        };
      };
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
    fetchTodayAttendance();
    fetchStats();
    fetchTodayGoals();
    dayKeyRef.current = new Date().toLocaleDateString("en-CA", {
      timeZone: timezone,
    });

    // Update clock every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const nextDayKey = now.toLocaleDateString("en-CA", {
        timeZone: timezone,
      });

      if (dayKeyRef.current !== nextDayKey) {
        dayKeyRef.current = nextDayKey;
        setDuration("00:00:00");
        fetchTodayAttendance();
        fetchStats();
        fetchTodayGoals();

        if (selectedMonth === nextDayKey.slice(0, 7)) {
          setRecentPage(1);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, timezone]);

  useEffect(() => {
    fetchRecentAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, recentPage]);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/attendance/my-today");
      setTodayAttendance(response.data.attendance);
      clearErrorKey("today");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error fetching today attendance:", error);
      const errorMessage =
        apiError.response?.data?.error ||
        "تعذر تحميل بيانات حضور اليوم. يرجى المحاولة مرة أخرى.";
      setErrorKey("today", errorMessage);
      toast.error(errorMessage, {
        description: "تأكد من اتصالك بالإنترنت وحاول مرة أخرى"
        });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/hr/attendance/my-stats");
      setStats(response.data.stats);
      clearErrorKey("stats");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error fetching stats:", error);
      const errorMessage =
        apiError.response?.data?.error || "تعذر تحميل إحصائيات الحضور.";
      setErrorKey("stats", errorMessage);
      toast.error(errorMessage, {
        description: "سيتم إعادة المحاولة تلقائياً"
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
      setRecentAttendance(response.data.attendance || []);
      setHasMoreRecent(Boolean(response.data.pagination?.hasMore));
      clearErrorKey("recent");
    } catch (error: unknown) {
      const apiError = getApiError(error);
      console.error("Error fetching recent attendance:", error);
      const errorMessage =
        apiError.response?.data?.error || "تعذر تحميل سجل الحضور الأخير.";
      setErrorKey("recent", errorMessage);
      setHasMoreRecent(false);
      toast.error(errorMessage, {
        description: "يمكنك تحديث الصفحة لإعادة المحاولة"
        });
    }
  };

  // دالة لفتح الموقع في الخريطة
  const openLocationInMap = (
    latitude: number,
    longitude: number,
    type: string,
  ) => {
    setSelectedLocation({ latitude, longitude, type });
    setShowMapModal(true);
  };

  // دالة لعرض بيانات الموقع
  const renderLocationInfo = (
    checkInLocation: string | null,
    checkOutLocation: string | null,
  ) => {
    const parseLocation = (locationStr: string | null) => {
      if (!locationStr) return null;
      try {
        const location = JSON.parse(locationStr);
        return location;
      } catch {
        return null;
      }
    };

    const checkInLoc = parseLocation(checkInLocation);
    const checkOutLoc = parseLocation(checkOutLocation);

    if (!checkInLoc && !checkOutLoc) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="space-y-1 text-xs">
        {checkInLoc && (
          <div
            className="flex items-center gap-1 text-green-600 hover:text-green-800 cursor-pointer hover:bg-green-50 p-1 rounded transition-colors"
            onClick={() =>
              openLocationInMap(
                checkInLoc.latitude,
                checkInLoc.longitude,
                "حضور",
              )
            }
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">
              حضور: {checkInLoc.latitude?.toFixed(4)},{" "}
              {checkInLoc.longitude?.toFixed(4)}
            </span>
          </div>
        )}
        {checkOutLoc && (
          <div
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
            onClick={() =>
              openLocationInMap(
                checkOutLoc.latitude,
                checkOutLoc.longitude,
                "انصراف",
              )
            }
            title="اضغط لفتح الموقع في الخريطة"
          >
            <MapPin className="h-3 w-3" />
            <span className="underline">
              انصراف: {checkOutLoc.latitude?.toFixed(4)},{" "}
              {checkOutLoc.longitude?.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getLocationPayload = async () => {
    let location = null;

    if (!navigator.geolocation) {
      return location;
    }

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          });
        },
      );

      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      console.log(`📍 Location accuracy: ${position.coords.accuracy}m`);
    } catch (error) {
      console.log("Location not available");
    }

    return location;
  };

  const finalizeCheckOut = async () => {
    try {
      setCheckingOut(true);
      const location = await getLocationPayload();

      await api.post("/hr/attendance/check-out", {
        method: "self_service",
        workMode: workMode,
        location: location ? JSON.stringify(location) : null,
      });

      toast.success("تم تسجيل الانصراف بنجاح!");
      await fetchTodayAttendance();
      await fetchStats();
      await fetchTodayGoals();
      setRecentPage(1);
      await fetchRecentAttendance();
      setShowGoalsReviewDialog(false);
    } catch (error: unknown) {
      const apiError = getApiError(error);
      if (
        apiError.response?.status === 403 &&
        apiError.response?.data?.geofenceData
      ) {
        const { distance, allowedRadius } = apiError.response.data.geofenceData;
        const distanceToMove = Math.round(distance - allowedRadius);
        toast.error("⛔ أنت خارج نطاق البصمة المسموح!", {
          description:
            `📍 المسافة: ${Math.round(distance)}م | ✅ المسموحة: ${allowedRadius}م | 🚶 اقترب: ${distanceToMove}م`,
          duration: 8000,
        });
      } else if (apiError.response?.status === 400) {
        toast.error("❌ خطأ في البيانات", {
          description: apiError.response?.data?.error || "لم يتم تسجيل الحضور بعد",
        });
      } else if (apiError.response?.status === 401) {
        toast.error("🔒 انتهت صلاحية الجلسة", {
          description: "يرجى تسجيل الدخول مرة أخرى",
        });
      } else if (!navigator.onLine) {
        toast.error("📡 لا يوجد اتصال بالإنترنت", {
          description: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى",
        });
      } else {
        toast.error("❌ فشل تسجيل الانصراف", {
          description:
            apiError.response?.data?.error ||
            "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى",
        });
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
          toast.error(`قيمة غير صالحة في الهدف: ${goal.title}`);
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
        apiError.response?.data?.error || "تعذر تحديث أهداف اليوم قبل الانصراف",
      );
      setCheckingOut(false);
      return;
    }

    setCheckingOut(false);
    await finalizeCheckOut();
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const location = await getLocationPayload();

      await api.post("/hr/attendance/check-in", {
        method: "self_service",
        workMode: workMode,
        location: location ? JSON.stringify(location) : null,
      });

      toast.success("تم تسجيل الحضور بنجاح!");
      await fetchTodayAttendance();
      await fetchStats();
      await fetchTodayGoals();
      setRecentPage(1);
      await fetchRecentAttendance();
    } catch (error: unknown) {
      const apiError = getApiError(error);
      // Handle geofencing errors with detailed messages
      if (
        apiError.response?.status === 403 &&
        apiError.response?.data?.geofenceData
      ) {
        const { distance, allowedRadius } = apiError.response.data.geofenceData;
        const distanceToMove = Math.round(distance - allowedRadius);

        // Show toast with detailed message
        toast.error("⛔ أنت خارج نطاق البصمة المسموح!", {
          description:
            `📍 المسافة: ${Math.round(distance)}م | ✅ المسموحة: ${allowedRadius}م | 🚶 اقترب: ${distanceToMove}م`,
          duration: 8000,
        });
        return; // Don't show additional error messages
      } else if (apiError.response?.status === 400) {
        toast.error("❌ خطأ في البيانات", {
          description:
            apiError.response?.data?.error || "يرجى التحقق من البيانات المدخلة"
        });
      } else if (apiError.response?.status === 401) {
        toast.error("🔒 انتهت صلاحية الجلسة", {
          description: "يرجى تسجيل الدخول مرة أخرى"
        });
      } else if (!navigator.onLine) {
        toast.error("📡 لا يوجد اتصال بالإنترنت", {
          description: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى"
        });
      } else {
        toast.error("❌ فشل تسجيل الحضور", {
          description:
            apiError.response?.data?.error ||
            "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى"
        });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  // Note: Biometric check-in removed — was a non-functional simulation


  const handleCheckOut = async () => {
    if (todayGoals.length > 0) {
      syncGoalDrafts(todayGoals);
      setShowGoalsReviewDialog(true);
      return;
    }

    await finalizeCheckOut();
  };

  // Note: Biometric check-out removed — was a non-functional simulation


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = todayAttendance?.checkIn && !todayAttendance?.checkOut;
  const errorMessages = Object.values(errors);

  const isSameDayTZ = (a: Date, b: Date) =>
    a.toLocaleDateString("en-CA", { timeZone: timezone }) ===
    b.toLocaleDateString("en-CA", { timeZone: timezone });

  const formatDateWithTZ = (date: string | Date) =>
    new Date(date).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone,
    });

  const formatTimeWithTZ = (date: string | Date) =>
    new Date(date).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone,
    });

  const checkInDate = todayAttendance?.checkIn
    ? new Date(todayAttendance.checkIn)
    : null;
  const checkOutDate = todayAttendance?.checkOut
    ? new Date(todayAttendance.checkOut)
    : null;

  const hasOpenShift = !!(todayAttendance?.checkIn && !todayAttendance?.checkOut);
  const isCrossDay =
    checkInDate && !isSameDayTZ(checkInDate, new Date());
  const isStaleShift =
    hasOpenShift &&
    checkInDate &&
    (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60) >= STALE_SHIFT_HOURS;
  const showOvernightWarning = Boolean(isCrossDay || isStaleShift);

  const recordDateLabel = todayAttendance?.date
    ? formatDateWithTZ(todayAttendance.date)
    : "";

  const formattedCheckIn = checkInDate
    ? `${formatTimeWithTZ(checkInDate)}${
        isCrossDay ? ` • ${formatDateWithTZ(checkInDate)}` : ""
      }`
    : "-";

  const formattedCheckOut = checkOutDate
    ? `${formatTimeWithTZ(checkOutDate)}${
        checkOutDate && !isSameDayTZ(checkOutDate, new Date())
          ? ` • ${formatDateWithTZ(checkOutDate)}`
          : ""
      }`
    : "-";

  const staleHours = isStaleShift
    ? Math.floor(
        (Date.now() - (checkInDate?.getTime() || 0)) / (1000 * 60 * 60),
      )
    : null;

  return (
    <div className="space-y-6 w-full" dir="rtl">
      {/* Header */}
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
              الموظف: {user.firstName} {user.lastName}
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

        {/* Current Time & Check In/Out */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6 sm:p-8">
            <div className="text-center space-y-4">
              {/* Clock */}
              <div className="flex items-center justify-center">
                <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-blue-600 animate-pulse" />
              </div>

            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(currentTime)}
              </div>
              <p className="text-gray-600 dark:text-gray-300">الوقت الحالي</p>
              </div>

              {/* Today's Status */}
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
                        حالة اليوم:
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
                        ? "تنبيه: شفت غير مغلق"
                        : statusConfig[todayAttendance.status]?.label ||
                          todayAttendance.status}
                    </Badge>
                  </div>
                  {recordDateLabel && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      سجل مرتبط بتاريخ: {recordDateLabel}
                    </p>
                  )}

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      تسجيل حضور
                    </p>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {formattedCheckIn}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      تسجيل انصراف
                    </p>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {formattedCheckOut}
                    </p>
                  </div>
                </div>

                {(todayAttendance.checkIn || todayAttendance.checkOut) && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                    {!todayAttendance.checkOut && todayAttendance.checkIn && (
                      <Badge className="bg-blue-100 text-blue-800">
                        ⏱️ مدة الشفت: {duration}
                      </Badge>
                    )}
                    {todayAttendance.lateMinutes !== null &&
                      todayAttendance.lateMinutes > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          متأخر {todayAttendance.lateMinutes} دقيقة
                        </Badge>
                      )}
                    {todayAttendance.earlyLeaveMinutes !== null &&
                      todayAttendance.earlyLeaveMinutes > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">
                          انصراف مبكر {todayAttendance.earlyLeaveMinutes} دقيقة
                        </Badge>
                      )}
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
                      يوجد شفت مفتوح من يوم سابق ولم يُغلق بعد.
                    </p>
                    {checkInDate && (
                      <p className="text-xs text-amber-800">
                        وقت الحضور: {formatTimeWithTZ(checkInDate)} •{" "}
                        {formatDateWithTZ(checkInDate)}
                        {staleHours !== null && ` • مضى ${staleHours} ساعة`}
                      </p>
                    )}
                    <p className="text-xs text-amber-800">
                      أغلق الشفت العالق أولاً ليظهر زر تسجيل حضور لليوم الحالي
                      ويتم احتساب الإحصائيات بشكل صحيح.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleCheckOut}
                    disabled={checkingOut}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {checkingOut ? "جاري الإغلاق..." : "إغلاق الشفت العالق"}
                  </Button>
                </div>
              </div>
            )}

            {/* Work Mode Selection */}
            {(canCheckIn || canCheckOut) && (
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
                  <button
                    onClick={() => setWorkMode("OFFICE")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 ${workMode === "OFFICE"
                        ? "bg-white dark:bg-gray-700 text-blue-600 shadow-md scale-105"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                  >
                    <MapPin className={`h-4 w-4 ${workMode === "OFFICE" ? "text-blue-500" : ""}`} />
                    <span className="font-bold">من الشركة</span>
                  </button>
                  <button
                    onClick={() => setWorkMode("HOME")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all duration-300 ${workMode === "HOME"
                        ? "bg-white dark:bg-gray-700 text-purple-600 shadow-md scale-105"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                  >
                    <Home className={`h-4 w-4 ${workMode === "HOME" ? "text-purple-500" : ""}`} />
                    <span className="font-bold">من المنزل</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              {canCheckIn && (
                <Button
                  data-testid="attendance-checkin-button"
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-6 w-6" />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              )}

              {canCheckOut && (
                <Button
                  data-testid="attendance-checkout-button"
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 text-lg w-full sm:w-auto"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? (
                    <>
                      <div className="mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-6 w-6" />
                      تسجيل انصراف
                    </>
                  )}
                </Button>
              )}

              {!canCheckIn && !canCheckOut && (
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-gray-900">
                    تم تسجيل الحضور والانصراف لهذا اليوم
                  </p>
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              <span>سيتم تسجيل موقعك تلقائياً</span>
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
                أهداف اليوم
              </CardTitle>
              <p className="text-sm text-indigo-800/80 dark:text-indigo-200/80">
                هذه الأهداف تُحدَّث قبل الانصراف، وأي رقم تدخله هنا يرفع التقدم للهدف الأب تلقائيًا.
              </p>
            </div>
            {canCheckOut ? (
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-100">
                راجعها قبل checkout
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
                      {goal.parentGoal?.title ? `يتبع: ${goal.parentGoal.title}` : "هدف يومي مباشر"}
                      {goal.project?.name ? ` • ${goal.project.name}` : ""}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    {Number(goal.currentValue || 0).toLocaleString("ar-EG")} /{" "}
                    {Number(goal.targetValue || 0).toLocaleString("ar-EG")}{" "}
                    {goal.unit || ""}
                  </div>
                </div>
                <Progress
                  value={Math.max(0, Math.min(100, Number(goal.progress || 0)))}
                  className="mt-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نسبة الحضور</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.attendanceRate || 0).toFixed(1)}%
              </div>
              <Progress
                value={Math.min(
                  100,
                  Math.max(0, Number(stats.attendanceRate || 0)),
                )}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">أيام الحضور</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.presentDays}</div>
              <p className="text-xs text-gray-500 mt-1">
                من {stats.totalDays} يوم
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                أيام التأخير
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lateDays}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalDays
                  ? ((stats.lateDays / stats.totalDays) * 100).toFixed(1)
                  : "0.0"}
                % من الأيام
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ساعات العمل</CardTitle>
              <Timer className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(stats.totalWorkHours || 0).toFixed(1)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                إضافي: {Number(stats.totalOvertimeHours || 0).toFixed(1)} ساعة
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Attendance */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle>سجل الحضور</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setRecentPage(1);
              }}
              className="w-[160px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {recentAttendance.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              لا يوجد سجل حضور حتى الآن
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحضور</TableHead>
                    <TableHead className="text-right">الانصراف</TableHead>
                    <TableHead className="text-right">الموقع</TableHead>
                    <TableHead className="text-right">نوع العمل</TableHead>
                    <TableHead className="text-right">ساعات العمل</TableHead>
                  <TableHead className="text-right">التأخير</TableHead>
                  <TableHead className="text-right">انصراف مبكر</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAttendance.map((record) => {
                  const StatusIcon =
                      statusConfig[record.status]?.icon || Clock;
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateWithTZ(record.date)}</TableCell>
                        <TableCell>
                          {record.checkIn ? (
                            <span className="text-green-600 font-medium">
                              {formatTimeWithTZ(record.checkIn)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <span className="text-blue-600 font-medium">
                              {formatTimeWithTZ(record.checkOut)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderLocationInfo(
                            record.checkInLocation,
                            record.checkOutLocation,
                          )}
                        </TableCell>
                        <TableCell>
                          {record.workMode === "HOME" ? (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold w-fit">
                              <Home className="h-3 w-3" />
                              <span>منزل</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold w-fit">
                              <Building2 className="h-3 w-3" />
                              <span>مكتب</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.workHours ? (
                            <span>
                              {Number(record.workHours).toFixed(1)} ساعة
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(record.lateMinutes) > 0 ? (
                            <span className="text-red-600">
                              {record.lateMinutes} دقيقة
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(record.earlyLeaveMinutes) > 0 ? (
                            <span className="text-amber-700">
                              {record.earlyLeaveMinutes} دقيقة
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={statusConfig[record.status]?.color || ""}
                          >
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig[record.status]?.label ||
                              record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination */}
          {recentAttendance.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                عرض {recentAttendance.length} سجل
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={recentPage <= 1}
                  onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm">صفحة {recentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMoreRecent}
                  onClick={() => setRecentPage((p) => p + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showGoalsReviewDialog}
        onOpenChange={(open) => {
          if (!checkingOut) {
            setShowGoalsReviewDialog(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              تحديث أهداف اليوم قبل الانصراف
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              أدخل ما أُنجز فعليًا حتى الآن. سيتم تحديث الهدف اليومي ثم الهدف الأب تلقائيًا.
            </p>

            {todayGoals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-border/70 bg-muted/15 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium">{goal.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {Number(goal.currentValue || 0).toLocaleString("ar-EG")} /{" "}
                      {Number(goal.targetValue || 0).toLocaleString("ar-EG")}{" "}
                      {goal.unit || ""}
                    </div>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">
                      المنجز الحالي
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={goalProgressDrafts[goal.id] || ""}
                      onChange={(event) =>
                        setGoalProgressDrafts((prev) => ({
                          ...prev,
                          [goal.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGoalsReviewDialog(false)}
              disabled={checkingOut}
            >
              رجوع
            </Button>
            <Button
              data-testid="attendance-goals-review-submit"
              onClick={submitGoalUpdatesAndCheckOut}
              disabled={checkingOut}
            >
              {checkingOut ? "جارٍ الحفظ والانصراف..." : "حفظ ثم تسجيل الانصراف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Map Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="sm:max-w-4xl sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              موقع {selectedLocation?.type}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedLocation && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>الإحداثيات:</strong>{" "}
                    {selectedLocation.latitude.toFixed(6)},{" "}
                    {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Google Maps Embed */}
                <div className="w-full h-96 rounded-lg overflow-hidden border">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${envConfig.googleMapsApiKey || ""}&q=${selectedLocation.latitude},${selectedLocation.longitude}&zoom=16`}
                    allowFullScreen
                    title={`خريطة موقع ${selectedLocation.type}`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}`;
                      window.open(url, "_blank");
                    }}
                  >
                    فتح في Google Maps
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${selectedLocation.latitude}, ${selectedLocation.longitude}`,
                      );
                      toast.success("تم نسخ الإحداثيات");
                    }}
                  >
                    نسخ الإحداثيات
                  </Button>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapModal(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyAttendance;
