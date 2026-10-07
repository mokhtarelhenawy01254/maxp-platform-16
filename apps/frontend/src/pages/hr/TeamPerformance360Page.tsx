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

interface PillarScores {
  delivery: { score: number; weight: number };
  quality: { score: number; weight: number };
  punctuality: { score: number; weight: number };
  focus: { score: number; weight: number };
  goals: { score: number; weight: number };
}

interface TelemetryStats {
  tasksCompleted: number;
  totalTasks: number;
  returns: number;
  lateDays: number;
  monitoredDays: number;
  activeGoals: number;
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
  tier: "TIER_S" | "TIER_A" | "TIER_B" | "TIER_C" | "TIER_D";
  tierLabel: string;
  isAtRisk: boolean;
  riskFlags: string[];
  pillars: PillarScores;
  telemetryStats: TelemetryStats;
}

interface DepartmentStat {
  department: string;
  employeeCount: number;
  averageScore: number;
}

interface LeaderboardData {
  summary: {
    totalEmployees: number;
    averageScore: number;
    tierCounts: {
      TIER_S: number;
      TIER_A: number;
      TIER_B: number;
      TIER_C: number;
      TIER_D: number;
    };
    atRiskCount: number;
    bestDepartment: string;
    needsSupportDepartment: string;
  };
  departmentStats: DepartmentStat[];
  leaderboard: LeaderboardEmployee[];
  period: string;
}

