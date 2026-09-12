import React from "react";
import {
  SparklesIcon,
  MusicalNoteIcon,
  PhotoIcon,
  Bars3BottomLeftIcon,
  FilmIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { AdFormData } from "./types";

interface AdAdvantageCreativeStepProps {
  formData: AdFormData;
  updateFormData: (updates: Partial<AdFormData>) => void;
  isEn?: boolean;
}

export const AdAdvantageCreativeStep: React.FC<AdAdvantageCreativeStepProps> = ({
  formData,
  updateFormData,
  isEn = false,
}) => {
  const isMasterOn = Boolean(formData.advantageCreative);

  const toggleMaster = (enabled: boolean) => {
    updateFormData({
      advantageCreative: enabled,
      imageEnhancement: enabled,
      textOptimizations: enabled,
      musicEnhancement: enabled,
      videoHighlight: enabled,
      textGeneration: enabled,
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">
                {isEn ? "Advantage+ Creative Suite (Meta v26)" : "حزمة تحسينات التصميم الذكية (Advantage+ Creative)"}
              </h3>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {isEn ? "Recommended" : "موصى به لزيادة المبيعات"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 max-w-xl font-medium">
              {isEn
                ? "Allow Meta's AI to automatically tune image aspect ratios, lighting, background music, and headline order for each viewer, proven to reduce CPA by up to 14%."
                : "تتيح لخوارزميات Meta تحسين الإضاءة، وضبط أبعاد الصورة لتناسب الريلز، وإضافة مقاطع صوتية متناسقة، مما يُخفض تكلفة الشراء بنسبة تصل إلى 14%."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleMaster(!isMasterOn)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isMasterOn ? "bg-indigo-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isMasterOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Granular Enhancements Switches */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700">
          {isEn ? "Individual AI Enhancements" : "خيارات التحسين الفردية"}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Image Enhancements */}
          <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-2.5 pr-1">
              <PhotoIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {isEn ? "Visual Touchups & Aspect Ratio Fit" : "ضبط الإضاءة والأبعاد الذكية"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn
                    ? "Adjusts brightness, contrast, and adapts 1:1 image to 9:16 Reels background"
                    : "تعديل التباين تلقائياً وتمديد خلفية الصور المربعة لتناسب شاشة الريلز الكاملة"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.imageEnhancement)}
              onChange={(e) => updateFormData({ imageEnhancement: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
            />
          </div>

          {/* Text Optimizations */}
          <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-2.5 pr-1">
              <Bars3BottomLeftIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {isEn ? "Text Dynamic Swapping" : "التبديل الذكي للنصوص والعناوين"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn
                    ? "Dynamically shows your primary text or headline based on user engagement"
                    : "إظهار العنوان كنص أو إبراز الكلمات المفتاحية حسب اهتمام المشتري"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.textOptimizations)}
              onChange={(e) => updateFormData({ textOptimizations: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
            />
          </div>

          {/* Music Enhancement */}
          <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-2.5 pr-1">
              <MusicalNoteIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {isEn ? "Stories & Reels Music" : "موسيقى تفاعلية للريلز والقصص"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn
                    ? "Adds royalty-free trending background music when viewed in Reels & Stories"
                    : "إضافة نغمات موسيقية حيوية مجانية عند عرض الإعلان في مواضع Stories & Reels"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.musicEnhancement)}
              onChange={(e) => updateFormData({ musicEnhancement: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
            />
          </div>

          {/* Video Highlights / Templates */}
          <div className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 bg-white">
            <div className="flex items-start gap-2.5 pr-1">
              <FilmIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {isEn ? "3D Motion & Video Highlighting" : "تأثيرات الحركة ثلاثية الأبعاد (3D Motion)"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn
                    ? "Subtle camera pan and zoom effects on static images to catch eye in feed"
                    : "حركات تقريب وتمرير سلسة على الصور الثابتة لجذب انتباه المتصفحين"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.videoHighlight || formData.imageTemplates)}
              onChange={(e) =>
                updateFormData({
                  videoHighlight: e.target.checked,
                  imageTemplates: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
