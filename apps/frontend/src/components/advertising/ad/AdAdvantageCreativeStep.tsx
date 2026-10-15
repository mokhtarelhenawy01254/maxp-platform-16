import React from "react";
import {
  Sparkles,
  Music,
  Image,
  AlignLeft,
  Film,
  Maximize2,
  Sun,
  MessageSquare,
  Tag,
} from "lucide-react";
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
      expandImage: enabled,
      visualTouchups: enabled,
      relevantComments: enabled,
      priceOverlay: enabled,
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Advantage+ Creative Suite (Meta v26)" : "حزمة تحسينات التصميم الذكية (Advantage+ Creative)"}
              </h3>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {isEn ? "Recommended" : "موصى به لزيادة المبيعات"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl font-normal leading-relaxed">
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
            isMasterOn ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
              isMasterOn ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Granular Enhancements Switches */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-foreground">
          {isEn ? "Individual AI Enhancements" : "خيارات التحسين الفردية"}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Image Enhancements */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Image className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isEn ? "Visual Touchups & Aspect Ratio Fit" : "ضبط الإضاءة والأبعاد الذكية"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
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
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Text Optimizations */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <AlignLeft className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isEn ? "Text Dynamic Swapping" : "التبديل الذكي للنصوص والعناوين"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
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
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Music Enhancement */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Music className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isEn ? "Stories & Reels Music" : "موسيقى تفاعلية للريلز والقصص"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
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
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Video Highlights / Templates */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Film className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isEn ? "3D Motion & Video Highlighting" : "تأثيرات الحركة ثلاثية الأبعاد (3D Motion)"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
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
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Generative Expand (v26) */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Maximize2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground">
                    {isEn ? "Generative Uncrop & Expand (9:16)" : "المد الذكي للريلز (Generative Expand)"}
                  </p>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">v26</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isEn
                    ? "Meta AI outpaints 1:1 square media to cleanly fit vertical Reels/Stories without borders"
                    : "تمديد محيط الصور المربعة بالذكاء الاصطناعي لملء شاشة Reels و Stories بالكامل بدون حواف سوداء"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.expandImage)}
              onChange={(e) => updateFormData({ expandImage: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Adaptive Visual Touchups (v26) */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Sun className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground">
                    {isEn ? "Adaptive Visual Touchups" : "الضبط التكيفي للسطوع والتباين"}
                  </p>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">v26</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isEn
                    ? "Calibrates brightness and dynamic range tailored to each viewer's mobile screen"
                    : "معايرة السطوع والوضوح تلقائياً لتناسب شاشة هاتف كل عميل يشاهد الإعلان"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.visualTouchups)}
              onChange={(e) => updateFormData({ visualTouchups: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Social Proof & Relevant Comments (v26) */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground">
                    {isEn ? "Social Proof Amplification" : "الإثبات الاجتماعي والتعليقات الإيجابية"}
                  </p>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">v26</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isEn
                    ? "Highlights and pins top positive customer feedback under the ad automatically"
                    : "إبراز التعليقات الأكثر إيجابية وتثبيتها أسفل الإعلان لبناء الثقة الفورية"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.relevantComments)}
              onChange={(e) => updateFormData({ relevantComments: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>

          {/* Product Price & Discount Badge Overlay (v26) */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-border/70 bg-card hover:bg-muted/20 transition">
            <div className="flex items-start gap-2.5 pr-1">
              <Tag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground">
                    {isEn ? "Dynamic Price & Promo Badges" : "ملصقات الأسعار ونسب الخصم التلقائية"}
                  </p>
                  <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">v26</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {isEn
                    ? "Overlays prices and discount ribbons on product creative without modifying originals"
                    : "وضع شارات الأسعار ونسب الخصم على صور الكتالوج تلقائياً لزيادة جاذبية الشراء"}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(formData.priceOverlay)}
              onChange={(e) => updateFormData({ priceOverlay: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1 accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
