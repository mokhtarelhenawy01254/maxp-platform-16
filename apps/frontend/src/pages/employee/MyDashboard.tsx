import { useTranslation } from 'react-i18next';
/**
 * 🏠 My Dashboard - Employee Dashboard
 * لوحة التحكم الشخصية للموظف
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, Calendar, DollarSign, File, TrendingUp, AlertTriangle, Check, Users, Award, Target, CreditCard, Folder, ChevronRight, Plus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import api from "../../services/api";
import { createStorageKey, getWithExpiry, setWithExpiry } from "../../utils/storage";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  employeeNumber: string;
  department: { name: string; color: string } | null;
  position: { title: string } | null;
  hireDate: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
}

interface TodayAttendance {
  checkIn: string | null;
  checkOut: string | null;
  status: string;
}

interface RecentLeave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
}

interface PermissionRequest {
  id: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reason: string;
}

interface Warning {
  id: string;
  type?: string;
  severity?: string;
  title?: string;
  description?: string;
  status?: string;
  incidentDate?: string;
  createdAt?: string;
}

interface AdvanceRequest {
  id: string;
  amount: number;
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  repaymentType: string;
  installmentsCount: number;
  remainingBalance: number;
}

interface Reward {
  id: string;
  rewardName: string;
  calculatedValue: number;
  rewardCategory: string;
  status: string;
  appliedAt: string;
  createdAt: string;
}

interface LastPayroll {
  id: string;
  month: number;
  year: number;
  netSalary: number;
  status: string;
  totalAllowances: number;
  totalDeductions: number;
}

interface DashboardCachePayload {
  employee: EmployeeInfo | null;
  todayAttendance: TodayAttendance | null;
  recentLeaves: RecentLeave[];
  permissions: PermissionRequest[];
  advances: AdvanceRequest[];
  warnings: Warning[];
  rewards: Reward[];
  lastPayroll: LastPayroll | null;
}



const DASHBOARD_CACHE_TTL_MS = 60 * 1000;

const MyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const activeApps: string[] = (user as any)?.company?.activeApps ?? [];
  const hasHrBasic = activeApps.some((a) => a.toLowerCase() === "hr-basic");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [recentLeaves, setRecentLeaves] = useState<RecentLeave[]>([]);
  const [permissions, setPermissions] = useState<PermissionRequest[]>([]);
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [lastPayroll, setLastPayroll] = useState<LastPayroll | null>(null);

  const cacheKey = useMemo(
    () => createStorageKey("dashboard", `employee:${user?.id || "anon"}`),
    [user?.id],
  );

  const applyDashboardPayload = useCallback((payload: DashboardCachePayload) => {
    if (!payload) return;
    setEmployee(payload.employee ?? null);
    setTodayAttendance(payload.todayAttendance ?? null);
    setRecentLeaves(payload.recentLeaves ?? []);
    setPermissions(payload.permissions ?? []);
    setAdvances(payload.advances ?? []);
    setWarnings(payload.warnings ?? []);
    setRewards(payload.rewards ?? []);
    setLastPayroll(payload.lastPayroll ?? null);
  }, []);

  const fetchDashboardData = useCallback(
    async ({ signal, background = false } = {}) => {
      if (!background) {
        setLoading(true);
      }

      try {
        const [empRes, attRes, leavesRes, permissionsRes, advancesRes, warningsRes, rewardsRes, payrollRes] = await Promise.all([
          api.get("/hr/employees/me", { signal }),
          api.get("/hr/attendance/my-today", { signal }),
          api.get("/hr/leaves/my-recent", { params: { limit: 5 }, signal }),
          api.get("/hr/permissions", { params: { mine: true, limit: 5 }, signal }),
          api.get("/hr/advances/my", { params: { limit: 5 }, signal }),
          api.get("/hr/warnings/my-history", { params: { limit: 5 }, signal }),
          api.get("/hr/rewards/my-rewards", { params: { limit: 5 }, signal }),
          api.get("/hr/payroll/my-last", { signal }),
        ]);

        const payload: DashboardCachePayload = {
          employee: empRes.data.employee,
          todayAttendance: attRes.data.attendance,
          recentLeaves: leavesRes.data.leaves || [],
          permissions: permissionsRes.data.requests || [],
          advances: advancesRes.data.data || [],
          warnings: warningsRes.data.warnings || [],
          rewards: rewardsRes.data.data || [],
          lastPayroll: payrollRes.data.payroll,
        };

        applyDashboardPayload(payload);
        setWithExpiry(cacheKey, payload, DASHBOARD_CACHE_TTL_MS);
      } catch (error: any) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error fetching dashboard data:", error);
        if (!background) {
          toast.error("حدث خطأ أثناء جلب البيانات");
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [applyDashboardPayload, cacheKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cached = getWithExpiry<DashboardCachePayload>(cacheKey);

    if (cached) {
      applyDashboardPayload(cached);
      setLoading(false);
      fetchDashboardData({ signal: controller.signal, background: true });
    } else {
      fetchDashboardData({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cacheKey, fetchDashboardData, applyDashboardPayload]);

  if (!hasHrBasic) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <Briefcase className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">لم يتم تفعيل نظام HR</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">هذه الصفحة خاصة بموظفي الشركة. يرجى تثبيت تطبيق HR Basic من متجر التطبيقات للوصول إلى لوحة تحكم الموظف.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center bg-[#f8faff] dark:bg-gray-950" dir="rtl">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
          </div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center bg-[#f8faff] dark:bg-gray-950" dir="rtl">
        <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">عذراً، لم يتم العثور على بيانات الموظف</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">يرجى الاتصال بإدارة الموارد البشرية للتأكد من ربط حسابك.</p>
          <Button onClick={() => window.location.reload()} variant="outline">إعادة المحاولة</Button>
        </div>
      </div>
    );
  }

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = todayAttendance?.checkIn && !todayAttendance?.checkOut;

  const pendingRequestsCount = [
    ...recentLeaves.filter(l => l.status === "PENDING"),
    ...permissions.filter(p => p.status === "PENDING"),
    ...advances.filter(a => a.status === "PENDING")
  ].length;

  return (
    <div className="p-4 md:p-8 space-y-8 bg-[#f8faff] dark:bg-gray-950 font-inter" dir="rtl">
      {/* Header with Welcome & Quick Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-gray-800 shadow-xl border-2 border-primary/20">
              <AvatarImage src={employee.avatar} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                {employee.firstName?.[0]}
                {employee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 border-4 border-[#f8faff] dark:border-gray-950 rounded-full shadow-lg"></div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                مرحباً، {employee.firstName}
              </h1>
              
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
              <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-sm">
                {employee.position?.title || "موظف"}
              </span>
              <span>•</span>
              <span className="text-gray-400 dark:text-gray-500">
                {employee.department?.name || "بدون قسم"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-gray-900 px-5 py-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center min-w-[120px]">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">رقم الموظف</span>
            <span className="text-lg font-black text-primary">{employee.employeeNumber}</span>
          </div>
          <Button
            variant="outline"
            className="rounded-2xl h-14 px-6 border-gray-200 hover:border-primary hover:text-primary transition-all duration-300"
            onClick={() => navigate("/profile")}
          >
            <Users className="ml-2 h-5 w-5" />
            الملف الشخصي
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Card */}
        <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden relative group cursor-pointer" onClick={() => navigate("/my-attendance")}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Clock className="h-24 w-24" />
          </div>
          <CardContent className="p-6 relative">
            <p className="text-blue-100 text-sm font-bold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" /> الحضور اليوم
            </p>
            <div className="flex flex-col">
              {todayAttendance?.checkIn ? (
                <>
                  <span className="text-3xl font-black mb-1">
                    {new Date(todayAttendance.checkIn).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-xs text-blue-100 font-medium">سجلت الحضور بنجاح</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-black mb-1 text-blue-200 opacity-60">--:--</span>
                  <span className="text-xs text-blue-100 font-medium">لم يتم تسجيل الحضور اليوم</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance Card */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group cursor-pointer" onClick={() => navigate("/my-leaves")}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100">رصيد سنوي</Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">رصيد الإجازات</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">{employee.annualLeaveBalance}</span>
              <span className="text-sm text-gray-400 font-bold">يوم</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Info Card */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group cursor-pointer" onClick={() => navigate("/my-payroll")}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100">{lastPayroll ? format(new Date(lastPayroll.year, lastPayroll.month - 1), "MMMM", { locale: ar }) : "--"}</Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">آخر مرتب صافي</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {lastPayroll ? lastPayroll.netSalary.toLocaleString() : "0"}
              </span>
              <span className="text-sm text-gray-400 font-bold">ج.م</span>
            </div>
          </CardContent>
        </Card>

        {/* Tenure Card */}
        <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden relative group cursor-pointer">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-lg text-[10px] font-bold text-gray-400 border-gray-100">مسيرة العمل</Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mb-1">مدة الخدمة</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {Math.max(0, Math.floor((new Date().getTime() - new Date(employee.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365)))}
              </span>
              <span className="text-sm text-gray-400 font-bold">سنة</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-8 lg:grid-cols-3">

        {/* Left Column: Quick Actions & Pending Requests */}
        <div className="space-y-6 lg:col-span-1">

          {/* Action Center */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                الإجراءات السريعة
              </CardTitle>
              <CardDescription>اطلب ما تحتاجه بضغطة واحدة</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                variant="outline"
                className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-primary/50 hover:bg-primary/5 shadow-sm transition-all group"
                onClick={() => navigate("/my-attendance")}
              >
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl ml-3 group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">{canCheckIn ? "تسجيل حضور" : "تسجيل انصراف"}</p>
                  <p className="text-[10px] text-gray-400">تحقق من الدوام اليومي</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-green-500/50 hover:bg-green-50/50 shadow-sm transition-all group"
                onClick={() => navigate("/my-leaves", { state: { createNew: true } })}
              >
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-xl ml-3 group-hover:bg-green-100 group-hover:scale-110 transition-all">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">طلب إجازة</p>
                  <p className="text-[10px] text-gray-400">سنوية، مرضية، أو اضطرارية</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-yellow-500/50 hover:bg-yellow-50/50 shadow-sm transition-all group"
                onClick={() => navigate("/my-permissions", { state: { createNew: true } })}
              >
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl ml-3 group-hover:bg-yellow-100 group-hover:scale-110 transition-all">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">طلب إذن</p>
                  <p className="text-[10px] text-gray-400">خروج مبكر أو تأخير بعذر</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-14 rounded-2xl bg-white dark:bg-gray-900 border-gray-100 hover:border-purple-500/50 hover:bg-purple-50/50 shadow-sm transition-all group"
                onClick={() => navigate("/my-advances", { state: { createNew: true } })}
              >
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl ml-3 group-hover:bg-purple-100 group-hover:scale-110 transition-all">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-gray-900 dark:text-gray-100">طلب سلفة</p>
                  <p className="text-[10px] text-gray-400">تمويل شخصي ميسر</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 -mr-4 group-hover:mr-0 transition-all" />
              </Button>
            </CardContent>
          </Card>

          {/* Pending Requests Summary */}
          {pendingRequestsCount > 0 && (
            <Card className="border-none shadow-md bg-white dark:bg-gray-900 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 w-full bg-yellow-400"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>طلبات قيد المراجعة</span>
                  <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none rounded-full">{pendingRequestsCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">لديك {pendingRequestsCount} طلبات تنتظر الموافقة من المدير المباشر.</p>
                <div className="flex -space-x-reverse space-x-2">
                  {recentLeaves.filter(l => l.status === "PENDING").map(l => (
                    <div key={l.id} title="طلب إجازة" className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 border border-green-100 dark:border-green-800">
                      <Calendar className="h-4 w-4" />
                    </div>
                  ))}
                  {permissions.filter(p => p.status === "PENDING").map(p => (
                    <div key={p.id} title="طلب إذن" className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600 border border-yellow-100 dark:border-yellow-800">
                      <FileText className="h-4 w-4" />
                    </div>
                  ))}
                  {advances.filter(a => a.status === "PENDING").map(a => (
                    <div key={a.id} title="طلب سلفة" className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 border border-purple-100 dark:border-purple-800">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings Alert */}
          {warnings.length > 0 && warnings.some(w => w.status === "ISSUED" || !w.status) && (
            <Card className="border-none shadow-md bg-red-50 dark:bg-red-900/10 border-r-4 border-r-red-500">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-bold text-red-900 dark:text-red-400 text-sm">تنبيه إداري</p>
                  <p className="text-xs text-red-700 dark:text-red-500/80 mb-2">لديك سجل إنذارات يحتاج إلى مراجعة وتوقيع.</p>
                  <Button variant="link" size="sm" className="p-0 h-auto text-red-600 font-bold" onClick={() => navigate("/my-warnings")}>عرض الإنذارات</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Detailed Tabs Activity */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="activity" className="w-full" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm">
              <TabsList className="bg-transparent gap-2 h-auto p-0">
                <TabsTrigger
                  value="activity"
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
                >
                  النشاط الأخير
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
                >
                  الطلبات
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all font-bold"
                >
                  {t("sidebar.rewards.title")}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Recent Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <Card className="border-none shadow-sm dark:bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Combine important movements */}
                    {[
                      ...recentLeaves.slice(0, 2).map(l => ({ ...l, category: 'LEAVE', icon: Calendar, color: 'green', title: `طلب إجازة ${l.type}`, date: l.createdAt || l.startDate })),
                      ...permissions.slice(0, 2).map(p => ({ ...p, category: 'PERMISSION', icon: FileText, color: 'yellow', title: `طلب إذن ${p.type === 'OUT' ? 'خروج' : 'تأخير'}`, date: p.createdAt || p.date })),
                      ...advances.slice(0, 2).map(a => ({ ...a, category: 'ADVANCE', icon: DollarSign, color: 'blue', title: 'طلب سلفة', date: a.createdAt })),
                      ...rewards.slice(0, 2).map(r => ({ ...r, category: 'REWARD', icon: Award, color: 'purple', title: r.rewardName || 'مكافأة إضافية', date: r.appliedAt || r.createdAt })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((item, idx) => (
                        <div key={`${item.category}-${item.date}-${idx}`} className="flex gap-4 relative">
                          {idx !== 4 && <div className="absolute top-10 bottom-0 right-[22px] w-[2px] bg-gray-100 dark:bg-gray-800"></div>}
                          <div className={["h-11 w-11 rounded-full flex items-center justify-center shrink-0", item.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800' : item.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800' : item.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800'].join(' ')}>
                            <item.icon className={["h-5 w-5", item.color === 'green' ? 'text-green-600 dark:text-green-400' : item.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : item.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'].join(' ')} />
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-gray-900 dark:text-gray-100">
                                {item.title}
                              </h4>
                              <span className="text-[10px] font-bold text-gray-400">
                                {format(new Date(item.date), "d MMMM yyyy", { locale: ar })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={
                                item.status === "APPROVED" || item.status === "COMPLETED" ? "bg-green-100/50 text-green-700 border-none" :
                                  item.status === "PENDING" ? "bg-yellow-100/50 text-yellow-700 border-none" :
                                    item.status === "REJECTED" ? "bg-red-100/50 text-red-700 border-none" :
                                      "bg-blue-100/50 text-blue-700 border-none"
                              }>
                                {(item.status === "APPROVED" || item.status === "COMPLETED") ? "مكتمل" : item.status === "PENDING" ? "تحت المراجعة" : item.status === "REJECTED" ? "مرفوض" : "نشط"}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {item.category === 'LEAVE' ? `${item.totalDays} أيام` :
                                  item.category === 'REWARD' ? `القيمة: ${item.calculatedValue} ج.م` :
                                    item.category === 'ADVANCE' ? `القيمة: ${item.amount} ج.م` :
                                      `${item.startTime} - ${item.endTime}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {recentLeaves.length === 0 && permissions.length === 0 && rewards.length === 0 && (
                      <div className="text-center py-12">
                        <div className="bg-gray-50 dark:bg-gray-800/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-medium">لا يوجد نشاط مسجل مؤخراً</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="mt-0">
              <div className="grid gap-6">
                {/* Permissions List */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md font-bold">الأذونات (آخر 5)</CardTitle>
                    <Button variant="link" size="sm" onClick={() => navigate("/my-permissions")}>عرض الكل</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {permissions.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center">
                              <FileText className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-gray-100">{p.type === 'OUT' ? 'إذن خروج' : 'إذن تأخير'}</p>
                              <p className="text-xs text-gray-400">{format(new Date(p.date), "dd/MM/yyyy")} • {p.startTime} - {p.endTime}</p>
                            </div>
                          </div>
                          <Badge className={p.status === 'APPROVED' ? 'bg-green-500' : p.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'}>
                            {p.status === 'APPROVED' ? 'مقبول' : p.status === 'PENDING' ? 'انتظار' : 'مرفوض'}
                          </Badge>
                        </div>
                      ))}
                      {permissions.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">لا توجد طلبات أذونات</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Leaves List (Brief) */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md font-bold">الإجازات الأخيرة</CardTitle>
                    <Button variant="link" size="sm" onClick={() => navigate("/my-leaves")}>عرض الكل</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentLeaves.map(l => (
                        <div key={l.id} className="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border border-gray-50 dark:border-gray-800 shadow-sm rounded-xl">
                          <div className="h-10 w-10 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <p className="font-bold text-sm">{l.type}</p>
                              <span className="text-[10px] text-gray-400">{l.totalDays} يوم</span>
                            </div>
                            <p className="text-[10px] text-gray-400">{format(new Date(l.startDate), "dd/MM")} - {format(new Date(l.endDate), "dd/MM")}</p>
                          </div>
                          <Badge variant="outline" className={l.status === 'APPROVED' ? 'text-green-600 border-green-200' : 'text-yellow-600 border-yellow-200'}>
                            {l.status === 'APPROVED' ? 'مقبول' : 'انتظار'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="mt-0">
              <div className="grid gap-6">
                {/* Latest Rewards */}
                <Card className="border-none shadow-sm bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/5">
                  <CardHeader>
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-600" />
                      {t("sidebar.rewards.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rewards.slice(0, 3).map(r => (
                        <div key={r.id} className="flex items-center justify-between p-4 bg-white/80 dark:bg-gray-900/40 rounded-2xl shadow-sm border border-purple-100 dark:border-purple-900/20">
                          <div>
                            <p className="font-bold text-gray-900 dark:text-gray-100">{r.rewardName}</p>
                            <p className="text-xs text-gray-400">{format(new Date(r.appliedAt || r.createdAt), "dd MMMM yyyy", { locale: ar })}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-black text-purple-600">+{r.calculatedValue} <span className="text-xs">ج.م</span></p>
                            <Badge className="bg-purple-100 text-purple-700 border-none rounded-full text-[10px]">{r.rewardCategory || "مكافأة أداء"}</Badge>
                          </div>
                        </div>
                      ))}
                      {rewards.length === 0 && (
                        <div className="text-center py-6 text-gray-400">
                          <Award className="h-10 w-10 mx-auto opacity-20 mb-2" />
                          <p className="text-sm">اجتهد لتحصل على مكافأتك الأولى!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Advances */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-md font-bold flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      السلف النشطة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {advances.filter(a => a.status === 'APPROVED' && a.remainingBalance > 0).map(a => (
                        <div key={a.id} className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-tight">إجمالي السلفة</p>
                              <p className="text-xl font-black text-gray-900 dark:text-gray-100">{a.amount.toLocaleString()} ج.م</p>
                            </div>
                            <Badge className="bg-green-100 text-green-700 border-none">نشط</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-gray-400">المبلغ المتبقي</span>
                              <span className="text-primary">{a.remainingBalance.toLocaleString()} ج.م</span>
                            </div>
                            <Progress value={((a.amount - a.remainingBalance) / a.amount) * 100} className="h-2 bg-gray-200" />
                            <p className="text-[10px] text-gray-400 text-left mt-2">نظام التقسيط: {a.installmentsCount} أشهر</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Advances History (Brief) */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-md font-bold text-gray-900 dark:text-gray-100">آخر طلبات السلف</CardTitle>
                    <Button variant="link" size="sm" onClick={() => navigate("/my-advances")}>عرض الكل</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {advances.slice(0, 3).map(a => (
                        <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-gray-100">{a.amount.toLocaleString()} ج.م</p>
                              <p className="text-xs text-gray-400">{format(new Date(a.createdAt), "dd/MM/yyyy")}</p>
                            </div>
                          </div>
                          <Badge className={a.status === 'APPROVED' ? 'bg-green-500' : a.status === 'PENDING' ? 'bg-yellow-500' : 'bg-red-500'}>
                            {a.status === 'APPROVED' ? 'مقبول' : a.status === 'PENDING' ? 'انتظار' : 'مرفوض'}
                          </Badge>
                        </div>
                      ))}
                      {advances.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">لا توجد طلبات سلف</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Corporate Culture Section (Placeholder for "WOW" - e.g. Goals or Values) */}
      <Card className="border-none shadow-md bg-white dark:bg-gray-900 border-t-4 border-primary">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            أهدافك وتطورك
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  <Target className="h-5 w-5" />
                </div>
                <h5 className="font-bold text-gray-900 dark:text-gray-100">تحسين الأداء</h5>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">التركيز على سرعة إنجاز المهام المسندة ورفع الجودة بنسبة 15% خلال هذا الربع.</p>
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-600 mb-1">
                <span>معدل الإنجاز</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-1.5 bg-blue-100 dark:bg-blue-900/30" />
            </div>

            <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-900/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                  <Award className="h-5 w-5" />
                </div>
                <h5 className="font-bold text-gray-900 dark:text-gray-100">التدريب المهني</h5>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">إكمال دورة "الإدارة الفعالة للوقت" المتاحة في منصة التعليم الداخلية.</p>
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-600 mb-1">
                <span>معدل الإنجاز</span>
                <span>40%</span>
              </div>
              <Progress value={40} className="h-1.5 bg-purple-100 dark:bg-purple-900/30" />
            </div>

            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center">
              <Plus className="h-8 w-8 text-gray-300 mb-2 cursor-pointer hover:text-primary transition-colors" />
              <p className="text-xs text-gray-400 font-medium">أضف هدفاً شخصياً جديداً</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support & Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-8 border-t border-gray-100 dark:border-gray-900">
        <p className="text-sm text-gray-400">نظام MaxP لإدارة الموارد البشرية © 2026</p>
        <div className="flex items-center gap-6">
          <Button variant="link" className="text-sm text-gray-400 hover:text-primary p-0 h-auto">مركز المساعدة</Button>
          <Button variant="link" className="text-sm text-gray-400 hover:text-primary p-0 h-auto">سياسة الشركة</Button>
          <Button variant="link" className="text-sm text-gray-400 hover:text-primary p-0 h-auto">الإبلاغ عن مشكلة</Button>
        </div>
      </div>
    </div>
  );
};

export default MyDashboard;









