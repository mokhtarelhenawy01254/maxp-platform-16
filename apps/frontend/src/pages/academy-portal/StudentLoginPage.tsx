import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { GraduationCap, Phone, ArrowLeft, Loader2, Sparkles, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";

const StudentLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const navigate = useNavigate();

  // Prefill phone from URL query param if provided (e.g. from checkout or payment redirect)
  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam && phoneParam.trim()) {
      setPhone(phoneParam.trim());
    }
  }, [searchParams]);

  // Handle Resend Countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Send Verification Code
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      setError("يرجى إدخال رقم الهاتف المسجل");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfoMsg(null);

      const res = await fetch("/api/v1/academy/student/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || "تعذر إرسال كود التحقق");
      }

      setStep("code");
      setCountdown(60);
      setInfoMsg(
        data.testCode
          ? `تم إرسال كود التحقق بنجاح. (كود الحساب التجريبي: ${data.testCode})`
          : "تم إرسال كود التحقق المكون من 6 أرقام إلى هاتفك عبر واتساب."
      );
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال كود التحقق");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code and Login
  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("يرجى إدخال كود التحقق المكون من 6 أرقام");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/v1/academy/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || data.error || "كود التحقق غير صحيح أو انتهت صلاحيته");
      }

      // Save Student JWT token and profile
      localStorage.setItem("studentToken", data.token);
      localStorage.setItem("studentPhone", data.student.phone);
      localStorage.setItem("studentName", data.student.name);

      navigate("/portal/my-courses", { replace: true });
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء التحقق من الكود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm space-y-6 text-right" dir="rtl">
      {/* Icon & Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          {step === "phone" ? <GraduationCap className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {step === "phone" ? "تسجيل دخول الطالب" : "أدخل كود التحقق"}
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          {step === "phone"
            ? "أدخل رقم الموبايل المسجل لإرسال كود الدخول والوصول لكورساتك."
            : `أدخل الكود المكون من 6 أرقام المرسل إلى الرقم ${phone}`}
        </p>
      </div>

      {infoMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold leading-relaxed flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رقم الموبايل المسجل
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-800 font-mono dir-ltr text-right pl-10"
                disabled={loading}
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال كود التحقق...</span>
              </>
            ) : (
              <>
                <span>إرسال كود التحقق (واتساب)</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyLogin} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">كود التحقق (6 أرقام)</label>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                  setInfoMsg(null);
                }}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                تعديل الرقم
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center font-mono text-base tracking-[0.4em] text-slate-900"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length !== 6}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق من الكود...</span>
              </>
            ) : (
              <>
                <span>تأكيد الكود والدخول</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            {countdown > 0 ? (
              <span className="text-[11px] text-slate-400 font-medium">
                إعادة إرسال الكود خلال {countdown} ثانية
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة إرسال كود التحقق</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* Alternative actions */}
      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
        <Link
          to="/portal/catalog"
          className="inline-flex items-center justify-center gap-1.5 font-bold text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>لست مشتركاً بعد؟ تصفح كتالوج الكورسات وشاهد المعاينة مجاناً</span>
        </Link>
      </div>
    </div>
  );
};

export default StudentLoginPage;
