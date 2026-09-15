import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Facebook,
  Loader2,
  AlertCircle,
  Sparkles,
  Image,
  Video,
  Layers,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Layout,
  X,
  Instagram,
  FileText,
  UploadCloud,
  CheckCircle2,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { FormData, CarouselCard } from "../types";
import type {
  FacebookAdAccount,
  FacebookPage,
  FacebookPagesMeta,
  FacebookPagePost,
} from "../../../../services/facebookAdsService";
import uploadService from "../../../../services/uploadService";
import {
  StoreProductPickerModal,
  SelectedStoreProduct,
} from "../../../../components/advertising/ad/StoreProductPickerModal";
import { getCallToActions } from "../constants";
import { PagePostsSelector } from "./PagePostsSelector";
import { AdPlacementPreview } from "./AdPlacementPreview";
import { AdCopyVariationsEditor } from "./AdCopyVariationsEditor";
import { WhatsAppGreetingEditor } from "./WhatsAppGreetingEditor";
import { PlacementMediaCustomizer } from "./PlacementMediaCustomizer";
import { UtmBuilderModal } from "./UtmBuilderModal";
import { MultiAdvertiserToggle } from "./MultiAdvertiserToggle";
import { InstagramIdentitySelector } from "./InstagramIdentitySelector";

interface Step5CreativeProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  handleChange: (field: keyof FormData, value: any) => void;
  getError: (field: string) => string;
  facebookPages: FacebookPage[];
  facebookPagesMeta: FacebookPagesMeta | null;
  loadingPages: boolean;
  selectedFacebookPage: FacebookPage | undefined;
  selectedAdAccount: FacebookAdAccount | undefined;
  selectedAdAccountId: string;
  selectedAdAccountIsActive: boolean;
  syncingAdAccount: boolean;
  handleActivateSelectedAdAccount: () => Promise<void>;
  isStorefrontProductLaunch: boolean;
  isAiDraftPrefill: boolean;
  launchPrefillProductTitle: string;
}

