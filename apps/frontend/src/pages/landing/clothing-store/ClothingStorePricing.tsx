import React from "react";
import { Check, ArrowLeft, Zap, ShieldCheck } from "lucide-react";
import { PRICING_PLANS_DATA, TOTAL_STANDALONE_PRICE } from "./clothingStoreData";

interface ClothingStorePricingProps {
  onFreeRegister: () => void;
  onPaygRegister: () => void;
  onBundleCheckout: () => void;
}

export const ClothingStorePricing: React.FC<ClothingStorePricingProps> = ({
  onFreeRegister,
  onPaygRegister,
  onBundleCheckout,
}) => {
  const handleAction = (action: string) => {
    if (action === "free-register") onFreeRegister();
    else if (action === "payg-register") onPaygRegister();
    else if (action === "bundle-checkout") onBundleCheckout();
  };

  return (
    <section id="pricing" className="py-20 border-b border-white/5 bg-[#050608]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="csn-badge mb-3">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>خطط تسعير واضحة بدون مصاريف خفية</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight csn-text-balance mb-3">
            اختر الخطة المناسبة لحجم متجرك الحالي
          </h2>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed csn-text-pretty">
            ابدأ متجرك مجاناً بـ 0 ج.م، أو ادفع 1 ج.م لكل أوردر، أو امتلك المنظومة الكاملة بـ 999 ج.م في الشهر.
          </p>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PRICING_PLANS_DATA.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`csn-panel p-6 sm:p-8 flex flex-col justify-between relative transition-all ${
                  isPopular
                    ? "csn-panel-highlight lg:-translate-y-2 border-blue-500/40"
                    : "bg-[#090a0f]"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-[11px] font-bold py-1 px-3.5 rounded-full shadow-lg border border-blue-400/30">
                      الباقة الأكثر طلباً لمتاجر الأزياء
                    </span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1.5">{plan.name}</h3>
                    <p className="text-xs text-gray-400 min-h-[32px] leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Price Tag */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold text-white csn-tabular">
                        {plan.price}
                      </span>
                      <span className="text-sm text-gray-400 font-medium">ج.م</span>
                      {plan.pricePeriod && (
                        <span className="text-xs text-gray-500 mr-1.5 font-normal">
                          / {plan.pricePeriod}
                        </span>
                      )}
                    </div>

                    {isPopular && (
                      <div className="text-[11px] text-gray-400 mt-2">
                        سعر الـ 17 أداة منفصلة:{" "}
                        <span className="line-through csn-tabular">
                          {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-8 text-xs sm:text-sm text-gray-300">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleAction(plan.action)}
                    className={`w-full text-sm py-3 px-4 font-bold flex items-center justify-center gap-2 ${
                      isPopular ? "csn-btn-primary" : "csn-btn-secondary"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 mt-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>تفعيل فوري على المنصة السحابية</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
