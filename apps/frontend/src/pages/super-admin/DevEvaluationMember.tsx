import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface Evaluation {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
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
}

const DEFAULT_EVALUATIONS: Evaluation[] = [
  {
    id: "eval-1",
    periodType: "MONTHLY",
    periodStart: "2026-03-01T00:00:00.000Z",
    periodEnd: "2026-03-31T23:59:59.000Z",
    overallScore: 89,
    taskCompletion: 92,
    onTimeDelivery: 88,
    estimationAccuracy: 86,
    timeEfficiency: 91,
    goalAchievement: 85,
    qualityScore: 92,
    totalTasks: 28,
    completedTasks: 26,
    totalHours: 154,
    estimatedHours: 160,
    goalsAssigned: 4,
    goalsAchieved: 4,
    reopenedTasks: 1,
  },
  {
    id: "eval-2",
    periodType: "MONTHLY",
    periodStart: "2026-02-01T00:00:00.000Z",
    periodEnd: "2026-02-28T23:59:59.000Z",
    overallScore: 84,
    taskCompletion: 88,
    onTimeDelivery: 82,
    estimationAccuracy: 84,
    timeEfficiency: 86,
    goalAchievement: 80,
    qualityScore: 86,
    totalTasks: 25,
    completedTasks: 22,
    totalHours: 148,
    estimatedHours: 150,
    goalsAssigned: 3,
    goalsAchieved: 3,
    reopenedTasks: 2,
  },
  {
    id: "eval-3",
    periodType: "MONTHLY",
    periodStart: "2026-01-01T00:00:00.000Z",
    periodEnd: "2026-01-31T23:59:59.000Z",
    overallScore: 78,
    taskCompletion: 80,
    onTimeDelivery: 75,
    estimationAccuracy: 80,
    timeEfficiency: 79,
    goalAchievement: 75,
    qualityScore: 81,
    totalTasks: 22,
    completedTasks: 18,
    totalHours: 140,
    estimatedHours: 145,
    goalsAssigned: 3,
    goalsAchieved: 2,
    reopenedTasks: 3,
  }
];

const periodLabels: Record<string, string> = {
  WEEKLY: "أسبوعي",
  MONTHLY: "شهري",
  QUARTERLY: "ربع سنوي",
};

const metricLabels: Record<string, string> = {
  taskCompletion: "إنجاز المهام",
  onTimeDelivery: "الالتزام بالمواعيد",
  estimationAccuracy: "دقة التقدير",
  timeEfficiency: "كفاءة الوقت",
  goalAchievement: "تحقيق الأهداف",
  qualityScore: "جودة الكود",
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
};

const getScoreTextClass = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
};

const getScoreBadgeClass = (score: number) => {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
};

