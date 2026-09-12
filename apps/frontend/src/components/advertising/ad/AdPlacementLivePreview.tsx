import React, { useState } from "react";
import {
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  EllipsisHorizontalIcon,
  HandThumbUpIcon,
  ChatBubbleOvalLeftIcon,
  ShareIcon,
  BookmarkIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { AdFormData, FacebookPage } from "./types";

interface AdPlacementLivePreviewProps {
  formData: AdFormData;
  page?: FacebookPage;
  isEn?: boolean;
}

export const AdPlacementLivePreview: React.FC<AdPlacementLivePreviewProps> = ({
  formData,
  page,
  isEn = false,
}) => {
  const [placement, setPlacement] = useState<"FEED" | "REELS">("FEED");

  const pageName = page?.pageName || (isEn ? "MaxP Store" : "متجر سوان - SWAN");
  const primaryText = formData.primaryTexts[0] || (isEn ? "Your ad copy preview..." : "نص الإعلان الترويجي سيظهر هنا...");
  const headline = formData.headlines[0] || (isEn ? "Offer Headline" : "عنوان العرض الترويجي");
  const ctaLabel = formData.callToAction || "ORDER_NOW";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <DevicePhoneMobileIcon className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-black text-slate-900">
            {isEn ? "Live Mobile Ad Preview" : "معاينة الإعلان الحية على الموبايل"}
          </h4>
        </div>

        {/* Placement tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setPlacement("FEED")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
              placement === "FEED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isEn ? "FB Feed" : "فيسبوك فيد"}
          </button>
          <button
            type="button"
            onClick={() => setPlacement("REELS")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
              placement === "REELS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {isEn ? "Reels & Stories" : "ريلز وقصص (9:16)"}
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex justify-center">
        {placement === "FEED" ? (
          /* Facebook Feed Mockup */
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden text-right">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {pageName.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">{pageName}</p>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <span>{isEn ? "Sponsored" : "مُموَّل"}</span>
                    <span>·</span>
                    <GlobeAltIcon className="h-3 w-3" />
                  </p>
                </div>
              </div>
              <EllipsisHorizontalIcon className="h-5 w-5 text-slate-400" />
            </div>

            {/* Post Text */}
            <div className="px-3 pb-2.5">
              <p className="text-xs text-slate-800 font-medium whitespace-pre-line line-clamp-3">
                {primaryText}
              </p>
            </div>

            {/* Post Media */}
            <div className="w-full h-56 bg-slate-900 flex items-center justify-center overflow-hidden">
              {formData.imagePreview ? (
                <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : formData.videoPreview ? (
                <video src={formData.videoPreview} className="w-full h-full object-cover" />
              ) : (
                <p className="text-xs text-slate-400">{isEn ? "Select image or video" : "يرجى اختيار صورة أو فيديو"}</p>
              )}
            </div>

            {/* Post CTA Bar */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2.5 border-t border-slate-100">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] text-slate-400 font-mono uppercase truncate">
                  {formData.displayLink || "SWAN.MAXP.ONLINE"}
                </p>
                <p className="text-xs font-black text-slate-900 truncate">{headline}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-800"
              >
                {ctaLabel.replace(/_/g, " ")}
              </button>
            </div>

            {/* Social Engagement */}
            <div className="flex items-center justify-around border-t border-slate-100 py-2 text-slate-500 text-xs">
              <div className="flex items-center gap-1 font-semibold"><HandThumbUpIcon className="h-4 w-4" /><span>إعجاب</span></div>
              <div className="flex items-center gap-1 font-semibold"><ChatBubbleOvalLeftIcon className="h-4 w-4" /><span>تعليق</span></div>
              <div className="flex items-center gap-1 font-semibold"><ShareIcon className="h-4 w-4" /><span>مشاركة</span></div>
            </div>
          </div>
        ) : (
          /* Reels / Stories 9:16 Mockup */
          <div className="w-full max-w-[280px] h-[480px] rounded-3xl border border-slate-800 bg-black text-white relative overflow-hidden shadow-xl flex flex-col justify-between p-4">
            {formData.imagePreview ? (
              <img src={formData.imagePreview} alt="Reels Preview" className="absolute inset-0 w-full h-full object-cover opacity-85" />
            ) : formData.videoPreview ? (
              <video src={formData.videoPreview} className="absolute inset-0 w-full h-full object-cover opacity-85" autoPlay loop muted />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                {isEn ? "Reels preview placeholder" : "معاينة تصميم الريلز"}
              </div>
            )}

            {/* Top header */}
            <div className="relative z-10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px]">
                  {pageName.substring(0, 1)}
                </div>
                <div>
                  <p className="font-bold text-[11px] leading-tight">{pageName}</p>
                  <p className="text-[9px] text-white/70">{isEn ? "Sponsored" : "مُموَّل"}</p>
                </div>
              </div>
              <EllipsisHorizontalIcon className="h-5 w-5 text-white/80" />
            </div>

            {/* Right side interaction icons */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10 text-white/90">
              <HeartIcon className="h-6 w-6" />
              <ChatBubbleOvalLeftIcon className="h-6 w-6" />
              <ShareIcon className="h-6 w-6" />
              <BookmarkIcon className="h-6 w-6" />
            </div>

            {/* Bottom Content & CTA */}
            <div className="relative z-10 space-y-2 text-right">
              <p className="text-xs font-semibold text-white/95 line-clamp-2 drop-shadow-md">
                {primaryText}
              </p>
              <div className="rounded-xl bg-white/95 text-slate-950 p-2.5 flex items-center justify-between shadow-lg">
                <span className="text-xs font-black truncate pr-1">{headline}</span>
                <span className="shrink-0 rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-[11px] font-black">
                  {ctaLabel.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
