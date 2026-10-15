import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
  AdPlacementLivePreview,
} from "../../components/advertising/ad";
import { CreateAdStepsNav } from "./CreateAdStepsNav";
import { CreateAdStepContent } from "./CreateAdStepContent";
import { CreateAdMobilePreview } from "./CreateAdMobilePreview";

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
      if (res.data?.success && (res.data?.data || res.data?.pages)) {
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

      if (res.data?.success && res.data?.hash) {
        toast.success(isEn ? "Image uploaded successfully" : "تم رفع الصورة بنجاح", { id: "upload-media" });
        return res.data.hash;
      }
      throw new Error(res.data?.error || "Upload failed");
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

      if (res.data?.success && res.data?.videoId) {
        toast.success(isEn ? "Video uploaded successfully" : "تم رفع الفيديو بنجاح", { id: "upload-media" });
        return res.data.videoId;
      }
      throw new Error(res.data?.error || "Upload failed");
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
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-2 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isEn ? "Back" : "رجوع"}</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {isEn ? "Create New Ad (Creative v26)" : "إنشاء إعلان جديد (Meta v26 Suite)"}
            </h1>
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-mono font-medium text-primary">
              Meta v26
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isEn
              ? "Design high-converting creatives with AI optimizations, dynamic copy, and accurate tracking."
              : "صمم إعلاناً بيعياً عالي التحويل مدعوماً بالذكاء الاصطناعي وتنويع النصوص وتتبع المبيعات."}
          </p>
        </div>
      </div>

      {/* Stepper Bar */}
      <CreateAdStepsNav
        steps={steps}
        currentStep={currentStep}
        onSelectStep={(num) => {
          if (num < currentStep || validateStep(currentStep)) {
            setCurrentStep(num);
          }
        }}
      />

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step Content */}
        <CreateAdStepContent
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          formData={formData}
          updateFormData={updateFormData}
          facebookPages={facebookPages}
          loadingPages={loadingPages}
          selectedPage={selectedPage}
          isEn={isEn}
          submitting={submitting}
          handleNext={handleNext}
          handleSubmit={handleSubmit}
        />

        {/* Live Preview Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-6">
          <AdPlacementLivePreview
            formData={formData}
            page={selectedPage}
            isEn={isEn}
          />
        </div>
      </div>

      {/* Mobile Preview Controls & Modal */}
      <CreateAdMobilePreview
        showMobilePreview={showMobilePreview}
        setShowMobilePreview={setShowMobilePreview}
        formData={formData}
        selectedPage={selectedPage}
        isEn={isEn}
      />
    </div>
  );
};

export default CreateAd;