export const Step5Creative: React.FC<Step5CreativeProps> = ({
  formData,
  setFormData,
  handleChange,
  getError,
  facebookPages,
  facebookPagesMeta,
  loadingPages,
  selectedFacebookPage,
  selectedAdAccount,
  selectedAdAccountId,
  selectedAdAccountIsActive,
  syncingAdAccount,
  handleActivateSelectedAdAccount,
  isStorefrontProductLaunch,
  isAiDraftPrefill,
  launchPrefillProductTitle,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const callToActions = getCallToActions(isEn);

  const [creativeSource, setCreativeSource] = useState<"NEW_AD" | "EXISTING_POST">(
    formData.creativeType === "EXISTING_POST" ? "EXISTING_POST" : "NEW_AD",
  );
  const [showUtmModal, setShowUtmModal] = useState(false);

  // Upload refs & state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flexibleInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  const handleMediaUpload = async (file: File) => {
    if (!file) return;
    setUploadError(null);

    const isImage = formData.creativeType === "SINGLE_IMAGE";
    const isVideo = formData.creativeType === "SINGLE_VIDEO";

    // 1. Type validation
    if (isImage && !file.type.startsWith("image/")) {
      const msg = isEn
        ? "Please select a valid image file (PNG, JPG, WEBP)"
        : "يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP)";
      setUploadError(msg);
      toast.error(msg);
      return;
    }
    if (isVideo && !file.type.startsWith("video/")) {
      const msg = isEn
        ? "Please select a valid video file (MP4, MOV, WEBM)"
        : "يرجى اختيار ملف فيديو صالح (MP4, MOV, WEBM)";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    // 2. Size validation
    const maxImageSize = 25 * 1024 * 1024; // 25MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    if (isImage && file.size > maxImageSize) {
      const msg = isEn
        ? "Image size must not exceed 25MB"
        : "حجم الصورة يجب ألا يتجاوز 25 ميجابايت";
      setUploadError(msg);
      toast.error(msg);
      return;
    }
    if (isVideo && file.size > maxVideoSize) {
      const msg = isEn
        ? "Video size must not exceed 100MB"
        : "حجم الفيديو يجب ألا يتجاوز 100 ميجابايت";
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const toastId = "media-upload-toast";
      toast.loading(
        isEn
          ? `Uploading ${isImage ? "image" : "video"}...`
          : `جاري رفع ${isImage ? "الصورة" : "الفيديو"}...`,
        { id: toastId },
      );

      const res = await uploadService.uploadMedia(file, (percent) => {
        setUploadProgress(percent);
      });

      if (res.success && res.data) {
        let mediaUrl = res.data.url;
        if (res.data.fullUrl) {
          mediaUrl = res.data.fullUrl;
        } else if (mediaUrl.startsWith("/")) {
          mediaUrl = `${window.location.origin}${mediaUrl}`;
        }

        if (isImage) {
          handleChange("imageUrl", mediaUrl);
          toast.success(
            isEn ? "Image uploaded successfully" : "تم رفع الصورة بنجاح",
            { id: toastId },
          );
        } else {
          handleChange("videoUrl", mediaUrl);
          toast.success(
            isEn ? "Video uploaded successfully" : "تم رفع الفيديو بنجاح",
            { id: toastId },
          );
        }
      } else {
        const errorMsg =
          res.error || (isEn ? "Failed to upload media" : "فشل رفع الملف");
        setUploadError(errorMsg);
        toast.error(errorMsg, { id: toastId });
      }
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err.message ||
        (isEn ? "Upload failed" : "فشل في رفع الملف");
      setUploadError(errorMsg);
      toast.error(errorMsg, { id: "media-upload-toast" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleMediaUpload(file);
    }
  };

  const handleCardImageUpload = async (cardId: string, file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(
        isEn ? "Please select a valid image file" : "يرجى اختيار ملف صورة صالح",
      );
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error(
        isEn
          ? "Image size must not exceed 25MB"
          : "حجم الصورة يجب ألا يتجاوز 25 ميجابايت",
      );
      return;
    }

    try {
      setUploadingCardId(cardId);
      toast.loading(
        isEn ? "Uploading card image..." : "جاري رفع صورة البطاقة...",
        { id: `card-upload-${cardId}` },
      );
      const res = await uploadService.uploadMedia(file);
      if (res.success && res.data) {
        let mediaUrl = res.data.url;
        if (res.data.fullUrl) {
          mediaUrl = res.data.fullUrl;
        } else if (mediaUrl.startsWith("/")) {
          mediaUrl = `${window.location.origin}${mediaUrl}`;
        }
        const updated = formData.carouselCards.map((c) =>
          c.id === cardId ? { ...c, imageUrl: mediaUrl } : c,
        );
        handleChange("carouselCards", updated);
        toast.success(
          isEn ? "Card image uploaded successfully" : "تم رفع صورة البطاقة بنجاح",
          { id: `card-upload-${cardId}` },
        );
      } else {
        toast.error(
          res.error || (isEn ? "Failed to upload image" : "فشل رفع الصورة"),
          { id: `card-upload-${cardId}` },
        );
      }
    } catch (err: any) {
      toast.error(
        err.message || (isEn ? "Failed to upload image" : "فشل رفع الصورة"),
        { id: `card-upload-${cardId}` },
      );
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleProductSelect = (product: SelectedStoreProduct) => {
    if (product.imageUrl) {
      handleChange("imageUrl", product.imageUrl);
    }
    if (product.landingUrl) {
      handleChange("linkUrl", product.landingUrl);
    }
    if (product.name) {
      if (!formData.adName) {
        handleChange("adName", `${product.name} - Ad`);
      }
      if (!formData.headline) {
        handleChange(
          "headline",
          `${product.name} - ${product.price.toLocaleString()} ج.م`,
        );
      }
      if (!formData.primaryText) {
        handleChange(
          "primaryText",
          product.description ||
            `اطلبي الآن ${product.name} بأفضل جودة وخامات ممتازة مع شحن سريع ومعاينة قبل الاستلام!`,
        );
      }
    }
    toast.success(
      isEn
        ? `Product "${product.name}" imported with image & link!`
        : `تم استيراد بيانات "${product.name}" وتعبئة الصورة والرابط بنجاح!`,
    );
  };

  const handleFlexibleFilesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (formData.flexibleAssets.length + files.length > 10) {
      toast.error(
        isEn ? "Maximum 10 assets allowed" : "الحد الأقصى هو 10 ملفات",
      );
      return;
    }

    toast.loading(
      isEn ? "Uploading assets..." : "جاري رفع الملفات...",
      { id: "flexible-upload" },
    );
    try {
      const newAssets: { id: string; type: "IMAGE" | "VIDEO"; url: string }[] =
        [];
      for (const file of files) {
        const isVid = file.type.startsWith("video/");
        const res = await uploadService.uploadMedia(file);
        if (res.success && res.data) {
          const url =
            res.data.fullUrl || `${window.location.origin}${res.data.url}`;
          newAssets.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: isVid ? "VIDEO" : "IMAGE",
            url,
          });
        }
      }
      if (newAssets.length > 0) {
        handleChange("flexibleAssets", [
          ...formData.flexibleAssets,
          ...newAssets,
        ]);
        toast.success(
          isEn
            ? `Uploaded ${newAssets.length} asset(s)`
            : `تم رفع ${newAssets.length} ملف(ات) بنجاح`,
          { id: "flexible-upload" },
        );
      }
    } catch (err: any) {
      toast.error(err.message || (isEn ? "Upload failed" : "فشل الرفع"), {
        id: "flexible-upload",
      });
    } finally {
      if (flexibleInputRef.current) flexibleInputRef.current.value = "";
    }
  };

  const handleSelectPagePost = (post: FacebookPagePost) => {
    handleChange("postId", post.id);
    handleChange("creativeType", "EXISTING_POST");
    if (post.message) handleChange("primaryText", post.message);
    if (post.pictureUrl) handleChange("imageUrl", post.pictureUrl);
    if (post.permalinkUrl) handleChange("linkUrl", post.permalinkUrl);
  };

  const handleManualPostId = (postId: string) => {
    handleChange("postId", postId);
    handleChange("creativeType", "EXISTING_POST");
  };
  const readyCompanyPages = facebookPages.filter(
    (page) => page.status === "READY",
  );
  const accessibleUnlinkedPages = facebookPages.filter(
    (page) => page.status === "ACCESSIBLE_BUT_NOT_CONNECTED",
  );
  const connectedButUnavailablePages = facebookPages.filter(
    (page) => page.status === "CONNECTED_BUT_NOT_ACCESSIBLE",
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-5">
          {/* Facebook Page Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Facebook Page" : "صفحة Facebook"} <span className="text-red-500">*</span>
            </label>
            {facebookPagesMeta?.primaryWarning && (
              <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300">
                {facebookPagesMeta.primaryWarning}
              </div>
            )}
            {loadingPages ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 p-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{isEn ? "Loading pages..." : "جاري تحميل الصفحات..."}</span>
              </div>
            ) : facebookPages.length > 0 ? (
              <select
                value={formData.pageId}
                onChange={(e) => handleChange("pageId", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  getError("pageId") ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">{isEn ? "Select Page" : "اختر الصفحة"}</option>
                {readyCompanyPages.length > 0 && (
                  <optgroup label={isEn ? "Ready Company Pages" : "صفحات الشركة الجاهزة"}>
                    {readyCompanyPages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name} {page.category && `(${page.category})`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {accessibleUnlinkedPages.length > 0 && (
                  <optgroup label={isEn ? "Meta Pages Not Linked to Company" : "صفحات Meta غير المربوطة بالشركة"}>
                    {accessibleUnlinkedPages.map((page) => (
                      <option key={page.id} value={page.id} disabled>
                        {page.name} {page.category && `(${page.category})`} - {isEn ? "Link to company before publishing" : "اربطها بالشركة قبل النشر"}
                      </option>
                    ))}
                  </optgroup>
                )}
                {connectedButUnavailablePages.length > 0 && (
                  <optgroup label={isEn ? "Currently Unavailable Company Pages" : "صفحات الشركة غير المتاحة حالياً"}>
                    {connectedButUnavailablePages.map((page) => (
                      <option
                        key={page.id}
                        value={page.id}
                        disabled={page.isSelectable === false}
                      >
                        {page.name} - {isEn ? "Requires Facebook reconnection" : "تحتاج إعادة ربط Facebook"}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/60 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  {isEn ? "⚠️ No pages available. You can enter the page ID manually:" : "⚠️ لا توجد صفحات متاحة. يمكنك إدخال معرف الصفحة يدوياً:"}
                </p>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => handleChange("pageId", e.target.value)}
                  placeholder={isEn ? "e.g. 123456789" : "مثال: 123456789"}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm"
                />
              </div>
            )}
            {facebookPagesMeta?.counts && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/40 px-3 py-2 text-xs text-green-800 dark:text-green-300">
                  {isEn ? "Ready Pages: " : "صفحات الشركة الجاهزة: "}{facebookPagesMeta.counts.ready}
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  {isEn ? "Unlinked Meta Pages: " : "صفحات Meta غير المربوطة: "}{facebookPagesMeta.counts.accessibleButNotConnected}
                </div>
                <div className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-300">
                  {isEn ? "Unavailable Pages: " : "صفحات الشركة غير المتاحة: "}{facebookPagesMeta.counts.connectedButNotAccessible}
                </div>
              </div>
            )}
            {selectedFacebookPage &&
              selectedFacebookPage.isConnectedToCompany === false && (
                <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-300">
                  {isEn
                    ? "The ad will be published under an available page from the current Meta account, but it is not linked to this company in Max P."
                    : "سيتم إنشاء الإعلان باسم صفحة متاحة من حساب Meta الحالي لكنها غير مربوطة بهذه الشركة داخل Max P."}
                </div>
              )}
            {selectedFacebookPage?.warning && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {selectedFacebookPage.warning}
              </p>
            )}
            {facebookPagesMeta?.permissions?.missingRecommended?.length ? (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {isEn ? "Recommended permissions to display all pages: " : "الصلاحيات التي قد نحتاجها لإظهار الصفحات بشكل أكمل: "}
                {facebookPagesMeta.permissions.missingRecommended.join(", ")}
              </p>
            ) : null}
            {getError("pageId") && (
              <p className="mt-1 text-sm text-red-500">{getError("pageId")}</p>
            )}

            {/* Instagram Account Identity */}
            {formData.pageId && (
              <InstagramIdentitySelector
                pageName={selectedFacebookPage?.name}
                instagramActorId={formData.instagramActorId || ""}
                onInstagramActorIdChange={(val) => handleChange("instagramActorId", val)}
              />
            )}
          </div>

          {/* Creative Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Creative Source" : "مصدر الإعلان (Creative Source)"}
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => {
                  setCreativeSource("NEW_AD");
                  if (formData.creativeType === "EXISTING_POST") {
                    handleChange("creativeType", "SINGLE_IMAGE");
                  }
                }}
                className={`p-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm ${
                  creativeSource === "NEW_AD"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800"
                }`}
              >
                <Plus className="w-4 h-4" />
                {isEn ? "Create New Ad" : "إنشاء إعلان جديد"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreativeSource("EXISTING_POST");
                  handleChange("creativeType", "EXISTING_POST");
                }}
                className={`p-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm ${
                  creativeSource === "EXISTING_POST"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                {isEn ? "Use Existing Post" : "استخدام منشور حالي"}
              </button>
            </div>
          </div>

          {creativeSource === "EXISTING_POST" ? (
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
              <PagePostsSelector
                pageId={formData.pageId}
                selectedPostId={formData.postId}
                onSelectPost={handleSelectPagePost}
                onManualPostIdChange={handleManualPostId}
                error={getError("postId")}
              />
            </div>
          ) : (
            <>
              {/* Creative Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {isEn ? "Creative Format" : "نوع المحتوى"}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_IMAGE")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_IMAGE"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                }`}
              >
                <Image
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_IMAGE" ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}
                />
                <div className="font-medium text-sm">{isEn ? "Image" : "صورة"}</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_VIDEO")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_VIDEO"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                }`}
              >
                <Eye
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_VIDEO" ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}
                />
                <div className="font-medium text-sm">{isEn ? "Video" : "فيديو"}</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange("creativeType", "CAROUSEL");
                  if (formData.carouselCards.length === 0) {
                    handleChange("carouselCards", [
                      {
                        id: "1",
                        imageUrl: "",
                        headline: "",
                        description: "",
                        linkUrl: "",
                      },
                      {
                        id: "2",
                        imageUrl: "",
                        headline: "",
                        description: "",
                        linkUrl: "",
                      },
                    ]);
                  }
                }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "CAROUSEL"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                }`}
              >
                <Layout
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "CAROUSEL" ? "text-blue-500" : "text-gray-400 dark:text-gray-500"}`}
                />
                <div className="font-medium text-sm">{isEn ? "Carousel" : "دوّار"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{isEn ? "2-10 cards" : "2-10 بطاقات"}</div>
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title={isEn ? "Flexible format in progress" : "التنسيق المرن قيد التجهيز"}
                className="p-4 border-2 rounded-xl text-center transition-all border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 opacity-60 cursor-not-allowed"
              >
                <Sparkles
                  className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500"
                />
                <div className="font-medium text-sm">{isEn ? "Flexible" : "مرن"}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{isEn ? "Soon" : "قريبًا"}</div>
              </button>
            </div>
            {getError("creativeType") && (
              <p className="mt-2 text-sm text-red-500">
                {getError("creativeType")}
              </p>
            )}
          </div>

          {/* Flexible Assets Upload */}
          {formData.creativeType === "FLEXIBLE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isEn ? "Images & Videos (up to 10 files)" : "الصور والفيديوهات (حتى 10 ملفات)"}{" "}
                <span className="text-red-500">*</span>
              </label>

              <div
                onClick={() => flexibleInputRef.current?.click()}
                className="border-2 border-dashed border-green-300 dark:border-green-800/60 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50 dark:bg-green-950/30"
              >
                <input
                  type="file"
                  ref={flexibleInputRef}
                  multiple
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFlexibleFilesUpload(e.target.files);
                    }
                  }}
                />
                <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  {isEn ? "Upload up to 10 images or videos" : "ارفع حتى 10 صور أو فيديوهات"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {isEn ? "Facebook will automatically select the best format for each user" : "سيختار Facebook تلقائياً أفضل تنسيق لكل مستخدم"}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    flexibleInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  {isEn ? "Choose Files" : "اختر الملفات"}
                </button>
              </div>

              {/* Uploaded Assets List */}
              {formData.flexibleAssets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isEn ? `Uploaded Files (${formData.flexibleAssets.length}/10)` : `الملفات المرفوعة (${formData.flexibleAssets.length}/10)`}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.flexibleAssets.map((asset, index) => (
                      <div key={asset.id} className="relative group">
                        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                          {asset.type === "IMAGE" ? (
                            <img
                              src={asset.url}
                              alt={`Asset ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newAssets = formData.flexibleAssets.filter(
                              (a) => a.id !== asset.id,
                            );
                            handleChange("flexibleAssets", newAssets);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black bg-opacity-70 text-white text-xs rounded">
                          {asset.type === "IMAGE" ? (isEn ? "Image" : "صورة") : (isEn ? "Video" : "فيديو")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Upload/URL - Single Image/Video */}
          {(formData.creativeType === "SINGLE_IMAGE" ||
            formData.creativeType === "SINGLE_VIDEO") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formData.creativeType === "SINGLE_IMAGE"
                    ? (isEn ? "Image" : "الصورة")
                    : (isEn ? "Video" : "الفيديو")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {isEn ? "Select from Store Products" : "اختيار من منتجات المتجر"}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  formData.creativeType === "SINGLE_IMAGE"
                    ? "image/png,image/jpeg,image/webp,image/jpg"
                    : "video/mp4,video/quicktime,video/webm"
                }
                className="hidden"
                id="media-upload"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMediaUpload(file);
                }}
              />

              {/* Active preview if media is present */}
              {((formData.creativeType === "SINGLE_IMAGE" && formData.imageUrl) ||
                (formData.creativeType === "SINGLE_VIDEO" && formData.videoUrl)) &&
              !uploading ? (
                <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 overflow-hidden">
                  {formData.creativeType === "SINGLE_VIDEO" ? (
                    <div className="relative bg-black flex items-center justify-center">
                      <video
                        src={formData.videoUrl}
                        className="w-full max-h-64 object-contain mx-auto"
                        controls
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="relative h-48 sm:h-56 bg-slate-900/5 dark:bg-slate-950/40 flex items-center justify-center p-2">
                      <img
                        src={formData.imageUrl}
                        alt="Ad Creative"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                  )}

                  <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                        {formData.creativeType === "SINGLE_VIDEO" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <Image className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                          {formData.creativeType === "SINGLE_IMAGE"
                            ? formData.imageUrl
                            : formData.videoUrl}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          {isEn ? "Media ready for Meta Ad" : "الملف جاهز للإعلان"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        {isEn ? "Replace" : "تغيير"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.creativeType === "SINGLE_IMAGE") {
                            handleChange("imageUrl", "");
                          } else {
                            handleChange("videoUrl", "");
                          }
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                        title={isEn ? "Remove" : "حذف"}
                        aria-label={isEn ? "Remove" : "حذف"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Drag & drop upload area */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40"
                      : "border-gray-300 dark:border-gray-700 hover:border-blue-400 bg-gray-50 dark:bg-gray-800/60"
                  }`}
                >
                  {uploading ? (
                    <div className="py-2 space-y-3">
                      <Loader2 className="w-10 h-10 mx-auto text-blue-500 animate-spin" />
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {isEn ? `Uploading... ${uploadProgress}%` : `جاري الرفع... ${uploadProgress}%`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {isEn ? "Processing file and verifying format" : "جاري معالجة الملف والتحقق من التنسيق"}
                        </p>
                      </div>
                      <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                        {isEn
                          ? "Click to upload or drag & drop"
                          : "انقر للرفع من جهازك أو اسحب الملف وأفلته هنا"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formData.creativeType === "SINGLE_IMAGE"
                          ? (isEn
                              ? "PNG, JPG, WEBP (Max 25MB) • 1080x1080 Recommended"
                              : "PNG, JPG, WEBP (بحد أقصى 25 ميجابايت) • يُفضل 1080x1080")
                          : (isEn
                              ? "MP4, MOV (Max 100MB) • Up to 2 minutes recommended"
                              : "MP4, MOV (بحد أقصى 100 ميجابايت) • مدة حتى دقيقتين")}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Upload error banner if any */}
              {uploadError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Or Direct URL */}
              <div className="pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {isEn ? "or enter direct URL" : "أو أدخل رابط مباشر"}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                </div>
                <input
                  type="url"
                  value={
                    formData.creativeType === "SINGLE_IMAGE"
                      ? formData.imageUrl
                      : formData.videoUrl
                  }
                  onChange={(e) =>
                    handleChange(
                      formData.creativeType === "SINGLE_IMAGE"
                        ? "imageUrl"
                        : "videoUrl",
                      e.target.value,
                    )
                  }
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {formData.creativeType === "SINGLE_IMAGE" &&
                  getError("imageUrl") && (
                    <p className="mt-1 text-xs text-red-500">
                      {getError("imageUrl")}
                    </p>
                  )}
                {formData.creativeType === "SINGLE_VIDEO" &&
                  getError("videoUrl") && (
                    <p className="mt-1 text-xs text-red-500">
                      {getError("videoUrl")}
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Stories / Reels 9:16 Custom Media */}
          {(formData.creativeType === "SINGLE_IMAGE" ||
            formData.creativeType === "SINGLE_VIDEO") && (
            <PlacementMediaCustomizer
              customStoriesMedia={Boolean(formData.customStoriesMedia)}
              onToggleCustomStories={(val) => handleChange("customStoriesMedia", val)}
              storyImageUrl={formData.storyImageUrl || ""}
              onStoryImageUrlChange={(val) => handleChange("storyImageUrl", val)}
              storyVideoUrl={formData.storyVideoUrl || ""}
              onStoryVideoUrlChange={(val) => handleChange("storyVideoUrl", val)}
              creativeType={formData.creativeType}
            />
          )}

          {/* Carousel Cards */}
          {formData.creativeType === "CAROUSEL" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isEn ? `Carousel Cards (${formData.carouselCards.length}/10)` : `بطاقات الدوّار (${formData.carouselCards.length}/10)`}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.carouselCards.length < 10) {
                      handleChange("carouselCards", [
                        ...formData.carouselCards,
                        {
                          id: Date.now().toString(),
                          imageUrl: "",
                          headline: "",
                          description: "",
                          linkUrl: "",
                        },
                      ]);
                    }
                  }}
                  disabled={formData.carouselCards.length >= 10}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEn ? "+ Add Card" : "+ إضافة بطاقة"}
                </button>
              </div>
              {getError("carouselCards") && (
                <p className="mb-3 text-sm text-red-500">
                  {getError("carouselCards")}
                </p>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.carouselCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                        {isEn ? `Card ${index + 1}` : `بطاقة ${index + 1}`}
                      </h5>
                      {formData.carouselCards.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange(
                              "carouselCards",
                              formData.carouselCards.filter(
                                (c) => c.id !== card.id,
                              ),
                            );
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Image URL with Direct Upload */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-gray-600 dark:text-gray-400">
                            {isEn ? "Image URL *" : "صورة البطاقة *"}
                          </label>
                          <label
                            htmlFor={`card-upload-${card.id}`}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ${
                              uploadingCardId === card.id ? "opacity-50 pointer-events-none" : ""
                            }`}
                          >
                            {uploadingCardId === card.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {isEn ? "Uploading..." : "جاري الرفع..."}
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3 h-3" />
                                {isEn ? "Upload from device" : "رفع من الجهاز"}
                              </>
                            )}
                          </label>
                          <input
                            type="file"
                            id={`card-upload-${card.id}`}
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            className="hidden"
                            disabled={uploadingCardId === card.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCardImageUpload(card.id, file);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {card.imageUrl && (
                            <div className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-900">
                              <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <input
                            type="url"
                            value={card.imageUrl}
                            onChange={(e) => {
                              const updated = formData.carouselCards.map((c) =>
                                c.id === card.id
                                  ? { ...c, imageUrl: e.target.value }
                                  : c,
                              );
                              handleChange("carouselCards", updated);
                            }}
                            placeholder="https://..."
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Headline */}
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {isEn ? "Headline *" : "العنوان *"}
                        </label>
                        <input
                          type="text"
                          value={card.headline}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, headline: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder={isEn ? "Card headline" : "عنوان البطاقة"}
                          maxLength={40}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {isEn ? "Description" : "الوصف"}
                        </label>
                        <input
                          type="text"
                          value={card.description}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, description: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder={isEn ? "Card description" : "وصف البطاقة"}
                          maxLength={20}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Link URL */}
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {isEn ? "Destination URL *" : "رابط الوجهة *"}
                        </label>
                        <input
                          type="url"
                          value={card.linkUrl}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, linkUrl: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Text & Headline Variations */}
          <AdCopyVariationsEditor
            primaryText={formData.primaryText}
            onPrimaryTextChange={(val) => handleChange("primaryText", val)}
            textVariations={formData.textVariations || []}
            onTextVariationsChange={(variations) =>
              handleChange("textVariations", variations)
            }
            headline={formData.headline}
            onHeadlineChange={(val) => handleChange("headline", val)}
            headlineVariations={formData.headlineVariations || []}
            onHeadlineVariationsChange={(variations) =>
              handleChange("headlineVariations", variations)
            }
            primaryTextError={getError("primaryText")}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Description" : "الوصف"}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder={isEn ? "Short description appearing below headline" : "وصف مختصر يظهر أسفل العنوان"}
              maxLength={30}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${isEn ? "text-right" : "text-left"}`}>
              {formData.description.length}/30
            </p>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Destination URL" : "رابط الوجهة"} <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleChange("linkUrl", e.target.value)}
              placeholder="https://yourwebsite.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                getError("linkUrl") ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {getError("linkUrl") && (
              <p className="mt-1 text-sm text-red-500">{getError("linkUrl")}</p>
            )}
          </div>

          {/* Display Link & URL Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isEn ? "Display Link (Optional)" : "رابط العرض (اختياري)"}
              </label>
              <input
                type="text"
                value={formData.displayLink}
                onChange={(e) => handleChange("displayLink", e.target.value)}
                placeholder={isEn ? "e.g. yoursite.com/sale" : "مثال: yoursite.com/sale"}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isEn ? "Text shown instead of the full URL" : "النص الذي يظهر بدلاً من الرابط الكامل"}
              </p>
            </div>

            {/* URL Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isEn ? "URL Parameters (UTM)" : "معاملات URL (UTM)"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowUtmModal(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isEn ? "Dynamic UTM Builder" : "مُنشئ الرموز الديناميكية (UTM Builder)"}
                </button>
              </div>
              <input
                type="text"
                value={formData.urlParameters}
                onChange={(e) => handleChange("urlParameters", e.target.value)}
                placeholder="مثال: utm_source={{site_source_name}}&utm_campaign={{campaign.name}}"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isEn ? "For accurate source tracking in Google Analytics and CRM systems" : "لتتبع مصدر الزيارات بدقة في Google Analytics وأنظمة الـ CRM"}
              </p>
            </div>
          </div>
        </>
      )}

          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isEn ? "Call to Action" : "زر الإجراء"}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {callToActions.map((cta) => (
                <button
                  key={cta.value}
                  type="button"
                  onClick={() => handleChange("callToAction", cta.value)}
                  className={`py-2 px-3 text-xs rounded-lg border transition-all ${
                    formData.callToAction === cta.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                  }`}
                >
                  {cta.label}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Greeting & Quick FAQs Editor */}
          {(formData.callToAction === "WHATSAPP_MESSAGE" ||
            formData.conversionLocation === "WHATSAPP") && (
            <WhatsAppGreetingEditor
              greeting={formData.whatsappGreeting || ""}
              onGreetingChange={(val) => handleChange("whatsappGreeting", val)}
              quickFaqs={formData.whatsappQuickFaqs || []}
              onQuickFaqsChange={(faqs) =>
                handleChange("whatsappQuickFaqs", faqs)
              }
            />
          )}

          {/* Advantage+ Creative Enhancements */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {isEn ? "Advantage+ Creative Enhancements (Meta AI)" : "تحسينات Advantage+ Creative الإبداعية (Meta AI)"}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {isEn
                    ? "Let Meta algorithms optimize image lighting, auto-crop for different placements, and generate copy combinations to boost CTR and conversions."
                    : "دع خوارزميات Meta تحسن إضاءة الصور، قصها تلقائياً للمواضع المختلفة، وتوليد تركيبات للعناوين لرفع نسبة النقر والتحويل."}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.advantageCreative)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    handleChange("advantageCreative", checked);
                    handleChange("imageEnhancement", checked);
                    handleChange("textGeneration", checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <AdPlacementPreview
            formData={formData}
            pageName={selectedFacebookPage?.name || (isEn ? "Your Page Name" : "اسم صفحتك")}
            isExistingPost={creativeSource === "EXISTING_POST"}
          />

          {/* Advantage+ Creative */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-4 rounded-xl border border-green-200 dark:border-green-800/50 space-y-3 mt-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Advantage+ Creative
            </h4>
            {creativeSource === "EXISTING_POST" ? (
              <div className="rounded-lg bg-white/80 dark:bg-gray-800/80 p-3 text-xs text-gray-600 dark:text-gray-300 border border-green-100 dark:border-green-900 leading-relaxed">
                {isEn
                  ? "Advantage+ creative modifications (copy variations, image touchups, auto-crop) are not applicable for existing page posts because the content is already published organically on your Facebook Page."
                  : "تحسينات Advantage+ الذكية (توليد النصوص، تعديل الصور، المد التلقائي) غير متاحة للمنشورات الحالية لأن المنشور منشور بالفعل على صفحة فيسبوك بهيئته الحالية."}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {isEn ? "Let Facebook automatically optimize your ad for maximum performance" : "دع Facebook يحسن إعلانك تلقائياً للحصول على أفضل أداء"}
                </p>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isEn ? "Text Optimization" : "تحسين النص"}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isEn ? "Generate multiple variations of ad copy" : "إنشاء نسخ متعددة من النص"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.textGeneration}
                    onChange={(e) => {
                      handleChange("textGeneration", e.target.checked);
                      if (e.target.checked) handleChange("advantageCreative", true);
                    }}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isEn ? "Image & Contrast Enhancement" : "تحسين الصورة والتباين"}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isEn ? "Automatically adjust brightness and contrast" : "تعديل السطوع والتباين تلقائياً"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.imageEnhancement}
                    onChange={(e) => {
                      handleChange("imageEnhancement", e.target.checked);
                      if (e.target.checked) handleChange("advantageCreative", true);
                    }}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {isEn ? "Smart Reel Expansion (9:16)" : "المد الذكي للريلز (9:16)"}
                      </span>
                      <span className="rounded bg-green-100 dark:bg-green-950/60 px-1 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300">v26</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isEn ? "Expand image dimensions to fill Stories & Reels screens automatically" : "تمديد أبعاد الصور لتملأ شاشة Stories و Reels تلقائياً"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.expandImage)}
                    onChange={(e) => {
                      handleChange("expandImage", e.target.checked);
                      if (e.target.checked) handleChange("advantageCreative", true);
                    }}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {isEn ? "Highlight Positive Comments" : "إبراز التعليقات الإيجابية"}
                      </span>
                      <span className="rounded bg-green-100 dark:bg-green-950/60 px-1 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300">v26</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {isEn ? "Pin top customer reviews below the ad as social proof" : "تثبيت آراء العملاء الممتازة أسفل الإعلان كإثبات اجتماعي"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(formData.relevantComments)}
                    onChange={(e) => {
                      handleChange("relevantComments", e.target.checked);
                      if (e.target.checked) handleChange("advantageCreative", true);
                    }}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                </label>
              </>
            )}
          </div>

          {/* Multi-Advertiser Ads */}
          <div className="mt-4">
            <MultiAdvertiserToggle
              enabled={formData.multiAdvertiserAds !== false}
              onChange={(enabled) => handleChange("multiAdvertiserAds", enabled)}
            />
          </div>
        </div>
      </div>

      {/* UTM Dynamic Macro Builder Modal */}
      <UtmBuilderModal
        isOpen={showUtmModal}
        onClose={() => setShowUtmModal(false)}
        currentValue={formData.urlParameters}
        onApply={(val) => handleChange("urlParameters", val)}
      />

      {/* Store Product Picker Modal */}
      <StoreProductPickerModal
        isOpen={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onSelect={handleProductSelect}
        isEn={isEn}
      />
    </div>
  );
};
