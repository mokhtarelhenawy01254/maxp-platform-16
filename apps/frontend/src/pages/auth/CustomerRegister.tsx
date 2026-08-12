import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import { tokenManager } from "../../utils/tokenManager";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";
import { AuthNotice, AuthSurface } from "../../components/auth/AuthSurface";

const CustomerRegister: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // الشركة الحالية (لأغراض عرض الهوية) — من الرابط أو subdomain المتجر
  const brandingCompanyId = (() => {
    const fromQuery = new URLSearchParams(window.location.search).get("companyId");
    const fromPath = typeof params.companyId === "string" ? params.companyId : null;
    const fromStorage = localStorage.getItem("storefront_companyId");
    const subdomain = (() => {
      const host = window.location.hostname.split(".");
      if (host.length >= 3 && host[0] !== "www") return host[0];
      return null;
    })();
    return (fromQuery || fromPath || fromStorage || subdomain || "").trim() || null;
  })();
  const branding = useCompanyBranding(brandingCompanyId);

  // فحص هل الرقم عنده باسورد — حقل الباسورد يظهر فقط لو في باسورد
  useEffect(() => {
    const p = phone.trim();
    if (p.length < 10) {
      setHasPassword(null);
      setPassword("");
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get("/public/customers/has-password", {
          params: { phone: p, companyId: brandingCompanyId || undefined },
        });
        setHasPassword(!!res.data?.data?.hasPassword);
      } catch {
        setHasPassword(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, brandingCompanyId]);

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
      // على subdomain المتجر (مثل swan.maxp.online) بيبقى أول جزء من الـ hostname هو slug الشركة
      const subdomainCompany = (() => {
        const host = window.location.hostname.split(".");
        if (host.length >= 3 && host[0] !== "www") return host[0];
        return null;
      })();
      const companyId = (
        companyIdFromQuery ||
        companyIdFromPath ||
        companyIdFromStorage ||
        subdomainCompany ||
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
        { phone: normalizedPhone, password: password.trim() || undefined },
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
      companyLogo={branding.logo}
      companyName={branding.name || null}
      companyAccent={branding.accent || undefined}
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

        {hasPassword === true ? (
          <div className="business-auth-field">
            <label htmlFor="password" className="business-auth-label">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError("");
              }}
              required
              className="business-auth-input"
              placeholder="••••••"
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
