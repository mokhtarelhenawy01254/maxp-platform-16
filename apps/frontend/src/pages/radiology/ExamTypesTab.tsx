import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ScanLine, ChevronRight, ChevronLeft } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, RadiologyExamType } from "./shared";

interface ExamTypeForm {
  id?: string;
  name: string;
  category: string;
  abbreviation: string;
  price: string;
  isAddition: boolean;
  isActive: boolean;
}

export default function ExamTypesTab() {
  const { t } = useTranslation();
  const [examTypes, setExamTypes] = useState<RadiologyExamType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [modal, setModal] = useState<ExamTypeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchJson<RadiologyExamType[]>(`${api("exam-types")}&limit=500&includeInactive=true`);
      const seen = new Map<string, boolean>();
      for (const t of data || []) {
        if (t.category) seen.set(t.category, true);
      }
      setCategories(Array.from(seen.keys()).sort((a, b) => a.localeCompare(b, "ar")));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadExamTypes = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (includeInactive) params.set("includeInactive", "true");
      const res = await fetch(`${api("exam-types")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: RadiologyExamType[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || t("radiology.examTypes.operationFailed"));
      if (requestRef.current !== reqId) return;
      setExamTypes(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : t("radiology.examTypes.loadFailed"));
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [page, limit, search, category, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, category, includeInactive]);

  useEffect(() => {
    loadExamTypes();
  }, [loadExamTypes]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const mutate = async (path: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(api(path), {
      method,
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || t("radiology.examTypes.operationFailed"));
    return data.data;
  };

  const openCreate = () => {
    setError(null);
    setModal({ name: "", category: "", abbreviation: "", price: "", isAddition: false, isActive: true });
  };

  const openEdit = (et: RadiologyExamType) => {
    setError(null);
    setModal({
      id: et.id,
      name: et.name,
      category: et.category || "",
      abbreviation: et.abbreviation || "",
      price: String(et.price ?? 0),
      isAddition: !!et.isAddition,
      isActive: et.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError(t("radiology.examTypes.nameRequired")); return; }
    const price = Number(modal.price);
    if (modal.price !== "" && (Number.isNaN(price) || price < 0)) { setError(t("radiology.examTypes.invalidPrice")); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        category: modal.category.trim() || undefined,
        abbreviation: modal.abbreviation.trim() || undefined,
        price,
        isAddition: modal.isAddition,
      };
      if (modal.id) {
        await mutate(`exam-types/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("exam-types", "POST", payload);
      }
      setModal(null);
      await Promise.all([loadExamTypes(true), loadCategories()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("radiology.examTypes.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (et: RadiologyExamType) => {
    if (removingId) return;
    if (!window.confirm(t("radiology.examTypes.deleteConfirm", { name: et.name }))) return;
    setRemovingId(et.id);
    try {
      await mutate(`exam-types/${et.id}`, "DELETE");
      await Promise.all([loadExamTypes(true), loadCategories()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("radiology.examTypes.deleteFailed"));
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{t("radiology.examTypes.title")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.examTypes.subtitle")}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />{t("radiology.examTypes.addExamType")}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
          <input
            className={`${MODAL_INPUT_CLS} pr-9`}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t("radiology.examTypes.searchPlaceholder")}
          />
        </div>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">{t("radiology.examTypes.allCategories")}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          {t("radiology.examTypes.showInactive")}
        </label>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">{t("radiology.loadingEllipsis")}</div>
      ) : examTypes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <ScanLine className="w-10 h-10 mx-auto mb-3" />
          {search || category ? t("radiology.examTypes.noResults") : t("radiology.examTypes.noExamTypes")}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">{t("radiology.examTypes.name")}</th>
                  <th className="text-right py-3 px-4">{t("radiology.examTypes.category")}</th>
                  <th className="text-right py-3 px-4">{t("radiology.examTypes.abbreviation")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("radiology.examTypes.price")}</th>
                  <th className="text-right py-3 px-4">{t("radiology.examTypes.status")}</th>
                  <th className="text-right py-3 px-4">{t("radiology.examTypes.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {examTypes.map(et => (
                  <tr key={et.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">
                      {et.name}
                      {et.isAddition ? <span className="mr-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{t("radiology.examTypes.additionBadge")}</span> : null}
                    </td>
                    <td className="py-3 px-4">{et.category || "—"}</td>
                    <td className="py-3 px-4">{et.abbreviation || "—"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{et.price ?? 0} {t("radiology.currency")}</td>
                    <td className="py-3 px-4">
                      {et.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{t("radiology.examTypes.active")}</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t("radiology.examTypes.inactive")}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(et)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title={t("radiology.edit")}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(et)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title={t("radiology.delete")}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
            <span>{t("radiology.examTypes.showingRange", { shown: examTypes.length, total })}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                <ChevronRight className="w-4 h-4" />{t("radiology.examTypes.previous")}
              </button>
              <span className="px-2">{t("radiology.examTypes.page", { page, pages: totalPages })}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                {t("radiology.examTypes.next")}<ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? t("radiology.examTypes.editExamType") : t("radiology.examTypes.newExamType")}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("radiology.examTypes.examTypeName")}</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder={t("radiology.examTypes.namePlaceholder")} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("radiology.examTypes.category")}</label>
                  <input className={MODAL_INPUT_CLS} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder={t("radiology.examTypes.categoryPlaceholder")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("radiology.examTypes.abbreviation")}</label>
                  <input className={MODAL_INPUT_CLS} value={modal.abbreviation} onChange={e => setModal({ ...modal, abbreviation: e.target.value })} placeholder={t("radiology.examTypes.abbreviationPlaceholder")} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("radiology.examTypes.priceLabel")}</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  {t("radiology.examTypes.enabled")}
                </label>
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={modal.isAddition} onChange={e => setModal({ ...modal, isAddition: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                {t("radiology.examTypes.isAddition")}
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">{t("radiology.cancel")}</button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? t("radiology.saving") : t("radiology.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
