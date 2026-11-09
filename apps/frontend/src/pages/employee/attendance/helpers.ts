import React from "react";
import { AlertCircle, Calendar, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { GeofenceModalData } from "./types";

export const statusConfig: Record<
  string,
  {
    labelKey: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  PRESENT: {
    labelKey: "employee.attendance.statusPresent",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  ABSENT: {
    labelKey: "employee.attendance.statusAbsent",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  LATE: {
    labelKey: "employee.attendance.statusLate",
    color: "bg-yellow-100 text-yellow-800",
    icon: AlertCircle,
  },
  ON_LEAVE: {
    labelKey: "employee.attendance.statusOnLeave",
    color: "bg-purple-100 text-purple-800",
    icon: Calendar,
  },
};

export const getApiError = (error: unknown) =>
  error as {
    response?: {
      status?: number;
      data?: {
        error?: string;
        geofenceData?: {
          distance: number;
          allowedRadius: number;
          requiresLocation?: boolean;
        };
      };
    };
  };

export const getLocationPayload = async () => {
  if (!navigator.geolocation) {
    return null;
  }

  const getPosition = (
    enableHighAccuracy: boolean,
    timeout: number,
  ): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy,
        timeout,
        maximumAge: 60000,
      });
    });

  try {
    let position: GeolocationPosition;
    try {
      position = await getPosition(true, 12000);
    } catch {
      position = await getPosition(false, 10000);
    }

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return null;
  }
};

export const handleAttendanceActionError = (
  error: unknown,
  t: TFunction,
  mode: "checkin" | "checkout",
  onGeofenceModal?: (data: GeofenceModalData) => void,
) => {
  const apiError = getApiError(error);

  if (
    apiError.response?.status === 403 &&
    apiError.response?.data?.geofenceData
  ) {
    const geofenceData = apiError.response.data.geofenceData;

    // Use dialog if callback provided and (requires location OR attemptId is present)
    if (onGeofenceModal && (geofenceData.requiresLocation || geofenceData.attemptId)) {
      onGeofenceModal(geofenceData);
      return;
    }

    // Fall back to toast if attemptId is missing or no dialog callback
    if (geofenceData.requiresLocation) {
      toast.error(t("employee.attendance.locationRequired"), {
        description: t("employee.attendance.locationRequiredDesc"),
        duration: 8000,
      });
      return;
    }
    const { distance, allowedRadius } = geofenceData;
    const distanceToMove = Math.round((distance || 0) - (allowedRadius || 0));
    toast.error(t("employee.attendance.geofenceError"), {
      description: t("employee.attendance.geofenceDetail", {
        distance: Math.round(distance || 0),
        allowed: allowedRadius || 0,
        toMove: distanceToMove,
      }),
      duration: 8000,
    });
    return;
  }

  if (apiError.response?.status === 400) {
    toast.error(t("employee.attendance.dataError"), {
      description:
        apiError.response?.data?.error ||
        (mode === "checkout"
          ? t("employee.attendance.notCheckedInYet")
          : t("employee.attendance.dataErrorDesc")),
    });
    return;
  }

  if (apiError.response?.status === 401) {
    toast.error(t("employee.attendance.sessionExpired"), {
      description: t("employee.attendance.sessionExpiredDesc"),
    });
    return;
  }

  if (!navigator.onLine) {
    toast.error(t("employee.attendance.noInternet", "انقطاع الاتصال بالإنترنت"), {
      description: t("employee.attendance.noInternetDesc", "تعذر الاتصال بالسيرفر بسبب انقطاع الإنترنت. تم حفظ البصمة في الطابور المحلي وسيتم إرسالها تلقائياً."),
      duration: 8000,
    });
    return;
  }

  const explicitError =
    apiError.response?.data?.error ||
    (typeof apiError.message === "string" && !apiError.message.includes("[object") ? apiError.message : null) ||
    (apiError.response?.status === 500
      ? "خطأ في السيرفر أثناء معالجة البصمة (500). تم حفظ البصمة محلياً لضمان عدم ضياعها."
      : apiError.response?.status === 403
      ? "البصمة غير مصرح بها. يرجى مراجعة شبكة الفرع أو تقديم طلب اعتماد بصمة للمالك."
      : apiError.response?.status === 404
      ? "الخدمة غير متوفرة بالسيرفر (404)."
      : "تعذر تسجيل البصمة بالسيرفر. تم توثيق المحاولة محلياً.");

  toast.error(
    mode === "checkout"
      ? "فشل تسجيل الانصراف — السبب:"
      : "فشل تسجيل الحضور — السبب:",
    {
      description: explicitError,
      duration: 8000,
    },
  );
};

export const formatTime = (date: Date) =>
  date.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

export const formatDate = (date: Date) =>
  date.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const isSameDayTZ = (a: Date, b: Date, timezone: string) =>
  a.toLocaleDateString("en-CA", { timeZone: timezone }) ===
  b.toLocaleDateString("en-CA", { timeZone: timezone });

export const formatDateWithTZ = (date: string | Date, timezone: string) =>
  new Date(date).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });

export const formatTimeWithTZ = (date: string | Date, timezone: string) =>
  new Date(date).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });

export const parseLocationJson = (
  locationStr: string | null,
): { latitude: number; longitude: number } | null => {
  if (!locationStr) return null;
  try {
    return JSON.parse(locationStr);
  } catch {
    return null;
  }
};
