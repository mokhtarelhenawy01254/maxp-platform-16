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

      // 🔒 Security: If already enrolled, redirect to login with phone prefilled
      if (data.alreadyEnrolled) {
        onClose();
        const phoneParam = encodeURIComponent(studentPhone.trim());
        navigate(`/portal/login?phone=${phoneParam}`);
        return;
      }

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border/70 overflow-hidden text-right" dir="rtl">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-border/60 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-primary block">اشتراك رقمي فوري</span>
            <h3 className="text-base font-extrabold text-foreground leading-tight">
              {isSuccess ? "تم تفعيل الاشتراك بنجاح!" : "تأكيد الاشتراك في الكورس"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-6 sm:p-7 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-extrabold text-foreground">أهلاً بك معنا في الكورس!</h4>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                تم تسجيل حسابك وتأكيد العملية بنجاح. جميع دروس {courseTitle} والكوتش الذكي والتمارين أصبحت مفتوحة لك الآن.
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 border border-border/60 text-xs text-foreground space-y-2 text-right">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">اسم الكورس:</span>
                <span className="font-semibold">{courseTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">رقم الهاتف المسجل:</span>
                <span className="font-mono tabular-nums font-semibold">{studentPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">حالة الوصول:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">مفتوح ونشط فوراً</span>
              </div>
            </div>

            <button
              onClick={handleGoToCourse}
              className="w-full py-3 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>انتقل إلى محتوى الكورس والدرس الأول</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Course Summary Pill */}
            <div className="bg-muted/30 border border-border/70 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium block">الكورس المختار</span>
                <span className="text-xs font-bold text-foreground">{courseTitle}</span>
              </div>
              <div className="text-left">
                <span className="text-[11px] text-muted-foreground block">الإجمالي المطلوب</span>
                <span className="text-base font-extrabold text-foreground font-mono tabular-nums">
                  {price} <span className="text-xs font-medium text-muted-foreground">ج.م</span>
                </span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  اسمك الكريم <span className="text-muted-foreground font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground placeholder:text-muted-foreground transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  رقم الموبايل <span className="text-destructive">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground placeholder:text-muted-foreground font-mono tabular-nums dir-ltr text-right transition-all"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  رقم الموبايل هو معرّفك الأساسي لتسجيل الدخول والوصول للكورس في أي وقت.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  البريد الإلكتروني <span className="text-muted-foreground font-normal">(اختياري)</span>
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground placeholder:text-muted-foreground font-mono dir-ltr text-right transition-all"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">طريقة الدفع</label>
                <div className="p-3.5 rounded-xl border border-border/70 bg-card text-foreground flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block text-foreground">بطاقة بنكية / فيزا / ميزة / محافظ</span>
                      <span className="text-[11px] text-muted-foreground block">بوابة كاشير الآمنة (Kashier Gateway)</span>
                    </div>
                  </div>
                  <div className="w-4 h-4 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantees Note */}
            <div className="pt-2 flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>دفع رقمي آمن 100% مشفّر · تفعيل فوري بعد السداد مباشرة.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !studentPhone.trim()}
              className="w-full py-3 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
