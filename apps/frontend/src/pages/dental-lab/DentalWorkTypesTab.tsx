import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Wrench, X as XMarkIcon } from "lucide-react";
import {
  DentalWorkType, fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType,
  WORK_TYPE_CATEGORIES, tKey, MODAL_CONTENT_CLS, MODAL_INPUT_CLS,
} from "./shared";

interface WorkTypeForm {
  id?: string;
  name: string;
  category: string;
  price: number;
  leadTimeDays: number;
  sortOrder: number;
  isActive: boolean;
}

export default function DentalWorkTypesTab() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<DentalWorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<WorkTypeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    setLoading(true);
    try {
      let data = await fetchWorkTypes();
      if (search.trim()) {
        const q = search.trim();
        data = data.filter(w => w.name.includes(q) || (w.category || "").includes(q));
      }
      data = [...data].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setRows(data);
      setError(null);
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setError(null);
    setModal({ name: "", category: "CROWN", price: 0, leadTimeDays: 3, sortOrder: 0, isActive: true });
  };

  const openEdit = (w: DentalWorkType) => {
    setError(null);
    setModal({
      id: w.id,
      name: w.name,
      category: w.category || "OTHER",
      price: w.price ?? 0,
      leadTimeDays: w.leadTimeDays ?? 0,
      sortOrder: w.sortOrder ?? 0,
      isActive: w.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError(t("dentalLab.common.name")); return; }
    setSaving(true);
    try {
      const payload = {
        name: modal.name.trim(),
        category: modal.category || "OTHER",
        price: Number(modal.price) || 0,
        leadTimeDays: Number(modal.leadTimeDays) || 0,
        sortOrder: Number(modal.sortOrder) || 0,
      };
      if (modal.id) {
        await updateWorkType(modal.id, { ...payload, isActive: modal.isActive });
        toast.success(t("dentalLab.workTypes.updated"));
      } else {
        await createWorkType({ ...payload, isActive: true });
        toast.success(t("dentalLab.workTypes.created"));
      }
      setModal(null);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (w: DentalWorkType) => {
    if (removingId) return;
    if (!window.confirm(`${t("dentalLab.common.confirmDelete")} (${w.name})`)) return;
    setRemovingId(w.id);
    try {
      await deleteWorkType(w.id);
      toast.success(t("dentalLab.workTypes.deleted"));
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingId(null);
    }
  };

  const toggleActive = async (w: DentalWorkType) => {
    try {
      await updateWorkType(w.id, { isActive: !w.isActive });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("dentalLab.workTypes.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("dentalLab.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" />{t("dentalLab.workTypes.newWorkType")}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="font-semibold">{t("dentalLab.workTypes.title")}</h3>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
            <input className={`${inputCls} pr-9 w-64`} value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder={t("dentalLab.common.search")} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <Wrench className="w-10 h-10 mx-auto mb-3" />
            {t("dentalLab.common.noResults")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  {[t("dentalLab.common.name"), t("dentalLab.workTypes.category"), t("dentalLab.workTypes.price"), t("dentalLab.workTypes.leadTimeDays"), t("dentalLab.workTypes.sortOrder"), t("dentalLab.common.status"), t("dentalLab.common.actions")].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(w => (
                  <tr key={w.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{w.name}</td>
                    <td className="py-3 px-4">{w.category ? tKey(t, `dentalLab.workTypes.categoryOptions.${w.category}`) : "—"}</td>
                    <td className="py-3 px-4">{w.price ?? 0}</td>
                    <td className="py-3 px-4">{w.leadTimeDays ?? 0}</td>
                    <td className="py-3 px-4">{w.sortOrder ?? 0}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleActive(w)}
                        className={`text-xs px-2 py-0.5 rounded-full border ${w.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                      >
                        {w.isActive ? t("dentalLab.common.active") : t("dentalLab.common.inactive")}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(w)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("dentalLab.common.edit")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(w)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("dentalLab.common.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? t("dentalLab.workTypes.editTitle") : t("dentalLab.workTypes.createTitle")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("dentalLab.common.name")} *</label>
                <input className={inputCls} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.category")}</label>
                <select className={inputCls} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })}>
                  {WORK_TYPE_CATEGORIES.map(c => <option key={c} value={c}>{tKey(t, `dentalLab.workTypes.categoryOptions.${c}`)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.price")}</label>
                <input className={inputCls} type="number" value={modal.price} onChange={e => setModal({ ...modal, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.leadTimeDays")}</label>
                <input className={inputCls} type="number" value={modal.leadTimeDays} onChange={e => setModal({ ...modal, leadTimeDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.sortOrder")}</label>
                <input className={inputCls} type="number" value={modal.sortOrder} onChange={e => setModal({ ...modal, sortOrder: Number(e.target.value) })} />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  {t("dentalLab.common.active")}
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                {t("dentalLab.common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}