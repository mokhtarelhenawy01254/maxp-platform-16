import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Lock,
  User,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";
import { tokenManager } from "../../utils/tokenManager";

interface InvitationData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyName: string;
  inviterName: string;
  expiresAt: string;
}

const roleLabels: Record<string, string> = {
  COMPANY_ADMIN: "مدير الشركة",
  MANAGER: "مدير",
  AGENT: "موظف",
  AFFILIATE: "مسوق بالعمولة",
  SUPER_ADMIN: "مدير النظام",
};

const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("رابط الدعوة غير صحيح");
      setLoading(false);
      return;
    }

    const verifyInvitation = async () => {
      try {
        const response = await apiClient.get(`/invitations/verify/${token}`);
        if (response.data?.success) {
          setInvitation(response.data.data?.invitation);
        } else {
          setError(response.data?.message || "فشل في التحقق من الدعوة");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "فشل في التحقق من الدعوة");
      } finally {
        setLoading(false);
      }
    };

    void verifyInvitation();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!password) {
      setError("كلمة المرور مطلوبة");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post(`/invitations/accept/${token}`, {
        password,
      });

      if (response.data?.success) {
        setSuccess(true);
        tokenManager.setAccessToken(response.data.data.token);
        if (response.data.data.refreshToken) {
          tokenManager.setRefreshToken(response.data.data.refreshToken);
        }
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        setTimeout(() => navigate("/conversations"), 1500);
      } else {
        setError(response.data?.message || "فشل في قبول الدعوة");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل في قبول الدعوة");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthSurface
        title="جاري التحقق من الدعوة"
        description="نراجع بيانات الفريق والصلاحية قبل إتمام إنشاء الحساب."
        eyebrow="Invitation Check"
      >
        <div className="business-auth-loader-block">
          <div className="business-auth-loader" />
          <p>يتم التحقق من الرابط وتأمين الوصول لفريقك.</p>
        </div>
      </AuthSurface>
    );
  }

  if (error && !invitation) {
    return (
      <AuthSurface
        title="تعذر فتح الدعوة"
        description="الرابط غير صالح أو انتهت صلاحيته. يمكنك العودة لصفحة تسجيل الدخول وطلب دعوة جديدة."
        eyebrow="Invitation Error"
        icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
      >
        <AuthNotice variant="error" title="خطأ في الدعوة">
          {error}
        </AuthNotice>

        <div className="business-auth-actions">
          <button
            type="button"
            className="business-primary-button"
            onClick={() => navigate("/auth/login")}
          >
            العودة إلى تسجيل الدخول
          </button>
        </div>
      </AuthSurface>
    );
  }

  if (success) {
    return (
      <AuthSurface
        title="تم إنشاء الحساب بنجاح"
        description="تم تفعيل حسابك داخل الفريق، وسيتم تحويلك إلى لوحة التحكم خلال لحظات."
        eyebrow="Team Access Ready"
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
      >
        <div className="business-auth-loader-block">
          <div className="business-auth-loader" />
          <p>يتم تجهيز مساحة العمل الخاصة بك الآن.</p>
        </div>
      </AuthSurface>
    );
  }

  return (
    <AuthSurface
      title="قبول الدعوة والانضمام للفريق"
      description="أكمل إنشاء كلمة المرور لتفعيل حسابك داخل الشركة والانطلاق بنفس الثيم المؤسسي الجديد."
      eyebrow="Join The Team"
      icon={<Lock className="h-6 w-6 text-primary" />}
      footer={
        <div className="business-auth-link-row">
          <button
            type="button"
            className="business-auth-inline-link"
            onClick={() => navigate("/auth/login")}
          >
            تسجيل الدخول إذا كان لديك حساب بالفعل
          </button>
        </div>
      }
    >
      {invitation ? (
        <div className="business-auth-summary">
          <div className="business-auth-summary-item">
            <User className="h-4 w-4 text-primary" />
            <div>
              <span>الاسم</span>
              <strong>
                {invitation.firstName} {invitation.lastName}
              </strong>
            </div>
          </div>
          <div className="business-auth-summary-item">
            <Mail className="h-4 w-4 text-primary" />
            <div>
              <span>البريد الإلكتروني</span>
              <strong>{invitation.email}</strong>
            </div>
          </div>
          <div className="business-auth-summary-item">
            <Building2 className="h-4 w-4 text-primary" />
            <div>
              <span>الشركة</span>
              <strong>{invitation.companyName}</strong>
            </div>
          </div>
          <div className="business-auth-summary-item">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <div>
              <span>الدور</span>
              <strong>{roleLabels[invitation.role] || invitation.role}</strong>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <AuthNotice variant="error" title="تعذر قبول الدعوة">
          {error}
        </AuthNotice>
      ) : null}

      <form onSubmit={handleSubmit} className="business-auth-form">
        <div className="business-auth-field">
          <label htmlFor="password" className="business-auth-label">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="business-auth-input"
            placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
            disabled={submitting}
          />
        </div>

        <div className="business-auth-field">
          <label htmlFor="confirmPassword" className="business-auth-label">
            تأكيد كلمة المرور
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="business-auth-input"
            placeholder="أعد إدخال كلمة المرور"
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="business-primary-button"
        >
          {submitting ? "جاري إنشاء الحساب..." : "قبول الدعوة وإنشاء الحساب"}
        </button>
      </form>
    </AuthSurface>
  );
};

export default AcceptInvitation;
