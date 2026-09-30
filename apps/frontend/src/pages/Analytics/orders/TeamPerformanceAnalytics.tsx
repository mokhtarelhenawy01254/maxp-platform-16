import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  UsersIcon,
  XCircleIcon,
  TrophyIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodKey,
  PeriodRange,
  computePeriodRange,
  getPeriodLabel,
} from "../../../components/common/PeriodSelector";

interface TeamStats {
  teamMembers: Array<{
    userId: string;
    userName: string;
    email: string;
    role: string;
    ordersCreated: number;
    ordersConfirmed: number;
    totalRevenue: number;
    deliveredOrders: number;
    cancelledOrders: number;
    successRate: number;
    avgOrderValue: number;
  }>;
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

  // Default is "today" for Team Performance Analytics
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

  // Sync to URL & localStorage on initial mount if not yet present in URL
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

  const appliedPeriodBadge = (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 text-xs font-medium">
      <CalendarDaysIcon className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <span className="text-gray-600 dark:text-gray-400">
        {t("periodSelector.appliedPeriod", "الفترة المطبقة")}:
      </span>
      <span className="font-semibold text-blue-700 dark:text-blue-300">
        {appliedPeriodLabel}
      </span>
      {range.startDate && range.endDate && (
        <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px] ltr:ml-1 rtl:mr-1">
          {range.startDate === range.endDate
            ? `(${range.startDate})`
            : `(${range.startDate} إلى ${range.endDate})`}
        </span>
      )}
    </div>
  );

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("teamPerformance.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {t("teamPerformance.subtitle")}
        </p>
        <div className="pt-0.5">{appliedPeriodBadge}</div>
      </div>
      <PeriodSelector
        initialPeriod={initialConfig.period}
        initialStartDate={initialConfig.startDate}
        initialEndDate={initialConfig.endDate}
        onRangeChange={handleRangeChange}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        {header}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir="rtl">
        {header}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchData(range)}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t("teamPerformance.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {header}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("teamPerformance.totalMembers")}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.totalTeamMembers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("teamPerformance.totalOrders")}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.totalOrdersProcessed?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <TrophyIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("teamPerformance.totalRevenue")}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {stats?.totalTeamRevenue?.toLocaleString()}{" "}
                {t("teamPerformance.currency")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {stats?.teamMembers && stats.teamMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("teamPerformance.ordersProcessed")}
          </h3>
          <div style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer width="100%" height={350} minHeight={350}>
              <BarChart data={stats.teamMembers} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.1}
                />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis
                  dataKey="userName"
                  type="category"
                  stroke="#9CA3AF"
                  fontSize={12}
                  width={120}
                />
                <Tooltip />
                <Bar
                  dataKey="ordersCreated"
                  fill="#3B82F6"
                  name={t("teamPerformance.ordersCreated")}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {stats?.teamMembers && stats.teamMembers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-yellow-500" />
            {t("teamPerformance.performanceDetails")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.employee")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.role")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.ordersCreated")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.ordersConfirmed")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.totalRevenue")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.successRate")}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t("teamPerformance.avgOrderValue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.teamMembers.map((member, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white font-medium">
                      <div>
                        <p className="font-medium">{member.userName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {member.role}
                    </td>
                    <td className="py-3 px-4 text-sm text-blue-600">
                      {member.ordersCreated?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-green-600">
                      {member.ordersConfirmed?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-purple-600">
                      {member.totalRevenue?.toLocaleString()}{" "}
                      {t("teamPerformance.currency")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${Math.min(member.successRate, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {typeof member.successRate === "number"
                            ? member.successRate.toFixed(1)
                            : "0.0"}
                          %
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-orange-600">
                      {member.avgOrderValue?.toLocaleString()}{" "}
                      {t("teamPerformance.currency")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPerformanceAnalytics;
