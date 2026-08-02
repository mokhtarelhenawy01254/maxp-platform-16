import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";

interface ReportData {
  periodDays: number;
  pipeline: {
    total: number;
    active: number;
    lost: number;
    totalValue: number;
    activeValue: number;
    lostValue: number;
  };
  recovery: {
    converted: number;
    convertedValue: number;
    avgConvertedValue: number;
    recoveryRate: number;
  };
  team: Array<{
    employeeId: string | null;
    employeeName: string;
    conversions: number;
    value: number;
    avgValue: number;
  }>;
  trend: Array<{ date: string; conversions: number; value: number }>;
  recent: Array<{
    cartId: string;
    orderNumber: string | null;
    employeeName: string | null;
    value: number;
    governorate: string | null;
    convertedAt: string | null;
  }>;
}

const PERIODS = ["7", "30", "90"];

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const IncompleteReports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isRTL = getDirection() === "rtl";

  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{ success: boolean; data?: ReportData }>(
        "/orders-new/incomplete/reports",
        { params: { days: period } },
      );
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError(t("orders.incompleteReportsError"));
      }
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiError.response?.data?.message || apiError.message || t("orders.incompleteReportsError"));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-GB");
    } catch {
      return dateStr;
    }
  };

  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  const recoveryCards: StatCard[] = data
    ? [
        {
          label: t("orders.incompleteRecovered"),
          value: data.recovery.converted.toLocaleString(),
          icon: CheckCircleIcon,
          color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30",
        },
        {
          label: t("orders.incompleteRecoveredValue"),
          value: formatPrice(data.recovery.convertedValue),
          icon: CurrencyDollarIcon,
          color: "text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30",
        },
        {
          label: t("orders.incompleteRecoveryRate"),
          value: `${data.recovery.recoveryRate.toFixed(1)}%`,
          icon: ShoppingCartIcon,
          color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
        },
        {
          label: t("orders.incompleteAvgConvertedValue"),
          value: formatPrice(data.recovery.avgConvertedValue),
          icon: UserGroupIcon,
          color: "text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30",
        },
      ]
    : [];

  const pipelineCards: StatCard[] = data
    ? [
        {
          label: t("orders.incompleteActiveCarts"),
          value: data.pipeline.active.toLocaleString(),
          sub: formatPrice(data.pipeline.activeValue),
          icon: ClockIcon,
          color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30",
        },
        {
          label: t("orders.incompleteLostCarts"),
          value: data.pipeline.lost.toLocaleString(),
          sub: formatPrice(data.pipeline.lostValue),
          icon: ExclamationTriangleIcon,
          color: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30",
        },
        {
          label: t("orders.incompleteRecoverableValue"),
          value: formatPrice(data.pipeline.activeValue),
          icon: CurrencyDollarIcon,
          color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
        },
        {
          label: t("orders.totalValue"),
          value: formatPrice(data.pipeline.totalValue),
          icon: ShoppingCartIcon,
          color: "text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800",
        },
      ]
    : [];

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteReports")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t("orders.incompleteSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            aria-label={t("orders.incompleteDays", { count: Number(period) }) as string}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {t("orders.incompleteDays", { count: Number(p) })}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={t("orders.incompleteRetry") as string}
            aria-label={t("orders.incompleteRetry") as string}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            to="/orders/incomplete"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <BackIcon className="h-4 w-4" />
            {t("orders.incompleteBack")}
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-700/40 dark:bg-gray-800">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t("orders.incompleteRetry")}
          </button>
        </div>
      ) : data ? (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t("orders.incompleteRecoveryOverview")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recoveryCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  {card.sub && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t("orders.incompleteRecoveryPipeline")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {pipelineCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  {card.sub && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {t("orders.incompleteConversionTrend")}
              </h2>
              {data.trend.length ? (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="conversions"
                        name={t("orders.incompleteTeamConversions") as string}
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="value"
                        name={t("orders.incompleteValue") as string}
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  {t("orders.incompleteNoConversions")}
                </p>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {t("orders.incompleteRecentConversions")}
              </h2>
              {data.recent.length ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.recent.map((c) => (
                    <div
                      key={c.cartId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {c.orderNumber || c.cartId.slice(0, 12)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {c.employeeName || "-"} · {formatDate(c.convertedAt)}
                          {c.governorate ? ` · ${c.governorate}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatPrice(c.value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  {t("orders.incompleteNoConversions")}
                </p>
              )}
            </section>
          </div>

          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t("orders.incompleteTeamPerformance")}
            </h2>
            {data.team.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-start min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamEmployee")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamConversions")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamValue")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamAvg")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.map((member, idx) => (
                      <tr
                        key={`${member.employeeId || member.employeeName}-${idx}`}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {member.employeeName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {member.conversions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(member.value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatPrice(member.avgValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {t("orders.incompleteNoConversions")}
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};

export default IncompleteReports;
