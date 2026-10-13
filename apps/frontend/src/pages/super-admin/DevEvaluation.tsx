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
  ChevronRight
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

const periodOptions = [
  { value: "WEEKLY", label: "أسبوعي" },
  { value: "MONTHLY", label: "شهري" },
  { value: "QUARTERLY", label: "ربع سنوي" },
];

const getScoreBadge = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (score >= 80) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (score >= 60) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }
  return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
};

const DevEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<MemberEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch evaluations:", err);
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
      return sortDir === "desc"
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });
  }, [data, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = data.length;
    const evaluated = data.filter((d) => d.evaluation !== null);
    const avgScore =
      evaluated.length > 0
        ? Math.round(
            evaluated.reduce((acc, d) => acc + (d.evaluation?.overallScore ?? 0), 0) /
              evaluated.length
          )
        : 0;
    const avgOnTime =
      evaluated.length > 0
        ? Math.round(
            evaluated.reduce((acc, d) => acc + (d.evaluation?.onTimeDelivery ?? 0), 0) /
              evaluated.length
          )
        : 0;
    const totalTasks = evaluated.reduce(
      (acc, d) => acc + (d.evaluation?.completedTasks ?? 0),
      0
    );
    return { total, avgScore, avgOnTime, totalTasks };
  }, [data]);

  const chartData = useMemo(() => {
    return sorted.slice(0, 10).map((m) => ({
      name: m.name.split(" ")[0],
      score: m.evaluation?.overallScore ?? 0,
    }));
  }, [sorted]);

  return (
    <div dir={i18n.dir()} className="w-full min-h-screen bg-background text-foreground space-y-6 p-4 sm:p-6">
      {/* Top Header Chassis */}
      <header className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-4" />
              </span>
              <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Performance Analytics
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              تقييم الأداء البرمجي وكفاءة المهام
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              متابعة معدلات إنجاز المهام، دقة التقدير الزمني، وجودة المخرجات التقنية لأعضاء فريق التطوير.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value)}
                className="pr-8 pl-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    الفترة: {opt.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث التقييمات</span>
            </button>
          </div>
        </div>
      </header>

      {/* Telemetry Summary Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">المطورين المقيمين</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-foreground tabular-nums">
              {stats.total}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-muted text-muted-foreground">
            <User className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">متوسط التقييم العام</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-primary tabular-nums">
              {stats.avgScore}%
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Award className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">الالتزام بالموعد</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.avgOnTime}%
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Clock className="size-5" />
          </span>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">المهام المكتملة</span>
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono text-amber-500 tabular-nums">
              {stats.totalTasks}
            </div>
          </div>
          <span className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <CheckCircle2 className="size-5" />
          </span>
        </div>
      </div>

      {/* Chart Surface */}
      {chartData.length > 0 && (
        <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              أعلى 10 مطورين حسب التقييم العام
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Performance Distribution</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="transparent" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="transparent" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
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
      <section className="rounded-xl border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <h2 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="size-4 text-primary" />
            جدول مقاييس الأداء التفصيلي
          </h2>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            انقر على أي عمود للترتيب
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-muted-foreground">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span className="text-xs font-medium">جاري فحص مؤشرات الأداء...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
            <BarChart3 className="size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium">لا توجد تقييمات مسجلة لهذه الفترة</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3.5">المطور</th>
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
                      className="px-4 py-3.5 text-center cursor-pointer hover:text-foreground transition-colors"
                    >
                      <div className="inline-flex items-center gap-1">
                        <span>{label}</span>
                        <ArrowUpDown className={`size-3 ${sortField === key ? "text-primary" : "text-muted-foreground/50"}`} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-center">المهام المنجزة</th>
                  <th className="px-4 py-3.5 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sorted.map((member, idx) => (
                  <tr
                    key={member.memberId}
                    onClick={() => navigate(`/super-admin/dev-evaluations/member/${member.memberId}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-4 tabular-nums">
                          {idx + 1}
                        </span>
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="size-full rounded-full object-cover" />
                          ) : (
                            member.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{member.name}</div>
                          <div className="text-[11px] text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                    </td>
                    {["overallScore", "taskCompletion", "onTimeDelivery", "estimationAccuracy", "qualityScore"].map(
                      (key) => {
                        const val = member.evaluation?.[key as keyof typeof member.evaluation] as number | null | undefined;
                        return (
                          <td key={key} className="px-4 py-3.5 text-center">
                            {val !== null && val !== undefined ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border tabular-nums ${getScoreBadge(
                                  val
                                )}`}
                              >
                                {Math.round(val)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        );
                      }
                    )}
                    <td className="px-4 py-3.5 text-center font-mono text-xs tabular-nums text-foreground">
                      {member.evaluation ? (
                        <span>
                          {member.evaluation.completedTasks} / {member.evaluation.totalTasks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <ChevronRight className="size-4 rtl:rotate-180" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DevEvaluation;
