import React, { useState } from "react";
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
} from "lucide-react";
import type { FormData, CarouselCard } from "../types";
import type {
  FacebookAdAccount,
  FacebookPage,
  FacebookPagesMeta,
  FacebookPagePost,
} from "../../../../services/facebookAdsService";
import { CALL_TO_ACTIONS } from "../constants";
import { PagePostsSelector } from "./PagePostsSelector";
import { AdPlacementPreview } from "./AdPlacementPreview";
import { AdCopyVariationsEditor } from "./AdCopyVariationsEditor";
import { WhatsAppGreetingEditor } from "./WhatsAppGreetingEditor";

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
  const [creativeSource, setCreativeSource] = useState<"NEW_AD" | "EXISTING_POST">(
    formData.creativeType === "EXISTING_POST" ? "EXISTING_POST" : "NEW_AD",
  );

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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صفحة Facebook <span className="text-red-500">*</span>
            </label>
            {facebookPagesMeta?.primaryWarning && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {facebookPagesMeta.primaryWarning}
              </div>
            )}
            {loadingPages ? (
              <div className="flex items-center gap-2 text-gray-500 p-3 border border-gray-300 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري تحميل الصفحات...</span>
              </div>
            ) : facebookPages.length > 0 ? (
              <select
                value={formData.pageId}
                onChange={(e) => handleChange("pageId", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  getError("pageId") ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">اختر الصفحة</option>
                {readyCompanyPages.length > 0 && (
                  <optgroup label="صفحات الشركة الجاهزة">
                    {readyCompanyPages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name} {page.category && `(${page.category})`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {accessibleUnlinkedPages.length > 0 && (
                  <optgroup label="صفحات Meta غير المربوطة بالشركة">
                    {accessibleUnlinkedPages.map((page) => (
                      <option key={page.id} value={page.id} disabled>
                        {page.name} {page.category && `(${page.category})`} -
                        اربطها بالشركة قبل النشر
                      </option>
                    ))}
                  </optgroup>
                )}
                {connectedButUnavailablePages.length > 0 && (
                  <optgroup label="صفحات الشركة غير المتاحة حالياً">
                    {connectedButUnavailablePages.map((page) => (
                      <option
                        key={page.id}
                        value={page.id}
                        disabled={page.isSelectable === false}
                      >
                        {page.name} - تحتاج إعادة ربط Facebook
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 mb-2">
                  ⚠️ لا توجد صفحات متاحة. يمكنك إدخال معرف الصفحة يدوياً:
                </p>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => handleChange("pageId", e.target.value)}
                  placeholder="مثال: 123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
            {facebookPagesMeta?.counts && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  صفحات الشركة الجاهزة: {facebookPagesMeta.counts.ready}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  صفحات Meta غير المربوطة:{" "}
                  {facebookPagesMeta.counts.accessibleButNotConnected}
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  صفحات الشركة غير المتاحة:{" "}
                  {facebookPagesMeta.counts.connectedButNotAccessible}
                </div>
              </div>
            )}
            {selectedFacebookPage &&
              selectedFacebookPage.isConnectedToCompany === false && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  سيتم إنشاء الإعلان باسم صفحة متاحة من حساب Meta الحالي لكنها
                  غير مربوطة بهذه الشركة داخل Max P.
                </div>
              )}
            {selectedFacebookPage?.warning && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedFacebookPage.warning}
              </p>
            )}
            {facebookPagesMeta?.permissions?.missingRecommended?.length ? (
              <p className="mt-2 text-xs text-gray-500">
                الصلاحيات التي قد نحتاجها لإظهار الصفحات بشكل أكمل:{" "}
                {facebookPagesMeta.permissions.missingRecommended.join(", ")}
              </p>
            ) : null}
            {getError("pageId") && (
              <p className="mt-1 text-sm text-red-500">{getError("pageId")}</p>
            )}
          </div>

          {/* Creative Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مصدر الإعلان (Creative Source)
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
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <Plus className="w-4 h-4" />
                إنشاء إعلان جديد
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreativeSource("EXISTING_POST");
                  handleChange("creativeType", "EXISTING_POST");
                }}
                className={`p-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm ${
                  creativeSource === "EXISTING_POST"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                استخدام منشور حالي
              </button>
            </div>
          </div>

          {creativeSource === "EXISTING_POST" ? (
            <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  نوع المحتوى
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_IMAGE")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_IMAGE"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Image
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_IMAGE" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">صورة</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_VIDEO")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_VIDEO"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Eye
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_VIDEO" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">فيديو</div>
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
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Layout
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "CAROUSEL" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">دوّار</div>
                <div className="text-xs text-gray-500">2-10 بطاقات</div>
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="التنسيق المرن قيد التجهيز"
                className="p-4 border-2 rounded-xl text-center transition-all border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
              >
                <Sparkles
                  className="w-8 h-8 mx-auto mb-2 text-gray-400"
                />
                <div className="font-medium text-sm">مرن</div>
                <div className="text-xs text-gray-500">قريبًا</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصور والفيديوهات (حتى 10 ملفات){" "}
                <span className="text-red-500">*</span>
              </label>

              <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50">
                <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-sm text-gray-700 mb-1 font-medium">
                  ارفع حتى 10 صور أو فيديوهات
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  سيختار Facebook تلقائياً أفضل تنسيق لكل مستخدم
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  اختر الملفات
                </button>
              </div>

              {/* Uploaded Assets List */}
              {formData.flexibleAssets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    الملفات المرفوعة ({formData.flexibleAssets.length}/10)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.flexibleAssets.map((asset, index) => (
                      <div key={asset.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
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
                          {asset.type === "IMAGE" ? "صورة" : "فيديو"}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.creativeType === "SINGLE_IMAGE"
                  ? "الصورة"
                  : "الفيديو"}{" "}
                <span className="text-red-500">*</span>
              </label>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                <input
                  type="file"
                  accept={
                    formData.creativeType === "SINGLE_IMAGE"
                      ? "image/*"
                      : "video/*"
                  }
                  className="hidden"
                  id="media-upload"
                  disabled
                />
                <div>
                  <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    رفع{" "}
                    {formData.creativeType === "SINGLE_IMAGE"
                      ? "الصورة"
                      : "الفيديو"}{" "}
                    من الجهاز قيد التجهيز
                  </p>
                  <p className="text-xs text-gray-400">
                    استخدم رابط مباشر حالياً لضمان إنشاء الإعلان بنجاح
                  </p>
                </div>
              </div>

              {/* Or URL */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400">أو أدخل رابط</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {formData.creativeType === "SINGLE_IMAGE" &&
                  getError("imageUrl") && (
                    <p className="mt-1 text-sm text-red-500">
                      {getError("imageUrl")}
                    </p>
                  )}
                {formData.creativeType === "SINGLE_VIDEO" &&
                  getError("videoUrl") && (
                    <p className="mt-1 text-sm text-red-500">
                      {getError("videoUrl")}
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Carousel Cards */}
          {formData.creativeType === "CAROUSEL" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  بطاقات الدوّار ({formData.carouselCards.length}/10)
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
                  + إضافة بطاقة
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
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">بطاقة {index + 1}</h5>
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
                      {/* Image URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          رابط الصورة *
                        </label>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Headline */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          العنوان *
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
                          placeholder="عنوان البطاقة"
                          maxLength={40}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          الوصف
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
                          placeholder="وصف البطاقة"
                          maxLength={20}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Link URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          رابط الوجهة *
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="وصف مختصر يظهر أسفل العنوان"
              maxLength={30}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">
              {formData.description.length}/30
            </p>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط الوجهة <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleChange("linkUrl", e.target.value)}
              placeholder="https://yourwebsite.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getError("linkUrl") ? "border-red-500" : "border-gray-300"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط العرض (اختياري)
              </label>
              <input
                type="text"
                value={formData.displayLink}
                onChange={(e) => handleChange("displayLink", e.target.value)}
                placeholder="مثال: yoursite.com/sale"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                النص الذي يظهر بدلاً من الرابط الكامل
              </p>
            </div>

            {/* URL Parameters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معاملات URL (UTM)
              </label>
              <input
                type="text"
                value={formData.urlParameters}
                onChange={(e) => handleChange("urlParameters", e.target.value)}
                placeholder="مثال: utm_source=facebook&utm_campaign=winter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                لتتبع مصدر الزيارات في Google Analytics
              </p>
            </div>
          </div>
        </>
      )}

          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              زر الإجراء
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CALL_TO_ACTIONS.map((cta) => (
                <button
                  key={cta.value}
                  type="button"
                  onClick={() => handleChange("callToAction", cta.value)}
                  className={`py-2 px-3 text-xs rounded-lg border transition-all ${
                    formData.callToAction === cta.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
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
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  تحسينات Advantage+ Creative الإبداعية (Meta AI)
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  دع خوارزميات Meta تحسن إضاءة الصور، قصها تلقائياً للمواضع المختلفة، وتوليد تركيبات للعناوين لرفع نسبة النقر والتحويل.
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <AdPlacementPreview
            formData={formData}
            pageName={selectedFacebookPage?.name || "اسم صفحتك"}
            isExistingPost={creativeSource === "EXISTING_POST"}
          />

          {/* Advantage+ Creative */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl space-y-3 mt-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Advantage+ Creative
            </h4>
            <p className="text-xs text-gray-600">
              دع Facebook يحسن إعلانك تلقائياً للحصول على أفضل أداء
            </p>

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين النص</span>
                <p className="text-xs text-gray-500">
                  إنشاء نسخ متعددة من النص
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

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين الصورة والتباين</span>
                <p className="text-xs text-gray-500">
                  تعديل السطوع والتباين تلقائياً
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

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">المد الذكي للريلز (9:16)</span>
                  <span className="rounded bg-green-100 px-1 py-0.5 text-[9px] font-bold text-green-700">v26</span>
                </div>
                <p className="text-xs text-gray-500">
                  تمديد أبعاد الصور لتملأ شاشة Stories و Reels تلقائياً
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

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">إبراز التعليقات الإيجابية</span>
                  <span className="rounded bg-green-100 px-1 py-0.5 text-[9px] font-bold text-green-700">v26</span>
                </div>
                <p className="text-xs text-gray-500">
                  تثبيت آراء العملاء الممتازة أسفل الإعلان كإثبات اجتماعي
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
          </div>
        </div>
      </div>
    </div>
  );
};
