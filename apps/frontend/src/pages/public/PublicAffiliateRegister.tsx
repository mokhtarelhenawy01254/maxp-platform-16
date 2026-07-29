import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import {
  getBaseDomain,
  getCurrentSubdomain,
  isLocalLikeDomain,
} from "../../utils/storeUrl";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";

interface AffiliateProgram {
  commissionType?: string;
  commissionRate?: number;
  cookieDuration?: number;
  termsAndConditions?: string;
  isActive?: boolean;
  autoApproveAffiliates?: boolean;
  defaultMinPayout?: number;
  defaultCanCreateOrdersForOthers?: boolean;
  defaultCanViewCustomerData?: boolean;
  requireIdentityDocument?: boolean;
  identityDocumentLabel?: string;
  payoutSlaDays?: number;
  platformMarginType?: string;
  platformMarginValue?: number;
}

interface CompanyProfile {
  id: string;
  name: string;
  logo?: string | null;
  slug: string;
  affiliateProgram?: AffiliateProgram;
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const PublicAffiliateRegister: React.FC = () => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const subdomain = getCurrentSubdomain();

  // Use subdomain if available using standard utility, otherwise fallback to route param
  const slug = subdomain || routeSlug;

  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(Boolean(slug));
  const [companyError, setCompanyError] = useState("");
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    paymentMethod: "",
    paymentDetails: {
      bankAccount: "",
      phoneNumber: "",
      bankName: "",
    },
  });

  useEffect(() => {
    if (!slug) {
      setCompany(null);
      setCompanyLoading(false);
      setCompanyError("");
      return;
    }

    let isCancelled = false;

    const loadCompany = async () => {
      try {
        setCompanyLoading(true);
        setCompanyError("");

        const response = await apiClient.get<ApiSuccess<CompanyProfile>>(
          `/public/affiliates/companies/${encodeURIComponent(slug)}`,
        );

        if (!isCancelled && response.data.success) {
          setCompany(response.data.data);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setCompany(null);
          setCompanyError(
            error.response?.data?.message || "تعذر تحميل بيانات الشركة",
          );
        }
      } finally {
        if (!isCancelled) {
          setCompanyLoading(false);
        }
      }
    };

    loadCompany();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  const termsList = useMemo(() => {
    const dynamicTerms =
      company?.affiliateProgram?.termsAndConditions
        ?.split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean) || [];

    if (dynamicTerms.length > 0) {
      return dynamicTerms;
    }

    return [
      "العمولات تصبح قابلة للسحب بعد تأكيد الطلب واستحقاقها",
      "يمكنك سحب الأرباح عند الوصول للحد الأدنى المحدد من الشركة",
      "الدفع يتم خارج المنصة ويتم تسجيله بعد الدفع الفعلي",
      "صلاحيات إنشاء الطلبات المباشرة وبيانات العملاء تحددها الشركة",
    ];
  }, [company?.affiliateProgram?.termsAndConditions]);

  const isProgramInactive = Boolean(
    slug && company?.affiliateProgram?.isActive === false,
  );
  const isScopedCompanyUnavailable = Boolean(
    slug && !companyLoading && (!company || companyError),
  );

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

    if (companyLoading) {
      return;
    }

    if (isProgramInactive) {
      tToast.error("public_PublicAffiliateRegister.msg_95a1");
      return;
    }

    if (slug && !company) {
      toast.error(companyError || i18n.t("public_PublicAffiliateRegister.msg_1eeb"));
      return;
    }

    if (
      company?.affiliateProgram?.requireIdentityDocument &&
      !identityDocument
    ) {
      toast.error(
        `يجب رفع ${company.affiliateProgram.identityDocumentLabel || "مستند إثبات الهوية"} قبل إرسال الطلب`,
      );
      return;
    }

    try {
      setLoading(true);

      const registrationData = new FormData();
      registrationData.append("email", formData.email);
      registrationData.append("password", formData.password);
      registrationData.append("firstName", formData.firstName);
      registrationData.append("lastName", formData.lastName);
      registrationData.append("phone", formData.phone);
      registrationData.append("paymentMethod", formData.paymentMethod);
      registrationData.append(
        "paymentDetails",
        JSON.stringify(formData.paymentDetails),
      );
      if (slug) {
        registrationData.append("companySlug", slug);
      }
      if (identityDocument) {
        registrationData.append("identityDocument", identityDocument);
      }

      const response = await apiClient.post<
        ApiSuccess<{ token?: string }>,
        FormData
      >(
        "/public/affiliates/register",
        registrationData,
      );

      if (response.data.success) {
        // حفظ token إذا كان موجوداً
        if (response.data.data?.token) {
          localStorage.setItem("accessToken", response.data.data.token);
        }

        const requiresReview = !company?.affiliateProgram?.autoApproveAffiliates;

        if (slug) {
          toast.success(
            requiresReview
              ? `تم تسجيلك لدى ${company?.name || "الشركة"} بنجاح، وطلبك الآن قيد المراجعة.`
              : `تم تسجيلك وتفعيلك كمسوق لدى ${company?.name || "الشركة"} بنجاح!`,
          );
        } else {
          toast.success(
            "تم تسجيلك كمسوق بنجاح! سيتم مراجعة طلبك وربطك بشركة قريباً",
          );
        }

        // توجيه إلى صفحة تسجيل الدخول
        window.location.href = getLoginUrl();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "حدث خطأ أثناء التسجيل");
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
          تسجيل كمسوق {company ? `لدى ${company.name}` : ""}
        </h1>

        {company && company.logo && (
          <div className="mb-6 flex justify-center">
            <img
              src={company.logo}
              alt={company.name}
              className="h-20 object-contain"
            />
          </div>
        )}

        <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
          انضم إلى برنامج المسوقين وابدأ في كسب العمولات من كل عملية بيع
          <br />
          {!company && (
            <span
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              سيتم مراجعة طلبك وربطك بشركة من قبل الإدارة
            </span>
          )}
        </p>

        {company?.affiliateProgram && (
          <div
            className={`mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border p-4 ${
              isDark
                ? "border-gray-700 bg-gray-800/50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                حالة التفعيل
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {company.affiliateProgram.autoApproveAffiliates
                  ? "يتم التفعيل تلقائيًا بعد التسجيل"
                  : "التسجيل يخضع لمراجعة إدارية قبل التفعيل"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                مستند الاعتماد
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {company.affiliateProgram.requireIdentityDocument
                  ? `مطلوب رفع ${company.affiliateProgram.identityDocumentLabel || "مستند إثبات الهوية"} قبل إرسال الطلب`
                  : "لا يوجد مستند إلزامي افتراضيًا، ويمكن للإدارة طلبه لاحقًا عند المراجعة"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                الحد الأدنى للسحب
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {company.affiliateProgram.defaultMinPayout ?? 100} جنيه
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                الطلبات المباشرة
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {company.affiliateProgram.defaultCanCreateOrdersForOthers
                  ? "مسموح بها افتراضيًا بعد التفعيل"
                  : "موقوفة افتراضيًا ويمكن تفعيلها لكل مسوق"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                بيانات العملاء
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {company.affiliateProgram.defaultCanViewCustomerData
                  ? "تظهر افتراضيًا حسب سياسة الشركة"
                  : "مخفية افتراضيًا لحماية الخصوصية"}
              </p>
            </div>
            <div>
              <p
                className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
              >
                مدة معالجة السحب
              </p>
              <p className={`mt-1 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                خلال {company.affiliateProgram.payoutSlaDays ?? 3} أيام من اعتماد
                الطلب
              </p>
            </div>
          </div>
        )}

        {companyLoading && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              isDark
                ? "border-blue-800 bg-blue-900/30 text-blue-200"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            جارٍ تحميل بيانات برنامج الشركة...
          </div>
        )}

        {!companyLoading && companyError && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              isDark
                ? "border-red-800 bg-red-900/30 text-red-200"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {companyError}
          </div>
        )}

        {isProgramInactive && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              isDark
                ? "border-amber-700 bg-amber-900/30 text-amber-200"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            برنامج المسوقين لهذه الشركة متوقف حالياً، لذلك لا يمكن استقبال
            تسجيلات جديدة الآن.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Registration Fields */}
          <div className="space-y-4 pb-4 border-b">
            <h2
              className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
            >
              بيانات المستخدم
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  الاسم الأول
                </label>
                <input
                  type="text"
                  name="firstName"
                  aria-label="الاسم الأول"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  اسم العائلة
                </label>
                <input
                  type="text"
                  name="lastName"
                  aria-label="اسم العائلة"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                البريد الإلكتروني
              </label>
              <input
                type="email"
                name="email"
                aria-label="البريد الإلكتروني"
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
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  كلمة المرور
                </label>
                <input
                  type="password"
                  name="password"
                  aria-label="كلمة المرور"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  الهاتف (اختياري)
                </label>
                <input
                  type="tel"
                  name="phone"
                  aria-label="الهاتف (اختياري)"
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
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label
              className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
            >
              طريقة الدفع المفضلة
            </label>
            <select
              name="paymentMethod"
              aria-label="طريقة الدفع المفضلة"
              value={formData.paymentMethod}
              onChange={(e) =>
                setFormData({ ...formData, paymentMethod: e.target.value })
              }
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDark
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              required
            >
              <option value="">اختر طريقة الدفع</option>
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="VODAFONE_CASH">فودافون كاش</option>
              <option value="ORANGE_CASH">أورنج كاش</option>
              <option value="INSTAPAY">إنستاباي</option>
            </select>
          </div>

          {/* Payment Details */}
          {formData.paymentMethod && (
            <div
              className={`space-y-4 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
            >
              <h3
                className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                تفاصيل الدفع
              </h3>

              {formData.paymentMethod === "BANK_TRANSFER" && (
                <>
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                    >
                      اسم البنك
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      aria-label="اسم البنك"
                      autoComplete="organization"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentDetails: {
                            ...formData.paymentDetails,
                            bankName: e.target.value,
                          },
                        })
                      }
                      className={`w-full px-4 py-2 border rounded-lg ${
                        isDark
                          ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                    >
                      رقم الحساب
                    </label>
                    <input
                      type="text"
                      name="bankAccount"
                      aria-label="رقم الحساب"
                      value={formData.paymentDetails.bankAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentDetails: {
                            ...formData.paymentDetails,
                            bankAccount: e.target.value,
                          },
                        })
                      }
                      className={`w-full px-4 py-2 border rounded-lg ${
                        isDark
                          ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      required
                    />
                  </div>
                </>
              )}

              {(formData.paymentMethod === "VODAFONE_CASH" ||
                formData.paymentMethod === "ORANGE_CASH" ||
                formData.paymentMethod === "INSTAPAY") && (
                <div>
                  <label
                    className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                  >
                    رقم المحفظة
                  </label>
                  <input
                    type="text"
                    name="walletPhoneNumber"
                    aria-label="رقم المحفظة"
                    autoComplete="tel-national"
                    value={formData.paymentDetails.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentDetails: {
                          ...formData.paymentDetails,
                          phoneNumber: e.target.value,
                        },
                      })
                    }
                    className={`w-full px-4 py-2 border rounded-lg ${
                      isDark
                        ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {company?.affiliateProgram?.requireIdentityDocument && (
            <div
              className={`space-y-4 p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
            >
              <h3
                className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {company.affiliateProgram.identityDocumentLabel ||
                  "مستند إثبات الهوية"}
              </h3>
              <p
                className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
              >
                ارفع صورة واضحة أو ملف PDF حتى تتمكن الإدارة من مراجعة طلبك.
              </p>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                aria-label={
                  company.affiliateProgram.identityDocumentLabel ||
                  "مستند إثبات الهوية"
                }
                onChange={(e) =>
                  setIdentityDocument(e.target.files?.[0] || null)
                }
                className={`w-full px-4 py-2 border rounded-lg ${
                  isDark
                    ? "bg-gray-600 border-gray-500 text-white file:bg-gray-500 file:text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              />
              {identityDocument ? (
                <p className="text-xs text-green-600 dark:text-green-400">
                  تم اختيار الملف: {identityDocument.name}
                </p>
              ) : null}
            </div>
          )}

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
              {termsList.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={
                loading ||
                companyLoading ||
                isProgramInactive ||
                isScopedCompanyUnavailable
              }
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "جاري التسجيل..." : "تسجيل كمسوق"}
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

export default PublicAffiliateRegister;
