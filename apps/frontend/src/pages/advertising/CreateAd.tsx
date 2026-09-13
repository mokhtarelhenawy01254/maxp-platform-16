/**
 * Create Ad Page (Meta Graph API v25.0)
 *
 * صفحة إنشاء إعلان جديد بتنسيق معياري مع Advantage+ Creative وتنويع النصوص وتتبع UTM
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  facebookAdsService,
  CreateAdData,
} from "../../services/facebookAdsService";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";

import {
  AdFormData,
  FacebookPage,
  AdIdentityMediaStep,
  AdCopyVariationsStep,
  AdAdvantageCreativeStep,
  AdDestinationTrackingStep,
  AdPlacementLivePreview,
  AdReviewStep,
} from "../../components/advertising/ad";

const CreateAd: React.FC = () => {
  const { adSetId } = useParams<{ adSetId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  const selectedAdAccountId = searchParams.get("adAccountId") || "";
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Form State
  const [formData, setFormData] = useState<AdFormData>({
    adSetId: adSetId || "",
    name: "",
    status: "PAUSED",
    creativeType: "SINGLE_IMAGE",
    primaryText: "",
    primaryTexts: [""],
    headline: "",
    headlines: [""],
    description: "",
    descriptions: [""],
    callToAction: "ORDER_NOW",
    linkUrl: "",
    displayLink: "",
    pageId: "",
    imageFile: null,
    videoFile: null,
    advantageCreative: true,
    textGeneration: true,
    textOptimizations: true,
    imageEnhancement: true,
    imageTemplates: false,
    videoHighlight: false,
    musicEnhancement: true,
    urlParameters: "utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}",
    utmSource: "meta",
    utmMedium: "paid_social",
    utmCampaign: "{{campaign.name}}",
    utmContent: "{{ad.name}}",
    utmTerm: "{{adset.name}}",
    carouselCardsList: [
      { id: "1", headline: "", description: "", linkUrl: "" },
      { id: "2", headline: "", description: "", linkUrl: "" },
    ],
  });

  const updateFormData = (updates: Partial<AdFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    loadFacebookPages();
  }, [user?.companyId]);

  const loadFacebookPages = async () => {
    if (!user?.companyId) return;
    try {
      setLoadingPages(true);
      const res = await apiClient.get("/facebook-ads/pages");
      if (res.data.success && (res.data.data || res.data.pages)) {
        const rawPages = res.data.data || res.data.pages || [];
        const pages: FacebookPage[] = rawPages
          .filter((p: any) => p.isSelectable !== false)
          .map((p: any) => ({
            id: String(p.id || p.pageId),
            pageId: String(p.id || p.pageId),
            pageName: p.name || p.pageName,
            status: p.status || "READY",
            category: p.category,
            pictureUrl: p.pictureUrl,
          }));
        setFacebookPages(pages);
        if (pages.length > 0 && !formData.pageId) {
          updateFormData({ pageId: pages[0].pageId });
        }
      }
    } catch (err) {
      console.error("Failed to load Facebook pages:", err);
    } finally {
      setLoadingPages(false);
    }
  };

  const uploadImageFile = async (): Promise<string | null> => {
    if (!formData.imageFile) return null;
    try {
      toast.loading(isEn ? "Uploading image to Meta..." : "جاري رفع الصورة إلى Meta...", { id: "upload-media" });
      const uploadData = new FormData();
      uploadData.append("image", formData.imageFile);
      uploadData.append("adSetId", formData.adSetId);

      const res = await apiClient.post("/facebook-ads/upload-image", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success && res.data.hash) {
        toast.success(isEn ? "Image uploaded successfully" : "تم رفع الصورة بنجاح", { id: "upload-media" });
        return res.data.hash;
      }
      throw new Error(res.data.error || "Upload failed");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || (isEn ? "Failed to upload image" : "فشل في رفع الصورة"), { id: "upload-media" });
      return null;
    }
  };

  const uploadVideoFile = async (): Promise<string | null> => {
    if (!formData.videoFile) return null;
    try {
      toast.loading(isEn ? "Uploading video to Meta..." : "جاري رفع الفيديو إلى Meta...", { id: "upload-media" });
      const uploadData = new FormData();
      uploadData.append("video", formData.videoFile);
      uploadData.append("adSetId", formData.adSetId);
      uploadData.append("name", formData.name || "Video Ad");

      const res = await apiClient.post("/facebook-ads/upload-video", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });

      if (res.data.success && res.data.videoId) {
        toast.success(isEn ? "Video uploaded successfully" : "تم رفع الفيديو بنجاح", { id: "upload-media" });
        return res.data.videoId;
      }
      throw new Error(res.data.error || "Upload failed");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || (isEn ? "Failed to upload video" : "فشل في رفع الفيديو"), { id: "upload-media" });
      return null;
    }
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error(isEn ? "Please enter an ad name" : "يرجى كتابة اسم الإعلان");
        return false;
      }
      if (!formData.pageId) {
        toast.error(isEn ? "Please select a Facebook page" : "يرجى تحديد صفحة فيسبوك");
        return false;
      }
      if (formData.creativeType === "SINGLE_IMAGE" && !formData.imageFile && !formData.imageUrl && !formData.uploadedImageHash) {
        toast.error(isEn ? "Please upload an image" : "يرجى رفع صورة الإعلان");
        return false;
      }
      if (formData.creativeType === "SINGLE_VIDEO" && !formData.videoFile && !formData.videoUrl && !formData.uploadedVideoId) {
        toast.error(isEn ? "Please upload a video" : "يرجى رفع فيديو الإعلان");
        return false;
      }
      if (formData.creativeType === "CAROUSEL") {
        const invalid = formData.carouselCardsList.some((c) => !c.headline.trim() || !c.linkUrl.trim());
        if (invalid) {
          toast.error(isEn ? "Please provide headline and link for all carousel cards" : "يرجى ملء العنوان والرابط لكافة بطاقات الدوّار");
          return false;
        }
      }
    }
    if (step === 2) {
      const hasText = formData.primaryTexts.some((t) => t && t.trim().length > 0);
      if (!hasText) {
        toast.error(isEn ? "Please provide at least one primary ad text" : "يرجى إدخال نص أساسي واحد على الأقل");
        return false;
      }
    }
    if (step === 4) {
      if (!formData.linkUrl || !formData.linkUrl.trim()) {
        toast.error(isEn ? "Please enter destination website URL" : "يرجى إدخال رابط صفحة الهبوط / المتجر");
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // Trigger media upload if on step 1
    if (currentStep === 1) {
      if (formData.creativeType === "SINGLE_IMAGE" && formData.imageFile && !formData.uploadedImageHash) {
        const hash = await uploadImageFile();
        if (!hash) return;
        updateFormData({ uploadedImageHash: hash });
      } else if (formData.creativeType === "SINGLE_VIDEO" && formData.videoFile && !formData.uploadedVideoId) {
        const vId = await uploadVideoFile();
        if (!vId) return;
        updateFormData({ uploadedVideoId: vId });
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    try {
      setSubmitting(true);
      toast.loading(isEn ? "Publishing ad to Meta v26..." : "جاري نشر الإعلان على منصة Meta v26...", { id: "create-ad" });

      // Clean variation arrays
      const validTexts = formData.primaryTexts.map((t) => t.trim()).filter(Boolean);
      const validHeadlines = formData.headlines.map((h) => h.trim()).filter(Boolean);

      const payload: CreateAdData = {
        adSetId: formData.adSetId,
        name: formData.name,
        status: formData.status || "PAUSED",
        creativeType: formData.creativeType,
        pageId: formData.pageId,
        primaryText: validTexts[0] || "",
        primaryTexts: validTexts,
        headline: validHeadlines[0] || "",
        headlines: validHeadlines,
        description: formData.description || undefined,
        callToAction: formData.callToAction || "ORDER_NOW",
        linkUrl: formData.linkUrl,
        displayLink: formData.displayLink || undefined,
        urlParameters: formData.urlParameters || undefined,
        imageHash: formData.uploadedImageHash || formData.imageHash,
        imageUrl: formData.imageUrl || undefined,
        videoId: formData.uploadedVideoId || formData.videoId,
        advantageCreative: formData.advantageCreative,
        textGeneration: formData.textGeneration,
        textOptimizations: formData.textOptimizations,
        imageEnhancement: formData.imageEnhancement,
        imageTemplates: formData.imageTemplates,
        videoHighlight: formData.videoHighlight,
        musicEnhancement: formData.musicEnhancement,
      };

      await facebookAdsService.createAd(payload);
      toast.success(isEn ? "Ad created successfully on Meta!" : "تم إنشاء الإعلان بنجاح على Meta!", { id: "create-ad" });

      const returnUrl = `/advertising/facebook-ads${selectedAdAccountId ? `?adAccountId=${encodeURIComponent(selectedAdAccountId)}` : ""}`;
      navigate(returnUrl);
    } catch (error: any) {
      console.error("Failed to create ad:", error);
      toast.error(error?.response?.data?.error || (isEn ? "Failed to create ad" : "فشل إنشاء الإعلان"), { id: "create-ad" });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: isEn ? "Media & Identity" : "الهوية والتصميم" },
    { num: 2, label: isEn ? "Copy Variations" : "النصوص والعناوين" },
    { num: 3, label: isEn ? "Advantage+ Suite" : "تحسينات Advantage+" },
    { num: 4, label: isEn ? "Destination & Tracking" : "الوجهة والتتبع" },
    { num: 5, label: isEn ? "Review & Preview" : "المعاينة والمراجعة" },
  ];

  const selectedPage = facebookPages.find((p) => p.pageId === formData.pageId);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-2 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>{isEn ? "Back" : "رجوع"}</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
              {isEn ? "Create New Ad (Creative v26)" : "إنشاء إعلان جديد (Meta v26 Suite)"}
            </h1>
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              Meta v26
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isEn
              ? "Design high-converting creatives with AI optimizations, dynamic copy, and accurate tracking."
              : "صمم إعلاناً بيعياً عالي التحويل مدعوماً بالذكاء الاصطناعي وتنويع النصوص وتتبع المبيعات."}
          </p>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-5 gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {steps.map((step) => (
          <button
            key={step.num}
            type="button"
            onClick={() => {
              if (step.num < currentStep || validateStep(currentStep)) {
                setCurrentStep(step.num);
              }
            }}
            className={`flex items-center gap-2 p-2 rounded-xl text-right transition border ${
              currentStep === step.num
                ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-black shadow-xs"
                : step.num < currentStep
                  ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold"
                  : "border-transparent text-slate-400 dark:text-slate-500 font-semibold hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shrink-0 ${
                currentStep === step.num
                  ? "bg-indigo-600 text-white"
                  : step.num < currentStep
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {step.num < currentStep ? <CheckIcon className="h-3.5 w-3.5 stroke-3" /> : step.num}
            </div>
            <span className="text-[11px] truncate">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step Content */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-xs">
          {currentStep === 1 && (
            <AdIdentityMediaStep
              formData={formData}
              updateFormData={updateFormData}
              facebookPages={facebookPages}
              loadingPages={loadingPages}
              isEn={isEn}
            />
          )}

          {currentStep === 2 && (
            <AdCopyVariationsStep
              formData={formData}
              updateFormData={updateFormData}
              isEn={isEn}
            />
          )}

          {currentStep === 3 && (
            <AdAdvantageCreativeStep
              formData={formData}
              updateFormData={updateFormData}
              isEn={isEn}
            />
          )}

          {currentStep === 4 && (
            <AdDestinationTrackingStep
              formData={formData}
              updateFormData={updateFormData}
              isEn={isEn}
            />
          )}

          {currentStep === 5 && (
            <AdReviewStep
              formData={formData}
              page={selectedPage}
              isEn={isEn}
            />
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
            >
              {isEn ? "Previous" : "السابق"}
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 shadow-sm transition"
              >
                <span>{isEn ? "Continue" : "متابعة"}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 dark:bg-indigo-600 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>{isEn ? "Publishing to Meta..." : "جاري النشر على Meta..."}</span>
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="h-4 w-4 text-emerald-400" />
                    <span>{isEn ? "Launch Ad on Meta" : "نشر الإعلان على Meta"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-6">
          <AdPlacementLivePreview
            formData={formData}
            page={selectedPage}
            isEn={isEn}
          />
        </div>
      </div>

      {/* Mobile Floating Preview Pill */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobilePreview(true)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 text-white px-5 py-2.5 text-xs font-black shadow-2xl border border-slate-700/60 transition active:scale-95"
        >
          <DevicePhoneMobileIcon className="h-4 w-4 text-indigo-400" />
          <span>{isEn ? "Live Ad Preview" : "معاينة الإعلان الحية"}</span>
        </button>
      </div>

      {/* Mobile Preview Bottom Sheet Modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {isEn ? "Live Mobile Ad Preview" : "المعاينة الحية للإعلان"}
              </span>
              <button
                type="button"
                onClick={() => setShowMobilePreview(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <AdPlacementLivePreview
              formData={formData}
              page={selectedPage}
              isEn={isEn}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateAd;
