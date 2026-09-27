import { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";

interface DashboardStats {
  totalCustomers: number;
  activePriceLists: number;
  totalOutstanding: number;
  overdueAmount: number;
  monthlySales: number;
  monthlyOrderCount: number;
}

export default function WholesaleDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/dashboard");
        setStats(res?.data?.data || null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل لوحة الجملة");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
        {error}
      </div>
    );
  }

  const cards = [
    { label: "عملاء الجملة", value: stats?.totalCustomers ?? 0, color: "bg-blue-500" },
    { label: "قوائم الأسعار", value: stats?.activePriceLists ?? 0, color: "bg-green-500" },
    { label: "إجمالي المديونية", value: `${(stats?.totalOutstanding ?? 0).toFixed(2)} EGP`, color: "bg-orange-500" },
    { label: "متأخرات", value: `${(stats?.overdueAmount ?? 0).toFixed(2)} EGP`, color: "bg-red-500" },
    { label: "مبيعات الشهر", value: `${(stats?.monthlySales ?? 0).toFixed(2)} EGP`, color: "bg-purple-500" },
    { label: "طلبات الشهر", value: stats?.monthlyOrderCount ?? 0, color: "bg-indigo-500" },
  ];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة البيع بالجملة</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className={`mb-3 h-2 w-12 rounded ${card.color}`} />
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
