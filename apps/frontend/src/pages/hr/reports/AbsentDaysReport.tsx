import React, { useState, useEffect } from "react";
import { CalendarX2, Users, TrendingUp, Download, RefreshCw } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import api from "../../../services/api";
import { toast } from "sonner";

interface AbsentEmployee {
  id: string;
  userId: string;
  name: string;
  employeeNumber: string;
  department: string;
  position: string;
  absentDays: number;
  absentDates: string[];
  attendanceRate: number;
}

interface AbsentDaysReportData {
  month: number;
  year: number;
  totalEmployees: number;
  totalAbsentDays: number;
  totalWorkingDays: number;
  attendanceRate: number;
  employees: AbsentEmployee[];
}

const months = [
  "┘è┘å╪º┘è╪▒",
  "┘ü╪¿╪▒╪º┘è╪▒",
  "┘à╪º╪▒╪│",
  "╪ú╪¿╪▒┘è┘ä",
  "┘à╪º┘è┘ê",
  "┘è┘ê┘å┘è┘ê",
  "┘è┘ê┘ä┘è┘ê",
  "╪ú╪║╪│╪╖╪│",
  "╪│╪¿╪¬┘à╪¿╪▒",
  "╪ú┘â╪¬┘ê╪¿╪▒",
  "┘å┘ê┘ü┘à╪¿╪▒",
  "╪»┘è╪│┘à╪¿╪▒",
];

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const getWeekday = (dateStr: string): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  return new Intl.DateTimeFormat("ar-EG", { weekday: "long" }).format(date);
};

const AbsentDaysReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [report, setReport] = useState<AbsentDaysReportData | null>(null);

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

      const response = await api.get<{ report: AbsentDaysReportData }>(
        `/hr/reports/absent-days?${params}`,
      );
      setReport(response.data?.report || null);
    } catch (error) {
      console.error("Error fetching absent days report:", error);
      toast.error("╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¼┘ä╪¿ ╪¬┘é╪▒┘è╪▒ ╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report || report.employees.length === 0) {
      toast.error("┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ┘ä┘ä╪¬╪╡╪»┘è╪▒");
      return;
    }

    const rows: Array<Record<string, string | number>> = report.employees.map(
      (emp) => ({
        ╪º┘ä┘à┘ê╪╕┘ü: emp.name,
        "╪▒┘é┘à ╪º┘ä┘à┘ê╪╕┘ü": emp.employeeNumber,
        ╪º┘ä┘é╪│┘à: emp.department,
        "╪╣╪»╪» ╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿": emp.absentDays,
        "╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿": emp.absentDates.map(formatDate).join("╪î "),
        "┘å╪│╪¿╪⌐ ╪º┘ä╪¡╪╢┘ê╪▒ %": emp.attendanceRate,
      }),
    );

    const headers = Object.keys(rows[0] ?? {});
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String(r[h]).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `absent-days-${selectedYear}-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <Card className="border-none shadow-sm dark:bg-gray-800/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">╪º┘ä╪┤┘ç╪▒</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v ?? "1"))}
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
              <Label className="dark:text-gray-300">╪º┘ä╪│┘å╪⌐</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) =>
                  setSelectedYear(parseInt(v ?? String(currentDate.getFullYear())))
                }
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
                ╪¬╪¡╪»┘è╪½
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4 ml-2" />
                ╪¬╪╡╪»┘è╪▒
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-rose-600 to-red-700 text-white border-none shadow-lg transform transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm font-medium">
                        ┘å╪│╪¿╪⌐ ╪º┘ä╪¡╪╢┘ê╪▒
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
                        ╪Ñ╪¼┘à╪º┘ä┘è ╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                        {report.totalAbsentDays || 0}
                      </h3>
                    </div>
                    <CalendarX2 className="h-10 w-10 text-rose-500/20 dark:text-rose-400/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        ╪ú┘è╪º┘à ╪º┘ä╪╣┘à┘ä ┘ü┘è ╪º┘ä╪┤┘ç╪▒
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                        {report.totalWorkingDays || 0}
                      </h3>
                    </div>
                    <Users className="h-10 w-10 text-amber-500/20 dark:text-amber-400/20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        ╪╣╪»╪» ╪º┘ä┘à┘ê╪╕┘ü┘è┘å
                      </p>
                      <h3 className="text-3xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                        {report.totalEmployees || 0}
                      </h3>
                    </div>
                    <Users className="h-10 w-10 text-blue-500/20 dark:text-blue-400/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                <CardTitle className="text-lg font-semibold dark:text-white flex items-center gap-2">
                  <CalendarX2 className="h-5 w-5 text-primary" />
                  ╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿ ╪º┘ä╪¬┘ü╪╡┘è┘ä┘è╪⌐ ┘ä┘â┘ä ┘à┘ê╪╕┘ü
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                      <TableRow>
                        <TableHead className="text-right">╪º┘ä┘à┘ê╪╕┘ü</TableHead>
                        <TableHead className="text-right">╪º┘ä┘é╪│┘à</TableHead>
                        <TableHead className="text-right">╪╣╪»╪» ╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿</TableHead>
                        <TableHead className="text-right">╪º┘ä┘å╪│╪¿╪⌐</TableHead>
                        <TableHead className="text-right w-2/5">╪ú┘è╪º┘à ╪º┘ä╪║┘è╪º╪¿</TableHead>
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
                                className={`${emp.absentDays > 0 ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800" : "text-gray-400 border-gray-100"}`}
                              >
                                {emp.absentDays}
                              </Badge>
                            </TableCell>
                            <TableCell className="dark:text-gray-300">
                              {emp.attendanceRate}%
                            </TableCell>
                            <TableCell>
                              {emp.absentDates.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {emp.absentDates.map((d) => (
                                    <Badge
                                      key={d}
                                      variant="outline"
                                      className="text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800"
                                    >
                                      {formatDate(d)}
                                      <span className="mr-1 text-xs text-gray-400 dark:text-gray-500">
                                        {getWeekday(d)}
                                      </span>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                  ┘ä╪º ┘è┘ê╪¼╪» ╪║┘è╪º╪¿
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center py-8 text-gray-500 dark:text-gray-400"
                          >
                            ┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ┘ä┘ä┘à┘ê╪╕┘ü┘è┘å
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
    </div>
  );
};

export default AbsentDaysReport;
