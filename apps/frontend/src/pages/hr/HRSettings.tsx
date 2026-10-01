import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Calendar,
  DollarSign,
  Save,
  RefreshCw,
  Users,
  Bell,
  FileText,
  AlertTriangle,
  Briefcase,
  Home,
  Gift,
  Lock,
  Baby,
  Heart,
  Plane,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  MapPin,
  Navigation,
  ExternalLink,
  Loader2,
  TrendingUp,
  Calculator,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Separator } from "../../components/ui/separator";
import api from "../../services/api";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";

interface NotificationRecipient {
  employeeId?: string;
  name: string;
  phone: string;
  types: string[];
}

interface NotificationRecipientEmployeeOption {
  id: string;
  name: string;
  phone: string;
  employeeNumber?: string;
  department?: string;
}

interface NotificationHealth {
  aiOwnerNotificationsEnabled: boolean;
  hasPrimaryRecipientConfigured: boolean;
  hasCompanyPhoneFallback: boolean;
  additionalRecipientsCount: number;
  hasAnyRecipientConfigured: boolean;
  connectedSessionCount: number;
  hasConnectedSession: boolean;
  isReadyForWhatsAppDelivery: boolean;
  issues: string[];
}

interface HRSettingsData {
  // Working Hours
  workingDays: string[];

  // Leave Settings
  annualLeaveDefault: number;
  sickLeaveDefault: number;
  carryOverLimit: number;
  requireApproval: boolean;
  minAdvanceNotice: number;

  // Additional Leave Types
  maternityLeaveDays: number;
  paternityLeaveDays: number;
  marriageLeaveDays: number;
  bereavementLeaveDays: number;
  hajjLeaveDays: number;
  unpaidLeaveAllowed: boolean;

  // Payroll Settings
  payrollDay: number;
  currency: string;
  taxRate: number;
  socialInsuranceRate: number;
  overtimeRate: number;

  // Allowances
  transportationAllowance: number;
  housingAllowance: number;
  phoneAllowance: number;
  mealAllowance: number;

  // Advance Settings
  maxAdvancePercentage: number;
  maxActiveAdvances: number;
  minMonthsForAdvance: number;
  advanceRepaymentMonths: number;

  // Attendance Settings
  allowRemoteCheckIn: boolean;
  requireLocation: boolean;
  lateThreshold: number;
  earlyLeaveThreshold: number;
  autoAbsentMarking: boolean;
  monthlyLateLimit: number;
  lateWarningThreshold: number;
  lateWarningLevels: Array<{ count: number; deductionFactor: number }>;

  // Geofencing Settings
  geofenceEnabled: boolean;
  officeLatitude: string;
  officeLongitude: string;
  geofenceRadius: number;

  // Auto Deduction Settings (New System)
  autoDeductionEnabled: boolean;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  maxDailyDeductionDays: number;
  earlyCheckoutEnabled: boolean;
  earlyCheckoutThresholdMinutes: number;
  firstViolationMultiplier: number;
  secondViolationMultiplier: number;
  thirdViolationMultiplier: number;
  notifyAtPercentage: number;
  notifyOnDeduction: boolean;
  notifyOnGraceReset: boolean;
  deductionCalculationMethod: string;
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  requireDeductionReview: boolean;
  absencePenaltyRate: number;
  delayPenaltyTiers: string;

  // Discipline & Warnings
  verbalWarningThreshold: number;
  writtenWarningThreshold: number;
  deductionWarningThreshold: number;
  suspensionThreshold: number;
  terminationThreshold: number;
  warningExpiryMonths: number;
  autoWarningOnLateness: boolean;
  autoWarningOnAbsence: boolean;

  // Probation Settings
  probationPeriodMonths: number;
  probationEvaluationRequired: boolean;
  reducedLeavesDuringProbation: boolean;
  probationLeavePercentage: number;

  // Employment Policies
  noticePeriodDays: number;
  endOfServiceCalculation: string;
  contractRenewalNoticeDays: number;
  retirementAge: number;
  requireClearance: boolean;

  // Remote Work
  remoteWorkAllowed: boolean;
  maxRemoteDaysPerWeek: number;
  remoteWorkApprovalRequired: boolean;
  remoteWorkEquipmentProvided: boolean;

  // Security & Privacy
  dataRetentionYears: number;
  employeeDataAccessLevel: string;
  requireTwoFactorAuth: boolean;
  sessionTimeoutMinutes: number;

  // Notifications
  notifyOnLeaveRequest: boolean;
  notifyOnAttendanceIssue: boolean;
  notifyOnPayrollGeneration: boolean;
  notifyManagers: boolean;
  notifyOnWarning: boolean;
  notifyOnProbationEnd: boolean;
  notifyOnContractExpiry: boolean;
  // WhatsApp owner notification settings
  aiOwnerNotificationsEnabled: boolean;
  ownerWhatsAppNumber: string;
  notificationRecipients: NotificationRecipient[];
  aiNotificationTypes: string[];
  aiNotificationTone: 'PROFESSIONAL' | 'FRIENDLY' | 'URGENT';
}

const defaultSettings: HRSettingsData = {
  workingDays: ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday"],

  annualLeaveDefault: 21,
  sickLeaveDefault: 15,
  carryOverLimit: 5,
  requireApproval: true,
  minAdvanceNotice: 3,

  maternityLeaveDays: 90,
  paternityLeaveDays: 3,
  marriageLeaveDays: 5,
  bereavementLeaveDays: 3,
  hajjLeaveDays: 15,
  unpaidLeaveAllowed: true,

  payrollDay: 25,
  currency: "EGP",
  taxRate: 0, // تم تعديل القيمة الافتراضية للضرائب
  socialInsuranceRate: 0, // تم تعديل القيمة الافتراضية للتأمينات
  overtimeRate: 1.0,

  transportationAllowance: 0,
  housingAllowance: 0,
  phoneAllowance: 0,
  mealAllowance: 0,

  maxAdvancePercentage: 50,
  maxActiveAdvances: 1,
  minMonthsForAdvance: 3,
  advanceRepaymentMonths: 6,

  allowRemoteCheckIn: true,
  requireLocation: false,
  lateThreshold: 15,
  earlyLeaveThreshold: 15,
  autoAbsentMarking: true,
  monthlyLateLimit: 3,
  lateWarningThreshold: 3,
  lateWarningLevels: [
    { count: 1, deductionFactor: 0.25 },
    { count: 2, deductionFactor: 0.5 },
    { count: 3, deductionFactor: 1.0 },
  ],

  geofenceEnabled: false,
  officeLatitude: "",
  officeLongitude: "",
  geofenceRadius: 200,

  autoDeductionEnabled: false,
  gracePeriodMinutes: 60,
  lateThresholdMinutes: 10,
  maxDailyDeductionDays: 1.0,
  earlyCheckoutEnabled: true,
  earlyCheckoutThresholdMinutes: 0,
  firstViolationMultiplier: 1.0,
  secondViolationMultiplier: 2.0,
  thirdViolationMultiplier: 3.0,
  notifyAtPercentage: 75,
  notifyOnDeduction: true,
  notifyOnGraceReset: true,
  deductionCalculationMethod: "minute",
  workingDaysPerMonth: 22,
  workingHoursPerDay: 8,
  requireDeductionReview: true,
  absencePenaltyRate: 1.0,
  delayPenaltyTiers: "[]",

  verbalWarningThreshold: 3,
  writtenWarningThreshold: 5,
  deductionWarningThreshold: 7,
  suspensionThreshold: 10,
  terminationThreshold: 15,
  warningExpiryMonths: 12,
  autoWarningOnLateness: true,
  autoWarningOnAbsence: true,

  probationPeriodMonths: 3,
  probationEvaluationRequired: true,
  reducedLeavesDuringProbation: true,
  probationLeavePercentage: 50,

  noticePeriodDays: 30,
  endOfServiceCalculation: "half_month_per_year",
  contractRenewalNoticeDays: 30,
  retirementAge: 60,
  requireClearance: true,

  remoteWorkAllowed: false,
  maxRemoteDaysPerWeek: 2,
  remoteWorkApprovalRequired: true,
  remoteWorkEquipmentProvided: false,

  dataRetentionYears: 7,
  employeeDataAccessLevel: "own_data_only",
  requireTwoFactorAuth: false,
  sessionTimeoutMinutes: 30,

  notifyOnLeaveRequest: true,
  notifyOnAttendanceIssue: true,
  notifyOnPayrollGeneration: true,
  notifyManagers: true,
  notifyOnWarning: true,
  notifyOnProbationEnd: true,
  notifyOnContractExpiry: true,
  // WhatsApp owner notification settings
  aiOwnerNotificationsEnabled: false,
  ownerWhatsAppNumber: "",
  notificationRecipients: [],
  aiNotificationTypes: [
    "PROMOTION",
    "DEDUCTION",
    "WARNING",
    "KUDOS",
    "TRAINING",
    "ADVANCE",
    "LEAVE",
    "ATTENDANCE",
    "PAYROLL",
    "PROBATION_END",
    "CONTRACT_EXPIRY",
  ],
  aiNotificationTone: "PROFESSIONAL",
};

