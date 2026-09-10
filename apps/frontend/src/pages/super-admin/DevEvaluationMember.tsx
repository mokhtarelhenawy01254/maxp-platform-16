import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowLeftIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
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
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  return "#ef4444";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full" dir={i18n.dir()}>
      <button
        onClick={() => navigate("/super-admin/dev-evaluations")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {i18n.t("superAdmin.evaluation.member.back")}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <StarIcon className="h-7 w-7 text-yellow-500" />
            {i18n.t("superAdmin.evaluation.member.title")}
          </h1>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="pr-4 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
        >
          {Object.entries(periodLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {current ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">{i18n.t("superAdmin.evaluation.member.radarTitle")}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-500 mb-1">{i18n.t("superAdmin.evaluation.member.overallScoreLabel")}</div>
                <div className={`text-3xl sm:text-4xl font-bold tabular-nums ${getScoreColor(current.overallScore)}`}>
                  {Math.round(current.overallScore)}
                </div>
                <div className="text-xs text-gray-400 mt-1">{i18n.t("superAdmin.evaluation.member.outOf")}</div>
              </div>
              <div className="space-y-3">
                {Object.entries(metricLabels).map(([key, label]) => {
                  const val = current[key as keyof Evaluation] as number;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                      <span className={`text-sm font-semibold ${getScoreColor(val)}`}>
                        {Math.round(val)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {historyData.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4">{i18n.t("superAdmin.evaluation.member.trendTitle")}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historyData}>
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {historyData.map((entry, idx) => (
                      <Cell key={idx} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CheckCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{i18n.t("superAdmin.evaluation.member.metrics.completedTasks")}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {current.completedTasks}/{current.totalTasks}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <ClockIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{i18n.t("superAdmin.evaluation.member.metrics.workHours")}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {current.totalHours.toFixed(1)} {i18n.t("superAdmin.evaluation.member.metrics.hoursSuffix")}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <ChartBarIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{i18n.t("superAdmin.evaluation.member.metrics.goalsAchieved")}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {current.goalsAchieved}/{current.goalsAssigned}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{i18n.t("superAdmin.evaluation.member.metrics.reopenedTasks")}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {current.reopenedTasks}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{i18n.t("superAdmin.evaluation.member.historyTitle")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.period")}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.overallScore")}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.taskCompletion")}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.timeliness")}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.quality")}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{i18n.t("superAdmin.evaluation.member.historyColumns.tasks")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {evaluations.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {periodLabels[ev.periodType] || ev.periodType}
                        <span className="text-xs text-gray-400 mr-2">
                          {new Date(ev.periodStart).toLocaleDateString("ar-EG")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreBg(ev.overallScore)}`}>
                          {Math.round(ev.overallScore)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(ev.taskCompletion)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(ev.onTimeDelivery)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(ev.qualityScore)}%
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {ev.completedTasks}/{ev.totalTasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center">
          <ChartBarIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500">{i18n.t("superAdmin.evaluation.member.emptyDetail")}</p>
          <p className="text-gray-400 text-sm mt-1">{i18n.t("superAdmin.evaluation.member.emptyDetailHint")}</p>
        </div>
      )}
    </div>
  );
};

export default DevEvaluationMember;
