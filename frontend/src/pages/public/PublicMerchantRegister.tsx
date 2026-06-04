import React, { useState } from "react";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import {
  getBaseDomain,
  getCurrentSubdomain,
  isLocalLikeDomain,
} from "../../utils/storeUrl";
import toast from "react-hot-toast";
import { trackPlatformSiteCompleteRegistration } from "../../utils/platformSiteMetaPixel";

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
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
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

  // بناء رابط الدخول بعد التسجيل
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
      toast.error("أدخل رابط الشركة أو الـ slug الخاص بها أولاً");
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
        toast.success("تم إنشاء حساب التاجر بنجاح! يمكنك تسجيل الدخول بعد تفعيل الشركة لحسابك");
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
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
    >
      <div
        className={`max-w-2xl mx-auto ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8`}
      >
        <h1
          className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"} mb-2`}
        >
          تسجيل تاجر جديد
        </h1>
        <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
          انضم كتاجر للدروب شيبنج وابدأ في بيع منتجاتك
        </p>

        {requiresCompanyIdentifier && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              isDark
                ? "border-blue-800 bg-blue-900/30 text-blue-200"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            أنت تفتح الصفحة من الدومين الرئيسي، لذلك نحتاج رابط الشركة أو
            الـ <span className="font-semibold">slug</span> الخاص بها لربط
            طلبك بالمتجر الصحيح.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {requiresCompanyIdentifier && (
            <div>
              <label
                htmlFor="companyIdentifier"
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                رابط الشركة أو الـ slug
              </label>
              <input
                id="companyIdentifier"
                type="text"
                name="companyIdentifier"
                value={companyIdentifier}
                onChange={(e) => setCompanyIdentifier(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                placeholder="مثال: demo-store"
                required
              />
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="merchantName"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              اسم التاجر
            </label>
            <input
              id="merchantName"
              type="text"
              name="name"
              autoComplete="organization"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="اسم التاجر أو الشركة"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="merchantEmail"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              البريد الإلكتروني
            </label>
            <input
              id="merchantEmail"
              type="email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="email@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="merchantPassword"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              كلمة مرور حساب التاجر
            </label>
            <input
              id="merchantPassword"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="8 أحرف على الأقل"
              required
            />
            <p
              className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              سيتم استخدام هذه البيانات للدخول إلى بورتال التاجر بعد الموافقة.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="merchantPhone"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              الهاتف
            </label>
            <input
              id="merchantPhone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="01xxxxxxxxx"
            />
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="merchantAddress"
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              العنوان
            </label>
            <textarea
              id="merchantAddress"
              name="address"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="عنوان التاجر"
            />
          </div>

          {/* Terms */}
          <div
            className={`${isDark ? "bg-blue-900/30 border-blue-700" : "bg-blue-50 border-blue-200"} border rounded-lg p-4`}
          >
            <h3
              className={`font-semibold ${isDark ? "text-blue-300" : "text-blue-900"} mb-2`}
            >
              شروط وأحكام البرنامج
            </h3>
            <ul
              className={`text-sm space-y-1 list-disc list-inside ${isDark ? "text-blue-200" : "text-blue-800"}`}
            >
              <li>التاجر مسؤول عن توفير المنتجات وتوصيلها</li>
              <li>الشركة تحدد العمولة وإعدادات الربط الآلي بعد مراجعة التاجر</li>
              <li>يمكن ربط منتجات التاجر بمنتجات المنصة</li>
              <li>الطلبات تُرسل تلقائياً للتاجر عند التأكيد</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={
                loading || (requiresCompanyIdentifier && !companyIdentifier.trim())
              }
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "جاري التسجيل..." : "تسجيل كتاجر"}
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = getLoginUrl())}
              className={`px-6 py-3 border rounded-lg transition ${
                isDark
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              لدي حساب بالفعل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicMerchantRegister;
