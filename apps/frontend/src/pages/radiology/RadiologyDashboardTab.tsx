import { useEffect, useState } from "react";
import { api, bookingApi, fetchJson, RadiologyStatusMap } from "./shared";

interface StudyItem { status?: string; reportStatus?: string; emergency?: boolean; createdAt?: string; }

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function RadiologyDashboardTab() {
  const [stats, setStats] = useState<{
    studiesToday?: number; awaiting?: number; ready?: number; emergency?: number; revenue?: number;
  } | null>(null);
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
        try {
          const rep = await fetchJson<{ totals?: { collected?: number; billed?: number } }>(bookingApi("reports/revenue"));
          revenue = rep.totals?.billed;
        } catch { }

        setStats({ studiesToday, awaiting, ready, emergency, revenue });
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ");
      }
    })();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;

  const cards = [
    { label: "دراسات اليوم", value: stats?.studiesToday ?? "—" },
    { label: "بانتظار التقرير", value: stats?.awaiting ?? "—" },
    { label: "تقارير جاهزة", value: stats?.ready ?? "—" },
    { label: "حالات طارئة", value: stats?.emergency ?? "—" },
    { label: "إيرادات اليوم", value: stats?.revenue != null ? `${Number(stats.revenue).toFixed(0)} ج` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-3">حالات الدراسات</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(RadiologyStatusMap).map(([k, v]) => (
            <span key={k} className={`px-3 py-1 rounded-full text-xs ${v.color}`}>{v.label}</span>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">لوحة الأشعة — بيانات الدراسات والفواتير.</p>
    </div>
  );
}
