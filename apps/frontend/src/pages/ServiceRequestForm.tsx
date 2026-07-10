import { useState, useEffect } from "react";
import { toast } from "sonner";
import { uploadService } from "../services/uploadService";

export default function ServiceRequestForm() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ companyId: "", serviceId: "", customerName: "", phone: "", description: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setForm(f => ({ ...f, companyId: localStorage.getItem("companyId") || "" }));
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/v1/services`, {
        headers: { Authorization: `Bearer ${token}` } as any
      });
      const d = await r.json();
      if (d.success) setServices(d.data.filter((s: any) => s.isActive));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const uploadFiles = async (): Promise<any[]> => {
    if (files.length === 0) return [];
    setUploading(true);
    const uploaded: any[] = [];
    for (const file of files) {
      const r = await uploadService.uploadServiceFile(file);
      if (r.success && r.data) uploaded.push({ url: r.data.url, originalName: r.data.originalName, type: r.data.type });
      else toast.error(`فشل رفع: ${file.name}`);
    }
    setUploading(false);
    return uploaded;
  };

  const submit = async () => {
    if (!form.customerName?.trim() || !form.phone?.trim() || !form.serviceId) {
      return toast.error("يرجى إكمال جميع الحقول المطلوبة");
    }
    setSubmitting(true);
    const referenceFiles = await uploadFiles();
    try {
      const r = await fetch("/api/v1/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, referenceFiles }),
      });
      const d = await r.json();
      if (d.success) { setDone(true); toast.success("تم إرسال الطلب"); }
      else toast.error(d.error);
    } catch (e) { toast.error("حدث خطأ في الإرسال"); }
    finally { setSubmitting(false); }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">تم استلام طلبك!</h1>
        <p className="text-gray-500 dark:text-gray-400">سنقوم بالتواصل معك قريباً</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mt-8">
        <h1 className="text-2xl font-bold mb-6 text-center">طلب خدمة</h1>

        {loading ? <p className="text-center text-gray-500">جاري التحميل...</p> : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">الخدمة المطلوبة *</label>
              <select className="w-full border rounded-lg px-3 py-2.5 dark:bg-gray-700 dark:border-gray-600" value={form.serviceId} onChange={e => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">-- اختر خدمة --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.icon || "📋"} {s.name}{s.price ? ` (${s.price} ج.م)` : ""}</option>
                ))}
              </select>
              {services.length === 0 && <p className="text-xs text-gray-400 mt-1">لا توجد خدمات متاحة حالياً</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">الاسم *</label>
              <input className="w-full border rounded-lg px-3 py-2.5 dark:bg-gray-700 dark:border-gray-600" placeholder="الاسم كاملاً" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف *</label>
              <input className="w-full border rounded-lg px-3 py-2.5 dark:bg-gray-700 dark:border-gray-600" placeholder="مثال: 01234567890" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">وصف الطلب</label>
              <textarea className="w-full border rounded-lg px-3 py-2.5 dark:bg-gray-700 dark:border-gray-600" rows={4} placeholder="اكتب تفاصيل الخدمة المطلوبة..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">رفع ملفات (صوت/صورة/فيديو)</label>
              <input type="file" multiple accept="audio/*,image/*,video/*" onChange={e => setFiles(Array.from(e.target.files || []))}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.length} ملفات</p>}
            </div>

            <button onClick={submit} disabled={submitting || uploading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "جاري رفع الملفات..." : submitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
