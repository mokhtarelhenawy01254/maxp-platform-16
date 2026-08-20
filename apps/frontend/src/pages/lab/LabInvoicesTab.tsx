import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { bookingApi, fetchJson } from "./shared";

interface LabInvoice {
  id: string; invoiceNumber: string; total: number; discount: number;
  additionAmount?: number; amountPaid: number; status: string; createdAt: string;
  patient?: { firstName: string; lastName?: string; phone?: string };
}

const STATUS: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "غير مسددة", color: "bg-red-100 text-red-700" },
  PARTIAL: { label: "مسدد جزئياً", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "مسددة", color: "bg-green-100 text-green-700" },
  REFUNDED: { label: "ملغاة", color: "bg-gray-100 text-gray-700" },
};

const fmtMoney = (n?: number) => (n != null ? `${Number(n).toFixed(2)} ج` : "0.00 ج");

export default function LabInvoicesTab() {
  const [items, setItems] = useState<LabInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<LabInvoice[]>(`${bookingApi("invoices")}?limit=200`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تحميل الفواتير");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const net = (i: LabInvoice) => Math.max(0, i.total - i.discount + (i.additionAmount || 0));
  const remaining = (i: LabInvoice) => Math.max(0, net(i) - i.amountPaid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">المدفوعات</h2>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" />تحديث
        </button>
      </div>
      {loading ? (
        <p className="text-center py-10 text-gray-400">جاري التحميل...</p>
      ) : items.length === 0 ? (
        <p className="text-center py-10 text-gray-400">لا توجد فواتير</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">رقم الفاتورة</th>
                <th className="py-3 px-4 text-right font-medium">المريض</th>
                <th className="py-3 px-4 text-right font-medium">الإجمالي</th>
                <th className="py-3 px-4 text-right font-medium">المدفوع</th>
                <th className="py-3 px-4 text-right font-medium">المتبقي</th>
                <th className="py-3 px-4 text-right font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const st = STATUS[i.status] ?? { label: "غير مسددة", color: "bg-red-100 text-red-700" };
                return (
                  <tr key={i.id} className="border-b dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4" dir="ltr">{i.invoiceNumber}</td>
                    <td className="py-3 px-4 font-medium">{i.patient ? `${i.patient.firstName} ${i.patient.lastName || ""}` : "—"}</td>
                    <td className="py-3 px-4">{fmtMoney(net(i))}</td>
                    <td className="py-3 px-4">{fmtMoney(i.amountPaid)}</td>
                    <td className="py-3 px-4">{fmtMoney(remaining(i))}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
