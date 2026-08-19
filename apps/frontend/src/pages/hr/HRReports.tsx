import React, { useState, useEffect } from "react";
import { Activity, AlertTriangle, Award, BarChart, Book, BookOpen, Calendar, Check, Clock, DollarSign, Download, File, FileText, PieChart as PieChartIcon, RefreshCw, Shuffle, TrendingDown, TrendingUp, UserCheck, Users, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Progress } from "../../components/ui/progress";
import api from "../../services/api";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface AttendanceReport {
  totalEmployees: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  averageWorkHours: number;
  attendanceRate: number;
  byDepartment: {
    department: string;
    rate: number;
    employees: number;
  }[];
}

interface LeaveReport {
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  totalDaysTaken: number;
  byType: {
    type: string;
    count: number;
    days: number;
  }[];
}

interface PayrollReport {
  totalPayroll: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalOvertime: number;
  averageSalary: number;
  byDepartment: {
    department: string;
    total: number;
    employees: number;
  }[];
}

interface WarningReport {
  totalWarnings: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
}

interface TrainingReport {
  totalTrainings: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  byCategory: { name: string; count: number }[];
}

interface PerformanceReport {
  averageRating: number;
  reviewCount: number;
  distribution: { rating: string; count: number }[];
}

const months = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const HRReports: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("attendance");

  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Reports data
  const [attendanceReport, setAttendanceReport] =
    useState<AttendanceReport | null>(null);
  const [leaveReport, setLeaveReport] = useState<LeaveReport | null>(null);
  const [payrollReport, setPayrollReport] = useState<PayrollReport | null>(
    null,
  );
  const [warningReport, setWarningReport] = useState<WarningReport | null>(
    null,
  );
  const [trainingReport, setTrainingReport] = useState<TrainingReport | null>(
    null,
  );
  const [performanceReport, setPerformanceReport] =
    useState<PerformanceReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [activeTab, selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (activeTab === "attendance") {
        const response = await api.get(`/hr/reports/attendance?${params}`);
        setAttendanceReport(response.data?.report || null);
      } else if (activeTab === "leaves") {
        const response = await api.get(`/hr/reports/leaves?${params}`);
        setLeaveReport(response.data?.report || null);
      } else if (activeTab === "payroll") {
        const response = await api.get(`/hr/reports/payroll?${params}`);
        setPayrollReport(response.data?.report || null);
      } else if (activeTab === "warnings") {
        // Mocking for now as requested
        setWarningReport({
          totalWarnings: 12,
          byType: [
            { type: "تأخير", count: 5 },
            { type: "سلوك", count: 3 },
            { type: "أداء", count: 4 },
          ],
          bySeverity: [
            { severity: "منخفضة", count: 6 },
            { severity: "متوسطة", count: 4 },
            { severity: "عالية", count: 2 },
          ],
        });
      } else if (activeTab === "training") {
        setTrainingReport({
          totalTrainings: 8,
          completed: 5,
          inProgress: 3,
          completionRate: 62.5,
          byCategory: [
            { name: "فني", count: 3 },
            { name: "سلامة", count: 2 },
            { name: "إداري", count: 3 },
          ],
        });
      } else if (activeTab === "performance") {
        setPerformanceReport({
          averageRating: 4.2,
          reviewCount: 25,
          distribution: [
            { rating: "ممتاز", count: 8 },
            { rating: "جيد جداً", count: 10 },
            { rating: "جيد", count: 5 },
            { rating: "مقبول", count: 2 },
          ],
        });
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      // Set mock data for demo
      if (activeTab === "attendance") {
        setAttendanceReport({
          totalEmployees: 50,
          presentDays: 1100,
          absentDays: 50,
          lateDays: 75,
          averageWorkHours: 7.5,
          attendanceRate: 92,
          byDepartment: [
            { department: "المبيعات", rate: 95, employees: 15 },
            { department: "التسويق", rate: 90, employees: 10 },
            { department: "التقنية", rate: 88, employees: 12 },
            { department: "الموارد البشرية", rate: 98, employees: 5 },
            { department: "المالية", rate: 94, employees: 8 },
          ],
        });
      } else if (activeTab === "leaves") {
        setLeaveReport({
          totalRequests: 45,
          approved: 35,
          rejected: 5,
          pending: 5,
          totalDaysTaken: 120,
          byType: [
            { type: "سنوية", count: 25, days: 75 },
            { type: "مرضية", count: 12, days: 24 },
            { type: "طارئة", count: 5, days: 10 },
            { type: "أخرى", count: 3, days: 11 },
          ],
        });
      } else if (activeTab === "payroll") {
        // Don't use mock data for payroll - rely on API
        setPayrollReport(null);
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * 📤 تصدير البيانات إلى CSV
   */
  const handleExport = () => {
    if (!payrollReport && activeTab === "payroll") {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM

    if (activeTab === "payroll" && payrollReport) {
      // 1. Summary Header
      csvContent += "Metric,Value\n";
      csvContent += `Total Payroll,${payrollReport.totalPayroll}\n`;
      csvContent += `Base Salary,${payrollReport.totalBaseSalary}\n`;
      csvContent += `Allowances,${payrollReport.totalAllowances}\n`;
      csvContent += `Deductions,${payrollReport.totalDeductions}\n`;
      csvContent += `Overtime,${payrollReport.totalOvertime}\n`;
      csvContent += `Average Salary,${payrollReport.averageSalary}\n\n`;

      // 2. Department Breakdown
      csvContent += "Department,Employees,Total Cost\n";
      payrollReport.byDepartment.forEach((dept) => {
        csvContent += `${dept.department},${dept.employees},${dept.total}\n`;
      });

      const fileName = `${activeTab}_report_${selectedMonth}_${selectedYear}.csv`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("تم تصدير التقرير بنجاح");
    } else {
      // Basic export for other tabs
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "تقرير الموارد البشرية\n";
      csvContent += `القسم: , ${activeTab}\n`;
      csvContent += `التاريخ: , ${selectedMonth}/${selectedYear}\n\n`;
      csvContent +=
        "Note: This is a placeholder export for the selected tab.\n";

      const fileName = `${activeTab}_report_${selectedMonth}_${selectedYear}.csv`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("تم تصدير ملف تجريبي للتقرير");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تقارير الموارد البشرية
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchReport}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>السنة</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent border-none">
          <TabsTrigger
            value="attendance"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4" />
            الحضور
          </TabsTrigger>
          <TabsTrigger
            value="leaves"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Calendar className="h-4 w-4" />
            الإجازات
          </TabsTrigger>
          <TabsTrigger
            value="payroll"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <DollarSign className="h-4 w-4" />
            الرواتب
          </TabsTrigger>
          <TabsTrigger
            value="warnings"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <AlertTriangle className="h-4 w-4" />
            الإنذارات
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <BookOpen className="h-4 w-4" />
            التدريب
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Activity className="h-4 w-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger
            value="kpis"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Award className="h-4 w-4" />
            المؤشرات
          </TabsTrigger>
          <TabsTrigger
            value="late-absence"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4" />
            التأخير والغياب
          </TabsTrigger>
          <TabsTrigger
            value="overtime"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <TrendingUp className="h-4 w-4" />
            العمل الإضافي
          </TabsTrigger>
          <TabsTrigger
            value="turnover"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Shuffle className="h-4 w-4" />
            معدل الدوران
          </TabsTrigger>
          <TabsTrigger
            value="employee"
            className="flex items-center gap-2 border data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Users className="h-4 w-4" />
            تقارير الموظفين
          </TabsTrigger>
        </TabsList>

        {/* Attendance Report */}
        <TabsContent value="attendance" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            attendanceReport && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium">
                            معدل الانضباط
                          </p>
                          <h3 className="text-3xl font-bold mt-1">
                            {attendanceReport.attendanceRate}%
                          </h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-full text-white">
                          <TrendingUp className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            إجمالي الحضور
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-green-600">
                            {attendanceReport.presentDays}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            يوم عمل مسجل
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                          <Users className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            حالات الغياب
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-red-600">
                            {attendanceReport.absentDays}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">بدون عذر</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                          <TrendingDown className="h-6 w-6 text-red-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            ساعات العمل
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-purple-600">
                            {attendanceReport.averageWorkHours}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            متوسط يومي
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-full">
                          <Clock className="h-6 w-6 text-purple-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Visual Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>الانضباط حسب القسم</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={attendanceReport.byDepartment}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="department"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value) => `${value}%`} />
                            <Bar
                              dataKey="rate"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              barSize={30}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>توزيع القوى العاملة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "حاضر",
                                  value: attendanceReport.presentDays,
                                },
                                {
                                  name: "غائب",
                                  value: attendanceReport.absentDays,
                                },
                                {
                                  name: "متأخر",
                                  value: attendanceReport.lateDays,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                              <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )
          )}
        </TabsContent>

        {/* Leaves Report */}
        <TabsContent value="leaves" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            leaveReport && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-purple-600 to-fuchsia-700 text-white shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100 text-sm font-medium">
                            طلبات الإجازة
                          </p>
                          <h3 className="text-3xl font-bold mt-1">
                            {leaveReport.totalRequests}
                          </h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-full">
                          <FileText className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            الأيام المستهلكة
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-blue-600">
                            {leaveReport.totalDaysTaken}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            يوم إجازة إجمالي
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                          <Calendar className="h-6 w-6 text-blue-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            نسبة القبول
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-green-600">
                            {Math.round(
                              (leaveReport.approved /
                                (leaveReport.totalRequests || 1)) *
                                100,
                            )}
                            %
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {leaveReport.approved} طلب مقبول
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-full">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            طلبات مرفوضة
                          </p>
                          <h3 className="text-3xl font-bold mt-1 text-red-600">
                            {leaveReport.rejected}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">
                            {Math.round(
                              (leaveReport.rejected /
                                (leaveReport.totalRequests || 1)) *
                                100,
                            )}
                            % من الإجمالي
                          </p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full">
                          <X className="h-6 w-6 text-red-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Leaves Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>تحليل أنواع الإجازات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={leaveReport.byType}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="days"
                              nameKey="type"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {leaveReport.byType.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    [
                                      "#8b5cf6",
                                      "#ec4899",
                                      "#f97316",
                                      "#06b6d4",
                                      "#10b981",
                                    ][index % 5]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>أيام الإجازات حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={leaveReport.byType}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                            />
                            <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="days"
                              fill="#ec4899"
                              radius={[4, 4, 0, 0]}
                              barSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )
          )}
        </TabsContent>

        {/* Payroll Report */}
        <TabsContent value="payroll" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            payrollReport && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-sm font-medium">
                            إجمالي الرواتب الصافية
                          </p>
                          <h3 className="text-2xl font-bold mt-2">
                            {formatCurrency(payrollReport.totalPayroll)}
                          </h3>
                        </div>
                        <div className="p-3 bg-white/20 rounded-full">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            الرواتب الأساسية
                          </p>
                          <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-gray-100">
                            {formatCurrency(payrollReport.totalBaseSalary)}
                          </h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            إجمالي البدلات
                          </p>
                          <h3 className="text-2xl font-bold mt-2 text-green-600">
                            +{formatCurrency(payrollReport.totalAllowances)}
                          </h3>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 text-sm font-medium">
                            إجمالي الخصومات
                          </p>
                          <h3 className="text-2xl font-bold mt-2 text-red-600">
                            -{formatCurrency(payrollReport.totalDeductions)}
                          </h3>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Visual Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>توزيع تكاليف الرواتب</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "الراتب الأساسي",
                                  value: payrollReport.totalBaseSalary,
                                },
                                {
                                  name: "البدلات",
                                  value: payrollReport.totalAllowances,
                                },
                                {
                                  name: "العمل الإضافي",
                                  value: payrollReport.totalOvertime,
                                },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              <Cell fill="#3b82f6" /> {/* Base: Blue */}
                              <Cell fill="#10b981" />{" "}
                              {/* Allowances: Emerald */}
                              <Cell fill="#f59e0b" /> {/* Overtime: Amber */}
                            </Pie>
                            <Tooltip
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Department Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>تكاليف الرواتب حسب القسم</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={payrollReport.byDepartment}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                            />
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="department"
                              type="category"
                              width={100}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value) =>
                                formatCurrency(Number(value))
                              }
                              cursor={{ fill: "transparent" }}
                            />
                            <Bar
                              dataKey="total"
                              fill="#6366f1"
                              radius={[0, 4, 4, 0]}
                              barSize={20}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>تفاصيل الأقسام</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">القسم</TableHead>
                            <TableHead className="text-right">
                              عدد الموظفين
                            </TableHead>
                            <TableHead className="text-right">
                              إجمالي الرواتب
                            </TableHead>
                            <TableHead className="text-right">
                              نسبة من الإجمالي
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payrollReport.byDepartment.length > 0 ? (
                            payrollReport.byDepartment.map((dept, index) => {
                              const percent =
                                (dept.total / payrollReport.totalPayroll) * 100;
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">
                                    {dept.department}
                                  </TableCell>
                                  <TableCell>{dept.employees}</TableCell>
                                  <TableCell>
                                    {formatCurrency(dept.total)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs w-10">
                                        {percent.toFixed(1)}%
                                      </span>
                                      <Progress
                                        value={percent}
                                        className="h-2 w-24"
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-8 text-gray-500"
                              >
                                لا توجد بيانات متاحة لهذا الشهر
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            warningReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-amber-100 text-sm">
                            إجمالي الإنذارات
                          </p>
                          <h3 className="text-3xl font-bold mt-1">
                            {warningReport.totalWarnings}
                          </h3>
                        </div>
                        <AlertTriangle className="h-10 w-10 opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>توزيع الإنذارات حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={warningReport.byType}
                              dataKey="count"
                              nameKey="type"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label
                            >
                              {warningReport.byType.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    ["#f59e0b", "#ef4444", "#3b82f6"][index % 3]
                                  }
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>حسب درجة الخطورة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={warningReport.bySeverity}>
                            <XAxis dataKey="severity" />
                            <YAxis />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill="#ef4444"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )
          )}
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            trainingReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <CardContent className="p-6">
                      <p className="text-indigo-100 text-sm">معدل الإنجاز</p>
                      <h3 className="text-3xl font-bold mt-1">
                        {trainingReport.completionRate}%
                      </h3>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-gray-500 text-sm">برامج مكتملة</p>
                      <h3 className="text-2xl font-bold text-green-600">
                        {trainingReport.completed}
                      </h3>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>توزيع البرامج التدريبية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={trainingReport.byCategory}
                          layout="vertical"
                        >
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#8b5cf6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            performanceReport && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <CardContent className="p-6">
                      <p className="text-emerald-100 text-sm">
                        متوسط التقييم العام
                      </p>
                      <h3 className="text-3xl font-bold mt-1">
                        {performanceReport.averageRating} / 5
                      </h3>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>توزيع مستويات الأداء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceReport.distribution}>
                          <XAxis dataKey="rating" />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            barSize={50}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )
          )}
        </TabsContent>

        <TabsContent value="kpis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardContent className="p-6">
                <p className="text-blue-100 text-sm">معدل تحقيق الأهداف</p>
                <h3 className="text-3xl font-bold mt-1">87%</h3>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تطور مؤشرات الأداء الرئيسية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "الإنتاجية", value: 92 },
                      { name: "الجودة", value: 85 },
                      { name: "الالتزام", value: 95 },
                      { name: "التعاون", value: 80 },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="late-absence" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
              <CardContent className="p-6">
                <p className="text-red-100 text-sm">متوسط دقائق التأخير</p>
                <h3 className="text-3xl font-bold mt-1">18 دقيقة</h3>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white">
              <CardContent className="p-6">
                <p className="text-orange-100 text-sm">إجمالي أيام الغياب</p>
                <h3 className="text-3xl font-bold mt-1">42 يوم</h3>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>دقائق التأخير حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "المبيعات", minutes: 25 },
                      { name: "التسويق", minutes: 15 },
                      { name: "العمليات", minutes: 30 },
                      { name: "التقنية", minutes: 5 },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="minutes"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      barSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>تكاليف وساعات العمل الإضافي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "المبيعات", hours: 45 },
                      { name: "التقنية", hours: 120 },
                      { name: "العمليات", hours: 80 },
                      { name: "الموارد البشرية", hours: 10 },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="turnover" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">معدل الدوران الشهري</h3>
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">2.4%</p>
                  <p className="text-gray-500 mt-2">معدل مقبول عالمياً</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">أسباب الاستقالة</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "راتب أفضل", value: 40 },
                        { name: "تطور وظيفي", value: 30 },
                        { name: "ظروف شخصية", value: 20 },
                        { name: "أخرى", value: 10 },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={60}
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employee" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <p className="text-gray-500 text-sm">متوسط العمر</p>
              <p className="text-3xl font-bold mt-1">29 عام</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">التوازن الجندري</p>
              <p className="text-3xl font-bold mt-1">65% ذكور / 35% إناث</p>
            </Card>
            <Card className="p-6">
              <p className="text-gray-500 text-sm">متوسط الأقدمية</p>
              <p className="text-3xl font-bold mt-1">1.8 عام</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>توزيع المسارات الوظيفية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "إداري", count: 12 },
                      { name: "فني", count: 25 },
                      { name: "خدمات", count: 8 },
                      { name: "قيادي", count: 5 },
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HRReports;
