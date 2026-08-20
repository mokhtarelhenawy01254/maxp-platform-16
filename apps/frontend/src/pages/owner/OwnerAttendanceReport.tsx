import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserMinusIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  BriefcaseIcon,
  ChartBarIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface EmployeeAttendanceData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  company: {
    id: string;
    name: string;
    logo: string | null;
  };
  stats: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    totalRecords: number;
  };
}

interface AttendanceReportData {
  dateRange: { start: string; end: string };
  overview: {
    totalCompanies: number;
    totalEmployees: number;
    totalPresent: number;
    totalLate: number;
    totalAbsent: number;
    totalOnLeave: number;
  };
  byEmployee: EmployeeAttendanceData[];
}

const OwnerAttendanceReport: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<AttendanceReportData | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] =
    useState<string>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(
    new Set(),
  );
  const [sortBy, setSortBy] = useState<"name" | "attendance" | "company">(
    "attendance",
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    format: "pdf" as "pdf" | "excel",
    includeCharts: true,
    includeDetails: true,
    groupByCompany: false,
    showOnlyIssues: false,
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<string>("thisMonth");

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Start of current month
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "today":
        start = today;
        end = today;
        break;
      case "yesterday":
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case "beforeYesterday":
        start.setDate(today.getDate() - 2);
        end.setDate(today.getDate() - 2);
        break;
      case "lastWeek":
        start.setDate(today.getDate() - 7);
        end = today;
        break;
      case "lastMonth":
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end.setMonth(today.getMonth());
        end.setDate(0); // Last day of previous month
        break;
      case "thisMonth":
        start.setDate(1);
        end = today;
        break;
      default:
        return; // Custom
    }

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const backendUrl =
      import.meta.env["VITE_API_URL"]?.replace("/api/v1", "") ||
      "http://localhost:3007";
    return `${backendUrl}/${path.replace(/^\/+/, "")}`;
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("owner/reports/attendance", {
        params: { startDate, endDate },
      });
      if (response.data.success) {
        setReportData(response.data.data);
      } else {
        toast.error(response.data.message || i18n.t("OwnerAttendanceReport.failed_load_cef6"));
      }
    } catch (error) {
      console.error("Failed to fetch report", error);
      tToast.error("OwnerAttendanceReport.failed_load_cef6");
    } finally {
      setIsLoading(false);
    }
  };

  const companies = useMemo(() => {
    if (!reportData) return [];
    const seen = new Set();
    return reportData.byEmployee
      .map((item) => item.company)
      .filter((c) => {
        const duplicate = seen.has(c.id);
        seen.add(c.id);
        return !duplicate;
      });
  }, [reportData]);

  const filteredEmployees = useMemo(() => {
    if (!reportData) return [];
    let filtered = reportData.byEmployee.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        `${item.user.firstName} ${item.user.lastName}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCompany =
        selectedCompanyFilter === "all" ||
        item.company.id === selectedCompanyFilter;

      return matchesSearch && matchesCompany;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return `${a.user.firstName} ${a.user.lastName}`.localeCompare(
          `${b.user.firstName} ${b.user.lastName}`,
        );
      } else if (sortBy === "attendance") {
        const rateA =
          a.stats.totalRecords > 0
            ? ((a.stats.present + a.stats.late) / a.stats.totalRecords) * 100
            : 0;
        const rateB =
          b.stats.totalRecords > 0
            ? ((b.stats.present + b.stats.late) / b.stats.totalRecords) * 100
            : 0;
        return rateB - rateA;
      } else {
        return a.company.name.localeCompare(b.company.name);
      }
    });

    return filtered;
  }, [reportData, searchQuery, selectedCompanyFilter, sortBy]);

  const toggleEmployeeExpand = (employeeId: string) => {
    setExpandedEmployees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      if (!reportData) return;

      if (reportOptions.format === "pdf") {
        // Generate PDF Report
        await generatePDFReport();
      } else {
        // Generate Excel Report
        await generateExcelReport();
      }

      tToast.success("OwnerAttendanceReport.success_create_27b7");
      setShowReportModal(false);
    } catch (error) {
      console.error("Error generating report:", error);
      tToast.error("OwnerAttendanceReport.failed_create_878d");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generatePDFReport = async () => {
    // Create detailed HTML for PDF
    const reportHTML = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #4F46E5; padding-bottom: 20px; }
                    .header h1 { color: #4F46E5; margin: 0; }
                    .header p { color: #6B7280; margin: 5px 0; }
                    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                    .stat-card { background: #F3F4F6; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-card .label { font-size: 12px; color: #6B7280; }
                    .stat-card .value { font-size: 24px; font-weight: bold; color: #1F2937; }
                    .employee-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid; }
                    .employee-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .employee-name { font-size: 16px; font-weight: bold; color: #1F2937; }
                    .attendance-rate { font-size: 20px; font-weight: bold; }
                    .rate-excellent { color: #10B981; }
                    .rate-good { color: #F59E0B; }
                    .rate-poor { color: #EF4444; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px; }
                    .stat-box { text-align: center; padding: 8px; border-radius: 6px; }
                    .stat-box.present { background: #D1FAE5; color: #065F46; }
                    .stat-box.late { background: #FEF3C7; color: #92400E; }
                    .stat-box.absent { background: #FEE2E2; color: #991B1B; }
                    .stat-box.leave { background: #DBEAFE; color: #1E40AF; }
                    .company-badge { background: #EEF2FF; color: #4F46E5; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>تقرير حضور الموظفين</h1>
                    <p>الفترة: من ${startDate} إلى ${endDate}</p>
                    <p>تاريخ الإنشاء: ${new Date().toLocaleDateString("ar-EG")}</p>
                </div>
                
                ${
                  reportOptions.includeCharts
                    ? `
                <div class="stats">
                    <div class="stat-card">
                        <div class="label">إجمالي الموظفين</div>
                        <div class="value">${reportData.overview.totalEmployees}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">حاضر</div>
                        <div class="value" style="color: #10B981;">${reportData.overview.totalPresent}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">متأخر</div>
                        <div class="value" style="color: #F59E0B;">${reportData.overview.totalLate}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">غائب</div>
                        <div class="value" style="color: #EF4444;">${reportData.overview.totalAbsent}</div>
                    </div>
                </div>
                `
                    : ""
                }
                
                <h2 style="color: #4F46E5; margin-top: 30px;">تفاصيل الموظفين</h2>
                
                ${filteredEmployees
                  .filter((item) => {
                    if (!reportOptions.showOnlyIssues) return true;
                    const rate =
                      item.stats.totalRecords > 0
                        ? ((item.stats.present + item.stats.late) /
                            item.stats.totalRecords) *
                          100
                        : 0;
                    return rate < 80 || item.stats.absent > 2;
                  })
                  .map((item) => {
                    const attendanceRate =
                      item.stats.totalRecords > 0
                        ? Math.round(
                            ((item.stats.present + item.stats.late) /
                              item.stats.totalRecords) *
                              100,
                          )
                        : 0;
                    const rateClass =
                      attendanceRate >= 90
                        ? "rate-excellent"
                        : attendanceRate >= 75
                          ? "rate-good"
                          : "rate-poor";

                    return `
                        <div class="employee-card">
                            <div class="employee-header">
                                <div>
                                    <div class="employee-name">${item.user.firstName} ${item.user.lastName}</div>
                                    <div style="font-size: 12px; color: #6B7280;">${item.user.email}</div>
                                    <span class="company-badge">${item.company.name}</span>
                                </div>
                                <div class="attendance-rate ${rateClass}">${attendanceRate}%</div>
                            </div>
                            ${
                              reportOptions.includeDetails
                                ? `
                            <div class="stats-grid">
                                <div class="stat-box present">
                                    <div style="font-size: 18px; font-weight: bold;">${item.stats.present}</div>
                                    <div style="font-size: 11px;">حاضر</div>
                                </div>
                                <div class="stat-box late">
                                    <div style="font-size: 18px; font-weight: bold;">${item.stats.late}</div>
                                    <div style="font-size: 11px;">متأخر</div>
                                </div>
                                <div class="stat-box absent">
                                    <div style="font-size: 18px; font-weight: bold;">${item.stats.absent}</div>
                                    <div style="font-size: 11px;">غائب</div>
                                </div>
                                <div class="stat-box leave">
                                    <div style="font-size: 18px; font-weight: bold;">${item.stats.onLeave}</div>
                                    <div style="font-size: 11px;">إجازة</div>
                                </div>
                            </div>
                            `
                                : ""
                            }
                        </div>
                    `;
                  })
                  .join("")}
            </body>
            </html>
        `;

    // Create blob and download
    const blob = new Blob([reportHTML], { type: "text/html;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${startDate}-to-${endDate}.html`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const generateExcelReport = async () => {
    const headers = [
      "الموظف",
      "البريد الإلكتروني",
      "الشركة",
      "حاضر",
      "متأخر",
      "غائب",
      "في إجازة",
      "نسبة الحضور",
      "التقييم",
    ];
    const rows = filteredEmployees.map((item) => {
      const attendanceRate =
        item.stats.totalRecords > 0
          ? Math.round(
              ((item.stats.present + item.stats.late) /
                item.stats.totalRecords) *
                100,
            )
          : 0;
      const evaluation =
        attendanceRate >= 95
          ? "ممتاز"
          : attendanceRate >= 90
            ? "جيد جداً"
            : attendanceRate >= 80
              ? "جيد"
              : attendanceRate >= 70
                ? "متوسط"
                : "ضعيف";

      return [
        `${item.user.firstName} ${item.user.lastName}`,
        item.user.email,
        item.company.name,
        item.stats.present,
        item.stats.late,
        item.stats.absent,
        item.stats.onLeave,
        `${attendanceRate}%`,
        evaluation,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${startDate}-to-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      if (!reportData) return;

      const headers = [
        "الموظف",
        "البريد الإلكتروني",
        "الشركة",
        "حاضر",
        "متأخر",
        "غائب",
        "في إجازة",
        "نسبة الحضور",
      ];
      const rows = filteredEmployees.map((item) => {
        const attendanceRate =
          item.stats.totalRecords > 0
            ? Math.round(
                ((item.stats.present + item.stats.late) /
                  item.stats.totalRecords) *
                  100,
              )
            : 0;
        return [
          `${item.user.firstName} ${item.user.lastName}`,
          item.user.email,
          item.company.name,
          item.stats.present,
          item.stats.late,
          item.stats.absent,
          item.stats.onLeave,
          `${attendanceRate}%`,
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detailed-attendance-${startDate}-to-${endDate}.csv`;
      link.click();

      tToast.success("OwnerAttendanceReport.msg_6004");
    } catch (error) {
      tToast.error("OwnerAttendanceReport.msg_6657");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !reportData) {
    return (
      <div className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  const overview = reportData?.overview;

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="w-7 h-7 text-indigo-600" />
            تقرير حضور الموظفين
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            تتبُّع انضباط الموظفين في جميع شركاتك
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center justify-end">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 dark:text-white"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="beforeYesterday">أول أمس</option>
              <option value="lastWeek">آخر ٧ أيام</option>
              <option value="thisMonth">هذا الشهر</option>
              <option value="lastMonth">الشهر الماضي</option>
              <option value="custom">مخصص</option>
            </select>
            <div className="w-[1px] h-4 bg-gray-300 dark:bg-gray-600"></div>
            <CalendarDaysIcon className="w-5 h-5 text-gray-400 mx-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 dark:text-white"
            />
            <span className="text-gray-400">إلى</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedPreset("custom");
              }}
              className="bg-transparent border-none focus:ring-0 text-sm py-1 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
          >
            <DocumentChartBarIcon className="w-4 h-4" />
            إنشاء تقرير
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <p className="text-xs opacity-80">إجمالي الموظفين</p>
            <p className="text-2xl font-bold mt-1">{overview.totalEmployees}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
              <CheckCircleIcon className="w-4 h-4" /> حاضر
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              {overview.totalPresent}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-yellow-600 text-xs font-medium">
              <ClockIcon className="w-4 h-4" /> متأخر
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              {overview.totalLate}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
              <XCircleIcon className="w-4 h-4" /> غائب
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              {overview.totalAbsent}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-medium">
              <UserMinusIcon className="w-4 h-4" /> إجازة
            </div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              {overview.totalOnLeave}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex flex-col justify-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الشركات المشمولة
            </p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">
              {overview.totalCompanies}
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم الموظف أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="form-select w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">كل الشركات</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-40">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="form-select w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="attendance">حسب الانضباط</option>
              <option value="name">حسب الاسم</option>
              <option value="company">حسب الشركة</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            طريقة العرض:
          </span>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              بطاقات
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <TableCellsIcon className="w-4 h-4" />
              جدول
            </button>
          </div>
          <div className="flex-1"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            عرض{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {filteredEmployees.length}
            </span>{" "}
            موظف
          </span>
        </div>
      </div>

      {/* Employee Attendance - Cards View */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredEmployees.map((item) => {
            const attendanceRate =
              item.stats.totalRecords > 0
                ? Math.round(
                    ((item.stats.present + item.stats.late) /
                      item.stats.totalRecords) *
                      100,
                  )
                : 0;
            const isExpanded = expandedEmployees.has(item.user.id);

            return (
              <div
                key={`${item.user.id}-${item.company.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-600 shadow-md flex-shrink-0">
                      {item.user.avatar ? (
                        <img
                          src={getImageUrl(item.user.avatar) || ""}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                          {item.user.firstName?.charAt(0)}
                          {item.user.lastName?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                        {item.user.firstName} {item.user.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <EnvelopeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{item.user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
                            {item.company.logo ? (
                              <img
                                src={getImageUrl(item.company.logo) || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BuildingOfficeIcon className="w-full h-full text-gray-400" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            {item.company.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div
                        className={`text-2xl font-bold ${
                          attendanceRate >= 90
                            ? "text-green-600"
                            : attendanceRate >= 75
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {attendanceRate}%
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        معدل الانضباط
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body - Stats */}
                <div className="p-5">
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      <span>الحضور خلال الفترة</span>
                      <span className="text-gray-500">
                        {item.stats.totalRecords} يوم
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          attendanceRate >= 90
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : attendanceRate >= 75
                              ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                              : "bg-gradient-to-r from-red-500 to-red-600"
                        }`}
                        style={{ width: `${Math.min(100, attendanceRate)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-xl font-bold text-green-600">
                        {item.stats.present}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        حاضر
                      </div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                      <ClockIcon className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                      <div className="text-xl font-bold text-yellow-600">
                        {item.stats.late}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        متأخر
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                      <XCircleIcon className="w-5 h-5 text-red-600 mx-auto mb-1" />
                      <div className="text-xl font-bold text-red-600">
                        {item.stats.absent}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        غائب
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <UserMinusIcon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-xl font-bold text-blue-600">
                        {item.stats.onLeave}
                      </div>
                      <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        إجازة
                      </div>
                    </div>
                  </div>

                  {/* Expand Button */}
                  <button
                    onClick={() => toggleEmployeeExpand(item.user.id)}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-4 h-4" />
                        إخفاء التفاصيل
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-4 h-4" />
                        عرض المزيد من التفاصيل
                      </>
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            أيام الحضور الفعلي
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {item.stats.present + item.stats.late} يوم
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            أيام الغياب الكلي
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {item.stats.absent + item.stats.onLeave} يوم
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-2">
                          <ChartBarIcon className="w-4 h-4" />
                          تقييم الأداء
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {attendanceRate >= 95
                            ? "🌟 أداء ممتاز - موظف ملتزم جداً"
                            : attendanceRate >= 90
                              ? "✅ أداء جيد جداً - التزام عالي"
                              : attendanceRate >= 80
                                ? "👍 أداء جيد - التزام مقبول"
                                : attendanceRate >= 70
                                  ? "⚠️ أداء متوسط - يحتاج متابعة"
                                  : "❌ أداء ضعيف - يحتاج تحسين فوري"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredEmployees.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                لا توجد بيانات حضور للمرشحات المختارة
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الموظف
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الشركة
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider lg:w-20">
                    حاضر
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider lg:w-20">
                    متأخر
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider lg:w-20">
                    غائب
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider lg:w-20">
                    إجازة
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    معدل الانضباط
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEmployees.map((item) => {
                  const attendanceRate =
                    item.stats.totalRecords > 0
                      ? Math.round(
                          ((item.stats.present + item.stats.late) /
                            item.stats.totalRecords) *
                            100,
                        )
                      : 0;

                  return (
                    <tr
                      key={`${item.user.id}-${item.company.id}`}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center overflow-hidden border border-white dark:border-gray-700 shadow-sm">
                            {item.user.avatar ? (
                              <img
                                src={getImageUrl(item.user.avatar) || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                                {item.user.firstName?.charAt(0)}
                                {item.user.lastName?.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {item.user.firstName} {item.user.lastName}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                              <EnvelopeIcon className="w-3 h-3" />
                              {item.user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                          <div className="w-5 h-5 rounded overflow-hidden">
                            {item.company.logo ? (
                              <img
                                src={getImageUrl(item.company.logo) || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BuildingOfficeIcon className="w-full h-full text-gray-400 p-0.5" />
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                            {item.company.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md text-sm">
                          {item.stats.present}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-yellow-600 font-bold bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-md text-sm">
                          {item.stats.late}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-red-600 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md text-sm">
                          {item.stats.absent}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md text-sm">
                          {item.stats.onLeave}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[140px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span
                              className={
                                attendanceRate >= 90
                                  ? "text-green-600"
                                  : attendanceRate >= 75
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }
                            >
                              {attendanceRate}%
                            </span>
                            <span className="text-gray-400">
                              {item.stats.totalRecords} أيام
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                attendanceRate >= 90
                                  ? "bg-green-500"
                                  : attendanceRate >= 75
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(100, attendanceRate)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredEmployees.length === 0 && (
            <div className="py-20 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد بيانات حضور للمرشحات المختارة
              </p>
            </div>
          )}
        </div>
      )}

      {/* Report Generation Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <DocumentChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      إنشاء تقرير مفصل
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1">
                      اختر إعدادات التقرير المطلوب
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Report Format */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  صيغة التقرير
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      setReportOptions({ ...reportOptions, format: "pdf" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      reportOptions.format === "pdf"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    <DocumentTextIcon
                      className={`w-8 h-8 mx-auto mb-2 ${
                        reportOptions.format === "pdf"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="font-bold text-gray-900 dark:text-white">
                      PDF / HTML
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      تقرير مفصل بالتصميم
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      setReportOptions({ ...reportOptions, format: "excel" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      reportOptions.format === "excel"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                    }`}
                  >
                    <DocumentChartBarIcon
                      className={`w-8 h-8 mx-auto mb-2 ${
                        reportOptions.format === "excel"
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="font-bold text-gray-900 dark:text-white">
                      Excel / CSV
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      جدول بيانات
                    </div>
                  </button>
                </div>
              </div>

              {/* Report Options */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  خيارات التقرير
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeCharts}
                    onChange={(e) =>
                      setReportOptions({
                        ...reportOptions,
                        includeCharts: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      تضمين الإحصائيات العامة
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      عرض ملخص الحضور في بداية التقرير
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={reportOptions.includeDetails}
                    onChange={(e) =>
                      setReportOptions({
                        ...reportOptions,
                        includeDetails: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      تضمين التفاصيل الكاملة
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      عرض جميع أرقام الحضور لكل موظف
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={reportOptions.groupByCompany}
                    onChange={(e) =>
                      setReportOptions({
                        ...reportOptions,
                        groupByCompany: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      تجميع حسب الشركة
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      تنظيم الموظفين حسب شركاتهم
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors border border-yellow-200 dark:border-yellow-900/30">
                  <input
                    type="checkbox"
                    checked={reportOptions.showOnlyIssues}
                    onChange={(e) =>
                      setReportOptions({
                        ...reportOptions,
                        showOnlyIssues: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      عرض المشاكل فقط
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      إظهار الموظفين ذوي الأداء الضعيف فقط (أقل من 80%)
                    </div>
                  </div>
                </label>
              </div>

              {/* Report Info */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-900/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CalendarDaysIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-indigo-900 dark:text-indigo-300 mb-1">
                      نطاق التقرير
                    </div>
                    <div className="text-sm text-indigo-700 dark:text-indigo-400">
                      من <span className="font-bold">{startDate}</span> إلى{" "}
                      <span className="font-bold">{endDate}</span>
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                      سيتم تضمين{" "}
                      <span className="font-bold">
                        {filteredEmployees.length}
                      </span>{" "}
                      موظف في التقرير
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-6 rounded-b-2xl border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingReport ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <DocumentChartBarIcon className="w-5 h-5" />
                      إنشاء التقرير
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerAttendanceReport;
