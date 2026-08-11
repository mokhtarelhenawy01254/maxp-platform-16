import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Loader2, Plus, X as XMarkIcon, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { api, bookingApi, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface InsuranceCompany { id: string; name: string; isActive?: boolean; }

interface LedgerEntry {
  id: string;
  insuranceCompanyId: string;
  insuranceCompanyName?: string;
  type: string;
  amount: number;
  note?: string;
  createdAt: string;
}

interface SummaryRow { insuranceCompanyId: string; name?: string; total: number; paid: number; remaining: number; }

const ENTRY_TYPE: Record<string, { label: string; color: string }> = {
  PAYMENT: { label: "دفعة", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  ADJUSTMENT: { label: "تسوية", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
};

const fmtMoney = (n?: number) => `${Number(n ?? 0).toFixed(2)} ج`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString("ar-EG") : "—");

export default function InsuranceLedgerTab() {
  const [entities, setEntities] = useState<InsuranceCompany[]>([]);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("");
  const [modal, setModal] = useState<{ type: string; insuranceCompanyId: string; amount: string; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("insurance-ledger"));
      if (entityFilter) url.searchParams.set("insuranceCompanyId", entityFilter);
      url.searchParams.set("limit", "200");
      const data = await fetchJson<{ items?: LedgerEntry[]; total?: number }>(url.toString());
      setEntries(data.items || []);
      const s = await fetchJson<SummaryRow[]>(api("insurance-summary"));
      setSummary(s || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الدفتر");
    }
  }, [entityFilter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const comps = await fetchJson<InsuranceCompany[]>(bookingApi("insurance-companies"));
        setEntities(comps || []);
      } catch { setEntities([]); }
      await refresh().finally(() => setLoading(false));
    })();
  }, [refresh]);

  const save = async () => {
    if (!modal || saving) return;
    const amount = Number(modal.amount);
    if (!modal.insuranceCompanyId) { toast.error("اختر الجهة"); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("المبلغ غير صحيح"); return; }
    setSaving(true);
    try {
      await fetchJson(api("insurance-ledger"), {
        method: "POST",
        body: JSON.stringify({
          insuranceCompanyId: modal.insuranceCompanyId,
          type: modal.type,
          amount,
          note: modal.note.trim() || undefined,
        }),
      });
      toast.success(modal.type === "PAYMENT" ? "تم تسجيل الدفعة" : "تم تسجيل التسوية");
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">دفتر التأمين</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">المدفوعات والتسويات المستلمة من الجهات</p>
        </div>
        <div className="flex items-center gap-2">
          <select className={MODAL_INPUT_CLS} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">كل الجهات</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
          <button onClick={() => setModal({ type: "PAYMENT", insuranceCompanyId: "", amount: "", note: "" })} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Plus className="w-4 h-4" />دفعة / تسوية
          </button>
        </div>
      </div>

      {summary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.map(s => (
            <div key={s.insuranceCompanyId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-sm font-semibold mb-2">{s.name || s.insuranceCompanyId}</p>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>مستحق: <b className="text-gray-800 dark:text-gray-100">{fmtMoney(s.total)}</b></span>
                <span>محصّل: <b className="text-green-600">{fmtMoney(s.paid)}</b></span>
                <span>متبقي: <b className="text-red-600">{fmtMoney(s.remaining)}</b></span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {loading && !entries.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : entries.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">لا توجد مدفوعات بعد</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {["الجهة", "النوع", "المبلغ", "ملاحظات", "التاريخ"].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const meta = ENTRY_TYPE[e.type] || ENTRY_TYPE.PAYMENT;
                  return (
                    <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      <td className="py-3 px-4 font-medium">{e.insuranceCompanyName || "—"}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${meta.color}`}>{meta.label}</span></td>
                      <td className="py-3 px-4 font-bold">{e.type === "PAYMENT" ? "+" : "±"} {fmtMoney(e.amount)}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{e.note || "—"}</td>
                      <td className="py-3 px-4 text-gray-400 dark:text-gray-500 whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">تسجيل دفعة / تسوية</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الجهة *</label>
                <select className={MODAL_INPUT_CLS} value={modal.insuranceCompanyId} onChange={e => setModal({ ...modal, insuranceCompanyId: e.target.value })}>
                  <option value="">اختر الجهة...</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">النوع</label>
                <div className="flex gap-3">
                  <button onClick={() => setModal({ ...modal, type: "PAYMENT" })} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${modal.type === "PAYMENT" ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30" : "border-gray-300 dark:border-gray-600"}`}>
                    <ArrowDownToLine className="w-4 h-4" />دفعة
                  </button>
                  <button onClick={() => setModal({ ...modal, type: "ADJUSTMENT" })} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${modal.type === "ADJUSTMENT" ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30" : "border-gray-300 dark:border-gray-600"}`}>
                    <ArrowUpFromLine className="w-4 h-4" />تسوية
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">المبلغ *</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.amount} onChange={e => setModal({ ...modal, amount: e.target.value })} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ملاحظات</label>
                <input className={MODAL_INPUT_CLS} value={modal.note} onChange={e => setModal({ ...modal, note: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
