import React, { useState, useEffect } from "react";
import {
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  FileText,
} from "lucide-react";
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
import { Progress } from "../../../components/ui/progress";
import api from "../../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";

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
  employees: {
    id: string;
    userId: string;
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    totalWorkHours: number;
    totalLateMinutes: number;
    attendanceRate: number;
  }[];
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

const AttendanceReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<AttendanceReport | null>(null);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const response = await api.get(`/hr/reports/attendance?${params}`);
      setReport(response.data?.report || null);
    } catch (error) {
      console.error("Error fetching report:", error);
      tToast.error("hr_AttendanceReport.failed_fetch_2d8e");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    tToast.success("hr_AttendanceReport.msg_74cd");
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {/* Filters */}
      <Card className="border-none shadow-sm dark:bg-gray-800/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">الشهر</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[150px] dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue className="dark:text-white" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {months.map((month, index) => (
                    <SelectItem
                      key={index}
                      value={(index + 1).toString()}
                      className="dark:text-gray-300 dark:focus:bg-gray-700"
                    >
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-gray-300">السنة</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px] dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue className="dark:text-white" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="dark:text-gray-300 dark:focus:bg-gray-700"
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mr-auto">
              <Button
                variant="outline"
                onClick={fetchReport}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4 ml-2" />
                تحديث
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4 ml-2" />
                تصدير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg transform transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">
                        نسبة الحضور
                      </p>
                      <h3 className="text-3xl font-bold mt-1">
                        {report.attendanceRate || 0}%
                      </h3>
                    </div>
                    <TrendingUp className="h-10 w-10 opacity-40" />
                  </div>
                  <div className="mt-4 bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-white h-full"
                      style={{ width: `${report.attendanceRate || 0}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        أيام الحضور
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                        {report.presentDays || 0}
                      </h3>
                    </div>
                    <Users className="h-10 w-10 text-emerald-500/20 dark:text-emerald-400/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        أيام الغياب
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                        {report.absentDays || 0}
                      </h3>
                    </div>
                    <TrendingDown className="h-10 w-10 text-rose-500/20 dark:text-rose-400/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        متوسط ساعات العمل
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                        {report.averageWorkHours || 0}
                      </h3>
                    </div>
                    <Clock className="h-10 w-10 text-amber-500/20 dark:text-amber-400/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Department */}
              <Card className="lg:col-span-1 dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white overflow-hidden">
                <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                  <CardTitle className="text-lg font-semibold dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    الحضور حسب القسم
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {report.byDepartment && report.byDepartment.length > 0 ? (
                      report.byDepartment.map((dept, index) => (
                        <div
                          key={index}
                          className="space-y-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium dark:text-gray-200">
                              {dept.department}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                              {dept.rate}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{dept.employees} موظف</span>
                          </div>
                          <Progress
                            value={dept.rate}
                            className="h-1.5 dark:bg-gray-700"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        لا توجد بيانات
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Employee Table */}
              <Card className="lg:col-span-2 dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                  <CardTitle className="text-lg font-semibold dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    تقرير الحضور لكل موظف
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                        <TableRow>
                          <TableHead className="text-right">الموظف</TableHead>
                          <TableHead className="text-right">القسم</TableHead>
                          <TableHead className="text-right">حضور</TableHead>
                          <TableHead className="text-right">غياب</TableHead>
                          <TableHead className="text-right">تأخير</TableHead>
                          <TableHead className="text-right">الساعات</TableHead>
                          <TableHead className="text-right">النسبة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.employees && report.employees.length > 0 ? (
                          report.employees.map((emp) => (
                            <TableRow
                              key={emp.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium dark:text-gray-200">
                                    {emp.name}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    #{emp.employeeNumber}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {emp.department}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800"
                                >
                                  {emp.presentDays}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`${emp.absentDays > 0 ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800" : "text-gray-400 border-gray-100"}`}
                                >
                                  {emp.absentDays}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`${emp.lateDays > 0 ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" : "text-gray-400 border-gray-100"}`}
                                >
                                  {emp.lateDays}
                                </Badge>
                              </TableCell>
                              <TableCell className="dark:text-gray-300">
                                {emp.totalWorkHours.toFixed(1)}h
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    {emp.attendanceRate}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-gray-500 dark:text-gray-400"
                            >
                              لا توجد بيانات للموظفين
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
};

export default AttendanceReport;
