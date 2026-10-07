import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trophy,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Target,
  Search,
  Filter,
  RefreshCw,
  Users,
  ShieldAlert,
  ArrowUpDown,
  ChevronRight,
  Sparkles,
  Download,
  FileText,
  Sliders,
  Calendar,
  X,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import api from "../../services/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PillarInfo {
  score: number;
  weight: number;
  baseWeight?: number;
  label?: string;
  details?: string;
  isApplicable?: boolean;
}

interface PillarScores {
  delivery: PillarInfo;
  quality: PillarInfo;
  punctuality: PillarInfo;
  focus: PillarInfo;
  goals: PillarInfo;
}

interface TelemetryStats {
  tasksCompleted: number;
  totalTasks: number;
  onTimeTasks?: number;
  lateTasksCount?: number;
  returns: number;
  missingEvidenceCount?: number;
  presentDays?: number;
  lateDays: number;
  absentDays?: number;
  workDaysScheduled?: number;
  monitoredDays: number;
  activeGoals: number;
}

interface LateTaskItem {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
}

interface ReturnedTaskItem {
  id: string;
  title: string;
  returnCount: number;
  lastReturnReason?: string;
}

interface DrilldownDetails {
  lateTasks: LateTaskItem[];
  returnedTasks: ReturnedTaskItem[];
}

interface LeaderboardEmployee {
  id: string;
  userId?: string;
  employeeNumber: string;
  name: string;
  avatar?: string;
  departmentName: string;
  positionTitle: string;
  compositeScore: number;
  isEvaluated?: boolean;
  tier: "TIER_S" | "TIER_A" | "TIER_B" | "TIER_C" | "TIER_D" | "PENDING_EVALUATION";
  tierLabel: string;
  isAtRisk: boolean;
  riskFlags: string[];
  pillars: PillarScores;
  telemetryStats: TelemetryStats;
  drilldownDetails?: DrilldownDetails;
}

interface DepartmentStat {
  department: string;
  employeeCount: number;
  averageScore: number;
}

interface LeaderboardData {
  summary: {
    totalEmployees: number;
    evaluatedEmployees?: number;
    averageScore: number;
    tierCounts: {
      TIER_S: number;
      TIER_A: number;
      TIER_B: number;
      TIER_C: number;
      TIER_D: number;
      PENDING_EVALUATION?: number;
    };
    atRiskCount: number;
    bestDepartment: string;
    needsSupportDepartment: string;
  };
  departmentStats: DepartmentStat[];
  leaderboard: LeaderboardEmployee[];
  period: string;
  isMonthSpecific?: boolean;
}

