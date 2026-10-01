import React, { useState, useEffect } from "react";
import {
  Clock,
  UserCheck,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  Monitor,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  MapPin,
  Pencil,
  Trash2,
  Home,
  Building2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import api from "../../services/api";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { envConfig } from "../../config/environment";

type AutoCloseReviewStatus = "PENDING" | "REVIEWED" | "ADJUSTED" | "DISMISSED";

interface AttendanceAutoCloseAudit {
  id: string;
  scheduledCheckOut: string | null;
  autoClosedAt: string | null;
  reminderSentAt: string | null;
  autoCloseReason: string | null;
  autoClosePolicy: string;
  reviewStatus: AutoCloseReviewStatus;
  reviewNotes: string | null;
  reviewedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  isAutoClosed?: boolean;
}

interface AutoCloseSummary {
  total: number;
  pending: number;
  reviewed: number;
  adjusted: number;
  dismissed: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  checkInMethod: string | null;
  checkOutMethod: string | null;
  status: string;
  workHours: number | null;
  overtimeHours: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  notes: string | null;
  workMode: string | null;
  autoCloseAudit?: AttendanceAutoCloseAudit | null;
  isAutoClosed?: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    employeeNumber: string;
    department: { name: string } | null;
  };
}

interface TodayStats {
  date: string;
  timezone?: string;
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  records: AttendanceRecord[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
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
  HALF_DAY: {
    label: "نصف يوم",
    color: "bg-blue-100 text-blue-800",
    icon: Timer,
  },
  ON_LEAVE: {
    label: "إجازة",
    color: "bg-purple-100 text-purple-800",
    icon: Calendar,
  },
  HOLIDAY: {
    label: "عطلة",
    color: "bg-gray-100 text-gray-800",
    icon: Calendar,
  },
  WEEKEND: {
    label: "عطلة أسبوعية",
    color: "bg-gray-100 text-gray-800",
    icon: Calendar,
  },
  REMOTE: {
    label: "عن بُعد",
    color: "bg-indigo-100 text-indigo-800",
    icon: Monitor,
  },
  OVERTIME: {
    label: "إضافي (يوم راحة)",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    icon: Timer,
  },
};

const autoCloseReviewConfig: Record<
  AutoCloseReviewStatus,
  { label: string; color: string }
> = {
  PENDING: {
    label: "بانتظار المراجعة",
    color: "bg-amber-100 text-amber-800",
  },
  REVIEWED: {
    label: "تمت المراجعة",
    color: "bg-sky-100 text-sky-800",
  },
  ADJUSTED: {
    label: "تم التعديل",
    color: "bg-emerald-100 text-emerald-800",
  },
  DISMISSED: {
    label: "اعتماد كما هو",
    color: "bg-slate-100 text-slate-800",
  },
};

const CAIRO_TIMEZONE = "Africa/Cairo";

const getLocalDateString = (
  date = new Date(),
  timezone = CAIRO_TIMEZONE,
) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

const getLocalTimeString = (
  date = new Date(),
  timezone = CAIRO_TIMEZONE,
) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
};

const parseDateAtCairoMidday = (dateValue: string) => {
  if (!dateValue) return null;

  const dateMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
  }

  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatAttendanceDate = (
  dateValue: string,
  options: Intl.DateTimeFormatOptions,
  fallback = "-",
  timezone = CAIRO_TIMEZONE
) => {
  const parsedDate = parseDateAtCairoMidday(dateValue);

  if (!parsedDate) {
    return fallback;
  }

  return parsedDate.toLocaleDateString("ar-EG", {
    ...options,
    timeZone: timezone,
  });
};

