import { useEffect, useState } from "react";
import { api, fetchJson } from "./shared";

export default function LabDashboardTab() {
  const [stats, setStats] = useState<{ ordersToday?: number; pending?: number; signed?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(api("orders"));
        url.searchParams.set("limit", "200");
        const orders = await fetchJson<{ total?: number; items?: Array<{ status?: string }> }>(url.toString());
        const items = orders.items || [];
        setStats({
          ordersToday: orders.total ?? items.length,
          pending: items.filter(o => o.status === "PENDING" || o.status === "COLLECTED" || o.status === "IN_PROGRESS").length,
          signed: items.filter(o => o.status === "SIGNED" || o.status === "DELIVERED").length,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "خطأ");
      }
    })();
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;

  const cards = [
    { label: "طلبات اليوم", value: stats?.ordersToday ?? "—" },
    { label: "قيد التحليل", value: stats?.pending ?? "—" },
    { label: "تم التوقيع/التسليم", value: stats?.signed ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">لوحة المعمل — سيتم تعميق الإحصائيات في المرحلة القادمة.</p>
    </div>
  );
}
