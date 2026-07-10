import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, TrashIcon, MusicalNoteIcon, PhotoIcon, VideoCameraIcon, DocumentTextIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { uploadService } from "../../services/uploadService";

const CATEGORIES = [
  { value: "audio", label: "صوتي (موسيقى/أغاني)", icon: MusicalNoteIcon, accept: "audio/*" },
  { value: "image", label: "تصميم (صور)", icon: PhotoIcon, accept: "image/*" },
  { value: "video", label: "فيديو (مونتاج)", icon: VideoCameraIcon, accept: "video/*" },
  { value: "other", label: "أخرى", icon: DocumentTextIcon, accept: "*/*" },
];

const companyId = () => localStorage.getItem("companyId");
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function ServiceManagementPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [uploadingSamples, setUploadingSamples] = useState(false);

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    try {
      const r = await fetch(`/api/v1/services`, { headers: authHeaders() as any });
      const d = await r.json();
      if (d.success) setServices(d.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const uploadNewSamples = async (): Promise<any[]> => {
    if (sampleFiles.length === 0) return modal.samples || [];
    setUploadingSamples(true);
    const uploaded: any[] = [...(modal.samples || [])];
    for (const file of sampleFiles) {
      const r = await uploadService.uploadServiceFile(file);
      if (r.success && r.data) uploaded.push({ url: r.data.url, originalName: r.data.originalName, type: r.data.type });
      else toast.error(`فشل رفع: ${file.name}`);
    }
    setUploadingSamples(false);
    return uploaded;
  };

  const save = async () => {
    if (!modal.name?.trim()) return toast.error("اسم الخدمة مطلوب");
    const isNew = !modal.id;
    const samples = await uploadNewSamples();
    try {
      const r = await fetch(isNew ? `/api/v1/services` : `/api/v1/services/${modal.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { ...authHeaders() as any, "Content-Type": "application/json" },
        body: JSON.stringify({ ...modal, samples }),
      });
      const d = await r.json();
      if (d.success) { toast.success(isNew ? "تمت الإضافة" : "تم التحديث"); setModal(null); setSampleFiles([]); fetchServices(); }
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
              <div className="flex gap-1 flex-wrap mb-2">
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{CATEGORIES.find(c => c.value === s.category)?.label || s.category}</span>
                {s.price && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.price} ج.م</span>}
                {s.samples?.length > 0 && <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{s.samples.length} عينة</span>}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setModal(null); setSampleFiles([]); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

              {/* Samples section */}
              <div className="border-t pt-3 mt-4">
                <label className="block text-sm font-medium mb-2">عينات الخدمة ({CATEGORIES.find(c => c.value === modal.category)?.label || modal.category})</label>
                {(modal.samples?.length > 0) && (
                  <div className="space-y-2 mb-3">
                    {modal.samples.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          {s.type?.startsWith("image/") ? <PhotoIcon className="w-4 h-4 shrink-0 text-purple-500" /> :
                           s.type?.startsWith("video/") ? <VideoCameraIcon className="w-4 h-4 shrink-0 text-purple-500" /> :
                           s.type?.startsWith("audio/") ? <MusicalNoteIcon className="w-4 h-4 shrink-0 text-purple-500" /> :
                           <DocumentTextIcon className="w-4 h-4 shrink-0 text-gray-500" />}
                          <span className="text-sm truncate">{s.originalName}</span>
                        </div>
                        <button onClick={() => setModal({ ...modal, samples: modal.samples.filter((_: any, j: number) => j !== i) })}
                          className="text-red-500 hover:text-red-700 p-1"><XMarkIcon className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" multiple accept={CATEGORIES.find(c => c.value === modal.category)?.accept || "*/*"}
                  onChange={e => setSampleFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                {sampleFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {sampleFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setSampleFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-500 hover:text-red-700"><XMarkIcon className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={uploadingSamples} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{uploadingSamples ? "جاري رفع العينات..." : "حفظ"}</button>
              <button onClick={() => { setModal(null); setSampleFiles([]); }} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
