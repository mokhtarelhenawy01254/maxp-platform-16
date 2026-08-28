import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Coins, Loader2, PackageCheck, RefreshCw, Wallet } from "lucide-react";
import { fetchDashboard, DashboardData, CASE_STATUSES, fmtMoney } from "./shared";

export default function DentalLabDashboardTab() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = [
    { label: t("dentalLab.dashboard.todayReceived"), value: data?.todayReceived ?? "â€”", icon: <PackageCheck className="w-5 h-5" />, tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: t("dentalLab.dashboard.readyCount"), value: data?.readyCount ?? "â€”", icon: <CheckCircle2 className="w-5 h-5" />, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: t("dentalLab.dashboard.overdueCount"), value: data?.overdueCount ?? "â€”", icon: <AlertTriangle className="w-5 h-5" />, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: t("dentalLab.dashboard.revenue"), value: data?.revenue != null ? `${fmtMoney(data.revenue)} Ø¬` : "â€”", icon: <Coins className="w-5 h-5" />, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: t("dentalLab.dashboard.outstanding"), value: data?.outstanding != null ? `${fmtMoney(data.outstanding)} Ø¬` : "â€”", icon: <Wallet className="w-5 h-5" />, tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
  ];

const byStatus = data?.byStatus ?? {};
  const topDoctors = data?.topDoctors ?? [];
  const topDebtors = data?.topDebtors ?? [];
  const totalCases = Object.values(byStatus).reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("dentalLab.tabs.dashboard")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.dashboard.subtitle")}</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {cards.map(c => (
              <div key={c.label} className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.tone}`}>{c.icon}</div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.label}</p>
                  <p className={`text-xl font-bold truncate ${c.tone}`}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("dentalLab.dashboard.byStatus")}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{totalCases} {t("dentalLab.dashboard.totalCases")}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-4 flex">
                {CASE_STATUSES.map(s => {
                  const count = byStatus[s.id] ?? 0;
                  if (!count) return null;
                  return <div key={s.id} className="h-full" style={{ width: `${(count / (totalCases || 1)) * 100}%`, backgroundColor: s.barColor }} />;
                })}
              </div>
              <div className="space-y-2">
                {CASE_STATUSES.map(s => {
                  const count = byStatus[s.id] ?? 0;
                  return (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                        <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
                {Object.keys(byStatus).length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t("dentalLab.dashboard.topDoctors")}</h3>
              {topDoctors.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-300">
                        <th className="text-right py-2 px-2">{t("dentalLab.dashboard.doctorName")}</th>
                        <th className="text-right py-2 px-2">{t("dentalLab.dashboard.caseCount")}</th>
                        <th className="text-right py-2 px-2">{t("dentalLab.dashboard.doctorRevenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDoctors.map((d, i) => (
                        <tr key={d.doctorId ?? i} className="border-b dark:border-gray-700 last:border-b-0">
                          <td className="py-2 px-2 font-medium">{d.doctorName || "â€”"}</td>
                          <td className="py-2 px-2">{d.count ?? 0}</td>
                          <td className="py-2 px-2">{fmtMoney(d.revenue)}</td>
                        </tr>
                      ))}
</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t("dentalLab.dashboard.topDebtors")}</h3>
              {topDebtors.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {topDebtors.map((d, i) => (
                    <div key={d.doctorId ?? i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center shrink-0 font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{d.doctorName || "—"}</span>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{fmtMoney(d.outstanding)} {t("dentalLab.common.egp")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
