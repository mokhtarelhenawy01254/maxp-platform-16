import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import { tokenManager } from "../../utils/tokenManager";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";

const CustomerRegister: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");

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

      if (step === "PHONE") {
        const response = await apiClient.post(
          `/public/customers/request-otp?companyId=${encodeURIComponent(companyId)}`,
          { phone: normalizedPhone },
        );

        if (response.data?.success) {
          setSuccessMessage("تم إرسال كود التحقق على واتساب");
          setStep("OTP");
          return;
        }

        setError(response.data?.message || "تعذر إرسال كود التحقق");
        return;
      }

      const normalizedCode = code.trim();
      if (!normalizedCode || normalizedCode.length !== 4) {
        throw new Error("يرجى إدخال كود مكوّن من 4 أرقام");
      }

      const response = await apiClient.post(
        `/public/customers/verify-otp?companyId=${encodeURIComponent(companyId)}`,
        {
          phone: normalizedPhone,
          code: normalizedCode,
        },
      );

      if (response.data?.success && response.data?.data?.token) {
        tokenManager.setAccessToken(response.data.data.token);
        setSuccessMessage("تم تسجيل الدخول بنجاح");
        navigate("/account/whatsapp");
        return;
      }

      setError(response.data?.message || "تعذر تسجيل الدخول");
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "حدث خطأ أثناء التسجيل",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSurface
      title="دخول العملاء"
      description="سجّل دخولك برقم واتساب المرتبط بالحساب للوصول السريع والآمن إلى تفاعلاتك وخدماتك."
      eyebrow="Customer Access"
      footer={
        <div className="business-auth-footer-stack">
          <div className="business-auth-link-row">
            <span>لديك حساب شركة للوحة التحكم؟</span>
            <Link to="/auth/login">تسجيل الدخول للمنصة</Link>
          </div>
          <p className="business-auth-legal">
            تسجيل دخول العملاء يعتمد على أرقام واتساب الموثقة داخل النظام.
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
            رقم الهاتف المرتبط بواتساب
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
            disabled={isLoading || step === "OTP"}
          />
        </div>

        {step === "OTP" ? (
          <div className="business-auth-field">
            <label htmlFor="code" className="business-auth-label">
              كود التحقق
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                if (error) setError("");
              }}
              required
              className="business-auth-input business-auth-code-input"
              placeholder="1234"
              maxLength={4}
              disabled={isLoading}
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="business-primary-button"
        >
          {isLoading ? (
            <span className="business-inline-loader">
              <LoadingSpinner size="sm" color="white" />
              <span>جاري التحقق...</span>
            </span>
          ) : step === "PHONE" ? (
            "إرسال كود واتساب"
          ) : (
            "تأكيد الدخول"
          )}
        </button>
      </form>
    </AuthSurface>
  );
};

export default CustomerRegister;
