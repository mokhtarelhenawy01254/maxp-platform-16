import React, { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, Clock, Download, Eye, File, FileText, History, Loader2, Plus, Receipt, RefreshCcw, RefreshCw, RotateCcw, Timer, Trash2, X, Zap } from 'lucide-react';
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
import api from "../../services/api";
import { toast } from "sonner";

interface PermissionRequest {
  id: string;
  type: "DEDUCTIBLE" | "NON_DEDUCTIBLE" | "FIXED_HOURS" | "COMPENSATORY";
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  details?: string;
  notes?: string;
  isUrgent: boolean;
  isCompensated: boolean;
  compensationDate?: string;
  compensationNotes?: string;
  createdAt: string;
  attachments?: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    employeeNumber: string;
    department: { name: string } | null;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  rejectionReason?: string;
}

const permissionTypeConfig: Record<
  string,
  { label: string; icon: any; color: string; description: string }
> = {
  DEDUCTIBLE: {
    label: "إذن خروج (خصم)",
    icon: Receipt,
    color: "bg-red-100 text-red-800 border-red-200",
    description: "إذن مغادرة مخصوم من ساعات العمل الشهرية",
  },
  NON_DEDUCTIBLE: {
    label: "إذن طارئ (بدون خصم)",
    icon: Zap,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "إذن مغادرة للحالات الطارئة لا يحتسب كخصم",
  },
  FIXED_HOURS: {
    label: "مأمورية عمل خارجية",
    icon: Timer,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "خروج لمهمة عمل رسمية تحتسب ضمن ساعات الدوام",
  },
  COMPENSATORY: {
    label: "إذن تعويضي",
    icon: RefreshCcw,
    color: "bg-green-100 text-green-800 border-green-200",
    description: "إذن يتم تعويض ساعاته برصيد إضافي في وقت آخر",
  },
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  PENDING: {
    label: "قيد الانتظار",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  APPROVED: {
    label: "موافق عليه",
    color: "bg-green-100 text-green-800",
    icon: Check,
  },
  REJECTED: { label: "مرفوض", color: "bg-red-100 text-red-800", icon: X },
};

const Permissions: React.FC = () => {
  const location = useLocation();
  const isMyPermissions = location.pathname === "/my-permissions";

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<PermissionRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    type: "DEDUCTIBLE",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "11:00",
    reason: "",
    details: "",
    isUrgent: false,
    isCompensated: false,
    compensationDate: "",
    compensationNotes: "",
  });

  useEffect(() => {
    fetchPermissions();
    fetchStats();
    if (!isMyPermissions) fetchEmployees();
  }, [pagination.page, typeFilter, activeTab, isMyPermissions]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees?limit=100");
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (activeTab === "pending") {
        params.append("status", "PENDING");
      } else if (activeTab === "approved") {
        params.append("status", "APPROVED");
      } else if (activeTab === "rejected") {
        params.append("status", "REJECTED");
      }

      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (isMyPermissions) {
        params.append("mine", "true");
      }

      const response = await api.get(`/hr/permissions?${params}`);
      setRequests(response.data.requests);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("حدث خطأ أثناء جلب طلبات الأذونات");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = isMyPermissions ? "/hr/permissions/stats?mine=true" : "/hr/permissions/stats";
      const response = await api.get(url);
      setStats(response.data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return (diff / 60).toFixed(2);
  };

  const handleCreate = async () => {
    // Validation
    if (!isMyPermissions && !formData.employeeId) {
      toast.error("يرجى اختيار الموظف أولاً");
      return;
    }

    if (!formData.reason || formData.reason.trim() === "") {
      toast.error("يرجى كتابة سبب الاستئذان");
      return;
    }

    try {
      setSubmitting(true);
      setFieldErrors({});

      const totalHoursStr = calculateHours(
        formData.startTime,
        formData.endTime,
      );
      const payload = {
        ...formData,
        totalHours: parseFloat(totalHoursStr),
      };

      console.log("🚀 Sending permission request:", payload);
      const response = await api.post("/hr/permissions", payload);

      if (response.data.success) {
        toast.success("تم إنشاء طلب الإذن بنجاح");
        setShowAddDialog(false);
        resetForm();
        await Promise.all([fetchPermissions(), fetchStats()]);
      }
    } catch (error: any) {
      console.error("❌ Error creating permission:", error);
      const errorMessage =
        error.response?.data?.message || "حدث خطأ أثناء إضافة الطلب";

      if (
        error.response?.data?.errors &&
        Array.isArray(error.response.data.errors)
      ) {
        const errors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          errors[err.field] = err.message;
        });
        setFieldErrors(errors);
        toast.error("يرجى التحقق من الحقول المطلوبة");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await api.post(`/hr/permissions/${requestId}/approve`);
      toast.success("تمت الموافقة على الإذن");
      fetchPermissions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء الموافقة");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) {
      toast.error("يجب إدخال سبب الرفض");
      return;
    }
    try {
      await api.post(`/hr/permissions/${selectedRequest.id}/reject`, {
        reason: rejectionReason,
      });
      toast.success("تم رفض الطلب");
      setShowRejectDialog(false);
      setRejectionReason("");
      fetchPermissions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء الرفض");
    }
  };

  const handleDelete = (request: PermissionRequest) => {
    setSelectedRequest(request);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      await api.delete(`/hr/permissions/${selectedRequest.id}`);
      toast.success("تم حذف الطلب بنجاح");
      setShowDeleteDialog(false);
      setSelectedRequest(null);
      fetchPermissions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء الحذف");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      type: "DEDUCTIBLE",
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "11:00",
      reason: "",
      details: "",
      isUrgent: false,
      isCompensated: false,
      compensationDate: "",
      compensationNotes: "",
      attachments: "",
    });
  };

  const pendingCount = stats?.pendingCount || 0;

  return (
    <div
      className="p-6 space-y-6 bg-gray-50/50 dark:bg-gray-950 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              أذونات الحضور والانصراف
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <History className="h-4 w-4" />
              {pagination.total} إذن مسجل في النظام
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          >
            <Download className="h-4 w-4 ml-2" />
            تصدير التقارير
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus className="h-4 w-4 ml-2" />
            طلب إذن جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
            <Clock className="h-24 w-24" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-amber-100 text-sm font-medium">
              طلبات في انتظار الموافقة
            </p>
            <div className="flex items-end gap-2 mt-2">
              <h3 className="text-4xl font-bold">{pendingCount}</h3>
              <span className="text-amber-100 mb-1">طلب</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-amber-100 bg-white/10 w-fit px-2 py-1 rounded-full">
              <AlertCircle className="h-3 w-3" />
              يجب الرد عليها بسرعة
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  إجمالي ساعات الاستئذان
                </p>
                <div className="flex items-end gap-2 mt-2">
                  <h3 className="text-4xl font-bold text-gray-900 dark:text-white">
                    {stats?.totalHours || 0}
                  </h3>
                  <span className="text-gray-500 mb-1">ساعة</span>
                </div>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                <Timer className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[65%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  أذونات بخصم
                </p>
                <h3 className="text-4xl font-bold mt-2 text-red-600 dark:text-red-400">
                  {stats?.byType?.DEDUCTIBLE || 0}
                </h3>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <Receipt className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">ساعات مخصومة من الراتب</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  ساعات عمل رسمية
                </p>
                <h3 className="text-4xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                  {stats?.byType?.FIXED_HOURS || 0}
                </h3>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                <Timer className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">مأموريات وعمل خارجي</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Tabs and Table */}
      <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-auto"
            >
              <TabsList className="bg-gray-100/50 dark:bg-gray-800/50 p-1">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
                >
                  الكل
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="relative data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm"
                >
                  قيد الانتظار
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold ring-2 ring-white dark:ring-gray-900 animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">الموافق عليها</TabsTrigger>
                <TabsTrigger value="rejected">المرفوضة</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700">
                  <SelectValue placeholder="نوع الإذن" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {Object.entries(permissionTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-80 gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-600 border-t-transparent"></div>
                <p className="text-gray-500 text-sm animate-pulse">
                  جاري تحميل البيانات...
                </p>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-gray-400">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-full mb-4">
                  <Calendar className="h-12 w-12 opacity-20" />
                </div>
                <p className="text-lg">لا توجد طلبات أذونات متاحة</p>
                <Button variant="link" onClick={() => setShowAddDialog(true)}>
                  قم بإنشاء أول طلب إذن الآن
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-gray-800/20">
                  <TableRow className="border-none">
                    {!isMyPermissions && (
                      <TableHead className="text-right font-bold py-4">
                        الموظف
                      </TableHead>
                    )}
                    <TableHead className="text-right font-bold">
                      نوع الإذن
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      التاريخ
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      الوقت (من - إلى)
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      المدة
                    </TableHead>
                    <TableHead className="text-right font-bold">
                      الحالة
                    </TableHead>
                    <TableHead className="text-left font-bold pl-6">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const typeConfig =
                      permissionTypeConfig[request.type] ||
                      permissionTypeConfig["DEDUCTIBLE"];
                    const TypeIcon = typeConfig.icon;
                    const status = statusConfig[request.status];

                    return (
                      <TableRow
                        key={request.id}
                        className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-gray-100 dark:border-gray-800"
                      >
                        {!isMyPermissions && (
                          <TableCell className="py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 ring-1 ring-gray-100 dark:ring-gray-800 shadow-sm">
                                <AvatarImage src={request.employee?.avatar} />
                                <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                                  {request.employee?.firstName?.[0]}
                                  {request.employee?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white leading-tight">
                                  {request.employee?.firstName}{" "}
                                  {request.employee?.lastName}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {request.employee?.department?.name ||
                                    "بدون قسم"}{" "}
                                  • {request.employee?.employeeNumber}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit text-xs font-semibold border ${typeConfig.color}`}
                          >
                            <TypeIcon className="h-4 w-4" />
                            {typeConfig.label}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Date(request.date).toLocaleDateString("ar-EG", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {request.startTime}
                            </span>
                            <span className="text-xs">إلى</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {request.endTime}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-bold">
                              {request.totalHours}
                            </span>
                            <span className="text-xs text-gray-500">ساعة</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit text-[10px] uppercase tracking-wider font-bold ${status.color}`}
                          >
                            <status.icon className="h-3.5 w-3.5" />
                            {status.label}
                          </div>
                        </TableCell>
                        <TableCell className="pl-6">
                          <div className="flex items-center justify-start gap-2">
                            {request.status === "PENDING" &&
                              !isMyPermissions && (
                                <>
                                  <Button
                                    size="sm"
                                    className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                                    onClick={() => handleApprove(request.id)}
                                    title="موافقة"
                                  >
                                    <Check className="h-4 w-4 text-white" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 w-8 p-0 rounded-lg shadow-sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowRejectDialog(true);
                                    }}
                                    title="رفض"
                                  >
                                    <X className="h-4 w-4 text-white" />
                                  </Button>
                                </>
                              )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(!isMyPermissions || request.status === "PENDING") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                                onClick={() => handleDelete(request)}
                                title="حذف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-6 bg-gray-50/50 dark:bg-gray-800/10 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500">
                عرض{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                إلى{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                من أصل{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {pagination.total}
                </span>{" "}
                طلب
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-gray-900 h-9 px-4 rounded-lg"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  السابق
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1,
                  ).map((p) => (
                    <Button
                      key={p}
                      variant={p === pagination.page ? "default" : "ghost"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: p }))
                      }
                    >
                      {p}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-gray-900 h-9 px-4 rounded-lg"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}

      {/* Create Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-0 overflow-hidden rounded-2xl shadow-2xl">
          <div className="bg-blue-600 p-6 text-white text-right relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
                <Plus className="h-6 w-6" />
                طلب إذن/استئذان جديد
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-1">
                يرجى تحديد نوع الإذن وفترة الغياب المطلوبة
              </DialogDescription>
            </div>
            <Clock className="absolute -left-10 -bottom-10 h-40 w-40 text-blue-500 opacity-20 rotate-12" />
          </div>

          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            {!isMyPermissions && (
              <div className="space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  الموظف
                </Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, employeeId: v })
                  }
                >
                  <SelectTrigger className="bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-12 text-right">
                    <SelectValue placeholder="اختر الموظف" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] p-2">
                    {employees.map((e) => (
                      <SelectItem
                        key={e.id}
                        value={e.id}
                        className="rounded-lg mb-1 focus:bg-blue-50 dark:focus:bg-blue-900/20"
                      >
                        <div className="flex items-center gap-3 flex-row-reverse px-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={e.avatar} />
                            <AvatarFallback>{e.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <p className="font-bold text-sm">
                              {e.firstName} {e.lastName}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {e.department?.name}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  نوع الإذن
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(permissionTypeConfig).map(([key, config]) => (
                    <div
                      key={key}
                      onClick={() =>
                        setFormData({ ...formData, type: key as any })
                      }
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 text-right ${formData.type === key
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-4 ring-blue-500/5"
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        {formData.type === key ? (
                          <Check className="h-4 w-4 text-blue-600" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <config.icon
                          className={`h-6 w-6 ${formData.type === key ? "text-blue-600" : "text-gray-400"}`}
                        />
                      </div>
                      <p
                        className={`font-bold text-sm mt-1 ${formData.type === key ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {config.label}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {config.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  التاريخ
                </Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  درجة الأهمية
                </Label>
                <div className="flex gap-2 h-12">
                  <Button
                    type="button"
                    variant={formData.isUrgent ? "default" : "outline"}
                    className={`flex-1 rounded-xl h-full border-gray-100 dark:border-gray-800 ${formData.isUrgent ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={() =>
                      setFormData({ ...formData, isUrgent: !formData.isUrgent })
                    }
                  >
                    {formData.isUrgent ? "إذن عاجل جداً" : "إذن عادي"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  ساعة الخروج
                </Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  ساعة العودة
                </Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right font-bold"
                />
              </div>

              <div className="col-span-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-black text-blue-600">
                    {calculateHours(formData.startTime, formData.endTime)}
                  </p>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    إجمالي الساعات
                  </p>
                </div>
                <Timer className="h-10 w-10 text-gray-200 dark:text-gray-800" />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  سبب الاستئذان
                </Label>
                <Textarea
                  placeholder="يرجى كتابة سبب طلب الإذن بالتفصيل..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="min-h-[100px] bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right resize-none rounded-2xl p-4"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-right block font-bold text-gray-700 dark:text-gray-300">
                  رابط المستندات الداعمة (اختياري)
                </Label>
                <Input
                  placeholder="رابط ملف (Google Drive, Dropbox, إلخ)"
                  value={formData.attachments}
                  onChange={(e) =>
                    setFormData({ ...formData, attachments: e.target.value })
                  }
                  className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-right rounded-2xl p-4"
                />
                <p className="text-[10px] text-gray-400 text-right pr-2">
                  يمكنك رفع ملفك والحصول على رابط مشاركة ووضعه هنا لتدعيم طلبك
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gray-50 dark:bg-gray-900/50 flex gap-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl text-gray-500"
              onClick={() => setShowAddDialog(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              className={`flex-1 h-12 rounded-xl shadow-xl transition-all ${submitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none font-bold"}`}
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري الإرسال...</span>
                </div>
              ) : (
                "إرسال الطلب الآن"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 p-0 overflow-hidden rounded-2xl shadow-2xl">
          {selectedRequest && (
            <>
              <div
                className={`p-6 text-white text-right relative overflow-hidden ${selectedRequest.status === "APPROVED"
                  ? "bg-green-600"
                  : selectedRequest.status === "REJECTED"
                    ? "bg-red-600"
                    : "bg-amber-600"
                  }`}
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                      {statusConfig[selectedRequest.status].label}
                    </Badge>
                    <DialogTitle className="text-2xl font-bold flex items-center justify-end gap-2">
                      تفاصيل طلب الإذن
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-4 justify-end">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {selectedRequest.employee.firstName}{" "}
                        {selectedRequest.employee.lastName}
                      </p>
                      <p className="text-blue-100 text-sm">
                        {selectedRequest.employee.employeeNumber} •{" "}
                        {selectedRequest.employee.department?.name}
                      </p>
                    </div>
                    <Avatar className="h-16 w-16 border-4 border-white/20 shadow-xl">
                      <AvatarImage src={selectedRequest.employee.avatar} />
                      <AvatarFallback className="bg-white/10 text-white text-xl">
                        {selectedRequest.employee.firstName[0]}
                        {selectedRequest.employee.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="absolute -left-10 -bottom-10 h-40 w-40 text-white opacity-10 rotate-12">
                  {React.createElement(
                    permissionTypeConfig[selectedRequest.type]?.icon || History,
                    { className: "h-full w-full" },
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6" dir="rtl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">تاريخ الطلب</p>
                    <p className="font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      {new Date(selectedRequest.date).toLocaleDateString(
                        "ar-EG",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">نوع الإذن</p>
                    <p className="font-bold flex items-center gap-2">
                      {React.createElement(
                        permissionTypeConfig[selectedRequest.type]?.icon ||
                        History,
                        { className: "h-4 w-4 text-purple-500" },
                      )}
                      {permissionTypeConfig[selectedRequest.type]?.label}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <Timer className="h-5 w-5 text-blue-600" />
                    <p className="font-bold text-blue-900 dark:text-blue-100">
                      فترة الاستئذان
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-8 py-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">وقت الخروج</p>
                      <p className="text-2xl font-black text-blue-600">
                        {selectedRequest.startTime}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 rotate-180" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">وقت العودة</p>
                      <p className="text-2xl font-black text-blue-600">
                        {selectedRequest.endTime}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium text-right">
                      إجمالي الساعات
                    </span>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {selectedRequest.totalHours} ساعة
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-right">
                    <Label className="text-gray-500 text-xs mb-2 block">
                      سبب الاستئذان
                    </Label>
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 font-medium leading-relaxed">
                      {selectedRequest.reason}
                    </div>
                  </div>

                  {selectedRequest.attachments && (
                    <div className="text-right">
                      <Label className="text-gray-500 text-xs mb-2 block">
                        المستندات المرفقة
                      </Label>
                      <a
                        href={selectedRequest.attachments}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        عرض الملف المرفق
                      </a>
                    </div>
                  )}

                  {selectedRequest.status === "REJECTED" &&
                    selectedRequest.rejectionReason && (
                      <div className="text-right">
                        <Label className="text-red-500 text-xs mb-2 block">
                          سبب الرفض
                        </Label>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 text-red-700 dark:text-red-400 font-bold">
                          {selectedRequest.rejectionReason}
                        </div>
                      </div>
                    )}

                  {selectedRequest.approvedBy && (
                    <div className="flex items-center justify-end gap-2 text-xs text-gray-500 mt-4">
                      <span>
                        تمت المراجعة بواسطة: {selectedRequest.approvedBy.firstName}{" "}
                        {selectedRequest.approvedBy.lastName}
                      </span>
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex gap-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  إغلاق
                </Button>
                {selectedRequest.status === "PENDING" && !isMyPermissions && (
                  <div className="flex gap-2 flex-[2]">
                    <Button
                      variant="destructive"
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        setShowRejectDialog(true);
                      }}
                    >
                      رفض
                    </Button>
                    <Button
                      className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 font-bold"
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        setShowDetailsDialog(false);
                      }}
                    >
                      موافقة
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl bg-white dark:bg-gray-950">
          <DialogHeader className="text-right">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-center font-bold text-xl">
              رفض طلب الإذن
            </DialogTitle>
            <DialogDescription className="text-center">
              يرجى كتابة سبب الرفض لإخطار الموظف
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="اكتب سبب الرفض هنا..."
              className="text-right h-32 rounded-xl bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-3 mt-4">
            <Button
              variant="destructive"
              className="flex-1 h-11 rounded-xl"
              onClick={handleReject}
            >
              تأكيد الرفض
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => setShowRejectDialog(false)}
            >
              تراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl bg-white dark:bg-gray-950">
          <DialogHeader className="text-right">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-center font-bold text-xl">
              حذف طلب الإذن
            </DialogTitle>
            <DialogDescription className="text-center">
              هل أنت متأكد من رغبتك في حذف هذا الطلب؟ لا يمكن التراجع عن هذه العملية بعد إتمامها.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-3 mt-4">
            <Button
              variant="destructive"
              className="flex-1 h-11 rounded-xl font-bold"
              onClick={confirmDelete}
              disabled={submitting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الحذف...</span>
                </div>
              ) : (
                "تأكيد الحذف النهائي"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedRequest(null);
              }}
              disabled={submitting}
            >
              إلغاء التراجع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Permissions;
