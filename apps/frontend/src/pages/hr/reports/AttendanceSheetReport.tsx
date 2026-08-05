import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Download,
  RefreshCw,
  UserCheck,
  Timer,
  UserX,
  CalendarOff,
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
import { Badge } from "../../../components/ui/badge";
import api from "../../../services/api";
import { toast } from "sonner";

interface SheetDay {
  day: number;
  date: string;
  weekday: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
}

interface SheetCell {
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
}

interface SheetEmployee {
  id: string;
  name: string;
  employeeNumber: string;
  department: string;
  position: string;
  totals: { present: number; late: number; absent: number; leave: number };
  cells: SheetCell[];
}

interface AttendanceSheetData {
  month: number;
  year: number;
  days: SheetDay[];
  totalEmployees: number;
  totals: { present: number; late: number; absent: number; leave: number };
  employees: SheetEmployee[];
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

interface CellStyle {
  label: string;
  cell: string;
  dot: string;
  timeColor: string;
}

const FALLBACK_CELL: CellStyle = {
  label: "حاضر",
  cell: "bg-emerald-50 border-emerald-200",
  dot: "bg-emerald-500",
  timeColor: "text-emerald-700",
};

const statusConfig: Record<string, CellStyle> = {
  PRESENT: {
    label: "حاضر",
    cell: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
    timeColor: "text-emerald-700",
  },
  LATE: {
    label: "متأخر",
    cell: "bg-amber-50 border-amber-300",
    dot: "bg-amber-500",
    timeColor: "text-amber-700",
  },
  REMOTE: {
    label: "عن بعد",
    cell: "bg-sky-50 border-sky-200",
    dot: "bg-sky-500",
    timeColor: "text-sky-700",
  },
  ABSENT: {
    label: "غائب",
    cell: "bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
    timeColor: "text-rose-700",
  },
  LEAVE: {
    label: "إجازة",
    cell: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    timeColor: "text-blue-700",
  },
  WEEKEND: {
    label: "عطلة",
    cell: "bg-gray-100/70 border-gray-200",
    dot: "bg-gray-300",
    timeColor: "text-gray-400",
  },
  HOLIDAY: {
    label: "عطلة رسمية",
    cell: "bg-purple-50 border-purple-200",
    dot: "bg-purple-500",
    timeColor: "text-purple-700",
  },
  BEFORE_HIRE: {
    label: "—",
    cell: "bg-gray-50 border-gray-100",
    dot: "bg-gray-200",
    timeColor: "text-gray-300",
  },
};

const AttendanceSheetReport: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<AttendanceSheetData | null>(null);

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

