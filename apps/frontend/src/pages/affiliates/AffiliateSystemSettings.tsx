import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuthSimple";
import { getBaseDomain } from "../../utils/storeUrl";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { copyAffiliateText } from "./affiliateClipboard";
import {
  LinkIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
  recalculatedProducts?: number;
}

const VALID_COMMISSION_TYPES = ["PERCENTAGE", "MARKUP", "FIXED", "FIXED_PER_ITEM"] as const;
const VALID_PLATFORM_MARGIN_TYPES = ["FIXED", "PERCENTAGE"] as const;

const parseNumberInput = (value: string, fallback: number) => {
  if (value.trim() === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AffiliateSystemSettings: React.FC = () => {
  const { actualTheme } = useTheme();
  const { user } = useAuth();
  const isDark = actualTheme === "dark";
  const [loading, setLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    commissionType: "PERCENTAGE",
    commissionRate: 5.0,
    cookieDuration: 30,
    termsAndConditions: "",
    isActive: true,
    autoApproveAffiliates: false,
    defaultMinPayout: 100,
    defaultCanCreateOrdersForOthers: true,
    defaultCanViewCustomerData: true,
    requireIdentityDocument: false,
    identityDocumentLabel: "مستند إثبات الهوية",
    payoutSlaDays: 3,
    platformMarginType: "FIXED",
    platformMarginValue: 0,
    commissionOnStatus: "CONFIRMED",
  });

  const toBoolean = (val: any, fallback: boolean): boolean => {
    if (val === true || val === "true" || val === 1 || val === "1") return true;
    if (val === false || val === "false" || val === 0 || val === "0") return false;
    return fallback;
  };

  const normalizeSettings = (incoming: Partial<typeof settings> = {}) => ({
    commissionType: incoming.commissionType || "PERCENTAGE",
    commissionRate: Number(incoming.commissionRate ?? 5),
    cookieDuration: Number(incoming.cookieDuration ?? 30),
    termsAndConditions: incoming.termsAndConditions || "",
    isActive: toBoolean(incoming.isActive, true),
    autoApproveAffiliates: toBoolean(incoming.autoApproveAffiliates, false),
    defaultMinPayout: Number(incoming.defaultMinPayout ?? 100),
    defaultCanCreateOrdersForOthers: toBoolean(
      incoming.defaultCanCreateOrdersForOthers,
      true,
    ),
    defaultCanViewCustomerData: toBoolean(
      incoming.defaultCanViewCustomerData,
      true,
    ),
    requireIdentityDocument: toBoolean(
      incoming.requireIdentityDocument,
      false,
    ),
    identityDocumentLabel:
      incoming.identityDocumentLabel || "مستند إثبات الهوية",
    payoutSlaDays: Number(incoming.payoutSlaDays ?? 3),
    platformMarginType: incoming.platformMarginType || "FIXED",
    platformMarginValue: Number(incoming.platformMarginValue ?? 0),
    commissionOnStatus: incoming.commissionOnStatus || "CONFIRMED",
  });

  const validateSettings = (nextSettings: typeof settings) => {
    if (!VALID_COMMISSION_TYPES.includes(nextSettings.commissionType as any)) {
      return "نوع العمولة غير صالح";
    }

    if (!VALID_PLATFORM_MARGIN_TYPES.includes(nextSettings.platformMarginType as any)) {
      return "نوع ربح المنصة غير صالح";
    }

    const commissionRate = Number(nextSettings.commissionRate);
    if (!Number.isFinite(commissionRate) || commissionRate < 0) {
      return "قيمة عمولة المسوق غير صالحة";
    }

    if (nextSettings.commissionType === "PERCENTAGE" && commissionRate > 100) {
      return "نسبة عمولة المسوق لا يمكن أن تتجاوز 100%";
    }

    if (nextSettings.commissionType === "MARKUP" && commissionRate > 1000000) {
      return "قيمة هامش ربح المسوق أكبر من الحد المسموح";
    }

    if (nextSettings.commissionType === "FIXED" && commissionRate > 1000000) {
      return "المبلغ الثابت لكل طلب أكبر من الحد المسموح";
    }

    if (nextSettings.commissionType === "FIXED_PER_ITEM" && commissionRate > 1000000) {
      return "المبلغ الثابت لكل قطعة أكبر من الحد المسموح";
    }

    const platformMarginValue = Number(nextSettings.platformMarginValue);
    if (!Number.isFinite(platformMarginValue) || platformMarginValue < 0) {
      return "قيمة ربح المنصة غير صالحة";
    }

    if (
      nextSettings.platformMarginType === "PERCENTAGE" &&
      platformMarginValue > 1000
    ) {
      return "نسبة ربح المنصة لا يمكن أن تتجاوز 1000%";
    }

    if (
      nextSettings.platformMarginType === "FIXED" &&
      platformMarginValue > 1000000
    ) {
      return "قيمة ربح المنصة أكبر من الحد المسموح";
    }

    const cookieDuration = Number(nextSettings.cookieDuration);
    if (
      !Number.isInteger(cookieDuration) ||
      cookieDuration < 1 ||
      cookieDuration > 365
    ) {
      return "مدة الكوكيز يجب أن تكون بين 1 و365 يوم";
    }

    const defaultMinPayout = Number(nextSettings.defaultMinPayout);
    if (!Number.isFinite(defaultMinPayout) || defaultMinPayout < 0) {
      return "الحد الأدنى الافتراضي للسحب غير صالح";
    }

    if (defaultMinPayout > 1000000) {
      return "الحد الأدنى الافتراضي للسحب أكبر من الحد المسموح";
    }

    if (
      nextSettings.requireIdentityDocument &&
      (!nextSettings.identityDocumentLabel ||
        nextSettings.identityDocumentLabel.trim().length < 3)
    ) {
      return "اسم مستند الاعتماد يجب أن يحتوي على 3 أحرف على الأقل";
    }

    const payoutSlaDays = Number(nextSettings.payoutSlaDays);
    if (!Number.isInteger(payoutSlaDays) || payoutSlaDays < 1 || payoutSlaDays > 60) {
      return "مدة معالجة السحب يجب أن تكون بين 1 و60 يوم";
    }

    return null;
  };

  const currentCompanyId = user?.companyId || (user as any)?.company?.id;

  useEffect(() => {
    fetchSettings();
  }, [currentCompanyId]);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get<ApiSuccess<typeof settings>>(
        "/affiliate-settings",
        {
          headers: {
            "Cache-Control": "no-cache, no-store",
            Pragma: "no-cache",
          },
          params: {
            _t: Date.now(),
          },
        },
      );
      if (response.data.success) {
        setSettings(normalizeSettings(response.data.data));
      }
    } catch (error) {
      console.error("Error fetching affiliate settings:", error);
    }
  };

  const handleToggleAutoApprove = async (nextValue: boolean) => {
    const updatedSettings = {
      ...settings,
      autoApproveAffiliates: nextValue,
      isActive: nextValue ? true : settings.isActive,
    };
    setSettings(updatedSettings);

    try {
      const response = await apiClient.put<
        ApiSuccess<typeof settings>,
        typeof settings
      >("/affiliate-settings", updatedSettings);

      if (response.data.success) {
        setSettings(normalizeSettings(response.data.data));
        if (nextValue) {
          toast.success("تم تفعيل الموافقة التلقائية على المسوقين الجدد وحفظها بنجاح!");
        } else {
          toast.success("تم تعطيل الموافقة التلقائية (يتطلب الآن موافقة يدوية) وحفظ التعديل!");
        }
      }
    } catch (error: any) {
      setSettings((prev) => ({
        ...prev,
        autoApproveAffiliates: !nextValue,
      }));
      toast.error(
        error.response?.data?.message || "حدث خطأ أثناء حفظ التعديل، يرجى المحاولة ثانية",
      );
    }
  };

  const handleToggleIsActive = async (nextValue: boolean) => {
    const updatedSettings = {
      ...settings,
      isActive: nextValue,
      autoApproveAffiliates: !nextValue ? false : settings.autoApproveAffiliates,
    };
    setSettings(updatedSettings);

    try {
      const response = await apiClient.put<
        ApiSuccess<typeof settings>,
        typeof settings
      >("/affiliate-settings", updatedSettings);

      if (response.data.success) {
        setSettings(normalizeSettings(response.data.data));
        if (nextValue) {
          toast.success("تم تفعيل نظام تسجيل المسوقين وحفظ التعديل بنجاح!");
        } else {
          toast.success("تم إيقاف نظام تسجيل المسوقين وحفظ التعديل!");
        }
      }
    } catch (error: any) {
      setSettings((prev) => ({
        ...prev,
        isActive: !nextValue,
      }));
      toast.error(
        error.response?.data?.message || "حدث خطأ أثناء حفظ التعديل",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSettings(settings);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.put<
        ApiSuccess<typeof settings>,
        typeof settings
      >("/affiliate-settings", settings);

      if (response.data.success) {
        const recalculatedProducts = Number(
          response.data.recalculatedProducts || 0,
        );
        toast.success(
          recalculatedProducts > 0
            ? `تم تحديث الإعدادات وإعادة حساب ${recalculatedProducts} منتج`
            : "تم تحديث إعدادات نظام المسوقين بنجاح!",
        );
        setSettings(normalizeSettings(response.data.data));
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "حدث خطأ أثناء حفظ الإعدادات",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}
    >
      <div
        className={`w-full ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg shadow-lg p-8`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 ml-4">
              <Cog6ToothIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                إعدادات نظام المسوقين
              </h1>
              <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm`}>
                تحكم في عمولات المسوقين، الشروط والأحكام، وروابط التسجيل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit as any}
            disabled={loading}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors text-sm self-start sm:self-auto"
          >
            {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>

        {/* Invitation Link Section */}
        {user?.company && (
          <div
            className={`mb-8 p-6 rounded-lg border ${isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"}`}
          >
            <h3
              className={`text-lg font-semibold mb-3 flex items-center ${isDark ? "text-blue-300" : "text-blue-900"}`}
            >
              <LinkIcon className="h-6 w-6 mr-2" />
              رابط دعوة المسوقين
            </h3>

            {!user.company.slug ? (
              <div
                className={`text-sm p-3 rounded bg-amber-100 text-amber-800 border border-amber-200`}
              >
                ⚠️ برجاء إعداد "رابط الشركة" (Slug) في إعدادات الشركة لتمكين
                رابط الدعوة.
              </div>
            ) : (
              <>
                <p
                  className={`text-sm mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                >
                  شارك هذا الرابط مع المسوقين ليقوموا بالتسجيل في برنامجك. عند
                  التسجيل، سيتم ربطهم بشركتك تلقائياً.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={(() => {
                      const baseDomain = getBaseDomain();
                      const protocol = window.location.protocol;
                      const slug = user.company!.slug;
                      if (!baseDomain.includes("localhost")) {
                        return `${protocol}//${slug}.${baseDomain}/affiliate-register`;
                      }
                      return `${protocol}//${baseDomain}/affiliate-register/${slug}`;
                    })()}
                    className={`flex-1 px-4 py-3 border rounded-lg text-sm font-mono ${
                      isDark
                        ? "bg-gray-800 border-gray-600 text-gray-300"
                        : "bg-white border-gray-300 text-gray-600"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const baseDomain = getBaseDomain();
                      const protocol = window.location.protocol;
                      const slug = user!.company!.slug;
                      const link = !baseDomain.includes("localhost")
                        ? `${protocol}//${slug}.${baseDomain}/affiliate-register`
                        : `${protocol}//${baseDomain}/affiliate-register/${slug}`;

                      const copied = await copyAffiliateText(link);
                      if (copied) {
                        tToast.success("AffiliateSystemSettings.msg_66a5");
                      } else {
                        toast.error(
                          "لم نتمكن من النسخ تلقائياً، انسخ الرابط يدوياً من الحقل.",
                        );
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center font-semibold"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                    نسخ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Program Status Controls */}
          <div className="space-y-4">
            <h2
              className={`text-lg font-bold border-b pb-2 ${isDark ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}
            >
              حالة النظام والتسجيل
            </h2>

            {/* Card 1: حالة نظام المسوقين */}
            <div
              className={`p-5 rounded-xl border transition-all ${
                isDark
                  ? settings.isActive
                    ? "border-blue-700/60 bg-blue-950/20"
                    : "border-gray-700 bg-gray-800/40"
                  : settings.isActive
                    ? "border-blue-200 bg-blue-50/50"
                    : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      حالة نظام المسوقين (تسجيل المسوقين)
                    </h3>
                    {settings.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        مفعل (يستقبل تسجيلات)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700">
                        معطل (التسجيل مغلق)
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    تفعيل واستقبال تسجيل مسوقين جدد عبر رابط المتجر الرسمي
                  </p>
                </div>

                <label
                  htmlFor="system-is-active-switch"
                  className="inline-flex items-center gap-3 cursor-pointer self-start sm:self-auto select-none"
                >
                  <span
                    className={`text-sm font-semibold ${
                      settings.isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {settings.isActive ? "تشغيل" : "إيقاف"}
                  </span>
                  <div className="relative inline-block w-12 h-6" dir="ltr">
                    <input
                      id="system-is-active-switch"
                      type="checkbox"
                      aria-label="حالة نظام المسوقين"
                      className="sr-only"
                      checked={settings.isActive}
                      onChange={(e) => handleToggleIsActive(e.target.checked)}
                    />
                    <div
                      className={`block w-12 h-6 rounded-full transition-colors ${
                        settings.isActive
                          ? "bg-blue-600"
                          : isDark
                            ? "bg-gray-700 border border-gray-600"
                            : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
                        settings.isActive ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 2: الموافقة التلقائية على المسوقين الجدد */}
            <div
              className={`p-5 rounded-xl border transition-all ${
                isDark
                  ? settings.autoApproveAffiliates
                    ? "border-emerald-700/60 bg-emerald-950/20"
                    : "border-gray-700 bg-gray-800/40"
                  : settings.autoApproveAffiliates
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-gray-200 bg-gray-50/70"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      الموافقة التلقائية على المسوقين الجدد
                    </h3>
                    {settings.autoApproveAffiliates ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        مفعلة تلقائياً (تفعيل فوري)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        يتطلب موافقة يدوية من الإدارة
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    تفعيل حساب المسوق فور التسجيل مباشرة لتمكينه من بدء التسويق دون انتظار موافقة يدوية
                  </p>
                </div>

                <label
                  htmlFor="auto-approve-affiliates-switch"
                  className="inline-flex items-center gap-3 cursor-pointer self-start sm:self-auto select-none"
                >
                  <span
                    className={`text-sm font-semibold ${
                      settings.autoApproveAffiliates
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {settings.autoApproveAffiliates ? "مفعل" : "معطل"}
                  </span>
                  <div className="relative inline-block w-12 h-6" dir="ltr">
                    <input
                      id="auto-approve-affiliates-switch"
                      type="checkbox"
                      aria-label="الموافقة التلقائية على المسوقين الجدد"
                      className="sr-only"
                      checked={settings.autoApproveAffiliates}
                      onChange={(e) => handleToggleAutoApprove(e.target.checked)}
                    />
                    <div
                      className={`block w-12 h-6 rounded-full transition-colors ${
                        settings.autoApproveAffiliates
                          ? "bg-emerald-600 dark:bg-emerald-500"
                          : isDark
                            ? "bg-gray-700 border border-gray-600"
                            : "bg-gray-300"
                      }`}
                    ></div>
                    <div
                      className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
                        settings.autoApproveAffiliates ? "translate-x-6" : "translate-x-0"
                      }`}
                    ></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Operational Defaults */}
          <div className="space-y-4">
            <h2
              className={`text-xl font-semibold border-b pb-2 ${isDark ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}
            >
              الضوابط الافتراضية للمسوق الجديد
            </h2>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              هذه السياسات تطبق على أي مسوق جديد وقت التسجيل، ويمكن تعديلها لاحقًا
              لكل مسوق على حدة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  الحد الأدنى الافتراضي للسحب
                </label>
                <input
                  type="number"
                  aria-label="الحد الأدنى الافتراضي للسحب"
                  step="1"
                  min="0"
                  max="1000000"
                  value={settings.defaultMinPayout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultMinPayout: parseNumberInput(
                        e.target.value,
                        settings.defaultMinPayout,
                      ),
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  مدة معالجة السحب (أيام)
                </label>
                <input
                  type="number"
                  aria-label="مدة معالجة السحب"
                  step="1"
                  min="1"
                  max="60"
                  value={settings.payoutSlaDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payoutSlaDays: parseNumberInput(
                        e.target.value,
                        settings.payoutSlaDays,
                      ),
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <p
                  className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  المدة المستهدفة لمعالجة طلبات السحب قبل اعتبارها متأخرة.
                </p>
              </div>

              <div
                className={`rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}
              >
                <p
                  className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  مسار الاعتماد الحالي
                </p>
                <p
                  className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {settings.autoApproveAffiliates
                    ? "التسجيلات الجديدة ستصبح نشطة مباشرة بدون انتظار مراجعة."
                    : "التسجيلات الجديدة ستدخل حالة قيد المراجعة لحين تفعيلها من الإدارة."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label
                className={`flex items-center justify-between rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    السماح بالطلبات المباشرة
                  </p>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    تمكين المسوق الجديد من إنشاء طلبات مباشرة بعد تفعيله
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="السماح بالطلبات المباشرة"
                  checked={settings.defaultCanCreateOrdersForOthers}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultCanCreateOrdersForOthers: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label
                className={`flex items-center justify-between rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    إظهار بيانات العملاء
                  </p>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    تحديد ما إذا كان المسوق الجديد يرى بيانات العملاء افتراضيًا
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="إظهار بيانات العملاء"
                  checked={settings.defaultCanViewCustomerData}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultCanViewCustomerData: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </label>

              <label
                className={`flex items-center justify-between rounded-lg border p-4 ${isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"}`}
              >
                <div>
                  <p
                    className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    إلزام مستند اعتماد
                  </p>
                  <p
                    className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    طلب مستند هوية أو اعتماد من كل مسوق جديد قبل إرسال الطلب
                  </p>
                </div>
                <input
                  type="checkbox"
                  aria-label="إلزام مستند اعتماد"
                  checked={settings.requireIdentityDocument}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requireIdentityDocument: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  اسم مستند الاعتماد
                </label>
                <input
                  type="text"
                  aria-label="اسم مستند الاعتماد"
                  value={settings.identityDocumentLabel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      identityDocumentLabel: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="مثال: صورة البطاقة أو السجل التجاري"
                />
                <p
                  className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
                >
                  يظهر هذا الاسم في صفحة التسجيل العامة وشاشة مراجعة المسوقين.
                </p>
              </div>
            </div>
          </div>

          {/* Commission Settings */}
          <div className="space-y-4">
            <h2
              className={`text-xl font-semibold border-b pb-2 ${isDark ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}
            >
              إعدادات العمولة الافتراضية
            </h2>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              هذه الإعدادات ستطبق تلقائياً على أي مسوق جديد يقوم بالتسجيل. يمكنك
              تعديل عمولة كل مسوق لاحقاً بشكل فردي.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  نوع العمولة للمسوق
                </label>
                <select
                  value={settings.commissionType}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commissionType: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="PERCENTAGE">نسبة مئوية (%)</option>
                  <option value="MARKUP">هامش ربح ثابت</option>
                  <option value="FIXED">مبلغ ثابت لكل طلب</option>
                  <option value="FIXED_PER_ITEM">مبلغ ثابت لكل قطعة</option>
                </select>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  {settings.commissionType === "PERCENTAGE"
                    ? "النسبة للافتراضية للمسوق (%)"
                    : "المبلغ الثابت الافتراضي للمسوق"}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={
                    settings.commissionType === "PERCENTAGE"
                      ? 100
                      : 1000000
                  }
                  value={settings.commissionRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commissionRate: parseNumberInput(
                        e.target.value,
                        settings.commissionRate,
                      ),
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
            </div>
          </div>

          {/* حالة احتساب العمولة */}
          <div className={`rounded-2xl border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} shadow-sm`}>
            <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"} mb-2`}>
              حالة احتساب العمولة
            </h2>
            <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              حدد في أي مرحلة من الطلب تتحسب عمولة المسوق تلقائياً.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}>
                  تحتسب العمولة عند
                </label>
                <select
                  value={settings.commissionOnStatus}
                  onChange={(e) =>
                    setSettings({ ...settings, commissionOnStatus: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="PENDING">فور إنشاء الطلب (PENDING)</option>
                  <option value="CONFIRMED">تأكيد الطلب (CONFIRMED)</option>
                  <option value="PROCESSING">جاري التجهيز (PROCESSING)</option>
                  <option value="SHIPPED">تم الشحن (SHIPPED)</option>
                  <option value="DELIVERED">تم التسليم (DELIVERED)</option>
                </select>
              </div>
              <div className="flex items-center">
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {settings.commissionOnStatus === "PENDING" && "⚡ تتحسب العمولة فور إنشاء الطلب — مناسبة للمسوقين الموثوقين."}
                  {settings.commissionOnStatus === "CONFIRMED" && "🟢 تتحسب العمولة فور تأكيد الطلب — مناسبة للطلبات المدفوعة مسبقاً."}
                  {settings.commissionOnStatus === "PROCESSING" && "🔵 تتحسب العمولة عند بدء تجهيز الطلب."}
                  {settings.commissionOnStatus === "SHIPPED" && "📦 تتحسب العمولة عند شحن الطلب."}
                  {settings.commissionOnStatus === "DELIVERED" && "🚚 تتحسب العمولة عند تسليم الطلب للعميل — الخيار الأكثر أماناً."}
                </p>
              </div>
            </div>
          </div>

          <h2
              className={`text-xl font-semibold border-b pb-2 pt-6 ${isDark ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}
            >
              هامش ربح المنصة (بين التاجر والمسوق)
            </h2>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              هذا الهامش سيتم إضافته تلقائياً على سعر التاجر ليكون هو "سعر
              التكلفة" الذي يراه المسوق.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  نوع ربح المنصة
                </label>
                <select
                  value={settings.platformMarginType || "FIXED"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformMarginType: e.target.value,
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="FIXED">مبلغ ثابت لكل قطعة</option>
                  <option value="PERCENTAGE">
                    نسبة مئوية من سعر التاجر (%)
                  </option>
                </select>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
                >
                  قيمة ربح المنصة
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={
                    settings.platformMarginType === "PERCENTAGE"
                      ? 1000
                      : 1000000
                  }
                  value={settings.platformMarginValue || 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformMarginValue: parseNumberInput(
                        e.target.value,
                        settings.platformMarginValue,
                      ),
                    })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                مدة الكوكيز (أيام)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.cookieDuration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cookieDuration: parseNumberInput(
                      e.target.value,
                      settings.cookieDuration,
                    ),
                  })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <p
                className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
              >
                الفترة التي يتم فيها احتساب العمولة للمسوق بعد زيارة العميل
                للرابط (الافتراضي 30 يوم).
              </p>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-4">
            <h2
              className={`text-xl font-semibold border-b pb-2 ${isDark ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}
            >
              الشروط والأحكام
            </h2>

            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                نص الشروط والأحكام
              </label>
              <textarea
                rows={6}
                value={settings.termsAndConditions}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    termsAndConditions: e.target.value,
                  })
                }
                placeholder="اكتب هنا الشروط التي يجب أن يوافق عليها المسوق عند التسجيل..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
              <p
                className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}
              >
                سيظهر هذا النص في صفحة تسجيل المسوقين.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 border-t pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
            >
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateSystemSettings;
