import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { GraduationCap, ArrowLeft, Loader2, KeyRound, RefreshCw, CheckCircle2 } from "lucide-react";
import { getApiUrl } from "../../config/environment";
import { resolveBrandingLogoUrl, useCompanyBranding } from "../../hooks/useCompanyBranding";
import { portalSessionManager, type PortalCompanyOption } from "../../utils/portalSessionManager";
import PortalCompanyPicker from "../../components/auth/PortalCompanyPicker";

const StudentLoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const branding = useCompanyBranding();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [companyOptions, setCompanyOptions] = useState<PortalCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();

  const accentColor = branding.accent?.trim() || "";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  useEffect(() => {
    void portalSessionManager.syncPortalSessionWithHost("student", getApiUrl());
  }, []);

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam && phoneParam.trim()) {
      setPhone(phoneParam.trim());
    }
  }, [searchParams]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

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

      const res = await fetch(`${getApiUrl()}/academy/student/send-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...portalSessionManager.getPortalSubdomainHeaders(),
        },
        body: JSON.stringify({
          phone: phone.trim(),
          ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
        }),
      });

      let data: Record<string, unknown> | null = null;
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        data = null;
      }

      if (!data || !data["success"]) {
        const msg = data?.["message"] || data?.["error"];
        throw new Error(
          typeof msg === "string" && msg
            ? msg
            : "تعذر إرسال كود التحقق عبر واتساب حالياً. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.",
        );
      }

      setStep("code");
      setCountdown(60);
      const testCode = data["testCode"];
      setInfoMsg(
        typeof testCode === "string" && testCode
          ? `تم إرسال كود التحقق بنجاح. (كود الحساب التجريبي: ${testCode})`
          : "تم إرسال كود التحقق المكون من 6 أرقام إلى هاتفك عبر واتساب.",
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "حدث خطأ أثناء إرسال كود التحقق",
      );
    } finally {
      setLoading(false);
    }
  };

  const submitVerifyLogin = async (companyIdOverride?: string) => {
    if (!code.trim()) {
      setError("يرجى إدخال كود التحقق المكون من 6 أرقام");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${getApiUrl()}/academy/student/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...portalSessionManager.getPortalSubdomainHeaders(),
        },
        body: JSON.stringify({
          phone: phone.trim(),
          code: code.trim(),
          ...(companyIdOverride ? { companyId: companyIdOverride } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (
        (data["requiresCompanySelection"] || data["requireCompanySelection"]) &&
        Array.isArray(data["companies"])
      ) {
        const options = portalSessionManager.normalizePortalCompanyOptions(data["companies"]);
        if (options.length > 0) {
          setCompanyOptions(options);
          setSelectedCompanyId(null);
          return;
        }
      }

      if (!res.ok || !data["success"]) {
        const msg = data["message"] || data["error"];
        throw new Error(
          typeof msg === "string" && msg ? msg : "كود التحقق غير صحيح أو انتهت صلاحيته",
        );
      }

      const token = typeof data["token"] === "string" ? data["token"] : "";
      if (!token) {
        throw new Error("تعذر استلام رمز الجلسة");
      }

      const memberObj = (
        data["student"] && typeof data["student"] === "object"
          ? data["student"]
          : { phone: phone.trim(), name: "عضو MaxP" }
      ) as Record<string, unknown>;
      const companyObj =
        data["company"] && typeof data["company"] === "object"
          ? (data["company"] as Record<string, unknown>)
          : null;

      portalSessionManager.savePortalSession({
        role: "student",
        companyId:
          (typeof companyObj?.["id"] === "string" ? companyObj["id"] : null) ||
          companyIdOverride ||
          null,
        companySlug: typeof companyObj?.["slug"] === "string" ? companyObj["slug"] : null,
        companyName: typeof companyObj?.["name"] === "string" ? companyObj["name"] : null,
        token,
        profile: memberObj,
      });

      navigate("/portal/my-courses", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message ? err.message : "حدث خطأ أثناء التحقق من الكود",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitVerifyLogin();
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    void submitVerifyLogin(companyId);
  };

  const handleBackToCode = () => {
    setCompanyOptions([]);
    setSelectedCompanyId(null);
    setError(null);
  };

  return (
    <div
      className="max-w-md mx-auto my-8 sm:my-12 p-5 sm:p-7 bg-card rounded-2xl border border-border/70 shadow-lg space-y-5 text-right"
      dir="rtl"
      style={
        accentColor
          ? ({ "--portal-primary": accentColor, "--auth-accent": accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className="text-center space-y-2">
        {resolvedLogo ? (
          <img
            src={resolvedLogo}
            alt={branding.name || "الأكاديمية"}
            onError={() => setLogoError(true)}
            className="w-12 h-12 rounded-xl object-contain bg-background border border-border/70 p-1 mx-auto shadow-xs"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-xs"
            style={
              accentColor
                ? { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}33`, color: accentColor }
                : undefined
            }
          >
            {step === "phone" ? <GraduationCap className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
        )}
        {branding.name ? (
          <p className="text-xs font-semibold text-muted-foreground truncate">{branding.name}</p>
        ) : null}
        <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
          {step === "phone" ? "تسجيل الدخول" : "أدخل كود التحقق"}
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {step === "phone"
            ? "أدخل رقم الموبايل المسجل لإرسال كود الدخول والوصول لكورساتك."
            : `أدخل الكود المكون من 6 أرقام المرسل إلى الرقم ${phone}`}
        </p>
      </div>

      {infoMsg ? (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold leading-relaxed flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="min-w-0 flex-1">{infoMsg}</span>
        </div>
      ) : null}

      {error ? (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed">
          {error}
        </div>
      ) : null}

      {companyOptions.length > 0 ? (
        <PortalCompanyPicker
          variant="card"
          companies={companyOptions}
          selectedCompanyId={selectedCompanyId}
          loading={loading}
          onSelect={handleSelectCompany}
          onBack={handleBackToCode}
        />
      ) : step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              رقم الموبايل المسجل <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010xxxxxxxx"
              dir="ltr"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary text-xs text-foreground placeholder:text-muted-foreground font-mono tabular-nums text-right transition-all"
            />
            <span className="text-[11px] text-muted-foreground mt-1.5 block">
              سيتم إرسال كود التحقق في رسالة فورية للتأكيد والدخول.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim()}
            style={accentColor ? { backgroundColor: accentColor } : undefined}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال الكود…</span>
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
              className="inline-flex min-h-[44px] items-center justify-center px-3 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
              dir="ltr"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary text-sm font-mono tracking-widest text-center text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            style={accentColor ? { backgroundColor: accentColor } : undefined}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق والدخول…</span>
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
                setCompanyOptions([]);
                setSelectedCompanyId(null);
              }}
              className="min-h-[44px] px-2 hover:text-foreground underline transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              تعديل رقم الهاتف
            </button>

            {countdown > 0 ? (
              <span className="tabular-nums text-[11px]">
                إعادة الإرسال بعد ({countdown} ثانية)
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={loading}
                style={accentColor ? { color: accentColor } : undefined}
                className="min-h-[44px] px-2 text-primary hover:underline font-semibold flex items-center gap-1 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
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