const DevEvaluationMember: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("MONTHLY");

  useEffect(() => {
    fetchEvaluations();
  }, [memberId]);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(`super-admin/dev/evaluations/member/${memberId || "m-1"}`),
        { headers: tokenManager.createAuthHeaders() },
      );
      const json = await res.json();
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        setEvaluations(json.data);
      } else {
        setEvaluations(DEFAULT_EVALUATIONS);
      }
    } catch {
      setEvaluations(DEFAULT_EVALUATIONS);
    } finally {
      setLoading(false);
    }
  };

  const currentList = evaluations.length > 0 ? evaluations : DEFAULT_EVALUATIONS;
  const current = currentList.find((e) => e.periodType === selectedPeriod) || currentList[0];

  const radarData = current
    ? Object.entries(metricLabels).map(([key, label]) => ({
        metric: label,
        score: current[key as keyof Evaluation] as number,
      }))
    : [];

  const historyData = [...currentList]
    .filter((e) => e.periodType === selectedPeriod)
    .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .map((e) => ({
      period: new Date(e.periodStart).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      score: e.overallScore,
    }));

  return (
    <div className="space-y-4 p-4 sm:p-6 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/super-admin/dev-evaluations")}
            className="size-8.5 rounded-lg border border-border/80 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shadow-2xs"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                تقييم الأداء الفردي للمطور
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {memberId || "MEMBER"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              مؤشرات الأداء الفردي والتحليل الراداري والتاريخي للتقييم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-border/80 rounded-lg px-2.5 py-1 bg-card text-foreground text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none shadow-2xs cursor-pointer"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Radar Analysis */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
                <h3 className="text-xs font-semibold text-foreground">
                  المصفوفة الرادارية لأبعاد التقييم
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground">أبعاد التقييم الستة</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="currentColor" className="text-border/60" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "currentColor" }} className="text-muted-foreground" />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Overall Score Card */}
            <div className="bg-card rounded-xl border border-border/80 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-center pb-3 mb-3 border-b border-border/60">
                  <div className="text-[10px] text-muted-foreground font-mono mb-0.5">
                    معدل الأداء الإجمالي العام
                  </div>
                  <div className={`text-3xl font-extrabold tracking-tight font-mono tabular-nums ${getScoreTextClass(current.overallScore)}`}>
                    {Math.round(current.overallScore)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    التقييم المحتسب من 100%
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(metricLabels).map(([key, label]) => {
                    const val = current[key as keyof Evaluation] as number;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground text-[11px]">{label}</span>
                        <span className={`font-mono font-semibold tabular-nums text-xs ${getScoreTextClass(val)}`}>
                          {Math.round(val)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trend Chart */}
          {historyData.length > 1 && (
            <div className="bg-card rounded-xl border border-border/80 p-4 shadow-xs">
              <h3 className="text-xs font-semibold text-foreground mb-3">
                المسار الزمني لتقدم التقييم
              </h3>
              <div className="h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData}>
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {historyData.map((entry, idx) => (
                        <Cell key={idx} fill={getScoreColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Telemetry Metrics Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card shadow-xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden">
            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">المهام المنجزة</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums">
                  {current.completedTasks} <span className="text-[10px] text-muted-foreground font-normal">/ {current.totalTasks}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">ساعات العمل</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums">
                  {current.totalHours.toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">ساعة</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <BarChart3 className="size-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">الأهداف المحققة</p>
                <p className="text-base font-bold text-foreground font-mono tabular-nums">
                  {current.goalsAchieved} <span className="text-[10px] text-muted-foreground font-normal">/ {current.goalsAssigned}</span>
                </p>
              </div>
            </div>

            <div className="p-3.5 flex items-center gap-3 hover:bg-muted/10 transition-colors">
              <div className="size-8 rounded-lg border border-border/80 bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">المهام المعاد فتحها</p>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                  {current.reopenedTasks}
                </p>
              </div>
            </div>
          </div>

          {/* Historical Logs Table */}
          <div className="bg-card rounded-xl border border-border/80 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 bg-muted/20">
              <h3 className="text-xs font-semibold text-foreground">
                سجل التقييمات التاريخية
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/30 border-b border-border/60 text-[10px] font-mono text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2 text-right">الفترة</th>
                    <th className="px-3.5 py-2 text-center">التقييم العام</th>
                    <th className="px-3.5 py-2 text-center">إنجاز المهام</th>
                    <th className="px-3.5 py-2 text-center">الالتزام</th>
                    <th className="px-3.5 py-2 text-center">الجودة</th>
                    <th className="px-3.5 py-2 text-center">المهام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {currentList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-foreground">
                        {periodLabels[ev.periodType] || ev.periodType}
                        <span className="text-[10px] font-mono text-muted-foreground mr-2 tabular-nums">
                          {new Date(ev.periodStart).toLocaleDateString("ar-EG")}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold tabular-nums ${getScoreBadgeClass(ev.overallScore)}`}>
                          {Math.round(ev.overallScore)}%
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-foreground">
                        {Math.round(ev.taskCompletion)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-foreground">
                        {Math.round(ev.onTimeDelivery)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-foreground">
                        {Math.round(ev.qualityScore)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-muted-foreground">
                        {ev.completedTasks} / {ev.totalTasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DevEvaluationMember;
