import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2, Play, StopCircle, Banknote } from "lucide-react";
import { api, fetchJson, MODAL_INPUT_CLS } from "./shared";

interface ShiftSummary { collected: number; refunded: number; net: number; byMethod: Record<string, number>; count: number; }

interface Shift { id: string; cashierName: string; status: string; openedAt: string; closedAt?: string; summary?: ShiftSummary; }

const fmtMoney = (n?: number) => `${Number(n ?? 0).toFixed(0)} ج`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString("ar-EG") : "—");

export default function CashierShiftsTab() {
  const [active, setActive] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [cashierName, setCashierName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const [act, hist] = await Promise.all([
        fetchJson<Shift | null>(api("shifts/active")),
        fetchJson<{ items?: Shift[] }>(api("shifts?limit=50")),
      ]);
      setActive(act);
      setHistory(hist.items || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الورديات");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetchJson(api("shifts"), { method: "POST", body: JSON.stringify({ cashierName: cashierName.trim() || undefined }) });
      toast.success("تم فتح الوردية");
      setCashierName("");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل فتح الوردية");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!active || busy) return;
    if (!window.confirm("إغلاق الوردية الحالية وتسويتها؟")) return;
    setBusy(true);
    try {
      const data = await fetchJson<Shift>(api(`shifts/${active.id}/close`), { method: "POST" });
      toast.success("تم إغلاق الوردية");
      await refresh({ silent: true });
      if (data?.summary) {
        toast.info(`المحصّل: ${fmtMoney(data.summary.collected)} — الاسترجاع: ${fmtMoney(data.summary.refunded)} — الصافي: ${fmtMoney(data.summary.net)}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إغلاق الوردية");
    } finally {
      setBusy(false);
    }
  };

  const summaryRow = (s: ShiftSummary) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-sm">
      <div className="rounded-lg border dark:border-gray-700 px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">محصّل</p>
        <b className="text-green-600">{fmtMoney(s.collected)}</b>
      </div>
      <div className="rounded-lg border dark:border-gray-700 px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">استرجاع</p>
        <b className="text-red-600">{fmtMoney(s.refunded)}</b>
      </div>
      <div className="rounded-lg border dark:border-gray-700 px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">صافي</p>
        <b className="text-blue-600">{fmtMoney(s.net)}</b>
      </div>
      <div className="rounded-lg border dark:border-gray-700 px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">كاش</p>
        <b>{fmtMoney(s.byMethod?.["CASH"])}</b>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الورديات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">فتح وإغلاق ورديات الصرافة وتسوية اليومية</p>
        </div>
        <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <RefreshCw className="w-4 h-4" />تحديث
        </button>
      </div>

      {loading && !active ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : active ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold flex items-center gap-2"><Banknote className="w-5 h-5 text-green-600" />وردية مفتوحة</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">الصراف: <b>{active.cashierName}</b> — فُتحت: {fmtDate(active.openedAt)}</p>
            </div>
            <button onClick={close} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}إغلاق الوردية
            </button>
          </div>
          {active.summary ? summaryRow(active.summary) : null}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
          <h3 className="font-bold mb-3">لا توجد وردية مفتوحة</h3>
          <div className="flex gap-3">
            <input className={MODAL_INPUT_CLS} placeholder="اسم الصراف" value={cashierName} onChange={e => setCashierName(e.target.value)} />
            <button onClick={open} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}فتح وردية
            </button>
          </div>
        </div>
      )}

      {history.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <h3 className="font-semibold px-5 pt-4">سجل الورديات</h3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  {["الصراف", "الحالة", "الفتح", "الإغلاق", "المحصّل", "الاسترجاع", "الصافي"].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(s => (
                  <tr key={s.id} className="border-b dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{s.cashierName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "OPEN" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                        {s.status === "OPEN" ? "مفتوحة" : "مغلقة"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{fmtDate(s.openedAt)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{s.closedAt ? fmtDate(s.closedAt) : "—"}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{fmtMoney(s.summary?.collected)}</td>
                    <td className="py-3 px-4 text-red-600">{fmtMoney(s.summary?.refunded)}</td>
                    <td className="py-3 px-4 font-bold">{fmtMoney(s.summary?.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
