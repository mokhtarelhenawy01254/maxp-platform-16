import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search, BadgePercent, FileText, CheckCircle2, Circle } from "lucide-react";
import { api, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, RadiologyStatusMap, getCompanyId } from "./shared";

interface Physician {
  id: string; name: string; phone?: string; specialty?: string;
  commissionType: string; commissionValue: number; isActive: boolean;
  marketingRepId?: string | null; marketingRepName?: string | null;
}

interface MarketingRep { id: string; name: string; }

interface CommissionRow { physicianId: string; name?: string; count: number; amount: number; commission: number; commissionType?: string; commissionValue?: number; }

interface ResultItem {
  id: string; studyNumber?: string; patientName: string; examTypeName?: string;
  modality?: string; status: string; reportStatus?: string | null;
  createdAt: string; deliveredAt?: string | null;
}

const COMMISSION_LABEL: Record<string, string> = { NONE: "radiology.referringPhysicians.none", PERCENTAGE: "radiology.referringPhysicians.percentage", FIXED: "radiology.referringPhysicians.fixed" };

export default function ReferringPhysiciansTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Physician[]>([]);
  const [reps, setReps] = useState<MarketingRep[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ id?: string; name: string; phone: string; specialty: string; commissionType: string; commissionValue: string; marketingRepId: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const READ_KEY = () => `radiology.physicianResults.read.${getCompanyId() || "default"}`;
  const [results, setResults] = useState<{ physician: Physician; items: ResultItem[] } | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem(READ_KEY()) || "[]")); } catch { return new Set<string>(); }
  });

  const openResults = async (p: Physician) => {
    setResults({ physician: p, items: [] });
    setResultsLoading(true);
    try {
      const data = await fetchJson<{ items: ResultItem[] }>(api(`intelligence/referring-physicians/${p.id}/results`));
      const items = data.items || [];
      setResults({ physician: p, items });
      const updated = new Set(readIds);
      items.forEach(i => updated.add(i.id));
      setReadIds(updated);
      try { localStorage.setItem(READ_KEY(), JSON.stringify([...updated])); } catch { /* ignore */ }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.physicianResults.loadFailed"));
    } finally {
      setResultsLoading(false);
    }
  };

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("referring-physicians"));
      if (search.trim()) url.searchParams.set("search", search.trim());
      const data = await fetchJson<Physician[]>(url.toString());
      setItems(data || []);
      const repList = await fetchJson<MarketingRep[]>(api("marketing-reps")).catch(() => []);
      setReps(repList || []);
      const c = await fetchJson<{ rows?: CommissionRow[]; totalCommission?: number }>(api("referring-physicians/commissions"));
      setCommissions(c.rows || []);
      setTotalCommission(c.totalCommission || 0);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.referringPhysicians.loadFailed"));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setLoading(true); refresh().finally(() => setLoading(false)); }, 350);
    return () => clearTimeout(t);
  }, [refresh]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error(t("radiology.referringPhysicians.nameRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        phone: modal.phone.trim() || undefined,
        specialty: modal.specialty.trim() || undefined,
        commissionType: modal.commissionType,
        commissionValue: Number(modal.commissionValue) || 0,
        marketingRepId: modal.marketingRepId || undefined,
      };
      if (modal.id) await fetchJson(api(`referring-physicians/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      else await fetchJson(api("referring-physicians"), { method: "POST", body: JSON.stringify(payload) });
      toast.success(modal.id ? t("radiology.referringPhysicians.updated") : t("radiology.referringPhysicians.added"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.referringPhysicians.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Physician) => {
    if (!window.confirm(t("radiology.referringPhysicians.deleteConfirm", { name: p.name }))) return;
    try {
      await fetchJson(api(`referring-physicians/${p.id}`), { method: "DELETE" });
      toast.success(t("radiology.referringPhysicians.deleted"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.referringPhysicians.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.referringPhysicians.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.referringPhysicians.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className={`${MODAL_INPUT_CLS} pr-9 w-44`} placeholder={t("radiology.referringPhysicians.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={() => setModal({ name: "", phone: "", specialty: "", commissionType: "NONE", commissionValue: "0", marketingRepId: "" })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.referringPhysicians.newPhysician")}
          </button>
        </div>
      </div>

      {commissions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><BadgePercent className="w-4 h-4" />{t("radiology.referringPhysicians.dueCommissions")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commissions.map(c => (
              <div key={c.physicianId} className="flex justify-between items-center border dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{c.name || "ΓÇö"}</span>
                <span className="text-green-600 font-bold">{Number(c.commission).toFixed(0)} {t("radiology.currency")}</span>
              </div>
            ))}
          </div>
          <p className="text-sm mt-3 text-gray-500 dark:text-gray-400">{t("radiology.referringPhysicians.totalDueCommissions")} <b className="text-green-600">{Number(totalCommission).toFixed(0)} {t("radiology.currency")}</b></p>
        </div>
      ) : null}

      {loading && !items.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.referringPhysicians.noPhysicians")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.referringPhysicians.name"), t("radiology.referringPhysicians.specialty"), t("radiology.referringPhysicians.phone"), t("radiology.referringPhysicians.rep"), t("radiology.referringPhysicians.commission"), t("radiology.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{p.specialty || "ΓÇö"}</td>
                    <td className="py-3 px-4" dir="ltr">{p.phone || "ΓÇö"}</td>
                    <td className="py-3 px-4">{p.marketingRepName || "ΓÇö"}</td>
                    <td className="py-3 px-4">{t(COMMISSION_LABEL[p.commissionType] || p.commissionType)}{p.commissionType === "PERCENTAGE" ? ` ${p.commissionValue}%` : p.commissionType === "FIXED" ? ` ${p.commissionValue} ${t("radiology.currency")}` : ""}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openResults(p)} className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title={t("radiology.physicianResults.button")}><FileText className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ id: p.id, name: p.name, phone: p.phone || "", specialty: p.specialty || "", commissionType: p.commissionType, commissionValue: String(p.commissionValue), marketingRepId: p.marketingRepId || "" })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(p)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.referringPhysicians.editPhysician") : t("radiology.referringPhysicians.newPhysicianModal")}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.physicianName")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.specialty")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.specialty} onChange={e => setModal({ ...modal, specialty: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.phone")}</label>
                <input className={MODAL_INPUT_CLS} dir="ltr" value={modal.phone} onChange={e => setModal({ ...modal, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.rep")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.marketingRepId} onChange={e => setModal({ ...modal, marketingRepId: e.target.value })}>
                  <option value="">{t("radiology.referringPhysicians.noRep")}</option>
                  {reps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.commissionType")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.commissionType} onChange={e => setModal({ ...modal, commissionType: e.target.value })}>
                  <option value="NONE">{t("radiology.referringPhysicians.none")}</option>
                  <option value="PERCENTAGE">{t("radiology.referringPhysicians.percentageLabel")}</option>
                  <option value="FIXED">{t("radiology.referringPhysicians.fixed")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.referringPhysicians.commissionValue")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} dir="ltr" value={modal.commissionValue} onChange={e => setModal({ ...modal, commissionValue: e.target.value })} disabled={modal.commissionType === "NONE"} />
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

      {results && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setResults(null)}>
          <div className={`${MODAL_CONTENT_CLS} max-w-2xl max-h-[80vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{t("radiology.physicianResults.title")}</h3>
              <button onClick={() => setResults(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t("radiology.physicianResults.subtitle", { name: results.physician.name })}</p>
            {resultsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : results.items.length === 0 ? (
              <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.physicianResults.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400 text-right">
                      <th className="py-2 px-2">{t("radiology.physicianResults.patient")}</th>
                      <th className="py-2 px-2">{t("radiology.physicianResults.exam")}</th>
                      <th className="py-2 px-2">{t("radiology.physicianResults.date")}</th>
                      <th className="py-2 px-2">{t("radiology.physicianResults.status")}</th>
                      <th className="py-2 px-2">{t("radiology.physicianResults.read")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.items.map(i => (
                      <tr key={i.id} className="border-b dark:border-gray-700/50">
                        <td className="py-2 px-2 font-medium">{i.patientName}</td>
                        <td className="py-2 px-2">{i.examTypeName || i.modality || "ΓÇö"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{new Date(i.createdAt).toLocaleDateString("ar-EG")}</td>
                        <td className="py-2 px-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${RadiologyStatusMap[i.status]?.color || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"}`}>
                            {RadiologyStatusMap[i.status] ? t(RadiologyStatusMap[i.status].label) : i.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {readIds.has(i.id) ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />{t("radiology.physicianResults.read")}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500 text-xs"><Circle className="w-3.5 h-3.5" />{t("radiology.physicianResults.unread")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button onClick={() => setResults(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">{t("radiology.close")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
