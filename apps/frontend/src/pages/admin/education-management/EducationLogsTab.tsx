import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Users,
  GraduationCap,
  BookOpen,
  Gift,
  Layers,
  DollarSign,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  ShieldAlert,
  Info,
  X,
  Copy,
  Check,
} from "lucide-react";
import type { EducationLogItem, EducationLogStats } from "./types";
import { fetchEducationLogsApi, fetchEducationLogsStatsApi, getEducationLogsExportUrl } from "./api";

// Severity Badge Configuration
const getSeverityConfig = (isEn: boolean): Record<string, { label: string; color: string }> => ({
  LOW: {
    label: isEn ? "Low" : "عادي",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  MEDIUM: {
    label: isEn ? "Medium" : "متوسط",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  HIGH: {
    label: isEn ? "High" : "هام",
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  },
  CRITICAL: {
    label: isEn ? "Critical" : "حرج",
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
});

// Entity Type Icons & Labels
const getEntityConfig = (
  isEn: boolean
): Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> => ({
  STUDENT: {
    label: isEn ? "Students" : "الطلاب",
    icon: User,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  TEACHER: {
    label: isEn ? "Teachers" : "المدرسين",
    icon: GraduationCap,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  SESSION: {
    label: isEn ? "Sessions" : "الحصص",
    icon: Clock,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  ENROLLMENT: {
    label: isEn ? "Enrollments" : "التسجيلات",
    icon: Layers,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
  PACKAGE: {
    label: isEn ? "Packages" : "الباقات",
    icon: Gift,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  SUBJECT: {
    label: isEn ? "Subjects" : "المواد الدراسية",
    icon: BookOpen,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  PAYMENT: {
    label: isEn ? "Payroll & Dues" : "المرتبات والمستحقات",
    icon: DollarSign,
    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  },
  NOTIFICATION: {
    label: isEn ? "Notifications" : "الإشعارات",
    icon: Bell,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  PORTAL: {
    label: isEn ? "Portals & Login" : "البوابات وتسجيل الدخول",
    icon: Calendar,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
  EDUCATION: {
    label: isEn ? "Education System" : "النظام التعليمي",
    icon: History,
    color: "text-primary bg-primary/10 border-primary/20",
  },
});

export const EducationLogsTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const SEVERITY_CONFIG = useMemo(() => getSeverityConfig(isEn), [isEn]);
  const ENTITY_CONFIG = useMemo(() => getEntityConfig(isEn), [isEn]);

  const [logs, setLogs] = useState<EducationLogItem[]>([]);
  const [stats, setStats] = useState<EducationLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");

  // UI view mode
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [selectedLog, setSelectedLog] = useState<EducationLogItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculate dates based on preset
  const { startDate, endDate } = useMemo(() => {
    if (datePreset === "ALL") return { startDate: "", endDate: "" };
    const end = new Date();
    const start = new Date();
    if (datePreset === "TODAY") {
      start.setHours(0, 0, 0, 0);
    } else if (datePreset === "WEEK") {
      start.setDate(start.getDate() - 7);
    } else if (datePreset === "MONTH") {
      start.setDate(start.getDate() - 30);
    }
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [datePreset]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchEducationLogsStatsApi();
      setStats(statsData);
    } catch (err: any) {
      console.error("[EducationLogsTab] Failed to load stats:", err.message);
    }
  }, []);

  // Load logs
  const loadLogs = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params: Record<string, any> = {
          page,
          limit,
          search: search.trim(),
          targetType: selectedEntity !== "ALL" ? selectedEntity : "",
          action: selectedAction !== "ALL" ? selectedAction : "",
          severity: selectedSeverity !== "ALL" ? selectedSeverity : "",
          startDate,
          endDate,
        };

        const result = await fetchEducationLogsApi(params);
        setLogs(result.logs || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalCount(result.pagination?.total || 0);
      } catch (err: any) {
        setError(err.message || (isEn ? "Error loading logs" : "حدث خطأ أثناء تحميل السجلات"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, search, selectedEntity, selectedAction, selectedSeverity, startDate, endDate, isEn]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Close the details modal on Escape
  useEffect(() => {
    if (!selectedLog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedLog(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLog]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExport = () => {
    const exportUrl = getEducationLogsExportUrl({
      search: search.trim(),
      targetType: selectedEntity !== "ALL" ? selectedEntity : "",
      action: selectedAction !== "ALL" ? selectedAction : "",
      severity: selectedSeverity !== "ALL" ? selectedSeverity : "",
      startDate,
      endDate,
    });
    window.open(exportUrl, "_blank");
  };

  const getRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (isEn) {
      if (diffSec < 60) return "Just now";
      if (diffMin === 1) return "1 min ago";
      if (diffMin < 60) return `${diffMin} mins ago`;
      if (diffHr === 1) return "1 hr ago";
      if (diffHr < 24) return `${diffHr} hrs ago`;
      if (diffDays === 1) return "Yesterday";
      return `${diffDays} days ago`;
    }

    if (diffSec < 60) return "الآن";
    if (diffMin === 1) return "منذ دقيقة";
    if (diffMin === 2) return "منذ دقيقتين";
    if (diffMin < 11) return `منذ ${diffMin} دقائق`;
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHr === 1) return "منذ ساعة";
    if (diffHr === 2) return "منذ ساعتين";
    if (diffHr < 11) return `منذ ${diffHr} ساعات`;
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    if (diffDays === 1) return "أمس";
    if (diffDays === 2) return "منذ يومين";
    return `منذ ${diffDays} يوم`;
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString(isEn ? "en-US" : "ar-EG", { year: "numeric", month: "short", day: "numeric" }),
        time: d.toLocaleTimeString(isEn ? "en-US" : "ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        relative: getRelativeTime(d),
      };
    } catch {
      return { date: dateStr, time: "", relative: "" };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6" dir={isEn ? "ltr" : "rtl"}>
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {t("education.logsTab.title", isEn ? "Education System Activity & Audit Trail" : "سجلات النظام التعليمي (Activity & Audit Trail)")}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isEn ? "Export CSV" : "تصدير كـ CSV"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              loadStats();
              loadLogs(true);
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isEn ? "Refresh" : "تحديث"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Total Logs" : "إجمالي السجلات"}</span>
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
            {stats?.totalLogs ?? totalCount}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Today's Activity" : "عمليات اليوم"}</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-500 tabular-nums">
            {stats?.todayLogs ?? 0}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Session Logs" : "سجلات الحصص"}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-500 tabular-nums">
            {stats?.targetTypeCounts?.SESSION ?? 0}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Students & Subscriptions" : "الطلاب والاشتراكات"}</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-500 tabular-nums">
            {(stats?.targetTypeCounts?.STUDENT ?? 0) + (stats?.targetTypeCounts?.ENROLLMENT ?? 0)}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Teachers & Payroll" : "المدرسين والمرتبات"}</span>
            <GraduationCap className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-500 tabular-nums">
            {(stats?.targetTypeCounts?.TEACHER ?? 0) + (stats?.targetTypeCounts?.PAYMENT ?? 0)}
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{isEn ? "Notifications & Funnel" : "الإشعارات والفانل"}</span>
            <Bell className="w-4 h-4 text-pink-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-pink-500 tabular-nums">
            {(stats?.targetTypeCounts?.NOTIFICATION ?? 0) + (stats?.targetTypeCounts?.FUNNEL ?? 0)}
          </div>
        </div>
      </div>

      {/* Entity Chips Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => {
            setSelectedEntity("ALL");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
            selectedEntity === "ALL"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span>{isEn ? "All Sections" : "كل الأقسام"}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/20 font-mono">
            {stats?.totalLogs ?? totalCount}
          </span>
        </button>

        {Object.entries(ENTITY_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const count = stats?.targetTypeCounts?.[key] ?? 0;
          const isSelected = selectedEntity === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedEntity(key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 text-muted-foreground absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 pointer-events-none`} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isEn ? "Search logs (student, subject, teacher, description, actor...)" : "ابحث في السجلات (اسم الطالب، المادة، المدرس، الوصف، المنفذ...)"}
              className={`w-full py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${isEn ? "pl-9 pr-3" : "pl-3 pr-9"}`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className={`absolute ${isEn ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
            {[
              { id: "ALL", label: isEn ? "All Time" : "كل الأوقات" },
              { id: "TODAY", label: isEn ? "Today" : "اليوم" },
              { id: "WEEK", label: isEn ? "7 Days" : "7 أيام" },
              { id: "MONTH", label: isEn ? "30 Days" : "30 يوم" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDatePreset(p.id as any);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  datePreset === p.id
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 rounded-lg text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="ALL">{isEn ? "All Severity Levels" : "كل مستويات الأهمية"}</option>
            <option value="LOW">{isEn ? "Low" : "عادي"}</option>
            <option value="MEDIUM">{isEn ? "Medium" : "متوسط"}</option>
            <option value="HIGH">{isEn ? "High" : "هام"}</option>
            <option value="CRITICAL">{isEn ? "Critical" : "حرج"}</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              aria-label={isEn ? "Timeline view" : "عرض زمني"} title={isEn ? "Timeline view" : "عرض زمني"}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "timeline" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label={isEn ? "Table view" : "عرض جدول"} title={isEn ? "Table view" : "عرض جدول"}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Feed / Table */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-3 bg-card rounded-xl border border-border">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-primary" />
          <p>{isEn ? "Loading education system logs..." : "جارٍ تحميل سجلات النظام التعليمي..."}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground text-xs space-y-2 bg-card rounded-xl border border-border">
          <History className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="font-semibold text-foreground">{isEn ? "No logs match the selected filters" : "لا توجد سجلات تطابق الفلاتر المحددة"}</p>
          <p className="text-[11px]">{isEn ? "Any new operation or activity in the education system will appear here automatically" : "أي عملية أو نشاط جديد في النظام التعليمي سيظهر هنا تلقائياً"}</p>
        </div>
      ) : viewMode === "timeline" ? (
        /* Timeline View */
        <div className="space-y-2.5">
          {logs.map((log) => {
            const timeInfo = formatDateTime(log.createdAt);
            const entity = ENTITY_CONFIG[log.targetType || "EDUCATION"] || ENTITY_CONFIG.EDUCATION;
            const EntityIcon = entity.icon;
            const severity = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.LOW;

            return (
              <div
                key={log.id}
                className="group p-3.5 rounded-xl bg-card border border-border/80 hover:border-primary/40 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Entity Icon Badge */}
                  <span className={`p-2 rounded-lg border shrink-0 mt-0.5 ${entity.color}`}>
                    <EntityIcon className="w-4 h-4" />
                  </span>

                  {/* Main Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground">
                        {log.description}
                      </span>
                      {log.targetName && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border/60">
                          {log.targetName}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${severity.color}`}>
                        {severity.label}
                      </span>
                      {!log.isSuccess && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                          <XCircle className="w-3 h-3" />
                          {isEn ? "Failed" : "فشل"}
                        </span>
                      )}
                    </div>

                    {/* Metadata & Actor Subline */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-foreground">{log.actorName}</span>
                        {log.actorRole && <span className="opacity-70">({log.actorRole})</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{timeInfo.date} - {timeInfo.time}</span>
                        <span className="text-primary font-medium">({timeInfo.relative})</span>
                      </span>
                      {log.metadata?.client?.ip && (
                        <span className="font-mono text-[10px] opacity-70">
                          IP: {log.metadata.client.ip}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inspect Action */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Details" : "التفاصيل"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isEn ? "text-left" : "text-right"}`}>
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-3">{isEn ? "Time" : "الوقت"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Section" : "القسم"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Action & Description" : "الإجراء والوصف"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Target" : "الهدف"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Actor" : "المنفذ"}</th>
                  <th className="py-2.5 px-3">{isEn ? "Severity" : "الأهمية"}</th>
                  <th className="py-2.5 px-3 text-center">{isEn ? "Actions" : "إجراءات"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map((log) => {
                  const timeInfo = formatDateTime(log.createdAt);
                  const entity = ENTITY_CONFIG[log.targetType || "EDUCATION"] || ENTITY_CONFIG.EDUCATION;
                  const severity = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.LOW;

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">{timeInfo.time}</div>
                        <div className="text-[10px] text-muted-foreground">{timeInfo.date}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${entity.color}`}>
                          {entity.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">{log.description}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.action}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {log.targetName ? (
                          <span className="font-medium text-foreground">{log.targetName}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-foreground">{log.actorName}</div>
                        <div className="text-[10px] text-muted-foreground">{log.actorRole}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${severity.color}`}>
                          {severity.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
                          aria-label={isEn ? "View details" : "عرض التفاصيل"} title={isEn ? "View details" : "عرض التفاصيل"}
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border text-xs">
          <div className="text-muted-foreground">
            {isEn ? (
              <>Showing page <span className="font-bold text-foreground">{page}</span> of <span className="font-bold text-foreground">{totalPages}</span> (Total {totalCount} logs)</>
            ) : (
              <>عرض صفحة <span className="font-bold text-foreground">{page}</span> من أصل <span className="font-bold text-foreground">{totalPages}</span> (إجمالي {totalCount} سجل)</>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs"
            >
              <option value="15">{isEn ? "15 per page" : "15 لكل صفحة"}</option>
              <option value="25">{isEn ? "25 per page" : "25 لكل صفحة"}</option>
              <option value="50">{isEn ? "50 per page" : "50 لكل صفحة"}</option>
              <option value="100">{isEn ? "100 per page" : "100 لكل صفحة"}</option>
            </select>

            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none text-foreground transition-colors"
            >
              <ChevronRight className={`w-3.5 h-3.5 ${isEn ? "rotate-180" : ""}`} />
              <span>{isEn ? "Previous" : "السابق"}</span>
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:pointer-events-none text-foreground transition-colors"
            >
              <span>{isEn ? "Next" : "التالي"}</span>
              <ChevronLeft className={`w-3.5 h-3.5 ${isEn ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Inspect Log Details Modal / Drawer */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          dir={isEn ? "ltr" : "rtl"}
          onClick={() => setSelectedLog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isEn ? "Log details" : "تفاصيل السجل"}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {isEn ? "Education Log Details" : "تفاصيل سجل النظام التعليمي"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground ">
                    {isEn ? `Log ID: ${selectedLog.id}` : `معرف السجل: ${selectedLog.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Summary Box */}
              <div className="p-3.5 rounded-xl bg-muted/40 space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {selectedLog.description}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-background text-foreground font-mono">
                    {selectedLog.action}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                    {selectedLog.targetType || (isEn ? "General" : "عام")}
                  </span>
                  {selectedLog.targetName && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground">
                      {isEn ? `Target: ${selectedLog.targetName}` : `الهدف: ${selectedLog.targetName}`}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-md border ${
                      SEVERITY_CONFIG[selectedLog.severity]?.color || ""
                    }`}
                  >
                    {isEn ? "Severity:" : "أهمية:"} {SEVERITY_CONFIG[selectedLog.severity]?.label || selectedLog.severity}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                      selectedLog.isSuccess
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}
                  >
                    {selectedLog.isSuccess ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isEn ? "Success" : "ناجح"}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>{isEn ? "Failed:" : "فشل:"} {selectedLog.errorMessage || (isEn ? "Unknown error" : "خطأ غير محدد")}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Actor & Time Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Actor Details" : "بيانات المنفذ (Actor)"}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isEn ? "Name:" : "الاسم:"}</span>
                      <span className="font-semibold text-foreground">{selectedLog.actorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isEn ? "Role:" : "الدور:"}</span>
                      <span className="text-foreground">{selectedLog.actorRole}</span>
                    </div>
                    {selectedLog.userId && (
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-muted-foreground">User ID:</span>
                        <span className="text-foreground">{selectedLog.userId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                  <div className="text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Timestamp & Session" : "التوقيت والجلسة"}</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isEn ? "Date:" : "التاريخ:"}</span>
                      <span className="text-foreground">{formatDateTime(selectedLog.createdAt).date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isEn ? "Time:" : "الوقت:"}</span>
                      <span className="text-foreground">{formatDateTime(selectedLog.createdAt).time}</span>
                    </div>
                    {selectedLog.metadata?.client?.ip && (
                      <div className="flex justify-between font-mono text-[10px]">
                        <span className="text-muted-foreground">IP:</span>
                        <span className="text-foreground">{selectedLog.metadata.client.ip}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Details / Payload */}
              {selectedLog.metadata && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{isEn ? "Detailed Payload (Metadata):" : "بيانات العملية التفصيلية (Metadata):"}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(JSON.stringify(selectedLog.metadata, null, 2), "metadata")
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-border bg-background text-muted-foreground hover:text-foreground"
                    >
                      {copiedKey === "metadata" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>{isEn ? "Copied" : "تم النسخ"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{isEn ? "Copy JSON" : "نسخ JSON"}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-muted/60 font-mono text-[11px] overflow-x-auto text-foreground max-h-60" dir="ltr">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex justify-end bg-muted/20">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
              >
                {isEn ? "Close" : "إغلاق"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
