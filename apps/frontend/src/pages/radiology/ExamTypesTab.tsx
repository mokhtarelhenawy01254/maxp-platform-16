import { useCallback, useEffect, useRef, useState } from "react";
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
      if (!json.success) throw new Error(json.error || json.message || "فشل العملية");
      if (requestRef.current !== reqId) return;
      setExamTypes(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "حدث خطأ في جلب أنواع الفحوصات");
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
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const openCreate = () => {
    setError(null);
    setModal({ name: "", category: "", abbreviation: "", price: "", isAddition: false, isActive: true });
  };

  const openEdit = (t: RadiologyExamType) => {
    setError(null);
    setModal({
      id: t.id,
      name: t.name,
      category: t.category || "",
      abbreviation: t.abbreviation || "",
      price: String(t.price ?? 0),
      isAddition: !!t.isAddition,
      isActive: t.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("اسم نوع الفحص مطلوب"); return; }
    const price = Number(modal.price);
    if (modal.price !== "" && (Number.isNaN(price) || price < 0)) { setError("السعر غير صحيح"); return; }

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
      setError(e instanceof Error ? e.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: RadiologyExamType) => {
    if (removingId) return;
    if (!window.confirm(`تأكيد حذف نوع الفحص "${t.name}"؟`)) return;
    setRemovingId(t.id);
    try {
      await mutate(`exam-types/${t.id}`, "DELETE");
      await Promise.all([loadExamTypes(true), loadCategories()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف نوع الفحص");
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">أنواع الفحوصات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة كتالوج أنواع فحوصات الأشعة</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />إضافة نوع فحص
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
            placeholder="بحث بالاسم أو الفئة أو الاختصار..."
          />
        </div>
        <select className={`${MODAL_INPUT_CLS} w-auto`} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          عرض المعطلين
        </label>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>
      ) : examTypes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <ScanLine className="w-10 h-10 mx-auto mb-3" />
          {search || category ? "لا توجد نتائج مطابقة" : "لا توجد أنواع فحوصات بعد — أضف أول نوع فحص"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">الاسم</th>
                  <th className="text-right py-3 px-4">الفئة</th>
                  <th className="text-right py-3 px-4">الاختصار</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">السعر</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {examTypes.map(t => (
                  <tr key={t.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">
                      {t.name}
                      {t.isAddition ? <span className="mr-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">إضافة</span> : null}
                    </td>
                    <td className="py-3 px-4">{t.category || "—"}</td>
                    <td className="py-3 px-4">{t.abbreviation || "—"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{t.price ?? 0} ج.م</td>
                    <td className="py-3 px-4">
                      {t.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">نشط</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">معطل</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(t)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="حذف">
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
            <span>عرض {examTypes.length} من {total} نوع فحص</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                <ChevronRight className="w-4 h-4" />السابق
              </button>
              <span className="px-2">صفحة {page} من {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600"
              >
                التالي<ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل نوع فحص" : "نوع فحص جديد"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم نوع الفحص *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: أشعة مقطعية على البطن" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
                  <input className={MODAL_INPUT_CLS} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder="مثال: مقطعية، رنين" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاختصار</label>
                  <input className={MODAL_INPUT_CLS} value={modal.abbreviation} onChange={e => setModal({ ...modal, abbreviation: e.target.value })} placeholder="مثال: CT" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر (ج.م)</label>
                <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  مفعّل
                </label>
              )}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={modal.isAddition} onChange={e => setModal({ ...modal, isAddition: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                إضافة فحص (تظهر في إضافات الاستقبال/الحجز)
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">إلغاء</button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
