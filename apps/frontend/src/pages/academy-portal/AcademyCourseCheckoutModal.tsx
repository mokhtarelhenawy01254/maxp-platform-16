import React, { useState } from "react";
import { X, CheckCircle2, ShieldCheck, CreditCard, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CheckoutModalProps {
  courseId: string;
  courseTitle: string;
  price: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AcademyCourseCheckoutModal: React.FC<CheckoutModalProps> = ({
  courseId,
  courseTitle,
  price,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentPhone.trim()) {
      setError("يرجى إدخال رقم الهاتف لإتمام الاشتراك وتفعيل الحساب");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/v1/academy/courses/${courseId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim() || undefined,
          studentPhone: studentPhone.trim(),
          studentEmail: studentEmail.trim() || undefined,
          paymentMethod: "card",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || "فشل إتمام العملية");
      }

      // If already enrolled or test token returned immediately
      if (data.token) localStorage.setItem("studentToken", data.token);
      if (data.student?.phone) localStorage.setItem("studentPhone", data.student.phone);
      if (data.student?.name) localStorage.setItem("studentName", data.student.name);

      if (data.paymentPending && data.sessionUrl) {
        // Redirect to secure Kashier payment gateway
        window.location.href = data.sessionUrl;
        return;
      }

      setSuccessData(data);
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToCourse = () => {
    onClose();
    navigate(`/portal/course/${courseId}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-right" dir="rtl">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 block">اشتراك رقمي فوري</span>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {isSuccess ? "تم تفعيل الاشتراك بنجاح!" : "تأكيد الاشتراك في الكورس"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-extrabold text-slate-900">أهلاً بك معنا في الكورس!</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                تم تسجيل حسابك وتأكيد العملية بنجاح. جميع الدروس الـ25 والكوتش الذكي والتمارين أصبحت مفتوحة لك الآن.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-slate-500">اسم الكورس:</span>
                <span className="font-bold">{courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الهاتف المسجل:</span>
                <span className="font-mono font-bold">{studentPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حالة الوصول:</span>
                <span className="font-bold text-emerald-600">مفتوح ونشط فوراً</span>
              </div>
            </div>

            <button
              onClick={handleGoToCourse}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98"
            >
              <span>انتقل إلى محتوى الكورس والدرس الأول</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Course Summary Pill */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-indigo-700 font-semibold block">الكورس المختار</span>
                <span className="text-xs font-extrabold text-slate-900">{courseTitle}</span>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-slate-500 block">الإجمالي المطلوب</span>
                <span className="text-lg font-black text-indigo-700 tabular-nums">
                  {price} <span className="text-xs">ج.م</span>
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسمك الكريم <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  رقم الموبايل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-800 font-mono dir-ltr text-right"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  رقم الموبايل هو معرّفك الأساسي لتسجيل الدخول والوصول للكورس في أي وقت.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  البريد الإلكتروني <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-800 font-mono dir-ltr text-right"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">طريقة الدفع</label>
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 text-slate-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-slate-900">بطاقة بنكية / فيزا / ميزة / محافظ</span>
                      <span className="text-[11px] text-slate-500 block">بوابة كاشير الآمنة (Kashier Gateway)</span>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-indigo-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantees Note */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>دفع رقمي آمن 100% مشفّر · فتح تلقائي فوري بعد السداد مباشرة.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !studentPhone.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الانتقال لبوابة الدفع كاشير...</span>
                </>
              ) : (
                <>
                  <span>الانتقال للدفع الآمن ({price} ج.م)</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcademyCourseCheckoutModal;
