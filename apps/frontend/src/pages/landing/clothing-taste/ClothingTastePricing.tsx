import React from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { PRICING_PLANS } from "./clothingTasteData";

interface ClothingTastePricingProps {
  onFreeRegister: () => void;
  onPaygRegister: () => void;
  onBundleCheckout: () => void;
}

export const ClothingTastePricing: React.FC<ClothingTastePricingProps> = ({
  onFreeRegister,
  onPaygRegister,
  onBundleCheckout,
}) => {
  return (
    <section id="pricing" className="py-20 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <span>خطط تسعير شفافة • بدون عمولات مخفية</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            اختر الخطة المناسبة لحجم مبيعات براندك
          </h2>
          <p className="text-sm sm:text-base text-zinc-600">
            ابدأ مجاناً 0 ج.م لاختبار المنظومة، أو اشترك في باقة الـ 999 ج.م لتشغيل الفروع وربط الشحن بالكامل.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch text-right">
          {PRICING_PLANS.map((plan) => {
            const isPopular = plan.popular;

            const handleAction = () => {
              if (plan.action === "free-register") onFreeRegister();
              else if (plan.action === "payg-register") onPaygRegister();
              else onBundleCheckout();
            };

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                  isPopular
                    ? "cst-panel-active bg-white border-2 border-[#141416] shadow-xl relative"
                    : "cst-panel bg-white border border-black/[0.08] shadow-sm"
                }`}
              >
                <div>
                  {isPopular && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#141416] text-white text-[11px] font-bold mb-4">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>الباقة الشاملة الأكثر اختياراً</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-black text-[#141416]">{plan.name}</h3>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-600 mb-6 leading-relaxed">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-black/[0.06]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-[#141416] font-mono cst-tabular">
                        {plan.price === 0 ? "0" : plan.price.toLocaleString("en-US")}
                      </span>
                      <span className="text-sm font-bold text-zinc-800">ج.م</span>
                      <span className="text-xs text-zinc-500 font-normal mr-1 font-mono">
                        / {plan.pricePeriod}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 mb-8">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-relaxed">
                        <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 bg-emerald-50 rounded-full p-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleAction}
                  className={`w-full text-xs sm:text-sm font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] cursor-pointer ${
                    isPopular
                      ? "cst-btn-primary"
                      : "cst-btn-secondary"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
