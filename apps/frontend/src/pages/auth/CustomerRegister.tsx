import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import { tokenManager } from "../../utils/tokenManager";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";

const CustomerRegister: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Already-logged-in customers should not see the login form again.
  useEffect(() => {
    try {
      const token = tokenManager.getAccessToken();
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.role === "CUSTOMER") {
          navigate("/account", { replace: true });
        }
      }
    } catch {
      // ignore malformed token
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");

      const searchParams = new URLSearchParams(window.location.search);
      const companyIdFromQuery = searchParams.get("companyId");
      const companyIdFromPath =
        typeof params.companyId === "string" ? params.companyId : null;
      const companyIdFromStorage = localStorage.getItem("storefront_companyId");
      const companyId = (
        companyIdFromQuery ||
        companyIdFromPath ||
        companyIdFromStorage ||
        ""
      ).trim();

      if (companyIdFromQuery) {
        localStorage.setItem("storefront_companyId", companyIdFromQuery);
      }

      if (!companyIdFromQuery && companyIdFromPath) {
        localStorage.setItem("storefront_companyId", companyIdFromPath);
      }

      const normalizedPhone = phone.trim();
      if (!normalizedPhone) {
        throw new Error("رقم الهاتف مطلوب");
      }

      if (!companyId) {
        throw new Error(
          "لا يمكن تحديد الشركة. افتح الرابط من داخل متجر الشركة أو أضف companyId إلى الرابط.",
        );
      }

      const response = await apiClient.post(
        `/public/customers/login-phone?companyId=${encodeURIComponent(companyId)}`,
        { phone: normalizedPhone },
      );

      if (response.data?.success && response.data?.data?.token) {
        tokenManager.setAccessToken(response.data.data.token);
        setSuccessMessage("تم تسجيل الدخول بنجاح");
        navigate("/account");
        return;
      }

      setError(response.data?.message || "تعذر تسجيل الدخول");
    } catch (err) {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        error.response?.data?.message || error.message || "حدث خطأ أثناء التسجيل",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="دخول العملاء"
      description="سجّل دخولك برقم الهاتف للوصول السريع والآمن إلى تفاعلاتك وخدماتك."
      eyebrow="Customer Access"
      footer={
        <div className="business-auth-footer-stack">
          <div className="business-auth-link-row">
            <span>لديك حساب شركة للوحة التحكم؟</span>
            <Link to="/auth/login">تسجيل الدخول للمنصة</Link>
          </div>
          <p className="business-auth-legal">
            تسجيل دخول العملاء يعتمد على أرقام الهواتف الموثقة داخل النظام.
          </p>
        </div>
      }
    >
      {error ? (
        <AuthNotice variant="error" title="تعذر إكمال العملية">
          {error}
        </AuthNotice>
      ) : null}

      {successMessage ? (
        <AuthNotice variant="success" title="تم التنفيذ">
          {successMessage}
        </AuthNotice>
      ) : null}

      <form onSubmit={handleSubmit} className="business-auth-form">
        <div className="business-auth-field">
          <label htmlFor="phone" className="business-auth-label">
            رقم الهاتف
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              if (error) setError("");
            }}
            required
            className="business-auth-input business-auth-input--ltr"
            placeholder="01xxxxxxxxx"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="business-primary-button"
        >
          {isLoading ? (
            <span className="business-inline-loader">
              <LoadingSpinner size="sm" color="white" />
              <span>جاري الدخول...</span>
            </span>
          ) : (
            "دخول"
          )}
        </button>
      </form>
    </AuthSurface>
  );
};

export default CustomerRegister;
