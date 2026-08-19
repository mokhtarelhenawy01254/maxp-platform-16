import React, { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Award, Calendar, Check, CheckCircle, Clock, DollarSign, Download, File, FileText, RefreshCw, Target, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import api from "../../../services/api";
import { toast } from "sonner";

interface EmployeeReportData {
  employee: {
    id: string;
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
  };
  attendance: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalLateMinutes: number;
    totalWorkHours: number;
    overtimeHours: number;
    records: {
      date: string;
      checkIn: string | null;
      checkOut: string | null;
      status: string;
      workHours: number;
      lateMinutes: number;
    }[];
  };
  leaves: {
    totalRequests: number;
    approved: number;
    pending: number;
    rejected: number;
    totalDaysTaken: number;
    requests: {
      id: string;
      type: string;
      startDate: string;
      endDate: string;
      days: number;
      status: string;
      reason: string;
    }[];
  };
  advances: {
    totalRequests: number;
    totalAmount: number;
    pending: number;
    approved: number;
    requests: {
      id: string;
      amount: number;
      requestDate: string;
      status: string;
      reason: string;
    }[];
  };
  permissions: {
    totalRequests: number;
    approved: number;
    totalHours: number;
    requests: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      totalHours: number;
      status: string;
      reason: string;
    }[];
  };
  payroll: {
    baseSalary: number;
    allowances: number;
    deductions: number;
    overtimePay: number;
    netSalary: number;
    lastPayment: string | null;
    manualDeductions: {
      id: string;
      amount: number;
      reason: string;
      date: string;
      status: string;
      type: string;
    }[];
  };
  performance: {
    lastReview: {
      date: string;
      score: number;
      reviewer: string;
    } | null;
    activeGoals: number;
    completedGoals: number;
  };
  warnings: {
    total: number;
    recent: {
      id: string;
      type: string;
      date: string;
      description: string;
    }[];
  };
}

const EmployeeReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [report, setReport] = useState<EmployeeReportData | null>(null);

  useEffect(() => {
    fetchEmployees();

    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split("T")[0] || "");
    setEndDate(lastDay.toISOString().split("T")[0] || "");
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees");
      setEmployees(response.data?.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("فشل في جلب قائمة الموظفين");
    }
  };

  const fetchReport = async () => {
    if (!selectedEmployee) {
      toast.error("الرجاء اختيار موظف");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("الرجاء تحديد الفترة الزمنية");
      return;
    }

    try {
      setLoading(true);
      if (new Date(startDate) > new Date(endDate)) {
        toast.error("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
        return;
      }

      const params = new URLSearchParams({
        employeeId: selectedEmployee,
        startDate,
        endDate,
      });

      const response = await api.get(`/hr/reports/employee?${params}`);
      console.log("Employee Report Response:", response.data);

      if (response.data?.success) {
        setReport(response.data.report);
      } else {
        toast.error(response.data?.error || "فشل في جلب التقرير");
        setReport(null);
      }
    } catch (error: any) {
      console.error("Error fetching report:", error);
      const errorMsg = error.response?.data?.error || "فشل في جلب التقرير";
      toast.error(errorMsg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    // Create CSV content
    const headers = [
      "التاريخ",
      "الحالة",
      "وقت الدخول",
      "وقت الخروج",
      "ساعات العمل",
      "التأخير (دقيقة)",
    ];
    const rows = report.attendance.records.map((record) => [
      new Date(record.date).toLocaleDateString("ar-EG"),
      getStatusLabel(record.status),
      record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString("ar-EG")
        : "-",
      record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString("ar-EG")
        : "-",
      record.workHours?.toFixed(2) || "0",
      record.lateMinutes || "0",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `employee_report_${report.employee.name}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success("تم تصدير التقرير بنجاح");
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT:
        "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
      ABSENT: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
      LATE: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400",
      ON_LEAVE:
        "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",
      APPROVED:
        "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",
      PENDING:
        "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400",
      REJECTED: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",
    };
    return colors[status] || "text-gray-600 bg-gray-50";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: "حاضر",
      ABSENT: "غائب",
      LATE: "متأخر",
      ON_LEAVE: "إجازة",
      APPROVED: "موافق عليه",
      PENDING: "معلق",
      REJECTED: "مرفوض",
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAttendanceRate = () => {
    if (!report?.attendance?.totalDays || report.attendance.totalDays === 0)
      return 0;
    return (
      (report.attendance.presentDays / report.attendance.totalDays) *
      100
    ).toFixed(1);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return "text-green-600 dark:text-green-400";
    if (score >= 3.5) return "text-blue-600 dark:text-blue-400";
    if (score >= 2.5) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">الموظف</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue
                    placeholder="اختر موظف"
                    className="dark:text-gray-400"
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id}
                      className="dark:text-gray-300 dark:focus:bg-gray-700"
                    >
                      {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">من تاريخ</Label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">إلى تاريخ</Label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="invisible">Actions</Label>
              <div className="flex gap-2">
                <Button
                  onClick={fetchReport}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  عرض
                </Button>
                {report && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 print:hidden"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : report ? (
        <>
          {/* Employee Info */}
          <Card className="border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                  <User className="h-10 w-10" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {report.employee?.name}
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1 flex items-center gap-2">
                    <span>{report.employee?.employeeNumber}</span>
                    <span className="opacity-50">•</span>
                    <span>{report.employee?.department}</span>
                    <span className="opacity-50">•</span>
                    <span>{report.employee?.position}</span>
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">
                      نسبة الحضور
                    </p>
                    <h3 className="text-3xl font-bold mt-1">
                      {getAttendanceRate()}%
                    </h3>
                  </div>
                  <Clock className="h-10 w-10 opacity-30" />
                </div>
                <Progress
                  value={parseFloat(getAttendanceRate())}
                  className="mt-3 h-2 bg-white/20"
                />
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      طلبات الإجازات
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                      {report.leaves?.totalRequests || 0}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {report.leaves?.approved || 0} موافق عليها
                    </p>
                  </div>
                  <Calendar className="h-10 w-10 text-blue-500/20 dark:text-blue-400/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      صافي الراتب
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                      {formatCurrency(report.payroll?.netSalary || 0)}
                    </h3>
                  </div>
                  <DollarSign className="h-10 w-10 text-purple-500/20 dark:text-purple-400/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      تقييم الأداء
                    </p>
                    <h3
                      className={`text-3xl font-bold mt-1 ${getPerformanceColor(report.performance?.lastReview?.score || 0)}`}
                    >
                      {report.performance?.lastReview?.score || "N/A"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {report.performance?.activeGoals || 0} أهداف نشطة
                    </p>
                  </div>
                  <Award className="h-10 w-10 text-amber-500/20 dark:text-amber-400/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Details */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  تفاصيل الحضور
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      أيام الحضور
                    </span>
                    <Badge className="bg-emerald-600 text-white">
                      {report.attendance?.presentDays || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      أيام الغياب
                    </span>
                    <Badge className="bg-red-600 text-white">
                      {report.attendance?.absentDays || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      أيام التأخير
                    </span>
                    <Badge className="bg-orange-600 text-white">
                      {report.attendance?.lateDays || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      إجمالي ساعات العمل
                    </span>
                    <Badge className="bg-blue-600 text-white">
                      {report.attendance?.totalWorkHours?.toFixed(1) || 0}h
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      ساعات إضافية
                    </span>
                    <Badge className="bg-purple-600 text-white">
                      {report.attendance?.overtimeHours?.toFixed(1) || 0}h
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Details */}
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  تفاصيل الراتب
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      الراتب الأساسي
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(report.payroll?.baseSalary || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      البدلات
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(report.payroll?.allowances || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      مكافأة الوقت الإضافي
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      +{formatCurrency(report.payroll?.overtimePay || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <span className="text-sm font-medium dark:text-gray-300">
                      الخصومات
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(report.payroll?.deductions || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                    <span className="text-sm font-bold dark:text-gray-200">
                      صافي الراتب
                    </span>
                    <span className="font-bold text-xl text-purple-600 dark:text-purple-400">
                      {formatCurrency(report.payroll?.netSalary || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance & Goals */}
          {(report.performance?.lastReview ||
            (report.performance?.activeGoals || 0) > 0) && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  الأداء والأهداف
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.performance?.lastReview && (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium dark:text-gray-300">
                          آخر تقييم
                        </span>
                      </div>
                      <p
                        className={`text-3xl font-bold ${getPerformanceColor(report.performance.lastReview.score)}`}
                      >
                        {report.performance.lastReview.score}/5
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(
                          report.performance.lastReview.date,
                        ).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium dark:text-gray-300">
                        أهداف نشطة
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {report.performance?.activeGoals || 0}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium dark:text-gray-300">
                        أهداف مكتملة
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {report.performance?.completedGoals || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leave Requests */}
          {report.leaves?.requests && report.leaves.requests.length > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  طلبات الإجازات ({report.leaves.totalDaysTaken} يوم)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {report.leaves.requests.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(leave.status)}>
                              {getStatusLabel(leave.status)}
                            </Badge>
                            <span className="text-sm font-medium dark:text-gray-300">
                              {leave.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(leave.startDate).toLocaleDateString(
                              "ar-EG",
                            )}{" "}
                            -{" "}
                            {new Date(leave.endDate).toLocaleDateString(
                              "ar-EG",
                            )}
                          </p>
                          {leave.reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {leave.reason}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="dark:border-gray-600"
                        >
                          {leave.days} يوم
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advance Requests */}
          {report.advances?.requests && report.advances.requests.length > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  طلبات السلف ({formatCurrency(report.advances.totalAmount)})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {report.advances.requests.map((advance) => (
                    <div
                      key={advance.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(advance.status)}>
                              {getStatusLabel(advance.status)}
                            </Badge>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(advance.requestDate).toLocaleDateString(
                                "ar-EG",
                              )}
                            </span>
                          </div>
                          {advance.reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {advance.reason}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          {formatCurrency(advance.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Permission Requests */}
          {report.permissions?.requests &&
            report.permissions.requests.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
                <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    طلبات الاستئذان ({report.permissions.totalHours} ساعة)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y dark:divide-gray-700">
                    {report.permissions.requests.map((perm) => (
                      <div
                        key={perm.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusColor(perm.status)}>
                                {getStatusLabel(perm.status)}
                              </Badge>
                              <span className="text-sm font-medium dark:text-gray-300">
                                {new Date(perm.date).toLocaleDateString(
                                  "ar-EG",
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {perm.startTime} - {perm.endTime} (
                              {perm.totalHours} ساعة)
                            </p>
                            {perm.reason && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {perm.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Manual Deductions */}
          {report.payroll?.manualDeductions &&
            report.payroll.manualDeductions.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
                <CardHeader className="border-b dark:border-gray-700 bg-red-50/50 dark:bg-red-950/10">
                  <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-400">
                    <DollarSign className="h-5 w-5" />
                    الخصومات المالية الإضافية
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y dark:divide-gray-700">
                    {report.payroll.manualDeductions.map((deduction) => (
                      <div
                        key={deduction.id}
                        className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                className={getStatusColor(deduction.status)}
                              >
                                {getStatusLabel(deduction.status)}
                              </Badge>
                              <span className="text-sm font-medium dark:text-gray-300">
                                {new Date(deduction.date).toLocaleDateString(
                                  "ar-EG",
                                )}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {deduction.reason}
                            </p>
                          </div>
                          <span className="font-bold text-lg text-red-600 dark:text-red-400">
                            {formatCurrency(deduction.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Warnings */}
          {report.warnings?.total > 0 && (
            <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm overflow-hidden">
              <CardHeader className="border-b dark:border-gray-700 bg-red-50/50 dark:bg-red-950/20">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  الإنذارات والتحذيرات التأديبية
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y dark:divide-gray-700">
                  {report.warnings?.recent?.map((warning) => (
                    <div
                      key={warning.id}
                      className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-red-600 dark:text-red-400">
                            {warning.type}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                            {warning.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded whitespace-nowrap">
                          {new Date(warning.date).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Attendance Records */}
          {report.attendance?.records &&
            report.attendance.records.length > 0 && (
              <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
                <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    سجل الحضور الأخير
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            التاريخ
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            الحالة
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            الدخول
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            الخروج
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            ساعات العمل
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                            التأخير
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                        {report.attendance.records.map((record, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="px-4 py-3 text-sm dark:text-gray-300">
                              {new Date(record.date).toLocaleDateString(
                                "ar-EG",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={getStatusColor(record.status)}>
                                {getStatusLabel(record.status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm dark:text-gray-300">
                              {record.checkIn
                                ? new Date(record.checkIn).toLocaleTimeString(
                                    "ar-EG",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm dark:text-gray-300">
                              {record.checkOut
                                ? new Date(record.checkOut).toLocaleTimeString(
                                    "ar-EG",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm dark:text-gray-300">
                              {record.workHours?.toFixed(1) || 0}h
                            </td>
                            <td className="px-4 py-3 text-sm dark:text-gray-300">
                              {record.lateMinutes > 0
                                ? `${record.lateMinutes} دقيقة`
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      ) : (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-none shadow-sm">
          <CardContent className="p-20">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <FileText className="w-20 h-20 mx-auto mb-6 opacity-20" />
              <h3 className="text-xl font-bold dark:text-white">
                جاهز لعرض التقرير
              </h3>
              <p className="mt-2">
                اختر موظف وحدد الفترة الزمنية من القائمة أعلاه
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeReport;
