import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ChartBarIcon,
  ArrowPathIcon,
  UserIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
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
  { value: "WEEKLY", label: i18n.t("superAdmin.evaluation.periodOptions.WEEKLY") },
  { value: "MONTHLY", label: i18n.t("superAdmin.evaluation.periodOptions.MONTHLY") },
  { value: "QUARTERLY", label: i18n.t("superAdmin.evaluation.periodOptions.QUARTERLY") },
];

const getScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "text-gray-400";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};

const getScoreBg = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "bg-gray-100 dark:bg-gray-700";
  if (score >= 80) return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
  if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
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
        { headers: tokenManager.createAuthHeaders() },
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch evaluations:", err);
    } finally {
      setLoading(false);
    }
  }, [periodType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const aVal = a.evaluation?.[sortField as keyof typeof a.evaluation] ?? -1;
    const bVal = b.evaluation?.[sortField as keyof typeof b.evaluation] ?? -1;
    return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const chartData = sorted.slice(0, 10).map((m) => ({
    name: m.name.split(" ")[0],
    score: m.evaluation?.overallScore ?? 0,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ChartBarIcon className="h-7 w-7 text-indigo-500" />
            {i18n.t("superAdmin.evaluation.title")}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {i18n.t("superAdmin.evaluation.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <FunnelIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{i18n.t("superAdmin.evaluation.bestTitle")}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.score >= 80 ? "#22c55e" : entry.score >= 60 ? "#eab308" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{i18n.t("superAdmin.evaluation.columns.developer")}</th>
                {[
                  { key: "overallScore", label: i18n.t("superAdmin.evaluation.columns.overallScore") },
                  { key: "taskCompletion", label: i18n.t("superAdmin.evaluation.columns.taskCompletion") },
                  { key: "onTimeDelivery", label: i18n.t("superAdmin.evaluation.columns.onTimeDelivery") },
                  { key: "estimationAccuracy", label: i18n.t("superAdmin.evaluation.columns.estimationAccuracy") },
                  { key: "qualityScore", label: i18n.t("superAdmin.evaluation.columns.qualityScore") },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {label}
                      {sortField === key && (
                        <span className="text-indigo-500">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{i18n.t("superAdmin.evaluation.columns.tasks")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((member, idx) => (
                <tr
                  key={member.memberId}
                  onClick={() => navigate(`/super-admin/dev-evaluations/member/${member.memberId}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-indigo-500" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                        <div className="text-xs text-gray-400">{member.role}</div>
                      </div>
                    </div>
                  </td>
                  {["overallScore", "taskCompletion", "onTimeDelivery", "estimationAccuracy", "qualityScore"].map(
                    (key) => {
                      const val = member.evaluation?.[key as keyof typeof member.evaluation] as number | null | undefined;
                      return (
                        <td key={key} className="px-4 py-3 text-center">
                          {val !== null && val !== undefined ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getScoreBg(val)}`}
                            >
                              {Math.round(val)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">--</span>
                          )}
                        </td>
                      );
                    },
                  )}
                  <td className="px-4 py-3 text-center text-sm text-gray-500">
                    {member.evaluation ? (
                      <span>
                        {member.evaluation.completedTasks}/{member.evaluation.totalTasks}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">--</span>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {i18n.t("superAdmin.evaluation.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DevEvaluation;
