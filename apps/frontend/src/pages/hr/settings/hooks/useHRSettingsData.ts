import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../../../services/api";
import { tToast } from "../../../../utils/i18n-toast";
import { useAuth } from "../../../../hooks/useAuthSimple";
import {
  defaultHRSettings,
  type HRSettingsData,
  type NotificationHealth,
  type NotificationRecipientEmployeeOption,
} from "../types/hrSettingsTypes";

function safeParseJson(data: unknown, defaultValue: unknown = []) {
  if (!data) return defaultValue;
  if (Array.isArray(data)) return data;
  try {
    let parsed: unknown = typeof data === "string" ? JSON.parse(data) : data;
    let depth = 0;
    while (typeof parsed === "string" && depth < 5) {
      parsed = JSON.parse(parsed);
      depth++;
    }
    return Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null
        ? parsed
        : defaultValue;
  } catch {
    return defaultValue;
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function useHRSettingsData() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HRSettingsData>(defaultHRSettings);
  const [originalSettings, setOriginalSettings] = useState<HRSettingsData>(defaultHRSettings);
  const [activeTab, setActiveTab] = useState("working-hours");
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const [availableRecipientEmployees, setAvailableRecipientEmployees] = useState<
    NotificationRecipientEmployeeOption[]
  >([]);
  const [loadingRecipientEmployees, setLoadingRecipientEmployees] = useState(false);
  const [notificationHealth, setNotificationHealth] = useState<NotificationHealth | null>(null);
  const [selectedRecipientEmployeeId, setSelectedRecipientEmployeeId] = useState("");

  const [gettingLocation, setGettingLocation] = useState(false);
  const [testingLocation, setTestingLocation] = useState(false);
  const [locationTestResult, setLocationTestResult] = useState<{
    distance: number;
    isWithinRange: boolean;
  } | null>(null);

  const hasUnsavedChanges = useRef(false);

  const hasUnsavedChangesValue =
    JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    hasUnsavedChanges.current = hasUnsavedChangesValue;
  }, [hasUnsavedChangesValue]);

  // Read tab from query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const fetchRecipientEmployees = useCallback(async () => {
    try {
      setLoadingRecipientEmployees(true);
      const response = await api.get("/hr/employees?limit=1000&status=ACTIVE");
      const employees = Array.isArray(response.data?.employees)
        ? response.data.employees
        : [];

      const normalizedEmployees = employees
        .map((employee: any) => ({
          id: employee.userId || employee.id,
          name:
            `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
            employee.name ||
            "موظف",
          phone:
            employee.phone ||
            employee.mobile ||
            employee.user?.phone ||
            "",
          employeeNumber: employee.employeeNumber || undefined,
          department:
            employee.department?.name ||
            employee.department?.title ||
            employee.departmentRelation?.name ||
            employee.department ||
            undefined,
        }))
        .filter((employee: NotificationRecipientEmployeeOption) => Boolean(employee.id));

      setAvailableRecipientEmployees(normalizedEmployees);
    } catch (error) {
      console.error("Error fetching recipient employees:", error);
      tToast.error("hrSettings.unable_load_6108");
    } finally {
      setLoadingRecipientEmployees(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrors({});
      const response = await api.get("/v1/hr/settings");

      if (response.data.settings) {
        const loadedSettings: HRSettingsData = {
          ...defaultHRSettings,
          ...response.data.settings,
        };

        loadedSettings.lateWarningLevels = safeParseJson(
          loadedSettings.lateWarningLevels,
          [],
        );
        loadedSettings.delayPenaltyTiers = safeParseJson(
          loadedSettings.delayPenaltyTiers,
          [],
        );
        loadedSettings.notificationRecipients = safeParseJson(
          loadedSettings.notificationRecipients,
          [],
        );

        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
        setNotificationHealth(response.data.notificationHealth || null);
        hasUnsavedChanges.current = false;
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      const errorMessage =
        error.response?.data?.error || "حدث خطأ أثناء تحميل الإعدادات";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth gate check
  const userRole = user?.role;
  const userId = user?.id;

  useEffect(() => {
    if (
      userRole &&
      !["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "OWNER"].includes(userRole)
    ) {
      tToast.error("hrSettings.msg_9d30");
      navigate("/");
      return;
    }
    void fetchSettings();
    void fetchRecipientEmployees();
  }, [userId, userRole, navigate, fetchSettings, fetchRecipientEmployees]);

  const addSelectedRecipientEmployee = useCallback(() => {
    if (!selectedRecipientEmployeeId) {
      tToast.error("hrSettings.msg_ea7d");
      return;
    }

    const selectedEmployee = availableRecipientEmployees.find(
      (employee) => employee.id === selectedRecipientEmployeeId,
    );

    if (!selectedEmployee) {
      tToast.error("hrSettings.msg_0101");
      return;
    }

    if (!selectedEmployee.phone) {
      tToast.error("hrSettings.msg_fca0");
      return;
    }

    const isAlreadyAdded = settings.notificationRecipients.some(
      (recipient) =>
        recipient.employeeId === selectedEmployee.id ||
        recipient.phone === selectedEmployee.phone,
    );

    if (isAlreadyAdded) {
      tToast.error("hrSettings.msg_092a");
      return;
    }

    setSettings((previous) => ({
      ...previous,
      notificationRecipients: [
        ...previous.notificationRecipients,
        {
          employeeId: selectedEmployee.id,
          name: selectedEmployee.name,
          phone: selectedEmployee.phone,
          types: ["ALL"],
        },
      ],
    }));
    setSelectedRecipientEmployeeId("");
  }, [availableRecipientEmployees, selectedRecipientEmployeeId, settings.notificationRecipients]);

  const removeNotificationRecipient = useCallback((index: number) => {
    setSettings((previous) => ({
      ...previous,
      notificationRecipients: previous.notificationRecipients.filter((_, i) => i !== index),
    }));
  }, []);

  const validateSettings = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (settings.maxAdvancePercentage < 0 || settings.maxAdvancePercentage > 100) {
      newErrors.maxAdvancePercentage = "النسبة يجب أن تكون بين 0 و 100";
    }
    if (settings.taxRate < 0 || settings.taxRate > 100) {
      newErrors.taxRate = "نسبة الضريبة يجب أن تكون بين 0 و 100";
    }
    if (settings.socialInsuranceRate < 0 || settings.socialInsuranceRate > 100) {
      newErrors.socialInsuranceRate = "نسبة التأمينات يجب أن تكون بين 0 و 100";
    }
    if (settings.probationLeavePercentage < 0 || settings.probationLeavePercentage > 100) {
      newErrors.probationLeavePercentage = "النسبة يجب أن تكون بين 0 و 100";
    }

    if (settings.geofenceEnabled) {
      const lat = parseFloat(settings.officeLatitude);
      const lng = parseFloat(settings.officeLongitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.officeLatitude = "خط العرض يجب أن يكون رقم صحيح بين -90 و 90";
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.officeLongitude = "خط الطول يجب أن يكون رقم صحيح بين -180 و 180";
      }
      if (settings.geofenceRadius < 50 || settings.geofenceRadius > 5000) {
        newErrors.geofenceRadius = "نطاق البصمة يجب أن يكون بين 50 و 5000 متر";
      }
    }

    if (settings.workingDays.length === 0) {
      newErrors.workingDays = "يجب تحديد يوم عمل واحد على الأقل";
    }

    if (settings.annualLeaveDefault < 0) {
      newErrors.annualLeaveDefault = "يجب أن يكون الرقم موجب";
    }
    if (settings.sickLeaveDefault < 0) {
      newErrors.sickLeaveDefault = "يجب أن يكون الرقم موجب";
    }

    if (settings.aiOwnerNotificationsEnabled) {
      const hasPrimaryRecipient = Boolean(settings.ownerWhatsAppNumber.trim());
      const additionalRecipientsCount = settings.notificationRecipients.filter(
        (recipient) => Boolean(recipient.phone?.trim()),
      ).length;

      if (!hasPrimaryRecipient && additionalRecipientsCount === 0) {
        newErrors.aiOwnerNotificationsEnabled =
          "فعّلي رقم واتساب أساسي أو أضيفي مستلمًا واحدًا على الأقل";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settings]);

  const handleSave = useCallback(async () => {
    if (!validateSettings()) {
      tToast.error("hrSettings.msg_ff3c");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/v1/hr/settings", settings);

      if (response.data && response.data.settings) {
        const savedSettings = response.data.settings;

        savedSettings.lateWarningLevels = safeParseJson(savedSettings.lateWarningLevels, []);
        savedSettings.delayPenaltyTiers = safeParseJson(savedSettings.delayPenaltyTiers, []);
        savedSettings.notificationRecipients = safeParseJson(savedSettings.notificationRecipients, []);

        const updatedSettings: HRSettingsData = { ...defaultHRSettings, ...savedSettings };
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setNotificationHealth(response.data.notificationHealth || null);
      } else {
        setOriginalSettings(settings);
      }

      hasUnsavedChanges.current = false;
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (error: any) {
      console.error("Save failed:", error);
      const errorMessage = error.response?.data?.error || "حدث خطأ أثناء حفظ الإعدادات";
      toast.error(errorMessage, {
        description: error.response?.data?.details || "يرجى المحاولة مرة أخرى",
      });
    } finally {
      setSaving(false);
    }
  }, [settings, validateSettings]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && hasUnsavedChangesValue) {
          void handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, hasUnsavedChangesValue, handleSave]);

  // Before unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      tToast.error("hrSettings.msg_0d63");
      return;
    }

    setGettingLocation(true);
    setLocationTestResult(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSettings((previous) => ({
          ...previous,
          officeLatitude: latitude.toFixed(6),
          officeLongitude: longitude.toFixed(6),
        }));
        setGettingLocation(false);
        toast.success("تم الحصول على الموقع الحالي بنجاح");
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = "فشل الحصول على الموقع";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "تم رفض الإذن للوصول إلى الموقع";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "الموقع غير متاح";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "انتهت مهلة الحصول على الموقع";
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  const testCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      tToast.error("hrSettings.msg_0d63");
      return;
    }

    const officeLat = parseFloat(settings.officeLatitude);
    const officeLng = parseFloat(settings.officeLongitude);

    if (isNaN(officeLat) || isNaN(officeLng)) {
      tToast.error("hrSettings.msg_7cfc");
      return;
    }

    setTestingLocation(true);
    setLocationTestResult(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(officeLat, officeLng, latitude, longitude);
        const isWithinRange = distance <= settings.geofenceRadius;

        setLocationTestResult({
          distance: Math.round(distance),
          isWithinRange,
        });
        setTestingLocation(false);

        if (isWithinRange) {
          toast.success(`أنت داخل النطاق! المسافة: ${Math.round(distance)} متر`);
        } else {
          toast.warning(`أنت خارج النطاق! المسافة: ${Math.round(distance)} متر`);
        }
      },
      (error) => {
        setTestingLocation(false);
        let errorMessage = "فشل الحصول على الموقع";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "تم رفض الإذن للوصول إلى الموقع";
        }
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [settings.geofenceRadius, settings.officeLatitude, settings.officeLongitude]);

  const openInGoogleMaps = useCallback(() => {
    const lat = parseFloat(settings.officeLatitude);
    const lng = parseFloat(settings.officeLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      tToast.error("hrSettings.msg_4dae");
      return;
    }

    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  }, [settings.officeLatitude, settings.officeLongitude]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (hasUnsavedChangesValue) {
        setPendingNavigation(tabId);
        setShowUnsavedDialog(true);
      } else {
        setActiveTab(tabId);
      }
    },
    [hasUnsavedChangesValue],
  );

  const confirmNavigation = useCallback(() => {
    if (pendingNavigation) {
      setActiveTab(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowUnsavedDialog(false);
  }, [pendingNavigation]);

  const cancelNavigation = useCallback(() => {
    setPendingNavigation(null);
    setShowUnsavedDialog(false);
  }, []);

  const toggleWorkingDay = useCallback((day: string) => {
    setSettings((previous) => {
      const newWorkingDays = previous.workingDays.includes(day)
        ? previous.workingDays.filter((d) => d !== day)
        : [...previous.workingDays, day];
      return {
        ...previous,
        workingDays: newWorkingDays,
      };
    });

    setErrors((previous) => {
      if (previous.workingDays) {
        const next = { ...previous };
        delete next.workingDays;
        return next;
      }
      return previous;
    });
  }, []);

  const configuredAdditionalRecipientsCount = settings.notificationRecipients.filter(
    (recipient) => Boolean(recipient.phone?.trim()),
  ).length;

  const hasConfiguredRecipient =
    Boolean(settings.ownerWhatsAppNumber.trim()) ||
    configuredAdditionalRecipientsCount > 0 ||
    Boolean(notificationHealth?.hasCompanyPhoneFallback);

  const connectedSessionCount = notificationHealth?.connectedSessionCount || 0;
  const hasConnectedSession = connectedSessionCount > 0;

  const activeNotificationIssues: string[] = [];
  if (settings.aiOwnerNotificationsEnabled && !hasConfiguredRecipient) {
    activeNotificationIssues.push("no_recipient_configured");
  }
  if (settings.aiOwnerNotificationsEnabled && !hasConnectedSession) {
    activeNotificationIssues.push("no_whatsapp_session");
  }

  const readyRecipientsCount =
    Number(Boolean(settings.ownerWhatsAppNumber.trim())) +
    configuredAdditionalRecipientsCount +
    Number(
      !settings.ownerWhatsAppNumber.trim() &&
        configuredAdditionalRecipientsCount === 0 &&
        Boolean(notificationHealth?.hasCompanyPhoneFallback),
    );

  const isWhatsAppDeliveryReady =
    settings.aiOwnerNotificationsEnabled &&
    hasConfiguredRecipient &&
    hasConnectedSession;

  return {
    loading,
    saving,
    settings,
    setSettings,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    errors,
    setErrors,
    showUnsavedDialog,
    hasUnsavedChangesValue,
    notificationHealth,
    availableRecipientEmployees,
    loadingRecipientEmployees,
    selectedRecipientEmployeeId,
    setSelectedRecipientEmployeeId,
    gettingLocation,
    testingLocation,
    locationTestResult,
    configuredAdditionalRecipientsCount,
    hasConfiguredRecipient,
    connectedSessionCount,
    hasConnectedSession,
    activeNotificationIssues,
    readyRecipientsCount,
    isWhatsAppDeliveryReady,
    fetchSettings,
    handleSave,
    handleTabChange,
    confirmNavigation,
    cancelNavigation,
    toggleWorkingDay,
    addSelectedRecipientEmployee,
    removeNotificationRecipient,
    getCurrentLocation,
    testCurrentLocation,
    openInGoogleMaps,
  };
}

export type UseHRSettingsDataReturn = ReturnType<typeof useHRSettingsData>;
