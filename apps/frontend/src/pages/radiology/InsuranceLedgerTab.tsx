import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  PAYMENT: { label: "radiology.insuranceLedger.payment", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  ADJUSTMENT: { label: "radiology.insuranceLedger.adjustment", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
};

const fmtMoney = (n?: number, currency = "") => `${Number(n ?? 0).toFixed(2)} ${currency}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleString("ar-EG") : "ΓÇö");

export default function InsuranceLedgerTab() {
  const { t } = useTranslation();
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
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.insuranceLedger.loadFailed"));
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
    if (!modal.insuranceCompanyId) { toast.error(t("radiology.insuranceLedger.selectEntityError")); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error(t("radiology.amountInvalid")); return; }
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
      toast.success(modal.type === "PAYMENT" ? t("radiology.insuranceLedger.paymentRecorded") : t("radiology.insuranceLedger.adjustmentRecorded"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.insuranceLedger.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.insuranceLedger.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.insuranceLedger.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className={MODAL_INPUT_CLS} value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            <option value="">{t("radiology.insuranceLedger.allEntities")}</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={() => setModal({ type: "PAYMENT", insuranceCompanyId: "", amount: "", note: "" })} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.insuranceLedger.newEntry")}
          </button>
        </div>
      </div>

      {summary.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.map(s => (
            <div key={s.insuranceCompanyId} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
              <p className="text-sm font-semibold mb-2">{s.name || s.insuranceCompanyId}</p>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{t("radiology.insuranceLedger.due")} <b className="text-gray-800 dark:text-gray-100">{fmtMoney(s.total, t("radiology.currency"))}</b></span>
                <span>{t("radiology.insuranceLedger.collected")} <b className="text-green-600">{fmtMoney(s.paid, t("radiology.currency"))}</b></span>
                <span>{t("radiology.insuranceLedger.remaining")} <b className="text-red-600">{fmtMoney(s.remaining, t("radiology.currency"))}</b></span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {loading && !entries.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : entries.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.insuranceLedger.noPayments")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.insuranceLedger.entity"), t("radiology.insuranceLedger.type"), t("radiology.insuranceLedger.amount"), t("radiology.insuranceLedger.notes"), t("radiology.insuranceLedger.date")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const meta = ENTRY_TYPE[e.type] || ENTRY_TYPE["PAYMENT"];
                  return (
                    <tr key={e.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                      <td className="py-3 px-4 font-medium">{e.insuranceCompanyName || "ΓÇö"}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${meta?.color}`}>{t(meta?.label ?? "")}</span></td>
                      <td className="py-3 px-4 font-bold">{e.type === "PAYMENT" ? "+" : "┬▒"} {fmtMoney(e.amount, t("radiology.currency"))}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{e.note || "ΓÇö"}</td>
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
              <h3 className="text-lg font-bold">{t("radiology.insuranceLedger.recordEntryTitle")}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceLedger.entityRequired")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.insuranceCompanyId} onChange={e => setModal({ ...modal, insuranceCompanyId: e.target.value })}>
                  <option value="">{t("radiology.insuranceLedger.selectEntity")}</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceLedger.typeLabel")}</label>
                <div className="flex gap-3">
                  <button onClick={() => setModal({ ...modal, type: "PAYMENT" })} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${modal.type === "PAYMENT" ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30" : "border-gray-300 dark:border-gray-600"}`}>
                    <ArrowDownToLine className="w-4 h-4" />{t("radiology.insuranceLedger.payment")}
                  </button>
                  <button onClick={() => setModal({ ...modal, type: "ADJUSTMENT" })} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${modal.type === "ADJUSTMENT" ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30" : "border-gray-300 dark:border-gray-600"}`}>
                    <ArrowUpFromLine className="w-4 h-4" />{t("radiology.insuranceLedger.adjustment")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceLedger.amountRequired")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.amount} onChange={e => setModal({ ...modal, amount: e.target.value })} dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.insuranceLedger.notes")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.note} onChange={e => setModal({ ...modal, note: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.cancel")}</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
