import React, { useState } from "react";
import { X, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { submitPublicLead } from "../../../services/publicLeadService";
import { UtmData } from "./types";

interface ClothingTasteActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  utm: UtmData;
  onContinueToRegister: (prefilled: { brandName: string; phone: string }) => void;
}

export const ClothingTasteActivationModal: React.FC<ClothingTasteActivationModalProps> = ({
  isOpen,
  onClose,
  utm,
  onContinueToRegister,
}) => {
  const [brandName, setBrandName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg("يرجى إدخال رقم الموبايل أو الواتساب للتفعيل.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Save lead immediately so no merchant data is ever lost
      await submitPublicLead({
        firstName: ownerName.trim() || "تاجر أزياء",
        phone: phone.trim(),
        companyName: brandName.trim() || undefined,
        service: "تفعيل متجر الملابس المجاني السريع (0 ج.م)",
        source: "clothing-taste-modal",
        pageSlug: "clothing-taste",
        landingPath: window.location.pathname,
        utm: utm as Record<string, string>,
      });
    } catch {
      // Even if public lead fails, continue to registration
    } finally {
      setIsSubmitting(false);
      onContinueToRegister({ brandName: brandName.trim(), phone: phone.trim() });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-2xl p-6 sm:p-8 text-right overflow-hidden">
        
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-zinc-400 hover:text-[#141416] hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="إغلاق نافذة التفعيل"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>تفعيل فوري مجاني • <span className="cst-tabular">0</span> ج.م بدون بطاقة دفع</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#141416] tracking-tight mb-1.5">
            ابدأ متجرك الإلكتروني الآن في 60 ثانية
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            أدخل بيانات متجرك الأساسية للبدء في رفع تشكيلة ملابسك وتجربة كاشير الفروع وربط بوسطة فورياً.
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
              اسم البراند أو المحل
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="مثال: Cairo Wear أو اسم المحل"
              className="w-full bg-[#FAF8F5] border border-black/10 focus:border-[#141416] focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-800 block mb-1.5 font-semibold">
              اسمك الشخصي أو اسم المدير
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="مثال: أحمد مصطفى"
              className="w-full bg-[#FAF8F5] border border-black/10 focus:border-[#141416] focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none transition-colors"
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
              className="w-full bg-[#FAF8F5] border border-black/10 focus:border-[#141416] focus:bg-white rounded-lg px-3.5 py-2.5 text-xs text-[#141416] placeholder-zinc-400 outline-none font-mono transition-colors text-right"
            />
          </div>

          {/* Value Props & Assurance Checklist */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-black/[0.06] text-[11px] text-zinc-600 space-y-2">
            <div className="flex items-center gap-2 text-zinc-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>متجر ويب سريع متوافق مع الموبايل وإنستجرام</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>بدون فيزا دولارية وبدون أي اشتراك إجباري</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cst-btn-primary text-xs sm:text-sm py-3 px-6 font-bold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? "جاري التفعيل..." : "تفعيل متجري الآن مجاناً (0 ج.م)"}</span>
              <ArrowLeft className="w-4 h-4 mr-1" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
