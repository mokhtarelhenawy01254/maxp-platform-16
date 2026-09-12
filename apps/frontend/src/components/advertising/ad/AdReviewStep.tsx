import React from "react";
import {
  CheckCircleIcon,
  SparklesIcon,
  GlobeAltIcon,
  TagIcon,
  DocumentTextIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { AdFormData, FacebookPage } from "./types";

interface AdReviewStepProps {
  formData: AdFormData;
  page?: FacebookPage;
  isEn?: boolean;
}

export const AdReviewStep: React.FC<AdReviewStepProps> = ({
  formData,
  page,
  isEn = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Ready Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <CheckCircleIcon className="h-6 w-6 text-emerald-600 shrink-0" />
        <div>
          <h3 className="text-sm font-black text-emerald-950">
            {isEn ? "Ready to Launch Ad on Meta v25" : "الإعلان جاهز للنشر على منصة Meta v25"}
          </h3>
          <p className="mt-0.5 text-xs text-emerald-800 font-medium">
            {isEn
              ? "All creative assets, copy variations, Advantage+ enhancements, and tracking tags are verified."
              : "تم التحقق من كافة التصاميم، وتنويعات النصوص، وتحسينات الذكاء الاصطناعي، ووسوم التتبع."}
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ad Identity */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <PhotoIcon className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900">
              {isEn ? "Ad Identity & Media" : "الهوية والتصميم الإعلاني"}
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "Ad Name:" : "اسم الإعلان:"}</span>
              <span className="font-black text-slate-900">{formData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "Facebook Page:" : "صفحة فيسبوك:"}</span>
              <span className="font-bold text-slate-900">{page?.pageName || formData.pageId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "Format:" : "نوع الكرييتف:"}</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {formData.creativeType}
              </span>
            </div>
          </div>
        </div>

        {/* Copy & Variations */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <DocumentTextIcon className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900">
              {isEn ? "Copy & Dynamic Variations" : "النصوص والتنويعات الديناميكية"}
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "Primary Texts:" : "النصوص الأساسية:"}</span>
              <span className="font-bold text-slate-900">
                {formData.primaryTexts.filter(Boolean).length} {isEn ? "variations" : "تنويعات"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "Headlines:" : "العناوين البارزة:"}</span>
              <span className="font-bold text-slate-900">
                {formData.headlines.filter(Boolean).length} {isEn ? "variations" : "عناوين"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">{isEn ? "CTA Action:" : "زر الإجراء:"}</span>
              <span className="font-bold text-slate-900">{formData.callToAction}</span>
            </div>
          </div>
        </div>

        {/* Advantage+ Suite */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <SparklesIcon className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900">
              {isEn ? "Advantage+ Creative Suite" : "حزمة تحسينات Advantage+"}
            </h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className={`h-2 w-2 rounded-full ${formData.advantageCreative ? "bg-emerald-500" : "bg-slate-300"}`} />
              <span className="font-bold">{formData.advantageCreative ? (isEn ? "Advantage+ Active" : "مفعل بالكامل") : (isEn ? "Disabled" : "معطل")}</span>
            </div>
            {formData.advantageCreative && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.imageEnhancement && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">ضبط الإضاءة والأبعاد</span>}
                {formData.textOptimizations && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">تبديل النصوص الذكي</span>}
                {formData.musicEnhancement && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">موسيقى الريلز</span>}
                {formData.videoHighlight && <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">حركة 3D</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tracking & Destination */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <GlobeAltIcon className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900">
              {isEn ? "Destination & Tracking" : "الوجهة والتتبع"}
            </h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-mono text-[11px] text-slate-700 truncate text-left" dir="ltr">
              {formData.linkUrl}
            </p>
            {formData.urlParameters && (
              <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-mono text-left" dir="ltr">
                <TagIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{formData.urlParameters}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
