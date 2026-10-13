import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Phone, ArrowLeft, MessageSquare } from "lucide-react";
import { submitPublicLead } from "../../../services/publicLeadService";
import { UtmData } from "./types";
import { OFFICIAL_WHATSAPP_NUMBER } from "./clothingTasteData";

interface ClothingTasteLeadFormProps {
  utm: UtmData;
  onFreeRegister: () => void;
}

export const ClothingTasteLeadForm: React.FC<ClothingTasteLeadFormProps> = ({
  utm,
  onFreeRegister,
}) => {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeType, setStoreType] = useState("both"); // online-only, physical-only, both
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      setErrorMsg("يرجى إدخال اسمك أو اسم المسؤول عن البراند.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("يرجى إدخال رقم الهاتف أو الواتساب للتواصل.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await submitPublicLead({
        firstName: ownerName.trim(),
        phone: phone.trim(),
        companyName: storeName.trim() || undefined,
        service: "باقة متجر الملابس الفاخرة (Apparel OS)",
        notes: `نوع النشاط: ${storeType === "both" ? "محل فعلي ومتجر أونلاين" : storeType === "online" ? "أونلاين فقط" : "محل فعلي فقط"}`,
        source: "clothing-taste",
        pageSlug: "clothing-taste",
        landingPath: window.location.pathname,
        referrer: document.referrer || undefined,
        utm: utm as Record<string, string>,
      });

      setIsSuccess(true);
    } catch {
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
    <section id="consultation" className="py-20 border-b border-black/[0.06] bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="cst-panel rounded-2xl p-6 sm:p-10 bg-[#FAF8F5] border border-black/[0.08] shadow-md">
          
          <div className="text-right mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
              <Phone className="w-3.5 h-3.5 text-blue-700" />
              <span>استشارة مجانية مع خبير المنظومة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#141416] tracking-tight mb-2">
              دعنا نساعدك في تهيئة متجرك وربط بوسطة وفروعك
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              اترك بياناتك وسيتواصل معك مستشار تجارة الأزياء لمساعدتك في إعداد مصفوفة المقاسات ورفع منتجاتك — دون أي رسوم.
            </p>
          </div>

          {isSuccess ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">
                تم استلام طلبك بنجاح!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
                سيتواصل معك أحد خبراء MaxP عبر واتساب خلال دقائق للمساعدة في تفعيل متجرك وربط البوالص.
              </p>
              <button
                type="button"
                onClick={onFreeRegister}
                className="cst-btn-primary text-xs py-2.5 px-6 font-bold mt-2 cursor-pointer"
              >
                <span>أو ابدأ متجرك الآن بنفسك (0 ج.م)</span>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveFailed && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div>تعذر الحفظ عبر الخادم، يمكنك التواصل الفوري مع الفريق عبر واتساب بنقرة واحدة:</div>
                  <button
                    type="button"
                    onClick={openWhatsAppContinuation}
                    className="py-1.5 px-3 rounded bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>إرسال البيانات عبر واتساب مباشرة</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
                    اسم المسؤول أو صاحب البراند <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="مثال: كريم الشناوي"
                    className="w-full bg-white border border-black/10 focus:border-[#141416] rounded-lg px-3 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
                    رقم الموبايل / واتساب <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full bg-white border border-black/10 focus:border-[#141416] rounded-lg px-3 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none font-mono transition-colors text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
                    اسم البراند أو المحل (اختياري)
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: Atelier Cairo"
                    className="w-full bg-white border border-black/10 focus:border-[#141416] rounded-lg px-3 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
                    طبيعة نشاطك الحالي
                  </label>
                  <select
                    value={storeType}
                    onChange={(e) => setStoreType(e.target.value)}
                    className="w-full bg-white border border-black/10 focus:border-[#141416] rounded-lg px-3 py-2.5 text-xs text-[#141416] outline-none transition-colors cursor-pointer"
                  >
                    <option value="both">عندي محل فعلي وأبيع أونلاين أيضاً</option>
                    <option value="online">أبيع أونلاين فقط (إنستجرام/متجر)</option>
                    <option value="physical">عندي محل فعلي وأريد البدء أونلاين</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto cst-btn-primary text-xs sm:text-sm py-3 px-8 font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 ml-1" />
                  <span>{isSubmitting ? "جاري الإرسال..." : "طلب استشارة مجانية وتفعيل المتجر"}</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </section>
  );
};
