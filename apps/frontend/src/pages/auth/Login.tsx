import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuthSimple";
import { Lock, Mail, Eye, EyeOff, Smartphone } from "lucide-react";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import { resolvePostAuthDestination } from "../../utils/postAuthRouting";
import { isCapacitorNative } from "../../config/environment";
import { AppInstallActions } from "../../components/common/AppInstallActions";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userData = await login({ email, password });

      const redirectPath = resolvePostAuthDestination(userData);

      window.location.href = redirectPath;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "فشل في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSurface
      title="مرحباً بك مجدداً"
      description="سجل دخولك للوصول إلى لوحة التحكم"
      footer={
        <div className="elite-form-link-row">
          <span>ليس لديك حساب؟</span>
          <Link to="/auth/register" className="elite-form-link">إنشاء حساب جديد</Link>
        </div>
      }
    >
      {error && (
        <AuthNotice variant="error" title="خطأ في تسجيل الدخول">
          {error}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit}>
        <div className="elite-input-group">
          <label htmlFor="email" className="elite-label">البريد الإلكتروني</label>
          <div className="elite-input-wrapper">
            <input
              id="email"
              name="email"
              type="email"
              required
              className="elite-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
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
              required
              className="elite-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
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

        <button
          type="submit"
          className="elite-submit-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>جاري الدخول...</span>
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </button>
      </form>

      <AppInstallActions />
    </AuthSurface>
  );
};

export default Login;
