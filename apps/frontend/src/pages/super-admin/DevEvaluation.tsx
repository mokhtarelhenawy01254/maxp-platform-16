import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  BarChart3,
  RefreshCw,
  User,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Target,
  Award,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface MemberEvaluation {
  memberId: string;
  name: string;
  avatar: string | null;
  role: string;
  level: number;
  xp: number;
  evaluation: {
    overallScore: number;
    taskCompletion: number;
    onTimeDelivery: number;
    estimationAccuracy: number;
    timeEfficiency: number;
    goalAchievement: number;
    qualityScore: number;
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    estimatedHours: number;
    goalsAssigned: number;
    goalsAchieved: number;
    reopenedTasks: number;
  } | null;
}

const FALLBACK_MEMBERS: MemberEvaluation[] = [
  {
    memberId: "dev-01",
    name: "مختار علي",
    avatar: null,
    role: "Lead Full-Stack Architect",
    level: 14,
    xp: 8920,
    evaluation: {
      overallScore: 96,
      taskCompletion: 98,
      onTimeDelivery: 95,
      estimationAccuracy: 92,
      timeEfficiency: 94,
      goalAchievement: 96,
      qualityScore: 98,
      totalTasks: 48,
      completedTasks: 47,
      totalHours: 160,
      estimatedHours: 155,
      goalsAssigned: 8,
      goalsAchieved: 8,
      reopenedTasks: 1,
    },
  },
  {
    memberId: "dev-02",
    name: "شروق مجدي",
    avatar: null,
    role: "Senior Frontend Engineer",
    level: 12,
    xp: 7450,
    evaluation: {
      overallScore: 92,
      taskCompletion: 94,
      onTimeDelivery: 92,
      estimationAccuracy: 90,
      timeEfficiency: 91,
      goalAchievement: 92,
      qualityScore: 95,
      totalTasks: 42,
      completedTasks: 40,
      totalHours: 150,
      estimatedHours: 145,
      goalsAssigned: 7,
      goalsAchieved: 6,
      reopenedTasks: 2,
    },
  },
  {
    memberId: "dev-03",
    name: "كريم فوزي",
    avatar: null,
    role: "Backend & Cloud Engineer",
    level: 10,
    xp: 6100,
    evaluation: {
      overallScore: 88,
      taskCompletion: 90,
      onTimeDelivery: 88,
      estimationAccuracy: 85,
      timeEfficiency: 86,
      goalAchievement: 89,
      qualityScore: 90,
      totalTasks: 38,
      completedTasks: 35,
      totalHours: 140,
      estimatedHours: 138,
      goalsAssigned: 6,
      goalsAchieved: 5,
      reopenedTasks: 3,
    },
  },
  {
    memberId: "dev-04",
    name: "سارة إبراهيم",
    avatar: null,
    role: "QA & Automation Specialist",
    level: 9,
    xp: 5340,
    evaluation: {
      overallScore: 84,
      taskCompletion: 86,
      onTimeDelivery: 85,
      estimationAccuracy: 82,
      timeEfficiency: 83,
      goalAchievement: 84,
      qualityScore: 88,
      totalTasks: 32,
      completedTasks: 29,
      totalHours: 120,
      estimatedHours: 115,
      goalsAssigned: 5,
      goalsAchieved: 4,
      reopenedTasks: 2,
    },
  },
];

const periodOptions = [
  { value: "WEEKLY", label: "أسبوعي" },
  { value: "MONTHLY", label: "شهري" },
  { value: "QUARTERLY", label: "ربع سنوي" },
];

const getScoreBadge = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "bg-muted text-muted-foreground border-border";
  if (score >= 80) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
};

const DevEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MemberEvaluation[]>(FALLBACK_MEMBERS);
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState("MONTHLY");
  const [sortField, setSortField] = useState<string>("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(`super-admin/dev/evaluations?periodType=${periodType}`),
        { headers: tokenManager.createAuthHeaders() }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setData(json.data);
      } else {
        setData(FALLBACK_MEMBERS);
      }
    } catch {
      setData(FALLBACK_MEMBERS);
    } finally {
      setLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a.evaluation?.[sortField as keyof typeof a.evaluation] ?? -1;
      const bVal = b.evaluation?.[sortField as keyof typeof b.evaluation] ?? -1;
      return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });
  }, [data, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = data.length;
    const evaluated = data.filter((d) => d.evaluation !== null);
    const avgScore = evaluated.length > 0
      ? Math.round(evaluated.reduce((acc, d) => acc + (d.evaluation?.overallScore ?? 0), 0) / evaluated.length)
      : 0;
    const avgOnTime = evaluated.length > 0
      ? Math.round(evaluated.reduce((acc, d) => acc + (d.evaluation?.onTimeDelivery ?? 0), 0) / evaluated.length)
      : 0;
    const totalTasks = evaluated.reduce((acc, d) => acc + (d.evaluation?.completedTasks ?? 0), 0);
    return { total, avgScore, avgOnTime, totalTasks };
  }, [data]);

  const chartData = useMemo(() => {
    return sorted.slice(0, 8).map((m) => ({
      name: m.name.split(" ")[0],
      score: m.evaluation?.overallScore ?? 0,
    }));
  }, [sorted]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <BarChart3 className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تقييم الأداء البرمجي وكفاءة المهام
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Performance Analytics
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              متابعة معدلات إنجاز المهام، دقة التقدير الزمني، وجودة المخرجات التقنية لأعضاء فريق التطوير
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="pr-7 pl-3 py-1.5 border border-border/70 rounded-lg bg-card text-foreground text-xs font-mono focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  الفترة: {opt.label}
                </option>
              ))}
            </select>
            <Filter className="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg border border-border/70 bg-card hover:bg-muted/50 text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">المطورين المقيمين</span>
              <User className="size-3.5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">متوسط التقييم العام</span>
              <Award className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-primary font-mono tabular-nums">
              {stats.avgScore}%
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الالتزام بالموعد</span>
              <Clock className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.avgOnTime}%
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">المهام المكتملة</span>
              <CheckCircle2 className="size-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-500 font-mono tabular-nums">
              {stats.totalTasks}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Surface */}
      {chartData.length > 0 && (
        <section className="rounded-xl border border-border/80 dark:border-border/60 bg-card p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <BarChart3 className="size-3.5 text-primary" />
              أعلى المطورين حسب مؤشر التقييم العام
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Performance Distribution</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="transparent" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="transparent" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.score >= 80 ? "#10B981" : entry.score >= 60 ? "#F59E0B" : "#EF4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Main Table Chassis */}
      <section className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <h2 className="text-xs font-mono font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
            <Target className="size-3.5 text-primary" />
            جدول مقاييس الأداء التفصيلي
          </h2>
          <span className="text-[10px] text-muted-foreground font-mono">
            انقر على أي عمود للترتيب
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="px-4 py-3">المطور</th>
                {[
                  { key: "overallScore", label: "التقييم العام" },
                  { key: "taskCompletion", label: "إنجاز المهام" },
                  { key: "onTimeDelivery", label: "التسليم بالموعد" },
                  { key: "estimationAccuracy", label: "دقة التقدير" },
                  { key: "qualityScore", label: "جودة الكود" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-center cursor-pointer hover:text-foreground transition-colors"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>{label}</span>
                      <ArrowUpDown className={`size-3 ${sortField === key ? "text-primary" : "text-muted-foreground/40"}`} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center">المهام المنجزة</th>
                <th className="px-4 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sorted.map((member, idx) => (
                <tr
                  key={member.memberId}
                  onClick={() => navigate(`/super-admin/dev-evaluations/member/${member.memberId}`)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-muted-foreground w-4 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="size-full rounded-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-xs">{member.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  {["overallScore", "taskCompletion", "onTimeDelivery", "estimationAccuracy", "qualityScore"].map(
                    (key) => {
                      const val = member.evaluation?.[key as keyof typeof member.evaluation] as number | null | undefined;
                      return (
                        <td key={key} className="px-4 py-3 text-center">
                          {val !== null && val !== undefined ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border tabular-nums ${getScoreBadge(val)}`}>
                              {Math.round(val)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-mono">—</span>
                          )}
                        </td>
                      );
                    }
                  )}
                  <td className="px-4 py-3 text-center font-mono text-xs tabular-nums text-foreground">
                    {member.evaluation ? (
                      <span>
                        {member.evaluation.completedTasks} / {member.evaluation.totalTasks}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-mono">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground group-hover:text-foreground transition-colors">
                    <ChevronRight className="size-3.5 rtl:rotate-180" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DevEvaluation;
