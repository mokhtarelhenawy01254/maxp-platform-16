import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Lock, Mail, Phone, User, Eye, EyeOff, Globe2, Briefcase, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuthSimple";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { trackPlatformSiteCompleteRegistration } from "../../utils/platformSiteMetaPixel";
import { getApiUrl } from "../../config/environment";

interface BusinessSpecialty {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon: string;
}

interface BusinessTypeSelectProps {
  specialties: BusinessSpecialty[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  label: string;
  isArabic: boolean;
  disabled?: boolean;
}

const BusinessTypeSelect: React.FC<BusinessTypeSelectProps> = ({
  specialties, value, onChange, placeholder, label, isArabic, disabled,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = specialties.find((s) => s.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="elite-input-group" ref={ref} style={{ position: "relative" }}>
      <label className="elite-label">{label}</label>
      <div className="elite-input-wrapper">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "100%",
            padding: "0.75rem 2.75rem",
            background: "var(--auth-input-bg)",
            border: `1px solid ${open ? "var(--auth-accent)" : "var(--auth-input-border)"}`,
            borderRadius: "0.875rem",
            fontSize: "0.9375rem",
            color: selected ? "var(--auth-text-main)" : "var(--auth-text-muted)",
            textAlign: isArabic ? "right" : "left",
            height: "2.875rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: open ? "0 0 0 4px rgba(184,26,26,0.1)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ flex: 1, textAlign: isArabic ? "right" : "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected ? (isArabic ? selected.nameAr : selected.nameEn) : placeholder}
          </span>
          <ChevronDown
            size={16}
            style={{
              flexShrink: 0,
              marginInlineStart: "0.5rem",
              color: "var(--auth-text-muted)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
        <Briefcase className="elite-input-icon" style={{ [isArabic ? "right" : "left"]: "1rem", pointerEvents: "none" }} />
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 999,
            marginTop: "0.375rem",
            background: "var(--auth-surface, #1a1a2e)",
            border: "1px solid var(--auth-input-border)",
            borderRadius: "0.875rem",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxHeight: "240px",
            overflowY: "auto",
            padding: "0.375rem",
          }}
        >
          {specialties.map((s) => {
            const isSelected = s.id === value;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { onChange(s.id); setOpen(false); }}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  background: isSelected ? "rgba(184,26,26,0.15)" : "transparent",
                  border: "none",
                  borderRadius: "0.625rem",
                  color: isSelected ? "var(--auth-accent)" : "var(--auth-text-main)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: isArabic ? "right" : "left",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span>{isArabic ? s.nameAr : s.nameEn}</span>
                {isSelected && <Check size={14} style={{ flexShrink: 0, color: "var(--auth-accent)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NEW_ACCOUNT_DESTINATION = "/company-dashboard";

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as any).response;
    if (response?.data?.errors?.length) return response.data.errors[0];
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
      companyName: "اسم الشركة",
      email: "البريد الإلكتروني",
      phone: "رقم الهاتف",
      password: "كلمة المرور",
      businessType: "نوع النشاط التجاري",
    },
    businessTypePlaceholder: "اختر نوع نشاطك التجاري",
    placeholders: {
      fullName: "أحمد محمد",
      companyName: "مؤسسة الأمل للتجارة",
      email: "name@company.com",
      phone: "01xxxxxxxxx",
    },
    errors: {
      fullName: "اكتب اسمك بالكامل",
      companyName: "اسم الشركة مطلوب",
      email: "البريد الإلكتروني مطلوب",
      password: "كلمة المرور مطلوبة",
      phoneRequired: "رقم الهاتف مطلوب",
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
      companyName: "Company name",
      email: "Email",
      phone: "Phone",
      password: "Password",
      businessType: "Business type",
    },
    businessTypePlaceholder: "Select your business type",
    placeholders: {
      fullName: "Ahmed Mohamed",
      companyName: "Al Amal Trading Est.",
      email: "name@company.com",
      phone: "01xxxxxxxxx",
    },
    errors: {
      fullName: "Enter your full name",
      companyName: "Company name is required",
      email: "Email is required",
      password: "Password is required",
      phoneRequired: "Phone number is required",
      phone: "Invalid Egyptian phone number (01xxxxxxxxx)",
      register: "Failed to create account",
    },
    submitLoading: "Creating...",
    errorTitle: "Registration error",
    languageButton: "العربية",
  },
};

const Register: React.FC = () => {
  const { i18n } = useTranslation();
  const language = i18n.language?.startsWith("en") ? "en" : "ar";
  const isArabic = language === "ar";
  const copy = {
    ...copyByLanguage[language],
    title: isArabic ? "تسجيل حساب جديد" : "New Account",
    description: isArabic
      ? "أنشئ حسابك وابدأ رحلة التحول الرقمي"
      : "Create your account and start your digital transformation journey",
    visualBadge: "Business OS",
    visualDescription: isArabic
      ? "منصة متكاملة تدير بها مبيعاتك، مخازنك، موظفيك، والتسويق — كل شيء في نظام واحد"
      : "An integrated platform to manage sales, inventory, HR, and marketing — all in one system",
    stats: [
      { label: isArabic ? "بدون بطاقة بنكية" : "No Card Required", value: isArabic ? "ابدأ فوراً" : "Start Now" },
      { label: isArabic ? "غير محدود" : "Unlimited", value: isArabic ? "موظفين" : "Employees" },
    ],
    submit: isArabic ? "إنشاء حساب" : "Create Account",
  };
  const [searchParams] = useSearchParams();
  const partnerCode = searchParams.get("partner") || undefined;
  const theme = searchParams.get("theme") || undefined;
  const landingBundle = searchParams.get("landingBundle") || undefined;
  // utm_* captured by the server-level middleware (maxp_utm cookie) — sent
  // back explicitly so the attribution survives even without cookies.
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
  const utm: Record<string, string> = {};
  utmKeys.forEach((k) => {
    const v = searchParams.get(k);
    if (v) utm[k] = v;
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    email: "",
    password: "",
    phone: "",
    businessSpecialtyId: "",
  });

  useEffect(() => {
    fetch(`${getApiUrl()}/auth/business-specialties`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.data?.items) setSpecialties(json.data.items);
      })
      .catch(() => {});
  }, []);

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
    if (!formData.companyName.trim()) errors.companyName = copy.errors.companyName;
    if (!formData.email.trim()) errors.email = copy.errors.email;
    if (!formData.password) errors.password = copy.errors.password;
    if (!formData.phone.trim()) {
      errors.phone = copy.errors.phoneRequired;
    } else {
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
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        partnerCode,
        businessSpecialtyId: formData.businessSpecialtyId || undefined,
        landingBundle,
        utm: Object.keys(utm).length > 0 ? utm : undefined,
      });
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get("redirect");
      const source = urlParams.get("source");
      const action = urlParams.get("action");
      const postAuthDest =
        userData?.role === "MERCHANT"
          ? "/merchant-portal"
          : userData?.role === "AFFILIATE"
            ? "/affiliates/dashboard"
            : userData?.role === "SUPER_ADMIN"
              ? "/super-admin/dev-dashboard"
              : NEW_ACCOUNT_DESTINATION;

      const SOURCE_TO_BUNDLE: Record<string, string> = {
        messaging: "messaging-bundle",
        "ai-inbox": "ai-inbox-bundle",
        clothing: "store-complete-bundle",
      };

      const token = localStorage.getItem("accessToken");

      if (action === "free" && source && SOURCE_TO_BUNDLE[source] && token) {
        try {
          const res = await fetch(`${getApiUrl()}/platform-subscription/lp-activate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ bundleSlug: SOURCE_TO_BUNDLE[source] }),
          });
          const data = await res.json();
          navigate(data.success ? "/admin/ai-hub?tab=sandbox" : (redirectParam || postAuthDest || NEW_ACCOUNT_DESTINATION), { replace: true });
        } catch {
          navigate(postAuthDest || NEW_ACCOUNT_DESTINATION, { replace: true });
        }
      } else if (action === "paid" && source && SOURCE_TO_BUNDLE[source] && token) {
        try {
          const res = await fetch(`${getApiUrl()}/platform-subscription/lp-checkout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ bundleSlug: SOURCE_TO_BUNDLE[source] }),
          });
          const data = await res.json();
          if (data.success && data.data?.sessionUrl) window.location.href = data.data.sessionUrl;
          else navigate(postAuthDest || NEW_ACCOUNT_DESTINATION, { replace: true });
        } catch {
          navigate(postAuthDest || NEW_ACCOUNT_DESTINATION, { replace: true });
        }
      } else {
        const isValidRedirect = redirectParam && redirectParam !== "/" && !redirectParam.startsWith("/lp/");
        const sourceRedirect = source === "ai-inbox" ? "/marketplace/bundle/ai-inbox-bundle" : null;
        const redirectPath = (isValidRedirect ? redirectParam : null) || sourceRedirect || postAuthDest || NEW_ACCOUNT_DESTINATION;
        trackPlatformSiteCompleteRegistration("auth_register", { destination: redirectPath, role: userData?.role || "UNKNOWN" });
        setTimeout(() => navigate(redirectPath, { replace: true }), 100);
      }
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
          <label className="elite-label">{copy.labels.companyName}</label>
          <div className="elite-input-wrapper">
            <input name="companyName" type="text" value={formData.companyName} onChange={handleChange} required className={`elite-input ${fieldErrors.companyName ? "elite-input-error" : ""}`} placeholder={copy.placeholders.companyName} disabled={isLoading} />
            <Building2 className="elite-input-icon" />
          </div>
          {fieldErrors.companyName && <p className="elite-field-error">{fieldErrors.companyName}</p>}
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
            <input name="phone" type="tel" value={formData.phone} onChange={handleChange} required className={`elite-input ${fieldErrors.phone ? "elite-input-error" : ""}`} placeholder={copy.placeholders.phone} disabled={isLoading} />
            <Phone className="elite-input-icon" />
          </div>
          {fieldErrors.phone && <p className="elite-field-error">{fieldErrors.phone}</p>}
        </div>

        {specialties.length > 0 && (
          <BusinessTypeSelect
            specialties={specialties}
            value={formData.businessSpecialtyId}
            onChange={(id) => setFormData((prev) => ({ ...prev, businessSpecialtyId: id }))}
            placeholder={copy.businessTypePlaceholder}
            label={copy.labels.businessType}
            isArabic={isArabic}
            disabled={isLoading}
          />
        )}

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