const Attendance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceTimezone, setAttendanceTimezone] = useState(CAIRO_TIMEZONE);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [autoCloseSummary, setAutoCloseSummary] = useState<AutoCloseSummary>({
    total: 0,
    pending: 0,
    reviewed: 0,
    adjusted: 0,
    dismissed: 0,
  });

  // Filters
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [useDateRange, setUseDateRange] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [employeeId, setEmployeeId] = useState("");
  const [autoClosedOnly, setAutoClosedOnly] = useState(false);
  const [autoCloseReviewStatus, setAutoCloseReviewStatus] = useState<"ALL" | AutoCloseReviewStatus>("ALL");

  // Employees list for filters
  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    }>
  >([]);

  // Dialog states
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    type: string;
  } | null>(null);

  // Manual attendance form
  const [manualForm, setManualForm] = useState({
    employeeId: "",
    date: getLocalDateString(),
    checkIn: "09:00",
    checkOut: "",
    status: "PRESENT",
    notes: "",
    workMode: "OFFICE",
    lateHours: 0,
    lateMins: 0,
    earlyHours: 0,
    earlyMins: 0,
  });
  const [manualOverrides, setManualOverrides] = useState({
    status: false,
    late: false,
    early: false,
  });
  const [manualBaseline, setManualBaseline] = useState<{
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut: string;
    status: string;
    workMode: string;
    lateHours: number;
    lateMins: number;
    earlyHours: number;
    earlyMins: number;
  } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Viewing notes state
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState("");
  const [showAutoCloseReviewDialog, setShowAutoCloseReviewDialog] = useState(false);
  const [selectedAutoCloseRecord, setSelectedAutoCloseRecord] = useState<AttendanceRecord | null>(null);
  const [autoCloseReviewForm, setAutoCloseReviewForm] = useState<{
    reviewStatus: AutoCloseReviewStatus;
    reviewNotes: string;
  }>({
    reviewStatus: "REVIEWED",
    reviewNotes: "",
  });

  // Brand New Delete Confirmation Logic
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    console.log("Attempting to delete record:", id);
    setIdToDelete(id);
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!idToDelete) return;
    try {
      await api.delete(`/hr/attendance/${idToDelete}`);
      tToast.success("attendance.success_delete_8e6c");
      setDeleteDialogOpen(false);
      setIdToDelete(null);
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      tToast.error("attendance.msg_138c");
      console.error(error);
    }
  };

  const openAutoCloseReview = (record: AttendanceRecord) => {
    const currentReviewStatus =
      record.autoCloseAudit?.reviewStatus && record.autoCloseAudit.isAutoClosed
        ? record.autoCloseAudit.reviewStatus
        : "REVIEWED";

    setSelectedAutoCloseRecord(record);
    setAutoCloseReviewForm({
      reviewStatus: currentReviewStatus,
      reviewNotes: record.autoCloseAudit?.reviewNotes || "",
    });
    setShowAutoCloseReviewDialog(true);
  };

  const submitAutoCloseReview = async () => {
    if (!selectedAutoCloseRecord) return;

    try {
      await api.put(
        `/hr/attendance/${selectedAutoCloseRecord.id}/auto-close-review`,
        autoCloseReviewForm,
      );
      tToast.success("attendance.success_save_e260");
      setShowAutoCloseReviewDialog(false);
      setSelectedAutoCloseRecord(null);
      fetchAttendance();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "فشل في حفظ مراجعة الإغلاق التلقائي",
      );
    }
  };

  const getAutoCloseReasonLabel = (reason: string | null | undefined) => {
    switch (reason) {
      case "OVERNIGHT_SHIFT_SCHEDULED_END":
        return "نهاية شيفت ليلي";
      case "DAY_ROLLOVER_FORGOTTEN_CHECKOUT":
        return "نسيان بصمة الانصراف";
      default:
        return "إغلاق تلقائي";
    }
  };

  useEffect(() => {
    fetchTodayStats();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [
    pagination.page,
    selectedDate,
    endDate,
    useDateRange,
    statusFilter,
    employeeId,
    autoClosedOnly,
    autoCloseReviewStatus,
  ]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees?limit=1000&status=ACTIVE");
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const response = await api.get("/hr/attendance/today");
      if (response.data) {
        setTodayStats(response.data);
        if (response.data.timezone) {
          setAttendanceTimezone(response.data.timezone);
        }
      }
    } catch (error: any) {
      console.error("Error fetching today stats:", error);
      toast.error(error.response?.data?.message || "فشل في جلب إحصائيات اليوم");
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);

      const searchStartDate = selectedDate;
      const searchEndDate = useDateRange ? endDate : selectedDate;

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: searchStartDate || "",
        endDate: searchEndDate || "",
      } as Record<string, string>);

      if (statusFilter && statusFilter !== "ALL")
        params.append("status", statusFilter);
      if (employeeId) params.append("employeeId", employeeId);
      if (autoClosedOnly) params.append("autoClosedOnly", "true");
      if (autoCloseReviewStatus !== "ALL") {
        params.append("autoCloseReviewStatus", autoCloseReviewStatus);
      }

      const response = await api.get(`/hr/attendance?${params}`);
      setRecords(response.data.records);
      setAutoCloseSummary(
        response.data.autoCloseSummary || {
          total: 0,
          pending: 0,
          reviewed: 0,
          adjusted: 0,
          dismissed: 0,
        },
      );
      if (response.data.timezone) {
        setAttendanceTimezone(response.data.timezone);
      }
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching attendance:", error);
      tToast.error("attendance.error_error_7db4");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (empId: string) => {
    try {
      await api.post("/hr/attendance/check-in", {
        employeeId: empId,
        method: "manual",
      });
      tToast.success("attendance.success_login_9112");
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "حدث خطأ أثناء تسجيل الحضور");
    }
  };

  const handleCheckOut = async (empId: string) => {
    try {
      await api.post("/hr/attendance/check-out", {
        employeeId: empId,
        method: "manual",
      });
      tToast.success("attendance.success_login_2d09");
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || "حدث خطأ أثناء تسجيل الانصراف",
      );
    }
  };

  const handleManualAttendance = async () => {
    if (!manualForm.employeeId) {
      tToast.error("attendance.msg_98c9");
      return;
    }

    try {
      const metricsInputsChanged =
        isEditMode &&
        manualBaseline &&
        (
          manualForm.employeeId !== manualBaseline.employeeId ||
          manualForm.date !== manualBaseline.date ||
          manualForm.checkIn !== manualBaseline.checkIn ||
          manualForm.checkOut !== manualBaseline.checkOut
        );
      const preserveExistingMetrics = isEditMode && !metricsInputsChanged;

      const payload: Record<string, string | number> = {
        employeeId: manualForm.employeeId,
        date: manualForm.date,
        checkIn: manualForm.checkIn,
        checkOut: manualForm.checkOut,
        notes: manualForm.notes,
        workMode: manualForm.workMode,
      };

      if (manualOverrides.status || preserveExistingMetrics) {
        payload["status"] = manualForm.status;
      }

      if (manualOverrides.late || preserveExistingMetrics) {
        payload["lateMinutes"] = manualForm.lateHours * 60 + manualForm.lateMins;
      }

      if (manualOverrides.early || preserveExistingMetrics) {
        payload["earlyLeaveMinutes"] =
          manualForm.earlyHours * 60 + manualForm.earlyMins;
      }

      if (isEditMode && editingRecordId && !editingRecordId.startsWith("temp-")) {
        await api.put(`/hr/attendance/${editingRecordId}`, payload);
        tToast.success("attendance.success_update_8d09");
      } else {
        await api.post("/hr/attendance/manual", payload);
        tToast.success("attendance.success_create_9ea4");
      }

      setShowManualDialog(false);
      resetManualForm();
      fetchTodayStats();
      fetchAttendance();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error ||
        error.response?.data?.message ||
        "حدث خطأ",
      );
    }
  };

  const resetManualForm = () => {
    setManualForm({
      employeeId: "",
      date: getLocalDateString(new Date(), attendanceTimezone),
      checkIn: "09:00",
      checkOut: "",
      status: "PRESENT",
      notes: "",
      workMode: "OFFICE",
      lateHours: 0,
      lateMins: 0,
      earlyHours: 0,
      earlyMins: 0,
    });
    setManualOverrides({
      status: false,
      late: false,
      early: false,
    });
    setManualBaseline(null);
    setIsEditMode(false);
    setEditingRecordId(null);
  };

  const handleEditClick = (record: AttendanceRecord) => {
    const nextManualForm = {
      employeeId: record.employee.id,
      date: record.date.split("T")[0] ?? getLocalDateString(new Date(), attendanceTimezone),
      checkIn: record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString("en-GB", {
          timeZone: attendanceTimezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        : "09:00",
      checkOut: record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString("en-GB", {
          timeZone: attendanceTimezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        : "",
      status: record.status,
      notes: record.notes || "",
      workMode: record.workMode || "OFFICE",
      lateHours: Math.floor((record.lateMinutes || 0) / 60),
      lateMins: (record.lateMinutes || 0) % 60,
      earlyHours: Math.floor((record.earlyLeaveMinutes || 0) / 60),
      earlyMins: (record.earlyLeaveMinutes || 0) % 60,
    };

    setManualForm(nextManualForm);
    setManualBaseline(nextManualForm);
    setManualOverrides({
      status: false,
      late: false,
      early: false,
    });
    setEditingRecordId(record.id);
    setIsEditMode(true);
    setShowManualDialog(true);
  };

  const openLocationInMap = (
    latitude: number,
    longitude: number,
    type: string,
  ) => {
    setSelectedLocation({ latitude, longitude, type });
    setShowMapModal(true);
  };

  const renderLocationInfo = (
    checkInLocation: string | null,
    checkOutLocation: string | null,
    workMode: string | null,
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
    const isHome = workMode === "HOME";

    return (
      <div className="space-y-1.5 min-w-[120px]">
        <div className="flex items-center gap-1.5 mb-1">
          {isHome ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30 text-[10px] font-bold">
              <Home className="h-3 w-3" />
              <span>من المنزل</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30 text-[10px] font-bold">
              <Building2 className="h-3 w-3" />
              <span>من المكتب</span>
            </div>
          )}
        </div>
        <div className="space-y-1 text-[10px]">
          {checkInLoc && (
            <div
              className={`flex items-center gap-1 ${isHome ? "text-purple-500" : "text-green-600"} cursor-pointer hover:underline`}
              onClick={() => openLocationInMap(Number(checkInLoc.latitude), Number(checkInLoc.longitude), "حضور")}
            >
              <MapPin className="h-3 w-3" />
              <span>حضور: {Number(checkInLoc.latitude).toFixed(4)}, {Number(checkInLoc.longitude).toFixed(4)}</span>
            </div>
          )}
          {checkOutLoc && (
            <div
              className={`flex items-center gap-1 ${isHome ? "text-purple-500" : "text-blue-600"} cursor-pointer hover:underline`}
              onClick={() => openLocationInMap(Number(checkOutLoc.latitude), Number(checkOutLoc.longitude), "انصراف")}
            >
              <MapPin className="h-3 w-3" />
              <span>انصراف: {Number(checkOutLoc.latitude).toFixed(4)}, {Number(checkOutLoc.longitude).toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatAttendanceTime = (dateValue: string | null) => {
    if (!dateValue) return "-";

    return new Date(dateValue).toLocaleTimeString("ar-EG", {
      timeZone: attendanceTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleExport = async () => {
    try {
      const actualEndDate = useDateRange ? endDate : selectedDate;
      const params = new URLSearchParams({
        startDate: selectedDate || "",
        endDate: actualEndDate || "",
      } as Record<string, string>);

      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (employeeId) params.append("employeeId", employeeId);
      if (autoClosedOnly) params.append("autoClosedOnly", "true");
      if (autoCloseReviewStatus !== "ALL") {
        params.append("autoCloseReviewStatus", autoCloseReviewStatus);
      }

      const response = await api.get(`/hr/attendance/export?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = useDateRange && actualEndDate ? `attendance-${selectedDate}-to-${actualEndDate}.xlsx` : `attendance-${selectedDate}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      tToast.success("attendance.msg_83be");
    } catch (error) {
      tToast.error("attendance.msg_2a18");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الحضور والانصراف</h1>
          <p className="text-gray-500 mt-1">
            {formatAttendanceDate(selectedDate, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }, "-", attendanceTimezone)}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { resetManualForm(); setShowManualDialog(true); }} className="bg-blue-600 text-white hover:bg-blue-700">
            <Clock className="h-4 w-4 ml-2" /> تسجيل يدوي
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" /> تصدير
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الموظفين", value: todayStats?.totalEmployees, icon: UserCheck, color: "text-gray-600", bg: "bg-gray-100" },
          { label: "حاضر", value: todayStats?.present, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
          { label: "متأخر", value: todayStats?.late, icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100" },
          { label: "غائب", value: todayStats?.absent, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value || 0}</h3>
              </div>
              <div className={`p-3 ${stat.bg} rounded-full`}><stat.icon className={`h-6 w-6 ${stat.color}`} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-100 bg-gradient-to-l from-amber-50 via-white to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            مراجعة الإغلاق التلقائي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "إجمالي مغلق تلقائيًا", value: autoCloseSummary.total, accent: "text-amber-700 bg-amber-100" },
              { label: "بانتظار المراجعة", value: autoCloseSummary.pending, accent: "text-amber-700 bg-amber-100" },
              { label: "تمت المراجعة", value: autoCloseSummary.reviewed, accent: "text-sky-700 bg-sky-100" },
              { label: "تم التعديل", value: autoCloseSummary.adjusted, accent: "text-emerald-700 bg-emerald-100" },
              { label: "اعتماد كما هو", value: autoCloseSummary.dismissed, accent: "text-slate-700 bg-slate-100" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.accent}`}>
                  {item.label}
                </div>
                <div className="mt-3 text-3xl font-black text-gray-900">{item.value || 0}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={autoClosedOnly ? "default" : "outline"}
              onClick={() => {
                setAutoClosedOnly(true);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={autoClosedOnly ? "bg-amber-600 hover:bg-amber-700" : ""}
            >
              السجلات المغلقة تلقائيًا
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAutoClosedOnly(true);
                setAutoCloseReviewStatus("PENDING");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              السجلات المنتظرة
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAutoClosedOnly(false);
                setAutoCloseReviewStatus("ALL");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              عرض كل السجلات
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-4 items-center">
            <Input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-[160px]" />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="useRange" checked={useDateRange} onChange={(e) => { setUseDateRange(e.target.checked); setPagination((p) => ({ ...p, page: 1 })); }} className="rounded" />
              <label htmlFor="useRange" className="text-sm cursor-pointer">فترة زمنية</label>
            </div>
            {useDateRange && <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }} className="w-[160px]" min={selectedDate} />}
          </div>
          <div className="flex flex-wrap gap-4">
            <Select
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value ?? "ALL"); setPagination((p) => ({ ...p, page: 1 })); }}
            >
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="PRESENT">حاضر</SelectItem>
                <SelectItem value="LATE">متأخر</SelectItem>
                <SelectItem value="ABSENT">غائب</SelectItem>
                <SelectItem value="HALF_DAY">نصف يوم</SelectItem>
                <SelectItem value="ON_LEAVE">إجازة</SelectItem>
                <SelectItem value="HOLIDAY">عطلة</SelectItem>
                <SelectItem value="REMOTE">عن بُعد</SelectItem>
                <SelectItem value="OVERTIME">إضافي (يوم راحة)</SelectItem>
              </SelectContent>
            </Select>
            <select
              value={employeeId || "all"}
              onChange={(e) => { 
                const v = e.target.value; 
                setEmployeeId(v && v !== "all" ? v : ""); 
                setPagination((p) => ({ ...p, page: 1 })); 
              }}
              className="flex h-10 w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="all">الكل</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
            </select>
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
              <input
                type="checkbox"
                id="autoClosedOnly"
                checked={autoClosedOnly}
                onChange={(e) => {
                  setAutoClosedOnly(e.target.checked);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="rounded"
              />
              <label htmlFor="autoClosedOnly" className="text-sm cursor-pointer">
                الإغلاق التلقائي فقط
              </label>
            </div>
            <Select
              value={autoCloseReviewStatus}
              onValueChange={(value) => {
                setAutoCloseReviewStatus((value as "ALL" | AutoCloseReviewStatus) || "ALL");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة المراجعة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل المراجعات</SelectItem>
                <SelectItem value="PENDING">بانتظار المراجعة</SelectItem>
                <SelectItem value="REVIEWED">تمت المراجعة</SelectItem>
                <SelectItem value="ADJUSTED">تم التعديل</SelectItem>
                <SelectItem value="DISMISSED">اعتماد كما هو</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDate(getLocalDateString());
                setEndDate(getLocalDateString());
                setUseDateRange(false);
                setStatusFilter("ALL");
                setEmployeeId("");
                setAutoClosedOnly(false);
                setAutoCloseReviewStatus("ALL");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل الحضور</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500"><Clock className="h-12 w-12 mb-4 opacity-50" /><p>لا توجد سجلات</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">اليوم والتاريخ</TableHead>
                  <TableHead className="text-right">القسم</TableHead>
                  <TableHead className="text-right">الحضور</TableHead>
                  <TableHead className="text-right">الانصراف</TableHead>
                  <TableHead className="text-right">الموقع</TableHead>
                  <TableHead className="text-right">ساعات العمل</TableHead>
                  <TableHead className="text-right">ساعات إضافية</TableHead>
                  <TableHead className="text-right">التأخير</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right w-[120px]">التحكم</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map(record => (
                  <TableRow key={record.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3 font-arabic">
                        <Avatar className="h-9 w-9 border border-gray-200">
                          <AvatarImage src={record.employee?.avatar} />
                          <AvatarFallback className="bg-blue-50 text-blue-700">
                            {record.employee?.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="font-bold text-gray-900 text-sm">{record.employee?.firstName} {record.employee?.lastName}</p>
                          <p className="text-[10px] text-gray-500 font-mono tracking-wider">{record.employee?.employeeNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-800 text-xs">
                          {formatAttendanceDate(record.date, { weekday: "long" }, "-", attendanceTimezone)}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {formatAttendanceDate(record.date, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }, "-", attendanceTimezone)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-gray-50 text-gray-600 border-gray-200">
                        {record.employee?.department?.name || "بدون قسم"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.checkIn ? (
                        <div className="flex flex-col">
                          <span className="text-green-600 font-bold text-sm">
                            {formatAttendanceTime(record.checkIn)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.checkOut ? (
                        <div className="flex flex-col">
                          <span className="text-blue-600 font-bold text-sm">
                            {formatAttendanceTime(record.checkOut)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderLocationInfo(record.checkInLocation, record.checkOutLocation, record.workMode)}
                    </TableCell>
                    <TableCell>
                      {record.workHours !== null && record.workHours !== undefined && Number(record.workHours) > 0 ? (
                        <span className="font-bold text-gray-700">{Number(record.workHours).toFixed(1)} س</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.overtimeHours && Number(record.overtimeHours) > 0 ? (
                        <span className="text-indigo-600 font-black">{Number(record.overtimeHours).toFixed(1)} س</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.lateMinutes && record.lateMinutes > 0 ? (
                        <div className="flex flex-col leading-none">
                          <span className="text-red-600 font-black text-sm">
                            {Math.floor(record.lateMinutes / 60) > 0 && `${Math.floor(record.lateMinutes / 60)}س `}
                            {record.lateMinutes % 60}د
                          </span>
                        </div>
                      ) : (
                        <span className="text-green-500 font-bold opacity-30">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Badge className={`${statusConfig[record.status]?.color} font-bold px-3 w-fit`}>
                          {statusConfig[record.status]?.label}
                        </Badge>
                        {record.isAutoClosed && record.autoCloseAudit && record.autoCloseAudit.isAutoClosed && (
                          <>
                            <Badge className="bg-amber-100 text-amber-800 font-bold px-3 w-fit">
                              مغلق تلقائيًا
                            </Badge>
                            <Badge
                              className={`${autoCloseReviewConfig[record.autoCloseAudit.reviewStatus]?.color} font-bold px-3 w-fit`}
                            >
                              {autoCloseReviewConfig[record.autoCloseAudit.reviewStatus]?.label}
                            </Badge>
                            <div className="text-[10px] leading-4 text-gray-500">
                              <div>
                                السبب: {getAutoCloseReasonLabel(record.autoCloseAudit.autoCloseReason)}
                              </div>
                              <div>
                                وقت الإغلاق: {formatAttendanceTime(record.autoCloseAudit.scheduledCheckOut)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.checkIn && !record.checkOut && !record.id.startsWith("temp-") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white"
                            onClick={() => handleCheckOut(record.employee.id)}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>انصراف</span>
                          </Button>
                        )}
                        {!record.checkIn && record.id.startsWith("temp-") && (
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all border border-green-100"
                            onClick={() => handleCheckIn(record.employee.id)}
                            title="تسجيل حضور الآن"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {record.notes && (
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-600 hover:text-white transition-all border border-gray-100"
                            onClick={() => {
                              setSelectedNotes(record.notes || "");
                              setShowNotesDialog(true);
                            }}
                            title="عرض الملاحظات"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {record.isAutoClosed && record.autoCloseAudit && record.autoCloseAudit.isAutoClosed && (
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-all border border-amber-100"
                            onClick={() => openAutoCloseReview(record)}
                            title="مراجعة الإغلاق التلقائي"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                          onClick={() => handleEditClick(record)}
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {!record.id.startsWith("temp-") && (
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-100"
                            onClick={() => confirmDelete(record.id)}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {pagination.totalPages > 1 && records.length > 0 && (
            <div className="p-4 border-t flex items-center justify-between" dir="rtl">
              <span className="text-sm text-gray-500 font-medium">
                صفحة {pagination.page} من {pagination.totalPages} ({pagination.total} سجل)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronRight className="h-4 w-4" /> السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showManualDialog} onOpenChange={(open) => { if (!open) resetManualForm(); setShowManualDialog(open); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{isEditMode ? "تعديل سجل حضور" : "تسجيل حضور يدوي"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4" dir="rtl">
            <div className="space-y-2">
              <Label>الموظف <span className="text-red-500">*</span></Label>
              <select
                value={manualForm.employeeId}
                onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="" disabled>اختر موظف</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} - {emp.employeeNumber}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>التاريخ</Label><Input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>الحالة</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 shadow-sm w-3 h-3 focus:ring-blue-500"
                      checked={manualOverrides.status}
                      onChange={(e) => setManualOverrides(prev => ({ ...prev, status: e.target.checked }))}
                    />
                    <span className="text-[10px] text-gray-500">تثبيت يدوي</span>
                  </label>
                </div>
                <Select
                  value={manualForm.status}
                  disabled={!manualOverrides.status}
                  onValueChange={(v) => {
                    setManualForm({ ...manualForm, status: v ?? "PRESENT" });
                  }}
                >
                  <SelectTrigger className={!manualOverrides.status ? "opacity-50" : ""}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">حاضر</SelectItem>
                    <SelectItem value="LATE">متأخر</SelectItem>
                    <SelectItem value="ABSENT">غائب</SelectItem>
                    <SelectItem value="HALF_DAY">نصف يوم</SelectItem>
                    <SelectItem value="ON_LEAVE">إجازة</SelectItem>
                    <SelectItem value="HOLIDAY">عطلة</SelectItem>
                    <SelectItem value="REMOTE">عن بُعد</SelectItem>
                    <SelectItem value="OVERTIME">إضافي (يوم راحة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>وقت الحضور</Label>
                <div className="flex gap-1">
                  <Input
                    type="time"
                    value={manualForm.checkIn}
                    onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => {
                      setManualForm({
                        ...manualForm,
                        checkIn: getLocalTimeString(new Date(), attendanceTimezone),
                      });
                    }}
                    title="الآن"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>وقت الانصراف</Label>
                <div className="flex gap-1">
                  <Input
                    type="time"
                    value={manualForm.checkOut}
                    onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={() => {
                      setManualForm({
                        ...manualForm,
                        checkOut: getLocalTimeString(new Date(), attendanceTimezone),
                      });
                    }}
                    title="الآن"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-red-600 font-bold">التأخير المعتمد</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-red-600 shadow-sm w-3 h-3 focus:ring-red-500"
                      checked={manualOverrides.late}
                      onChange={(e) => setManualOverrides(prev => ({ ...prev, late: e.target.checked }))}
                    />
                    <span className="text-[10px] text-gray-500">تخطي الحساب</span>
                  </label>
                </div>
                <div className={`flex items-center gap-2 ${!manualOverrides.late ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-gray-500">ساعة</span>
                    <Input type="number" min="0" value={manualForm.lateHours} onChange={(e) => setManualForm({ ...manualForm, lateHours: parseInt(e.target.value) || 0 })} className="w-16 h-8 text-center" />
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-gray-500">دقيقة</span>
                    <Input type="number" min="0" max="59" value={manualForm.lateMins} onChange={(e) => setManualForm({ ...manualForm, lateMins: parseInt(e.target.value) || 0 })} className="w-16 h-8 text-center" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-orange-600 font-bold">انصراف مبكر</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-orange-600 shadow-sm w-3 h-3 focus:ring-orange-500"
                      checked={manualOverrides.early}
                      onChange={(e) => setManualOverrides(prev => ({ ...prev, early: e.target.checked }))}
                    />
                    <span className="text-[10px] text-gray-500">تخطي الحساب</span>
                  </label>
                </div>
                <div className={`flex items-center gap-2 ${!manualOverrides.early ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-gray-500">ساعة</span>
                    <Input type="number" min="0" value={manualForm.earlyHours} onChange={(e) => setManualForm({ ...manualForm, earlyHours: parseInt(e.target.value) || 0 })} className="w-16 h-8 text-center" />
                  </div>
                  <div className="flex flex-col gap-1 items-center">
                    <span className="text-[10px] text-gray-500">دقيقة</span>
                    <Input type="number" min="0" max="59" value={manualForm.earlyMins} onChange={(e) => setManualForm({ ...manualForm, earlyMins: parseInt(e.target.value) || 0 })} className="w-16 h-8 text-center" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2"><Label>ملاحظات</Label><Input value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} placeholder="ملاحظات إضافية..." /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {isEditMode && editingRecordId && !editingRecordId.startsWith("temp-") && manualForm.checkIn && !manualForm.checkOut && (
              <Button
                type="button"
                variant="outline"
                className="bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white"
                onClick={async () => {
                  try {
                    await api.post("/hr/attendance/check-out", {
                      employeeId: manualForm.employeeId,
                      method: "manual"
                    });
                    tToast.success("attendance.success_login_2d09");
                    setShowManualDialog(false);
                    fetchAttendance();
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || "حدث خطأ");
                  }
                }}
              >
                تسجيل انصراف الآن
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowManualDialog(false)}>إلغاء</Button>
            <Button onClick={handleManualAttendance} className="bg-blue-600 hover:bg-blue-700">
              {isEditMode ? "حفظ التعديلات" : "تسجيل الحضور"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAutoCloseReviewDialog}
        onOpenChange={(open) => {
          setShowAutoCloseReviewDialog(open);
          if (!open) {
            setSelectedAutoCloseRecord(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-right">مراجعة الإغلاق التلقائي</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2" dir="rtl">
            {selectedAutoCloseRecord && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 space-y-2">
                <div className="font-bold text-gray-900">
                  {selectedAutoCloseRecord.employee?.firstName} {selectedAutoCloseRecord.employee?.lastName}
                </div>
                <div className="text-sm text-gray-600">
                  تاريخ السجل: {formatAttendanceDate(
                    selectedAutoCloseRecord.date,
                    { year: "numeric", month: "long", day: "numeric" },
                    "-",
                    attendanceTimezone,
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  وقت الإغلاق المعتمد: {formatAttendanceTime(selectedAutoCloseRecord.autoCloseAudit?.scheduledCheckOut || null)}
                </div>
                <div className="text-sm text-gray-600">
                  السبب: {getAutoCloseReasonLabel(selectedAutoCloseRecord.autoCloseAudit?.autoCloseReason)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>حالة المراجعة</Label>
              <Select
                value={autoCloseReviewForm.reviewStatus}
                onValueChange={(value) =>
                  setAutoCloseReviewForm((prev) => ({
                    ...prev,
                    reviewStatus: (value as AutoCloseReviewStatus) || "REVIEWED",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة المراجعة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">بانتظار المراجعة</SelectItem>
                  <SelectItem value="REVIEWED">تمت المراجعة</SelectItem>
                  <SelectItem value="ADJUSTED">تم التعديل</SelectItem>
                  <SelectItem value="DISMISSED">اعتماد كما هو</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملاحظات المراجعة</Label>
              <Textarea
                value={autoCloseReviewForm.reviewNotes}
                onChange={(e) =>
                  setAutoCloseReviewForm((prev) => ({
                    ...prev,
                    reviewNotes: e.target.value,
                  }))
                }
                placeholder="اكتب ملخص قرار المراجعة أو أي ملاحظات للإدارة/الموظف..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {selectedAutoCloseRecord && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAutoCloseReviewDialog(false);
                  handleEditClick(selectedAutoCloseRecord);
                }}
              >
                فتح السجل للتعديل
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowAutoCloseReviewDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={submitAutoCloseReview} className="bg-amber-600 hover:bg-amber-700">
              حفظ المراجعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(isOpen) => {
        setDeleteDialogOpen(isOpen);
        if (!isOpen) setIdToDelete(null);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-right">حذف سجل حضور</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-right text-gray-600">
            هل أنت متأكد من حذف هذا السجل بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.
          </div>
          <DialogFooter className="flex gap-3 justify-start rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              ملاحظات الحضور
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 px-4 bg-gray-50 rounded-lg border border-gray-100 min-h-[100px] flex items-center justify-center text-center">
            <p className="text-gray-700 font-medium whitespace-pre-wrap">{selectedNotes}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNotesDialog(false)} className="w-full bg-blue-600 hover:bg-blue-700">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              موقع تسجيل الـ {selectedLocation?.type || "حضور/انصراف"}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[400px] bg-gray-100 rounded-md overflow-hidden relative">
            {selectedLocation && (
              <iframe
                title="Google Maps Location"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowMapModal(false)} className="w-full bg-blue-600 hover:bg-blue-700">إغلاق الخريطة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
