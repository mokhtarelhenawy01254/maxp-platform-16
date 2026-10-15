import React, { useState } from "react";
import { apiClient } from "../../services/apiClient";
import {
  getBaseDomain,
  getCurrentSubdomain,
  isLocalLikeDomain,
} from "../../utils/storeUrl";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { trackPlatformSiteCompleteRegistration } from "../../utils/platformSiteMetaPixel";
import {
  Store,
  Mail,
  Lock,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
  RotateCw,
  Info,
  ArrowRight
} from "lucide-react";

interface ApiSuccess<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ApiErrorLike {
  response?: {
    data?: {
      message?: unknown;
    };
  };
}

const getSubmitErrorMessage = (error: unknown) => {
  const message = (error as ApiErrorLike)?.response?.data?.message;
  return typeof message === "string" && message.trim()
    ? message
    : "حدث خطأ أثناء التسجيل";
};

const PublicMerchantRegister: React.FC = () => {
  const subdomain = getCurrentSubdomain();
  const requiresCompanyIdentifier = !subdomain;
  const [loading, setLoading] = useState(false);
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });

  const getLoginUrl = () => {
    const baseDomain = getBaseDomain();
    const protocol = window.location.protocol;
    const currentOrigin = window.location.origin;

    if (isLocalLikeDomain(window.location.host) || isLocalLikeDomain(baseDomain)) {
      return `${currentOrigin}/auth/login`;
    }

    return `${protocol}//${baseDomain}/auth/login`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requiresCompanyIdentifier && !companyIdentifier.trim()) {
      tToast.error("PublicMerchantRegister.msg_79bb");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        ...(requiresCompanyIdentifier
          ? { companyId: companyIdentifier.trim() }
          : {}),
      };

      const response = await apiClient.post<
        ApiSuccess<unknown>,
        typeof payload
      >(
        "/public/merchants/register",
        payload,
      );

      if (response.data.success) {
        tToast.success("PublicMerchantRegister.success_create_account_4e42");
        trackPlatformSiteCompleteRegistration("merchant_public_register", {
          destination: "pending-review",
          subdomain: subdomain || "root",
        });
        setFormData({
          name: "",
          email: "",
          password: "",
          phone: "",
          address: "",
        });
      }
    } catch (error: unknown) {
      toast.error(getSubmitErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 text-foreground" dir="rtl">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Header Chassis */}
        <div className="rounded-xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Store className="h-3.5 w-3.5" />
              <span>تسجيل شركاء النجاح والتجار</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              تسجيل تاجر جديد
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              انضم كتاجر مورد أو دروب شيبنج لربط منتجاتك ومزامنة الطلبيات تلقائياً.
            </p>
          </div>
        </div>

        {requiresCompanyIdentifier && (
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-xs leading-relaxed text-primary">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              أنت تسجل من خلال النطاق الرئيسي؛ يرجى إدخال اسم أو رابط المتجر (Slug) لربط حسابك بالمتجر المطلوب.
            </div>
          </div>
        )}

        {/* Registration Form Chassis */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-border/70 bg-card p-6 shadow-sm space-y-4">
          {requiresCompanyIdentifier && (
            <div>
              <label htmlFor="companyIdentifier" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                معرف أو رابط المتجر (Store Slug) *
              </label>
              <input
                id="companyIdentifier"
                type="text"
                name="companyIdentifier"
                value={companyIdentifier}
                onChange={(e) => setCompanyIdentifier(e.target.value)}
                placeholder="مثال: main-store"
                className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="merchantName" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              اسم التاجر أو الشركة *
            </label>
            <input
              id="merchantName"
              type="text"
              name="name"
              autoComplete="organization"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="اسم النشاط التجاري"
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="merchantEmail" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              البريد الإلكتروني للتاجر *
            </label>
            <input
              id="merchantEmail"
              type="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="merchant@example.com"
              dir="ltr"
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
              required
            />
          </div>

          <div>
            <label htmlFor="merchantPassword" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              كلمة مرور حساب التاجر (8 أحرف على الأقل) *
            </label>
            <input
              id="merchantPassword"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              تُستخدم لتسجيل الدخول إلى بورتال التاجر ومتابعة المنتجات والطلبيات.
            </p>
          </div>

          <div>
            <label htmlFor="merchantPhone" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              رقم الهاتف / واتساب للتواصل
            </label>
            <input
              id="merchantPhone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01xxxxxxxxx"
              dir="ltr"
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-right"
            />
          </div>

          <div>
            <label htmlFor="merchantAddress" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              عنوان المستودع أو مقر النشاط
            </label>
            <textarea
              id="merchantAddress"
              name="address"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              placeholder="المدينة، الحي، تفاصيل الاستلام..."
              className="w-full rounded-lg border border-border/70 bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Guidelines Box */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3.5">
            <h3 className="text-xs font-semibold text-foreground mb-1.5">شروط شراكة التوريد</h3>
            <ul className="space-y-1 text-[11px] leading-relaxed text-muted-foreground">
              <li>• التاجر مسؤول عن دقة المخزون وتجهيز الطلبيات في المواعيد المحددة.</li>
              <li>• يتم اعتماد نسب العمولة وربط المنتجات بعد مراجعة الحساب.</li>
              <li>• تحويل مستحقات المبيعات دورياً وفق اتفاقية التوريد.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="submit"
              disabled={loading || (requiresCompanyIdentifier && !companyIdentifier.trim())}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>تقديم طلب التسجيل كتاجر</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = getLoginUrl())}
              className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-background px-4 py-2.5 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
            >
              تسجيل الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMerchantRegister;
