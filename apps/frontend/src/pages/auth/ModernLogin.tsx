import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { trackPlatformSiteLogin } from "../../utils/platformSiteMetaPixel";
import { companyNeedsOnboarding, getPostAuthDestination } from "../../utils/companyOnboarding";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const ModernLogin: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    rememberMe: false,
  });

  const { login, isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/company-dashboard";

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user) {
      navigate(getPostAuthDestination(user), {
        replace: true,
      });
    }
  }, [isAuthenticated, isAuthLoading, navigate, user]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setSuccess("جاري تأكيد بيانات الدخول…");

      const userData = await login(formData);
      const postAuthDestination = getPostAuthDestination(userData);
      const redirectPath =
        postAuthDestination === "/company-dashboard" &&
        from &&
        from !== "/company-dashboard" &&
        !companyNeedsOnboarding(userData?.company)
          ? from
          : postAuthDestination;

      setSuccess("تم تسجيل الدخول بنجاح، يتم تحويلك الآن…");
      trackPlatformSiteLogin({
        destination: redirectPath,
        role: userData?.role || "UNKNOWN",
      });
      setTimeout(() => navigate(redirectPath, { replace: true }), 800);
    } catch (err: any) {
      setError(
        err.message ||
          "فشل في تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى",
      );
      setSuccess("");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || (isAuthenticated && user)) {
    return (
      <AuthSurface
        title="جاري التحقق من الجلسة"
        description="نراجع حالة الحساب ونجهّز مساحة العمل المناسبة لك."
        eyebrow="Session Check"
        visualTitle="نحن نؤمّن بياناتك"
        visualDescription="تشفير عالي المستوى وأمان فائق لضمان سلامة بيانات شركتك في كل مرة تسجل فيها الدخول."
      >
        <div className="elite-form-content" style={{ textAlign: 'center', padding: '3rem 0' }}>
          <LoadingSpinner size="lg" color="indigo" />
          <p style={{ marginTop: '1.5rem', color: '#64748b' }}>ثوانٍ قليلة ويتم توجيهك تلقائيًا.</p>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface
      title="الدخول إلى مساحة العمل"
      description="أدخل بريدك وكلمة المرور للوصول إلى لوحة التشغيل الخاصة بك."
      eyebrow="Secure Sign In"
      footer={
        <div className="elite-form-link-row">
          <span>ليس لديك حساب؟</span>
          <Link to="/auth/register" className="elite-form-link">إنشاء حساب جديد</Link>
        </div>
      }
    >
      {success ? (
        <AuthNotice variant="success" title="تم التحقق">
          {success}
        </AuthNotice>
      ) : null}

      {error ? (
        <AuthNotice variant="error" title="تعذر تسجيل الدخول">
          {error}
        </AuthNotice>
      ) : null}

      <form onSubmit={handleSubmit} className="elite-form-content">
        <div className="elite-input-group">
          <label htmlFor="email" className="elite-label">
            البريد الإلكتروني
          </label>
          <div className="elite-input-wrapper">
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              spellCheck={false}
              required
              className="elite-input"
              placeholder="name@company.com"
              disabled={isLoading}
            />
            <Mail className="elite-input-icon" />
          </div>
        </div>

        <div className="elite-input-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <Link to="/auth/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--auth-accent-dark)', fontWeight: '600', textDecoration: 'none' }}>
              نسيت كلمة المرور؟
            </Link>
            <label htmlFor="password" className="elite-label" style={{ marginBottom: 0 }}>كلمة المرور</label>
          </div>
          <div className="elite-input-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
              className="elite-input"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              className="elite-input-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <Lock className="elite-input-icon" />
          </div>
        </div>

        <div className="elite-form-link-row" style={{ justifyContent: 'flex-end', marginBottom: '1.5rem', border: 'none', padding: 0 }}>
          <label htmlFor="remember-me" className="business-auth-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#64748b' }}>
            <span>تذكرني</span>
            <input
              id="remember-me"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              style={{ width: '1rem', height: '1rem', borderRadius: '4px' }}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="elite-submit-button"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>جاري الدخول...</span>
            </>
          ) : (
            "دخول إلى النظام"
          )}
        </button>
      </form>
    </AuthSurface>
  );
};

export default ModernLogin;