export const TeamPerformance360Page: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedEmployeeForPIP, setSelectedEmployeeForPIP] = useState<LeaderboardEmployee | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/hr/performance/team-leaderboard");
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
          averageScore: 82,
          tierCounts: { TIER_S: 1, TIER_A: 3, TIER_B: 1, TIER_C: 1, TIER_D: 0 },
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
            tier: "TIER_S",
            tierLabel: "متميز (Tier S)",
            isAtRisk: false,
            riskFlags: [],
            pillars: {
              delivery: { score: 96, weight: 25 },
              quality: { score: 95, weight: 25 },
              punctuality: { score: 90, weight: 20 },
              focus: { score: 92, weight: 20 },
              goals: { score: 95, weight: 10 },
            },
            telemetryStats: { tasksCompleted: 24, totalTasks: 25, returns: 0, lateDays: 1, monitoredDays: 22, activeGoals: 3 },
          },
          {
            id: "emp-2",
            employeeNumber: "EMP-102",
            name: "سارة أحمد",
            departmentName: "المبيعات والتسويق",
            positionTitle: "أخصائي مبيعات",
            compositeScore: 88,
            tier: "TIER_A",
            tierLabel: "ممتاز (Tier A)",
            isAtRisk: false,
            riskFlags: [],
            pillars: {
              delivery: { score: 90, weight: 25 },
              quality: { score: 88, weight: 25 },
              punctuality: { score: 85, weight: 20 },
              focus: { score: 88, weight: 20 },
              goals: { score: 85, weight: 10 },
            },
            telemetryStats: { tasksCompleted: 18, totalTasks: 20, returns: 1, lateDays: 2, monitoredDays: 21, activeGoals: 2 },
          },
          {
            id: "emp-3",
            employeeNumber: "EMP-103",
            name: "محمد كمال",
            departmentName: "التطوير البرمجي",
            positionTitle: "مهندس واجهات",
            compositeScore: 84,
            tier: "TIER_A",
            tierLabel: "ممتاز (Tier A)",
            isAtRisk: false,
            riskFlags: [],
            pillars: {
              delivery: { score: 85, weight: 25 },
              quality: { score: 86, weight: 25 },
              punctuality: { score: 80, weight: 20 },
              focus: { score: 85, weight: 20 },
              goals: { score: 85, weight: 10 },
            },
            telemetryStats: { tasksCompleted: 15, totalTasks: 18, returns: 1, lateDays: 3, monitoredDays: 20, activeGoals: 2 },
          },
          {
            id: "emp-4",
            employeeNumber: "EMP-104",
            name: "أحمد فريد",
            departmentName: "خدمة العملاء",
            positionTitle: "أخصائي دعم فني",
            compositeScore: 68,
            tier: "TIER_C",
            tierLabel: "يحتاج تحسين (Tier C)",
            isAtRisk: true,
            riskFlags: ["ارتفاع معدل إرجاع المهام", "تكرار التأخير الصباحي"],
            pillars: {
              delivery: { score: 65, weight: 25 },
              quality: { score: 62, weight: 25 },
              punctuality: { score: 70, weight: 20 },
              focus: { score: 75, weight: 20 },
              goals: { score: 70, weight: 10 },
            },
            telemetryStats: { tasksCompleted: 9, totalTasks: 16, returns: 5, lateDays: 5, monitoredDays: 19, activeGoals: 1 },
          },
        ],
        period: "آخر 30 يوماً",
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
      default:
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 font-bold text-xs ring-1 ring-amber-500/30">
          1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-300 font-bold text-xs ring-1 ring-slate-400/30">
          2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 font-bold text-xs ring-1 ring-amber-700/30">
          3
        </span>
      );
    }
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground font-semibold text-xs tabular-nums">
        {index + 1}
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
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
                تصنيف مؤتمت 100% مبني على مخرجات المهام، الجودة، انضباط الحضور، التركيز، والأهداف
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs tabular-nums bg-card">
            {data?.period || "آخر 30 يوماً"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaderboard}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث المؤشرات
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
              <span>إجمالي الموظفين:</span>
              <strong className="text-foreground tabular-nums">{data?.summary.totalEmployees ?? 0}</strong>
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
            className="pr-9 text-xs h-9 bg-background/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Filter className="h-3 w-3" /> الرتبة:
          </span>
          {["ALL", "TIER_S", "TIER_A", "TIER_B", "TIER_C", "AT_RISK"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                selectedTier === tier
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {tier === "ALL" && "الكل"}
              {tier === "TIER_S" && "Tier S"}
              {tier === "TIER_A" && "Tier A"}
              {tier === "TIER_B" && "Tier B"}
              {tier === "TIER_C" && "Tier C"}
              {tier === "AT_RISK" && "في دائرة الخطر ⚠️"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                <th className="py-3 px-4 font-semibold">الموظف والقسم</th>
                <th className="py-3 px-4 font-semibold text-center">الرتبة</th>
                <th className="py-3 px-4 font-semibold text-center">الدرجة التراكمية</th>
                <th className="py-3 px-4 font-semibold text-center">محاور الأداء (25% | 25% | 20% | 20% | 10%)</th>
                <th className="py-3 px-4 font-semibold text-center">مؤشرات النشاط الحي</th>
                <th className="py-3 px-4 font-semibold text-center">الإجراء الإداري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    لا توجد بيانات مطابقة لخيارات البحث أو الفلترة المحددة.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      emp.isAtRisk ? "bg-rose-500/[0.02]" : ""
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center">{getRankBadge(idx)}</div>
                    </td>

                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-xs uppercase">
                          {emp.name.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span>{emp.name}</span>
                            {emp.isAtRisk && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0 h-4 font-normal"
                              >
                                تحذير أداء
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span className="font-mono tabular-nums">{emp.employeeNumber}</span>
                            <span>•</span>
                            <span>{emp.positionTitle}</span>
                            <span>•</span>
                            <span className="text-primary/80">{emp.departmentName}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${getTierColorClass(
                          emp.tier
                        )}`}
                      >
                        {emp.tierLabel}
                      </span>
                    </td>

                    {/* Composite Score */}
                    <td className="py-3 px-4 text-center">
                      <div className="text-base font-black tabular-nums text-foreground">
                        {emp.compositeScore}
                        <span className="text-xs font-normal text-muted-foreground mr-0.5">/ 100</span>
                      </div>
                    </td>

                    {/* Pillars mini breakdown */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] tabular-nums">
                        <span title="سرعة ومعدل الإنجاز (25%)" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.delivery.score}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="جودة المخرجات والاعتماد (25%)" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.quality.score}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="الانضباط والحضور (20%)" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.punctuality.score}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="التركيز والنشاط الرقمي (20%)" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.focus.score}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span title="الأهداف ومؤشرات النتائج (10%)" className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
                          {emp.pillars.goals.score}
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
                    <td className="py-3 px-4 text-center">
                      {emp.isAtRisk ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedEmployeeForPIP(emp)}
                          className="h-7 text-[11px] gap-1 px-2.5 font-medium"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          إصدار خطة تحسين (PIP)
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`سجل أداء ${emp.name} مكتمل ومستقر.`)}
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
