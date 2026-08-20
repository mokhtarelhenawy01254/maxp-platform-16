import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { bookingApi, fetchJson } from "./shared";

interface RadiologyInvoice {
  id: string; invoiceNumber: string; total: number; discount: number;
  additionAmount?: number; amountPaid: number; status: string; createdAt: string;
  patient?: { firstName: string; lastName?: string; phone?: string };
}

const STATUS: Record<string, { label: string; color: string }> = {
  UNPAID: { label: "radiology.invoices.unpaid", color: "bg-red-100 text-red-700" },
  PARTIAL: { label: "radiology.invoices.partial", color: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "radiology.invoices.paidLabel", color: "bg-green-100 text-green-700" },
  REFUNDED: { label: "radiology.invoices.refunded", color: "bg-gray-100 text-gray-700" },
};

const fmtMoney = (n?: number, currency = "") => (n != null ? `${Number(n).toFixed(2)} ${currency}` : `0.00 ${currency}`);

export default function RadiologyInvoicesTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<RadiologyInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchJson<RadiologyInvoice[]>(`${bookingApi("invoices")}?limit=200`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.invoices.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const net = (i: RadiologyInvoice) => Math.max(0, i.total - i.discount + (i.additionAmount || 0));
  const remaining = (i: RadiologyInvoice) => Math.max(0, net(i) - i.amountPaid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("radiology.invoices.title")}</h2>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm">
          <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
        </button>
      </div>
      {loading ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-center py-10 text-gray-400">{t("radiology.invoices.noInvoices")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.invoiceNumber")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.patient")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.total")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.paid")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.remaining")}</th>
                <th className="py-3 px-4 text-right font-medium">{t("radiology.invoices.status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const st = STATUS[i.status] ?? STATUS["UNPAID"];
                return (
                  <tr key={i.id} className="border-b dark:border-gray-700/50 last:border-0">
                    <td className="py-3 px-4" dir="ltr">{i.invoiceNumber}</td>
                    <td className="py-3 px-4 font-medium">{i.patient ? `${i.patient.firstName} ${i.patient.lastName || ""}` : "—"}</td>
                    <td className="py-3 px-4">{fmtMoney(net(i), t("radiology.currency"))}</td>
                    <td className="py-3 px-4">{fmtMoney(i.amountPaid, t("radiology.currency"))}</td>
                    <td className="py-3 px-4">{fmtMoney(remaining(i), t("radiology.currency"))}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${st?.color}`}>{t(st?.label ?? "")}</span></td>
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
