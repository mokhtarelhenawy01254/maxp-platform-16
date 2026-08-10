import { useEffect, useState } from "react";
import { api, bookingApi, fetchJson, LAB_STATUS_MAP } from "./shared";

interface OrderItem { status?: string; reportStatus?: string; total?: number; paid?: number; remaining?: number; }

export default function LabDashboardTab() {
  const [stats, setStats] = useState<{
    ordersToday?: number; pending?: number; resultsPending?: number; signed?: number; revenue?: number; collected?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const ordersUrl = new URL(api("orders"));
        ordersUrl.searchParams.set("limit", "200");
        const orders = await fetchJson<{ items?: OrderItem[]; total?: number }>(ordersUrl.toString());
        const items = orders.items || [];
        const inProgress = items.filter(o => o.status === "PENDING" || o.status === "COLLECTED" || o.status === "IN_PROGRESS").length;
        const resultsPending = items.filter(o => o.reportStatus === "PENDING" || o.reportStatus === "RESULTS_ENTERED").length;
        const signed = items.filter(o => o.status === "SIGNED" || o.status === "DELIVERED").length;
        const collected = items.reduce((s, o) => s + (o.paid || 0), 0);

        let revenue: number | undefined;
        try {
          const rep = await fetchJson<{ totals?: { collected?: number; billed?: number } }>(bookingApi("reports/revenue"));
          revenue = rep.totals?.billed;
        } catch { /* reports may be empty — leave undefined */ }

        setStats({ ordersToday: orders.total ?? items.length, pending: inProgress, resultsPending, signed, revenue, collected });
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطأ");
      }
    })();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;

  const cards = [
    { label: "طلبات اليوم", value: stats?.ordersToday ?? "—" },
    { label: "قيد التحليل", value: stats?.pending ?? "—" },
    { label: "بانتظار النتائج", value: stats?.resultsPending ?? "—" },
    { label: "موقعة / مسلمة", value: stats?.signed ?? "—" },
    { label: "إجمالي الفواتير", value: stats?.revenue != null ? `${Number(stats.revenue).toFixed(0)} ج` : "—" },
    { label: "المحصل", value: stats?.collected != null ? `${Number(stats.collected).toFixed(0)} ج` : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
        <h3 className="font-semibold mb-3">حالات الطلبات</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LAB_STATUS_MAP).map(([k, v]) => (
            <span key={k} className={`px-3 py-1 rounded-full text-xs ${v.color}`}>{v.label}</span>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">لوحة المعمل — بيانات الطلبات والفواتير.</p>
    </div>
  );
}
