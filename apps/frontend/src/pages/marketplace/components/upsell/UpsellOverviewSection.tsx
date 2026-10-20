import React from "react";
import { Sparkles, Package, ShoppingCart, BarChart3 } from "lucide-react";
import {
  StatusPill,
  PlacementMetric,
  QuickLinkCard,
} from "../controls/SettingFields";
import { JsonRecord, formatRate } from "../../types/appSettingsTypes";

interface UpsellOverviewSectionProps {
  active: boolean;
  generalSettings: JsonRecord;
  activeUpsellPlacements: number;
  upsellCenterMetrics: {
    cartUpsellQuickAdds: number;
    cartUpsellViews: number;
    postPurchaseAdds: number;
    postPurchaseViews: number;
  };
  upsellFallbackSummary: string;
  setUpsellSection: (section: any) => void;
  navigate: (path: string) => void;
}

export const UpsellOverviewSection: React.FC<UpsellOverviewSectionProps> = ({
  active,
  generalSettings,
  activeUpsellPlacements,
  upsellCenterMetrics,
  upsellFallbackSummary,
  setUpsellSection,
  navigate,
}) => {
  return (
    <div className={active ? "space-y-8" : "hidden"}>
      <section
        id="upsell-overview"
        className="scroll-mt-24 overflow-hidden rounded-[32px] border border-blue-200 bg-gradient-to-br from-blue-600 via-sky-600 to-indigo-700 p-6 text-white shadow-xl dark:border-blue-900/50"
      >
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
              <Sparkles size={14} />
              Upsell Operator View
            </div>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white">
                شاشة تشغيل يومية لإدارة أماكن الـ upsell بدل قائمة إعدادات طويلة
              </h2>
              <p className="max-w-3xl text-sm leading-8 text-blue-50/90">
                ابدأ من المكان الذي تريد تحسينه: صفحة المنتج، السلة، أو صفحة الشكر. فعّل
                المكان، اضبط النصوص الأساسية، ثم راقب المشاهدات والتحويل من نفس الصفحة.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill
                active={Boolean(generalSettings["enabled"])}
                activeLabel="المحرك العام شغال"
                inactiveLabel="المحرك العام متوقف"
              />
              <StatusPill
                active={Boolean(generalSettings["renderInTemplates"])}
                activeLabel="Hooks القوالب جاهزة"
                inactiveLabel="Hooks القوالب غير جاهزة"
              />
              <StatusPill
                active
                activeLabel="Manual links أولًا ثم fallback"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                "1. فعّل مكان الظهور الذي تريد العمل عليه.",
                "2. افتح تبويب ربط المنتجات واختر الـ Related أو Cross-sell أو Upsell لكل منتج.",
                "3. احفظ ثم راجع الأداء من usage أو من المتجر نفسه.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm leading-7 text-blue-50/90 backdrop-blur"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PlacementMetric
              label="Placements Live"
              value={`${activeUpsellPlacements}/3`}
              hint="عدد أماكن الـ upsell المفعلة الآن بين المنتج، السلة، وصفحة الشكر."
            />
            <PlacementMetric
              label="Cart Quick Adds"
              value={`${upsellCenterMetrics.cartUpsellQuickAdds}`}
              hint={`${formatRate(
                upsellCenterMetrics.cartUpsellQuickAdds,
                upsellCenterMetrics.cartUpsellViews,
              )} من مشاهدات السلة تحولت إلى إضافة سريعة.`}
            />
            <PlacementMetric
              label="Post-Purchase Adds"
              value={`${upsellCenterMetrics.postPurchaseAdds}`}
              hint={`${formatRate(
                upsellCenterMetrics.postPurchaseAdds,
                upsellCenterMetrics.postPurchaseViews,
              )} من زوار صفحة الشكر أضافوا منتجًا إضافيًا.`}
            />
            <PlacementMetric
              label="Fallback Range"
              value={upsellFallbackSummary}
              hint="النطاق السعري الذي يفضّل منتجات أعلى سعرًا عند غياب الربط اليدوي."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QuickLinkCard
          title="ربط المنتجات يدويًا"
          description="افتح مدير الربط لاختيار المنتج الأساسي ثم إدارة العلاقات من نفس الشاشة."
          ctaLabel="فتح المدير"
          icon={<Package size={18} />}
          onClick={() => setUpsellSection("manual-links")}
        />
        <QuickLinkCard
          title="ترتيب أماكن الظهور"
          description="حرّك بلوكات صفحة المنتج والسلة وصفحة الشكر من محرر الـ storefront."
          ctaLabel="فتح المحرر"
          icon={<ShoppingCart size={18} />}
          onClick={() => navigate("/settings/storefront/editor")}
        />
        <QuickLinkCard
          title="مراجعة الأداء"
          description="افتح usage لتراجع views وCTR والإضافات للسلة قبل تعديل النسخ أو الـ styles."
          ctaLabel="فتح usage"
          icon={<BarChart3 size={18} />}
          onClick={() => navigate("/my-apps/conversion-suite/usage")}
        />
      </section>
    </div>
  );
};
