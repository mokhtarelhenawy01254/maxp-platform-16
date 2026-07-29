import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface ApiSuccess<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  location?: string | null;
  isActive?: boolean;
}

interface ShippingCompanyOption {
  id: string;
  name: string;
  slug?: string | null;
  isActive?: boolean;
}

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }

  return fallback;
};

const MerchantRegister: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [shippingCompanies, setShippingCompanies] = useState<
    ShippingCompanyOption[]
  >([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    commissionRate: 10.0,
    autoFulfill: false,
    fulfillmentMode: "MERCHANT",
    defaultWarehouseId: "",
    defaultShippingCompanyId: "",
    webhookUrl: "",
    isActive: true,
  });

  useEffect(() => {
    const loadFulfillmentOptions = async () => {
      try {
        setOptionsLoading(true);
        const [warehousesRes, shippingCompaniesRes] = await Promise.all([
          apiClient.get<ApiSuccess<WarehouseOption[]>>("/warehouses"),
          apiClient.get<ApiSuccess<ShippingCompanyOption[]>>(
            "/shipping-companies",
          ),
        ]);

        setWarehouses(
          (warehousesRes.data.data || []).filter(
            (warehouse) => warehouse.isActive !== false,
          ),
        );
        setShippingCompanies(
          (shippingCompaniesRes.data.data || []).filter(
            (company) => company.isActive !== false,
          ),
        );
      } catch (error: unknown) {
        toast.error(
          getApiErrorMessage(
            error,
            "تعذر تحميل المخازن أو شركات الشحن المتاحة",
          ),
        );
      } finally {
        setOptionsLoading(false);
      }
    };

    loadFulfillmentOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await apiClient.post<ApiSuccess>("/merchants", formData);

      if (response.data.success) {
        tToast.success("merchants_MerchantRegister.success_login_a40a");
        navigate("/merchants");
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "حدث خطأ أثناء التسجيل"));
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              اسم التاجر
            </label>
            <input
              type="text"
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
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
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
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              كلمة مرور بورتال التاجر (اختياري)
            </label>
            <input
              type="password"
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
              placeholder="اتركها فارغة إذا لم تريد إنشاء حساب دخول"
            />
            <p
              className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              عند إدخال كلمة مرور سيتم إنشاء مستخدم بدور MERCHANT لهذا التاجر.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              الهاتف
            </label>
            <input
              type="tel"
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
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              العنوان
            </label>
            <textarea
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

          {/* Commission Rate */}
          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              نسبة العمولة (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.commissionRate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  commissionRate: parseFloat(e.target.value),
                })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              required
            />
            <p
              className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              نسبة العمولة التي يحصل عليها التاجر من كل طلب
            </p>
          </div>

          <div
            className={`${isDark ? "bg-amber-900/20 border-amber-700" : "bg-amber-50 border-amber-200"} border rounded-lg p-4`}
          >
            <h3
              className={`font-semibold ${isDark ? "text-amber-200" : "text-amber-900"} mb-2`}
            >
              إعدادات تشغيل يحددها فريق الشركة فقط
            </h3>
            <p
              className={`text-sm ${isDark ? "text-amber-100/80" : "text-amber-800"}`}
            >
              لو التاجر سجل من الصفحة العامة سيظل طلبه تحت مراجعة الشركة، وهذه
              القيم لا تظهر له ولا يستطيع تغييرها من التسجيل.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                طريقة تنفيذ الطلبات
              </label>
              <select
                value={formData.fulfillmentMode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fulfillmentMode: e.target.value,
                    defaultWarehouseId:
                      e.target.value === "COMPANY_WAREHOUSE"
                        ? formData.defaultWarehouseId
                        : "",
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="MERCHANT">التاجر يشحن من مخزونه</option>
                <option value="COMPANY_WAREHOUSE">
                  الشركة تنفذ من مخزنها
                </option>
              </select>
            </div>

            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                المخزن الافتراضي
              </label>
              <select
                value={formData.defaultWarehouseId}
                onChange={(e) =>
                  setFormData({ ...formData, defaultWarehouseId: e.target.value })
                }
                disabled={
                  optionsLoading || formData.fulfillmentMode !== "COMPANY_WAREHOUSE"
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              >
                <option value="">
                  {formData.fulfillmentMode === "COMPANY_WAREHOUSE"
                    ? "اختر مخزن الشركة"
                    : "غير مطلوب عند شحن التاجر"}
                </option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                    {warehouse.location ? ` - ${warehouse.location}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              شركة الشحن الافتراضية
            </label>
            <select
              value={formData.defaultShippingCompanyId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultShippingCompanyId: e.target.value,
                })
              }
              disabled={optionsLoading}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-60 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">بدون شركة شحن افتراضية</option>
              {shippingCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <p
              className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              تستخدم تلقائياً عند توجيه الطلبات لهذا التاجر، ويمكن تغييرها لاحقاً.
            </p>
          </div>

          {/* Webhook URL */}
          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              Webhook URL (اختياري)
            </label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={(e) =>
                setFormData({ ...formData, webhookUrl: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="https://example.com/webhook"
            />
            <p
              className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              رابط Webhook لإرسال إشعارات الطلبات تلقائياً
            </p>
          </div>

          {/* Auto Fulfill */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoFulfill"
              checked={formData.autoFulfill}
              onChange={(e) =>
                setFormData({ ...formData, autoFulfill: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="autoFulfill"
              className={`mr-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              تفعيل الوفاء التلقائي للطلبات
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="isActive"
              className={`mr-2 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              تفعيل حساب التاجر فور الإنشاء
            </label>
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
              <li>العمولات تُحسب تلقائياً عند تأكيد الطلب</li>
              <li>يمكن ربط منتجات التاجر بمنتجات المنصة</li>
              <li>الطلبات تُرسل تلقائياً للتاجر عند التأكيد</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "جاري التسجيل..." : "تسجيل كتاجر"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`px-6 py-3 border rounded-lg transition ${
                isDark
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MerchantRegister;
