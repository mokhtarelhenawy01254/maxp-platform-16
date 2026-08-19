import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, AlertTriangle, BarChart, BarChart3, Building, Building2, Calendar, ChevronRight, Clock, DollarSign, PieChart, TrendingUp, UserCheck, Users, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Progress } from "../../components/ui/progress";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuthSimple";
import { createStorageKey, getWithExpiry, setWithExpiry } from "../../utils/storage";

interface DashboardMetricGroupItem {
  name?: string;
  label?: string;
  value?: number;
  count?: number;
  type?: string;
  status?: string;
}

interface DashboardEmployee {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  department?: {
    name?: string;
  };
  position?: {
    title?: string;
  };
  hireDate?: string;
}

interface AttendanceRecord {
  employee?: DashboardEmployee;
  checkIn?: string;
  status?: string;
}

interface LeaveRequest {
  id: string;
  type?: string;
  totalDays?: number;
  employee?: DashboardEmployee;
}

interface PermissionRequest {
  id: string;
  type?: string;
  duration?: number;
  employee?: DashboardEmployee;
}

interface AdvanceRequest {
  id: string;
  amount?: number;
  createdAt?: string;
  employee?: DashboardEmployee;
}

interface DepartmentOverview {
  id: string;
  name?: string;
  color?: string;
  employeeCount?: number;
}

interface WarningSeveritySummary {
  severity: string;
  _count: number;
}

