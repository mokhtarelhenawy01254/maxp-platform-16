import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Palmtree,
  Stethoscope,
  Baby,
  Heart,
  GraduationCap,
  AlertTriangle,
  FileText,
  ArrowRight,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "../../components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { toast } from "sonner";

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  isHalfDay?: boolean;
  halfDayPeriod?: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    department: { name: string } | null;
  };
  approver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

const leaveTypeConfig: Record<
  string,
  { labelKey: string; icon: any; color: string }
> = {
  ANNUAL: {
    labelKey: "employee.leaves.annual",
    icon: Palmtree,
    color: "bg-green-100 text-green-800",
  },
  SICK: { labelKey: "employee.leaves.sick", icon: Stethoscope, color: "bg-red-100 text-red-800" },
  UNPAID: {
    labelKey: "employee.leaves.withoutPay",
    icon: Calendar,
    color: "bg-gray-100 text-gray-800",
  },
  MATERNITY: { labelKey: "employee.leaves.maternity", icon: Baby, color: "bg-pink-100 text-pink-800" },
  PATERNITY: { labelKey: "employee.leaves.paternity", icon: Baby, color: "bg-blue-100 text-blue-800" },
  BEREAVEMENT: {
    labelKey: "employee.leaves.funeral",
    icon: Heart,
    color: "bg-purple-100 text-purple-800",
  },
  MARRIAGE: { labelKey: "employee.leaves.marriage", icon: Heart, color: "bg-rose-100 text-rose-800" },
  HAJJ: { labelKey: "employee.leaves.hajj", icon: Calendar, color: "bg-amber-100 text-amber-800" },
  STUDY: {
    labelKey: "employee.leaves.study",
    icon: GraduationCap,
    color: "bg-indigo-100 text-indigo-800",
  },
  EMERGENCY: {
    labelKey: "employee.leaves.emergency",
    icon: AlertTriangle,
    color: "bg-orange-100 text-orange-800",
  },
  OTHER: {
    labelKey: "employee.leaves.other",
    icon: Calendar,
    color: "bg-slate-100 text-slate-800",
  },
};

