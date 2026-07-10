import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

const CATEGORIES = [
  { value: "audio", label: "صوتي (موسيقى/أغاني)" },
  { value: "image", label: "تصميم (صور)" },
  { value: "video", label: "فيديو (مونتاج)" },
  { value: "other", label: "أخرى" },
];

const companyId = () => localStorage.getItem("companyId");
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function ServiceManagementPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const r = await fetch(`/api/v1/services`, { headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) setServices(d.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!modal.name?.trim()) return toast.error("اسم الخدمة مطلوب");
    const isNew = !modal.id;
    try {
      const r = await fetch(isNew ? `/api/v1/services` : `/api/v1/services/${modal.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { ...authHeaders() as any, "Content-Type": "application/json" },
        body: JSON.stringify(modal),
      });
      const d = await r.json();
      if (d.success) { toast.success(isNew ? "تمت الإضافة" : "تم التحديث"); setModal(null); fetchServices(); }
      else toast.error(d.error);
    } catch (e) { toast.error("حدث خطأ"); }
  };

  const remove = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    try {
      const r = await fetch(`/api/v1/services/${id}`, { method: "DELETE", headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) { toast.success("تم الحذف"); fetchServices(); }
    } catch (e) { toast.error("حدث خطأ"); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto rtl" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">إدارة الخدمات</h1>
        <button onClick={() => setModal({ name: "", category: "audio", isActive: true })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="w-5 h-5" />إضافة خدمة
        </button>
      </div>

      {services.length === 0 ? (
        <p className="text-center text-gray-400 py-12">لا توجد خدمات. أضف خدمة جديدة.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{s.icon || "📋"} {s.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{s.description || "—"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.isActive ? "نشط" : "غير نشط"}</span>
              </div>
              <div className="flex gap-1 mb-2">
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{CATEGORIES.find(c => c.value === s.category)?.label || s.category}</span>
                {s.price && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.price} ج.م</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setModal(s)} className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><PencilIcon className="w-3.5 h-3.5 inline ml-1" />تعديل</button>
                <button onClick={() => remove(s.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><TrashIcon className="w-3.5 h-3.5 inline ml-1" />حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{modal.id ? "تعديل خدمة" : "إضافة خدمة"}</h2>
            <div className="space-y-3">
              <input className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="اسم الخدمة" value={modal.name || ""} onChange={e => setModal({ ...modal, name: e.target.value })} />
              <textarea className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="وصف الخدمة" value={modal.description || ""} onChange={e => setModal({ ...modal, description: e.target.value })} />
              <input className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="أيقونة (إيموجي)" value={modal.icon || ""} onChange={e => setModal({ ...modal, icon: e.target.value })} />
              <select className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" value={modal.category || "audio"} onChange={e => setModal({ ...modal, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="number" className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="السعر (اختياري)" value={modal.price || ""} onChange={e => setModal({ ...modal, price: e.target.value })} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={modal.isActive !== false} onChange={e => setModal({ ...modal, isActive: e.target.checked })} /> نشط</label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
