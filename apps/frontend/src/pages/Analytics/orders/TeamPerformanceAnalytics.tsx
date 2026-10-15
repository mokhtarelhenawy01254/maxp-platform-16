/**
 * Team Performance Analytics Page
 * Tracks multi-dimensional employee attribution: created, confirmed, and assigned orders with Cairo timezone precision.
 */
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Trophy,
  Calendar,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  DollarSign,
} from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodKey,
  PeriodRange,
  computePeriodRange,
  getPeriodLabel,
} from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { TeamPerformanceCharts } from "./TeamPerformanceCharts";
import { TeamPerformanceTable } from "./TeamPerformanceTable";

export interface TeamMemberStat {
  userId: string;
  userName: string;
  email: string;
  role: string;
  ordersCreated: number;
  ordersConfirmed: number;
  ordersAssigned?: number;
  createdRevenue?: number;
  confirmedRevenue?: number;
  totalRevenue: number;
  deliveredOrders: number;
  cancelledOrders: number;
  successRate: number;
  avgOrderValue: number;
}

interface TeamStats {
  teamMembers: TeamMemberStat[];
  totalTeamMembers: number;
  totalOrdersProcessed: number;
  totalTeamRevenue: number;
}

const STORAGE_KEY = "maxp_analytics_team_performance_period";
const VALID_PERIODS: PeriodKey[] = [
  "today",
  "yesterday",
  "7",
  "30",
  "90",
  "180",
  "365",
  "custom",
];

const getInitialPeriodState = (searchParams: URLSearchParams): PeriodRange => {
  const urlPeriod = searchParams.get("period") as PeriodKey | null;
  const urlStart = searchParams.get("startDate") || "";
  const urlEnd = searchParams.get("endDate") || "";

  if (urlPeriod && VALID_PERIODS.includes(urlPeriod)) {
    if (urlPeriod === "custom") {
      if (urlStart && urlEnd && urlStart <= urlEnd) {
        return { period: "custom", startDate: urlStart, endDate: urlEnd };
      }
    } else {
      const dates = computePeriodRange(urlPeriod);
      return {
        period: urlPeriod,
        startDate: dates.startDate,
        endDate: dates.endDate,
      };
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.period && VALID_PERIODS.includes(parsed.period)) {
        if (parsed.period === "custom") {
          if (
            parsed.startDate &&
            parsed.endDate &&
            parsed.startDate <= parsed.endDate
          ) {
            return {
              period: "custom",
              startDate: parsed.startDate,
              endDate: parsed.endDate,
            };
          }
        } else {
          const dates = computePeriodRange(parsed.period);
          return {
            period: parsed.period,
            startDate: dates.startDate,
            endDate: dates.endDate,
          };
        }
      }
    }
  } catch {
    // Ignore storage parse error
  }

  const defaultDates = computePeriodRange("today");
  return {
    period: "today",
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
  };
};

const TeamPerformanceAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialConfig] = useState<PeriodRange>(() =>
    getInitialPeriodState(searchParams),
  );
  const [range, setRange] = useState<PeriodRange>(initialConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [sortField, setSortField] = useState<keyof TeamMemberStat>("ordersConfirmed");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof TeamMemberStat) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedMembers = React.useMemo(() => {
    if (!stats?.teamMembers) return [];
    return [...stats.teamMembers].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === "string" && typeof valB === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "ar")
          : valB.localeCompare(valA, "ar");
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    });
  }, [stats?.teamMembers, sortField, sortOrder]);

  useEffect(() => {
    const urlPeriod = searchParams.get("period");
    if (!urlPeriod) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("period", initialConfig.period);
      if (
        initialConfig.period === "custom" &&
        initialConfig.startDate &&
        initialConfig.endDate
      ) {
        nextParams.set("startDate", initialConfig.startDate);
        nextParams.set("endDate", initialConfig.endDate);
      }
      setSearchParams(nextParams, { replace: true });
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialConfig));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (newRange: PeriodRange) => {
    setRange(newRange);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("period", newRange.period);
    if (
      newRange.period === "custom" &&
      newRange.startDate &&
      newRange.endDate
    ) {
      nextParams.set("startDate", newRange.startDate);
      nextParams.set("endDate", newRange.endDate);
    } else {
      nextParams.delete("startDate");
      nextParams.delete("endDate");
    }
    setSearchParams(nextParams, { replace: true });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRange));
    } catch {}
  };

  useEffect(() => {
    if (range) {
      fetchData(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const fetchData = async (targetRange: PeriodRange = range) => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getTeamPerformanceAnalytics(
        targetRange.period,
        targetRange.startDate,
        targetRange.endDate,
      );
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setStats({
          teamMembers: [],
          totalTeamMembers: 0,
          totalOrdersProcessed: 0,
          totalTeamRevenue: 0,
        });
      }
    } catch (err: any) {
      console.error("TeamPerformanceAnalytics error:", err);
      setError(err.message || t("teamPerformance.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const appliedPeriodLabel = getPeriodLabel(range.period, t);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {t("teamPerformance.title", "تحليلات كفاءة فريق العمل ومسؤولي التأكيد")}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-3 w-3" />
                {appliedPeriodLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("teamPerformance.subtitle", "تتبع إنجاز الطلبات المنشأة والمؤكدة والمسندة بدقة توقيت القاهرة")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector
            initialPeriod={initialConfig.period}
            initialStartDate={initialConfig.startDate}
            initialEndDate={initialConfig.endDate}
            onRangeChange={handleRangeChange}
          />
          <Button variant="outline" size="sm" onClick={() => fetchData(range)} disabled={loading} className="h-8 gap-1.5 text-xs font-mono border-border/70">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData(range)} className="h-7 text-xs border-destructive/30">إعادة المحاولة</Button>
        </div>
      )}

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("teamPerformance.totalMembers", "إجمالي أعضاء الفريق")}</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (stats?.totalTeamMembers || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">موظفون نشطون بالمنظومة</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("teamPerformance.totalOrders", "الطلبات المعالجة")}</span>
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : (stats?.totalOrdersProcessed?.toLocaleString() || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">طلبات منشأة ومؤكدة ومسندة</div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{t("teamPerformance.totalRevenue", "إجمالي مبيعات الفريق")}</span>
              <DollarSign className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : (stats?.totalTeamRevenue?.toLocaleString() || 0)} {t("teamPerformance.currency", "ج.م")}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">مبيعات محققة عبر الفريق</div>
          </CardContent>
        </Card>
      </div>

      {(!stats?.teamMembers || stats.teamMembers.length === 0) && !loading && (
        <Card className="border-border/70 bg-card p-10 text-center shadow-sm">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("teamPerformance.noDataTitle", "لا توجد بيانات أداء للفريق")}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {t(
              "teamPerformance.noDataDescription",
              "لم يتم تسجيل أي طلبات منشأة أو مؤكدة بواسطة أعضاء الفريق خلال الفترة المحددة."
            )}
          </p>
        </Card>
      )}

      {/* Recharts Bar Chart */}
      <TeamPerformanceCharts sortedMembers={sortedMembers} />

      {/* Leaderboard Table */}
      <TeamPerformanceTable
        sortedMembers={sortedMembers}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    </div>
  );
};

export default TeamPerformanceAnalytics;
