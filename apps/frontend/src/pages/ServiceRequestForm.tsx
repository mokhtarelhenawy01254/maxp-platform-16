import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../utils/i18n-toast";
import { MediaUploadZone, ServiceMediaFile } from "../components/services/MediaUploadZone";
import { MessageCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function ServiceRequestForm() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<ServiceMediaFile[]>([]);
  const [form, setForm] = useState({
    companyId: "",
    serviceId: "",
    customerName: "",
    phone: "",
    description: ""
  });

  const decodeCompanyId = (): string => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const p = JSON.parse(atob(token.split(".")[1]));
        return p.companyId || "";
      } catch {}
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("companyId") || localStorage.getItem("companyId") || "";
  };

  useEffect(() => {
    setForm((f) => ({ ...f, companyId: decodeCompanyId() }));
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
      if (d.success && Array.isArray(d.data)) {
        setServices(d.data.filter((s: any) => s.isActive));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName?.trim() || !form.phone?.trim() || !form.serviceId) {
      return tToast.error("ServiceRequestForm.msg_a413");
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const r = await fetch("/api/v1/service-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...form,
          referenceFiles: mediaFiles
        })
      });
      const d = await r.json();
      if (d.success) {
        setCreatedOrder(d.data);
        setDone(true);
        tToast.success("ServiceRequestForm.success_send_7517");
      } else {
        toast.error(d.error);
      }
    } catch (e) {
      tToast.error("ServiceRequestForm.error_error_7eca");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const contactPhone = createdOrder?.companyContactPhone;
    const cleanPhone = contactPhone ? contactPhone.replace(/\D/g, "") : null;
    const formattedContact = cleanPhone?.startsWith("01") ? "2" + cleanPhone : cleanPhone;
    const serviceObj = services.find((s) => s.id === form.serviceId);
    const serviceName = serviceObj?.name || "الخدمة";
    const shortId = createdOrder?.id ? `#${createdOrder.id.slice(-6).toUpperCase()}` : "";
    const waText = `مرحباً، قمت بتقديم طلب خدمة (${serviceName}) ${shortId}، أود المتابعة معكم بخصوص التفاصيل.`;
    const waLink = formattedContact
      ? `https://wa.me/${formattedContact}?text=${encodeURIComponent(waText)}`
      : null;

    return (
      <div className="flex items-center justify-center p-3 sm:p-12 min-h-[60vh] rtl" dir="rtl">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto font-bold shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تم استلام الطلب بنجاح!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm leading-relaxed">
            سيتم مراجعة طلبك والمرفقات الصوتية والمرئية والتواصل معك للبدء في التنفيذ في أقرب وقت.
          </p>
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm min-h-[46px]"
            >
              <MessageCircle className="w-5 h-5" />
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
    <div className="p-3 sm:p-8 min-h-[85vh] flex items-center justify-center rtl" dir="rtl">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-5 sm:p-8 border border-gray-100 dark:border-gray-700 space-y-5">
        <div className="text-center space-y-1 pb-3 border-b border-gray-100 dark:border-gray-700/60">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            طلب خدمة جديد
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            يرجى ملء تفاصيل الخدمة المطلوبة وإرفاق أي ملفات، موسيقى، أو فيديوهات توضيحية.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-xs">جاري تحميل الخدمات المتاحة...</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                الخدمة المطلوبة <span className="text-rose-500">*</span>
              </label>
              <select
                required
                className="w-full border rounded-xl px-3 py-2.5 text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                value={form.serviceId}
                onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              >
                <option value="">-- اختر الخدمة --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon || "📋"} {s.name}
                    {s.price ? ` (${s.price} ج.م)` : ""}
                  </option>
                ))}
              </select>
              {services.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">لا توجد خدمات متاحة حالياً</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  الاسم بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  className="w-full border rounded-xl px-3 py-2.5 text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                  placeholder="مثال: محمد علي"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  رقم الهاتف (واتساب) <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  className="w-full border rounded-xl px-3 py-2.5 text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                  placeholder="مثال: 01012345678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                وصف ومتطلبات الخدمة
              </label>
              <textarea
                className="w-full border rounded-xl px-3 py-2.5 text-xs sm:text-sm dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200 outline-hidden focus:ring-2 focus:ring-primary-500"
                rows={3}
                placeholder="اكتب بالتفصيل ما تريده في الخدمة، الملاحظات، أو الأفكار المقترحة..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Media & Files with Music/Video Player */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <MediaUploadZone
                files={mediaFiles}
                onChange={setMediaFiles}
                label="المرفقات والوسائط (موسيقى، فيديو، صور، ملفات)"
                helperText="يمكنك رفع مراجع صوتية، مقاطع فيديو، أو ملفات تصميم مع معاينتها مباشرة قبل إرسال الطلب."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الطلب والمرفقات...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>إرسال طلب الخدمة الآن</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
