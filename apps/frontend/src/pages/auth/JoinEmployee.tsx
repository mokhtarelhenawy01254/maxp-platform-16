import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { tokenManager } from "../../utils/tokenManager";
import { toast } from "sonner";
import { DateInput } from "../../components/ui/DateInput";
import { formatDate } from "../../utils/dateFormat";
import { envConfig } from "../../config/environment";

interface InvitationInfo {
  id: string;
  companyName: string;
  companyLogo?: string | null;
  departmentName?: string | null;
  positionTitle?: string | null;
  role: string;
  contractType: string;
  prefilledEmail?: string | null;
  prefilledPhone?: string | null;
  inviterName?: string | null;
  expiresAt: string;
}

const roleDisplayMap: Record<string, string> = {
  AGENT: "موظف (Agent)",
  MANAGER: "مدير قسم (Manager)",
  COMPANY_ADMIN: "مشرف شركة (Admin)",
  OWNER: "مالك",
};

const contractDisplayMap: Record<string, string> = {
  FULL_TIME: "دوام كامل",
  PART_TIME: "دوام جزئي",
  CONTRACT: "عقد محدد",
  INTERNSHIP: "تدريب",
  FREELANCE: "عمل حر",
};

export const JoinEmployee: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    nationalId: "",
    dateOfBirth: "",
    gender: "MALE",
    address: "",
    city: "",
  });

  // Check if user is currently logged in
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const hasToken = tokenManager.hasAccessToken();
      if (storedUser && hasToken) {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setError("رابط الدعوة غير صحيح أو مفقود");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await apiClient.get(
          `/hr/employee-invitations/verify/${token}`
        );
        if (response.data?.success && response.data?.data?.invitation) {
          const inv: InvitationInfo = response.data.data.invitation;
          setInvitation(inv);
          setFormData((prev) => ({
            ...prev,
            email: inv.prefilledEmail || prev.email || "",
            phone: inv.prefilledPhone || prev.phone || "",
          }));
        } else {
          setError(response.data?.message || "فشل التحقق من صلاحية رابط الدعوة");
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "تعذر التحقق من رابط الدعوة، قد يكون منتهياً أو تم إلغاؤه"
        );
      } finally {
        setLoading(false);
      }
    };

    void verifyToken();
  }, [token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Express 1-click Join for currently authenticated user
  const handleExpressJoin = async () => {
    setError("");
    try {
      setSubmitting(true);
      const response = await apiClient.post(
        `/hr/employee-invitations/accept/${token}`,
        {
          email: currentUser?.email || formData.email,
          firstName: currentUser?.firstName,
          lastName: currentUser?.lastName,
          phone: currentUser?.phone || formData.phone,
        }
      );

      if (response.data?.success) {
        setSuccess(true);
        const { token: accessToken, refreshToken, user } = response.data.data;
        if (accessToken) tokenManager.setAccessToken(accessToken);
        if (refreshToken) tokenManager.setRefreshToken(refreshToken);
        if (user) localStorage.setItem("user", JSON.stringify(user));

        toast.success("تم ربط حسابك بالشركة بنجاح!");
        setTimeout(() => {
          navigate("/conversations");
        }, 1800);
      } else {
        setError(response.data?.message || "فشل قبول الدعوة");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إتمام الانضمام");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    if (!hasExistingAccount) {
      if (!formData.password || formData.password.length < 6) {
        setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("كلمتا المرور غير متطابقتين");
        return;
      }
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError("يرجى إدخال الاسم الأول واسم العائلة");
        return;
      }
    } else {
      if (!formData.password) {
        setError("يرجى إدخال كلمة مرور حسابك الحالي في MaxP لتأكيد هويتك");
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: any = {
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
        nationalId: formData.nationalId.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
      };

      if (!hasExistingAccount) {
        payload.firstName = formData.firstName.trim();
        payload.lastName = formData.lastName.trim();
      } else {
        if (formData.firstName.trim()) payload.firstName = formData.firstName.trim();
        if (formData.lastName.trim()) payload.lastName = formData.lastName.trim();
      }

      const response = await apiClient.post(
        `/hr/employee-invitations/accept/${token}`,
        payload
      );

      if (response.data?.success) {
        setSuccess(true);
        const { token: accessToken, refreshToken, user } = response.data.data;
        if (accessToken) {
          tokenManager.setAccessToken(accessToken);
        }
        if (refreshToken) {
          tokenManager.setRefreshToken(refreshToken);
        }
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        toast.success(
          hasExistingAccount
            ? "تم التحقق من حسابك وربطك بفريق العمل بنجاح!"
            : "تم تسجيل بياناتك وحسابك بنجاح!"
        );
        setTimeout(() => {
          navigate("/conversations");
        }, 1800);
      } else {
        setError(response.data?.message || "فشل إتمام التسجيل");
      }
    } catch (err: any) {
      if (err.response?.data?.code === "PASSWORD_REQUIRED_FOR_EXISTING_USER") {
        setHasExistingAccount(true);
      }
      setError(err.response?.data?.message || "حدث خطأ أثناء إتمام التسجيل");
    } finally {
      setSubmitting(false);
    }
  };

  const renderVisualContent = () => {
    if (!invitation) return null;

    const logoUrl = invitation.companyLogo
      ? invitation.companyLogo.startsWith("http://") ||
        invitation.companyLogo.startsWith("https://") ||
        invitation.companyLogo.startsWith("data:")
        ? invitation.companyLogo
        : `${envConfig.backendUrl}${invitation.companyLogo.startsWith("/") ? "" : "/"}${invitation.companyLogo}`
      : null;

    return (
      <div className="visual-content animate-fade-up">
        {logoUrl ? (
          <div className="business-auth-visual-logo">
            <img
              src={logoUrl}
              alt={invitation.companyName}
              className="business-auth-visual-logo-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="business-auth-visual-logo-fallback">
            {invitation.companyName?.charAt(0) || "M"}
          </div>
        )}

        <span className="visual-badge">دعوة انضمام</span>

        <h1 className="visual-title">
          {invitation.companyName}
        </h1>

        <p className="visual-description">
          {invitation.positionTitle
            ? `دعوة للانضمام إلى فريق العمل بمنصب ${invitation.positionTitle}.`
            : "دعوة للانضمام إلى فريق العمل والمساهمة في تحقيق أهداف الشركة."}
        </p>

        <div className="visual-features">
          {invitation.departmentName && (
            <span className="business-auth-chip">
              {invitation.departmentName}
            </span>
          )}
          <span className="business-auth-chip business-auth-chip--accent">
            {roleDisplayMap[invitation.role] || invitation.role}
          </span>
          <span className="business-auth-chip">
            {contractDisplayMap[invitation.contractType] || invitation.contractType}
          </span>
        </div>

        {(invitation.inviterName || invitation.expiresAt) && (
          <div className="visual-stats-inline">
            {invitation.inviterName && (
              <div className="stat-inline">
                <span className="stat-inline-label">دعوة من:</span>
                <span className="stat-inline-value">{invitation.inviterName}</span>
              </div>
            )}
            {invitation.expiresAt && (
              <div className="stat-inline">
                <span className="stat-inline-label">تنتهي في:</span>
                <span className="stat-inline-value font-mono tabular-nums">
                  {formatDate(invitation.expiresAt, "DD/MM/YYYY")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <AuthSurface
        title="جاري فحص رابط الدعوة"
        description="نراجع تفاصيل المنصب والشركة لتهيئة استمارة الانضمام الخاصة بك."
        eyebrow="التحقق من الدعوة"
        brandHref={null}
        visualContent={
          <div className="visual-content animate-fade-up">
            <span className="visual-badge">التحقق من الدعوة</span>
            <h1 className="visual-title">انضم إلى فريق العمل</h1>
            <p className="visual-description">
              جاري فحص صلاحيات الرابط وتفاصيل المنصب المخصص لك لتهيئة بيئة العمل...
            </p>
          </div>
        }
      >
        <div className="business-auth-loader-block">
          <div className="business-auth-loader" />
          <p>يتم التحقق من بيانات الشركة والصلاحيات المخصصة لك...</p>
        </div>
      </AuthSurface>
    );
  }

  if (error && !invitation) {
    return (
      <AuthSurface
        title="تعذر فتح رابط الدعوة"
        description="الرابط غير صالح أو انتهت صلاحيته أو تم إلغاؤه من قِبل إدارة الشركة."
        eyebrow="رابط غير صالح"
        brandHref={null}
        icon={<ExclamationTriangleIcon className="h-7 w-7 text-amber-500" />}
        visualContent={
          <div className="visual-content animate-fade-up">
            <span className="visual-badge">رابط الدعوة</span>
            <h1 className="visual-title">تعذر التحقق من الدعوة</h1>
            <p className="visual-description">
              الرابط غير صالح أو قد انتهت صلاحيته. يرجى التواصل مع إدارة الشركة لإرسال رابط دعوة صالح.
            </p>
          </div>
        }
      >
        <AuthNotice variant="error" title="تنبيه الدعوة">
          {error}
        </AuthNotice>

        <p className="business-auth-hint text-center mt-3">
          اطلب من إدارة الشركة إرسال دعوة جديدة إلى بريدك الإلكتروني.
        </p>

        <div className="business-auth-actions pt-4">
          <button
            type="button"
            className="business-primary-button"
            onClick={() => navigate("/auth/login")}
          >
            الانتقال إلى تسجيل الدخول
          </button>
        </div>
      </AuthSurface>
    );
  }

  if (success) {
    return (
      <AuthSurface
        title="أهلاً بك في الفريق!"
        description="تم إنشاء حسابك وربط ملفك الوظيفي بنجاح، جاري نقلك إلى مساحة العمل..."
        eyebrow="تم الانضمام"
        icon={<CheckCircleIcon className="h-7 w-7 business-auth-icon-success" />}
        companyName={invitation?.companyName}
        companyLogo={invitation?.companyLogo}
        brandHref={null}
        visualContent={renderVisualContent()}
      >
        <div className="business-auth-loader-block">
          <div className="business-auth-loader" />
          <p>يتم تجهيز لوحة التحكم الخاصة بك والصلاحيات الآن...</p>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface
      title="انضم إلى فريق العمل"
      description={`يسعدنا انضمامك إلى ${invitation?.companyName || "فريقنا"}. يرجى إكمال بيانات حسابك وبياناتك الشخصية للانطلاق فوراً.`}
      eyebrow="انضمام موظف جديد"
      wide={true}
      companyName={invitation?.companyName}
      companyLogo={invitation?.companyLogo}
      brandHref={null}
      visualContent={renderVisualContent()}
      footer={
        <div className="business-auth-link-row text-xs">
          هل لديك حساب مسجل بالفعل؟{" "}
          <button
            type="button"
            className="business-auth-inline-link"
            onClick={() => navigate("/auth/login")}
          >
            تسجيل الدخول
          </button>
        </div>
      }
    >
      {/* Position Badge Card */}
      {invitation && (
        <div className="business-auth-card">
          <div className="flex items-center gap-2">
            <div className="business-auth-card-icon">
              <BriefcaseIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="business-auth-hint block">الوظيفة المعروضة:</span>
              <strong className="font-semibold text-[var(--auth-text-main)]">
                {invitation.positionTitle || "عضو فريق العمل"}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invitation.departmentName && (
              <span className="business-auth-chip">
                {invitation.departmentName}
              </span>
            )}
            <span className="business-auth-chip business-auth-chip--accent">
              {roleDisplayMap[invitation.role] || invitation.role}
            </span>
            <span className="business-auth-chip">
              {contractDisplayMap[invitation.contractType] || invitation.contractType}
            </span>
          </div>
        </div>
      )}

      {/* Express 1-Click Join Banner for Already Logged-in Users */}
      {currentUser && (
        <div className="business-auth-banner">
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div>
              <p className="business-auth-banner-title">
                أنت مسجل دخول حالياً بحساب: {currentUser.firstName || currentUser.name || currentUser.email} ({currentUser.email})
              </p>
              <p className="business-auth-banner-desc">
                يمكنك قبول الدعوة والانضمام فوراً بهذا الحساب دون إعادة إدخال بياناتك أو كلمات المرور.
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleExpressJoin}
              className="business-primary-button whitespace-nowrap text-xs px-3.5 py-2 shrink-0 shadow-sm mt-2 sm:mt-0"
            >
              {submitting ? "جاري الانضمام..." : "الانضمام بهذا الحساب مباشرة"}
            </button>
          </div>
        </div>
      )}

      {/* Toggle between New User and Existing Account */}
      {!currentUser && (
        <div className="business-auth-segmented">
          <button
            type="button"
            onClick={() => setHasExistingAccount(false)}
            className={`business-auth-segmented-item ${!hasExistingAccount ? "is-active" : ""}`}
          >
            إنشاء حساب جديد
          </button>
          <button
            type="button"
            onClick={() => setHasExistingAccount(true)}
            className={`business-auth-segmented-item ${hasExistingAccount ? "is-active" : ""}`}
          >
            لدي حساب مسجل مسبقاً في MaxP
          </button>
        </div>
      )}

      {error && (
        <AuthNotice variant="error" title="تنبيه">
          {error}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Section 1: Account & Security */}
        <div className="business-auth-section-divider space-y-3">
          <div className="business-auth-section-title">
            <LockClosedIcon className="business-auth-section-icon" />
            {hasExistingAccount ? "تأكيد ملكية حسابك في MaxP" : "بيانات الحساب والدخول"}
          </div>

          <div className="business-auth-field">
            <label className="business-auth-label">البريد الإلكتروني *</label>
            <input
              type="email"
              name="email"
              required
              readOnly={!!invitation?.prefilledEmail}
              value={formData.email}
              onChange={handleChange}
              placeholder="example@domain.com"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              className={`business-auth-input business-auth-input--ltr ${
                invitation?.prefilledEmail ? "business-auth-input--readonly" : ""
              }`}
            />
            {invitation?.prefilledEmail && (
              <p className="business-auth-hint">
                تم تقييد هذا الرابط بهذا البريد الإلكتروني من قِبل إدارة الشركة.
              </p>
            )}
          </div>

          {hasExistingAccount ? (
            <div className="business-auth-field">
              <label className="business-auth-label">كلمة المرور الحالية لحسابك *</label>
              <div className="business-auth-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="أدخل كلمة مرور حسابك لتأكيد الهوية"
                  dir="ltr"
                  autoComplete="current-password"
                  className="business-auth-input business-auth-input--ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="business-auth-password-toggle"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="business-auth-hint">
                سيتم الاحتفاظ بكلمة مرورك الحالية وحسابك الأصلي وربطه بشركة {invitation?.companyName || "العمل"}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="business-auth-field">
                <label className="business-auth-label">كلمة المرور *</label>
                <div className="business-auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="6 أحرف على الأقل"
                    dir="ltr"
                    autoComplete="new-password"
                    className="business-auth-input business-auth-input--ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="business-auth-password-toggle"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="business-auth-field">
                <label className="business-auth-label">تأكيد كلمة المرور *</label>
                <div className="business-auth-password-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="أعد إدخال كلمة المرور"
                    dir="ltr"
                    autoComplete="new-password"
                    className="business-auth-input business-auth-input--ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="business-auth-password-toggle"
                    aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Personal & HR Details */}
        <div className="space-y-3">
          <div className="business-auth-section-title">
            <UserIcon className="business-auth-section-icon" />
            {hasExistingAccount ? "بيانات العمل التكميلية (اختياري)" : "البيانات الشخصية"}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">الاسم الأول *</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="مثال: محمد"
                autoComplete="given-name"
                className="business-auth-input"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">اسم العائلة *</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="مثال: أحمد"
                autoComplete="family-name"
                className="business-auth-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">رقم الهاتف / الواتساب</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="010XXXXXXXX"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                className="business-auth-input business-auth-input--ltr"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">الرقم القومي / رقم الهوية</label>
              <input
                type="text"
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                placeholder="14 رقماً"
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                className="business-auth-input business-auth-input--ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">تاريخ الميلاد</label>
              <DateInput
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="business-auth-date-wrap"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">النوع</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="business-auth-input"
              >
                <option value="MALE">ذكر</option>
                <option value="FEMALE">أنثى</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">المدينة</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="القاهرة، الجيزة، الإسكندرية..."
                autoComplete="address-level2"
                className="business-auth-input"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">العنوان بالتفصيل</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="الشارع، الحي، المنطقة..."
                autoComplete="street-address"
                className="business-auth-input"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="business-primary-button w-full mt-2 font-semibold active:scale-[0.98] transition-all"
        >
          {submitting
            ? "جاري المعالجة والربط..."
            : hasExistingAccount
            ? "تأكيد الحساب والانضمام لفريق العمل"
            : "إتمام التسجيل والانضمام لفريق العمل"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default JoinEmployee;
