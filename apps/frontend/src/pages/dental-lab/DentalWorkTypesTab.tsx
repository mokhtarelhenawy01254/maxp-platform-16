import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles, Trash2, Wrench, X as XMarkIcon } from "lucide-react";
import {
  DentalWorkType, fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType,
  WORK_TYPE_CATEGORIES, tKey, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, fmtMoney,
} from "./shared";

interface WorkTypeForm {
  id?: string;
  name: string;
  category: string;
  pricingMode: "PER_UNIT" | "FLAT";
  price: number;
  leadTimeDays: number;
  defaultMaterial: string;
  defaultWarrantyYears: number;
  defaultCrownCount: number;
  sortOrder: number;
  isActive: boolean;
}

const COMMON_MATERIALS = [
  "زيركون (Zirconia Multilayer)",
  "إيماكس (e.max CAD / Press)",
  "بورسلين ميتال (PFM Cobalt-Chrome)",
  "بي إي إي كيه (PEEK / High Performance)",
  "أكريل وطباعة 3D (PMMA / 3D Print)",
  "معدن مسبوك (Cast Metal / Gold)",
  "فينير تجميلي (Cosmetic Veneer)",
];

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
    setModal({
      name: "",
      category: "CROWN",
      pricingMode: "PER_UNIT",
      price: 0,
      leadTimeDays: 3,
      defaultMaterial: "زيركون (Zirconia Multilayer)",
      defaultWarrantyYears: 5,
      defaultCrownCount: 1,
      sortOrder: 0,
      isActive: true,
    });
  };

  const openEdit = (w: DentalWorkType) => {
    setError(null);
    setModal({
      id: w.id,
      name: w.name,
      category: w.category || "OTHER",
      pricingMode: w.pricingMode || "PER_UNIT",
      price: w.price ?? 0,
      leadTimeDays: w.leadTimeDays ?? 0,
      defaultMaterial: w.defaultMaterial || "",
      defaultWarrantyYears: w.defaultWarrantyYears ?? 0,
      defaultCrownCount: w.defaultCrownCount ?? 1,
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
        pricingMode: modal.pricingMode,
        price: Number(modal.price) || 0,
        leadTimeDays: Number(modal.leadTimeDays) || 0,
        defaultMaterial: modal.defaultMaterial.trim() || undefined,
        defaultWarrantyYears: Number(modal.defaultWarrantyYears) || 0,
        defaultCrownCount: Math.max(1, Number(modal.defaultCrownCount) || 1),
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
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الخدمات، تسعير الكراونات والوحدات، والخامات والضمان</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />{t("dentalLab.common.refresh")}
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 shadow-sm">
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
            <h3 className="font-semibold">قائمة أنواع الشغل والتركيبات</h3>
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
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.name")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.workTypes.category")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">طريقة التسعير</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.workTypes.price")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">الخامة والضمان الافتراضي</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.workTypes.leadTimeDays")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.status")}</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">{t("dentalLab.common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(w => {
                  const isPerUnit = (w.pricingMode || "PER_UNIT") === "PER_UNIT";
                  return (
                    <tr key={w.id} className="border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 font-medium">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{w.name}</div>
                        {isPerUnit && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                            افتراضي: {w.defaultCrownCount || 1} كراون
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {w.category ? tKey(t, `dentalLab.workTypes.categoryOptions.${w.category}`) : "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${isPerUnit ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"}`}>
                          {isPerUnit ? "لكل كراون / وحدة" : "سعر ثابت للخدمة"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        {fmtMoney(w.price ?? 0)} ج.م
                        {isPerUnit && <span className="text-xs font-normal text-gray-500 mr-1">/ كراون</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {w.defaultMaterial || "—"}
                        </div>
                        {(w.defaultWarrantyYears ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>ضمان {w.defaultWarrantyYears} سنوات</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">{w.leadTimeDays ?? 0} أيام</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b pb-3 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">{modal.id ? "تعديل نوع الشغل" : "إضافة نوع شغل جديد"}</h3>
              </div>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>{t("dentalLab.common.name")} *</label>
                <input className={inputCls} placeholder="مثال: تاج زيركون متعدد الطبقات (Zirconia Crown)" value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>

              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.category")}</label>
                <select className={inputCls} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })}>
                  {WORK_TYPE_CATEGORIES.map(c => <option key={c} value={c}>{tKey(t, `dentalLab.workTypes.categoryOptions.${c}`)}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>طريقة التسعير *</label>
                <select className={inputCls} value={modal.pricingMode} onChange={e => setModal({ ...modal, pricingMode: e.target.value as "PER_UNIT" | "FLAT" })}>
                  <option value="PER_UNIT">تسعير لكل كراون / سن (Per Unit/Crown)</option>
                  <option value="FLAT">سعر ثابت للخدمة كاملة (Flat Rate)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  {modal.pricingMode === "PER_UNIT" ? "سعر الكراون الواحد (ج.م) *" : "السعر الإجمالي للخدمة (ج.م) *"}
                </label>
                <input className={inputCls} type="number" min="0" value={modal.price} onChange={e => setModal({ ...modal, price: Number(e.target.value) })} />
              </div>

              {modal.pricingMode === "PER_UNIT" && (
                <div>
                  <label className={labelCls}>عدد الكراونات الافتراضي</label>
                  <input className={inputCls} type="number" min="1" value={modal.defaultCrownCount} onChange={e => setModal({ ...modal, defaultCrownCount: Math.max(1, Number(e.target.value)) })} />
                </div>
              )}

              <div>
                <label className={labelCls}>الخامة الافتراضية</label>
                <input list="common-materials" className={inputCls} placeholder="اختر أو اكتب الخامة" value={modal.defaultMaterial} onChange={e => setModal({ ...modal, defaultMaterial: e.target.value })} />
                <datalist id="common-materials">
                  {COMMON_MATERIALS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div>
                <label className={labelCls}>سنوات الضمان الافتراضية</label>
                <input className={inputCls} type="number" min="0" placeholder="مثال: 5 سنوات" value={modal.defaultWarrantyYears} onChange={e => setModal({ ...modal, defaultWarrantyYears: Number(e.target.value) })} />
              </div>

              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.leadTimeDays")} (أيام العمل)</label>
                <input className={inputCls} type="number" min="1" value={modal.leadTimeDays} onChange={e => setModal({ ...modal, leadTimeDays: Number(e.target.value) })} />
              </div>

              <div>
                <label className={labelCls}>{t("dentalLab.workTypes.sortOrder")}</label>
                <input className={inputCls} type="number" value={modal.sortOrder} onChange={e => setModal({ ...modal, sortOrder: Number(e.target.value) })} />
              </div>

              {modal.id && (
                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input type="checkbox" id="worktype-active" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-blue-600" />
                  <label htmlFor="worktype-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    {t("dentalLab.common.active")} (متاح لاختياره في الحالات الجديدة)
                  </label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6 border-t pt-3 dark:border-gray-700">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-sm">
                {t("dentalLab.common.cancel")}
              </button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm">
                {saving ? t("dentalLab.common.saving") : t("dentalLab.common.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}