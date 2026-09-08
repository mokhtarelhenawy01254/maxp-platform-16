import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { User, BarChart3, MessageSquare, ShoppingCart, TrendingUp } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#4ECDC4"];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [dateRange, setDateRange] = useState(getTodayRange);

  const dateRangeRef = useRef(dateRange);
  dateRangeRef.current = dateRange;

  const calculateDateRange = useCallback((period) => {
    const now = new Date();
    if (period === "custom") return dateRangeRef.current;
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

  useEffect(() => {
    if (selectedPeriod !== "custom") {
      setDateRange(calculateDateRange(selectedPeriod));
    }
  }, [selectedPeriod, calculateDateRange]);

  const fetchStatistics = useCallback(async () => {
    const companyId = user?.companyId;
    if (!companyId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append("startDate", dateRange.startDate);
      if (dateRange.endDate) params.append("endDate", dateRange.endDate);

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
      } else {
        setError(d.message || t("employeeStatsReport.fetchError"));
      }
    } catch (err) {
      setError(t("employeeStatsReport.errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, dateRange, t]);

  useEffect(() => {
    if (user?.companyId) {
      fetchStatistics();
    }
  }, [fetchStatistics, user?.companyId]);

  const totals = {
    conversations: statistics.reduce((s, st) => s + (st.conversationsCount || 0), 0),
    messages: statistics.reduce((s, st) => s + (st.messagesCount || 0), 0),
    orders: statistics.reduce((s, st) => s + (st.ordersCount || 0), 0),
    conversion:
      statistics.length > 0
        ? (
            statistics.reduce((s, st) => s + (st.conversionRate || 0), 0) /
            statistics.length
          ).toFixed(1)
        : 0,
  };

  if (loading && statistics.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          {t("employeeStatsReport.employeePageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("employeeStatsReport.employeePageSubtitle")}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("employeeStatsReport.periodPlaceholder")}
              </label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder={t("employeeStatsReport.periodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t("employeeStatsReport.today")}</SelectItem>
                  <SelectItem value="yesterday">{t("employeeStatsReport.yesterday")}</SelectItem>
                  <SelectItem value="last7days">{t("employeeStatsReport.last7Days")}</SelectItem>
                  <SelectItem value="last30days">{t("employeeStatsReport.last30Days")}</SelectItem>
                  <SelectItem value="thisMonth">{t("employeeStatsReport.thisMonth")}</SelectItem>
                  <SelectItem value="lastMonth">{t("employeeStatsReport.lastMonth")}</SelectItem>
                  <SelectItem value="all">{t("employeeStatsReport.allTime", "كل الأوقات")}</SelectItem>
                  <SelectItem value="custom">{t("employeeStatsReport.custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">من</label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">إلى</label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
              </>
            )}

            <Button onClick={fetchStatistics} disabled={loading} className="w-full">
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <BarChart3 className="size-4 me-2" />
              )}
              {t("employeeStatsReport.updateStats")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("employeeStatsReport.totalEmployees")}
                </p>
                <p className="text-2xl font-bold mt-1">{statistics.length}</p>
              </div>
              <div className="size-10 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center">
                <User className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("employeeStatsReport.totalConversations")}
                </p>
                <p className="text-2xl font-bold mt-1 text-primary">{totals.conversations}</p>
              </div>
              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("employeeStatsReport.totalOrders")}
                </p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{totals.orders}</p>
              </div>
              <div className="size-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
                <ShoppingCart className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t("employeeStatsReport.avgConversionRate")}
                </p>
                <p className="text-2xl font-bold mt-1">{totals.conversion}%</p>
              </div>
              <div className="size-10 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            {t("employeeStatsReport.employeeStats")} ({statistics.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statistics.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <User className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">
                {t("employeeStatsReport.noData", "لا توجد إحصائيات للموظفين في هذه الفترة")}
              </p>
              <p className="text-xs mt-1">
                عندما يقوم الموظفون بالرد على رسائل العملاء في الماسنجر ستظهر إحصائياتهم هنا تلقائياً.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("employeeStatsReport.employee")}</TableHead>
                    <TableHead className="text-center">
                      {t("employeeStatsReport.conversationsCount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("employeeStatsReport.messagesCount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("employeeStatsReport.ordersCount")}
                    </TableHead>
                    <TableHead className="text-center">
                      {t("employeeStatsReport.conversionRate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.map((st) => (
                    <TableRow key={st.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-muted flex items-center justify-center font-semibold text-xs">
                            {st.firstName ? st.firstName.charAt(0).toUpperCase() : <User className="size-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {st.firstName || st.lastName
                                ? `${st.firstName || ""} ${st.lastName || ""}`.trim()
                                : st.email}
                            </p>
                            <p className="text-xs text-muted-foreground">{st.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary text-base">
                        {st.conversationsCount}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-base">
                        {st.messagesCount}
                      </TableCell>
                      <TableCell className="text-center font-bold text-emerald-600 text-base">
                        {st.ordersCount || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            st.conversionRate >= 50
                              ? "default"
                              : st.conversionRate >= 25
                              ? "secondary"
                              : "outline"
                          }
                          className="font-mono text-xs"
                        >
                          {st.conversionRate || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {statistics.length > 0 && totals.conversations > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">
                {t("employeeStatsReport.conversationsPerEmployee")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={statistics.map((st) => ({
                    name: `${st.firstName || ""} ${st.lastName || ""}`.trim() || st.email,
                    conversations: st.conversationsCount,
                  }))}
                  margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} interval={0} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    dataKey="conversations"
                    fill="#3b82f6"
                    name={t("employeeStatsReport.conversationsChart")}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">
                {t("employeeStatsReport.conversationsDistribution")}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statistics
                      .filter((st) => st.conversationsCount > 0)
                      .map((st, i) => ({
                        name: `${st.firstName || ""} ${st.lastName || ""}`.trim() || st.email,
                        value: st.conversationsCount,
                        fill: COLORS[i % COLORS.length],
                      }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                    }
                    outerRadius={90}
                    dataKey="value"
                  >
                    {statistics.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
