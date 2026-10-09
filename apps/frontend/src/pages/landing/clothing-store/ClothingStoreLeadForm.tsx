import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Phone, ArrowLeft, MessageSquare } from "lucide-react";
import { submitPublicLead } from "../../../services/publicLeadService";
import { UtmData } from "./types";

interface ClothingStoreLeadFormProps {
  utm: UtmData;
  onFreeRegister: () => void;
}

const OFFICIAL_WHATSAPP_NUMBER = "201123087745";

export const ClothingStoreLeadForm: React.FC<ClothingStoreLeadFormProps> = ({
  utm,
  onFreeRegister,
}) => {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeType, setStoreType] = useState("online-only");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      setErrorMsg("يرجى كتابة اسمك أو اسم المسؤول.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("يرجى إدخال رقم الموبايل أو الواتساب.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitPublicLead({
        firstName: ownerName.trim(),
        phone: phone.trim(),
        companyName: storeName.trim() || undefined,
        service: "باقة متجر الملابس 2026",
        notes: `طبيعة النشاط: ${storeType}`,
        source: "clothing-store-bundle",
        pageSlug: "clothing-store-bundle",
        landingPath: window.location.pathname,
        referrer: document.referrer || undefined,
        utm: utm as Record<string, string>,
      });

      setIsSuccess(true);
    } catch {
      // صراحة مع التاجر: لم يكتمل الحفظ — نعرض مسار واتساب المباشر بنفس البيانات
      setSaveFailed(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsAppContinuation = () => {
    const text =
      `أهلاً، سجلت بيانات متجر الملابس على MaxP:\n` +
      `البراند: ${storeName || "غير محدد"}\n` +
      `المسؤول: ${ownerName}\n` +
      `الموبايل: ${phone}\n` +
      `النشاط: ${storeType}`;
    window.open(
      `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <section id="lead-form" className="py-20 border-b border-white/5 bg-[#050608]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="csn-panel p-6 sm:p-10 relative overflow-hidden bg-gradient-to-b from-[#090a0f] to-[#06070a]">
          
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="csn-badge mb-3">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>استشارة مجانية مع خبير تجارة الأزياء</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight csn-text-balance mb-2">
              تحدث مع فريق MaxP لمساعدتك في تهيئة متجرك
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed csn-text-pretty">
              سجل بياناتك وسيتم التواصل معك مباشرة لشرح كيفية ربط فروعك ومخازنك مع بوسطة خلال دقائق.
            </p>
          </div>

          {isSuccess ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 text-center max-w-md mx-auto">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">
                تم تسجيل طلبك بنجاح في المنصة!
              </h3>
              <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                يقوم فريقنا بمراجعة تفاصيل البراند الخاص بك والتواصل معك عبر الواتساب أو الهاتف لمساعدتك في خطة الإطلاق.
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onFreeRegister}
                  className="csn-btn-primary text-xs py-2.5 px-4 w-full"
                >
                  <span>الانتقال فوراً لفتح المتجر (0 ج.م)</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={openWhatsAppContinuation}
                  className="csn-btn-secondary text-xs py-2.5 px-4 w-full"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>متابعة المحادثة عبر الواتساب</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveFailed && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <div className="text-xs text-amber-300 flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      تعذر حفظ طلبك في المنصة حالياً — ما تبعتش حاجة. كمّل مباشرة على واتساب
                      وبياناتك اللي كتبتها هتنقل معاك، أو جرّب تاني.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openWhatsAppContinuation}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>متابعة عبر واتساب بنفس البيانات</span>
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  اسم البراند أو المحل
                </label>
                <input
                  type="text"
                  name="companyName"
                  autoComplete="organization"
                  placeholder="مثال: كايرو كوليكشن"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="csn-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  اسمك أو اسم المسؤول <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  placeholder="الاسم الأول"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="csn-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  رقم الموبايل / واتساب <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="010XXXXXXXX أو 011XXXXXXXX"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="csn-input csn-tabular"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  طبيعة النشاط
                </label>
                <select
                  name="storeType"
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  className="csn-input"
                >
                  <option value="online-only" className="bg-[#090a0f] text-white">
                    متجر إلكتروني فقط (أونلاين)
                  </option>
                  <option value="physical-store" className="bg-[#090a0f] text-white">
                    محل فعلي + بيع أونلاين
                  </option>
                  <option value="factory-brand" className="bg-[#090a0f] text-white">
                    مصنع ملابس / براند خاص متكامل
                  </option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="csn-btn-primary w-full text-sm py-3 font-bold"
                >
                  {isSubmitting ? (
                    <span>جاري تسجيل الطلب…</span>
                  ) : (
                    <>
                      <span>تأكيد طلب الاستشارة المجانية</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                بياناتك مسجلة بأمان في نظام CRM المنصة بدون أي مشاركة مع أطراف خارجية.
              </p>
            </form>
          )}

        </div>
      </div>
    </section>
  );
};
