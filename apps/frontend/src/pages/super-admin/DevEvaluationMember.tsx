import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Star,
  Award,
  Layers,
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

const periodLabels: Record<string, string> = {
  WEEKLY: i18n.t("superAdmin.evaluation.periodOptions.WEEKLY"),
  MONTHLY: i18n.t("superAdmin.evaluation.periodOptions.MONTHLY"),
  QUARTERLY: i18n.t("superAdmin.evaluation.periodOptions.QUARTERLY"),
};

const metricLabels: Record<string, string> = {
  taskCompletion: i18n.t("superAdmin.evaluation.columns.taskCompletion"),
  onTimeDelivery: i18n.t("superAdmin.evaluation.columns.onTimeDelivery"),
  estimationAccuracy: i18n.t("superAdmin.evaluation.columns.estimationAccuracy"),
  timeEfficiency: i18n.t("superAdmin.evaluation.columns.onTimeDelivery"),
  goalAchievement: i18n.t("superAdmin.evaluation.metrics.goalsAchieved"),
  qualityScore: i18n.t("superAdmin.evaluation.columns.qualityScore"),
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
    if (!memberId) return;
    fetchEvaluations();
  }, [memberId]);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(`super-admin/dev/evaluations/member/${memberId}`),
        { headers: tokenManager.createAuthHeaders() },
      );
      const json = await res.json();
      if (json.success) setEvaluations(json.data);
    } catch (err) {
      console.error("Failed to fetch member evaluations:", err);
    } finally {
      setLoading(false);
    }
  };

  const current = evaluations.find((e) => e.periodType === selectedPeriod);
  const radarData = current
    ? Object.entries(metricLabels).map(([key, label]) => ({
        metric: label,
        score: current[key as keyof Evaluation] as number,
      }))
    : [];

  const historyData = [...evaluations]
    .filter((e) => e.periodType === selectedPeriod)
    .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
    .map((e) => ({
      period: new Date(e.periodStart).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      score: e.overallScore,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/super-admin/dev-evaluations")}
            className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Star className="h-5 w-5" />
              </div>
              <span>{i18n.t("superAdmin.evaluation.member.title")}</span>
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              مؤشرات الأداء الفردي والتحليل الراداري والتاريخي للمطور
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 bg-card text-foreground text-xs focus:ring-1 focus:ring-primary focus:outline-none shadow-sm cursor-pointer"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {current ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Radar Analysis */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  {i18n.t("superAdmin.evaluation.member.radarTitle")}
                </h3>
                <span className="text-xs text-muted-foreground">أبعاد التقييم الستة</span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="currentColor" className="text-border/60" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                  <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Overall Score Card */}
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-center pb-4 mb-4 border-b border-border/60">
                  <div className="text-xs text-muted-foreground font-medium mb-1">
                    {i18n.t("superAdmin.evaluation.member.overallScoreLabel")}
                  </div>
                  <div className={`text-4xl font-extrabold tracking-tight tabular-nums ${getScoreTextClass(current.overallScore)}`}>
                    {Math.round(current.overallScore)}%
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {i18n.t("superAdmin.evaluation.member.outOf")}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(metricLabels).map(([key, label]) => {
                    const val = current[key as keyof Evaluation] as number;
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-semibold tabular-nums ${getScoreTextClass(val)}`}>
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
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
                {i18n.t("superAdmin.evaluation.member.trendTitle")}
              </h3>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={historyData}>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {historyData.map((entry, idx) => (
                      <Cell key={idx} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Telemetry Metrics Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {i18n.t("superAdmin.evaluation.member.metrics.completedTasks")}
                  </div>
                  <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">
                    {current.completedTasks} <span className="text-xs text-muted-foreground font-normal">/ {current.totalTasks}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {i18n.t("superAdmin.evaluation.member.metrics.workHours")}
                  </div>
                  <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">
                    {current.totalHours.toFixed(1)} {i18n.t("superAdmin.evaluation.member.metrics.hoursSuffix")}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {i18n.t("superAdmin.evaluation.member.metrics.goalsAchieved")}
                  </div>
                  <div className="text-lg font-bold text-foreground mt-0.5 tabular-nums">
                    {current.goalsAchieved} <span className="text-xs text-muted-foreground font-normal">/ {current.goalsAssigned}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium">
                    {i18n.t("superAdmin.evaluation.member.metrics.reopenedTasks")}
                  </div>
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                    {current.reopenedTasks}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Logs Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/60">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {i18n.t("superAdmin.evaluation.member.historyTitle")}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.period")}</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.overallScore")}</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.taskCompletion")}</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.timeliness")}</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.quality")}</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">{i18n.t("superAdmin.evaluation.member.historyColumns.tasks")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {evaluations.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {periodLabels[ev.periodType] || ev.periodType}
                        <span className="text-[11px] text-muted-foreground mr-2 tabular-nums">
                          {new Date(ev.periodStart).toLocaleDateString("ar-EG")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${getScoreBadgeClass(ev.overallScore)}`}>
                          {Math.round(ev.overallScore)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-foreground">
                        {Math.round(ev.taskCompletion)}%
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-foreground">
                        {Math.round(ev.onTimeDelivery)}%
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-foreground">
                        {Math.round(ev.qualityScore)}%
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">
                        {ev.completedTasks} / {ev.totalTasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border border-border p-10 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">{i18n.t("superAdmin.evaluation.member.emptyDetail")}</p>
          <p className="text-xs text-muted-foreground mt-1">{i18n.t("superAdmin.evaluation.member.emptyDetailHint")}</p>
        </div>
      )}
    </div>
  );
};

export default DevEvaluationMember;
