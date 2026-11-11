import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { getApiUrl } from "../../config/environment";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";
import { portalSessionManager } from "../../utils/portalSessionManager";

interface ParentActivationInfo {
  name: string;
  phoneMasked: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
}

/**
 * تفعيل حساب ولي الأمر — ولي الأمر يفتح الرابط الذي أرسله المركز
 * ويحدد كلمة مروره بنفسه.
 */
const ParentActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const branding = useCompanyBranding();

  const [checking, setChecking] = useState(true);
  const [parentInfo, setParentInfo] = useState<ParentActivationInfo | null>(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    void portalSessionManager.syncPortalSessionWithHost("parent", getApiUrl());
  }, []);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setLinkError("الرابط غير مكتمل — افتح الرابط كما وصلك من المركز.");
        setChecking(false);
        return;
      }
      try {
        const res = await fetch(
          `${getApiUrl()}/education/parent-portal/activate?token=${encodeURIComponent(token)}`,
          {
            headers: {
              ...portalSessionManager.getPortalSubdomainHeaders(),
            },
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          setLinkError(data?.message || data?.error || "الرابط غير صالح");
        } else {
          setParentInfo(data.data);
        }
      } catch {
        setLinkError("تعذر الاتصال بالخادم — تأكد من الإنترنت وحاول مرة أخرى.");
      } finally {
        setChecking(false);
      }
    };
    void validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`${getApiUrl()}/education/parent-portal/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...portalSessionManager.getPortalSubdomainHeaders(),
        },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "تعذر تفعيل الحساب");
      }
      setDone(true);
      setTimeout(() => navigate("/parent/login", { replace: true }), 2200);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message ? err.message : "تعذر تفعيل الحساب",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSurface
      title="تفعيل حساب ولي الأمر"
      description="حدد كلمة المرور الخاصة بك للدخول إلى بوابة أولياء الأمور"
      eyebrow="تفعيل الحساب"
      companyName={parentInfo?.companyName || branding.name || null}
      companyLogo={parentInfo?.companyLogo || branding.logo || null}
      companyAccent={branding.accent || undefined}
    >
      {checking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <LoadingSpinner />
          <span className="text-sm text-[var(--auth-text-muted,#a09090)]">
            جاري التحقق من الرابط...
          </span>
        </div>
      ) : linkError ? (
        <div className="space-y-4">
          <AuthNotice variant="error" title="تعذر التحقق">
            {linkError}
          </AuthNotice>
          <p className="text-xs text-[var(--auth-text-muted,#a09090)] leading-relaxed">
            الروابط صالحة لمدة 14 يوماً وتُستخدم مرة واحدة. لو الرابط انتهى، اطلب من المركز إرسال رابط جديد.
          </p>
          <Link to="/parent/login" className="elite-form-link block text-center text-sm">
            الانتقال لتسجيل الدخول
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="size-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-[var(--auth-text-main,#f5f0f0)]">
            تم تفعيل حسابك بنجاح
          </p>
          <p className="text-xs text-[var(--auth-text-muted,#a09090)]">
            جاري تحويلك لصفحة تسجيل الدخول...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="elite-form-content">
          {parentInfo ? (
            <div className="rounded-xl border border-[var(--auth-input-border,rgba(255,255,255,0.12))] bg-[var(--auth-input-bg,rgba(255,255,255,0.04))] p-3 text-xs space-y-1">
              {parentInfo.companyName ? (
                <p className="text-[11px] font-medium text-[var(--auth-accent-text,#e05252)]">
                  {parentInfo.companyName}
                </p>
              ) : null}
              <p className="font-semibold text-[var(--auth-text-main,#f5f0f0)]">
                {parentInfo.name || "ولي أمر"}
              </p>
              {parentInfo.phoneMasked ? (
                <p
                  className="text-[var(--auth-text-muted,#a09090)] font-mono tabular-nums"
                  dir="ltr"
                >
                  {parentInfo.phoneMasked}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="elite-input-group">
            <label htmlFor="password" className="elite-label">
              كلمة المرور الجديدة
            </label>
            <div className="elite-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="elite-input"
                placeholder="6 أحرف على الأقل"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className="elite-input-password-toggle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <Lock className="elite-input-icon" />
            </div>
          </div>

          <div className="elite-input-group">
            <label htmlFor="confirm" className="elite-label">
              تأكيد كلمة المرور
            </label>
            <div className="elite-input-wrapper">
              <input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className="elite-input"
                placeholder="أعد كتابة كلمة المرور"
                autoComplete="new-password"
                required
              />
              <Lock className="elite-input-icon" />
            </div>
          </div>

          {error ? (
            <AuthNotice variant="error" title="تعذر التفعيل">
              {error}
            </AuthNotice>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="elite-submit-button"
          >
            {submitting ? "جاري التفعيل..." : "تفعيل الحساب"}
          </button>

          <p className="text-[11px] text-[var(--auth-text-muted,#a09090)] text-center leading-relaxed">
            بعد التفعيل هتقدر تدخل برقم موبايلك وكلمة المرور دي.
          </p>
        </form>
      )}
    </AuthSurface>
  );
};

export default ParentActivatePage;