const statusConfig: Record<string, { labelKey: string; color: string }> = {
  PENDING: { labelKey: "employee.leaves.pendingStatus", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { labelKey: "employee.leaves.approvedStatus", color: "bg-green-100 text-green-800" },
  REJECTED: { labelKey: "employee.leaves.rejectedStatus", color: "bg-red-100 text-red-800" },
  CANCELLED: { labelKey: "employee.leaves.cancelledStatus", color: "bg-gray-100 text-gray-800" },
};

const Leaves: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isMyLeaves = location.pathname === "/my-leaves";
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [workingDays, setWorkingDays] = useState<string[]>([
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
  ]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showChangeDecisionDialog, setShowChangeDecisionDialog] =
    useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [newDecision, setNewDecision] = useState<"APPROVE" | "REJECT" | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editFormData, setEditFormData] = useState({
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
    isHalfDay: false,
    halfDayPeriod: "",
    isPaid: true,
  });

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    type: "ANNUAL",
    startDate: "",
    endDate: "",
    reason: "",
    isHalfDay: false,
    halfDayPeriod: "",
    isPaid: true,
  });

  useEffect(() => {
    fetchSettings();
    fetchEmployees();
  }, [isMyLeaves]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [pagination.page, pagination.limit, statusFilter, typeFilter, activeTab, isMyLeaves]);

  const fetchSettings = async () => {
    try {
      const endpoint = isMyLeaves ? "/hr/leaves/my-config" : "/hr/settings";
      const response = await api.get(endpoint, { _skipErrorToast: true });
      if (response.data.settings?.workingDays) {
        setWorkingDays(response.data.settings.workingDays);
      }
    } catch (error) {
      console.error("Error fetching HR settings:", error);
    }
  };

  useEffect(() => {
    if (location.state && (location.state as any).createNew) {
      setShowAddDialog(true);
      // Clear state to prevent reopening on refresh (optional, but good practice if possible, though react-router state persists)
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchEmployees = async () => {
    if (isMyLeaves) return; // No need to fetch employees for my-leaves
    try {
      const response = await api.get("/hr/employees?limit=100");
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (activeTab === "pending") {
        params.append("status", "PENDING");
      } else if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);

      const endpoint = isMyLeaves ? "/hr/leaves/my-history" : "/hr/leaves";
      const response = await api.get(`${endpoint}?${params}`);
      setRequests(response.data.requests);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast.error(t("employee.leaves.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post(`/hr/leaves/${requestId}/approve`);
      toast.success(t("employee.leaves.approvedSuccess"));
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("employee.leaves.approveError"),
      );
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await api.post(`/hr/leaves/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      toast.success(t("employee.leaves.rejectedSuccess"));
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("employee.leaves.approveError"),
      );
    }
  };

  const handleReopenRequest = async () => {
    if (!selectedRequest) return;

    try {
      await api.post(`/hr/leaves/${selectedRequest.id}/reopen`);
      toast.success(t("employee.leaves.reopenedSuccess"));
      setShowReopenDialog(false);
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("employee.leaves.reopenError"),
      );
    }
  };

  const handleEditRequest = () => {
    if (!selectedRequest) return;

    // تعبئة بيانات النموذج بالبيانات الحالية للطلب
    setEditFormData({
      type: selectedRequest.type,
      startDate: selectedRequest.startDate.split("T")[0],
      endDate: selectedRequest.endDate.split("T")[0],
      reason: selectedRequest.reason || "",
      isHalfDay: selectedRequest.isHalfDay || false,
      halfDayPeriod: selectedRequest.halfDayPeriod || "",
      isPaid: selectedRequest.type !== "UNPAID",
    });

    // فتح مربع حوار التعديل
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequest) return;

    try {
      // أولاً، إعادة فتح الطلب
      await api.post(`/hr/leaves/${selectedRequest.id}/reopen`);

      // ثم تحديث بيانات الطلب
      const typeToSend = editFormData.isPaid ? editFormData.type : "UNPAID";

      const payload = {
        ...editFormData,
        type: typeToSend,
        employeeId: selectedRequest.userId,
      };
      delete (payload as any).isPaid;

      await api.put(`/hr/leaves/${selectedRequest.id}`, payload);

      toast.success(t("employee.leaves.editSuccess"));
      setShowEditDialog(false);
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("employee.leaves.editError"));
    }
  };

  const handleChangeDecision = async (newDecision: "APPROVE" | "REJECT" | "CANCELLED") => {
    if (!selectedRequest) return;

    try {
      if (newDecision === "APPROVE") {
        await api.post(`/hr/leaves/${selectedRequest.id}/approve`);
        toast.success(t("employee.leaves.decisionChangedToApproved"));
      } else if (newDecision === "CANCELLED") {
        await api.post(`/hr/leaves/${selectedRequest.id}/cancel`);
        toast.success(t("employee.leaves.cancelledSuccess"));
      } else {
        if (!rejectionReason.trim()) {
          toast.error(t("employee.leaves.rejectReasonRequired"));
          return;
        }
        await api.post(`/hr/leaves/${selectedRequest.id}/reject`, {
          reason: rejectionReason,
        });
        toast.success(t("employee.leaves.decisionChangedToRejected"));
      }

      setShowChangeDecisionDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t("employee.leaves.changeDecisionError"),
      );
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      if (!confirm(t("employee.leaves.cancelConfirm"))) return;

      await api.post(`/hr/leaves/${requestId}/cancel`);
      toast.success(t("employee.leaves.cancelledSuccess"));
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("employee.leaves.cancelError"));
    }
  };

  const handleDelete = async (request: LeaveRequest) => {
    const employeeName = request.employee
      ? `${request.employee.firstName} ${request.employee.lastName}`.trim()
      : t("employee.leaves.thisEmployee");
    const approvalWarning =
      request.status === "APPROVED"
        ? "\n" + t("employee.leaves.deleteRelatedWarning")
        : "";

    if (
      !window.confirm(
        t("employee.leaves.deleteConfirm", { name: employeeName }) + approvalWarning,
      )
    ) {
      return;
    }

    try {
      await api.delete(`/hr/leaves/${request.id}`);
      toast.success(t("employee.leaves.deleteSuccess"));
      if (selectedRequest?.id === request.id) {
        setShowDetailsDialog(false);
        setSelectedRequest(null);
      }
      fetchLeaveRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("employee.leaves.deleteError"));
    }
  };

  const handleAddRequest = async () => {
    try {
      setFieldErrors({});
      // For my-leaves, we don't send employeeId (backend infers it)
      // For admin, we must send it.
      const typeToSend = formData.isPaid ? formData.type : "UNPAID";

      const payload = {
        ...formData,
        type: typeToSend,
        totalDays: totalDaysCount,
      };
      delete (payload as any).isPaid;

      if (isMyLeaves) {
        delete (payload as any).employeeId;
      }

      await api.post("/hr/leaves", payload);
      toast.success(t("employee.leaves.submitSuccess"), {
        description: t("employee.leaves.submitSuccessDesc"),
        icon: <Check className="h-4 w-4 text-green-500" />,
      });
      setShowAddDialog(false);
      resetForm();
      fetchLeaveRequests();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        toast.error(t("employee.leaves.validationFailed"), {
          description: t("employee.leaves.validationFailedDesc"),
        });
      } else {
        const message =
          error.response?.data?.message || t("employee.leaves.submitError");
        const code = error.response?.data?.code;

        toast.error(message, {
          description:
            code === "INSUFFICIENT_LEAVE_BALANCE"
              ? t("employee.leaves.submitErrorHint")
              : undefined,
        });
      }
    }
  };

  const calculateTotalDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) return -1;

    const dayNameToNumber: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const workingDaysNumbers = workingDays.map((d) => dayNameToNumber[d]);

    let days = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Check if day is a working day based on settings
      if (workingDaysNumbers.includes(dayOfWeek)) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const totalDaysCount = calculateTotalDays(
    formData.startDate,
    formData.endDate,
  );

  const resetForm = () => {
    setFormData({
      employeeId: "",
      type: "ANNUAL",
      startDate: "",
      endDate: "",
      reason: "",
      isHalfDay: false,
      halfDayPeriod: "",
      isPaid: true,
    });
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isMyLeaves ? t("employee.leaves.myLeaves") : t("employee.leaves.manageLeaves")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("employee.leaves.totalRequests", { count: pagination.total })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 ml-2" />
            {t("employee.leaves.export")}
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t("employee.leaves.newLeaveRequest")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">{t("employee.leaves.pending")}</p>
                <h3 className="text-3xl font-bold mt-1">{pendingCount}</h3>
              </div>
              <Clock className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t("employee.leaves.approved")}</p>
                <h3 className="text-3xl font-bold mt-1 text-green-600">
                  {requests.filter((r) => r.status === "APPROVED").length}
                </h3>
              </div>
              <Check className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t("employee.leaves.rejected")}</p>
                <h3 className="text-3xl font-bold mt-1 text-red-600">
                  {requests.filter((r) => r.status === "REJECTED").length}
                </h3>
              </div>
              <X className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{t("employee.leaves.totalDays")}</p>
                <h3 className="text-3xl font-bold mt-1 text-blue-600">
                  {requests
                    .filter((r) => r.status === "APPROVED")
                    .reduce((sum, r) => sum + r.totalDays, 0)}
                </h3>
              </div>
              <Calendar className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <TabsList>
                <TabsTrigger value="all">{t("employee.leaves.all")}</TabsTrigger>
                <TabsTrigger value="pending" className="relative">
                  {t("employee.leaves.pending")}
                  {pendingCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t("employee.leaves.leaveType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("employee.leaves.all")}</SelectItem>
                    {Object.entries(leaveTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {t(config.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeTab === "all" && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t("employee.leaves.status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("employee.leaves.all")}</SelectItem>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {t(config.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>{t("employee.leaves.noLeaveRequests")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!isMyLeaves && (
                    <TableHead className="text-right">{t("employee.leaves.employee")}</TableHead>
                  )}
                  <TableHead className="text-right">{t("employee.leaves.leaveType")}</TableHead>
                  <TableHead className="text-right">{t("employee.leaves.from")}</TableHead>
                  <TableHead className="text-right">{t("employee.leaves.to")}</TableHead>
                  <TableHead className="text-right">{t("employee.leaves.duration")}</TableHead>
                  <TableHead className="text-right">{t("employee.leaves.status")}</TableHead>
                  <TableHead className="text-right">{t("employee.leaves.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const typeConfig =
                    leaveTypeConfig[request.type] || leaveTypeConfig["OTHER"];
                  const TypeIcon = typeConfig?.icon || Calendar;

                  return (
                    <TableRow key={request.id}>
                      {!isMyLeaves && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.employee?.avatar} />
                              <AvatarFallback>
                                {request.employee?.firstName?.[0]}
                                {request.employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {request.employee?.firstName}{" "}
                                {request.employee?.lastName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.employee?.department?.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={typeConfig?.color || "bg-gray-100"}>
                            <TypeIcon className="h-3 w-3 ml-1" />
                            {t(typeConfig?.labelKey) || request.type}
                          </Badge>
                          <Badge
                            className={`${request.type !== "UNPAID"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {request.type !== "UNPAID"
                              ? t("employee.leaves.paid")
                              : t("employee.leaves.unpaid")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(request.startDate).toLocaleDateString(
                          "ar-EG",
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(request.endDate).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{request.totalDays}</span>{" "}
                        {t("employee.leaves.day")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusConfig[request.status]?.color || ""}
                        >
                          {t(statusConfig[request.status]?.labelKey) ||
                            request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === "PENDING" && !isMyLeaves && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApprove(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {request.status === "PENDING" && isMyLeaves && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-orange-500 hover:bg-orange-600"
                              onClick={() => handleCancel(request.id)}
                            >
                              {t("employee.leaves.cancel")}
                            </Button>
                          )}

                          {/* زر تغيير القرار للإجازات المرفوضة والموافق عليها */}
                          {(request.status === "REJECTED" ||
                            request.status === "APPROVED") &&
                            !isMyLeaves && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setNewDecision("");
                                    setShowChangeDecisionDialog(true);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4 ml-1" />
                                  {t("employee.leaves.changeDecision")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    handleEditRequest();
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                  {t("employee.leaves.edit")}
                                </Button>
                              </>
                            )}

                          {!isMyLeaves && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(request)}
                            >
                              <Trash2 className="h-4 w-4 ml-1" />
                              {t("employee.leaves.delete")}
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">
              {t("employee.leaves.pagination", {
                from: (pagination.page - 1) * pagination.limit + 1,
                to: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add Leave Request Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
              <Plus className="h-6 w-6 text-primary" />
              {t("employee.leaves.dialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              {t("employee.leaves.dialogDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Employee Selector - Hide in My Leaves mode */}
            {!isMyLeaves && (
              <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Eye className="h-4 w-4" />
                    {t("employee.leaves.employeeLabel")}
                  </Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                    <SelectValue placeholder={t("employee.leaves.employeePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    {employees.map((emp) => (
                      <SelectItem
                        key={emp.id}
                        value={emp.id}
                        className="justify-end cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-row-reverse">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={emp.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {emp.firstName?.[0]}
                              {emp.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {emp.firstName} {emp.lastName}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors["employeeId"] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">
                    {fieldErrors["employeeId"]}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Palmtree className="h-4 w-4" />
                {t("employee.leaves.leaveTypeLabel")}
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value,
                    isPaid: value === "UNPAID" ? false : formData.isPaid,
                  })
                }
              >
                <SelectTrigger
                  className={`w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl ${fieldErrors["type"] ? "border-red-500 ring-red-500" : ""}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  {Object.entries(leaveTypeConfig).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="justify-end cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800"
                    >
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <config.icon
                          className={`h-4 w-4 ${config.color.split(" ")[1]}`}
                        />
                        <span>{t(config.labelKey)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors["type"] && (
                <p className="text-xs text-red-500 mt-1 mr-1">
                  {fieldErrors["type"]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Wallet className="h-4 w-4" />
                {t("employee.leaves.payStatusLabel")}
              </Label>
              <Select
                value={formData.isPaid ? "PAID" : "UNPAID"}
                onValueChange={(value) => {
                  const isPaid = value === "PAID";
                  setFormData({
                    ...formData,
                    isPaid,
                    type: !isPaid && formData.type !== "UNPAID" ? "UNPAID" : isPaid && formData.type === "UNPAID" ? "ANNUAL" : formData.type,
                  });
                }}
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <SelectItem value="PAID">{t("employee.leaves.paidOption")}</SelectItem>
                  <SelectItem value="UNPAID">{t("employee.leaves.unpaidOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  {t("employee.leaves.fromDateLabel")}
                </Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${fieldErrors["startDate"] ? "border-red-500" : ""}`}
                />
                {fieldErrors["startDate"] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">
                    {fieldErrors["startDate"]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  {t("employee.leaves.toDateLabel")}
                </Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${fieldErrors["endDate"] ? "border-red-500" : ""}`}
                />
                {fieldErrors["endDate"] && (
                  <p className="text-xs text-red-500 mt-1 mr-1">
                    {fieldErrors["endDate"]}
                  </p>
                )}
              </div>
            </div>

            {/* Duration Display */}
            {formData.startDate && formData.endDate && (
              <div
                className={`p-4 rounded-lg flex items-center justify-between ${totalDaysCount === -1
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {totalDaysCount === -1 ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {totalDaysCount === -1
                      ? t("employee.leaves.endDateAfterStart")
                      : totalDaysCount === 0
                        ? t("employee.leaves.weekendWarning")
                        : t("employee.leaves.durationLabel", { days: totalDaysCount })}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`p-3 rounded-lg border transition-colors ${formData.isHalfDay ? "bg-primary/5 border-primary/20" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
            >
              <div className="flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-right">
                    <Label className="text-sm font-medium">{t("employee.leaves.halfDay")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("employee.leaves.halfDayDesc")}
                    </p>
                  </div>
                </div>
                <Checkbox
                  id="isHalfDay"
                  checked={formData.isHalfDay}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, isHalfDay: checked })
                  }
                />
              </div>

              {formData.isHalfDay && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xs text-gray-500 block text-right">
                    {t("employee.leaves.halfDayPeriod")}
                  </Label>
                  <Select
                    value={formData.halfDayPeriod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, halfDayPeriod: value })
                    }
                  >
                    <SelectTrigger
                      className={`w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-right ${fieldErrors["halfDayPeriod"] ? "border-red-500" : ""}`}
                    >
                      <SelectValue placeholder={t("employee.leaves.periodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                      <SelectItem value="MORNING" className="justify-end">
                        {t("employee.leaves.morningPeriod")}
                      </SelectItem>
                      <SelectItem value="AFTERNOON" className="justify-end">
                        {t("employee.leaves.afternoonPeriod")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors["halfDayPeriod"] && (
                    <p className="text-xs text-red-500 mt-1 mr-1">
                      {fieldErrors["halfDayPeriod"]}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                {t("employee.leaves.reasonLabel")}
              </Label>
              <Textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder={t("employee.leaves.reasonPlaceholder")}
                rows={3}
                className={`bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right ${fieldErrors["reason"] ? "border-red-500" : ""}`}
              />
              {fieldErrors["reason"] && (
                <p className="text-xs text-red-500 mt-1 mr-1">
                  {fieldErrors["reason"]}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <Button
              onClick={handleAddRequest}
              disabled={
                totalDaysCount <= 0 ||
                !formData.startDate ||
                !formData.endDate ||
                (!isMyLeaves && !formData.employeeId)
              }
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white w-full sm:w-auto"
            >
              {t("employee.leaves.submitButton")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="w-full sm:w-auto"
            >
              {t("employee.leaves.cancelButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("employee.leaves.detailsTitle")}</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedRequest.employee?.avatar} />
                  <AvatarFallback>
                    {selectedRequest.employee?.firstName?.[0]}
                    {selectedRequest.employee?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedRequest.employee?.firstName}{" "}
                    {selectedRequest.employee?.lastName}
                  </h3>
                  <p className="text-gray-500">
                    {selectedRequest.employee?.department?.name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.leaveType")}</Label>
                  <p className="font-medium">
                    {t(leaveTypeConfig[selectedRequest.type]?.labelKey)}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.payStatusLabel")}</Label>
                  <Badge
                    className={
                      selectedRequest.type !== "UNPAID"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {selectedRequest.type !== "UNPAID"
                      ? t("employee.leaves.paid")
                      : t("employee.leaves.unpaid")}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.status")}</Label>
                  <Badge
                    className={
                      statusConfig[selectedRequest.status]?.color || ""
                    }
                  >
                    {t(statusConfig[selectedRequest.status]?.labelKey) ||
                      selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.from")}</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.startDate).toLocaleDateString(
                      "ar-EG",
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.to")}</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.endDate).toLocaleDateString(
                      "ar-EG",
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.duration")}</Label>
                  <p className="font-medium">{selectedRequest.totalDays} {t("employee.leaves.day")}</p>
                </div>
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.requestDate")}</Label>
                  <p className="font-medium">
                    {new Date(selectedRequest.createdAt).toLocaleDateString(
                      "ar-EG",
                    )}
                  </p>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.reasonLabel")}</Label>
                  <p className="mt-1">{selectedRequest.reason}</p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <Label className="text-red-600">{t("employee.leaves.rejectReasonLabel")}</Label>
                  <p className="mt-1 text-red-700">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}

              {selectedRequest.approver && (
                <div>
                  <Label className="text-gray-500">{t("employee.leaves.reviewedBy")}</Label>
                  <p className="font-medium">
                    {selectedRequest.approver.firstName}{" "}
                    {selectedRequest.approver.lastName}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              {t("employee.leaves.closeButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("employee.leaves.rejectTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p>{t("employee.leaves.rejectConfirm")}</p>
            <div className="space-y-2">
              <Label>{t("employee.leaves.rejectReasonLabel")}</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("employee.leaves.rejectReasonPlaceholder")}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              {t("employee.leaves.cancelButton")}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t("employee.leaves.rejectButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("employee.leaves.reopenTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="font-medium text-amber-800">
                  {t("employee.leaves.reopenRejectedTitle")}
                </h3>
              </div>
              <p className="mt-2 text-amber-700 text-sm">
                {t("employee.leaves.reopenConfirm")}
              </p>
            </div>

            {selectedRequest && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t("employee.leaves.employee")}:</span>
                  <span className="font-medium">
                    {selectedRequest.employee?.firstName}{" "}
                    {selectedRequest.employee?.lastName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t("employee.leaves.leaveType")}:</span>
                  <span>{t(leaveTypeConfig[selectedRequest.type]?.labelKey)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t("employee.leaves.duration")}:</span>
                  <span>{selectedRequest.totalDays} {t("employee.leaves.day")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">{t("employee.leaves.rejectReasonLabel")}:</span>
                  <span className="text-red-600">
                    {selectedRequest.rejectionReason}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReopenDialog(false)}
            >
              {t("employee.leaves.cancelButton")}
            </Button>
            <Button
              variant="default"
              onClick={handleReopenRequest}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t("employee.leaves.reopenButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
              <ArrowRight className="h-6 w-6 text-amber-600" />
              {t("employee.leaves.editTitle")}
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              {t("employee.leaves.editDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {selectedRequest && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-medium text-amber-800">
                    {t("employee.leaves.editRejectedTitle")}
                  </h3>
                </div>
                <p className="mt-2 text-amber-700 text-sm">
                  {t("employee.leaves.rejectedEditNote")}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Palmtree className="h-4 w-4" />
                {t("employee.leaves.leaveTypeLabel")}
              </Label>
              <Select
                value={editFormData.type}
                onValueChange={(value) =>
                  setEditFormData({
                    ...editFormData,
                    type: value,
                    isPaid: value === "UNPAID" ? false : editFormData.isPaid,
                  })
                }
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                  <SelectValue />
                </SelectTrigger>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Wallet className="h-4 w-4" />
                {t("employee.leaves.payStatusLabel")}
              </Label>
              <Select
                value={editFormData.isPaid ? "PAID" : "UNPAID"}
                onValueChange={(value) => {
                  const isPaid = value === "PAID";
                  setEditFormData({
                    ...editFormData,
                    isPaid,
                    type: !isPaid && editFormData.type !== "UNPAID" ? "UNPAID" : isPaid && editFormData.type === "UNPAID" ? "ANNUAL" : editFormData.type,
                  });
                }}
              >
                <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <SelectItem value="PAID">{t("employee.leaves.paidOption")}</SelectItem>
                  <SelectItem value="UNPAID">{t("employee.leaves.unpaidOption")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

                <SelectContent className="max-h-[200px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  {Object.entries(leaveTypeConfig).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="justify-end cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-800"
                    >
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <config.icon
                          className={`h-4 w-4 ${config.color.split(" ")[1]}`}
                        />
                        <span>{t(config.labelKey)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  {t("employee.leaves.fromDateLabel")}
                </Label>
                <Input
                  type="date"
                  value={editFormData.startDate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      startDate: e.target.value,
                    })
                  }
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                  {t("employee.leaves.toDateLabel")}
                </Label>
                <Input
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      endDate: e.target.value,
                    })
                  }
                  className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                {t("employee.leaves.reasonLabel")}
              </Label>
              <Textarea
                value={editFormData.reason}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, reason: e.target.value })
                }
                placeholder={t("employee.leaves.reasonPlaceholder")}
                rows={3}
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl"
              />
            </div>

            <div
              className={`p-3 rounded-lg border transition-colors ${editFormData.isHalfDay ? "bg-primary/5 border-primary/20" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"}`}
            >
              <div className="flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-700">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-right">
                    <Label className="text-sm font-medium">{t("employee.leaves.halfDay")}</Label>
                    <p className="text-xs text-gray-500">
                      {t("employee.leaves.halfDayDesc")}
                    </p>
                  </div>
                </div>
                <Checkbox
                  id="editIsHalfDay"
                  checked={editFormData.isHalfDay}
                  onCheckedChange={(checked: boolean) =>
                    setEditFormData({ ...editFormData, isHalfDay: checked })
                  }
                />
              </div>

              {editFormData.isHalfDay && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Label className="text-xs text-gray-500 block text-right">
                    {t("employee.leaves.halfDayPeriod")}
                  </Label>
                  <Select
                    value={editFormData.halfDayPeriod}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, halfDayPeriod: value })
                    }
                  >
                    <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right dir-rtl">
                      <SelectValue placeholder={t("employee.leaves.periodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="MORNING"
                        className="justify-end cursor-pointer"
                      >
                        {t("employee.leaves.morningPeriod")}
                      </SelectItem>
                      <SelectItem
                        value="AFTERNOON"
                        className="justify-end cursor-pointer"
                      >
                        {t("employee.leaves.afternoonPeriod")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("employee.leaves.cancelButton")}
            </Button>
            <Button
              variant="default"
              onClick={handleSaveEdit}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t("employee.leaves.saveEdit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Decision Dialog */}
      <Dialog
        open={showChangeDecisionDialog}
        onOpenChange={(open) => {
          setShowChangeDecisionDialog(open);
          if (!open) {
            setNewDecision("");
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
              <RotateCcw className="h-6 w-6 text-blue-600" />
              {t("employee.leaves.changeDecisionTitle")}
            </DialogTitle>
            <DialogDescription className="text-right text-gray-500 dark:text-gray-400">
              {t("employee.leaves.changeDecisionDesc")}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* معلومات الطلب */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("employee.leaves.employee")}:</span>
                    <span className="font-medium">
                      {selectedRequest.employee?.firstName}{" "}
                      {selectedRequest.employee?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("employee.leaves.leaveType")}:</span>
                    <span>{t(leaveTypeConfig[selectedRequest.type]?.labelKey)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("employee.leaves.duration")}:</span>
                    <span>{selectedRequest.totalDays} {t("employee.leaves.day")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">{t("employee.leaves.currentStatus")}:</span>
                    <Badge
                      className={
                        statusConfig[selectedRequest.status]?.color || ""
                      }
                    >
                      {t(statusConfig[selectedRequest.status]?.labelKey)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* اختيار القرار الجديد */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">
                  {t("employee.leaves.newDecisionLabel")}
                </Label>

                <div className="grid grid-cols-3 gap-2">
                  {/* زر الموافقة */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-2 p-1 ${selectedRequest.status === "APPROVED"
                      ? "border-gray-300 opacity-50 cursor-not-allowed bg-gray-50"
                      : "border-green-500 hover:bg-green-50 hover:border-green-600"
                      }`}
                    onClick={() => {
                      if (selectedRequest.status !== "APPROVED") {
                        setNewDecision("APPROVE");
                        handleChangeDecision("APPROVE");
                      }
                    }}
                    disabled={selectedRequest.status === "APPROVED"}
                  >
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-xs">{t("employee.leaves.approveOption")}</span>
                    {selectedRequest.status === "APPROVED" && (
                      <span className="text-[10px] text-gray-500">
                        {t("employee.leaves.currentStatusLabel")}
                      </span>
                    )}
                  </Button>

                  {/* زر الرفض */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-2 p-1 ${selectedRequest.status === "REJECTED"
                      ? "border-gray-300 opacity-50 cursor-not-allowed bg-gray-50"
                      : "border-red-500 hover:bg-red-50 hover:border-red-600"
                      }`}
                    onClick={() => {
                      if (selectedRequest.status !== "REJECTED") {
                        // عند الضغط على زر الرفض، نظهر حقل سبب الرفض
                        setNewDecision("REJECT");
                      }
                    }}
                    disabled={selectedRequest.status === "REJECTED"}
                  >
                    <X className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-xs">{t("employee.leaves.rejectOption")}</span>
                    {selectedRequest.status === "REJECTED" && (
                      <span className="text-[10px] text-gray-500">
                        {t("employee.leaves.currentStatusLabel")}
                      </span>
                    )}
                  </Button>

                  {/* زر الإلغاء */}
                  <Button
                    variant="outline"
                    className={`h-20 flex flex-col gap-2 p-1 ${selectedRequest.status === "CANCELLED"
                      ? "border-gray-300 opacity-50 cursor-not-allowed bg-gray-50"
                      : "border-orange-500 hover:bg-orange-50 hover:border-orange-600"
                      }`}
                    onClick={() => {
                      if (selectedRequest.status !== "CANCELLED") {
                        setNewDecision("CANCELLED");
                        handleChangeDecision("CANCELLED");
                      }
                    }}
                    disabled={selectedRequest.status === "CANCELLED"}
                  >
                    <RotateCcw className="h-5 w-5 text-orange-600" />
                    <span className="font-medium text-xs">{t("employee.leaves.cancelRequest")}</span>
                    {selectedRequest.status === "CANCELLED" && (
                      <span className="text-[10px] text-gray-500">
                        {t("employee.leaves.currentStatusLabel")}
                      </span>
                    )}
                  </Button>
                </div>

                {/* حقل سبب الرفض - يظهر عندما يتم اختيار الرفض */}
                {newDecision === "REJECT" && (
                  <div className="space-y-2 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <FileText className="h-4 w-4" />
                      {t("employee.leaves.rejectReasonLabel")} *
                    </Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t("employee.leaves.rejectReasonPlaceholder")}
                      rows={3}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-right"
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleChangeDecision("REJECT")}
                    >
                      <X className="h-4 w-4 ml-2" />
                      {t("employee.leaves.confirmReject")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-row-reverse sm:justify-start">
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeDecisionDialog(false);
                setRejectionReason("");
              }}
            >
              {t("employee.leaves.closeButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaves;
