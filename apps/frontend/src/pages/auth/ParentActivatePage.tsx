import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";

const API = import.meta.env.VITE_API_URL || '';

/**
 * 🔗 تفعيل حساب ولي الأمر — ولي الأمر بيفتح الرابط اللي المركز بعتهوله
 * ويحدد كلمة مروره بنفسه. مفيش باسوردات مؤقتة بتتبعت ولا بتتخزن.
 */
const ParentActivatePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [parentInfo, setParentInfo] = useState<{ name: string; phoneMasked: string | null } | null>(null);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setLinkError("الرابط غير مكتمل — افتح الرابط كما وصلك من المركز.");
        setChecking(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/v1/education/parent-portal/activate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setLinkError(data.message || "الرابط غير صالح");
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
      const res = await fetch(`${API}/api/v1/education/parent-portal/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "تعذر تفعيل الحساب");
      setDone(true);
      setTimeout(() => navigate("/parent/login", { replace: true }), 2200);
    } catch (err: any) {
      setError(err.message || "تعذر تفعيل الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSurface
      title="تفعيل حساب ولي الأمر"
      subtitle="حدد كلمة المرور الخاصة بك للدخول إلى بوابة أولياء الأمور"
    >
      {checking ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <LoadingSpinner />
          <span className="text-sm text-muted-foreground">جاري التحقق من الرابط...</span>
        </div>
      ) : linkError ? (
        <div className="space-y-4">
          <AuthNotice type="error" message={linkError} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            الروابط صالحة لمدة 14 يوماً وتُستخدم مرة واحدة. لو الرابط انتهى، اطلب من المركز إرسال رابط جديد.
          </p>
          <Link to="/parent/login" className="block text-center text-sm text-primary hover:underline">
            الانتقال لتسجيل الدخول
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="size-6 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-foreground">تم تفعيل حسابك بنجاح</p>
          <p className="text-xs text-muted-foreground">جاري تحويلك لصفحة تسجيل الدخول...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {parentInfo && (
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{parentInfo.name || "ولي أمر"}</p>
              {parentInfo.phoneMasked && (
                <p className="text-muted-foreground font-mono tabular-nums" dir="ltr">
                  {parentInfo.phoneMasked}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium text-foreground">
              كلمة المرور الجديدة
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                className="w-full h-10 rounded-lg border border-border bg-background pr-9 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none"
                placeholder="6 أحرف على الأقل"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="text-xs font-medium text-foreground">
              تأكيد كلمة المرور
            </label>
            <input
              id="confirm"
              name="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 outline-none"
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <AuthNotice type="error" message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform disabled:opacity-60"
          >
            {submitting ? "جاري التفعيل..." : "تفعيل الحساب"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            بعد التفعيل هتقدر تدخل برقم موبايلك وكلمة المرور دي.
          </p>
        </form>
      )}
    </AuthSurface>
  );
};

export default ParentActivatePage;