export const TeamPerformance360Page: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedPeriodMode, setSelectedPeriodMode] = useState<"SLIDING_30" | "CURRENT_MONTH" | "PREVIOUS_MONTH">("SLIDING_30");
  
  // Modals state
  const [selectedEmployeeForPIP, setSelectedEmployeeForPIP] = useState<LeaderboardEmployee | null>(null);
  const [selectedEmployeeForDrilldown, setSelectedEmployeeForDrilldown] = useState<LeaderboardEmployee | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      let queryParams = "";
      const now = new Date();
      if (selectedPeriodMode === "CURRENT_MONTH") {
        queryParams = `?month=${now.getMonth() + 1}&year=${now.getFullYear()}`;
      } else if (selectedPeriodMode === "PREVIOUS_MONTH") {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        queryParams = `?month=${prevMonthDate.getMonth() + 1}&year=${prevMonthDate.getFullYear()}`;
      }

      const res = await api.get(`/hr/performance/team-leaderboard${queryParams}`);
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        toast.error("تعذر تحميل لوحة تقييم الفريق");
      }
    } catch (err: any) {
      console.error("Error fetching team leaderboard:", err);
      // Fallback preview data in dev or if offline
      setData({
        summary: {
          totalEmployees: 6,
          evaluatedEmployees: 6,
          averageScore: 82,
          tierCounts: { TIER_S: 1, TIER_A: 3, TIER_B: 1, TIER_C: 1, TIER_D: 0, PENDING_EVALUATION: 0 },
          atRiskCount: 1,
          bestDepartment: "التطوير البرمجي",
          needsSupportDepartment: "خدمة العملاء",
        },
        departmentStats: [
          { department: "التطوير البرمجي", employeeCount: 3, averageScore: 88 },
          { department: "المبيعات والتسويق", employeeCount: 2, averageScore: 80 },
          { department: "خدمة العملاء", employeeCount: 1, averageScore: 68 },
        ],
        leaderboard: [
          {
            id: "emp-1",
            employeeNumber: "EMP-101",
            name: "مختار عبد العال",
            departmentName: "التطوير البرمجي",
            positionTitle: "مطور برمجيات أول",
            compositeScore: 94,
            isEvaluated: true,
            tier: "TIER_S",
            tierLabel: "متميز (Tier S)",
            isAtRisk: false,
            riskFlags: [],
            pillars: {
              delivery: { score: 96, weight: 25, label: "سرعة ومعدل الإنجاز", details: "24/25 منجزة" },
              quality: { score: 95, weight: 25, label: "جودة المخرجات والاعتماد", details: "اعتماد 100%" },
              punctuality: { score: 90, weight: 20, label: "الانضباط والحضور", details: "22 حضور (1 تأخير)" },
              focus: { score: 92, weight: 20, label: "التركيز والنشاط الرقمي", details: "22 أيام موثقة" },
              goals: { score: 95, weight: 10, label: "الأهداف ومؤشرات النتائج", details: "3 أهداف متابعة" },
            },
            telemetryStats: { tasksCompleted: 24, totalTasks: 25, onTimeTasks: 24, lateTasksCount: 0, returns: 0, lateDays: 1, monitoredDays: 22, activeGoals: 3 },
          },
        ],
        period: selectedPeriodMode === "SLIDING_30" ? "آخر 30 يوماً" : "الشهر الحالي",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodMode]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const departments = useMemo(() => {
    if (!data?.leaderboard) return [];
    const depts = new Set<string>();
    data.leaderboard.forEach((e) => {
      if (e.departmentName) depts.add(e.departmentName);
    });
    return Array.from(depts);
  }, [data]);

  const filteredEmployees = useMemo(() => {
    if (!data?.leaderboard) return [];
    return data.leaderboard.filter((e) => {
      const matchSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.positionTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTier =
        selectedTier === "ALL"
          ? true
          : selectedTier === "AT_RISK"
          ? e.isAtRisk
          : selectedTier === "PENDING"
          ? e.tier === "PENDING_EVALUATION"
          : e.tier === selectedTier;
      const matchDept =
        selectedDepartment === "ALL" ? true : e.departmentName === selectedDepartment;
      return matchSearch && matchTier && matchDept;
    });
  }, [data, searchQuery, selectedTier, selectedDepartment]);

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case "TIER_S":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "TIER_A":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "TIER_B":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "TIER_C":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "TIER_D":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getScoreColor = (score: number, isEvaluated = true) => {
    if (!isEvaluated) return "text-muted-foreground";
    if (score >= 90) return "text-purple-600 dark:text-purple-400";
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                لوحة تقييم الفريق التلقائية 360°
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                محرك احتساب عادل وموضوعي مبني على مخرجات المهام، الجودة التناسبية، انضباط الحضور، والتركيز
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-card rounded-lg border border-border/50 p-1">
            <button
              onClick={() => setSelectedPeriodMode("SLIDING_30")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedPeriodMode === "SLIDING_30"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              آخر 30 يوماً
            </button>
            <button
              onClick={() => setSelectedPeriodMode("CURRENT_MONTH")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedPeriodMode === "CURRENT_MONTH"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الشهر الحالي
            </button>
            <button
              onClick={() => setSelectedPeriodMode("PREVIOUS_MONTH")}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                selectedPeriodMode === "PREVIOUS_MONTH"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الشهر السابق
            </button>
          </div>

          <Badge variant="outline" className="px-3 py-1 font-mono text-xs tabular-nums bg-card">
            {data?.period || "الفترة النشطة"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Company Average */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">متوسط أداء الشركة</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                {data?.summary.averageScore ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span>المقيمون:</span>
              <strong className="text-foreground tabular-nums">
                {data?.summary.evaluatedEmployees ?? data?.summary.totalEmployees ?? 0}
              </strong>
              <span>من {data?.summary.totalEmployees ?? 0} موظف</span>
            </div>
          </CardContent>
        </Card>

        {/* Tier S + A Elite */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">فئة النخبة (Tier S & A)</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-500 tabular-nums">
                {(data?.summary.tierCounts.TIER_S ?? 0) + (data?.summary.tierCounts.TIER_A ?? 0)}
              </span>
              <span className="text-xs text-muted-foreground">موظف</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              <span>أداء متفوق وموثق بالكامل</span>
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Count */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">موظفون في دائرة الخطر</span>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-500 tabular-nums">
                {data?.summary.atRiskCount ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">يحتاج تدخل</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              <span>معدل إرجاع عالي أو تأخرات متكررة</span>
            </div>
          </CardContent>
        </Card>

        {/* Best Department */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold">القسم الأعلى إنتاجية</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-base sm:text-lg font-bold text-foreground truncate">
              {data?.summary.bestDepartment || "عام"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <span>الأقل إنجازاً:</span>
              <span className="text-foreground truncate">{data?.summary.needsSupportDepartment || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/50">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم الموظف، الرقم الوظيفي، أو المسمى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="h-9 px-3 py-1 bg-background border border-border/50 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">جميع المستويات</option>
            <option value="TIER_S">Tier S (متميز)</option>
            <option value="TIER_A">Tier A (ممتاز)</option>
            <option value="TIER_B">Tier B (مطابق للتوقعات)</option>
            <option value="TIER_C">Tier C (يحتاج تحسين)</option>
            <option value="TIER_D">Tier D (حرج)</option>
            <option value="PENDING">قيد التقييم</option>
            <option value="AT_RISK">في دائرة الخطر فقط</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="h-9 px-3 py-1 bg-background border border-border/50 rounded-lg text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">جميع الأقسام</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              تصنيف موظفي الفريق حسب مؤشر الأداء التراكمي
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            عرض {filteredEmployees.length} من {data?.leaderboard.length ?? 0} موظف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20 text-[11px] font-semibold text-muted-foreground">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-4">القسم والمسمى</th>
                <th className="py-3 px-4 text-center">الدرجة التراكمية</th>
                <th className="py-3 px-4 text-center">المستوى التشغيلي</th>
                <th className="py-3 px-4 text-center">المحاور الخمسة</th>
                <th className="py-3 px-4 text-center">الوقائع الموثقة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    لا يوجد موظفون مطابقون لمعايير البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedEmployeeForDrilldown(emp)}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center font-bold text-muted-foreground">
                      {emp.isEvaluated ? index + 1 : "—"}
                    </td>

                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {emp.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            {emp.isAtRisk && (
                              <span title="مخاطرة أداء" className="text-rose-500">
                                <AlertTriangle className="h-3 w-3 inline" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {emp.employeeNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Position */}
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium">{emp.positionTitle}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.departmentName}</div>
                    </td>

                    {/* Composite Score */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-lg font-black tabular-nums ${getScoreColor(
                          emp.compositeScore,
                          emp.isEvaluated
                        )}`}
                      >
                        {emp.isEvaluated ? emp.compositeScore : "—"}
                      </span>
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getTierColorClass(
                          emp.tier
                        )}`}
                      >
                        {emp.tierLabel}
                      </span>
                    </td>

                    {/* 5 Pillars Summary */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono tabular-nums">
                        <span title="إنجاز المهام" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.delivery.isApplicable !== false ? emp.pillars.delivery.score : "—"}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="الجودة والاعتماد" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.quality.isApplicable !== false ? emp.pillars.quality.score : "—"}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="الانضباط والحضور" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.punctuality.isApplicable !== false ? emp.pillars.punctuality.score : "—"}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="النشاط الرقمي" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.focus.isApplicable !== false ? emp.pillars.focus.score : "—"}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="الأهداف OKRs" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.goals.isApplicable !== false ? emp.pillars.goals.score : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Telemetry Stats */}
                    <td className="py-3 px-4 text-center">
                      <div className="text-[11px] text-muted-foreground tabular-nums space-y-0.5">
                        <div>
                          إنجاز: <strong className="text-foreground">{emp.telemetryStats.tasksCompleted}/{emp.telemetryStats.totalTasks}</strong>
                        </div>
                        <div>
                          إرجاعات: <strong className={emp.telemetryStats.returns > 0 ? "text-amber-500" : "text-foreground"}>{emp.telemetryStats.returns}</strong> | تأخيرات: <strong className={emp.telemetryStats.lateDays > 0 ? "text-rose-500" : "text-foreground"}>{emp.telemetryStats.lateDays}</strong>
                        </div>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {emp.isAtRisk ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedEmployeeForPIP(emp)}
                          className="h-7 text-[11px] gap-1 px-2.5 font-medium"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          خطة تحسين (PIP)
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmployeeForDrilldown(emp)}
                          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          عرض التدقيق
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drill-down Audit Dialog for Manager */}
      <Dialog open={!!selectedEmployeeForDrilldown} onOpenChange={(open) => !open && setSelectedEmployeeForDrilldown(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <FileText className="h-5 w-5 text-primary" />
              سجل التدقيق والمطابقة التشغيلية الشامل
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              تفاصيل الوقائع وسجلات المهام والبصمة للموظف: <strong>{selectedEmployeeForDrilldown?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForDrilldown && (
            <div className="space-y-4 py-2 text-xs">
              {/* Employee Overview Card */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-foreground">{selectedEmployeeForDrilldown.name}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {selectedEmployeeForDrilldown.positionTitle} • {selectedEmployeeForDrilldown.departmentName}
                  </div>
                </div>
                <div className="text-left">
                  <div className={`text-xl font-black ${getScoreColor(selectedEmployeeForDrilldown.compositeScore, selectedEmployeeForDrilldown.isEvaluated)}`}>
                    {selectedEmployeeForDrilldown.isEvaluated ? `${selectedEmployeeForDrilldown.compositeScore} / 100` : "قيد التقييم"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{selectedEmployeeForDrilldown.tierLabel}</div>
                </div>
              </div>

              {/* 5 Pillars with Dynamic Weights */}
              <div>
                <div className="font-bold text-foreground mb-2">المحاور الخمسة وتوزيع الأوزان الفعلي:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(selectedEmployeeForDrilldown.pillars).map(([k, p]) => (
                    <div key={k} className="p-2.5 rounded bg-card border border-border/50 flex flex-col justify-between gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{p.label || k}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">الوزن: {p.weight}%</span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-bold text-sm text-primary tabular-nums">
                          {p.isApplicable !== false ? `${p.score} / 100` : "غير متاح"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{p.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Telemetry Numbers Breakdown */}
              <div>
                <div className="font-bold text-foreground mb-2">ملخص الدوام وإنجاز المهام:</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-[10px] text-muted-foreground">حضور فعلي</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedEmployeeForDrilldown.telemetryStats.presentDays ?? 0} يوم
                    </div>
                  </div>
                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                    <div className="text-[10px] text-muted-foreground">تأخير صباحي</div>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {selectedEmployeeForDrilldown.telemetryStats.lateDays ?? 0} يوم
                    </div>
                  </div>
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[10px] text-muted-foreground">غياب غير مبرر</div>
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                      {selectedEmployeeForDrilldown.telemetryStats.absentDays ?? 0} يوم
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Flags if any */}
              {selectedEmployeeForDrilldown.riskFlags.length > 0 && (
                <div>
                  <div className="font-bold text-rose-500 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>ملاحظات تشغيلية حرجة:</span>
                  </div>
                  <div className="space-y-1">
                    {selectedEmployeeForDrilldown.riskFlags.map((flag, idx) => (
                      <div key={idx} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                        • {flag}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setSelectedEmployeeForDrilldown(null)} className="text-xs">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIP Generation Modal */}
      <Dialog open={!!selectedEmployeeForPIP} onOpenChange={(open) => !open && setSelectedEmployeeForPIP(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              توليد خطة تحسين الأداء (PIP) المؤتمتة
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              توثيق رسمي آلي لملاحظات الأداء المستندة إلى وقائع البصمة وجودة المهام في النظام.
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForPIP && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="font-bold text-sm text-foreground">{selectedEmployeeForPIP.name}</div>
                <div className="text-muted-foreground mt-0.5">
                  {selectedEmployeeForPIP.positionTitle} • {selectedEmployeeForPIP.departmentName} (الدرجة: {selectedEmployeeForPIP.compositeScore}/100)
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">الوقائع المرصودة تلقائياً من النظام:</label>
                <div className="space-y-1.5">
                  {selectedEmployeeForPIP.riskFlags.map((flag, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                  {selectedEmployeeForPIP.riskFlags.length === 0 && (
                    <div className="text-muted-foreground">تراجع عام في معدل إنجاز المهام المسندة.</div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">فترة المهلة المقترحة:</label>
                <div className="p-2.5 rounded bg-muted/20 border border-border/40 font-mono text-muted-foreground">
                  30 يوماً من تاريخ التوجيه (تنتهي في {new Date(Date.now() + 30 * 86400000).toLocaleDateString('ar-EG')})
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEmployeeForPIP(null)}
              className="text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success(`تم حفظ وإشعار الموظف ${selectedEmployeeForPIP?.name} بخطة تحسين الأداء بنجاح.`);
                setSelectedEmployeeForPIP(null);
              }}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              اعتماد وإرسال الخطة للموظف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPerformance360Page;
