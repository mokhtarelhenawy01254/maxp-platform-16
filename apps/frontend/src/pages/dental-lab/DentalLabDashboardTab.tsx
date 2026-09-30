import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Layers,
  Loader2,
  PackageCheck,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { fetchDashboard, DashboardData, CASE_STATUSES, fmtMoney } from "./shared";

export default function DentalLabDashboardTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const byStatus = data?.byStatus ?? {};
  const topDoctors = data?.topDoctors ?? [];
  const topDebtors = data?.topDebtors ?? [];
  const totalCases = Object.values(byStatus).reduce((a, b) => a + (Number(b) || 0), 0);
  const activeCasesCount = data?.activeCasesCount ?? data?.activeCount ?? Object.entries(byStatus)
    .filter(([st]) => !["DELIVERED", "CLOSED"].includes(st))
    .reduce((sum, [, cnt]) => sum + (Number(cnt) || 0), 0);

  const cards = [
    {
      id: "todayReceived",
      label: "وارد اليوم (مستلم)",
      value: data?.todayReceived ?? "—",
      icon: <PackageCheck className="w-5 h-5" />,
      tone: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      tooltip: "عرض الحالات التي تم استلامها وتسجيلها اليوم",
      onClick: () => navigate("/dental-lab/cases?dateRange=received_today"),
    },
    {
      id: "todayDue",
      label: "خارج اليوم (تسليمات اليوم)",
      value: data?.todayDue ?? "—",
      icon: <Clock className="w-5 h-5" />,
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      tooltip: "عرض الحالات المطلوب خروجها وتسليمها اليوم للعيادات",
      onClick: () => navigate("/dental-lab/cases?dateRange=due_today"),
    },
    {
      id: "activeCases",
      label: "الحالات الجارية (نشطة)",
      value: activeCasesCount,
      icon: <Layers className="w-5 h-5" />,
      tone: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-900/20",
      tooltip: "عرض كافة الحالات قيد التشغيل في المعمل",
      onClick: () => navigate("/dental-lab/cases?tab=ACTIVE"),
    },
    {
      id: "readyCount",
      label: t("dentalLab.dashboard.readyCount"),
      value: data?.readyCount ?? "—",
      icon: <CheckCircle2 className="w-5 h-5" />,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      tooltip: "عرض الحالات الجاهزة للتسليم",
      onClick: () => navigate("/dental-lab/cases?status=READY"),
    },
    {
      id: "overdueCount",
      label: t("dentalLab.dashboard.overdueCount"),
      value: data?.overdueCount ?? "—",
      icon: <AlertTriangle className="w-5 h-5" />,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      tooltip: "عرض الحالات المتأخرة عن موعد التسليم",
      onClick: () => navigate("/dental-lab/cases?tab=OVERDUE"),
    },
    {
      id: "revenue",
      label: t("dentalLab.dashboard.collected"),
      value: data?.revenue != null ? `${fmtMoney(data.revenue)} ج` : "—",
      icon: <Coins className="w-5 h-5" />,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      tooltip: "عرض الفواتير والتحصيلات",
      onClick: () => navigate("/dental-lab/invoices"),
    },
    {
      id: "outstanding",
      label: t("dentalLab.dashboard.outstanding"),
      value: data?.outstanding != null ? `${fmtMoney(data.outstanding)} ج` : "—",
      icon: <Wallet className="w-5 h-5" />,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
      tooltip: "عرض الفواتير المعلقة غير المسددة",
      onClick: () => navigate("/dental-lab/invoices?status=UNPAID"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("dentalLab.tabs.dashboard")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.dashboard.subtitle")}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("dentalLab.common.refresh")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* KPI Cards — Clickable with Drill-Down */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {cards.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={c.onClick}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && c.onClick()}
                title={c.tooltip}
                className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.tone} group-hover:scale-105 transition-transform`}>
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center justify-between">
                    <span>{c.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </p>
                  <p className={`text-xl font-bold truncate ${c.tone}`}>{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* By Status — Clickable per stage */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("dentalLab.dashboard.byStatus")}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {totalCases} {t("dentalLab.dashboard.totalCases")}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-4 flex cursor-pointer" title="انقر على أي مرحلة بالأسفل للفلترة">
                {CASE_STATUSES.map((s) => {
                  const count = byStatus[s.id] ?? 0;
                  if (!count) return null;
                  return (
                    <div
                      key={s.id}
                      className="h-full hover:opacity-80 transition-opacity"
                      style={{ width: `${(count / (totalCases || 1)) * 100}%`, backgroundColor: s.barColor }}
                      onClick={() => navigate(`/dental-lab/cases?status=${s.id}`)}
                      title={`${s.label}: ${count}`}
                    />
                  );
                })}
              </div>
              <div className="space-y-1">
                {CASE_STATUSES.map((s) => {
                  const count = byStatus[s.id] ?? 0;
                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/dental-lab/cases?status=${s.id}`)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(`/dental-lab/cases?status=${s.id}`)}
                      className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors group"
                      title={`عرض حالات مرحلة "${s.label}" (${count})`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                        <span className="text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                          {s.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {count}
                        </span>
                        <ArrowLeft className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(byStatus).length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
                )}
              </div>
            </div>

            {/* Top Doctors — Clickable to Doctor Detail or filtered cases */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("dentalLab.dashboard.topDoctors")}</h3>
                <button
                  onClick={() => navigate("/dental-lab/doctors")}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  عرض جميع الأطباء <ArrowLeft className="w-3 h-3" />
                </button>
              </div>
              {topDoctors.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-300 text-xs">
                        <th className="text-right py-2 px-2">{t("dentalLab.dashboard.doctorName")}</th>
                        <th className="text-center py-2 px-2">{t("dentalLab.dashboard.caseCount")}</th>
                        <th className="text-left py-2 px-2">{t("dentalLab.dashboard.doctorRevenue")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDoctors.map((d, i) => (
                        <tr
                          key={d.doctorId ?? i}
                          onClick={() => {
                            if (d.doctorId) navigate(`/dental-lab/doctors/${d.doctorId}`);
                            else if (d.doctorName) navigate(`/dental-lab/cases?search=${encodeURIComponent(d.doctorName)}`);
                          }}
                          className="border-b dark:border-gray-700 last:border-b-0 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 cursor-pointer transition-colors group"
                          title="اضغط لفتح الملف الكامل للطبيب وحالاته"
                        >
                          <td className="py-2.5 px-2 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                            <span>{d.doctorName || "—"}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity text-blue-500" />
                          </td>
                          <td className="py-2.5 px-2 text-center font-semibold">{d.count ?? 0}</td>
                          <td className="py-2.5 px-2 text-left font-bold text-emerald-600 dark:text-emerald-400">
                            {fmtMoney(d.revenue)} ج
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Debtors — Clickable to Doctor Statement / Invoices */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">{t("dentalLab.dashboard.topDebtors")}</h3>
                <button
                  onClick={() => navigate("/dental-lab/invoices?status=UNPAID")}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                >
                  الفواتير غير المسددة <ArrowLeft className="w-3 h-3" />
                </button>
              </div>
              {topDebtors.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.common.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {topDebtors.map((d, i) => (
                    <div
                      key={d.doctorId ?? i}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (d.doctorId) navigate(`/dental-lab/doctors/${d.doctorId}`);
                        else navigate("/dental-lab/invoices?status=UNPAID");
                      }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (d.doctorId ? navigate(`/dental-lab/doctors/${d.doctorId}`) : navigate("/dental-lab/invoices?status=UNPAID"))}
                      className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-rose-50/70 dark:hover:bg-rose-950/20 cursor-pointer transition-colors group"
                      title="اضغط لفتح كشف حساب وفواتير الطبيب"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center shrink-0 font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 truncate">
                          {d.doctorName || "—"}
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity text-rose-500 shrink-0" />
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {fmtMoney(d.outstanding)} {t("dentalLab.common.egp")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">إجراءات سريعة</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  وصول فوري لأهم شاشات الإنتاج والتشغيل في المعمل
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => navigate("/dental-lab/cases?new=1")}
                    className="p-3 text-right rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-semibold transition-colors"
                  >
                    إنشاء أمر شغل جديد
                  </button>
                  <button
                    onClick={() => navigate("/dental-lab/cases?tab=OVERDUE")}
                    className="p-3 text-right rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 text-xs font-semibold transition-colors"
                  >
                    متابعة الحالات المتأخرة
                  </button>
                  <button
                    onClick={() => navigate("/dental-lab/cases?kiosk=1")}
                    className="p-3 text-right rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/60 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs font-semibold transition-colors"
                  >
                    محطة مسح الباركود Kiosk
                  </button>
                  <button
                    onClick={() => navigate("/dental-lab/invoices")}
                    className="p-3 text-right rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    إصدار وتحصيل الفواتير
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
