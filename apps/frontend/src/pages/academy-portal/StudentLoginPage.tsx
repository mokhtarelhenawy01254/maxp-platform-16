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

      let data: any = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }

      if (!data || !data.success) {
        throw new Error(data?.message || data?.error || "تعذر إرسال كود التحقق عبر واتساب حالياً. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.");
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
    <div className="max-w-md mx-auto my-12 p-6 sm:p-7 bg-card rounded-2xl border border-border/70 shadow-lg space-y-5 text-right" dir="rtl">
      {/* Icon & Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-xs">
          {step === "phone" ? <GraduationCap className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
        </div>
        <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
          {step === "phone" ? "تسجيل دخول الطالب" : "أدخل كود التحقق"}
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {step === "phone"
            ? "أدخل رقم الموبايل المسجل لإرسال كود الدخول والوصول لكورساتك."
            : `أدخل الكود المكون من 6 أرقام المرسل إلى الرقم ${phone}`}
        </p>
      </div>

      {infoMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold leading-relaxed flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{infoMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed">
          {error}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              رقم الموبايل المسجل <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs text-foreground placeholder:text-muted-foreground font-mono tabular-nums dir-ltr text-right transition-all"
              />
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5 block">
              سيتم إرسال كود التحقق في رسالة فورية للتأكيد والدخول.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال الكود...</span>
              </>
            ) : (
              <>
                <span>إرسال كود التحقق</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-3 border-t border-border/50 text-center">
            <Link
              to="/portal/catalog"
              className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              العودة لتصفح كتالوج الكورسات
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              كود التحقق (6 أرقام) <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-mono tracking-widest text-center text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق والدخول...</span>
              </>
            ) : (
              <>
                <span>تأكيد الكود والدخول للمنصة</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
                setInfoMsg(null);
              }}
              className="hover:text-foreground underline transition-colors"
            >
              تعديل رقم الهاتف
            </button>

            {countdown > 0 ? (
              <span className="font-mono tabular-nums text-[11px]">
                إعادة الإرسال بعد ({countdown} ثانية)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={loading}
                className="text-primary hover:underline font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة إرسال الكود</span>
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default StudentLoginPage;
