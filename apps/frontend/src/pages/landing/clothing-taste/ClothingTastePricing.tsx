import React from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { PRICING_PLANS } from "./clothingTasteData";
import { TasteMode } from "./types";

interface ClothingTastePricingProps {
  onFreeRegister: () => void;
  onPaygRegister: () => void;
  onBundleCheckout: () => void;
  mode: TasteMode;
}

export const ClothingTastePricing: React.FC<ClothingTastePricingProps> = ({
  onFreeRegister,
  onPaygRegister,
  onBundleCheckout,
  mode,
}) => {
  return (
    <section id="pricing" className="py-20 border-b border-white/[0.08] bg-[#090A0F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-zinc-300 mb-3">
            <span>خطط تسعير شفافة • بدون عمولات مخفية</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
            اختر الخطة المناسبة لحجم مبيعات براندك
          </h2>
          <p className="text-sm text-zinc-400">
            ابدأ مجاناً 0 ج.م لاختبار المنظومة، أو اشترك في باقة الـ 999 ج.م لتشغيل الفروع وربط الشحن بالكامل.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
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
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  isPopular
                    ? "cst-panel-active bg-[#12151e] border-blue-500/40 relative shadow-xl shadow-blue-500/10"
                    : "cst-panel bg-[#111318] border-white/10"
                }`}
              >
                <div>
                  {isPopular && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500 text-white text-[11px] font-bold mb-4">
                      <span>الباقة الشاملة الأكثر اختياراً</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  </div>

                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                    {plan.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-black text-white font-mono cst-tabular">
                        {plan.price === 0 ? "0" : plan.price.toLocaleString("en-US")}
                      </span>
                      <span className="text-sm font-bold text-zinc-300">ج.م</span>
                      <span className="text-xs text-zinc-400 font-normal mr-1 font-mono">
                        / {plan.pricePeriod}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button (Single line, no wrap) */}
                <button
                  type="button"
                  onClick={handleAction}
                  className={`w-full text-xs sm:text-sm font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] ${
                    isPopular
                      ? "cst-btn-primary"
                      : "cst-btn-secondary"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
