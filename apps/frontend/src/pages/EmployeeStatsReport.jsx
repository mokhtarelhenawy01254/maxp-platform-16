import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../hooks/useAuthSimple";
import tokenManager from "../utils/tokenManager";
import { getApiUrl } from "../config/environment";
import { exportToExcel } from "../utils/exportHelpers";
import { cn } from "../lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  User,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Download,
  Search,
  ArrowUpDown,
  Filter,
  Send,
  Package,
} from "lucide-react";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const formatDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayRange = () => {
  const now = new Date();
  const todayStr = formatDate(now);
  return { startDate: todayStr, endDate: todayStr };
};

const EmployeeStatsReport = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [statistics, setStatistics] = useState([]);
  const [totalUniqueConversations, setTotalUniqueConversations] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [dateRange, setDateRange] = useState(getTodayRange);
  const [customDates, setCustomDates] = useState(getTodayRange);
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting
  const [sortKey, setSortKey] = useState("conversationsCount");
  const [sortOrder, setSortOrder] = useState("desc");

  const calculateDateRange = useCallback((period) => {
    const now = new Date();
    if (period === "all") return { startDate: "", endDate: "" };

    if (period === "today") {
      const todayStr = formatDate(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (period === "yesterday") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yStr = formatDate(y);
      return { startDate: yStr, endDate: yStr };
    }
    if (period === "last7days") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return { startDate: formatDate(start), endDate: formatDate(now) };
    }
    if (period === "last30days") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return { startDate: formatDate(start), endDate: formatDate(now) };
    }
    if (period === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDate(start), endDate: formatDate(now) };
    }
    if (period === "lastMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    const todayStr = formatDate(now);
    return { startDate: todayStr, endDate: todayStr };
  }, []);

  const fetchStatistics = useCallback(
    async (overrideDates = null) => {
      const companyId = user?.companyId;
      if (!companyId) return;

      const activeRange = overrideDates || dateRange;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activeRange.startDate) params.append("startDate", activeRange.startDate);
        if (activeRange.endDate) params.append("endDate", activeRange.endDate);
        if (selectedChannel && selectedChannel !== "all") {
          params.append("channel", selectedChannel);
        }
        params.append("activeOnly", "true");

        const headers = tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
          "X-Company-Id": companyId,
        });

        const r = await fetch(
          `${getApiUrl()}/companies/${companyId}/users/statistics?${params.toString()}`,
          { headers }
        );

        const d = await r.json();
        if (d.success) {
          setStatistics(d.data.statistics || []);
          setTotalUniqueConversations(d.data.totalUniqueConversations || 0);
        } else {
          setError(d.message || t("employeeStatsReport.fetchError", "فشل في جلب الإحصائيات"));
        }
      } catch (err) {
        setError(t("employeeStatsReport.errorOccurred", "حدث خطأ أثناء تحميل البيانات"));
      } finally {
        setLoading(false);
      }
    },
    [user?.companyId, dateRange, selectedChannel, t]
  );

  // Period change handler
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      const newRange = calculateDateRange(period);
      setDateRange(newRange);
      fetchStatistics(newRange);
    }
  };

  // Custom date submit handler
  const handleCustomDateSubmit = () => {
    if (!customDates.startDate || !customDates.endDate) return;
    setDateRange(customDates);
    fetchStatistics(customDates);
  };

  // Initial load
  useEffect(() => {
    if (user?.companyId) {
      fetchStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId, selectedChannel]);

  // Single source of truth: Active employees definition
  // تعريف «نشط» = (conversationsCount > 0) أو (messagesCount > 0) — الموظف اللي رد فعلًا.
  // وأي موظف كل أرقامه صفر يتشال من التقرير بالكامل (الجدول والعدّاد والتصدير والشارتات)
  const activeEmployees = useMemo(() => {
    return (statistics || []).filter(
      (st) => (st.conversationsCount || 0) > 0 || (st.messagesCount || 0) > 0
    );
  }, [statistics]);

  // Totals calculations (Correct weighted arithmetic for active employees)
  const totals = useMemo(() => {
    const conversations = activeEmployees.reduce((s, st) => s + (st.conversationsCount || 0), 0);
    const messages = activeEmployees.reduce((s, st) => s + (st.messagesCount || 0), 0);
    const orders = activeEmployees.reduce((s, st) => s + (st.ordersCount || 0), 0);
    const pieces = activeEmployees.reduce((s, st) => s + (st.piecesCount || 0), 0);
    const revenue = activeEmployees.reduce((s, st) => s + (st.totalRevenue || 0), 0);
    const converted = activeEmployees.reduce((s, st) => s + (st.convertedConversations || 0), 0);

    const conversion =
      conversations > 0
        ? ((Math.min(converted > 0 ? converted : orders, conversations) / conversations) * 100).toFixed(1)
        : "0.0";

    return {
      conversations,
      uniqueConversations: totalUniqueConversations || conversations,
      messages,
      orders,
      pieces,
      revenue: Math.round(revenue),
      conversion,
    };
  }, [activeEmployees, totalUniqueConversations]);

  // Filtering & Sorting (Search by name/email operates strictly within active employees)
  const filteredAndSortedStatistics = useMemo(() => {
    return activeEmployees
      .filter((st) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const fullName = `${st.firstName || ""} ${st.lastName || ""}`.toLowerCase();
        const email = (st.email || "").toLowerCase();
        return fullName.includes(term) || email.includes(term);
      })
      .sort((a, b) => {
        let valA = a[sortKey] ?? 0;
        let valB = b[sortKey] ?? 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (sortOrder === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [activeEmployees, searchTerm, sortKey, sortOrder]);

  // Sort toggle handler
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  // Export to Excel (Exports the exact visible rows from the active set)
  const handleExport = () => {
    if (filteredAndSortedStatistics.length === 0) return;

    const exportColumns = [
      { key: "employeeName", label: "اسم الموظف" },
      { key: "email", label: "البريد الإلكتروني" },
      { key: "role", label: "الرتبة" },
      { key: "conversationsCount", label: "المحادثات" },
      { key: "messagesCount", label: "الرسائل المرسلة" },
      { key: "ordersCount", label: "عدد الطلبات" },
      { key: "piecesCount", label: t("employeeStatsReport.piecesCount", "عدد القطع") },
      { key: "totalRevenue", label: "إجمالي المبيعات (ج.م)" },
      { key: "conversionRate", label: "نسبة التحويل (%)" },
    ];

    const exportData = filteredAndSortedStatistics.map((st) => ({
      employeeName: `${st.firstName || ""} ${st.lastName || ""}`.trim() || st.email,
      email: st.email,
      role: st.role,
      conversationsCount: st.conversationsCount || 0,
      messagesCount: st.messagesCount || 0,
      ordersCount: st.ordersCount || 0,
      piecesCount: st.piecesCount || 0,
      totalRevenue: st.totalRevenue || 0,
      conversionRate: `${st.conversionRate || 0}%`,
    }));

    exportToExcel(
      exportData,
      exportColumns,
      `تقرير_إحصائيات_الموظفين_${dateRange.startDate || "all"}_${dateRange.endDate || "all"}.xlsx`,
      "تقرير الموظفين"
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <BarChart3 className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {t("employeeStatsReport.employeePageTitle", "تقارير أداء الموظفين")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {filteredAndSortedStatistics.length} موظف نشط
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              مؤشرات إنتاجية الفريق ومعدلات التحويل وحجم المبيعات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredAndSortedStatistics.length === 0}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("employeeStatsReport.export", "تصدير Excel")}</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
        {/* Total Employees */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">فريق العمل</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {searchTerm.trim() ? filteredAndSortedStatistics.length : activeEmployees.length}
            </span>
          </div>
        </div>

        {/* Unique Conversations */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المحادثات</span>
            <span className="size-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-primary">
              {totals.uniqueConversations}
            </span>
          </div>
        </div>

        {/* Total Messages Sent */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الرسائل</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {totals.messages}
            </span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الطلبات</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {totals.orders}
            </span>
          </div>
        </div>

        {/* Total Pieces */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">القطع</span>
            <span className="size-1.5 rounded-full bg-teal-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-teal-600 dark:text-teal-400">
              {totals.pieces?.toLocaleString() || 0}
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المبيعات</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {totals.revenue.toLocaleString()} <span className="text-xs font-sans text-muted-foreground font-normal">ج.م</span>
            </span>
          </div>
        </div>

        {/* Avg Conversion Rate */}
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">التحويل</span>
            <span className="size-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
              {totals.conversion}%
            </span>
          </div>
        </div>
      </div>

      {/* Streamlined Filter Control Bar */}
      <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
          {/* Period Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              {t("employeeStatsReport.periodPlaceholder", "الفترة الزمنية")}
            </label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder={t("employeeStatsReport.periodPlaceholder", "الفترة")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t("employeeStatsReport.today", "اليوم")}</SelectItem>
                <SelectItem value="yesterday">{t("employeeStatsReport.yesterday", "أمس")}</SelectItem>
                <SelectItem value="last7days">{t("employeeStatsReport.last7Days", "آخر 7 أيام")}</SelectItem>
                <SelectItem value="last30days">{t("employeeStatsReport.last30Days", "آخر 30 يوم")}</SelectItem>
                <SelectItem value="thisMonth">{t("employeeStatsReport.thisMonth", "الشهر الحالي")}</SelectItem>
                <SelectItem value="lastMonth">{t("employeeStatsReport.lastMonth", "الشهر السابق")}</SelectItem>
                <SelectItem value="all">{t("employeeStatsReport.allTime", "كل الأوقات")}</SelectItem>
                <SelectItem value="custom">{t("employeeStatsReport.custom", "فترة مخصصة")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="size-3" />
              <span>القناة</span>
            </label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="h-8 text-xs font-mono">
                <SelectValue placeholder="جميع القنوات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع القنوات</SelectItem>
                <SelectItem value="whatsapp">واتساب (WhatsApp)</SelectItem>
                <SelectItem value="facebook">فيسبوك (Messenger)</SelectItem>
                <SelectItem value="instagram">إنستجرام (Instagram)</SelectItem>
                <SelectItem value="telegram">تليجرام (Telegram)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Dates (if selected) */}
          {selectedPeriod === "custom" && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">من</label>
                <Input
                  type="date"
                  className="h-8 text-xs font-mono"
                  value={customDates.startDate}
                  onChange={(e) =>
                    setCustomDates((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">إلى</label>
                <Input
                  type="date"
                  className="h-8 text-xs font-mono"
                  value={customDates.endDate}
                  onChange={(e) =>
                    setCustomDates((p) => ({ ...p, endDate: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          {/* Search Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Search className="size-3" />
              <span>بحث بالموظف</span>
            </label>
            <Input
              placeholder="ابحث بالاسم أو البريد..."
              className="h-8 text-xs font-mono"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Update / Refresh Button */}
          <div>
            <Button
              onClick={() => {
                if (selectedPeriod === "custom") {
                  handleCustomDateSubmit();
                } else {
                  fetchStatistics();
                }
              }}
              disabled={loading}
              className="w-full h-8 text-xs active:scale-[0.98] transition-transform"
            >
              {loading ? <LoadingSpinner size="sm" /> : <BarChart3 className="size-3.5 me-1.5" />}
              {t("employeeStatsReport.updateStats", "تحديث الإحصائيات")}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <span>
                {t("employeeStatsReport.employeeStats", "إحصائيات الموظفين")} (
                {filteredAndSortedStatistics.length})
              </span>
            </div>
            {searchTerm && (
              <Badge variant="outline" className="text-xs font-normal">
                نتائج البحث عن: "{searchTerm}"
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && statistics.length === 0 ? (
            <div className="flex justify-center items-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <User className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-base font-semibold text-foreground">
                {t("employeeStatsReport.noActiveEmployees", "مفيش موظفين عندهم نشاط في الفترة دي")}
              </p>
              <p className="text-xs mt-1.5 max-w-md mx-auto text-muted-foreground">
                {t(
                  "employeeStatsReport.noActiveSubtext",
                  "لم يقم أي موظف بالرد على محادثات أو إرسال رسائل خلال الفترة المحددة. جرب تغيير الفترة الزمنية أو اختيار \"كل الأوقات\"."
                )}
              </p>
            </div>
          ) : filteredAndSortedStatistics.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-base font-semibold text-foreground">
                {t("employeeStatsReport.noSearchResults", "لا توجد نتائج مطابقة للبحث")} "{searchTerm}"
              </p>
              <p className="text-xs mt-1.5 max-w-md mx-auto text-muted-foreground">
                {t(
                  "employeeStatsReport.noSearchResultsSubtext",
                  "لا يوجد موظف نشط يطابق كلمة البحث الحالية ضمن الفترة المختارة."
                )}
              </p>
            </div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("firstName")}
                    >
                      <div className="flex items-center gap-1">
                        <span>{t("employeeStatsReport.employee", "الموظف")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("conversationsCount")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{t("employeeStatsReport.conversationsCount", "المحادثات")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("messagesCount")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{t("employeeStatsReport.messagesCount", "الرسائل المرسلة")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("ordersCount")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{t("employeeStatsReport.ordersCount", "الطلبات")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("piecesCount")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{t("employeeStatsReport.piecesCount", "عدد القطع")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("totalRevenue")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>إجمالي المبيعات</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>

                    <TableHead
                      className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("conversionRate")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{t("employeeStatsReport.conversionRate", "نسبة التحويل")}</span>
                        <ArrowUpDown className="size-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedStatistics.map((st) => (
                    <TableRow key={st.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-muted flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden">
                            {st.avatar ? (
                              <img
                                src={st.avatar}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : st.firstName ? (
                              st.firstName.charAt(0).toUpperCase()
                            ) : (
                              <User className="size-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {st.firstName || st.lastName
                                ? `${st.firstName || ""} ${st.lastName || ""}`.trim()
                                : st.email}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{st.email}</p>
                              {st.role && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                  {st.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-bold text-primary text-base tabular-nums">
                        {st.conversationsCount}
                      </TableCell>

                      <TableCell className="text-center font-semibold text-base tabular-nums">
                        {st.messagesCount}
                      </TableCell>

                      <TableCell className="text-center font-bold text-emerald-600 text-base tabular-nums">
                        {st.ordersCount || 0}
                      </TableCell>

                      <TableCell className="text-center font-bold text-teal-600 dark:text-teal-400 text-base tabular-nums">
                        {st.piecesCount || 0}
                      </TableCell>

                      <TableCell className="text-center font-mono font-semibold text-sm tabular-nums">
                        {(st.totalRevenue || 0).toLocaleString()} ج.م
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant={
                            st.conversionRate >= 30
                              ? "default"
                              : st.conversionRate >= 15
                              ? "secondary"
                              : "outline"
                          }
                          className="font-mono text-xs tabular-nums"
                        >
                          {st.conversionRate || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
        </CardContent>
      </Card>

      {/* Visual Analytics & Charts */}
      {activeEmployees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">
                {t("employeeStatsReport.conversationsPerEmployee", "عدد المحادثات لكل موظف")} (Top{" "}
                {Math.min(activeEmployees.length, 10)})
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={activeEmployees.slice(0, 10).map((st) => ({
                    name: `${st.firstName || ""} ${st.lastName || ""}`.trim() || st.email,
                    conversations: st.conversationsCount,
                    orders: st.ordersCount,
                  }))}
                  margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    angle={-25}
                    textAnchor="end"
                    height={50}
                    interval={0}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    dataKey="conversations"
                    fill="#3b82f6"
                    name={t("employeeStatsReport.conversationsChart", "المحادثات")}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="orders"
                    fill="#10b981"
                    name="الطلبات"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart (1:1 cell matching) */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">
                {t("employeeStatsReport.conversationsDistribution", "توزيع المحادثات بين الموظفين")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activeEmployees
                      .filter((st) => (st.conversationsCount || 0) > 0)
                      .map((st) => ({
                        name: `${st.firstName || ""} ${st.lastName || ""}`.trim() || st.email,
                        value: st.conversationsCount,
                      }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                    }
                    outerRadius={95}
                    dataKey="value"
                  >
                    {activeEmployees.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.userId}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmployeeStatsReport;
