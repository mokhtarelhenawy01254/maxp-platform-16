import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X as XMarkIcon, RefreshCw, Loader2, Search } from "lucide-react";
import { api, fetchJson, RadiologyContract, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "radiology.contracts.percentage" },
  { value: "CUSTOM", label: "radiology.contracts.customDiscount" },
  { value: "NONE", label: "radiology.contracts.noDiscount" },
];

interface ContractForm {
  id?: string;
  name: string;
  region: string;
  governorate: string;
  discountType: string;
  discountPercent: string;
  externalSample: boolean;
  isActive: boolean;
}

const emptyForm = (): ContractForm => ({
  name: "", region: "", governorate: "",
  discountType: "PERCENTAGE", discountPercent: "0",
  externalSample: false, isActive: true,
});

const discountLabel = (type: string) =>
  DISCOUNT_TYPES.find(d => d.value === type)?.label || type || "—";

export default function RadiologyContractsTab() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<RadiologyContract[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ContractForm | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("contracts"));
      if (search.trim()) url.searchParams.set("search", search.trim());
      const data = await fetchJson<RadiologyContract[]>(url.toString());
      setContracts(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.contracts.loadFailed"));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [refresh]);

  const openCreate = () => setModal(emptyForm());
  const openEdit = (c: RadiologyContract) => setModal({
    id: c.id, name: c.name, region: c.region || "", governorate: c.governorate || "",
    discountType: c.discountType, discountPercent: String(c.discountPercent),
    externalSample: c.externalSample, isActive: c.isActive,
  });

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error(t("radiology.contracts.nameRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        region: modal.region.trim() || undefined,
        governorate: modal.governorate.trim() || undefined,
        discountType: modal.discountType,
        discountPercent: Number(modal.discountPercent) || 0,
        externalSample: modal.externalSample,
      };
      if (modal.id) {
        await fetchJson(api(`contracts/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("contracts"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(modal.id ? t("radiology.contracts.contractUpdated") : t("radiology.contracts.contractCreated"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.contracts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: RadiologyContract) => {
    if (!window.confirm(t("radiology.contracts.deleteConfirm", { name: c.name }))) return;
    try {
      await fetchJson(api(`contracts/${c.id}`), { method: "DELETE" });
      toast.success(t("radiology.contracts.contractDeleted"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.contracts.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.contracts.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.contracts.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className="border dark:border-gray-600 rounded-lg pl-3 pr-9 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" placeholder={t("radiology.contracts.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.contracts.newContract")}
          </button>
        </div>
      </div>

      {loading && !contracts ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : contracts === null || contracts.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.contracts.noContracts")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.contracts.name"), t("radiology.contracts.region"), t("radiology.contracts.discountType"), t("radiology.contracts.discountPercent"), t("radiology.contracts.externalSample"), t("radiology.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{c.region || "—"}</td>
                    <td className="py-3 px-4">{t(discountLabel(c.discountType))}</td>
                    <td className="py-3 px-4">{c.discountType === "NONE" ? "—" : `${c.discountPercent}%`}</td>
                    <td className="py-3 px-4">{c.externalSample ? t("radiology.yes") : t("radiology.no")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(c)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.contracts.editContract") : t("radiology.contracts.newContractModal")}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.contracts.contractName")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder={t("radiology.contracts.namePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.contracts.region")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.region} onChange={e => setModal({ ...modal, region: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.contracts.governorate")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.governorate} onChange={e => setModal({ ...modal, governorate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.contracts.discountType")}</label>
                <select className={MODAL_INPUT_CLS} value={modal.discountType} onChange={e => setModal({ ...modal, discountType: e.target.value })}>
                  {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{t(d.label)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.contracts.discountPercentLabel")}</label>
                <input type="number" min={0} max={100} className={MODAL_INPUT_CLS} value={modal.discountPercent} onChange={e => setModal({ ...modal, discountPercent: e.target.value })} disabled={modal.discountType === "NONE"} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={modal.externalSample} onChange={e => setModal({ ...modal, externalSample: e.target.checked })} />
                <span className="text-sm text-gray-600 dark:text-gray-300">{t("radiology.contracts.externalSampleLabel")}</span>
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
