import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, ChevronRight, ChevronLeft, Dna } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabCulture } from "./shared";

interface CultureRow extends LabCulture {
  organismCount?: number;
  antibioticCount?: number;
}

interface ChildForm {
  name: string;
}

interface CultureForm {
  id?: string;
  name: string;
  category: string;
  sampleType: string;
  price: string;
  isActive: boolean;
  organisms: ChildForm[];
  antibiotics: ChildForm[];
}

const emptyChild = (): ChildForm => ({ name: "" });

export default function CulturesTab() {
  const [cultures, setCultures] = useState<CultureRow[]>([]);
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

  const [modal, setModal] = useState<CultureForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchJson<CultureRow[]>(`${api("cultures")}&limit=200&includeInactive=true`);
      const seen = new Map<string, boolean>();
      for (const c of data || []) {
        if (c.category) seen.set(c.category, true);
      }
      setCategories(Array.from(seen.keys()).sort((a, b) => a.localeCompare(b, "ar")));
    } catch {
      setCategories([]);
    }
  }, []);

  const loadCultures = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (includeInactive) params.set("includeInactive", "true");
      const res = await fetch(`${api("cultures")}&${params.toString()}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: CultureRow[]; total?: number; page?: number };
      if (!json.success) throw new Error(json.error || json.message || "فشل العملية");
      if (requestRef.current !== reqId) return;
      setCultures(json.data || []);
      setTotal(json.total ?? 0);
      if (json.page) setPage(json.page);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "حدث خطأ في جلب المزارع");
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
    loadCultures();
  }, [loadCultures]);

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

  const refreshAll = async (quiet = false) => {
    await Promise.all([loadCultures(quiet), loadCategories()]);
  };

  const openCreate = () => {
    setError(null);
    setModal({
      name: "",
      category: "",
      sampleType: "",
      price: "",
      isActive: true,
      organisms: [],
      antibiotics: [],
    });
  };

  const openEdit = async (culture: CultureRow) => {
    setEditingLoading(true);
    setError(null);
    try {
      const full = await fetchJson<LabCulture>(api(`cultures/${culture.id}`));
      setModal({
        id: full.id,
        name: full.name,
        category: full.category || "",
        sampleType: full.sampleType || "",
        price: String(full.price ?? 0),
        isActive: full.isActive,
        organisms: (full.organisms || []).map(o => ({ name: o.name })),
        antibiotics: (full.antibiotics || []).map(a => ({ name: a.name })),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في جلب المزرعة");
    } finally {
      setEditingLoading(false);
    }
  };

  const save = async () => {
    if (!modal) return;
    if (saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("اسم المزرعة مطلوب"); return; }
    const price = Number(modal.price);
    if (modal.price !== "" && (Number.isNaN(price) || price < 0)) { setError("السعر غير صحيح"); return; }

    const organisms = modal.organisms.filter(o => o.name.trim() !== "").map(o => ({ name: o.name.trim() }));
    const antibiotics = modal.antibiotics.filter(a => a.name.trim() !== "").map(a => ({ name: a.name.trim() }));

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        category: modal.category.trim() || undefined,
        sampleType: modal.sampleType.trim() || undefined,
        price,
        organisms,
        antibiotics,
      };
      if (modal.id) {
        await mutate(`cultures/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("cultures", "POST", payload);
      }
      setModal(null);
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (culture: CultureRow) => {
    if (removingId) return;
    if (!window.confirm(`تأكيد حذف المزرعة "${culture.name}"؟`)) return;
    setRemovingId(culture.id);
    try {
      await mutate(`cultures/${culture.id}`, "DELETE");
      await refreshAll(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف المزرعة");
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (editingLoading) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">المزارع</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة المزارع (Culture) والكائنات الدقيقة ولوحات المضادات الحيوية</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />إضافة مزرعة
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
            placeholder="بحث بالاسم أو الفئة أو نوع العينة..."
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
      ) : cultures.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <Dna className="w-10 h-10 mx-auto mb-3" />
          {search || category ? "لا توجد نتائج مطابقة" : "لا توجد مزارع بعد — أضف أول مزرعة"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">اسم</th>
                  <th className="text-right py-3 px-4">الفئة</th>
                  <th className="text-right py-3 px-4">نوع العينة</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">السعر</th>
                  <th className="text-right py-3 px-4">#كائنات</th>
                  <th className="text-right py-3 px-4">#مضادات</th>
                  <th className="text-right py-3 px-4">حالة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {cultures.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">{c.category || "—"}</td>
                    <td className="py-3 px-4">{c.sampleType || "—"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{c.price ?? 0} ج.م</td>
                    <td className="py-3 px-4">{c.organismCount ?? 0}</td>
                    <td className="py-3 px-4">{c.antibioticCount ?? 0}</td>
                    <td className="py-3 px-4">
                      {c.isActive ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">نشط</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">معطل</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(c)} disabled={removingId !== null} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-40" title="حذف">
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
            <span>عرض {cultures.length} من {total} مزرعة</span>
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
          <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل مزرعة" : "مزرعة جديدة"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المزرعة *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
                  <input className={MODAL_INPUT_CLS} value={modal.category} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder="مثال: ميكروبيولوجيا" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع العينة</label>
                  <input className={MODAL_INPUT_CLS} value={modal.sampleType} onChange={e => setModal({ ...modal, sampleType: e.target.value })} placeholder="مثال: بول، دم" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">السعر (ج.م)</label>
                  <input type="number" min={0} className={MODAL_INPUT_CLS} value={modal.price} onChange={e => setModal({ ...modal, price: e.target.value })} />
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">الكائنات الدقيقة</h4>
                  <button
                    onClick={() => setModal({ ...modal, organisms: [...modal.organisms, emptyChild()] })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" />إضافة كائن
                  </button>
                </div>

                {modal.organisms.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed dark:border-gray-700 rounded-lg">
                    لا توجد كائنات دقيقة بعد
                  </p>
                ) : (
                  <div className="space-y-2">
                    {modal.organisms.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={MODAL_INPUT_CLS}
                          value={o.name}
                          onChange={e => setModal({ ...modal, organisms: modal.organisms.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                          placeholder="مثال: إي كولاي، مكورات عنقودية"
                        />
                        <button
                          onClick={() => setModal({ ...modal, organisms: modal.organisms.filter((_, idx) => idx !== i) })}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                          title="إزالة الكائن"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">المضادات الحيوية</h4>
                  <button
                    onClick={() => setModal({ ...modal, antibiotics: [...modal.antibiotics, emptyChild()] })}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-4 h-4" />إضافة مضاد
                  </button>
                </div>

                {modal.antibiotics.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed dark:border-gray-700 rounded-lg">
                    لا توجد مضادات حيوية بعد
                  </p>
                ) : (
                  <div className="space-y-2">
                    {modal.antibiotics.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          className={MODAL_INPUT_CLS}
                          value={a.name}
                          onChange={e => setModal({ ...modal, antibiotics: modal.antibiotics.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) })}
                          placeholder="مثال: أموكسيسيلين، سيفترياكسون"
                        />
                        <button
                          onClick={() => setModal({ ...modal, antibiotics: modal.antibiotics.filter((_, idx) => idx !== i) })}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"
                          title="إزالة المضاد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  مفعّل
                </label>
              )}
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