const weekDays = [
  { value: "saturday", label: "السبت" },
  { value: "sunday", label: "الأحد" },
  { value: "monday", label: "الإثنين" },
  { value: "tuesday", label: "الثلاثاء" },
  { value: "wednesday", label: "الأربعاء" },
  { value: "thursday", label: "الخميس" },
  { value: "friday", label: "الجمعة" },
];

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  PunctualityRules,
  FinancialPenalties,
  CalculationEngine,
  PunctualityNotifications,
} from "../../components/hr/AutoDeductionSettings";

// Simple Tooltip Component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({
  content,
  children,
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap max-w-xs">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      )}
    </div>
  );
};

const HRSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HRSettingsData>(defaultSettings);
  const [originalSettings, setOriginalSettings] =
    useState<HRSettingsData>(defaultSettings);
  const [activeTab, setActiveTab] = useState("working-hours");
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [availableRecipientEmployees, setAvailableRecipientEmployees] =
    useState<NotificationRecipientEmployeeOption[]>([]);
  const [loadingRecipientEmployees, setLoadingRecipientEmployees] =
    useState(false);
  const [notificationHealth, setNotificationHealth] =
    useState<NotificationHealth | null>(null);
  const [selectedRecipientEmployeeId, setSelectedRecipientEmployeeId] =
    useState("");
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const hasUnsavedChanges = useRef(false);

  // Geofencing states
  const [gettingLocation, setGettingLocation] = useState(false);
  const [testingLocation, setTestingLocation] = useState(false);
  const [locationTestResult, setLocationTestResult] = useState<{
    distance: number;
    isWithinRange: boolean;
  } | null>(null);

  // Read tab from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (
      user &&
      !["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "OWNER"].includes(user.role)
    ) {
      tToast.error("hrSettings.msg_9d30");
      navigate("/");
      return;
    }
    fetchSettings();
    fetchRecipientEmployees();
  }, [user, navigate]);

  const fetchRecipientEmployees = async () => {
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
        .filter(
          (employee: NotificationRecipientEmployeeOption) =>
            Boolean(employee.id),
        );

      setAvailableRecipientEmployees(normalizedEmployees);
    } catch (error) {
      console.error("❌ [HR-SETTINGS] Error fetching recipient employees:", error);
      tToast.error("hrSettings.unable_load_6108");
    } finally {
      setLoadingRecipientEmployees(false);
    }
  };

  const addSelectedRecipientEmployee = () => {
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

    setSettings({
      ...settings,
      notificationRecipients: [
        ...settings.notificationRecipients,
        {
          employeeId: selectedEmployee.id,
          name: selectedEmployee.name,
          phone: selectedEmployee.phone,
          types: ["ALL"],
        },
      ],
    });
    setSelectedRecipientEmployeeId("");
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrors({});
      console.log("🔍 [HR-SETTINGS] Fetching settings...");
      const response = await api.get("/v1/hr/settings");
      console.log("✅ [HR-SETTINGS] Fetch successful:", response.data);

      if (response.data.settings) {
        // تحويل البيانات المستلمة إلى الصيغة المناسبة
        const loadedSettings = {
          ...defaultSettings,
          ...response.data.settings,
        };

        // Safe JSON parse helper for recursive strings
        const safeParseJson = (data: any, defaultValue: any = []) => {
          if (!data) return defaultValue;
          if (Array.isArray(data)) return data;
          try {
            let parsed = typeof data === "string" ? JSON.parse(data) : data;
            // Handle double/triple encoding
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
          } catch (e) {
            console.warn("⚠️ [HR-SETTINGS] Failed to parse JSON:", data);
            return defaultValue;
          }
        };

        // معالجة الحقول التي قد تكون مخزنة كـ JSON string
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

        console.log("🔄 [HR-SETTINGS] Processed settings:", loadedSettings);

        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
        setNotificationHealth(response.data.notificationHealth || null);
        hasUnsavedChanges.current = false;
      }
    } catch (error: any) {
      console.error("❌ [HR-SETTINGS] Error fetching settings:", error);
      const errorMessage =
        error.response?.data?.error || "حدث خطأ أثناء تحميل الإعدادات";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Validation function
  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate percentages (0-100)
    if (
      settings.maxAdvancePercentage < 0 ||
      settings.maxAdvancePercentage > 100
    ) {
      newErrors.maxAdvancePercentage = "النسبة يجب أن تكون بين 0 و 100";
    }
    if (settings.taxRate < 0 || settings.taxRate > 100) {
      newErrors.taxRate = "نسبة الضريبة يجب أن تكون بين 0 و 100";
    }
    if (
      settings.socialInsuranceRate < 0 ||
      settings.socialInsuranceRate > 100
    ) {
      newErrors.socialInsuranceRate = "نسبة التأمينات يجب أن تكون بين 0 و 100";
    }
    if (
      settings.probationLeavePercentage < 0 ||
      settings.probationLeavePercentage > 100
    ) {
      newErrors.probationLeavePercentage = "النسبة يجب أن تكون بين 0 و 100";
    }

    // Validate geofencing coordinates
    if (settings.geofenceEnabled) {
      const lat = parseFloat(settings.officeLatitude);
      const lng = parseFloat(settings.officeLongitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.officeLatitude = "خط العرض يجب أن يكون رقم صحيح بين -90 و 90";
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.officeLongitude =
          "خط الطول يجب أن يكون رقم صحيح بين -180 و 180";
      }
      if (settings.geofenceRadius < 50 || settings.geofenceRadius > 5000) {
        newErrors.geofenceRadius = "نطاق البصمة يجب أن يكون بين 50 و 5000 متر";
      }
    }

    // Validate working days
    if (settings.workingDays.length === 0) {
      newErrors.workingDays = "يجب تحديد يوم عمل واحد على الأقل";
    }

    // Validate positive numbers
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
  };

  const handleSave = async () => {
    console.log("🔍 [HR-SETTINGS] Save button clicked!", {
      settings,
      hasUnsavedChanges: hasUnsavedChangesValue,
      saving,
    });

    if (!validateSettings()) {
      console.log("❌ [HR-SETTINGS] Validation failed");
      tToast.error("hrSettings.msg_ff3c");
      return;
    }

    console.log("✅ [HR-SETTINGS] Validation passed, sending request...");

    try {
      setSaving(true);
      console.log(
        "🚀 [HR-SETTINGS] Sending PUT request to /v1/hr/settings:",
        settings,
      );

      const response = await api.put("/v1/hr/settings", settings);

      console.log("✅ [HR-SETTINGS] Save successful:", {
        status: response.status,
        data: response.data,
      });

      // تحديث الإعدادات الأصلية بالبيانات المُرجعة من الخادم
      if (response.data && response.data.settings) {
        const savedSettings = response.data.settings;

        // Safe JSON parse helper for recursive strings
        const safeParseJson = (data: any, defaultValue: any = []) => {
          if (!data) return defaultValue;
          if (Array.isArray(data)) return data;
          try {
            let parsed = typeof data === 'string' ? JSON.parse(data) : data;
            // Handle double/triple encoding
            let depth = 0;
            while (typeof parsed === 'string' && depth < 5) {
              parsed = JSON.parse(parsed);
              depth++;
            }
            return Array.isArray(parsed) ? parsed : (typeof parsed === 'object' && parsed !== null ? parsed : defaultValue);
          } catch (e) {
            console.warn('⚠️ [HR-SETTINGS] Failed to parse JSON:', data);
            return defaultValue;
          }
        };

        // Parse array fields
        savedSettings.lateWarningLevels = safeParseJson(savedSettings.lateWarningLevels, []);
        savedSettings.delayPenaltyTiers = safeParseJson(savedSettings.delayPenaltyTiers, []);
        savedSettings.notificationRecipients = safeParseJson(savedSettings.notificationRecipients, []);

        // دمج الإعدادات الحالية مع الإعدادات المُرجعة من الخادم
        const updatedSettings = { ...defaultSettings, ...savedSettings };
        setSettings(updatedSettings);
        setOriginalSettings(updatedSettings);
        setNotificationHealth(response.data.notificationHealth || null);
      } else {
        // إذا لم يتم إرجاع بيانات، استخدم الإعدادات الحالية
        setOriginalSettings(settings);
      }

      hasUnsavedChanges.current = false;
      toast.success("تم حفظ الإعدادات بنجاح", {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
    } catch (error: any) {
      console.error("❌ [HR-SETTINGS] Save failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });

      const errorMessage =
        error.response?.data?.error || "حدث خطأ أثناء حفظ الإعدادات";
      toast.error(errorMessage, {
        description: error.response?.data?.details || "يرجى المحاولة مرة أخرى",
      });
    } finally {
      setSaving(false);
    }
  };

  // Track changes: derived value for UI (re-renders), ref for beforeunload
  const hasUnsavedChangesValue =
    JSON.stringify(settings) !== JSON.stringify(originalSettings);
  useEffect(() => {
    hasUnsavedChanges.current = hasUnsavedChangesValue;
  }, [hasUnsavedChangesValue]);

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

  // Keyboard shortcut for save (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!saving && hasUnsavedChangesValue) {
          handleSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, hasUnsavedChangesValue]);

  // Warn before leaving with unsaved changes
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

  // Geofencing helper functions
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      tToast.error("hrSettings.msg_0d63");
      return;
    }

    setGettingLocation(true);
    setLocationTestResult(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSettings({
          ...settings,
          officeLatitude: latitude.toFixed(6),
          officeLongitude: longitude.toFixed(6),
        });
        setGettingLocation(false);
        toast.success("تم الحصول على الموقع الحالي بنجاح", {
          icon: <MapPin className="h-5 w-5 text-green-500" />,
        });
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
  };

  const testCurrentLocation = () => {
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
        const distance = calculateDistance(
          officeLat,
          officeLng,
          latitude,
          longitude,
        );
        const isWithinRange = distance <= settings.geofenceRadius;

        setLocationTestResult({
          distance: Math.round(distance),
          isWithinRange,
        });
        setTestingLocation(false);

        if (isWithinRange) {
          toast.success(
            `أنت داخل النطاق! المسافة: ${Math.round(distance)} متر`,
            {
              icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
            },
          );
        } else {
          toast.warning(
            `أنت خارج النطاق! المسافة: ${Math.round(distance)} متر`,
            {
              icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
            },
          );
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
  };

  const openInGoogleMaps = () => {
    const lat = parseFloat(settings.officeLatitude);
    const lng = parseFloat(settings.officeLongitude);

    if (isNaN(lat) || isNaN(lng)) {
      tToast.error("hrSettings.msg_4dae");
      return;
    }

    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleTabChange = (tabId: string) => {
    if (hasUnsavedChangesValue) {
      setPendingNavigation(tabId);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(tabId);
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation) {
      setActiveTab(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowUnsavedDialog(false);
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    setShowUnsavedDialog(false);
  };

  const toggleWorkingDay = (day: string) => {
    const newWorkingDays = settings.workingDays.includes(day)
      ? settings.workingDays.filter((d) => d !== day)
      : [...settings.workingDays, day];

    setSettings({
      ...settings,
      workingDays: newWorkingDays,
    });

    // Clear error if working days are now valid
    if (newWorkingDays.length > 0 && errors.workingDays) {
      const newErrors = { ...errors };
      delete newErrors.workingDays;
      setErrors(newErrors);
    }
  };

  const tabs = [
    {
      id: "working-hours",
      label: "ساعات العمل",
      icon: Clock,
      description: "إدارة جدول العمل الأسبوعي",
      keywords: "ساعات عمل جدول أسبوع",
    },
    {
      id: "leaves",
      label: "الإجازات",
      icon: Calendar,
      description: "تكوين سياسات الإجازات",
      keywords: "إجازة إجازات سنوية مرضية",
    },
    {
      id: "payroll",
      label: "الرواتب",
      icon: DollarSign,
      description: "تكوين حسابات الرواتب",
      keywords: "راتب رواتب راتب ضريبة",
    },
    {
      id: "allowances",
      label: "البدلات",
      icon: Gift,
      description: "البدلات والمزايا الافتراضية",
      keywords: "بدل بدلات مواصلات سكن",
    },
    {
      id: "attendance",
      label: "الحضور والخصومات الالية",
      icon: Users,
      description: "سياسات الحضور والانصراف والخصم التلقائي",
      keywords: "حضور انصراف تأخير بصمة خصم تلقائي",
    },
    {
      id: "discipline",
      label: "الجزاءات",
      icon: AlertTriangle,
      description: "إدارة التحذيرات والخصومات",
      keywords: "جزاء إنذار خصم تحذير",
    },
    {
      id: "probation",
      label: "فترة الاختبار",
      icon: Briefcase,
      description: "إعدادات فترة الاختبار",
      keywords: "اختبار تجربة فترة",
    },
    {
      id: "employment",
      label: "التوظيف",
      icon: FileText,
      description: "سياسات التوظيف وعقود العمل",
      keywords: "توظيف عقد استقالة تقاعد",
    },
    {
      id: "remote",
      label: "العمل عن بُعد",
      icon: Home,
      description: "سياسات العمل من المنزل",
      keywords: "بعد منزل عن بعد",
    },
    {
      id: "security",
      label: "الأمان",
      icon: Lock,
      description: "أمان البيانات والوصول",
      keywords: "أمان أمن بيانات خصوصية",
    },
    {
      id: "notifications",
      label: "الإشعارات",
      icon: Bell,
      description: "إعدادات تنبيهات النظام",
      keywords: "إشعار تنبيه إشعارات",
    },
  ];

  const searchQueryTrimmed = searchQuery.trim();
  const filteredTabs = searchQueryTrimmed
    ? tabs.filter((tab) => {
      const q = searchQueryTrimmed;
      if (tab.label.includes(q) || tab.description.includes(q)) return true;
      if (tab.keywords) {
        const words = tab.keywords.split(/\s+/);
        return words.some((w) => w.includes(q));
      }
      return false;
    })
    : tabs;

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            جاري تحميل الإعدادات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  تغييرات غير محفوظة
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  لديك تغييرات غير محفوظة. هل تريد المتابعة دون حفظ؟
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelNavigation}
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    حفظ أولاً
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={confirmNavigation}
                  >
                    متابعة دون حفظ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header - الشريط العلوي إعدادات الموارد البشرية */}
      <header
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm"
        aria-label="شريط إعدادات الموارد البشرية"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"
                aria-hidden
              >
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                    إعدادات الموارد البشرية
                  </h1>
                  {hasUnsavedChangesValue && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full shrink-0"
                      role="status"
                      aria-live="polite"
                    >
                      <AlertCircle className="h-3 w-3" aria-hidden />
                      تغييرات غير محفوظة
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  تكوين إعدادات نظام HR الشامل
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSettings}
                disabled={loading || saving}
                className="flex-1 sm:flex-initial order-2 sm:order-1"
                aria-label="إعادة تحميل الإعدادات"
              >
                <RefreshCw
                  className={`h-4 w-4 me-2 rtl:rotate-180 ${loading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                إعادة تحميل
              </Button>
              <div className="flex flex-col gap-0.5 flex-1 sm:flex-initial order-1 sm:order-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChangesValue}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  aria-label={
                    hasUnsavedChangesValue
                      ? "حفظ الإعدادات (Ctrl+S)"
                      : "حفظ الإعدادات"
                  }
                  title={
                    hasUnsavedChangesValue
                      ? "حفظ التغييرات (Ctrl+S)"
                      : undefined
                  }
                >
                  {saving ? (
                    <>
                      <span
                        className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2"
                        aria-hidden
                      />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 me-2" aria-hidden />
                      حفظ الإعدادات
                    </>
                  )}
                </Button>
                {hasUnsavedChangesValue && (
                  <span
                    className="text-[10px] text-gray-500 dark:text-gray-400 text-center sm:text-end hidden sm:inline"
                    dir="ltr"
                  >
                    Ctrl+S
                  </span>
                )}
              </div>
            </div>
          </div>
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    يوجد أخطاء في الإعدادات:
                  </p>
                  <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([key, message]) => (
                      <li key={key}>{message}</li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => setErrors({})}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden lg:sticky lg:top-24">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
                  أقسام الإعدادات
                </h2>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="بحث في الأقسام..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`pr-9 text-sm ${searchQueryTrimmed ? "pl-9" : ""}`}
                    aria-label="بحث في أقسام الإعدادات"
                  />
                  {searchQueryTrimmed && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      aria-label="مسح البحث"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {searchQueryTrimmed && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {filteredTabs.length === 0
                      ? "لا توجد نتائج"
                      : `${filteredTabs.length} من ${tabs.length} قسم`}
                  </p>
                )}
              </div>
              <nav
                className="p-2 space-y-1 max-h-[400px] lg:max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar"
                aria-label="تنقل أقسام الإعدادات"
              >
                {filteredTabs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    لا توجد نتائج للبحث. جرّب كلمات أخرى أو امسح البحث.
                  </div>
                ) : (
                  filteredTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-right transition-all duration-200 ${activeTab === tab.id
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 shadow-sm"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                        }`}
                    >
                      <tab.icon
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${activeTab === tab.id
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-gray-400"
                          }`}
                      />
                      <div className="flex-1 min-w-0 text-right">
                        <div className="font-medium text-sm truncate">
                          {tab.label}
                        </div>
                        <div
                          className={`text-[10px] truncate ${activeTab === tab.id ? "text-indigo-500/80 dark:text-indigo-400/80" : "text-gray-500"}`}
                        >
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              {activeTab === "working-hours" && (
                <Card>
                  <CardHeader>
                    <CardTitle>أيام وأوقات العمل</CardTitle>
                    <CardDescription>إدارة جدول العمل الأسبوعي</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label>أيام العمل</Label>
                        <Tooltip content="اختر أيام الأسبوع التي تعتبر أيام عمل. يجب اختيار يوم واحد على الأقل">
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {weekDays.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={
                              settings.workingDays.includes(day.value)
                                ? "default"
                                : "outline"
                            }
                            onClick={() => toggleWorkingDay(day.value)}
                            className="min-w-[80px]"
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                      {errors.workingDays && (
                        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {errors.workingDays}
                        </p>
                      )}
                      {settings.workingDays.length > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          تم اختيار {settings.workingDays.length} يوم عمل
                        </p>
                      )}

                      {/* Weekly Rest Days Section */}
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            أيام الراحة الأسبوعية المحددة:
                          </span>
                          <span className="text-xs text-slate-500">
                            (الأيام غير المحددة كأيام عمل تُعتبر راحة أسبوعية)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {weekDays
                            .filter((day) => !settings.workingDays.includes(day.value))
                            .map((day) => (
                              <Badge
                                key={day.value}
                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 px-3 py-1 font-medium"
                              >
                                {day.label} (راحة أسبوعية)
                              </Badge>
                            ))}
                          {weekDays.filter((day) => !settings.workingDays.includes(day.value)).length === 0 && (
                            <span className="text-xs text-amber-600 font-medium">
                              لا توجد أيام راحة أسبوعية (كل الأيام عمل)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-2">
                          قاعدة النظام: أي بصمة حضور لموظف في يوم الراحة تُسجّل تلقائياً كـ <strong>ساعات إضافية (OVERTIME)</strong> بكامل ساعات الحضور الفعلي، مع استبعادها تماماً من أي خصومات تأخير أو غياب (صفر دقائق خصم).
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                              أوقات العمل تُدار من خلال المناوبات
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              يتم تحديد أوقات بداية ونهاية العمل لكل موظف بناءً
                              على المناوبة المعيّنة له. يمكنك إدارة المناوبات من
                              صفحة "المناوبات".
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "leaves" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>إعدادات الإجازات الأساسية</CardTitle>
                      <CardDescription>
                        تكوين سياسات الإجازات العادية
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>رصيد الإجازة السنوية</Label>
                            <Tooltip content="عدد أيام الإجازة السنوية الافتراضية التي يحصل عليها كل موظف جديد عند بدء العمل">
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            value={settings.annualLeaveDefault}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              setSettings({
                                ...settings,
                                annualLeaveDefault: value,
                              });
                              if (errors.annualLeaveDefault) {
                                const newErrors = { ...errors };
                                delete newErrors.annualLeaveDefault;
                                setErrors(newErrors);
                              }
                            }}
                            className={
                              errors.annualLeaveDefault ? "border-red-500" : ""
                            }
                          />
                          {errors.annualLeaveDefault && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {errors.annualLeaveDefault}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>رصيد الإجازة المرضية</Label>
                          <Input
                            type="number"
                            value={settings.sickLeaveDefault}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                sickLeaveDefault: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>حد الترحيل السنوي</Label>
                          <Input
                            type="number"
                            value={settings.carryOverLimit}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                carryOverLimit: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label>الحد الأدنى للإشعار المسبق</Label>
                          <Input
                            type="number"
                            value={settings.minAdvanceNotice}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                minAdvanceNotice: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم قبل الإجازة
                          </p>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <Label>طلب موافقة المدير</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              يتطلب موافقة المدير على طلبات الإجازة
                            </p>
                          </div>
                          <Switch
                            checked={settings.requireApproval}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                requireApproval: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Leave Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-pink-500" />
                        أنواع الإجازات الإضافية
                      </CardTitle>
                      <CardDescription>
                        إجازات خاصة بالمناسبات والظروف
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Baby className="h-4 w-4 text-pink-500" />
                            إجازة الأمومة
                          </Label>
                          <Input
                            type="number"
                            value={settings.maternityLeaveDays}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                maternityLeaveDays:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>إجازة الأبوة</Label>
                          <Input
                            type="number"
                            value={settings.paternityLeaveDays}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                paternityLeaveDays:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>إجازة الزواج</Label>
                          <Input
                            type="number"
                            value={settings.marriageLeaveDays}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                marriageLeaveDays:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>إجازة الوفاة</Label>
                          <Input
                            type="number"
                            value={settings.bereavementLeaveDays}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                bereavementLeaveDays:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-green-500" />
                            إجازة الحج/العمرة
                          </Label>
                          <Input
                            type="number"
                            value={settings.hajjLeaveDays}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                hajjLeaveDays: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يوم (مرة واحدة)
                          </p>
                        </div>
                        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div>
                            <Label>السماح بإجازة بدون راتب</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              يمكن للموظف طلب إجازة غير مدفوعة
                            </p>
                          </div>
                          <Switch
                            checked={settings.unpaidLeaveAllowed}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                unpaidLeaveAllowed: checked,
                              })
                            }
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {activeTab === "payroll" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>إعدادات الرواتب</CardTitle>
                      <CardDescription>تكوين حسابات الرواتب</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <Label>يوم صرف الراتب</Label>
                          <Select
                            value={settings.payrollDay.toString()}
                            onValueChange={(value) =>
                              setSettings({
                                ...settings,
                                payrollDay: parseInt(value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map(
                                (day) => (
                                  <SelectItem key={day} value={day.toString()}>
                                    يوم {day}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>العملة</Label>
                          <Select
                            value={settings.currency}
                            onValueChange={(value) =>
                              setSettings({ ...settings, currency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EGP">
                                جنيه مصري (EGP)
                              </SelectItem>
                              <SelectItem value="SAR">
                                ريال سعودي (SAR)
                              </SelectItem>
                              <SelectItem value="AED">
                                درهم إماراتي (AED)
                              </SelectItem>
                              <SelectItem value="USD">
                                دولار أمريكي (USD)
                              </SelectItem>
                              <SelectItem value="KWD">
                                دينار كويتي (KWD)
                              </SelectItem>
                              <SelectItem value="QAR">
                                ريال قطري (QAR)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>معدل العمل الإضافي</Label>
                          <Select
                            value={settings.overtimeRate.toString()}
                            onValueChange={(value) =>
                              setSettings({
                                ...settings,
                                overtimeRate: parseFloat(value),
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1.0x (الساعة بساعة - بدون مضاعف)</SelectItem>
                              <SelectItem value="1.25">1.25x</SelectItem>
                              <SelectItem value="1.5">1.5x</SelectItem>
                              <SelectItem value="2">2.0x (ساعة بساعتين)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>نسبة الضريبة (%)</Label>
                            <Tooltip content="النسبة المئوية للضريبة المقتطعة من الراتب (عادة بين 0-30%)">
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            value={settings.taxRate}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setSettings({ ...settings, taxRate: isNaN(value) ? 0 : value });
                              if (errors.taxRate) {
                                const newErrors = { ...errors };
                                delete newErrors.taxRate;
                                setErrors(newErrors);
                              }
                            }}
                            className={errors.taxRate ? "border-red-500" : ""}
                          />
                          {errors.taxRate && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {errors.taxRate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>نسبة التأمينات الاجتماعية (%)</Label>
                            <Tooltip content="النسبة المئوية للتأمينات الاجتماعية المقتطعة من الراتب (حسب قانون العمل المحلي)">
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            value={settings.socialInsuranceRate}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setSettings({
                                ...settings,
                                socialInsuranceRate: isNaN(value) ? 0 : value,
                              });
                              if (errors.socialInsuranceRate) {
                                const newErrors = { ...errors };
                                delete newErrors.socialInsuranceRate;
                                setErrors(newErrors);
                              }
                            }}
                            className={
                              errors.socialInsuranceRate ? "border-red-500" : ""
                            }
                          />
                          {errors.socialInsuranceRate && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {errors.socialInsuranceRate}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Advance Settings Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        سياسات السلف المالية
                      </CardTitle>
                      <CardDescription>
                        تحديد شروط وحدود طلب السلف
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label>الحد الأقصى للسلفة (% من الراتب)</Label>
                            <Tooltip content="أقصى نسبة من الراتب يمكن للموظف الحصول عليها كسلفة مالية (مثال: 50% يعني نصف الراتب)">
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={settings.maxAdvancePercentage || 50}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setSettings({
                                  ...settings,
                                  maxAdvancePercentage: value,
                                });
                                if (errors.maxAdvancePercentage) {
                                  const newErrors = { ...errors };
                                  delete newErrors.maxAdvancePercentage;
                                  setErrors(newErrors);
                                }
                              }}
                              className={
                                errors.maxAdvancePercentage
                                  ? "border-red-500"
                                  : ""
                              }
                            />
                            <span className="text-gray-500 dark:text-gray-400">
                              %
                            </span>
                          </div>
                          {errors.maxAdvancePercentage && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {errors.maxAdvancePercentage}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            النسبة المئوية من الراتب الأساسي المسموح بها كسلفة
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>الحد الأقصى للسلف النشطة</Label>
                          <Input
                            type="number"
                            min={1}
                            value={settings.maxActiveAdvances || 1}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                maxActiveAdvances:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            عدد السلف التي يمكن للموظف الحصول عليها في نفس الوقت
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>الحد الأدنى لمدة العمل (أشهر)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={settings.minMonthsForAdvance || 3}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                minMonthsForAdvance:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            أقل مدة عمل مطلوبة قبل السماح بطلب سلفة
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>فترة السداد القصوى (أشهر)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={settings.advanceRepaymentMonths || 6}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                advanceRepaymentMonths:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            الحد الأقصى لعدد الأشهر المسموح بتقسيط السلفة عليها
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {activeTab === "allowances" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-purple-500" />
                      البدلات والمزايا الافتراضية
                    </CardTitle>
                    <CardDescription>
                      تحديد البدلات الافتراضية للموظفين الجدد
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label>بدل المواصلات</Label>
                        <Input
                          type="number"
                          value={settings.transportationAllowance}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              transportationAllowance:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {settings.currency} شهرياً
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>بدل السكن</Label>
                        <Input
                          type="number"
                          value={settings.housingAllowance}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              housingAllowance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {settings.currency} شهرياً
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>بدل الهاتف</Label>
                        <Input
                          type="number"
                          value={settings.phoneAllowance}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              phoneAllowance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {settings.currency} شهرياً
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>بدل الوجبات</Label>
                        <Input
                          type="number"
                          value={settings.mealAllowance}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              mealAllowance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {settings.currency} شهرياً
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "attendance" && (
                <Tabs
                  defaultValue="punctuality"
                  className="space-y-6"
                  dir="rtl"
                >
                  <TabsList className="bg-gray-100 dark:bg-gray-800 p-1">
                    <TabsTrigger
                      value="punctuality"
                      className="flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      الالتزام والجزاءات
                    </TabsTrigger>
                    <TabsTrigger
                      value="geofence"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      تتبع الموقع (GPS)
                    </TabsTrigger>
                    <TabsTrigger
                      value="engine"
                      className="flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      محرك الحسابات
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="punctuality"
                    className="space-y-6 animate-in fade-in duration-300"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-orange-500" />
                          سياسات الالتزام والجزاءات
                        </CardTitle>
                        <CardDescription>
                          تعريف قواعد الحضور والعقوبات المالية المترتبة على
                          التأخير
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* 1. القواعد العامة (Thresholds) */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30">
                              <Label htmlFor="earlyLeaveThreshold">
                                حد الانصراف المبكر (بالدقائق)
                              </Label>
                              <Input
                                id="earlyLeaveThreshold"
                                name="earlyLeaveThreshold"
                                className="mt-2"
                                type="number"
                                value={settings.earlyLeaveThreshold}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    earlyLeaveThreshold:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                            <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30">
                              <Label htmlFor="monthlyLateLimit">
                                حد التأخير الشهري (مرات)
                              </Label>
                              <Input
                                id="monthlyLateLimit"
                                name="monthlyLateLimit"
                                className="mt-2"
                                type="number"
                                value={settings.monthlyLateLimit}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    monthlyLateLimit:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* 2. رصيد التسامح (Grace Period) */}
                        <PunctualityRules
                          settings={settings}
                          setSettings={setSettings}
                        />

                        {/* 3. الجزاءات المالية (Financial Penalties) */}
                        <FinancialPenalties
                          settings={settings}
                          setSettings={setSettings}
                        />

                        <Separator className="opacity-50" />

                        {/* 4. مستويات الإنذار (Legacy Levels) */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              جدول الخصومات المتصاعد (حسب عدد المرات)
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSettings({
                                  ...settings,
                                  lateWarningLevels: [
                                    ...settings.lateWarningLevels,
                                    {
                                      count:
                                        settings.lateWarningLevels.length + 1,
                                      deductionFactor: 0.25,
                                    },
                                  ],
                                })
                              }
                            >
                              إضافة مستوى
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {settings.lateWarningLevels.map((level, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700"
                              >
                                <div className="w-16">
                                  <Label
                                    htmlFor={`late-count-${index}`}
                                    className="text-[10px]"
                                  >
                                    المرة
                                  </Label>
                                  <Input
                                    id={`late-count-${index}`}
                                    name={`late-count-${index}`}
                                    type="number"
                                    size={1}
                                    value={level.count}
                                    onChange={(e) => {
                                      const newLevels = [
                                        ...settings.lateWarningLevels,
                                      ];
                                      newLevels[index].count =
                                        parseInt(e.target.value) || 0;
                                      setSettings({
                                        ...settings,
                                        lateWarningLevels: newLevels,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`late-deduction-${index}`}
                                    className="text-[10px]"
                                  >
                                    الخصم (نصيب يوم)
                                  </Label>
                                  <Input
                                    id={`late-deduction-${index}`}
                                    name={`late-deduction-${index}`}
                                    type="number"
                                    step="0.25"
                                    value={level.deductionFactor}
                                    onChange={(e) => {
                                      const newLevels = [
                                        ...settings.lateWarningLevels,
                                      ];
                                      newLevels[index].deductionFactor =
                                        parseFloat(e.target.value) || 0;
                                      setSettings({
                                        ...settings,
                                        lateWarningLevels: newLevels,
                                      });
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="mt-4 text-red-500"
                                  onClick={() => {
                                    const newLevels =
                                      settings.lateWarningLevels.filter(
                                        (_, i) => i !== index,
                                      );
                                    setSettings({
                                      ...settings,
                                      lateWarningLevels: newLevels,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* 5. التحكم بالبصمة */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-3 rounded-xl border bg-gray-50/20">
                            <Label className="text-xs mb-2 block">
                              البصمة عن بُعد
                            </Label>
                            <Switch
                              checked={settings.allowRemoteCheckIn}
                              onCheckedChange={(c) =>
                                setSettings({
                                  ...settings,
                                  allowRemoteCheckIn: c,
                                })
                              }
                            />
                          </div>
                          <div className="p-3 rounded-xl border bg-gray-50/20">
                            <Label className="text-xs mb-2 block">
                              طلب الموقع عند البصمة
                            </Label>
                            <Switch
                              checked={settings.requireLocation}
                              onCheckedChange={(c) =>
                                setSettings({ ...settings, requireLocation: c })
                              }
                            />
                          </div>
                          <div className="p-3 rounded-xl border bg-gray-50/20">
                            <Label className="text-xs mb-2 block">
                              تسجيل الغياب الآلي
                            </Label>
                            <Switch
                              checked={settings.autoAbsentMarking}
                              onCheckedChange={(c) =>
                                setSettings({
                                  ...settings,
                                  autoAbsentMarking: c,
                                })
                              }
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent
                    value="geofence"
                    className="animate-in fade-in duration-300"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-500" />
                          إعدادات تتبع الموقع (Geofencing)
                        </CardTitle>
                        <CardDescription>
                          تقييد الحضور والانصراف بنطاق جغرافي محدد حول مقر
                          الشركة لضمان تواجد الموظفين
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
                          <div>
                            <Label className="text-blue-900 dark:text-blue-100 font-bold">
                              تفعيل البصمة الجغرافية
                            </Label>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              لن يسمح للموظف بالبصمة إلا من داخل النطاق
                            </p>
                          </div>
                          <Switch
                            checked={settings.geofenceEnabled}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                geofenceEnabled: checked,
                              })
                            }
                          />
                        </div>

                        {settings.geofenceEnabled && (
                          <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>خط العرض (Latitude)</Label>
                                <Input
                                  type="text"
                                  placeholder="30.0444"
                                  value={settings.officeLatitude}
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      officeLatitude: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>خط الطول (Longitude)</Label>
                                <Input
                                  type="text"
                                  placeholder="31.2357"
                                  value={settings.officeLongitude}
                                  onChange={(e) =>
                                    setSettings({
                                      ...settings,
                                      officeLongitude: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>نطاق البصمة المسموح</Label>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {settings.geofenceRadius} متر
                                </span>
                              </div>
                              <Input
                                type="number"
                                min={50}
                                max={5000}
                                step={50}
                                value={settings.geofenceRadius}
                                onChange={(e) =>
                                  setSettings({
                                    ...settings,
                                    geofenceRadius:
                                      parseInt(e.target.value) || 200,
                                  })
                                }
                              />
                              <p className="text-xs text-gray-500">
                                يفضل ألا يقل عن 100 متر لتجنب أخطاء الـ GPS
                                الضعيف
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={getCurrentLocation}
                                disabled={gettingLocation}
                                className="flex items-center gap-2"
                              >
                                {gettingLocation ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Navigation className="h-4 w-4" />
                                )}
                                تحديد موقفي الآن
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={testCurrentLocation}
                                disabled={
                                  testingLocation ||
                                  !settings.officeLatitude ||
                                  !settings.officeLongitude
                                }
                                className="flex items-center gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                اختبار الدقة والموقع
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={openInGoogleMaps}
                                className="flex items-center gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                المعاينة على الخريطة
                              </Button>
                            </div>

                            {locationTestResult && (
                              <div
                                className={`p-4 rounded-xl border-2 ${locationTestResult.isWithinRange
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded-full ${locationTestResult.isWithinRange ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"}`}
                                  >
                                    {locationTestResult.isWithinRange ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    ) : (
                                      <AlertTriangle className="h-5 w-5 text-red-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold">
                                      الحالة:{" "}
                                      {locationTestResult.isWithinRange
                                        ? "داخل النطاق ✓"
                                        : "خارج النطاق ✗"}
                                    </p>
                                    <p className="text-sm opacity-80">
                                      المسافة: {locationTestResult.distance} متر
                                      من المركز
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent
                    value="engine"
                    className="space-y-6 animate-in fade-in duration-300"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5 text-green-600" />
                          محرك الحسابات المتقدم وشروط العمل
                        </CardTitle>
                        <CardDescription>
                          ضبط المعايير التي يعتمد عليها النظام في حساب معدلات
                          الساعة واليوم والخصومات المالية
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {/* 1. إعدادات الحساب (Calculation Engine) */}
                        <CalculationEngine
                          settings={settings}
                          setSettings={setSettings}
                        />

                        <Separator className="opacity-50" />

                        {/* 2. الإشعارات (Notifications) */}
                        <PunctualityNotifications
                          settings={settings}
                          setSettings={setSettings}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
              {activeTab === "discipline" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      سياسات الانضباط والجزاءات
                    </CardTitle>
                    <CardDescription>
                      تحديد درجات الإنذارات والعقوبات
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="verbalWarningThreshold">
                            الإنذار الشفهي بعد
                          </Label>
                          <Tooltip content="عدد المخالفات المطلوبة لإصدار إنذار شفهي للموظف">
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <Input
                          id="verbalWarningThreshold"
                          name="verbalWarningThreshold"
                          type="number"
                          min={0}
                          value={settings.verbalWarningThreshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              verbalWarningThreshold:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مخالفات
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="writtenWarningThreshold">
                          الإنذار الكتابي بعد
                        </Label>
                        <Input
                          id="writtenWarningThreshold"
                          name="writtenWarningThreshold"
                          type="number"
                          value={settings.writtenWarningThreshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              writtenWarningThreshold:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مخالفات
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deductionWarningThreshold">
                          الخصم من الراتب بعد
                        </Label>
                        <Input
                          id="deductionWarningThreshold"
                          name="deductionWarningThreshold"
                          type="number"
                          value={settings.deductionWarningThreshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              deductionWarningThreshold:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مخالفات
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="suspensionThreshold">
                          الإيقاف عن العمل بعد
                        </Label>
                        <Input
                          id="suspensionThreshold"
                          name="suspensionThreshold"
                          type="number"
                          value={settings.suspensionThreshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              suspensionThreshold:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مخالفات
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="terminationThreshold">
                          إنهاء الخدمة بعد
                        </Label>
                        <Input
                          id="terminationThreshold"
                          name="terminationThreshold"
                          type="number"
                          value={settings.terminationThreshold}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              terminationThreshold:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مخالفات
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="warningExpiryMonths">
                          صلاحية الإنذار
                        </Label>
                        <Input
                          id="warningExpiryMonths"
                          name="warningExpiryMonths"
                          type="number"
                          value={settings.warningExpiryMonths}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              warningExpiryMonths:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          شهر
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <Label>إنذار تلقائي عند التأخير المتكرر</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            إصدار إنذار تلقائي عند تجاوز حد التأخيرات
                          </p>
                        </div>
                        <Switch
                          checked={settings.autoWarningOnLateness}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              autoWarningOnLateness: checked,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <Label>إنذار تلقائي عند الغياب</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            إصدار إنذار تلقائي عند الغياب بدون إذن
                          </p>
                        </div>
                        <Switch
                          checked={settings.autoWarningOnAbsence}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              autoWarningOnAbsence: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === "probation" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-500" />
                      فترة الاختبار
                    </CardTitle>
                    <CardDescription>
                      إعدادات فترة التجربة للموظفين الجدد
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>مدة فترة الاختبار</Label>
                          <Tooltip content="المدة الزمنية لفترة التجربة للموظفين الجدد قبل التثبيت">
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <Select
                          value={settings.probationPeriodMonths.toString()}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              probationPeriodMonths: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">شهر واحد</SelectItem>
                            <SelectItem value="2">شهرين</SelectItem>
                            <SelectItem value="3">3 أشهر</SelectItem>
                            <SelectItem value="6">6 أشهر</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>نسبة الإجازات خلال فترة الاختبار</Label>
                          <Tooltip content="النسبة المئوية من رصيد الإجازات التي يمكن للموظف استخدامها خلال فترة الاختبار">
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </Tooltip>
                        </div>
                        <Select
                          value={settings.probationLeavePercentage.toString()}
                          onValueChange={(value) => {
                            const numValue = parseInt(value);
                            setSettings({
                              ...settings,
                              probationLeavePercentage: numValue,
                            });
                            if (errors.probationLeavePercentage) {
                              const newErrors = { ...errors };
                              delete newErrors.probationLeavePercentage;
                              setErrors(newErrors);
                            }
                          }}
                        >
                          <SelectTrigger
                            className={
                              errors.probationLeavePercentage
                                ? "border-red-500"
                                : ""
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">لا إجازات</SelectItem>
                            <SelectItem value="25">25%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="100">100%</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.probationLeavePercentage && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {errors.probationLeavePercentage}
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <Label>تقييم إلزامي في نهاية فترة الاختبار</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يجب إجراء تقييم أداء قبل التثبيت
                          </p>
                        </div>
                        <Switch
                          checked={settings.probationEvaluationRequired}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              probationEvaluationRequired: checked,
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div>
                          <Label>تقليل الإجازات خلال فترة الاختبار</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            تطبيق نسبة مخفضة من رصيد الإجازات
                          </p>
                        </div>
                        <Switch
                          checked={settings.reducedLeavesDuringProbation}
                          onCheckedChange={(checked) =>
                            setSettings({
                              ...settings,
                              reducedLeavesDuringProbation: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employment Policies Tab */}
              {activeTab === "employment" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      سياسات التوظيف
                    </CardTitle>
                    <CardDescription>
                      إعدادات العقود ونهاية الخدمة
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="noticePeriodDays">
                          فترة الإشعار عند الاستقالة
                        </Label>
                        <Input
                          id="noticePeriodDays"
                          name="noticePeriodDays"
                          type="number"
                          value={settings.noticePeriodDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              noticePeriodDays: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500">يوم</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contractRenewalNoticeDays">
                          فترة الإشعار لتجديد العقد
                        </Label>
                        <Input
                          id="contractRenewalNoticeDays"
                          name="contractRenewalNoticeDays"
                          type="number"
                          value={settings.contractRenewalNoticeDays}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              contractRenewalNoticeDays:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          يوم قبل انتهاء العقد
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="retirementAge">سن التقاعد</Label>
                        <Input
                          id="retirementAge"
                          name="retirementAge"
                          type="number"
                          value={settings.retirementAge}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              retirementAge: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500">سنة</p>
                      </div>
                      <div className="space-y-2">
                        <Label>حساب مكافأة نهاية الخدمة</Label>
                        <Select
                          value={settings.endOfServiceCalculation}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              endOfServiceCalculation: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="half_month_per_year">
                              نصف شهر عن كل سنة
                            </SelectItem>
                            <SelectItem value="one_month_per_year">
                              شهر عن كل سنة
                            </SelectItem>
                            <SelectItem value="custom">
                              حسب السياسة الداخلية
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div>
                          <Label>إخلاء طرف إلزامي</Label>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            يتطلب إنهاء الخدمة إتمام إخلاء الطرف والاستلام
                          </p>
                        </div>
                        <Tooltip content="عند التفعيل، يجب على الموظف المُنهية خدمته إتمام نموذج إخلاء الطرف وتسليم المعدات/المستندات قبل صرف المستحقات">
                          <Info className="h-4 w-4 text-gray-400 cursor-help mt-0.5 shrink-0" />
                        </Tooltip>
                      </div>
                      <Switch
                        checked={settings.requireClearance}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            requireClearance: checked,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Remote Work Tab */}
              {activeTab === "remote" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-teal-500" />
                      سياسات العمل عن بُعد
                    </CardTitle>
                    <CardDescription>إعدادات العمل من المنزل</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-teal-200 dark:border-teal-800 rounded-lg bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20">
                      <div>
                        <Label className="text-lg">تفعيل العمل عن بُعد</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          السماح للموظفين بالعمل من المنزل
                        </p>
                      </div>
                      <Switch
                        checked={settings.remoteWorkAllowed}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            remoteWorkAllowed: checked,
                          })
                        }
                      />
                    </div>

                    {settings.remoteWorkAllowed && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2">
                            <Label>الحد الأقصى لأيام العمل عن بُعد</Label>
                            <Select
                              value={settings.maxRemoteDaysPerWeek.toString()}
                              onValueChange={(value) =>
                                setSettings({
                                  ...settings,
                                  maxRemoteDaysPerWeek: parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">
                                  يوم واحد أسبوعياً
                                </SelectItem>
                                <SelectItem value="2">
                                  يومين أسبوعياً
                                </SelectItem>
                                <SelectItem value="3">
                                  3 أيام أسبوعياً
                                </SelectItem>
                                <SelectItem value="5">
                                  عمل كامل عن بُعد
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <Label>يتطلب موافقة المدير</Label>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                موافقة مسبقة على أيام العمل عن بُعد
                              </p>
                            </div>
                            <Switch
                              checked={settings.remoteWorkApprovalRequired}
                              onCheckedChange={(checked) =>
                                setSettings({
                                  ...settings,
                                  remoteWorkApprovalRequired: checked,
                                })
                              }
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <Label>توفير معدات العمل</Label>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                الشركة توفر الأجهزة والمعدات اللازمة
                              </p>
                            </div>
                            <Switch
                              checked={settings.remoteWorkEquipmentProvided}
                              onCheckedChange={(checked) =>
                                setSettings({
                                  ...settings,
                                  remoteWorkEquipmentProvided: checked,
                                })
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              {activeTab === "security" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-red-500" />
                      الأمان والخصوصية
                    </CardTitle>
                    <CardDescription>
                      إعدادات حماية البيانات والوصول
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label>مدة الاحتفاظ بالبيانات</Label>
                        <Input
                          type="number"
                          value={settings.dataRetentionYears}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              dataRetentionYears: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500">سنة</p>
                      </div>
                      <div className="space-y-2">
                        <Label>انتهاء الجلسة بعد</Label>
                        <Input
                          type="number"
                          value={settings.sessionTimeoutMinutes}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              sessionTimeoutMinutes:
                                parseInt(e.target.value) || 0,
                            })
                          }
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          دقيقة من عدم النشاط
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>مستوى وصول الموظف للبيانات</Label>
                        <Select
                          value={settings.employeeDataAccessLevel}
                          onValueChange={(value) =>
                            setSettings({
                              ...settings,
                              employeeDataAccessLevel: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="own_data_only">
                              بياناته الشخصية فقط
                            </SelectItem>
                            <SelectItem value="team_data">
                              بيانات الفريق
                            </SelectItem>
                            <SelectItem value="department_data">
                              بيانات القسم
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div>
                        <Label>المصادقة الثنائية (2FA)</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إلزام جميع المستخدمين بتفعيل 2FA
                        </p>
                      </div>
                      <Switch
                        checked={settings.requireTwoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            requireTwoFactorAuth: checked,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "notifications" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>إعدادات الإشعارات</CardTitle>
                      <CardDescription>تكوين إشعارات نظام HR داخل النظام، وعلى واتساب أيضًا عند تفعيل قسم واتساب بالأسفل</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
                      هذه السويتشات تتحكم في تشغيل نوع الإشعار نفسه. إذا كان قسم واتساب مفعّلًا وتم ضبط الأرقام والمستلمين، فسيصل نفس النوع على واتساب أيضًا.
                    </div>
                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار عند طلب إجازة جديد</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إشعار داخل النظام وعلى واتساب عند تقديم طلب إجازة جديد
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnLeaveRequest}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            notifyOnLeaveRequest: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار عند مشاكل الحضور</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إشعار عند التأخير أو الانصراف المبكر، وليس الحضور العادي
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnAttendanceIssue}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            notifyOnAttendanceIssue: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار عند توليد الرواتب</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إشعار عند إنشاء كشف راتب فردي أو توليد كشوف الرواتب الشهرية
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnPayrollGeneration}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            notifyOnPayrollGeneration: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار عند إصدار إنذار</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إشعار الموظف والمدير عند إصدار إنذار
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnWarning}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, notifyOnWarning: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار قبل انتهاء فترة الاختبار</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          تنبيه داخل النظام وعلى واتساب قبل انتهاء فترة التجربة
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnProbationEnd}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            notifyOnProbationEnd: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار قبل انتهاء العقد</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          تنبيه داخل النظام وعلى واتساب قبل انتهاء عقد الموظف
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyOnContractExpiry}
                        onCheckedChange={(checked) =>
                          setSettings({
                            ...settings,
                            notifyOnContractExpiry: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <Label>إشعار المدراء</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          إرسال نسخة من الإشعارات لمدراء الأقسام
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifyManagers}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, notifyManagers: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp Notification Recipients */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-500" />
                      إشعارات واتساب للمسؤولين
                    </CardTitle>
                    <CardDescription>
                      إدارة الأشخاص الذين يستقبلون إشعارات واتساب. أنواع الإشعارات نفسها تُفتح وتُغلق من السويتشات الموجودة بالأعلى.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div>
                        <Label className="text-base font-semibold">تفعيل إشعارات واتساب للمسؤولين</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          رسائل واتساب جاهزة لكل إجراءات الموظفين حسب النبرة وأنواع الإشعارات المختارة
                        </p>
                      </div>
                      <Switch
                        checked={settings.aiOwnerNotificationsEnabled}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, aiOwnerNotificationsEnabled: checked })
                        }
                      />
                    </div>

                    {settings.aiOwnerNotificationsEnabled && (
                      <>
                        <div
                          className={`rounded-lg border p-4 ${
                            isWhatsAppDeliveryReady
                              ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100"
                              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 font-semibold">
                                {isWhatsAppDeliveryReady ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <AlertCircle className="h-4 w-4" />
                                )}
                                {isWhatsAppDeliveryReady
                                  ? "واتساب جاهز لإرسال إشعارات HR"
                                  : "واتساب غير جاهز للإرسال حتى الآن"}
                              </div>
                              <p>
                                الجلسات المتصلة: {connectedSessionCount}
                                {" • "}
                                المستلمين المجهزين: {readyRecipientsCount}
                              </p>
                              {activeNotificationIssues.includes(
                                "no_recipient_configured",
                              ) && (
                                <p>
                                  لن تصل أي رسالة لأن رقم المالك الأساسي فارغ ولا يوجد
                                  مستلمون إضافيون محفوظون.
                                </p>
                              )}
                              {activeNotificationIssues.includes(
                                "no_whatsapp_session",
                              ) && (
                                <p>
                                  لن تصل أي رسالة لأن الشركة لا تملك جلسة واتساب متصلة
                                  الآن.
                                </p>
                              )}
                              {notificationHealth?.hasCompanyPhoneFallback &&
                                !settings.ownerWhatsAppNumber.trim() &&
                                configuredAdditionalRecipientsCount === 0 && (
                                  <p>
                                    يوجد fallback على رقم الشركة، لكن الأفضل تحديد رقم
                                    المالك أو مستلمين واضحين من هنا.
                                  </p>
                                )}
                            </div>

                            {!hasConnectedSession && (
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2 whitespace-nowrap"
                                onClick={() => navigate("/whatsapp/settings")}
                              >
                                <ExternalLink className="h-4 w-4" />
                                فتح إعدادات واتساب
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Owner Primary Phone */}
                        <div className="space-y-2">
                          <Label>رقم واتساب المالك (الأساسي)</Label>
                          <Input
                            value={settings.ownerWhatsAppNumber}
                            onChange={(e) =>
                              setSettings({ ...settings, ownerWhatsAppNumber: e.target.value })
                            }
                            placeholder="مثال: 01001234567"
                            dir="ltr"
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-500">هذا الرقم يستقبل كل أنواع الإشعارات</p>
                          {errors.aiOwnerNotificationsEnabled && (
                            <p className="text-xs text-red-500">
                              {errors.aiOwnerNotificationsEnabled}
                            </p>
                          )}
                        </div>

                        <Separator />

                        {/* Additional Recipients */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-semibold">مستلمين إضافيين</Label>
                              <p className="text-sm text-gray-500 mt-1">
                                اختاري الموظفين الذين سيستقبلون إشعارات واتساب المحددة
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="space-y-2">
                              <Label>اختيار الموظف</Label>
                              <Select
                                value={selectedRecipientEmployeeId}
                                onValueChange={setSelectedRecipientEmployeeId}
                                disabled={loadingRecipientEmployees}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      loadingRecipientEmployees
                                        ? "جاري تحميل الموظفين..."
                                        : "اختاري موظفًا لإضافته"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRecipientEmployees.map((employee) => {
                                    const isAlreadyAdded =
                                      settings.notificationRecipients.some(
                                        (recipient) =>
                                          recipient.employeeId === employee.id ||
                                          recipient.phone === employee.phone,
                                      );

                                    return (
                                      <SelectItem
                                        key={employee.id}
                                        value={employee.id}
                                        disabled={isAlreadyAdded || !employee.phone}
                                      >
                                        {employee.name}
                                        {employee.employeeNumber
                                          ? ` - ${employee.employeeNumber}`
                                          : ""}
                                        {employee.department
                                          ? ` - ${employee.department}`
                                          : ""}
                                        {!employee.phone ? " - بدون رقم واتساب" : ""}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-gray-500">
                                لن يظهر الموظف للإضافة إذا كان مضافًا بالفعل، والموظف بدون رقم واتساب لا يمكن اختياره.
                              </p>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={addSelectedRecipientEmployee}
                              disabled={!selectedRecipientEmployeeId || loadingRecipientEmployees}
                              className="gap-1 md:self-end"
                            >
                              {loadingRecipientEmployees ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Users className="h-4 w-4" />
                              )}
                              إضافة الموظف
                            </Button>
                          </div>

                          {settings.notificationRecipients.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                              <Users className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                              <p className="text-gray-500">لا يوجد مستلمين إضافيين</p>
                              <p className="text-xs text-gray-400 mt-1">الإشعارات تُرسل فقط لرقم المالك الأساسي</p>
                            </div>
                          )}

                          {settings.notificationRecipients.map((recipient, index) => (
                            <div
                              key={`${recipient.employeeId || recipient.phone || "recipient"}-${index}`}
                              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/50"
                            >
                              {(() => {
                                const linkedEmployee = recipient.employeeId
                                  ? availableRecipientEmployees.find(
                                      (employee) => employee.id === recipient.employeeId,
                                    )
                                  : null;

                                return (
                                  <>
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-1">
                                        <span className="text-sm font-medium text-gray-500">
                                          مستلم #{index + 1}
                                        </span>
                                        {linkedEmployee ? (
                                          <p className="text-xs text-green-600 dark:text-green-400">
                                            من قائمة الموظفين
                                          </p>
                                        ) : (
                                          <p className="text-xs text-amber-600 dark:text-amber-400">
                                            مستلم محفوظ يدويًا
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updated = settings.notificationRecipients.filter((_, i) => i !== index);
                                          setSettings({ ...settings, notificationRecipients: updated });
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">الموظف</Label>
                                        <Select
                                          value={recipient.employeeId || "__manual__"}
                                          onValueChange={(value) => {
                                            const updated = [...settings.notificationRecipients];

                                            if (value === "__manual__") {
                                              updated[index] = {
                                                ...updated[index],
                                                employeeId: undefined,
                                              };
                                            } else {
                                              const selectedEmployee = availableRecipientEmployees.find(
                                                (employee) => employee.id === value,
                                              );
                                              if (!selectedEmployee) return;
                                              updated[index] = {
                                                ...updated[index],
                                                employeeId: selectedEmployee.id,
                                                name: selectedEmployee.name,
                                                phone: selectedEmployee.phone,
                                              };
                                            }

                                            setSettings({
                                              ...settings,
                                              notificationRecipients: updated,
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="اختاري موظفًا" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__manual__">إدخال يدوي</SelectItem>
                                            {availableRecipientEmployees.map((employee) => (
                                              <SelectItem
                                                key={employee.id}
                                                value={employee.id}
                                                disabled={
                                                  !employee.phone ||
                                                  settings.notificationRecipients.some(
                                                    (otherRecipient, otherIndex) =>
                                                      otherIndex !== index &&
                                                      (otherRecipient.employeeId === employee.id ||
                                                        otherRecipient.phone === employee.phone),
                                                  )
                                                }
                                              >
                                                {employee.name}
                                                {employee.employeeNumber
                                                  ? ` - ${employee.employeeNumber}`
                                                  : ""}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div>
                                        <Label className="text-xs">رقم واتساب</Label>
                                        <Input
                                          value={recipient.phone}
                                          onChange={(e) => {
                                            const updated = [...settings.notificationRecipients];
                                            updated[index] = {
                                              ...updated[index],
                                              phone: e.target.value,
                                            };
                                            setSettings({
                                              ...settings,
                                              notificationRecipients: updated,
                                            });
                                          }}
                                          placeholder="01009876543"
                                          dir="ltr"
                                          readOnly={Boolean(recipient.employeeId)}
                                          className="mt-1 font-mono"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <Label className="text-xs">الاسم</Label>
                                        <Input
                                          value={recipient.name}
                                          onChange={(e) => {
                                            const updated = [...settings.notificationRecipients];
                                            updated[index] = {
                                              ...updated[index],
                                              name: e.target.value,
                                            };
                                            setSettings({
                                              ...settings,
                                              notificationRecipients: updated,
                                            });
                                          }}
                                          placeholder="مثال: أحمد - مدير HR"
                                          readOnly={Boolean(recipient.employeeId)}
                                          className="mt-1"
                                        />
                                      </div>
                                      <div className="text-xs text-gray-500 self-end">
                                        {linkedEmployee ? (
                                          <>
                                            {linkedEmployee.department
                                              ? `القسم: ${linkedEmployee.department}`
                                              : "الموظف مرتبط مباشرة بقائمة الشركة"}
                                          </>
                                        ) : (
                                          "يمكنك تحويل هذا المستلم إلى موظف من القائمة أو إبقاؤه محفوظًا يدويًا."
                                        )}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}

                              <div>
                                <Label className="text-xs">أنواع الإشعارات</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {[
                                    { id: 'ALL', label: 'الكل' },
                                    { id: 'LEAVE', label: 'إجازات' },
                                    { id: 'ADVANCE', label: 'سلف' },
                                    { id: 'ATTENDANCE', label: 'حضور' },
                                    { id: 'PAYROLL', label: 'رواتب' },
                                    { id: 'DEDUCTION', label: 'خصومات' },
                                    { id: 'WARNING', label: 'إنذارات' },
                                    { id: 'PROBATION_END', label: 'نهاية التجربة' },
                                    { id: 'CONTRACT_EXPIRY', label: 'انتهاء العقد' },
                                    { id: 'PROMOTION', label: 'ترقيات' },
                                    { id: 'RESIGNATION', label: 'استقالات' },
                                    { id: 'TRAINING', label: 'تدريب' },
                                    { id: 'KUDOS', label: 'تقدير' },
                                  ].map((type) => {
                                    const isSelected = recipient.types.includes(type.id);
                                    return (
                                      <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => {
                                          const updated = [...settings.notificationRecipients];
                                          let newTypes: string[];
                                          if (type.id === 'ALL') {
                                            newTypes = isSelected ? [] : ['ALL'];
                                          } else {
                                            newTypes = isSelected
                                              ? recipient.types.filter((t) => t !== type.id)
                                              : [...recipient.types.filter((t) => t !== 'ALL'), type.id];
                                          }
                                          updated[index] = { ...updated[index], types: newTypes };
                                          setSettings({ ...settings, notificationRecipients: updated });
                                        }}
                                        className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                                          isSelected
                                            ? 'bg-green-100 dark:bg-green-900/40 border-green-400 text-green-700 dark:text-green-300 font-medium'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-300'
                                        }`}
                                      >
                                        {isSelected ? '✓ ' : ''}{type.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        {/* Notification Tone */}
                        <div className="space-y-2">
                          <Label>نبرة الرسالة</Label>
                          <Select
                            value={settings.aiNotificationTone}
                            onValueChange={(value) =>
                              setSettings({ ...settings, aiNotificationTone: value as any })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PROFESSIONAL">مهني ورسمي</SelectItem>
                              <SelectItem value="FRIENDLY">ودي ولطيف</SelectItem>
                              <SelectItem value="URGENT">عاجل ومباشر</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRSettings;
