import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, fetchJson, RadiologyStatusMap, RadiologyOrderStatusMap } from "./shared";

interface StudyItem { status?: string; reportStatus?: string; emergency?: boolean; createdAt?: string; orderStatus?: string; }

interface FinancialSummary {
  patient: { total: number; collected: number; outstanding: number };
  insurance: { billed: number; collected: number; outstanding: number };
  totalCollected: number; totalOutstanding: number;
  byEntity?: { insuranceCompanyId: string; name: string; total: number; paid: number; remaining: number }[];
}

const ORDER_STATUS_KEYS = ["PENDING", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

const STATUS_BAR_COLORS: Record<string, string> = {
  PENDING: "#9ca3af",
  CHECKED_IN: "#3b82f6",
  IN_PROGRESS: "#f59e0b",
  COMPLETED: "#14b8a6",
  CANCELLED: "#ef4444",
};

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function RadiologyDashboardTab() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{
    studiesToday?: number; awaiting?: number; ready?: number; emergency?: number; revenue?: number;
  } | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<number>(0);
  const [orderBreakdown, setOrderBreakdown] = useState<Record<string, number> | null>(null);
  const [fin, setFin] = useState<FinancialSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const studiesUrl = new URL(api("studies"));
        studiesUrl.searchParams.set("limit", "200");
        const studies = await fetchJson<{ items?: StudyItem[]; total?: number }>(studiesUrl.toString());
        const items = studies.items || [];
        const today = dayKey(new Date());
        const studiesToday = items.filter(s => s.createdAt && dayKey(new Date(s.createdAt)) === today).length;
        const awaiting = items.filter(s => s.status === "PENDING_REPORT").length;
        const ready = items.filter(s => s.status === "REPORTED" || s.status === "DELIVERED").length;
        const emergency = items.filter(s => s.emergency === true).length;

        let revenue: number | undefined;
        let finData: FinancialSummary | undefined;
        try {
          finData = await fetchJson<FinancialSummary>(api("financial-summary"));
          revenue = finData?.totalCollected;
        } catch { }

        let todayAppointments = 0;
        try {
          const d = new Date();
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const ap = await fetchJson<{ items?: { status?: string }[]; total?: number }>(`${api("appointments")}&dateFrom=${key}&dateTo=${key}&limit=200`);
          const list = ap.items || [];
          todayAppointments = list.filter(a => a.status === "SCHEDULED" || a.status === "CHECKED_IN").length;
        } catch { }

        let orderBreakdown: Record<string, number> | null = null;
        try {
          const st = await fetchJson<{ orderStatusBreakdown?: Record<string, number> }>(api("statistics"));
          orderBreakdown = st?.orderStatusBreakdown || null;
        } catch { }

        setStats({ studiesToday, awaiting, ready, emergency, revenue });
        setFin(finData || null);
        setTodayAppointments(todayAppointments);
        setOrderBreakdown(orderBreakdown);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("radiology.dashboard.error"));
      }
    })();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;

  const cards = [
    { label: t("radiology.dashboard.todayAppointments"), value: todayAppointments ?? "ΓÇö", to: "/radiology/schedule" },
    { label: t("radiology.dashboard.studiesToday"), value: stats?.studiesToday ?? "ΓÇö" },
    { label: t("radiology.dashboard.awaitingReport"), value: stats?.awaiting ?? "ΓÇö" },
    { label: t("radiology.dashboard.reportsReady"), value: stats?.ready ?? "ΓÇö" },
    { label: t("radiology.dashboard.emergencyCases"), value: stats?.emergency ?? "ΓÇö" },
    { label: t("radiology.dashboard.totalCollected"), value: stats?.revenue != null ? `${Number(stats.revenue).toFixed(0)} ${t("radiology.currency")}` : "ΓÇö" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            {c.to ? (
              <a href={c.to} className="text-2xl font-bold mt-1 block text-blue-600 dark:text-blue-400 hover:underline">{c.value}</a>
            ) : (
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            )}
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-3">{t("radiology.dashboard.studyStatuses")}</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RadiologyStatusMap).map(([k, v]) => (
            <span key={k} className={`px-3 py-1 rounded-full text-xs ${v.color}`}>{t(v.label)}</span>
          ))}
        </div>
      </div>

      {orderBreakdown ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          <h3 className="font-semibold mb-3">{t("radiology.dashboard.orderStatusFunnel")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {ORDER_STATUS_KEYS.map(k => {
              const meta = RadiologyOrderStatusMap[k];
              const count = orderBreakdown[k] || 0;
              return (
                <div key={k} className={`rounded-lg p-3 border dark:border-gray-700 ${meta?.color || ""}`}>
                  <p className="text-xs opacity-80">{t(meta?.label || "")}</p>
                  <p className="text-xl font-bold mt-0.5">{count}</p>
                </div>
              );
            })}
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            {ORDER_STATUS_KEYS.map(k => {
              const total = ORDER_STATUS_KEYS.reduce((s, x) => s + (orderBreakdown[x] || 0), 0);
              const pct = total ? ((orderBreakdown[k] || 0) / total) * 100 : 0;
              if (pct <= 0) return null;
              return <div key={k} className="h-full" style={{ width: `${pct}%`, backgroundColor: STATUS_BAR_COLORS[k] || "#94a3b8" }} />;
            })}
          </div>
        </div>
      ) : null}

      {fin ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          <h3 className="font-semibold mb-3">{t("radiology.dashboard.financialSummary")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg p-4 border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.dashboard.collectedFromPatients")}</p>
              <p className="text-xl font-bold text-green-600">{Number(fin.patient.collected).toFixed(0)} {t("radiology.currency")}</p>
            </div>
            <div className="rounded-lg p-4 border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.dashboard.outstandingFromPatients")}</p>
              <p className="text-xl font-bold text-red-600">{Number(fin.patient.outstanding).toFixed(0)} {t("radiology.currency")}</p>
            </div>
            <div className="rounded-lg p-4 border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.dashboard.collectedFromInsurance")}</p>
              <p className="text-xl font-bold text-green-600">{Number(fin.insurance.collected).toFixed(0)} {t("radiology.currency")}</p>
            </div>
            <div className="rounded-lg p-4 border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("radiology.dashboard.outstandingFromInsurance")}</p>
              <p className="text-xl font-bold text-red-600">{Number(fin.insurance.outstanding).toFixed(0)} {t("radiology.currency")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t("radiology.dashboard.totalCollectedLabel")} <b className="text-green-600">{Number(fin.totalCollected).toFixed(0)} {t("radiology.currency")}</b></span>
            <span className="text-gray-500 dark:text-gray-400">{t("radiology.dashboard.totalOutstandingLabel")} <b className="text-red-600">{Number(fin.totalOutstanding).toFixed(0)} {t("radiology.currency")}</b></span>
          </div>
          {fin.byEntity && fin.byEntity.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {fin.byEntity.map(e => (
                <div key={e.insuranceCompanyId} className="flex justify-between text-sm border-b dark:border-gray-700/50 pb-1.5">
                  <span>{e.name}</span>
                  <span><b className="text-green-600">{Number(e.paid).toFixed(0)}</b> / <b className="text-red-600">{Number(e.remaining).toFixed(0)}</b> {t("radiology.currency")}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.dashboard.title")}</p>
    </div>
  );
}
