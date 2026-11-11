import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthSurface, AuthNotice } from "../../components/auth/AuthSurface";
import PortalCompanyPicker from "../../components/auth/PortalCompanyPicker";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";
import { getApiUrl } from "../../config/environment";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";
import {
  portalSessionManager,
  type PortalCompanyOption,
} from "../../utils/portalSessionManager";

const TeacherLoginPage: React.FC = () => {
  const branding = useCompanyBranding();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [companyOptions, setCompanyOptions] = useState<PortalCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void portalSessionManager.syncPortalSessionWithHost("teacher", getApiUrl());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const submitLogin = async (companyIdOverride?: string) => {
    if (!formData.email || !formData.password) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`${getApiUrl()}/education/teacher-portal/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...portalSessionManager.getPortalSubdomainHeaders(),
        },
        body: JSON.stringify({
          ...formData,
          ...(companyIdOverride ? { companyId: companyIdOverride } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (
        (data?.requiresCompanySelection || data?.requireCompanySelection) &&
        Array.isArray(data?.companies)
      ) {
        const options = portalSessionManager.normalizePortalCompanyOptions(
          data.companies,
        );
        if (options.length > 0) {
          setCompanyOptions(options);
          setSelectedCompanyId(null);
          return;
        }
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || data?.error || "فشل تسجيل الدخول");
      }

      const token = data?.data?.token;
      const teacher = data?.data?.teacher;
      const company = data?.data?.company;
      if (!token) {
        throw new Error("تعذر استلام رمز الجلسة");
      }

      portalSessionManager.savePortalSession({
        role: "teacher",
        companyId: company?.id || teacher?.companyId || companyIdOverride || null,
        companySlug: company?.slug || null,
        companyName: company?.name || null,
        token,
        profile: teacher ?? null,
      });

      navigate("/teacher/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "فشل في تسجيل الدخول",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin();
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    void submitLogin(companyId);
  };

  const handleBackToCredentials = () => {
    setCompanyOptions([]);
    setSelectedCompanyId(null);
    setError("");
  };

  return (
    <AuthSurface
      title="بوابة المدرس"
      description="أدخل بريدك الإلكتروني وكلمة المرور للدخول إلى بوابة المدرس"
      eyebrow="تسجيل دخول المدرسين"
      visualBadge="بوابة المدرس"
      visualTitle="منصة المدرسين"
      visualDescription="تابع جدول حصصك، مرتباتك، وأوقات فراغك من بوابة واحدة."
      companyLogo={branding.logo}
      companyName={branding.name || null}
      companyAccent={branding.accent || undefined}
      footer={
        <div className="elite-form-link-row">
          <Link to="/auth/login" className="elite-form-link">
            تسجيل دخول الإدارة
          </Link>
        </div>
      }
    >
      {error ? (
        <AuthNotice variant="error" title="تعذر تسجيل الدخول">
          {error}
        </AuthNotice>
      ) : null}

      {companyOptions.length > 0 ? (
        <PortalCompanyPicker
          variant="auth-surface"
          companies={companyOptions}
          selectedCompanyId={selectedCompanyId}
          loading={isLoading}
          onSelect={handleSelectCompany}
          onBack={handleBackToCredentials}
        />
      ) : (
        <form onSubmit={handleSubmit} className="elite-form-content">
          <div className="elite-input-group">
            <label htmlFor="email" className="elite-label">
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <div className="elite-input-wrapper">
              <input
                id="email"
                name="email"
                type="text"
                value={formData.email}
                onChange={handleChange}
                className="elite-input"
                placeholder="teacher@email.com"
                disabled={isLoading}
                required
              />
              <Mail className="elite-input-icon" />
            </div>
          </div>
          <div className="elite-input-group">
            <label htmlFor="password" className="elite-label">
              كلمة المرور
            </label>
            <div className="elite-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                className="elite-input"
                placeholder="••••••••"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="elite-input-password-toggle"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <Lock className="elite-input-icon" />
            </div>
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
              "دخول إلى بوابة المدرس"
            )}
          </button>
        </form>
      )}
    </AuthSurface>
  );
};

export default TeacherLoginPage;
