import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Loader2, X as XMarkIcon, Building2 } from "lucide-react";
import { api, bookingApi, fetchJson, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface InsuranceCompany {
  id: string;
  name: string;
  phone1?: string | null;
  contactName?: string | null;
  isActive?: boolean;
}

export default function InsuranceCompaniesTab() {
  const [items, setItems] = useState<InsuranceCompany[]>([]);
  const [priceCounts, setPriceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<InsuranceCompany | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [companies, summary] = await Promise.all([
        fetchJson<InsuranceCompany[]>(bookingApi("insurance-companies")),
        fetchJson<{ insuranceCompanyId: string; count: number }[]>(api("entity-prices/summary")).catch(() => []),
      ]);
      setItems(Array.isArray(companies) ? companies : []);
      const map: Record<string, number> = {};
      (summary || []).forEach((s) => { map[s.insuranceCompanyId] = s.count; });
      setPriceCounts(map);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "فشل تحميل الجهات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setModal({ id: "", name: "" }); setName(""); setPhone(""); };

  const save = async () => {
    if (saving) return;
    if (!name.trim()) { toast.error("اسم الجهة مطلوب"); return; }
    setSaving(true);
    try {
      if (modal?.id) {
        await fetchJson(bookingApi(`insurance-companies/${modal.id}`), { method: "PUT", body: JSON.stringify({ name: name.trim(), phone1: phone.trim() || undefined }) });
      } else {
        await fetchJson(bookingApi("insurance-companies"), { method: "POST", body: JSON.stringify({ name: name.trim(), phone1: phone.trim() || undefined }) });
      }
      toast.success(modal?.id ? "تم تحديث الجهة" : "تم إضافة الجهة");
      setModal(null);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: InsuranceCompany) => {
    try {
      await fetchJson(bookingApi(`insurance-companies/${c.id}`), { method: "PUT", body: JSON.stringify({ isActive: c.isActive === false }) });
      toast.success(c.isActive === false ? "تم التفعيل" : "تم التعطيل");
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل التحديث");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">شركات التأمين (من والي)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">إدارة جهات التأمين والتعاقدات معها</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm"><RefreshCw className="w-4 h-4" />تحديث</button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"><Plus className="w-4 h-4" />جهة جديدة</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">لا توجد جهات تأمين — أضف جهة جديدة</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 text-right font-medium">الجهة</th>
                <th className="py-3 px-4 text-right font-medium">هاتف</th>
                <th className="py-3 px-4 text-right font-medium">عدد الأسعار</th>
                <th className="py-3 px-4 text-right font-medium">الحالة</th>
                <th className="py-3 px-4 text-right font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-b dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4 font-medium"><span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{c.name}</span></td>
                  <td className="py-3 px-4" dir="ltr">{c.phone1 || "—"}</td>
                  <td className="py-3 px-4">{priceCounts[c.id] ?? 0} سعر</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${c.isActive === false ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                      {c.isActive === false ? "معطلة" : "نشطة"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setModal(c); setName(c.name); setPhone(c.phone1 || ""); }} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">تعديل</button>
                      <button onClick={() => toggle(c)} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg">{c.isActive === false ? "تفعيل" : "تعطيل"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => !saving && setModal(null)}>
          <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{modal.id ? "تعديل جهة تأمين" : "جهة تأمين جديدة"}</h3>
              <button onClick={() => !saving && setModal(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">اسم الجهة *</label>
                <input className={MODAL_INPUT_CLS} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: شركة الأهلية للتأمين" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">هاتف</label>
                <input className={MODAL_INPUT_CLS} value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} disabled={saving} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg disabled:opacity-50">إلغاء</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