      const response = await api.get<{ report: AttendanceSheetData }>(
        `/hr/reports/attendance-sheet?${params}`,
      );
      setReport(response.data?.report || null);
    } catch (error) {
      console.error("Error fetching attendance sheet:", error);
      toast.error("حدث خطأ أثناء جلب كشف الحضور الشهري");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report || report.employees.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }

    const headers = [
      "الموظف",
      "رقم الموظف",
      "القسم",
      "حاضر",
      "متأخر",
      "غائب",
      "إجازة",
      ...report.days.map((d) => `${d.day}/${report.month}`),
    ];

    const rows = report.employees.map((emp) => [
      emp.name,
      emp.employeeNumber,
      emp.department,
      emp.totals.present,
      emp.totals.late,
      emp.totals.absent,
      emp.totals.leave,
      ...emp.cells.map((c) => {
        const cfg = statusConfig[c.status] ?? FALLBACK_CELL;
        if (c.checkIn) {
          return `${cfg.label} ${c.checkIn}${c.checkOut ? `-${c.checkOut}` : ""}`;
        }
        return cfg.label;
      }),
    ]);

    const csv = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-sheet-${selectedYear}-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredEmployees =
    report && search.trim()
      ? report.employees.filter(
          (e) =>
            e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.employeeNumber.toLowerCase().includes(search.toLowerCase()) ||
            e.department.toLowerCase().includes(search.toLowerCase()),
        )
      : report?.employees || [];

  const totals = report?.totals || { present: 0, late: 0, absent: 0, leave: 0 };
  const attended = totals.present + totals.late;
  const working = attended + totals.absent;
  const attendanceRate = working > 0 ? ((attended / working) * 100).toFixed(1) : "0";

  const renderCell = (cell: SheetCell, day: SheetDay) => {
    const cfg = statusConfig[cell.status] ?? FALLBACK_CELL;
    return (
      <td
        key={day.day}
        className={`border-b border-l border-gray-100 dark:border-gray-700 p-0.5 align-top ${cfg.cell}`}
        title={`${day.date} — ${cfg.label}${cell.checkIn ? `\nحضور: ${cell.checkIn}` : ""}${cell.checkOut ? `\nانصراف: ${cell.checkOut}` : ""}${cell.lateMinutes > 0 ? `\nتأخير: ${cell.lateMinutes} دقيقة` : ""}`}
      >
        {cell.checkIn ? (
          <div className="flex flex-col items-center leading-tight py-0.5">
            <span className={`text-[10px] font-bold ${cfg.timeColor}`}>
              {cell.checkIn}
            </span>
            {cell.checkOut && (
              <span className={`text-[9px] ${cfg.timeColor} opacity-80`}>
                {cell.checkOut}
              </span>
            )}
            {cell.lateMinutes > 0 && (
              <span className="text-[9px] font-bold text-amber-600">
                +{cell.lateMinutes}د
              </span>
            )}
          </div>
        ) : cell.status === "PRESENT" || cell.status === "REMOTE" ? (
          <div className="py-1 text-center">
            <span className={`text-[9px] font-bold ${cfg.timeColor}`}>
              {cfg.label}
            </span>
          </div>
        ) : (
          <div className="py-1 flex items-center justify-center">
            {cell.status !== "BEFORE_HIRE" && (
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block`} />
            )}
            {cell.status !== "BEFORE_HIRE" && cell.status !== "WEEKEND" && (
              <span className={`text-[9px] font-medium mr-1 ${cfg.timeColor}`}>
                {cfg.label}
              </span>
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      <Card className="border-none shadow-sm dark:bg-gray-800/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="dark:text-gray-300">الشهر</Label>
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
              <Label className="dark:text-gray-300">السنة</Label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-lg">
                <CardContent className="p-5">
                  <p className="text-emerald-100 text-sm font-medium">
                    نسبة الحضور
                  </p>
                  <h3 className="text-2xl font-bold mt-1">{attendanceRate}%</h3>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        حاضر
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                        {totals.present}
                      </h3>
                    </div>
                    <UserCheck className="h-8 w-8 text-emerald-500/20 dark:text-emerald-400/20" />
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        متأخر
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                        {totals.late}
                      </h3>
                    </div>
                    <Timer className="h-8 w-8 text-amber-500/20 dark:text-amber-400/20" />
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        غائب
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                        {totals.absent}
                      </h3>
                    </div>
                    <UserX className="h-8 w-8 text-rose-500/20 dark:text-rose-400/20" />
                  </div>
                </CardContent>
              </Card>
              <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        إجازات
                      </p>
                      <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                        {totals.leave}
                      </h3>
                    </div>
                    <CalendarOff className="h-8 w-8 text-blue-500/20 dark:text-blue-400/20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm border-none bg-white">
              <CardHeader className="border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-4">
                <CardTitle className="text-lg font-semibold dark:text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  كشف الحضور الشهري — {months[report.month - 1]} {report.year}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-3 border-b dark:border-gray-700">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالاسم أو رقم الموظف أو القسم..."
                    className="w-full max-w-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="border-collapse text-right w-full min-w-max">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <th
                          className="sticky right-0 bg-gray-50 dark:bg-gray-900/70 border-b border-l border-gray-200 dark:border-gray-700 p-2 z-10 min-w-[220px] text-right"
                          rowSpan={2}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm dark:text-white">
                              الموظف
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              حاضر / متأخر / غائب / إجازة
                            </span>
                          </div>
                        </th>
                        {report.days.map((d) => (
                          <th
                            key={d.day}
                            className={`border-b border-l border-gray-200 dark:border-gray-700 p-1 text-center min-w-[54px] ${
                              d.isHoliday
                                ? "bg-purple-50 dark:bg-purple-900/20"
                                : !d.isWorkingDay
                                  ? "bg-gray-100 dark:bg-gray-800"
                                  : "bg-gray-50 dark:bg-gray-900/50"
                            }`}
                          >
                            <span
                              className={`block text-[10px] font-semibold ${
                                d.isHoliday
                                  ? "text-purple-600 dark:text-purple-300"
                                  : !d.isWorkingDay
                                    ? "text-gray-400"
                                    : "text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {d.weekday}
                            </span>
                            <span
                              className={`block text-sm font-bold ${
                                d.isHoliday
                                  ? "text-purple-700 dark:text-purple-200"
                                  : !d.isWorkingDay
                                    ? "text-gray-400"
                                    : "text-gray-800 dark:text-gray-100"
                              }`}
                            >
                              {d.day}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <td className="sticky right-0 bg-white dark:bg-gray-800/95 border-b border-l border-gray-200 dark:border-gray-700 p-2 z-10 min-w-[220px]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm dark:text-gray-100">
                                  {emp.name}
                                </span>
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  #{emp.employeeNumber} • {emp.department}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 text-[10px] px-1.5 py-0"
                                >
                                  ح {emp.totals.present}
                                </Badge>
                                <div className="flex gap-1">
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${emp.totals.late > 0 ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800" : "text-gray-300 border-gray-100"}`}
                                  >
                                    ت {emp.totals.late}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${emp.totals.absent > 0 ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800" : "text-gray-300 border-gray-100"}`}
                                  >
                                    غ {emp.totals.absent}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${emp.totals.leave > 0 ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800" : "text-gray-300 border-gray-100"}`}
                                  >
                                    إ {emp.totals.leave}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </td>
                          {emp.cells.map((cell, idx) => renderCell(cell, report.days[idx] ?? { day: 0, date: "", weekday: "", isWorkingDay: true, isHoliday: false }))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    لا توجد بيانات للموظفين
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
};

export default AttendanceSheetReport;
