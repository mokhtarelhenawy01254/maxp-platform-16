import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X as XMarkIcon, Search, FileText } from "lucide-react";
import { api, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, LabContract } from "./shared";

const DISCOUNT_TYPES = [
  { value: "PERCENTAGE", label: "نسبة مئوية" },
  { value: "CUSTOM", label: "سعر مخصص" },
  { value: "NONE", label: "بدون خصم" },
];

const discountLabel = (type: string) =>
  DISCOUNT_TYPES.find(d => d.value === type)?.label || type || "—";

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

export default function ContractsTab() {
  const [contracts, setContracts] = useState<LabContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [modal, setModal] = useState<ContractForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadContracts = useCallback(async (quiet = false) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (includeInactive) params.set("includeInactive", "true");
      const qs = params.toString();
      const res = await fetch(`${api("contracts")}${qs ? `&${qs}` : ""}`, { headers: getAuthHeaders() });
      const json = (await res.json()) as { success?: boolean; error?: string; message?: string; data?: LabContract[] };
      if (!json.success) throw new Error(json.error || json.message || "فشل العملية");
      if (requestRef.current !== reqId) return;
      setContracts(json.data || []);
    } catch (e: unknown) {
      if (requestRef.current !== reqId) return;
      if (!quiet) setError(e instanceof Error ? e.message : "حدث خطأ في جلب التعاقدات");
    } finally {
      if (requestRef.current === reqId) setLoading(false);
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

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
    setModal({ name: "", region: "", governorate: "", discountType: "PERCENTAGE", discountPercent: "0", externalSample: false, isActive: true });
  };

  const openEdit = (c: LabContract) => {
    setError(null);
    setModal({
      id: c.id,
      name: c.name,
      region: c.region || "",
      governorate: c.governorate || "",
      discountType: c.discountType,
      discountPercent: String(c.discountPercent ?? 0),
      externalSample: c.externalSample,
      isActive: c.isActive,
    });
  };

  const save = async () => {
    if (!modal || saving) return;
    setError(null);
    if (!modal.name.trim()) { setError("اسم التعاقد مطلوب"); return; }
    const percent = Number(modal.discountPercent);
    if (modal.discountPercent !== "" && (Number.isNaN(percent) || percent < 0 || percent > 100)) {
      setError("النسبة يجب أن تكون بين 0 و 100");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: modal.name.trim(),
        region: modal.region.trim() || undefined,
        governorate: modal.governorate.trim() || undefined,
        discountType: modal.discountType,
        discountPercent: percent,
        externalSample: modal.externalSample,
      };
      if (modal.id) {
        await mutate(`contracts/${modal.id}`, "PUT", { ...payload, isActive: modal.isActive });
      } else {
        await mutate("contracts", "POST", payload);
      }
      setModal(null);
      await loadContracts(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: LabContract) => {
    if (removingId) return;
    if (!window.confirm(`تأكيد حذف التعاقد "${c.name}"؟`)) return;
    setRemovingId(c.id);
    try {
      await mutate(`contracts/${c.id}`, "DELETE");
      await loadContracts(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف التعاقد");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">التعاقدات</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">الشركات والمعامل الخارجية الطالبة للتحاليل مع نوع الخصم</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />إضافة تعاقد
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
            placeholder="بحث بالاسم أو المنطقة..."
          />
        </div>
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
      ) : contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-12 text-center text-gray-400 dark:text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3" />
          {search ? "لا توجد نتائج مطابقة" : "لا توجد تعاقدات بعد — أضف أول تعاقد"}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                  <th className="text-right py-3 px-4">اسم</th>
                  <th className="text-right py-3 px-4">المنطقة</th>
                  <th className="text-right py-3 px-4">المحافظة</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">نوع الخصم</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">النسبة</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">استلام خارجي</th>
                  <th className="text-right py-3 px-4">حالة</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => (
                  <tr key={c.id} className="border-b dark:border-gray-700 last:border-b-0">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4">{c.region || "—"}</td>
                    <td className="py-3 px-4">{c.governorate || "—"}</td>
                    <td className="py-3 px-4">{discountLabel(c.discountType)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {c.discountType === "PERCENTAGE" ? `${c.discountPercent ?? 0}%` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      {c.externalSample ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">نعم</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">لا</span>
                      )}
                    </td>
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
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل تعاقد" : "تعاقد جديد"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم التعاقد *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: شركة الأمل للمقاولات" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المنطقة</label>
                  <input className={MODAL_INPUT_CLS} value={modal.region} onChange={e => setModal({ ...modal, region: e.target.value })} placeholder="مثال: مدينة نصر" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المحافظة</label>
                  <input className={MODAL_INPUT_CLS} value={modal.governorate} onChange={e => setModal({ ...modal, governorate: e.target.value })} placeholder="مثال: القاهرة" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الخصم</label>
                  <select className={MODAL_INPUT_CLS} value={modal.discountType} onChange={e => setModal({ ...modal, discountType: e.target.value })}>
                    {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النسبة (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={MODAL_INPUT_CLS}
                    value={modal.discountPercent}
                    onChange={e => setModal({ ...modal, discountPercent: e.target.value })}
                    disabled={modal.discountType === "NONE"}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={modal.externalSample}
                  onChange={e => setModal({ ...modal, externalSample: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                استلام العينة من جهة خارجية (معمل إلى معمل)
              </label>
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
