import { Check as CheckIcon, Eye as EyeIcon, EyeOff as EyeSlashIcon, Lock as LockClosedIcon } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
;
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const passwordRules = [
  {
    id: "length",
    label: "8 أحرف على الأقل",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "upper",
    label: "حرف كبير واحد على الأقل",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "lower",
    label: "حرف صغير واحد على الأقل",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "رقم واحد على الأقل",
    test: (password: string) => /\d/.test(password),
  },
  {
    id: "symbol",
    label: "رمز خاص واحد على الأقل",
    test: (password: string) => /[@$!%*?&]/.test(password),
  },
];

const ResetPassword: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  useEffect(() => {
    if (!token) {
      toast.error("رمز إعادة التعيين غير صحيح");
      navigate("/auth/forgot-password");
    }
  }, [navigate, token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);

      await apiClient.post("/auth/reset-password", {
        token,
        password: data.password,
      });

      setIsSuccess(true);
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message ||
        "فشل في إعادة تعيين كلمة المرور";
      setError("root", { message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  if (isSuccess) {
    return (
      <AuthSurface
        title="تم تحديث كلمة المرور"
        description="أصبح بإمكانك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة."
        eyebrow="Password Updated"
        icon={<CheckIcon className="h-7 w-7" />}
        visualTitle={
          <>
            تم بنجاح <br />
            <span style={{ color: "var(--auth-accent)" }}>أمن</span> حسابك
          </>
        }
        visualDescription="لقد قمت بتحديث كلمة المرور الخاصة بك. تذكر دائماً استخدام كلمات مرور قوية وفريدة."
        visualBadge="اكتمل التحديث"
      >
        <div style={{ marginTop: '2rem' }}>
          <Link to="/auth/login" className="elite-submit-button">
            الذهاب إلى تسجيل الدخول
          </Link>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface
      title="إعادة تعيين كلمة المرور"
      description="اختر كلمة مرور قوية لتأمين الوصول إلى مساحة العمل الجديدة."
      eyebrow="Set New Password"
      icon={<LockClosedIcon className="h-7 w-7" />}
      footer={
        <div className="elite-form-link-row">
          <Link to="/auth/login" className="elite-form-link">العودة إلى تسجيل الدخول</Link>
        </div>
      }
      visualTitle={
        <>
          قوة <br />
          <span style={{ color: "var(--auth-accent)" }}>التشفير</span> في يدك
        </>
      }
      visualDescription="نحن نستخدم أعلى معايير التشفير العالمي لضمان أن بياناتك وكلمات مرورك في أمان تام."
      visualBadge="حماية البيانات"
    >
      {errors.root ? (
        <AuthNotice variant="error" title="تعذر تحديث كلمة المرور">
          {errors.root.message}
        </AuthNotice>
      ) : null}

      <form className="elite-form-content" onSubmit={handleSubmit(onSubmit)}>
        <div className="elite-input-group">
          <label htmlFor="password" className="elite-label">
            كلمة المرور الجديدة
          </label>
          <div className="elite-input-wrapper">
            <input
              {...register("password", {
                required: "كلمة المرور مطلوبة",
                minLength: {
                  value: 8,
                  message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
                },
                pattern: {
                  value:
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message:
                    "كلمة المرور يجب أن تحتوي على حروف كبيرة وصغيرة وأرقام ورموز",
                },
              })}
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              className="elite-input"
              placeholder="أدخل كلمة مرور قوية"
            />
            <button
              type="button"
              className="elite-input-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-rose-600 mt-1 text-right">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="elite-input-group">
          <label htmlFor="confirmPassword" className="elite-label">
            تأكيد كلمة المرور
          </label>
          <div className="elite-input-wrapper">
            <input
              {...register("confirmPassword", {
                required: "تأكيد كلمة المرور مطلوب",
                validate: (value) =>
                  value === password || "كلمتا المرور غير متطابقتين",
              })}
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              className="elite-input"
              placeholder="أعد إدخال كلمة المرور"
            />
            <button
              type="button"
              className="elite-input-password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-xs text-rose-600 mt-1 text-right">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <div className="business-auth-requirements" style={{ margin: '1.5rem 0', textAlign: 'right' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.75rem', color: '#1e293b' }}>متطلبات كلمة المرور</h4>
          <div className="business-auth-requirement-list" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
            {passwordRules.map((rule) => (
              <div
                key={rule.id}
                className="business-auth-requirement"
                data-met={rule.test(password)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  fontSize: '0.75rem',
                  color: rule.test(password) ? '#10b981' : '#94a3b8'
                }}
              >
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: rule.test(password) ? '#10b981' : '#cbd5e1' 
                }} />
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="elite-submit-button"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" color="white" />
              <span>جاري إعادة التعيين...</span>
            </>
          ) : (
            "إعادة تعيين كلمة المرور"
          )}
        </button>
      </form>
    </AuthSurface>
  );
};

export default ResetPassword;
