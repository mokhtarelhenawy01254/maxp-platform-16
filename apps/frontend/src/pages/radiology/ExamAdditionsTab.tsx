import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Pencil, Trash2, Search } from "lucide-react";
import { api, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface Addition { id: string; name: string; price: number; isActive: boolean; createdAt: string; }

interface Form { id?: string; name: string; price: string; }

export default function ExamAdditionsTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Addition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("exam-additions"));
      if (search.trim()) url.searchParams.set("search", search.trim());
      const data = await fetchJson<Addition[]>(url.toString());
      setItems(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : t("radiology.examAdditions.loadFailed"));
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setLoading(true); refresh().finally(() => setLoading(false)); }, 350);
    return () => clearTimeout(t);
  }, [refresh]);

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error(t("radiology.examAdditions.nameRequired")); return; }
    setSaving(true);
    try {
      const payload = { name: modal.name.trim(), price: Number(modal.price) || 0 };
      if (modal.id) await fetchJson(api(`exam-additions/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      else await fetchJson(api("exam-additions"), { method: "POST", body: JSON.stringify(payload) });
      toast.success(modal.id ? t("radiology.examAdditions.additionUpdated") : t("radiology.examAdditions.additionCreated"));
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.examAdditions.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Addition) => {
    if (!window.confirm(t("radiology.examAdditions.deleteConfirm", { name: a.name }))) return;
    try {
      await fetchJson(api(`exam-additions/${a.id}`), { method: "DELETE" });
      toast.success(t("radiology.examAdditions.deleted"));
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("radiology.examAdditions.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.examAdditions.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.examAdditions.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className={`${MODAL_INPUT_CLS} pr-9 w-44`} placeholder={t("radiology.examAdditions.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("radiology.refresh")}
          </button>
          <button onClick={() => setModal({ name: "", price: "0" })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />{t("radiology.examAdditions.newAddition")}
          </button>
        </div>
      </div>

      {loading && !items.length ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.examAdditions.noAdditions")}</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {[t("radiology.examAdditions.name"), t("radiology.examAdditions.price"), t("radiology.examAdditions.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(a => (
                  <tr key={a.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                    <td className="py-3 px-4 font-medium">{a.name}</td>
                    <td className="py-3 px-4">{Number(a.price).toFixed(0)} {t("radiology.currency")}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setModal({ id: a.id, name: a.name, price: String(a.price) })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t("radiology.edit")}><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(a)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t("radiology.delete")}><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.examAdditions.editAddition") : t("radiology.examAdditions.newAdditionModal")}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.examAdditions.nameLabel")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder={t("radiology.examAdditions.namePlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">{t("radiology.examAdditions.priceLabel")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} dir="ltr" value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
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
