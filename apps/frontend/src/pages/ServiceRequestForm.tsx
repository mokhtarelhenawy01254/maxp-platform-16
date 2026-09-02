import { useState, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../utils/i18n-toast";
import { uploadService } from "../services/uploadService";

export default function ServiceRequestForm() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ companyId: "", serviceId: "", customerName: "", phone: "", description: "" });

  const decodeCompanyId = (): string => {
    const token = localStorage.getItem("token");
    if (token) {
      try { const p = JSON.parse(atob(token.split(".")[1])); return p.companyId || ""; } catch { }
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("companyId") || localStorage.getItem("companyId") || "";
  };

  useEffect(() => {
    setForm(f => ({ ...f, companyId: decodeCompanyId() }));
    fetchServices();
  }, []);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchServices = async () => {
    const cid = decodeCompanyId();
    try {
      const r = await fetch(`/api/v1/services${cid ? `?companyId=${cid}` : ""}`, {
        headers: authHeaders() as any
      });
      const d = await r.json();
      if (d.success) setServices(d.data);
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
      return tToast.error("ServiceRequestForm.msg_a413");
    }
    setSubmitting(true);
    const referenceFiles = await uploadFiles();
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/v1/service-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...form, referenceFiles }),
      });
      const d = await r.json();
      if (d.success) {
        setCreatedOrder(d.data);
        setDone(true);
        tToast.success("ServiceRequestForm.success_send_7517");
      }
      else toast.error(d.error);
    } catch (e) { tToast.error("ServiceRequestForm.error_error_7eca"); }
    finally { setSubmitting(false); }
  };

  if (done) {
    const contactPhone = createdOrder?.companyContactPhone;
    const cleanPhone = contactPhone ? contactPhone.replace(/\D/g, "") : null;
    const formattedContact = cleanPhone?.startsWith("01") ? "2" + cleanPhone : cleanPhone;
    const serviceObj = services.find(s => s.id === form.serviceId);
    const serviceName = serviceObj?.name || "الخدمة";
    const shortId = createdOrder?.id ? `#${createdOrder.id.slice(-6).toUpperCase()}` : "";
    const waText = `مرحباً، قمت بتقديم طلب خدمة (${serviceName}) ${shortId}، أود المتابعة معكم بخصوص التفاصيل.`;
    const waLink = formattedContact ? `https://wa.me/${formattedContact}?text=${encodeURIComponent(waText)}` : null;

    return (
      <div className="flex items-center justify-center p-3 sm:p-12 min-h-[60vh]" dir="rtl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-2">تم استلام الطلب بنجاح!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            سيتم مراجعة طلبك والمرفقات والتواصل معك لمتابعة التنفيذ في أقرب وقت.
          </p>
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm min-h-[44px]"
            >
              <span>متابعة الطلب عبر واتساب</span>
            </a>
          ) : (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-center gap-1.5">
              <span>💬</span>
              <span>سيصلك إشعار تأكيد وتحديثات حالة الطلب مباشرة على رقم هاتفك عبر واتساب</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6" dir="rtl">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">طلب خدمة جديد</h1>

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
