import { Activity as ChartBarIcon, Check as CheckCircleIcon, X as XCircleIcon, RefreshCw as ArrowPathIcon, AlertTriangle as ExclamationTriangleIcon, MessageSquare as ChatBubbleLeftRightIcon, Circle as UserGroupIcon, Circle as ArrowTrendingUpIcon, Circle as ArrowTrendingDownIcon, Minus as MinusIcon, Clock as ClockIcon, Circle as CalendarDaysIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuthSimple';
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
;
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

import PieChart from "../../components/charts/PieChart";
import BarChart from "../../components/charts/BarChart";
import DataTable from "../../components/tables/DataTable";
import DateRangePicker from "../../components/filters/DateRangePicker";
import ExportButtons from "../../components/export/ExportButtons";
import { ExportColumn } from "../../utils/exportHelpers";
import BestHourCard from "../../components/stats/BestHourCard";
import BestDayCard from "../../components/stats/BestDayCard";

interface SentMessagesStatsData {
  summary: {
    messages: {
      totalSent: number;
      totalSaved: number;
      totalIgnored: number;
      savedPercentage: number;
      ignoredPercentage: number;
      conversionRate: number;
    };
    conversations: {
      reached: number;
      ignored: number;
      created: number;
      existed: number;
      total: number;
    };
    revenue: {
      totalRevenue: number;
      totalOrderCount: number;
      avgRevenuePerMessage: number;
      avgRevenuePerConversation: number;
    };
  };
  dailyStats: Array<{
    date: string;
    saved: number;
    ignored: number;
    total: number;
    conversationsCreated: number;
    conversationsExisted: number;
    conversationsIgnored: number;
    savedReach: number;
    ignoredReach: number;
    revenue: number;
    orderCount: number;
  }>;
  hourlyStats?: Array<{
    hour: number;
    count: number;
    saved: number;
    ignored: number;
    revenue: number;
    orderCount: number;
  }>;
  weekdayStats?: Array<{
    day: number;
    dayName: string;
    count: number;
  }>;
  pageStats: Array<{
    pageId: string;
    pageName: string;
    count: number;
    percentage?: number;
  }>;
  comparison?: {
    previousPeriod: {
      from: string;
      to: string;
      totalSent: number;
      totalSaved: number;
      totalRevenue?: number;
    };
    changes: {
      sentChange: number;
      savedChange: number;
      revenueChange: number;
      sentTrend: "up" | "down" | "stable";
      savedTrend: "up" | "down" | "stable";
      revenueTrend: "up" | "down" | "stable";
    };
  };
  period: {
    from: string;
    to: string;
  };
}

const SentMessagesStats: React.FC = () => {
  const { t, i18n } = useTranslation();
  // const { user } = useAuth(); // Unused
  const [stats, setStats] = useState<SentMessagesStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter states
  const [period, setPeriod] = useState<string>("1d");
  const [customDateRange, setCustomDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [messageStatusFilter, setMessageStatusFilter] = useState<string>("all");
  const [conversationStatusFilter, setConversationStatusFilter] =
    useState<string>("all");

  // UI states
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval] = useState<number>(60000); // 1 minute
  const [activeTab, setActiveTab] = useState<
    "overview" | "charts" | "tables" | "comparison"
  >("overview");
  const [availablePages, setAvailablePages] = useState<
    { pageId: string; pageName: string }[]
  >([]);

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    const fetchPages = async () => {
      if (!token) return;
      try {
        const response = await fetch(
          buildApiUrl("integrations/facebook/connected"),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = await response.json();
        if (data.success && Array.isArray(data.pages)) {
          setAvailablePages(data.pages);
        }
      } catch (err) {
        console.error("Failed to fetch pages", err);
      }
    };
    fetchPages();
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = tokenManager.createAuthHeaders({
        "Content-Type": "application/json",
      });

      // Build query parameters
      const params = new URLSearchParams();

      if (customDateRange.start && customDateRange.end) {
        params.append("startDate", customDateRange.start.toISOString());
        params.append("endDate", customDateRange.end.toISOString());
      } else {
        params.append("period", period);
      }

      if (selectedPages.length > 0) {
        params.append("pageIds", selectedPages.join(","));
      }

      if (messageStatusFilter !== "all") {
        params.append("messageStatus", messageStatusFilter);
      }

      if (conversationStatusFilter !== "all") {
        params.append("conversationStatus", conversationStatusFilter);
      }

      const response = await fetch(
        buildApiUrl(`conversations/stats/sent-messages?${params.toString()}`),
        { headers },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || t("sentMessagesStats.fetchError"));
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || t("sentMessagesStats.fetchError"));
      }
    } catch (err: unknown) {
      console.error("Error fetching sent messages stats:", err);
      setError(
        err instanceof Error ? err.message : t("sentMessagesStats.errorOccurred"),
      );
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [
    conversationStatusFilter,
    customDateRange,
    messageStatusFilter,
    period,
    selectedPages,
    t,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh effect
  // Use a ref to hold the latest fetchStats function to avoid stale closures in setInterval
  const fetchStatsRef = useRef(fetchStats);

  // Update ref on every render so it always points to the latest closure
  useEffect(() => {
    fetchStatsRef.current = fetchStats;
  }, [fetchStats]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      // Call the function via ref to get the latest closure
      intervalId = setInterval(() => {
        fetchStatsRef.current();
      }, refreshInterval);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);

  const handleDateChange = (
    startDate: Date | null,
    endDate: Date | null,
    selectedPeriod: string,
  ) => {
    if (selectedPeriod === "custom" && startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
      setPeriod("custom");
    } else {
      setCustomDateRange({ start: null, end: null });
      setPeriod(selectedPeriod);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return (
          <ArrowTrendingUpIcon className="w-5 h-5 business-text-success" />
        );
      case "down":
        return (
          <ArrowTrendingDownIcon className="w-5 h-5 business-text-danger" />
        );
      default:
        return <MinusIcon className="w-5 h-5 business-text-subtle" />;
    }
  };

  const pieChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("sentMessagesStats.saved"), value: stats.summary.messages.totalSaved },
      { name: t("sentMessagesStats.ignored"), value: stats.summary.messages.totalIgnored },
    ];
  }, [stats, t]);

  const hourlyChartData = useMemo(() => {
    if (!stats?.hourlyStats) return [];
    return stats.hourlyStats.map((hour) => ({
      hour: `${hour.hour}:00`,
      count: hour.count,
      saved: hour.saved,
      ignored: hour.ignored,
      revenue: hour.revenue,
    }));
  }, [stats]);

  // Prepare table data
  const dailyTableColumns: ExportColumn[] = [
    { key: "date", label: t("sentMessagesStats.date") },
    { key: "total", label: t("sentMessagesStats.totalAttempts") },
    { key: "savedReach", label: t("sentMessagesStats.reachedConversations") },
    { key: "ignoredReach", label: t("sentMessagesStats.ignoredConversationsShort") },
    { key: "conversationsCreated", label: t("sentMessagesStats.new") },
    { key: "conversationsExisted", label: t("sentMessagesStats.existing") },
  ];

  const pageTableColumns: ExportColumn[] = [
    { key: "pageName", label: t("sentMessagesStats.pageName") },
    { key: "count", label: t("sentMessagesStats.messageCount") },
    { key: "percentage", label: t("sentMessagesStats.percentage") },
  ];

  const dailyTableData = useMemo(() => {
    if (!stats?.dailyStats) return [];
    return stats.dailyStats.map((day) => ({
      ...day,
      date: formatDate(day.date),
    }));
  }, [stats]);

  const pageTableData = useMemo(() => {
    if (!stats?.pageStats) return [];
    return stats.pageStats.map((page) => ({
      ...page,
      percentage: page.percentage ? `${page.percentage}%` : "0%",
    }));
  }, [stats]);

  return (
    <div className="min-h-screen business-shell-gradient p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold business-text-strong mb-2 flex items-center gap-3">
                <ChartBarIcon className="w-10 h-10 business-text-primary" />
                {t("sentMessagesStats.pageTitle")}
              </h1>
              <p className="business-text-muted">
                {t("sentMessagesStats.pageSubtitleAlt")}
              </p>
            </div>
            {lastUpdated && (
              <div className="text-sm business-text-muted flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                {t("sentMessagesStats.lastUpdate")}{formatTime(lastUpdated)}
              </div>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="business-bg-panel rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold business-text-strong mb-4 flex items-center gap-2">
            <CalendarDaysIcon className="w-6 h-6 business-text-primary" />
            {t("sentMessagesStats.filters")}
          </h2>

          {/* Date Range Picker */}
          <div className="mb-6">
            <DateRangePicker
              onDateChange={handleDateChange}
              initialPeriod={period}
            />
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Page Filter */}
            <div>
              <label className="block text-sm font-medium business-text-body mb-2">
                {t("sentMessagesStats.page")}
              </label>
              <select
                value={selectedPages.length === 1 ? selectedPages[0] : "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPages(val === "all" ? [] : [val]);
                }}
                className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
              >
                <option value="all">{t("sentMessagesStats.allPages")}</option>
                {availablePages.map((page) => (
                  <option key={page.pageId} value={page.pageId}>
                    {page.pageName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium business-text-body mb-2">
                {t("sentMessagesStats.messageStatus")}
              </label>
              <select
                value={messageStatusFilter}
                onChange={(e) => setMessageStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
              >
                <option value="all">{t("sentMessagesStats.all")}</option>
                <option value="saved">{t("sentMessagesStats.saved")}</option>
                <option value="ignored">{t("sentMessagesStats.ignored")}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium business-text-body mb-2">
                {t("sentMessagesStats.conversationStatus")}
              </label>
              <select
                value={conversationStatusFilter}
                onChange={(e) => setConversationStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border business-control-border rounded-lg business-bg-panel business-text-strong business-focus-primary"
              >
                <option value="all">{t("sentMessagesStats.all")}</option>
                <option value="created">{t("sentMessagesStats.new")}</option>
                <option value="existed">{t("sentMessagesStats.existing")}</option>
                <option value="ignored">{t("sentMessagesStats.ignored")}</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 business-bg-primary-solid business-text-on-accent rounded-lg business-hover-primary-solid disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
                />
                {t("sentMessagesStats.refresh")}
              </button>

              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  autoRefresh
                    ? "business-bg-success-solid business-text-on-accent business-border-success-strong"
                    : "business-bg-panel business-text-body business-control-border"
                }`}
                title={
                  autoRefresh
                    ? t("sentMessagesStats.disableAutoRefresh")
                    : t("sentMessagesStats.enableAutoRefresh")
                }
              >
                <ClockIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="business-bg-danger-soft border business-border-danger-soft rounded-xl p-4 mb-6 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 business-text-danger" />
            <div>
              <p className="business-text-danger font-medium">{error}</p>
              <button
                onClick={fetchStats}
                className="text-sm business-text-danger underline mt-1"
              >
                {t("sentMessagesStats.retry")}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !stats && (
          <div className="business-bg-panel rounded-xl shadow-lg p-12 text-center">
            <ArrowPathIcon className="h-12 w-12 animate-spin business-text-primary mx-auto mb-4" />
            <p className="business-text-muted text-lg">
              {t("sentMessagesStats.loadingMessage")}
            </p>
          </div>
        )}

        {/* Stats Content */}
        {!loading && stats && (
          <>
            {/* Comparison Banner */}
            {stats.comparison && (
              <div className="business-hero-gradient border business-border-primary-soft rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold business-text-strong mb-4">
                  {t("sentMessagesStats.comparisonWithPrevious")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    {renderTrendIcon(stats.comparison.changes.sentTrend)}
                    <div>
                      <p className="text-sm business-text-muted">
                        {t("sentMessagesStats.totalReach")}
                      </p>
                      <p className="text-2xl font-bold business-text-strong">
                        {stats.comparison.changes.sentChange > 0 ? "+" : ""}
                        {stats.comparison.changes.sentChange}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="business-bg-panel rounded-xl shadow-lg mb-6">
              <div className="border-b business-border">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "overview"
                        ? "business-border-primary-strong business-text-primary"
                        : "business-border-clear business-text-muted business-hover-muted business-control-border"
                    }`}
                  >
                    {t("sentMessagesStats.overview")}
                  </button>
                  <button
                    onClick={() => setActiveTab("comparison")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "comparison"
                        ? "business-border-primary-strong business-text-primary"
                        : "business-border-clear business-text-muted business-hover-muted business-control-border"
                    }`}
                  >
                    {t("sentMessagesStats.detailedComparison")}
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "tables"
                        ? "business-border-primary-strong business-text-primary"
                        : "business-border-clear business-text-muted business-hover-muted business-control-border"
                    }`}
                  >
                    {t("sentMessagesStats.tables")}
                  </button>
                </nav>
              </div>
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Messages Summary Cards */}
                {/* Messages Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {/* Total Requests (All Traffic) */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 border-l-4 business-border-primary-strong transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium business-text-muted mb-1">
                          {t("sentMessagesStats.totalRequests")}
                        </p>
                        <p className="text-2xl font-bold business-text-strong">
                          {stats.summary.messages.totalSent.toLocaleString(
                            i18n.language,
                          )}
                        </p>
                      </div>
                      <div className="business-bg-primary-soft rounded-full p-3">
                        <ArrowPathIcon className="h-6 w-6 business-text-primary" />
                      </div>
                    </div>
                    <p className="text-xs business-text-subtle">
                      {t("sentMessagesStats.totalRequestsDesc")}
                    </p>
                  </div>

                  {/* Reached Conversations (Real Reach) */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 border-l-4 business-border-success-strong transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium business-text-muted mb-1">
                          {t("sentMessagesStats.reached")}
                        </p>
                        <p className="text-2xl font-bold business-text-strong">
                          {stats.summary.conversations.reached.toLocaleString(
                            i18n.language,
                          )}
                        </p>
                      </div>
                      <div className="business-bg-success-soft rounded-full p-3">
                        <UserGroupIcon className="h-6 w-6 business-text-success" />
                      </div>
                    </div>
                    <p className="text-xs business-text-success font-medium">
                      {t("sentMessagesStats.reachedDesc")}
                    </p>
                  </div>

                  {/* Ignored Conversations (Noise) */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 border-l-4 business-border-warning-strong transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium business-text-muted mb-1">
                          {t("sentMessagesStats.ignoredConversations")}
                        </p>
                        <p className="text-2xl font-bold business-text-strong">
                          {stats.summary.conversations.ignored.toLocaleString(
                            i18n.language,
                          )}
                        </p>
                      </div>
                      <div className="business-bg-warning-soft rounded-full p-3">
                        <XCircleIcon className="h-6 w-6 business-text-warning" />
                      </div>
                    </div>
                    <p className="text-xs business-text-warning font-medium">
                      {t("sentMessagesStats.ignoredDesc")}
                    </p>
                  </div>

                  {/* Saved vs Ignored Messages (Flow) */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 border-l-4 business-border-primary-strong transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium business-text-muted mb-1">
                          {t("sentMessagesStats.messageQuality")}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold business-text-success">
                            {stats.summary.messages.totalSaved.toLocaleString(
                              i18n.language,
                            )}
                          </span>
                          <span className="business-text-subtle">/</span>
                          <span className="text-lg font-bold business-text-danger">
                            {stats.summary.messages.totalIgnored.toLocaleString(
                              i18n.language,
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="business-bg-primary-soft rounded-full p-3">
                        <CheckCircleIcon className="h-6 w-6 business-text-primary" />
                      </div>
                    </div>
                    <p className="text-xs business-text-subtle">
                      {t("sentMessagesStats.savedRate")}{stats.summary.messages.savedPercentage}%
                    </p>
                  </div>

                  {/* New Conversations */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 border-l-4 business-border-secondary-strong transform hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium business-text-muted mb-1">
                          {t("sentMessagesStats.newConversations")}
                        </p>
                        <p className="text-2xl font-bold business-text-strong">
                          {stats.summary.conversations.created.toLocaleString(
                            i18n.language,
                          )}
                        </p>
                      </div>
                      <div className="business-bg-secondary-soft rounded-full p-3">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 business-text-secondary" />
                      </div>
                    </div>
                    <p className="text-xs business-text-subtle">
                      {t("sentMessagesStats.conversionRate")}{stats.summary.messages.conversionRate}%
                    </p>
                  </div>
                </div>

                {/* Daily Activity Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Pie Chart */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold business-text-strong mb-4">
                      {t("sentMessagesStats.distributionTitle")}
                    </h3>
                    <PieChart
                      data={pieChartData}
                      colors={["#10b981", "#ef4444"]}
                      height={300}
                    />
                    <div className="mt-4 flex justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full business-bg-success-solid"></div>
                        <span className="business-text-body">
                          {t("sentMessagesStats.savedLabel")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full business-bg-danger-solid"></div>
                        <span className="business-text-body">
                          {t("sentMessagesStats.ignoredLabel")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top Pages */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold business-text-strong mb-4">
                      {t("sentMessagesStats.topPages")}
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {stats.pageStats.slice(0, 5).map((page, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 business-bg-soft rounded-lg business-hover-soft transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 business-bg-primary-solid business-text-on-accent rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium business-text-strong">
                              {page.pageName}
                            </span>
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold business-text-primary">
                              {page.count.toLocaleString(i18n.language)}
                            </p>
                            {page.percentage && (
                              <p className="text-xs business-text-muted">
                                {page.percentage}%
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Peak Activity Summary */}
                  <div className="business-bg-panel rounded-xl shadow-lg p-6 lg:col-span-2">
                    <h3 className="text-lg font-semibold business-text-strong mb-6 flex items-center gap-2">
                      <ClockIcon className="w-6 h-6 business-text-warning" />
                      {t("sentMessagesStats.peakAnalysis")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Best Time to Send */}
                      <BestHourCard stats={stats} />

                      {/* Best Day */}
                      <BestDayCard stats={stats} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Comparison Tab */}
            {activeTab === "comparison" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-semibold business-text-strong mb-6 flex items-center gap-2">
                    <ArrowTrendingUpIcon className="w-6 h-6 business-text-secondary" />
                    {t("sentMessagesStats.detailedPerformanceComparison")}
                  </h3>

                  {stats.comparison ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="p-6 business-bg-primary-soft rounded-xl border business-border-primary-soft">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium business-text-primary">
                            {t("sentMessagesStats.sentMessages")}
                          </p>
                          {renderTrendIcon(stats.comparison.changes.sentTrend)}
                        </div>
                        <p className="text-3xl font-bold business-text-primary">
                          {stats.summary.messages.totalSent.toLocaleString(
                            i18n.language,
                          )}
                        </p>
                        <p className="text-sm business-text-primary mt-1">
                          {stats.comparison.changes.sentChange > 0 ? "+" : ""}
                          {stats.comparison.changes.sentChange}% {t("sentMessagesStats.comparedToPrevious")}
                        </p>
                      </div>

                      <div className="p-6 business-bg-secondary-soft rounded-xl border business-border-secondary-soft">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium business-text-secondary">
                            {t("sentMessagesStats.saveRate")}
                          </p>
                          {renderTrendIcon(stats.comparison.changes.savedTrend)}
                        </div>
                        <p className="text-3xl font-bold business-text-secondary">
                          {stats.summary.messages.savedPercentage}%
                        </p>
                        <p className="text-sm business-text-secondary mt-1">
                          {stats.comparison.changes.savedChange > 0 ? "+" : ""}
                          {stats.comparison.changes.savedChange}% {t("sentMessagesStats.comparedToPrevious")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center business-text-muted">
                      {t("sentMessagesStats.noComparisonData")}
                    </div>
                  )}

                  {/* Dual Period Visualization (Peak Analysis) */}
                  <div className="mt-8 border-t business-border pt-8">
                    <h4 className="text-lg font-medium business-text-strong mb-4 flex items-center gap-2">
                      <ClockIcon className="w-5 h-5 business-text-warning" />
                      {t("sentMessagesStats.peakHoursAnalysis")}
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="h-[300px]">
                        <p className="text-sm business-text-muted mb-4 text-center">
                          {t("sentMessagesStats.hourlyDistribution")}
                        </p>
                        <BarChart
                          data={hourlyChartData}
                          xKey="hour"
                          bars={[
                            { key: "count", name: t("sentMessagesStats.messagesLabel"), color: "#6366f1" },
                            { key: "saved", name: t("sentMessagesStats.savedChart"), color: "#10b981" },
                          ]}
                          height={250}
                        />
                      </div>
                      <div className="business-bg-soft rounded-xl p-6">
                        <h5 className="font-semibold business-text-strong mb-4">
                          {t("sentMessagesStats.smartInsights")}
                        </h5>
                        <ul className="space-y-4">
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full business-bg-primary-solid mt-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium business-text-strong">
                                {t("sentMessagesStats.bestTimeToSend")}
                              </p>
                              <p className="text-xs business-text-muted">
                                {t("sentMessagesStats.atHour")}
                                {[...(stats.hourlyStats || [])].sort(
                                  (a, b) => (b.revenue || 0) - (a.revenue || 0),
                                )[0]?.hour || 0}
                                :00 {t("sentMessagesStats.highestRevenue")}
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full business-bg-success-solid mt-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium business-text-strong">
                                {t("sentMessagesStats.mostEffectiveDay")}
                              </p>
                              <p className="text-xs business-text-muted">
                                {t("sentMessagesStats.day")}
                                {
                                  [...(stats.weekdayStats || [])].sort(
                                    (a, b) => b.count - a.count,
                                  )[0]?.dayName
                                }{" "}
                                {t("sentMessagesStats.highestInteraction")}
                              </p>
                            </div>
                          </li>
                          <li className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full business-bg-warning-solid mt-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium business-text-strong">
                                {t("sentMessagesStats.performanceTip")}
                              </p>
                              <p className="text-xs business-text-muted">
                                {t("sentMessagesStats.distributionAdvice")}
                              </p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Tab */}

            {/* Tables Tab */}
            {activeTab === "tables" && (
              <div className="space-y-6">
                {/* Daily Stats Table */}
                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold business-text-strong">
                      {t("sentMessagesStats.dailyStats")}
                    </h3>
                    <ExportButtons
                      data={dailyTableData}
                      columns={dailyTableColumns}
                      filename="daily-stats"
                      title={t("sentMessagesStats.dailyStats")}
                    />
                  </div>
                  <DataTable
                    data={dailyTableData}
                    columns={[
                      { key: "date", label: t("sentMessagesStats.date"), sortable: true },
                      {
                        key: "total",
                        label: t("sentMessagesStats.totalAttempts"),
                        sortable: true,
                      },
                      {
                        key: "savedReach",
                        label: t("sentMessagesStats.reachedConversations"),
                        sortable: true,
                      },
                      {
                        key: "ignoredReach",
                        label: t("sentMessagesStats.ignoredConversationsShort"),
                        sortable: true,
                      },
                      {
                        key: "conversationsCreated",
                        label: t("sentMessagesStats.new"),
                        sortable: true,
                      },
                      {
                        key: "conversationsExisted",
                        label: t("sentMessagesStats.existing"),
                        sortable: true,
                      },
                      { key: "revenue", label: t("sentMessagesStats.revenue"), sortable: true },
                    ]}
                    pageSize={10}
                  />
                </div>

                {/* Page Stats Table */}
                <div className="business-bg-panel rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold business-text-strong">
                      {t("sentMessagesStats.statsByPage")}
                    </h3>
                    <ExportButtons
                      data={pageTableData}
                      columns={pageTableColumns}
                      filename="page-stats"
                      title={t("sentMessagesStats.statsByPage")}
                    />
                  </div>
                  <DataTable
                    data={pageTableData}
                    columns={[
                      { key: "pageName", label: t("sentMessagesStats.pageName"), sortable: true },
                      { key: "count", label: t("sentMessagesStats.messageCount"), sortable: true },
                      {
                        key: "percentage",
                        label: t("sentMessagesStats.percentage"),
                        sortable: true,
                      },
                    ]}
                    pageSize={10}
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {stats.summary.messages.totalSent === 0 && (
              <div className="business-bg-panel rounded-xl shadow-lg p-12 text-center">
                <ChartBarIcon className="h-16 w-16 business-text-subtle mx-auto mb-4" />
                <p className="business-text-muted text-xl font-medium">
                  {t("sentMessagesStats.noMessagesInPeriod")}
                </p>
                <p className="business-text-muted mt-2">
                  {t("sentMessagesStats.tryChangingPeriod")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SentMessagesStats;
