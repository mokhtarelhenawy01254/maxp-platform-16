import React, { useEffect } from "react";
import { Globe, Tag, MousePointerClick, ExternalLink } from "lucide-react";
import { AdFormData } from "./types";

interface AdDestinationTrackingStepProps {
  formData: AdFormData;
  updateFormData: (updates: Partial<AdFormData>) => void;
  isEn?: boolean;
}

export const AdDestinationTrackingStep: React.FC<AdDestinationTrackingStepProps> = ({
  formData,
  updateFormData,
  isEn = false,
}) => {
  // Compute UTM string whenever utm fields change
  useEffect(() => {
    const params: string[] = [];
    if (formData.utmSource) params.push(`utm_source=${encodeURIComponent(formData.utmSource)}`);
    if (formData.utmMedium) params.push(`utm_medium=${encodeURIComponent(formData.utmMedium)}`);
    if (formData.utmCampaign) params.push(`utm_campaign=${encodeURIComponent(formData.utmCampaign)}`);
    if (formData.utmContent) params.push(`utm_content=${encodeURIComponent(formData.utmContent)}`);
    if (formData.utmTerm) params.push(`utm_term=${encodeURIComponent(formData.utmTerm)}`);

    const utmString = params.join("&");
    if (utmString !== formData.urlParameters) {
      updateFormData({ urlParameters: utmString });
    }
  }, [
    formData.utmSource,
    formData.utmMedium,
    formData.utmCampaign,
    formData.utmContent,
    formData.utmTerm,
  ]);

  const ctaOptions = [
    { value: "ORDER_NOW", label: isEn ? "Order Now" : "اطلب الآن (الأعلى تحويلاً)" },
    { value: "SHOP_NOW", label: isEn ? "Shop Now" : "تسوق الآن" },
    { value: "SEND_WHATSAPP_MESSAGE", label: isEn ? "Send WhatsApp Message" : "إرسال رسالة واتساب" },
    { value: "CONTACT_US", label: isEn ? "Contact Us" : "تواصل معنا" },
    { value: "GET_OFFER", label: isEn ? "Get Offer" : "الحصول على العرض" },
    { value: "LEARN_MORE", label: isEn ? "Learn More" : "تعرف على المزيد" },
    { value: "SIGN_UP", label: isEn ? "Sign Up" : "تسجيل" },
  ];

  // Full destination URL with UTMs preview
  const getFullTrackedUrl = () => {
    if (!formData.linkUrl) return "";
    try {
      const separator = formData.linkUrl.includes("?") ? "&" : "?";
      return formData.urlParameters ? `${formData.linkUrl}${separator}${formData.urlParameters}` : formData.linkUrl;
    } catch {
      return formData.linkUrl;
    }
  };

  return (
    <div className="space-y-6">
      {/* Website Link & CTA */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {isEn ? "Destination Website URL *" : "رابط صفحة الهبوط / المتجر (Destination URL) *"}
          </label>
          <div className="relative">
            <input
              type="url"
              value={formData.linkUrl || ""}
              onChange={(e) => updateFormData({ linkUrl: e.target.value })}
              placeholder="https://swan.maxp.online/products/offer-1"
              className="w-full rounded-lg border border-border/70 bg-card px-3.5 py-2.5 pl-10 text-xs font-mono font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-left"
            />
            <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isEn
              ? "The exact product page or landing page customers land on when clicking your ad"
              : "صفحة المنتج أو المتجر التي يفتحها العميل بمجرد الضغط على الإعلان"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            {isEn ? "Display Link (Optional)" : "رابط العرض الترويجي (Display Link)"}
          </label>
          <input
            type="text"
            value={formData.displayLink || ""}
            onChange={(e) => updateFormData({ displayLink: e.target.value })}
            placeholder="swan.maxp.online"
            className="w-full rounded-lg border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
          />
        </div>

        {/* CTA Selector */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <MousePointerClick className="h-4 w-4 text-primary" />
            <label className="text-xs font-semibold text-foreground">
              {isEn ? "Call To Action (CTA) Button *" : "زر الإجراء (Call To Action) *"}
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ctaOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFormData({ callToAction: opt.value })}
                className={`p-2.5 rounded-lg border text-xs font-semibold transition text-right ${
                  formData.callToAction === opt.value
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                    : "border-border/70 bg-card text-foreground hover:bg-muted/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* UTM Parameters Builder */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <h4 className="text-xs font-bold text-foreground">
            {isEn ? "UTM Tracking Parameters Builder (Meta v26)" : "منشئ وسوم التتبع الاحترافي (UTM Parameters Builder)"}
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isEn
            ? "Track sales accurately in Google Analytics and Swan Storefront using Meta dynamic macro tags."
            : "لتتبع الطلبات والمبيعات بدقة متناهية في تحليلات المتجر وجوجل أناليتكس باستخدام الوسوم الديناميكية."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">utm_source</label>
            <input
              type="text"
              value={formData.utmSource}
              onChange={(e) => updateFormData({ utmSource: e.target.value })}
              className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">utm_medium</label>
            <input
              type="text"
              value={formData.utmMedium}
              onChange={(e) => updateFormData({ utmMedium: e.target.value })}
              className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">utm_campaign</label>
            <input
              type="text"
              value={formData.utmCampaign}
              onChange={(e) => updateFormData({ utmCampaign: e.target.value })}
              className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">utm_content</label>
            <input
              type="text"
              value={formData.utmContent}
              onChange={(e) => updateFormData({ utmContent: e.target.value })}
              className="w-full rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Live Tracked URL Preview */}
        {getFullTrackedUrl() && (
          <div className="rounded-lg border border-border/70 bg-card p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span>{isEn ? "Full Tracked Destination URL Preview:" : "معاينة الرابط الكامل مع وسوم التتبع:"}</span>
            </div>
            <p className="text-xs font-mono text-primary break-all text-left bg-muted/40 p-2 rounded-md border border-border/60">
              {getFullTrackedUrl()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
