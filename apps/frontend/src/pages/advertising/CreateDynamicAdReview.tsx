import React from "react";
import { CreateDynamicAdData, FacebookProductCatalog } from "../../services/facebookAdsService";
import { CheckCircle2, Layers, ShoppingBag } from "lucide-react";

interface CreateDynamicAdReviewProps {
  formData: CreateDynamicAdData;
  catalogs: FacebookProductCatalog[];
  productSets: any[];
}

export const CreateDynamicAdReview: React.FC<CreateDynamicAdReviewProps> = ({
  formData,
  catalogs,
  productSets,
}) => {
  const getCtaLabel = (cta: string) => {
    const labels: Record<string, string> = {
      SHOP_NOW: "تسوق الآن",
      LEARN_MORE: "اعرف المزيد",
      SIGN_UP: "سجل الآن",
      DOWNLOAD: "تحميل",
    };
    return labels[cta] || cta;
  };

  const catalogName = catalogs.find((c) => c.id === formData.catalogId)?.name || "-";
  const productSetName = productSets.find((s) => s.id === formData.productSetId)?.name || "-";

  return (
    <div className="space-y-3.5">
      <div className="p-4 rounded-md border border-border/70 bg-card space-y-3">
        <div className="flex items-center gap-2 pb-2.5 border-b border-border/50 text-xs font-bold text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span>مراجعة بيانات الإعلان الديناميكي</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded border border-border/50 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">اسم الإعلان</span>
            <p className="mt-0.5 font-semibold text-foreground">{formData.name}</p>
          </div>

          <div className="p-2.5 rounded border border-border/50 bg-muted/20">
            <span className="text-[11px] text-muted-foreground">زر الإجراء (CTA)</span>
            <p className="mt-0.5 font-semibold text-foreground">{getCtaLabel(formData.callToAction)}</p>
          </div>

          <div className="p-2.5 rounded border border-border/50 bg-muted/20">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>الكتالوج (Catalog)</span>
            </span>
            <p className="mt-0.5 font-semibold text-foreground font-mono">{catalogName}</p>
          </div>

          <div className="p-2.5 rounded border border-border/50 bg-muted/20">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" />
              <span>مجموعة المنتجات (Product Set)</span>
            </span>
            <p className="mt-0.5 font-semibold text-foreground font-mono">{productSetName}</p>
          </div>
        </div>

        {formData.headline && (
          <div className="p-2.5 rounded border border-border/50 bg-muted/20 text-xs">
            <span className="text-[11px] text-muted-foreground">العنوان الترويجي (Headline)</span>
            <p className="mt-0.5 font-medium text-foreground">{formData.headline}</p>
          </div>
        )}

        {formData.description && (
          <div className="p-2.5 rounded border border-border/50 bg-muted/20 text-xs">
            <span className="text-[11px] text-muted-foreground">النص الأساسي (Description)</span>
            <p className="mt-0.5 text-muted-foreground leading-relaxed">{formData.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
