import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Facebook,
  Instagram,
  Eye,
  Smartphone,
  Monitor,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ChevronUp,
  Image as ImageIcon,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { FormData } from "../types";
import { getCallToActions } from "../constants";

type PlacementPreviewMode =
  | "FACEBOOK_FEED"
  | "INSTAGRAM_FEED"
  | "STORIES_REELS"
  | "RIGHT_COLUMN";

interface AdPlacementPreviewProps {
  formData: FormData;
  pageName?: string;
  isExistingPost?: boolean;
}

export const AdPlacementPreview: React.FC<AdPlacementPreviewProps> = ({
  formData,
  pageName,
  isExistingPost = false,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const defaultPageName = isEn ? "Your Page Name" : "اسم صفحتك";
  const effectivePageName = pageName || defaultPageName;

  const [mode, setMode] = useState<PlacementPreviewMode>("FACEBOOK_FEED");
  const [selectedVariationIndex, setSelectedVariationIndex] = useState<number>(0);

  const callToActions = getCallToActions(isEn);
  const ctaLabel =
    callToActions.find((c) => c.value === formData.callToAction)?.label ||
    (isEn ? "Learn More" : "معرفة المزيد");

  const allTexts = [
    formData.primaryText,
    ...(formData.textVariations || []).map((v) => v.text),
  ].filter(Boolean);

  const activeText =
    allTexts[selectedVariationIndex] ||
    formData.primaryText ||
    (isExistingPost
      ? (isEn ? "Selected post text..." : "نص المنشور الحالي المختار...")
      : (isEn ? "Your primary ad text will appear here..." : "النص الأساسي لإعلانك سيظهر هنا..."));

  const allHeadlines = [
    formData.headline,
    ...(formData.headlineVariations || []).map((v) => v.text),
  ].filter(Boolean);

  const activeHeadline =
    allHeadlines[selectedVariationIndex] ||
    formData.headline ||
    (isExistingPost ? effectivePageName : (isEn ? "Ad Headline" : "العنوان الرئيسي للإعلان"));

  const displayPrimaryText = activeText;
  const displayHeadline = activeHeadline;
  const displayUrl = formData.displayLink || formData.linkUrl || "yoursite.com";
  const isVideoCreative = formData.creativeType === "SINGLE_VIDEO";
  const displayMediaUrl =
    (isVideoCreative ? formData.videoUrl : formData.imageUrl) ||
    formData.imageUrl ||
    (formData.carouselCards?.[0]?.imageUrl ? formData.carouselCards[0].imageUrl : null);

  return (
    <div className="bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          معاينة الموضع التفاعلية
        </h4>
        {isExistingPost && (
          <span className="text-[11px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md font-medium">
            منشور صفحة حالي
          </span>
        )}
      </div>

      {/* Variation Switcher if multiple texts exist */}
      {allTexts.length > 1 && (
        <div className="flex items-center gap-1.5 p-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-xl overflow-x-auto">
          <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold shrink-0">معاينة النص:</span>
          {allTexts.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedVariationIndex(i)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                selectedVariationIndex === i
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-gray-800 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              }`}
            >
              نص {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Placement Switcher Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setMode("FACEBOOK_FEED")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
            mode === "FACEBOOK_FEED"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          title="آخر الأخبار فيسبوك"
        >
          <Facebook className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">فيسبوك</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("INSTAGRAM_FEED")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
            mode === "INSTAGRAM_FEED"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          title="آخر الأخبار إنستجرام"
        >
          <Instagram className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">إنستجرام</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("STORIES_REELS")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
            mode === "STORIES_REELS"
              ? "bg-purple-600 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          title="القصص والريلز (9:16)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ريلز</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("RIGHT_COLUMN")}
          className={`py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${
            mode === "RIGHT_COLUMN"
              ? "bg-gray-800 dark:bg-gray-700 text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          title="العمود الجانبي للكمبيوتر"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">جانبي</span>
        </button>
      </div>

      {/* 1. Facebook Feed Preview */}
      {mode === "FACEBOOK_FEED" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden text-right">
          {/* Header */}
          <div className="p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Facebook className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">{pageName}</p>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <span>ممول</span>
                <span>•</span>
                <span>عام</span>
              </div>
            </div>
          </div>

          {/* Primary Text */}
          <div className="px-3 pb-2.5">
            <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed line-clamp-4">
              {displayPrimaryText}
            </p>
          </div>

          {/* Media */}
          <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden border-y border-gray-100 dark:border-gray-700 relative">
            {isVideoCreative && formData.videoUrl ? (
              <video
                src={formData.videoUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : displayMediaUrl ? (
              <img
                src={displayMediaUrl}
                alt="Ad Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 p-4">
                <ImageIcon className="w-12 h-12 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs">
                  {isVideoCreative
                    ? (isEn ? "Video preview" : "معاينة الفيديو")
                    : (isEn ? "Image preview" : "معاينة الصورة")}
                </p>
              </div>
            )}
            {formData.creativeType === "CAROUSEL" && (
              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                <Layers className="w-3 h-3" />
                {formData.carouselCards.length} بطاقات
              </div>
            )}
          </div>

          {/* Link / CTA Bar */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/90 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase truncate">{displayUrl}</p>
              <p className="font-semibold text-xs text-gray-900 dark:text-white truncate mt-0.5">{displayHeadline}</p>
              {formData.description && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{formData.description}</p>
              )}
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      )}

      {/* 2. Instagram Feed Preview */}
      {mode === "INSTAGRAM_FEED" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden text-right">
          {/* Header */}
          <div className="p-2.5 flex items-center justify-between border-b border-gray-50 dark:border-gray-700/60">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-fuchsia-600 p-[1.5px] flex-shrink-0">
                <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                  {pageName.toLowerCase().replace(/\s+/g, "_")}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Sponsored</p>
              </div>
            </div>
            <span className="text-gray-400 dark:text-gray-500 text-sm font-bold">•••</span>
          </div>

          {/* Media 1:1 */}
          <div className="aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden relative">
            {isVideoCreative && formData.videoUrl ? (
              <video
                src={formData.videoUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : displayMediaUrl ? (
              <img
                src={displayMediaUrl}
                alt="Ad Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 p-4">
                <ImageIcon className="w-12 h-12 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs">
                  {isVideoCreative
                    ? (isEn ? "Instagram video preview" : "معاينة فيديو إنستجرام")
                    : (isEn ? "Instagram image preview" : "معاينة إنستجرام")}
                </p>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="p-2.5 bg-white dark:bg-gray-800 space-y-2">
            <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 hover:text-red-500 cursor-pointer" />
                <MessageCircle className="w-4 h-4 cursor-pointer" />
                <Send className="w-4 h-4 cursor-pointer" />
              </div>
              <Bookmark className="w-4 h-4 cursor-pointer" />
            </div>

            {/* CTA action bar */}
            <div className="py-1 px-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/50 rounded-lg flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{ctaLabel}</span>
              <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>

            {/* Caption */}
            <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-3 leading-relaxed">
              <span className="font-semibold ml-1">
                {pageName.toLowerCase().replace(/\s+/g, "_")}
              </span>
              {displayPrimaryText}
            </p>
          </div>
        </div>
      )}

      {/* 3. Stories & Reels 9:16 Preview */}
      {mode === "STORIES_REELS" && (
        <div className="max-w-[260px] mx-auto bg-black rounded-3xl p-2 shadow-xl border-4 border-gray-800 text-white relative overflow-hidden">
          {/* Smartphone top bar & story timeline */}
          <div className="h-1 bg-white/30 rounded-full mb-2 overflow-hidden">
            <div className="w-2/3 h-full bg-white rounded-full"></div>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-gray-900 flex flex-col justify-between p-3">
            {/* Background media */}
            {formData.customStoriesMedia && formData.storyVideoUrl ? (
              <video
                src={formData.storyVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : isVideoCreative && formData.videoUrl ? (
              <video
                src={formData.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            ) : (formData.customStoriesMedia && formData.storyImageUrl) || displayMediaUrl ? (
              <img
                src={(formData.customStoriesMedia && formData.storyImageUrl) || displayMediaUrl || ""}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-90"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-0">
                <Smartphone className="w-12 h-12 opacity-30" />
              </div>
            )}

            {/* Top Overlay: Page Info */}
            <div className="relative z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm p-1.5 rounded-full pr-3 w-fit">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                <Facebook className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-tight truncate">{pageName}</p>
                <p className="text-[9px] text-gray-300 leading-none">ممول</p>
              </div>
            </div>

            {/* Bottom Overlay: Caption & CTA */}
            <div className="relative z-10 space-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 rounded-xl pt-6">
              <p className="text-xs text-white line-clamp-2 leading-tight">
                {displayPrimaryText}
              </p>
              <div className="text-center">
                <ChevronUp className="w-4 h-4 mx-auto text-white animate-bounce" />
                <button
                  type="button"
                  className="w-full py-2 bg-white text-black font-bold text-xs rounded-xl shadow-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
                >
                  {ctaLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Desktop Right Column Preview */}
      {mode === "RIGHT_COLUMN" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 text-right">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-2">ممول • Facebook Right Column</p>
          <div className="flex gap-3 items-center">
            <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
              {displayMediaUrl ? (
                <img
                  src={displayMediaUrl}
                  alt="Right Column Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 leading-snug">
                {displayHeadline}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-1">
                {displayUrl}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 line-clamp-2 mt-0.5">
                {displayPrimaryText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
