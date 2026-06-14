import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Mail, Phone, User, Eye, EyeOff, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { trackPlatformSiteCompleteRegistration } from "../../utils/platformSiteMetaPixel";
import { getPostAuthDestination } from "../../utils/companyOnboarding";

const NEW_ACCOUNT_DESTINATION = "/marketplace";

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as any).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
};

const TRIAL_DAYS = 0;

const copyByLanguage = {
  ar: {
    eyebrow: "New Member Registration",
    footerText: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",
    visualTitle: <>قُد أعمالك <br /> نحو <span style={{ color: "var(--auth-accent)" }}>المستقبل</span></>,
    labels: {
      fullName: "الاسم بالكامل",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف (اختياري)",
      password: "كلمة المرور",
    },
    placeholders: {
      fullName: "أحمد محمد",
      email: "name@company.com",
      phone: "01xxxxxxxxx",
    },
    errors: {
      fullName: "اكتب اسمك بالكامل",
      email: "البريد الإلكتروني مطلوب",
      password: "كلمة المرور مطلوبة",
      phone: "رقم الهاتف غير صحيح (01xxxxxxxxx)",
      register: "فشل في إنشاء الحساب",
    },
    submitLoading: "جاري الإنشاء...",
    errorTitle: "خطأ في التسجيل",
    languageButton: "English",
  },
  en: {
    eyebrow: "New Member Registration",
    footerText: "Already have an account?",
    login: "Log in",
    visualTitle: <>Run your business <br /> with a <span style={{ color: "var(--auth-accent)" }}>focused toolkit</span></>,
    labels: {
      fullName: "Full name",
      email: "Email",
      phone: "Phone (optional)",
      password: "Password",
    },
    placeholders: {
      fullName: "Ahmed Mohamed",
      email: "name@company.com",
      phone: "01xxxxxxxxx",
    },
    errors: {
      fullName: "Enter your full name",
      email: "Email is required",
      password: "Password is required",
      phone: "Invalid Egyptian phone number (01xxxxxxxxx)",
      register: "Failed to create account",
    },
    submitLoading: "Creating...",
    errorTitle: "Registration error",
    languageButton: "العربية",
  },
};

const Register: React.FC = () => {
  const { i18n, t } = useTranslation();
  const language = i18n.language?.startsWith("en") ? "en" : "ar";
  const copy = {
    ...copyByLanguage[language],
    title: t("register.title"),
    description: t("register.description"),
    visualDescription: t("register.visualDescription"),
    visualBadge: t("register.visualBadge"),
    stats: [
      { label: t("register.statsStartLabel"), value: t("register.statsStartValue") },
      { label: t("register.statsNoLimitLabel"), value: t("register.statsNoLimitValue") },
    ],
    submit: t("register.submit"),
  };
  const isArabic = language === "ar";
  const [searchParams] = useSearchParams();
  const partnerCode = searchParams.get("partner") || undefined;
  const theme = searchParams.get("theme") || undefined;

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });

  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    if (error) setError("");
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.fullName.trim()) errors.fullName = copy.errors.fullName;
    if (!formData.email.trim()) errors.email = copy.errors.email;
    if (!formData.password) errors.password = copy.errors.password;
    if (formData.phone) {
      const phoneClean = formData.phone.replace(/\s+/g, "");
      const egyptPhoneRegex = /^(\+20|0020|0)?1[0125][0-9]{8}$/;
      if (!egyptPhoneRegex.test(phoneClean)) errors.phone = copy.errors.phone;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      setIsLoading(true);
      setError("");

      const nameParts = formData.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || firstName;

      const userData = await registerUser({
        firstName,
        lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        partnerCode,
      });
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");
      const postAuthDest = getPostAuthDestination(userData);
      
      const isValidRedirect = redirectParam && redirectParam !== "/" && !redirectParam.startsWith("/lp/");
      const redirectPath = (isValidRedirect ? redirectParam : null) || postAuthDest || NEW_ACCOUNT_DESTINATION;

      trackPlatformSiteCompleteRegistration("auth_register", { destination: redirectPath, role: userData?.role || "UNKNOWN" });
      // Small delay to allow the React auth state (isAuthenticated) to settle before
      // the router evaluates which route block to render (authenticated vs. unauthenticated).
      setTimeout(() => navigate(redirectPath, { replace: true }), 100);
    } catch (err: any) {
      setError(extractErrorMessage(err, copy.errors.register));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = async () => {
    const nextLanguage = isArabic ? "en" : "ar";
    await i18n.changeLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLanguage;
  };

  return (
    <AuthSurface
      title={copy.title}
      description={copy.description}
      eyebrow={copy.eyebrow}
      wide
      theme={theme}
      dir={isArabic ? "rtl" : "ltr"}
      footer={
        <div className="elite-form-link-row">
          <span>{copy.footerText}</span>
          <Link to="/auth/login" className="elite-form-link">{copy.login}</Link>
        </div>
      }
      visualTitle={copy.visualTitle}
      visualDescription={copy.visualDescription}
      visualBadge={copy.visualBadge}
      visualStats={[
        {
          label: copy.stats[0]?.label || "",
          value: copy.stats[0]?.value || "",
        },
        {
          label: copy.stats[1]?.label || "",
          value: copy.stats[1]?.value || "",
        },
      ]}
    >
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => void toggleLanguage()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-[var(--auth-accent)] hover:text-[var(--auth-accent)]"
        >
          <Globe2 size={16} />
          {copy.languageButton}
        </button>
      </div>

      {error && <AuthNotice variant="error" title={copy.errorTitle}>{error}</AuthNotice>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="elite-input-group">
          <label className="elite-label">{copy.labels.fullName}</label>
          <div className="elite-input-wrapper">
            <input name="fullName" type="text" value={formData.fullName} onChange={handleChange} required className={`elite-input ${fieldErrors.fullName ? "elite-input-error" : ""}`} placeholder={copy.placeholders.fullName} disabled={isLoading} />
            <User className="elite-input-icon" />
          </div>
          {fieldErrors.fullName && <p className="elite-field-error">{fieldErrors.fullName}</p>}
        </div>

        <div className="elite-input-group">
          <label className="elite-label">{copy.labels.email}</label>
          <div className="elite-input-wrapper">
            <input name="email" type="email" value={formData.email} onChange={handleChange} required className={`elite-input ${fieldErrors.email ? "elite-input-error" : ""}`} placeholder={copy.placeholders.email} disabled={isLoading} />
            <Mail className="elite-input-icon" />
          </div>
          {fieldErrors.email && <p className="elite-field-error">{fieldErrors.email}</p>}
        </div>

        <div className="elite-input-group">
          <label className="elite-label">{copy.labels.phone}</label>
          <div className="elite-input-wrapper">
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} className={`elite-input ${fieldErrors.phone ? "elite-input-error" : ""}`} placeholder={copy.placeholders.phone} disabled={isLoading} />
            <Phone className="elite-input-icon" />
          </div>
          {fieldErrors.phone && <p className="elite-field-error">{fieldErrors.phone}</p>}
        </div>

        <div className="elite-input-group">
          <label className="elite-label">{copy.labels.password}</label>
          <div className="elite-input-wrapper">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              className={`elite-input ${fieldErrors.password ? "elite-input-error" : ""}`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button type="button" className="elite-input-password-toggle" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <Lock className="elite-input-icon" />
          </div>
          {fieldErrors.password && <p className="elite-field-error">{fieldErrors.password}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="elite-submit-button">
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>{copy.submitLoading}</span>
            </>
          ) : (
            copy.submit
          )}
        </button>
      </form>
    </AuthSurface>
  );
};

export default Register;
