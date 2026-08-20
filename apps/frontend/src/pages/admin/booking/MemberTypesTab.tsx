import { useCallback, useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, X as XMarkIcon } from "lucide-react";
import { api, fetchJson, getAuthHeaders, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, InsuranceMemberType } from "./shared";

interface MemberTypeRow extends InsuranceMemberType {
  _count?: { patients?: number };
}

interface MemberTypeForm {
  id?: string;
  name: string;
  coveragePercent: string;
  isActive: boolean;
}

const emptyForm = (): MemberTypeForm => ({ name: "", coveragePercent: "", isActive: true });

export default function MemberTypesTab() {
  const [types, setTypes] = useState<MemberTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<MemberTypeForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchJson<MemberTypeRow[]>(api("insurance-member-types"));
    setTypes(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        await load();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "حدث خطأ في تحميل أنواع العضوية");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const mutate = async (url: string, method: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || data.message || "فشلت العملية");
    return data.data;
  };

  const openCreate = () => setModal(emptyForm());
  const openEdit = (t: MemberTypeRow) => setModal({ id: t.id, name: t.name, coveragePercent: String(t.coveragePercent), isActive: t.isActive });

  const save = async () => {
    if (!modal) return;
    const coverage = Number(modal.coveragePercent);
    if (modal.coveragePercent === "" || Number.isNaN(coverage) || !Number.isFinite(coverage) || coverage < 0 || coverage > 100) {
      setError("نسبة التغطية يجب أن تكون رقماً بين 0 و 100");
      return;
    }
    setSaving(true);
    try {
      if (modal.id) {
        await mutate(api(`insurance-member-types/${modal.id}`), "PUT", { name: modal.name, coveragePercent: coverage, isActive: modal.isActive });
      } else {
        await mutate(api("insurance-member-types"), "POST", { name: modal.name, coveragePercent: coverage });
      }
      setModal(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حفظ نوع العضوية");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: MemberTypeRow) => {
    if (!window.confirm(`تأكيد حذف نوع العضوية "${t.name}"؟`)) return;
    try {
      await mutate(api(`insurance-member-types/${t.id}`), "DELETE");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ في حذف نوع العضوية");
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-400 dark:text-gray-500">جارٍ التحميل...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold">أنواع عضوية التأمين</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">أدوار العائلة (المؤمَّن له، الزوج، الزوجة، الأطفال) مع نسبة التغطية لكل نوع</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><PlusIcon className="w-4 h-4" />نوع عضوية جديد</button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded"><XMarkIcon className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                <th className="text-right py-3 px-4">الاسم</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">نسبة التغطية %</th>
                <th className="text-right py-3 px-4">الحالة</th>
                <th className="text-right py-3 px-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {types.length === 0 && (
                <tr><td colSpan={4} className="py-12 text-center text-gray-400 dark:text-gray-500">لا توجد أنواع عضوية بعد</td></tr>
              )}
              {types.map((t) => (
                <tr key={t.id} className="border-b dark:border-gray-700 last:border-b-0">
                  <td className="py-3 px-4 font-medium">{t.name}</td>
                  <td className="py-3 px-4 whitespace-nowrap font-semibold">{t.coveragePercent}%</td>
                  <td className="py-3 px-4">
                    {t.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">نشط</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">معطل</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="تعديل"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => remove(t)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title="حذف"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setModal(null)}>
          <div className={`${MODAL_CONTENT_CLS}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل نوع العضوية" : "نوع عضوية جديد"}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: الزوج، الزوجة، الأطفال" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نسبة التغطية %</label>
                <input type="number" min={0} max={100} className={MODAL_INPUT_CLS} value={modal.coveragePercent} onChange={e => setModal({ ...modal, coveragePercent: e.target.value })} placeholder="0 - 100" />
              </div>
              {modal.id && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600" />
                  مفعّل
                </label>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving || !modal.name.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