interface DashboardData {
  employees: {
    totalEmployees: number;
    activeEmployees: number;
    byDepartment: DashboardMetricGroupItem[];
    byContractType: DashboardMetricGroupItem[];
    byStatus: DashboardMetricGroupItem[];
    recentHires: DashboardEmployee[];
    upcomingBirthdays: DashboardEmployee[];
  };
  attendance: {
    date: string;
    totalEmployees: number;
    present: number;
    late: number;
    absent: number;
    records: AttendanceRecord[];
  };
  pendingLeaves: LeaveRequest[];
  departments: {
    totalDepartments: number;
    departments: DepartmentOverview[];
  };
  pendingPermissions: PermissionRequest[];
  pendingAdvances: AdvanceRequest[];
  recruitment: {
    activeJobs: number;
    totalApplicants: number;
    scheduledInterviews: number;
    pendingReviews: number;
    hiredThisMonth: number;
  };
  warnings: {
    total: number;
    bySeverity: WarningSeveritySummary[];
    acknowledged: number;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    isRecord(error) &&
    "response" in error &&
    isRecord(error.response) &&
    "data" in error.response &&
    isRecord(error.response.data)
  ) {
    if (typeof error.response.data.message === "string") {
      return error.response.data.message;
    }

    if (typeof error.response.data.error === "string") {
      return error.response.data.error;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

const HRDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const CACHE_TTL_MS = 60_000;

  const cacheKey = useMemo(() => {
    const authCompanyId = user?.companyId || user?.company?.id;
    if (authCompanyId) {
      return createStorageKey("hr-dashboard", authCompanyId);
    }

    try {
      const rawUser = localStorage.getItem("user");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const companyId = parsedUser?.companyId || parsedUser?.company?.id || parsedUser?.id || "unknown";
      return createStorageKey("hr-dashboard", companyId);
    } catch {
      return createStorageKey("hr-dashboard", "unknown");
    }
  }, [user?.company?.id, user?.companyId]);

  const fetchDashboard = useCallback(async ({ signal, background = false } = {}) => {
    try {
      if (!background) {
        setLoading(true);
        setError(null);
      }
      const response = await api.get("/hr/dashboard", { signal });
      if (response.data?.dashboard) {
        setData(response.data.dashboard);
        setWithExpiry(cacheKey, response.data.dashboard, CACHE_TTL_MS);
      } else if (!background) {
        setError(t("hrDashboard.errors.fetchFailed") || "فشل تحميل لوحة التحكم");
      }
    } catch (error) {
      console.error("Error fetching HR dashboard:", error);
      if (!background) {
        setError(t("hrDashboard.errors.fetchFailed") || "فشل تحميل لوحة التحكم");
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [cacheKey, t]);

  useEffect(() => {
    const controller = new AbortController();
    const cached = getWithExpiry<DashboardData>(cacheKey);

    if (cached) {
      setData(cached);
      setLoading(false);
      fetchDashboard({ signal: controller.signal, background: true });
    } else {
      fetchDashboard({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cacheKey, fetchDashboard]);

  const handleLeaveAction = async (id: string, action: "approve" | "reject") => {
    try {
      const response = await api.post(`/hr/leaves/${id}/${action}`, {
        reason: action === "reject" ? "Action from dashboard" : undefined,
      });
      if (response.data.success) {
        toast.success(
          action === "approve" ? "تمت الموافقة بنجاح" : "تم الرفض بنجاح",
        );
        fetchDashboard({ background: true });
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "حدث خطأ"));
    }
  };

  const handlePermissionAction = async (
    id: string,
    action: "approve" | "reject",
  ) => {
    try {
      const response = await api.post(`/hr/permissions/${id}/${action}`, {
        reason: action === "reject" ? "رفض من لوحة التحكم" : undefined,
      });
      if (response.data.success) {
        toast.success(
          action === "approve" ? "تمت الموافقة بنجاح" : "تم الرفض بنجاح",
        );
        fetchDashboard({ background: true });
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "حدث خطأ"));
    }
  };

  const handleAdvanceAction = async (
    id: string,
    action: "approve" | "reject",
  ) => {
    try {
      const response = await api.post(`/hr/advances/${id}/${action}`, {
        rejectionReason: action === "reject" ? "Action from dashboard" : undefined,
      });
      if (response.data.success) {
        toast.success(
          action === "approve" ? "تمت الموافقة بنجاح" : "تم الرفض بنجاح",
        );
        fetchDashboard({ background: true });
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "حدث خطأ"));
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        {error}
      </div>
    );
  }

  const attendanceRate = data?.attendance
    ? Math.round(
      (data.attendance.present / data.attendance.totalEmployees) * 100,
    )
    : 0;

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 shadow-lg mb-8">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="text-white">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t("hrDashboard.pageTitle")}
            </h1>
            <p className="text-blue-100 mt-2 text-lg opacity-90 max-w-2xl">
              {t("hrDashboard.overview")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate("/hr/employees")}
              variant="secondary"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md"
            >
              <Users className="h-5 w-5 ml-2" />
              {t("hrDashboard.manageEmployees")}
            </Button>
            <Button
              onClick={() => navigate("/hr/attendance")}
              className="bg-white text-blue-700 hover:bg-blue-50 transition-all duration-300 shadow-md"
            >
              <Clock className="h-5 w-5 ml-2" />
              {t("hrDashboard.attendance")}
            </Button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: t("hrDashboard.totalEmployees"),
            value: data?.employees.totalEmployees || 0,
            icon: Users,
            color: "blue",
            gradient: "from-blue-500 to-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/10",
          },
          {
            label: t("hrDashboard.todaysAttendance"),
            value: data?.attendance.present || 0,
            icon: UserCheck,
            color: "green",
            gradient: "from-emerald-500 to-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/10",
          },
          {
            label: t("hrDashboard.pendingLeaves"),
            value: data?.pendingLeaves?.length || 0,
            icon: AlertCircle,
            color: "orange",
            gradient: "from-orange-500 to-orange-600",
            bg: "bg-orange-50 dark:bg-orange-900/10",
          },
          {
            label: t("hrDashboard.totalDepartments"),
            value: data?.departments.totalDepartments || 0,
            icon: Building2,
            color: "purple",
            gradient: "from-purple-500 to-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/10",
          },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-bold text-gray-900 dark:text-white`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
              </div>
              <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${stat.gradient} opacity-20`}></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Overview */}
        <Card className="lg:col-span-2 border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              {t("hrDashboard.todaysAttendanceTitle")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/5 transition-colors gap-2"
              onClick={() => navigate("/hr/attendance")}
            >
              {t("hrDashboard.viewAll")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              <div className="relative group bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/20 p-6 rounded-2xl text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-1 leading-none">
                  {data?.attendance.present || 0}
                </p>
                <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-400/50">
                  {t("hrDashboard.present")}
                </p>
              </div>
              <div className="relative group bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/20 p-6 rounded-2xl text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/20 transition-colors">
                  <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-amber-700 dark:text-amber-400 mb-1 leading-none">
                  {data?.attendance.late || 0}
                </p>
                <p className="text-sm font-medium text-amber-600/70 dark:text-amber-400/50">
                  {t("hrDashboard.late")}
                </p>
              </div>
              <div className="relative group bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/20 p-6 rounded-2xl text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-rose-500/20 transition-colors">
                  <UserX className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-3xl font-bold text-rose-700 dark:text-rose-400 mb-1 leading-none">
                  {data?.attendance.absent || 0}
                </p>
                <p className="text-sm font-medium text-rose-600/70 dark:text-rose-400/50">
                  {t("hrDashboard.absent")}
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-gray-50/50 dark:bg-gray-900/20 p-5 rounded-2xl border border-gray-100 dark:border-gray-800/30">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-gray-600 dark:text-gray-400">{t("hrDashboard.attendanceRate")}</span>
                <span className="text-primary bg-primary/10 px-2 py-1 rounded-md">{attendanceRate}%</span>
              </div>
              <Progress value={attendanceRate} className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Recent Check-ins */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-base font-bold text-gray-800 dark:text-gray-200">
                  {t("hrDashboard.recentCheckins")}
                </h4>
                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800 mx-4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data?.attendance.records
                  ?.slice(0, 6)
                  .map((record: AttendanceRecord, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50 rounded-xl shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-800 shadow-sm transition-transform group-hover:scale-105">
                            <AvatarImage src={record.employee?.avatar} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {record.employee?.firstName?.[0]}
                              {record.employee?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${record.checkIn ? "bg-emerald-500" : "bg-gray-300"}`}></div>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {record.employee?.firstName}{" "}
                            {record.employee?.lastName}
                          </p>
                          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-tighter">
                            {record.employee?.department?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${record.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                            : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                            }`}
                        >
                          {record.checkIn
                            ? new Date(record.checkIn).toLocaleTimeString(
                              "ar-EG",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                            : "-"}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Leaves */}
        <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              {t("hrDashboard.leavesRequests")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors gap-2"
              onClick={() => navigate("/hr/leaves")}
            >
              {t("hrDashboard.viewAll")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {data?.pendingLeaves?.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-gray-400 opacity-50" />
                </div>
                <p className="text-gray-500 font-medium">{t("hrDashboard.noPendingRequests")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data?.pendingLeaves?.map((leave: LeaveRequest) => (
                  <div
                    key={leave.id}
                    className="group p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12 ring-2 ring-gray-50 dark:ring-gray-600">
                        <AvatarImage src={leave.employee?.avatar} />
                        <AvatarFallback className="bg-amber-50 text-amber-600 text-sm font-bold uppercase">
                          {leave.employee?.firstName?.[0]}
                          {leave.employee?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </p>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-tighter">
                          {leave.employee?.department?.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold gap-2 mb-4">
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-gray-700 dark:text-gray-300 uppercase tracking-wider">{leave.type}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-primary/5 text-primary px-3 py-1.5 rounded-lg">
                        <Clock className="h-3 w-3" />
                        <span>{leave.totalDays} {t("common.days") || "أيام"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLeaveAction(leave.id, "approve")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 shadow-sm shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
                      >
                        {t("hrDashboard.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLeaveAction(leave.id, "reject")}
                        className="flex-1 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold h-9 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95"
                      >
                        {t("hrDashboard.reject")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Center - Command Center Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Pending Permissions */}
        <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-blue-100/20 dark:border-blue-800/20 px-6 py-5">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-blue-900 dark:text-blue-100">
              <div className="p-2.5 bg-blue-500 shadow-lg shadow-blue-500/20 rounded-xl">
                <Clock className="h-5 w-5 text-white" />
              </div>
              {t("hrDashboard.pendingPermissions")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 transition-all rounded-lg"
              onClick={() => navigate("/hr/permissions")}
            >
              <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
              <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {!data?.pendingPermissions || data.pendingPermissions.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 transform rotate-12">
                  <Clock className="h-8 w-8 text-blue-200" />
                </div>
                <p className="text-gray-400 font-medium text-sm">{t("hrDashboard.noPendingPermissions")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.pendingPermissions.map((perm: PermissionRequest) => (
                  <div
                    key={perm.id}
                    className="group p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-50">
                          <AvatarImage src={perm.employee?.avatar} />
                          <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                            {perm.employee?.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{perm.employee?.firstName} {perm.employee?.lastName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{perm.type}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {perm.duration} {t("dashboard.minutes")}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePermissionAction(perm.id, "approve")}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-bold"
                      >
                        {t("hrDashboard.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePermissionAction(perm.id, "reject")}
                        className="flex-1 h-8 text-xs font-bold border-gray-200 dark:border-gray-600"
                      >
                        {t("hrDashboard.reject")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Advances */}
        <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-br from-white to-emerald-50/30 dark:from-gray-800 dark:to-emerald-900/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/20 dark:border-emerald-800/20 px-6 py-5">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-emerald-900 dark:text-emerald-100">
              <div className="p-2.5 bg-emerald-500 shadow-lg shadow-emerald-500/20 rounded-xl">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              {t("hrDashboard.pendingAdvances")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 transition-all rounded-lg"
              onClick={() => navigate("/hr/advances")}
            >
              <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
              <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {!data?.pendingAdvances || data.pendingAdvances.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4 transform -rotate-12">
                  <DollarSign className="h-8 w-8 text-emerald-200" />
                </div>
                <p className="text-gray-400 font-medium text-sm">{t("hrDashboard.noPendingAdvances")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.pendingAdvances.map((adv: AdvanceRequest) => (
                  <div
                    key={adv.id}
                    className="group p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-2 ring-gray-50">
                          <AvatarImage src={adv.employee?.avatar} />
                          <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold">
                            {adv.employee?.firstName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">{adv.employee?.firstName} {adv.employee?.lastName}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{adv.createdAt ? new Date(adv.createdAt).toLocaleDateString(i18n.language === 'ar' ? "ar-EG" : "en-US") : ""}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600">{adv.amount} {t("dashboard.egp")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceAction(adv.id, "approve")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-bold"
                      >
                        {t("hrDashboard.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvanceAction(adv.id, "reject")}
                        className="flex-1 h-8 text-xs font-bold border-gray-200 dark:border-gray-600"
                      >
                        {t("hrDashboard.reject")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warnings Overview */}
        <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-br from-white to-rose-50/30 dark:from-gray-800 dark:to-rose-900/10">
          <CardHeader className="flex flex-row items-center justify-between border-b border-rose-100/20 dark:border-rose-800/20 px-6 py-5">
            <CardTitle className="flex items-center gap-3 text-lg font-bold text-rose-900 dark:text-rose-100">
              <div className="p-2.5 bg-rose-500 shadow-lg shadow-rose-500/20 rounded-xl">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              {t("hrDashboard.warnings")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-100/50 transition-all rounded-lg"
              onClick={() => navigate("/hr/warnings")}
            >
              <span className="hidden sm:inline">{t("hrDashboard.viewAll")}</span>
              <ChevronRight className="h-4 w-4 ms-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-white/50 dark:bg-gray-900/40 rounded-3xl border border-rose-100/50 dark:border-rose-900/20 shadow-inner">
                <div>
                  <p className="text-4xl font-black text-rose-600 dark:text-rose-400">{data?.warnings?.total || 0}</p>
                  <p className="text-[10px] font-bold text-rose-500/60 uppercase tracking-tighter">{t("hrDashboard.totalWarnings")}</p>
                </div>
                <div className="h-14 w-14 bg-rose-500/10 rounded-2xl flex items-center justify-center transform -rotate-6">
                  <AlertCircle className="h-7 w-7 text-rose-500" />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t("hrDashboard.bySeverity")}</p>
                <div className="space-y-2">
                  {data?.warnings?.bySeverity?.map((sev: WarningSeveritySummary, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                        {t(`common.severity.${sev.severity.toLowerCase()}`) || sev.severity}
                      </span>
                      <Badge variant="outline" className="font-bold">{sev._count}</Badge>
                    </div>
                  ))}
                  {(!data?.warnings?.bySeverity || data.warnings.bySeverity.length === 0) && (
                    <p className="text-sm text-gray-500 italic">{t("hrDashboard.noWarningsRecord") || "لا توجد سجلات"}</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm font-bold mb-2">
                  <span className="text-gray-500">{t("hrDashboard.acknowledgmentRate") || "نسبة الاعتراف"}</span>
                  <span className="text-rose-600">
                    {data?.warnings?.total > 0
                      ? Math.round((data.warnings.acknowledged / data.warnings.total) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={data?.warnings?.total > 0 ? (data.warnings.acknowledged / data.warnings.total) * 100 : 0}
                  className="h-2 bg-gray-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recruitment Overview */}
      <Card className="border-none shadow-xl overflow-hidden bg-gradient-to-r from-purple-500/5 to-indigo-500/5 dark:from-purple-900/10 dark:to-indigo-900/10 border border-white/20 dark:border-white/5 backdrop-blur-xl mb-8">
        <CardHeader className="flex flex-row items-center justify-between border-b border-purple-100/20 dark:border-purple-800/20 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg font-bold text-purple-900 dark:text-purple-100">
            <div className="p-2.5 bg-purple-500 shadow-lg shadow-purple-500/20 rounded-xl">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            {t("hrDashboard.recruitmentOverview")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100/50 transition-all rounded-lg"
            onClick={() => navigate("/hr/recruitment")}
          >
            <span className="hidden sm:inline">{t("hrDashboard.manageRecruitment")}</span>
            <ChevronRight className="h-4 w-4 ms-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="group p-5 bg-white/50 dark:bg-gray-800/40 rounded-3xl border border-purple-100/50 dark:border-purple-900/20 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mb-1">{data?.recruitment?.activeJobs || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 group-hover:text-purple-600/70 uppercase tracking-widest transition-colors">{t("hrDashboard.activeJobs")}</p>
            </div>
            <div className="group p-5 bg-white/50 dark:bg-gray-800/40 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{data?.recruitment?.totalApplicants || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600/70 uppercase tracking-widest transition-colors">{t("hrDashboard.totalApplicants")}</p>
            </div>
            <div className="group p-5 bg-white/50 dark:bg-gray-800/40 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/20 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">{data?.recruitment?.scheduledInterviews || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600/70 uppercase tracking-widest transition-colors">{t("hrDashboard.interviews")}</p>
            </div>
            <div className="group p-5 bg-white/50 dark:bg-gray-800/40 rounded-3xl border border-amber-100/50 dark:border-amber-900/20 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mb-1">{data?.recruitment?.pendingReviews || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 group-hover:text-amber-600/70 uppercase tracking-widest transition-colors">{t("hrDashboard.pendingReviews")}</p>
            </div>
            <div className="group p-5 bg-white/50 dark:bg-gray-800/40 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/20 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">{data?.recruitment?.hiredThisMonth || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600/70 uppercase tracking-widest transition-colors">{t("hrDashboard.hiredThisMonth")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        {/* Recent Hires */}
        <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              {t("hrDashboard.recentHires")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors gap-2"
              onClick={() => navigate("/hr/employees")}
            >
              {t("hrDashboard.viewAll")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {data?.employees.recentHires?.map((employee: DashboardEmployee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/50 rounded-2xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-700 shadow-sm">
                      <AvatarImage src={employee.avatar} />
                      <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold uppercase">
                        {employee.firstName?.[0]}
                        {employee.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-tighter">
                        {employee.position?.title}
                      </p>
                    </div>
                  </div>
                  <div className="text-left bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      {new Date(employee.hireDate).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Departments Overview */}
        <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              {t("hrDashboard.departments")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors gap-2"
              onClick={() => navigate("/hr/departments")}
            >
              {t("hrDashboard.viewAll")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.departments.departments?.map((dept: DepartmentOverview) => (
                <div
                  key={dept.id}
                  className="flex flex-col p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-lg transition-all group overflow-hidden relative"
                >
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div
                      className="w-1.5 h-6 rounded-full"
                      style={{ backgroundColor: dept.color || "#3B82F6" }}
                    />
                    <span className="font-bold text-gray-900 dark:text-white truncate">{dept.name}</span>
                  </div>
                  <div className="flex items-end justify-between relative z-10">
                    <div className="flex flex-row items-baseline gap-1">
                      <p className="text-3xl font-black text-gray-900 dark:text-white">{dept.employeeCount}</p>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t("hrDashboard.employeesCount")}
                      </p>
                    </div>
                  </div>
                  {/* Subtle background decoration */}
                  <div
                    className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
                    style={{ backgroundColor: dept.color || "#3B82F6" }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-md overflow-hidden bg-white dark:bg-gray-800/50 backdrop-blur-sm mt-8">
        <CardHeader className="border-b bg-gray-50/50 dark:bg-gray-900/20 px-6 py-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            {t("hrDashboard.quickActions")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: t("hrDashboard.employees"), icon: Users, path: "/hr/employees", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              { label: t("hrDashboard.rewards") || "المكافآت", icon: DollarSign, path: "/hr/rewards", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
              { label: t("hrDashboard.departments"), icon: Building2, path: "/hr/departments", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
              { label: t("hrDashboard.attendanceLabel"), icon: Clock, path: "/hr/attendance", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
              { label: t("hrDashboard.leaves"), icon: Calendar, path: "/hr/leaves", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" },
              { label: t("hrDashboard.payroll"), icon: DollarSign, path: "/hr/payroll", color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
              { label: t("hrDashboard.reports"), icon: BarChart3, path: "/hr/reports", color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" },
            ].map((action, i) => (
              <Button
                key={i}
                variant="outline"
                className={`h-auto aspect-square flex-col gap-3 border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-4 ${action.bg}`}
                onClick={() => navigate(action.path)}
              >
                <div className={`p-3 rounded-2xl bg-white dark:bg-gray-800 shadow-sm ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 tracking-tight">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRDashboard;
