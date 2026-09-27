import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface WholesaleCustomer {
  id: string;
  customerId: string;
  customer: { firstName: string; lastName: string; phone?: string };
  creditLimit: number;
  currentBalance: number;
  paymentTermsDays: number;
  priceListId?: string;
  priceListName?: string;
  isActive: boolean;
}

export default function WholesaleCustomers() {
  const [customers, setCustomers] = useState<WholesaleCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get("/wholesale/customers");
        setCustomers(res?.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "تعذر تحميل العملاء");
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">عملاء الجملة</h1>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          لا يوجد عملاء جملة بعد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">الهاتف</th>
                <th className="px-4 py-3 font-medium">الحد الائتماني</th>
                <th className="px-4 py-3 font-medium">الرصيد المستحق</th>
                <th className="px-4 py-3 font-medium">أيام السداد</th>
                <th className="px-4 py-3 font-medium">قائمة الأسعار</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-900 dark:divide-gray-800 dark:text-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/wholesale/customers/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.customer ? `${c.customer.firstName} ${c.customer.lastName}` : '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.customer?.phone || "—"}</td>
                  <td className="px-4 py-3 font-medium">{Number(c.creditLimit).toFixed(2)} EGP</td>
                  <td className="px-4 py-3 font-medium">{Number(c.currentBalance).toFixed(2)} EGP</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.paymentTermsDays} يوم</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.priceListName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {c.isActive ? "نشط" : "موقوف"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
