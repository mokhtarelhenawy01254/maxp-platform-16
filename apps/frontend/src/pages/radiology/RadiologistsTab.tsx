import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X as XMarkIcon, RefreshCw, Loader2, Search } from "lucide-react";
import { api, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

const RADIOLOGIST_LOCATIONS = [
  { value: "ON_SITE", label: "داخلي" },
  { value: "OFF_SITE", label: "خارجي" },
];

interface RadiologyRadiologist {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

interface RadiologistForm {
  id?: string;
  name: string;
  location: string;
  isActive: boolean;
}

const emptyForm = (): RadiologistForm => ({
  name: "",
  location: "ON_SITE",
  isActive: true,
});

const locationLabel = (value: string) =>
  RADIOLOGIST_LOCATIONS.find(l => l.value === value)?.label || value || "—";

export default function RadiologistsTab() {
  const [radiologists, setRadiologists] = useState<RadiologyRadiologist[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modal, setModal] = useState<RadiologistForm | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const url = new URL(api("radiologists"));
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (includeInactive) url.searchParams.set("includeInactive", "true");
      const data = await fetchJson<RadiologyRadiologist[]>(url.toString());
      setRadiologists(data || []);
    } catch (e) {
      if (!opts?.silent) toast.error(e instanceof Error ? e.message : "فشل تحميل أخصائيي الأشعة");
    }
  }, [search, includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [refresh]);

  const openCreate = () => setModal(emptyForm());
  const openEdit = (r: RadiologyRadiologist) => setModal({
    id: r.id,
    name: r.name,
    location: r.location,
    isActive: r.isActive,
  });

  const save = async () => {
    if (!modal || saving) return;
    if (!modal.name.trim()) { toast.error("اسم أخصائي الأشعة مطلوب"); return; }
    setSaving(true);
    try {
      const payload = { name: modal.name.trim(), location: modal.location, isActive: modal.isActive };
      if (modal.id) {
        await fetchJson(api(`radiologists/${modal.id}`), { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await fetchJson(api("radiologists"), { method: "POST", body: JSON.stringify(payload) });
      }
      toast.success(modal.id ? "تم تحديث أخصائي الأشعة" : "تم إنشاء أخصائي الأشعة");
      setModal(null);
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: RadiologyRadiologist) => {
    if (!window.confirm(`حذف أخصائي الأشعة "${r.name}"؟`)) return;
    try {
      await fetchJson(api(`radiologists/${r.id}`), { method: "DELETE" });
      toast.success("تم حذف أخصائي الأشعة");
      await refresh({ silent: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحذف");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">أخصائيو الأشعة</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الأطباء وإسنادهم للدراسات (داخلي / خارجي)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" />
            <input className="border dark:border-gray-600 rounded-lg pl-3 pr-9 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
            <input type="checkbox" checked={includeInactive} onChange={e => setIncludeInactive(e.target.checked)} />
            عرض المعطلين
          </label>
          <button onClick={() => refresh()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />تحديث
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" />أخصائي جديد
          </button>
        </div>
      </div>

      {loading && !radiologists ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : radiologists === null || radiologists.length === 0 ? (
        <p className="text-center py-16 text-gray-400 dark:text-gray-500">لا يوجد أخصائيو أشعة بعد — أضف أول أخصائي</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">
                  {["الاسم", "الموقع", "إجراءات"].map(h => (
                    <th key={h} className="text-right py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {radiologists.map(r => (
                  <tr key={r.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                    <td className="py-3 px-4">
                      <span className="font-medium">{r.name}</span>
                      {!r.isActive ? (
                        <span className="mr-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">معطل</span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${r.location === "ON_SITE" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"}`}>
                        {locationLabel(r.location)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(r)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(r)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="text-lg font-bold">{modal.id ? "تعديل أخصائي الأشعة" : "أخصائي أشعة جديد"}</h3>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الاسم *</label>
                <input className={MODAL_INPUT_CLS} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} placeholder="مثال: د. سارة أحمد" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">الموقع</label>
                <select className={MODAL_INPUT_CLS} value={modal.location} onChange={e => setModal({ ...modal, location: e.target.value })}>
                  {RADIOLOGIST_LOCATIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={modal.isActive} onChange={e => setModal({ ...modal, isActive: e.target.checked })} />
                <span className="text-sm text-gray-600 dark:text-gray-300">مفعل</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
