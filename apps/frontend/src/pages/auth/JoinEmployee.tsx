import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  IdentificationIcon,
  MapPinIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { tokenManager } from "../../utils/tokenManager";
import { toast } from "sonner";

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
            email: inv.prefilledEmail || "",
            phone: inv.prefilledPhone || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
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

    try {
      setSubmitting(true);
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
        nationalId: formData.nationalId.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
      };

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

        toast.success("تم تسجيل بياناتك وحسابك بنجاح!");
        setTimeout(() => {
          navigate("/conversations");
        }, 1800);
      } else {
        setError(response.data?.message || "فشل إتمام التسجيل");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "حدث خطأ أثناء إتمام التسجيل");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthSurface
        title="جاري فحص رابط الدعوة"
        description="نراجع تفاصيل المنصب والشركة لتهيئة استمارة الانضمام الخاصة بك."
        eyebrow="Employee Verification"
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
        eyebrow="Invitation Notice"
        icon={<ExclamationTriangleIcon className="h-7 w-7 text-amber-500" />}
      >
        <AuthNotice variant="error" title="تنبيه الدعوة">
          {error}
        </AuthNotice>

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
        eyebrow="Onboarding Complete"
        icon={<CheckCircleIcon className="h-7 w-7 text-emerald-500" />}
        companyName={invitation?.companyName}
        companyLogo={invitation?.companyLogo}
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
      eyebrow="Employee Self-Onboarding"
      wide={true}
      companyName={invitation?.companyName}
      companyLogo={invitation?.companyLogo}
      footer={
        <div className="business-auth-link-row text-xs text-zinc-500">
          هل لديك حساب مسجل بالفعل؟{" "}
          <button
            type="button"
            className="business-auth-inline-link font-medium underline"
            onClick={() => navigate("/auth/login")}
          >
            تسجيل الدخول
          </button>
        </div>
      }
    >
      {/* Position Badge Card */}
      {invitation && (
        <div className="mb-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BriefcaseIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-500 block">الوظيفة المعروضة:</span>
              <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                {invitation.positionTitle || "عضو فريق العمل"}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invitation.departmentName && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                {invitation.departmentName}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
              {roleDisplayMap[invitation.role] || invitation.role}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
              {contractDisplayMap[invitation.contractType] || invitation.contractType}
            </span>
          </div>
        </div>
      )}

      {error && (
        <AuthNotice variant="error" title="تنبيه">
          {error}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Section 1: Account & Security */}
        <div className="space-y-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <LockClosedIcon className="h-4 w-4 text-blue-500" />
            بيانات الحساب والدخول
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
              className={`business-auth-input ${
                invitation?.prefilledEmail
                  ? "bg-zinc-100 dark:bg-zinc-800/60 cursor-not-allowed text-zinc-600 dark:text-zinc-400"
                  : ""
              }`}
            />
            {invitation?.prefilledEmail && (
              <p className="text-[11px] text-zinc-500 mt-1">
                تم تقييد هذا الرابط بهذا البريد الإلكتروني من قِبل إدارة الشركة.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">كلمة المرور *</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="6 أحرف على الأقل"
                className="business-auth-input"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">تأكيد كلمة المرور *</label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="أعد إدخال كلمة المرور"
                className="business-auth-input"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Personal & HR Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <UserIcon className="h-4 w-4 text-blue-500" />
            البيانات الشخصية
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
                className="business-auth-input"
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
                className="business-auth-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="business-auth-field">
              <label className="business-auth-label">تاريخ الميلاد</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="business-auth-input"
              />
            </div>
            <div className="business-auth-field">
              <label className="business-auth-label">النوع</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="business-auth-input h-[42px]"
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
          {submitting ? "جاري إنشاء الحساب وملف العمل..." : "إتمام التسجيل والانضمام لفريق العمل"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default JoinEmployee;
