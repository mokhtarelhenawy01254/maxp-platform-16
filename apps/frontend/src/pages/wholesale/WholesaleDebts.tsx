import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

interface DebtCustomer {
  id: string;
  customerName: string;
  customerPhone?: string;
  currentBalance: number;
  creditLimit: number;
  daysOverdue: number;
  lastPaymentDate?: string;
}

interface DebtReport {
  totalOutstanding: number;
  totalOverdue: number;
  agingBuckets: AgingBucket[];
  customers: DebtCustomer[];
}

export default function WholesaleDebts() {
  const [report, setReport] = useState<DebtReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/debts/aging");

        setReport(res?.data?.data || null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل تقرير المديونية");
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المديونية</h1>

      {report && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي المديونية</p>
              <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                {report.totalOutstanding.toFixed(2)} EGP
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">المتأخر</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {report.totalOverdue.toFixed(2)} EGP
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">العملاء المدينة</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {report.customers.length}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">توزيع التقادم</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {report.agingBuckets.map((bucket) => (
                <div key={bucket.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{bucket.label}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{bucket.amount.toFixed(2)} EGP</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{bucket.count} عميل</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-medium">العميل</th>
                  <th className="px-4 py-3 font-medium">الهاتف</th>
                  <th className="px-4 py-3 font-medium">الحد الائتماني</th>
                  <th className="px-4 py-3 font-medium">الرصيد المستحق</th>
                  <th className="px-4 py-3 font-medium">أيام التأخير</th>
                  <th className="px-4 py-3 font-medium">آخر دفعة</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-900 dark:divide-gray-800 dark:text-gray-100">
                {report.customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.customerName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.customerPhone || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{Number(c.creditLimit).toFixed(2)} EGP</td>
                    <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">
                      {Number(c.currentBalance).toFixed(2)} EGP
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.daysOverdue > 30 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : c.daysOverdue > 7 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                        {c.daysOverdue} يوم
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {c.lastPaymentDate ? new Date(c.lastPaymentDate).toLocaleDateString("ar-EG") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/wholesale/customers/${c.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
