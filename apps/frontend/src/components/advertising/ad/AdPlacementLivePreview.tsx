import React, { useState } from "react";
import {
  Smartphone,
  Globe,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="rounded-2xl border border-border/70 bg-card p-4.5 space-y-4 text-foreground shadow-none">
      <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Smartphone className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Live Mobile Ad Preview" : "معاينة الإعلان الحية على الموبايل"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {isEn ? "Real-time layout simulation" : "محاكاة واقعية لشكل الإعلان في فيسبوك وإنستغرام"}
            </p>
          </div>
        </div>

        {/* Placement tabs */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setPlacement("FEED")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.97]",
              placement === "FEED" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isEn ? "FB Feed" : "فيسبوك فيد"}
          </button>
          <button
            type="button"
            onClick={() => setPlacement("REELS")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.97]",
              placement === "REELS" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {isEn ? "Reels & Stories" : "ريلز وقصص (9:16)"}
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex justify-center pt-1">
        {placement === "FEED" ? (
          /* Facebook Feed Mockup */
          <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card shadow-lg overflow-hidden text-right">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="size-8.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shadow-2xs">
                  {pageName.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">{pageName}</p>
                  <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    <span>{isEn ? "Sponsored" : "مُموَّل"}</span>
                    <span>·</span>
                    <Globe className="size-3" />
                  </p>
                </div>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </div>

            {/* Post Text */}
            <div className="px-3.5 py-2.5">
              <p className="text-xs text-foreground font-normal whitespace-pre-line line-clamp-3 leading-relaxed">
                {primaryText}
              </p>
            </div>

            {/* Post Media */}
            <div className="w-full h-56 bg-muted/50 flex items-center justify-center overflow-hidden border-y border-border/40">
              {formData.imagePreview ? (
                <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : formData.videoPreview ? (
                <video src={formData.videoPreview} className="w-full h-full object-cover" />
              ) : (
                <p className="text-xs text-muted-foreground">{isEn ? "Select image or video" : "يرجى اختيار صورة أو فيديو"}</p>
              )}
            </div>

            {/* Post CTA Bar */}
            <div className="flex items-center justify-between bg-muted/20 px-3.5 py-2.5 border-b border-border/40">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] text-muted-foreground font-mono uppercase truncate tabular-nums">
                  {formData.displayLink || "SWAN.MAXP.ONLINE"}
                </p>
                <p className="text-xs font-bold text-foreground truncate">{headline}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground font-mono uppercase tabular-nums shadow-xs hover:bg-primary/90 transition-all active:scale-[0.97]"
              >
                {ctaLabel.replace(/_/g, " ")}
              </button>
            </div>

            {/* Social Engagement */}
            <div className="flex items-center justify-around py-2.5 text-muted-foreground text-xs select-none">
              <div className="flex items-center gap-1.5 font-medium hover:text-foreground cursor-pointer transition active:scale-95">
                <ThumbsUp className="size-3.5" />
                <span>إعجاب</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium hover:text-foreground cursor-pointer transition active:scale-95">
                <MessageCircle className="size-3.5" />
                <span>تعليق</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium hover:text-foreground cursor-pointer transition active:scale-95">
                <Share2 className="size-3.5" />
                <span>مشاركة</span>
              </div>
            </div>
          </div>
        ) : (
          /* Reels / Stories 9:16 Mockup */
          <div className="w-full max-w-[280px] h-[480px] rounded-2xl border border-border/80 bg-zinc-950 text-zinc-100 relative overflow-hidden shadow-2xl flex flex-col justify-between p-4">
            {formData.imagePreview ? (
              <img src={formData.imagePreview} alt="Reels Preview" className="absolute inset-0 w-full h-full object-cover opacity-85" />
            ) : formData.videoPreview ? (
              <video src={formData.videoPreview} className="absolute inset-0 w-full h-full object-cover opacity-85" autoPlay loop muted />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
                {isEn ? "Reels preview placeholder" : "معاينة تصميم الريلز"}
              </div>
            )}

            {/* Top header */}
            <div className="relative z-10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                  {pageName.substring(0, 1)}
                </div>
                <div>
                  <p className="font-bold text-[11px] leading-tight text-white">{pageName}</p>
                  <p className="text-[9px] text-zinc-300">{isEn ? "Sponsored" : "مُموَّل"}</p>
                </div>
              </div>
              <MoreHorizontal className="size-4 text-zinc-300" />
            </div>

            {/* Right side interaction icons */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-10 text-white/90">
              <Heart className="size-5 hover:text-rose-500 transition cursor-pointer" />
              <MessageCircle className="size-5 hover:text-primary transition cursor-pointer" />
              <Share2 className="size-5 hover:text-primary transition cursor-pointer" />
              <Bookmark className="size-5 hover:text-amber-400 transition cursor-pointer" />
            </div>

            {/* Bottom Content & CTA */}
            <div className="relative z-10 space-y-2 text-right">
              <p className="text-xs font-semibold text-white line-clamp-2 drop-shadow-md">
                {primaryText}
              </p>
              <div className="rounded-xl bg-white/95 text-zinc-900 p-2.5 flex items-center justify-between shadow-md">
                <span className="text-xs font-bold truncate pr-1 text-zinc-900">{headline}</span>
                <span className="shrink-0 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-bold font-mono tabular-nums">
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

export default AdPlacementLivePreview;
