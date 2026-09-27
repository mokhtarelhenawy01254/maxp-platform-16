import { useState } from "react";
import { apiClient } from "../../services/apiClient";

interface StatementLine {
  date: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE";
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface StatementData {
  customerName: string;
  customerPhone?: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  lines: StatementLine[];
}

export default function WholesaleStatements() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    try {
      const res = await apiClient.get(`/wholesale/customers?search=${encodeURIComponent(q)}&limit=10`);
      setCustomers((res?.data?.data || []).map((c: any) => ({ id: c.id, name: c.customerName })));
    } catch { /* ignore */ }
  };

  const loadStatement = async () => {
    if (!selectedCustomerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/wholesale/customers/${selectedCustomerId}/statement`, {
        params: { fromDate, toDate },
      });
      setStatement(res?.data?.data || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تحميل كشف الحساب");
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, string> = {
    INVOICE: "فاتورة",
    PAYMENT: "دفعة",
    CREDIT_NOTE: "اشعار دائن",
    DEBIT_NOTE: "اشعار مدين",
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">كشوف الحساب</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">بحث عن عميل</label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                placeholder="اسم العميل..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
              {customers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(c.name);
                        setCustomers([]);
                      }}
                      className="block w-full px-3 py-2 text-right text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadStatement}
              disabled={loading || !selectedCustomerId}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {loading ? "...جاري" : "عرض كشف الحساب"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      {statement && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{statement.customerName}</h2>
            {statement.customerPhone && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{statement.customerPhone}</p>
            )}
            <div className="mt-2 flex gap-6 text-sm text-gray-700 dark:text-gray-300">
              <span>الرصيد الافتتاحي: <strong className="text-gray-900 dark:text-white">{Number(statement.openingBalance).toFixed(2)} EGP</strong></span>
              <span>الرصيد الختامي: <strong className="text-gray-900 dark:text-white">{Number(statement.closingBalance).toFixed(2)} EGP</strong></span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">المرجع</th>
                  <th className="px-4 py-3 font-medium">البيان</th>
                  <th className="px-4 py-3 font-medium">مدين</th>
                  <th className="px-4 py-3 font-medium">دائن</th>
                  <th className="px-4 py-3 font-medium">الرصيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-900 dark:divide-gray-800 dark:text-gray-100">
                {statement.lines.map((line, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {new Date(line.date).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {typeLabels[line.type] || line.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{line.reference}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{line.description}</td>
                    <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">
                      {Number(line.debit) > 0 ? `${Number(line.debit).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                      {Number(line.credit) > 0 ? `${Number(line.credit).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{Number(line.balance).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
