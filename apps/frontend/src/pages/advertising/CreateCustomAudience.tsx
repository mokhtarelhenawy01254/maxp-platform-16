/**
 * Create Custom Audience Page
 *
 * صفحة إنشاء جمهور مخصص جديد
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  PlayCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateCustomAudienceData,
  FacebookAdAccount,
  FacebookPixel,
  FacebookPage,
} from "../../services/facebookAdsService";

const CreateCustomAudience: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Form data
  const [formData, setFormData] = useState<CreateCustomAudienceData>({
    name: "",
    description: "",
    audienceType: "WEBSITE",
    adAccountId: "",
    customerList: [],
    sourceType: "STORE_CUSTOMERS",
    rawCustomerText: "",
    pixelId: "",
    eventType: "ALL_VISITORS",
    urlContains: "",
    retentionDays: 30,
    pageId: "",
    pageEngagementType: "page_engaged",
    igEngagementType: "ig_business_profile_engaged",
    videoViewDuration: "video_watched_10s",
  });

  const [tosErrorUrl, setTosErrorUrl] = useState<string | null>(null);

  const totalSteps = 3;

  useEffect(() => {
    loadAllAssets();
  }, []);

  const loadAllAssets = async () => {
    try {
      setLoadingAssets(true);
      const [accounts, fetchedPixels, fetchedPages] = await Promise.all([
        facebookAdsService.getAdAccounts().catch(() => []),
        facebookAdsService.getFacebookPixels().catch(() => []),
        facebookAdsService.getFacebookPages().catch(() => []),
      ]);

      setAdAccounts(accounts || []);
      setPixels(fetchedPixels || []);
      setPages(fetchedPages || []);

      setFormData((prev) => ({
        ...prev,
        adAccountId: prev.adAccountId || accounts?.[0]?.id || "",
        pixelId: prev.pixelId || fetchedPixels?.[0]?.id || "",
        pageId: prev.pageId || fetchedPages?.[0]?.id || "",
      }));
    } catch (error: any) {
      console.error("Error loading advertising assets:", error);
      tToast.error("CreateCustomAudience.failed_load_0ade");
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateCustomAudienceData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const parseManualCustomers = (text: string) => {
    const tokens = text.split(/[\n,;\t\r]+/);
    const list: Array<{ email?: string; phone?: string; firstName?: string; lastName?: string }> = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d+]{8,16}$/;

    tokens.forEach((raw) => {
      const item = raw.trim();
      if (!item) return;
      if (emailRegex.test(item)) {
        list.push({ email: item });
      } else if (phoneRegex.test(item.replace(/[\s-]/g, ""))) {
        list.push({ phone: item.replace(/[\s-]/g, "") });
      } else {
        const parts = item.split(/\s+/);
        list.push({ firstName: parts[0], lastName: parts.slice(1).join(" ") });
      }
    });

    setFormData((prev) => ({
      ...prev,
      customerList: list,
      rawCustomerText: text,
      sourceType: "MANUAL",
    }));

    if (list.length > 0) {
      toast.success(`تم استخراج ${list.length} جهة اتصال بنجاح`);
    } else {
      toast.warning("لم يتم العثور على أرقام أو إيميلات صالحة في النص المدخل");
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length <= 1) {
        toast.error("الملف فارغ أو لا يحتوي على بيانات كافية");
        return;
      }

      const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));
      const emailIdx = headers.findIndex((h) => h.includes("email") || h.includes("بريد") || h.includes("mail"));
      const phoneIdx = headers.findIndex((h) => h.includes("phone") || h.includes("هاتف") || h.includes("موبايل") || h.includes("tel"));
      const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("اسم"));

      const list: Array<{ email?: string; phone?: string; firstName?: string; lastName?: string }> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/['"]/g, ""));
        const email = emailIdx >= 0 ? cols[emailIdx] : "";
        const phone = phoneIdx >= 0 ? cols[phoneIdx] : "";
        const name = nameIdx >= 0 ? cols[nameIdx] : "";
        const names = name ? name.split(" ") : [];

        if (email || phone) {
          list.push({
            email: email || undefined,
            phone: phone || undefined,
            firstName: names[0] || undefined,
            lastName: names.slice(1).join(" ") || undefined,
          });
        }
      }

      setFormData((prev) => ({
        ...prev,
        customerList: list,
        sourceType: "CSV_IMPORT",
      }));
      toast.success(`تم استيراد ${list.length} عميل من ملف CSV بنجاح`);
    };
    reader.readAsText(file);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("يرجى إدخال اسم الجمهور المخصص");
          return false;
        }
        if (!formData.audienceType) {
          toast.error("يرجى اختيار نوع الجمهور");
          return false;
        }
        return true;
      case 2:
        if (formData.audienceType === "WEBSITE" && !formData.pixelId) {
          toast.error("يرجى اختيار أو إدخال Pixel ID");
          return false;
        }
        if (
          formData.audienceType === "CUSTOMER_LIST" &&
          formData.sourceType !== "STORE_CUSTOMERS" &&
          (!formData.customerList || formData.customerList.length === 0)
        ) {
          toast.error("يرجى إضافة أو لصق أو رفع بيانات عملاء صالحة");
          return false;
        }
        if (
          (formData.audienceType === "PAGE_ENGAGEMENT" || formData.audienceType === "VIDEO_VIEWS") &&
          !formData.pageId &&
          pages.length === 0
        ) {
          toast.error("يرجى اختيار صفحة فيسبوك");
          return false;
        }
        return true;
      case 3:
        return true; // Review step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      setTosErrorUrl(null);
      await facebookAdsService.createCustomAudience(formData);
      tToast.success("CreateCustomAudience.success_create_d55e");
      navigate("/advertising/facebook-ads/audiences");
    } catch (error: any) {
      console.error("Error creating custom audience:", error);
      const resp = error?.response?.data;
      if (resp?.errorCode === "FACEBOOK_CUSTOM_AUDIENCE_TOS_REQUIRED" || resp?.tosUrl) {
        setTosErrorUrl(
          resp.tosUrl ||
            `https://business.facebook.com/ads/manage/customaudiences/tos/?act=${formData.adAccountId}`,
        );
        toast.error("مطلوب قبول شروط الجماهير المخصصة لهذا الحساب لدى Meta أولاً.");
      } else {
        toast.error(resp?.error || "فشل في إنشاء الجمهور");
      }
    } finally {
      setLoading(false);
    }
  };

  const audienceTypes = [
    {
      value: "WEBSITE",
      label: "نشاط المتجر والموقع (Pixel)",
      description: "استهداف زوار المتجر، المشترين، من أضافوا للسلة، أو من زاروا روابط محددة",
      badge: "Pixel & CAPI",
      icon: GlobeAltIcon,
    },
    {
      value: "CUSTOMER_LIST",
      label: "قائمة العملاء (Customer List)",
      description: "استيراد مباشر لعملاء متجر MaxP، أو رفع ملف CSV، أو إدخال يدوي",
      badge: "تشفير تلقائي SHA256",
      icon: UserGroupIcon,
    },
    {
      value: "PAGE_ENGAGEMENT",
      label: "تفاعل صفحة فيسبوك (Facebook Page)",
      description: "من تفاعل مع صفحتك أو منشوراتك، نقر أزرار CTA، أرسل رسائل، أو زارها",
      badge: "حتى 365 يوماً",
      icon: ChatBubbleLeftRightIcon,
    },
    {
      value: "IG_ENGAGEMENT",
      label: "تفاعل حساب إنستجرام (Instagram)",
      description: "من تفاعل مع حساب Instagram الاحترافي، زار البروفايل، أو أرسل DM",
      badge: "حساب الأعمال",
      icon: CameraIcon,
    },
    {
      value: "VIDEO_VIEWS",
      label: "مشاهدو الفيديو (Video Views)",
      description: "من شاهدوا فيديوهات صفحتك بنسبة 25%، 50%، 75%، 95% أو 10 ثوانٍ فما فوق",
      badge: "ThruPlay Retargeting",
      icon: PlayCircleIcon,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/advertising/facebook-ads/audiences")}
            aria-label="الرجوع إلى إدارة الجماهير"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            رجوع
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            إنشاء جمهور مخصص جديد
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            اتبع الخطوات لإنشاء جمهور مخصص لحملاتك الإعلانية
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm font-medium ${
                    step <= currentStep ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step === 1 && "معلومات الجمهور"}
                  {step === 2 && "الإعدادات"}
                  {step === 3 && "المراجعة"}
                </p>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Meta Custom Audience TOS Required Banner */}
      {tosErrorUrl && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/90 p-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <h3 className="font-semibold text-amber-950">
                مطلوب قبول شروط الجماهير المخصصة (Meta TOS) لهذا الحساب
              </h3>
              <p className="mt-1 text-amber-800 leading-relaxed">
                تفرض سياسة Meta على مدير الحساب الإعلاني قبول اتفاقية شروط خدمة الجماهير المخصصة
                (Custom Audiences Terms of Service) مرة واحدة قبل السماح بإنشاء أو رفع قوائم العملاء عبر واجهة البرمجة (API).
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={tosErrorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors"
                >
                  <span>قبول الشروط في مدير إعلانات Meta</span>
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setTosErrorUrl(null)}
                  className="text-xs text-amber-700 hover:text-amber-900 underline"
                >
                  إخفاء التنبيه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Audience Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="custom-audience-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                اسم الجمهور *
              </label>
              <input
                id="custom-audience-name"
                name="name"
                type="text"
                autoComplete="off"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="مثال: عملاء نشطون - يناير 2025"
              />
            </div>

            <div>
              <label
                htmlFor="custom-audience-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                الوصف (اختياري)
              </label>
              <textarea
                id="custom-audience-description"
                name="description"
                autoComplete="off"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="وصف مختصر للجمهور..."
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                نوع الجمهور *
              </legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {audienceTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.audienceType === type.value;
                  return (
                    <label
                      htmlFor={`custom-audience-type-${type.value}`}
                      key={type.value}
                      className={`cursor-pointer p-4 border rounded-xl transition-all duration-150 flex items-start gap-3.5 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50"
                      }`}
                    >
                      <input
                        id={`custom-audience-type-${type.value}`}
                        type="radio"
                        name="audienceType"
                        value={type.value}
                        checked={isSelected}
                        onChange={(e) =>
                          handleInputChange("audienceType", e.target.value)
                        }
                        className="sr-only"
                      />
                      <div
                        className={`p-2.5 rounded-lg flex-shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-gray-900 text-sm">
                            {type.label}
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {type.badge}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {type.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Step 2: Settings */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Account Selector */}
            {adAccounts.length > 1 && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <label
                  htmlFor="custom-audience-account-select"
                  className="block text-xs font-semibold text-gray-700"
                >
                  الحساب الإعلاني المستهدف
                </label>
                <select
                  id="custom-audience-account-select"
                  value={formData.adAccountId}
                  onChange={(e) => handleInputChange("adAccountId", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {adAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* WEBSITE CRITERIA */}
            {formData.audienceType === "WEBSITE" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="custom-audience-pixel-id"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Facebook Pixel *
                  </label>
                  {pixels.length > 0 ? (
                    <select
                      id="custom-audience-pixel-id"
                      value={formData.pixelId}
                      onChange={(e) => handleInputChange("pixelId", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {pixels.map((pix) => (
                        <option key={pix.id} value={pix.id}>
                          {pix.name} ({pix.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="custom-audience-pixel-id"
                      type="text"
                      value={formData.pixelId}
                      onChange={(e) => handleInputChange("pixelId", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="أدخل معرف البيكسل (Pixel ID)"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="custom-audience-event-type"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      نوع الحدث (Event) *
                    </label>
                    <select
                      id="custom-audience-event-type"
                      value={formData.eventType}
                      onChange={(e) => handleInputChange("eventType", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="ALL_VISITORS">جميع زوار المتجر (PageView)</option>
                      <option value="PURCHASE">المشترون الفعليون (Purchase)</option>
                      <option value="ADD_TO_CART">من أضافوا منتجات للسلة (AddToCart)</option>
                      <option value="INITIATE_CHECKOUT">من بدأوا إتمام الطلب (InitiateCheckout)</option>
                      <option value="VIEW_CONTENT">من شاهدوا صفحات المنتجات (ViewContent)</option>
                      <option value="LEAD">من سجلوا بياناتهم (Lead)</option>
                      <option value="SEARCH">من أجروا بحثاً في المتجر (Search)</option>
                      <option value="COMPLETE_REGISTRATION">إتمام التسجيل (CompleteRegistration)</option>
                      <option value="ADD_PAYMENT_INFO">إضافة معلومات الدفع (AddPaymentInfo)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-audience-retention-days"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      فترة الاسترجاع (من 1 إلى 180 يوماً)
                    </label>
                    <input
                      id="custom-audience-retention-days"
                      type="number"
                      min={1}
                      max={180}
                      value={formData.retentionDays || 30}
                      onChange={(e) => handleInputChange("retentionDays", parseInt(e.target.value) || 30)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="custom-audience-url-contains"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    فلترة بمسار رابط معين (اختياري)
                  </label>
                  <input
                    id="custom-audience-url-contains"
                    type="text"
                    value={formData.urlContains || ""}
                    onChange={(e) => handleInputChange("urlContains", e.target.value)}
                    placeholder="مثال: /checkout أو /shoes أو /sale"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    اتركه فارغاً لاستهداف كافة صفحات المتجر، أو اكتب كلمة لتخصيص الزوار لصفحات معينة فقط.
                  </p>
                </div>
              </div>
            )}

            {/* CUSTOMER LIST CRITERIA */}
            {formData.audienceType === "CUSTOMER_LIST" && (
              <div className="space-y-4">
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleInputChange("sourceType", "STORE_CUSTOMERS")}
                    className={`flex-1 py-2 rounded-md transition-all ${
                      formData.sourceType === "STORE_CUSTOMERS"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    عملاء متجر MaxP (استيراد تلقائي)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange("sourceType", "MANUAL")}
                    className={`flex-1 py-2 rounded-md transition-all ${
                      formData.sourceType === "MANUAL"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    إدخال يدوي / لصق نصوص
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange("sourceType", "CSV_IMPORT")}
                    className={`flex-1 py-2 rounded-md transition-all ${
                      formData.sourceType === "CSV_IMPORT"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    رفع ملف CSV
                  </button>
                </div>

                {formData.sourceType === "STORE_CUSTOMERS" && (
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-900 font-semibold text-sm">
                      <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                      <span>المزامنة التلقائية مع قاعدة بيانات متجرك</span>
                    </div>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      سيقوم النظام تلقائياً بجمع وتنسيق أرقام وإيميلات عملائك الحاليين من جدول الطلبات وتشفيرها عبر خوارزمية SHA256 الآمنة قبل مطابقتها مع Meta.
                    </p>
                  </div>
                )}

                {formData.sourceType === "MANUAL" && (
                  <div className="space-y-3">
                    <label
                      htmlFor="custom-audience-manual-text"
                      className="block text-sm font-medium text-gray-700"
                    >
                      الصق أرقام الهواتف أو الإيميلات (سطر أو فاصلة بين كل عنصر)
                    </label>
                    <textarea
                      id="custom-audience-manual-text"
                      rows={5}
                      value={formData.rawCustomerText || ""}
                      onChange={(e) => handleInputChange("rawCustomerText", e.target.value)}
                      placeholder="01012345678&#10;user@example.com&#10;01123456789"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => parseManualCustomers(formData.rawCustomerText || "")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm"
                      >
                        تحليل وتأكيد القائمة
                      </button>
                      <span className="text-xs text-gray-500 tabular-nums">
                        العدد الجاهز للرفع: {formData.customerList?.length || 0}
                      </span>
                    </div>
                  </div>
                )}

                {formData.sourceType === "CSV_IMPORT" && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50/50 hover:bg-gray-50 transition">
                      <ArrowDownTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        <span>اختر ملف CSV من جهازك</span>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleCsvUpload}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        الملف يجب أن يحتوي على أعمدة (Email, Phone, First Name, Last Name)
                      </p>
                    </div>
                    {formData.customerList && formData.customerList.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 font-medium">
                        تم تجهيز {formData.customerList.length} جهة اتصال من الملف المرفق.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PAGE ENGAGEMENT CRITERIA */}
            {formData.audienceType === "PAGE_ENGAGEMENT" && (
              <div className="space-y-4">
                {pages.length > 0 && (
                  <div>
                    <label
                      htmlFor="custom-audience-page-select"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      صفحة فيسبوك المستهدفة *
                    </label>
                    <select
                      id="custom-audience-page-select"
                      value={formData.pageId}
                      onChange={(e) => handleInputChange("pageId", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="custom-audience-page-action"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      طبيعة التفاعل المطلوبة *
                    </label>
                    <select
                      id="custom-audience-page-action"
                      value={formData.pageEngagementType || "page_engaged"}
                      onChange={(e) => handleInputChange("pageEngagementType", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="page_engaged">كل من تفاعل مع الصفحة أو منشوراتها (الأوسع)</option>
                      <option value="page_visited">الأشخاص الذين زاروا الصفحة فقط</option>
                      <option value="post_engaged">من تفاعلوا مع أي منشور أو إعلان (لايك/تعليق/مشاركة)</option>
                      <option value="page_cta_clicked">من نقروا على زر الدعوة للإجراء (CTA)</option>
                      <option value="page_messaged">من أرسلوا رسائل إلى صفحتك</option>
                      <option value="page_saved">من حفظوا صفحتك أو أي منشور منها</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-audience-page-retention"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      فترة الاسترجاع (حتى 365 يوماً)
                    </label>
                    <input
                      id="custom-audience-page-retention"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.retentionDays || 365}
                      onChange={(e) => handleInputChange("retentionDays", parseInt(e.target.value) || 365)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* INSTAGRAM ENGAGEMENT CRITERIA */}
            {formData.audienceType === "IG_ENGAGEMENT" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="custom-audience-ig-action"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      طبيعة التفاعل مع Instagram *
                    </label>
                    <select
                      id="custom-audience-ig-action"
                      value={formData.igEngagementType || "ig_business_profile_engaged"}
                      onChange={(e) => handleInputChange("igEngagementType", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="ig_business_profile_engaged">كل من تفاعل مع الحساب الاحترافي (الأشمل)</option>
                      <option value="ig_business_profile_visited">من زاروا الملف الشخصي للحساب</option>
                      <option value="ig_post_engaged">من تفاعلوا مع المنشورات أو إعلانات Instagram</option>
                      <option value="ig_direct_message_sent">من أرسلوا رسائل خاصة (Direct Message)</option>
                      <option value="ig_post_saved">من حفظوا أي منشور من الحساب</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-audience-ig-retention"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      فترة الاسترجاع (حتى 365 يوماً)
                    </label>
                    <input
                      id="custom-audience-ig-retention"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.retentionDays || 365}
                      onChange={(e) => handleInputChange("retentionDays", parseInt(e.target.value) || 365)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VIDEO VIEWS CRITERIA */}
            {formData.audienceType === "VIDEO_VIEWS" && (
              <div className="space-y-4">
                {pages.length > 0 && (
                  <div>
                    <label
                      htmlFor="custom-audience-video-page"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      صفحة الفيديوهات *
                    </label>
                    <select
                      id="custom-audience-video-page"
                      value={formData.pageId}
                      onChange={(e) => handleInputChange("pageId", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="custom-audience-video-duration"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      مدة أو نسبة مشاهدة الفيديو *
                    </label>
                    <select
                      id="custom-audience-video-duration"
                      value={formData.videoViewDuration || "video_watched_10s"}
                      onChange={(e) => handleInputChange("videoViewDuration", e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      <option value="video_watched_10s">مشاهدة 10 ثوانٍ فما فوق أو اكتمال الفيديو (ThruPlay - موصى به)</option>
                      <option value="video_watched_3s">مشاهدة 3 ثوانٍ على الأقل</option>
                      <option value="video_watched_25_percent">مشاهدة 25% من مدة الفيديو</option>
                      <option value="video_watched_50_percent">مشاهدة 50% من مدة الفيديو</option>
                      <option value="video_watched_75_percent">مشاهدة 75% من مدة الفيديو</option>
                      <option value="video_watched_95_percent">مشاهدة 95% من مدة الفيديو (أعلى اهتمام)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="custom-audience-video-retention"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      فترة الاسترجاع (حتى 365 يوماً)
                    </label>
                    <input
                      id="custom-audience-video-retention"
                      type="number"
                      min={1}
                      max={365}
                      value={formData.retentionDays || 365}
                      onChange={(e) => handleInputChange("retentionDays", parseInt(e.target.value) || 365)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 border-b pb-2">
                مراجعة إعدادات الجمهور المخصص
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">اسم الجمهور:</span>
                  <p className="font-semibold text-gray-900">{formData.name}</p>
                </div>

                <div>
                  <span className="text-xs text-gray-500 block">نوع المعيار:</span>
                  <p className="font-semibold text-indigo-700">
                    {audienceTypes.find((t) => t.value === formData.audienceType)?.label || formData.audienceType}
                  </p>
                </div>

                {formData.audienceType === "WEBSITE" && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500 block">Pixel ID:</span>
                      <p className="font-mono text-gray-900">{formData.pixelId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">الحدث المطلوب:</span>
                      <p className="font-semibold text-gray-900">{formData.eventType}</p>
                    </div>
                    {formData.urlContains && (
                      <div>
                        <span className="text-xs text-gray-500 block">فلتر الرابط:</span>
                        <p className="font-mono text-xs bg-white px-2 py-1 border rounded inline-block">
                          {formData.urlContains}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {formData.audienceType === "CUSTOMER_LIST" && (
                  <div>
                    <span className="text-xs text-gray-500 block">مصدر العملاء:</span>
                    <p className="font-semibold text-gray-900">
                      {formData.sourceType === "STORE_CUSTOMERS"
                        ? "استيراد مباشر من قاعدة بيانات متجر MaxP"
                        : `قائمة مجهزة (${formData.customerList?.length || 0} عميل)`}
                    </p>
                  </div>
                )}

                {formData.audienceType === "PAGE_ENGAGEMENT" && (
                  <div>
                    <span className="text-xs text-gray-500 block">طبيعة التفاعل:</span>
                    <p className="font-semibold text-gray-900">{formData.pageEngagementType}</p>
                  </div>
                )}

                {formData.audienceType === "IG_ENGAGEMENT" && (
                  <div>
                    <span className="text-xs text-gray-500 block">تفاعل Instagram:</span>
                    <p className="font-semibold text-gray-900">{formData.igEngagementType}</p>
                  </div>
                )}

                {formData.audienceType === "VIDEO_VIEWS" && (
                  <div>
                    <span className="text-xs text-gray-500 block">معيار المشاهدة:</span>
                    <p className="font-semibold text-gray-900">{formData.videoViewDuration}</p>
                  </div>
                )}

                <div>
                  <span className="text-xs text-gray-500 block">مدة الاحتفاظ:</span>
                  <p className="font-semibold text-gray-900 tabular-nums">
                    {formData.retentionDays} يوماً
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            السابق
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              التالي
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "جاري الإنشاء..." : "إنشاء الجمهور"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCustomAudience;
