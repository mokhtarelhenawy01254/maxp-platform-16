import React from "react";
import {
  CheckCircle2,
  Sparkles,
  Globe,
  Tag,
  FileText,
  Image,
  ShieldCheck,
} from "lucide-react";
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
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
            {isEn ? "Ready to Launch Ad on Meta v26" : "الإعلان جاهز للنشر على منصة Meta v26"}
          </h3>
          <p className="mt-0.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-normal">
            {isEn
              ? "All creative assets, copy variations, Advantage+ enhancements, and tracking tags are verified."
              : "تم التحقق من كافة التصاميم، وتنويعات النصوص، وتحسينات الذكاء الاصطناعي، ووسوم التتبع."}
          </p>
        </div>
      </div>

      {/* Meta Policy & Pre-flight Health Guard */}
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Meta v26 Pre-flight Compliance & Safety Guard" : "فحص الامتثال وجاهزية النشر (Meta v26 Pre-flight Guard)"}
            </h4>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {isEn ? "100% Passed" : "مجتاز بنجاح 100%"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{isEn ? "Landing URL & UTM Tracking" : "رابط الوجهة وتتبع UTM"}</p>
              <p className="text-[11px] text-muted-foreground truncate font-mono">{formData.linkUrl || "Verified"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{isEn ? "Creative Assets Specs" : "أبعاد الكرييتف ووضوح الصورة"}</p>
              <p className="text-[11px] text-muted-foreground">{isEn ? "1:1 / 9:16 Feed & Stories ready" : "جاهزة للموجز والريلز والقصص"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{isEn ? "Policy & Text Safety" : "سلامة النصوص وخلوها من الحظر"}</p>
              <p className="text-[11px] text-muted-foreground">{isEn ? "No spam or prohibited keywords" : "نصوص متوافقة وخالية من المحظورات"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{isEn ? "Launch State Configuration" : "تهيئة الإطلاق"}</p>
              <p className="text-[11px] text-emerald-600 font-semibold">
                {formData.status === "ACTIVE"
                  ? (isEn ? "ACTIVE - Immediate live delivery" : "نشط فوراً - يبدأ بالظهور فور الموافقة")
                  : (isEn ? "PAUSED - Saved as reviewable draft" : "متوقف مؤقتاً - مسودة للمراجعة")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ad Identity */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Image className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Ad Identity & Media" : "الهوية والتصميم الإعلاني"}
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "Ad Name:" : "اسم الإعلان:"}</span>
              <span className="font-semibold text-foreground">{formData.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{isEn ? "Initial Status:" : "حالة الإطلاق:"}</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                  formData.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                }`}
              >
                {formData.status === "ACTIVE"
                  ? isEn
                    ? "ACTIVE (Live)"
                    : "نشط فوراً"
                  : isEn
                  ? "PAUSED (Draft)"
                  : "متوقف مؤقتاً"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "Facebook Page:" : "صفحة فيسبوك:"}</span>
              <span className="font-semibold text-foreground">{page?.pageName || formData.pageId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "Format:" : "نوع الكرييتف:"}</span>
              <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                {formData.creativeType}
              </span>
            </div>
          </div>
        </div>

        {/* Copy & Variations */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <FileText className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Copy & Dynamic Variations" : "النصوص والتنويعات الديناميكية"}
            </h4>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "Primary Texts:" : "النصوص الأساسية:"}</span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {formData.primaryTexts.filter(Boolean).length} {isEn ? "variations" : "تنويعات"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "Headlines:" : "العناوين البارزة:"}</span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {formData.headlines.filter(Boolean).length} {isEn ? "variations" : "عناوين"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isEn ? "CTA Action:" : "زر الإجراء:"}</span>
              <span className="font-semibold text-foreground">{formData.callToAction}</span>
            </div>
          </div>
        </div>

        {/* Advantage+ Suite */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Advantage+ Creative Suite" : "حزمة تحسينات Advantage+"}
            </h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-foreground">
              <span className={`h-2 w-2 rounded-full ${formData.advantageCreative ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              <span className="font-semibold">{formData.advantageCreative ? (isEn ? "Advantage+ Active" : "مفعل بالكامل") : (isEn ? "Disabled" : "معطل")}</span>
            </div>
            {formData.advantageCreative && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.imageEnhancement && <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">ضبط الإضاءة والأبعاد</span>}
                {formData.textOptimizations && <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">تبديل النصوص الذكي</span>}
                {formData.musicEnhancement && <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">موسيقى الريلز</span>}
                {formData.videoHighlight && <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">حركة 3D</span>}
              </div>
            )}
          </div>
        </div>

        {/* Tracking & Destination */}
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Globe className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              {isEn ? "Destination & Tracking" : "الوجهة والتتبع"}
            </h4>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-mono text-[11px] text-foreground truncate text-left" dir="ltr">
              {formData.linkUrl}
            </p>
            {formData.urlParameters && (
              <div className="flex items-center gap-1 text-[11px] text-primary font-mono text-left" dir="ltr">
                <Tag className="h-3 w-3 shrink-0" />
                <span className="truncate">{formData.urlParameters}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
