import React from "react";
import { Check, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { PRICING_PLANS_DATA, TOTAL_STANDALONE_PRICE } from "../clothingStoreData";

interface ClothingEditorialPricingProps {
  onFreeRegister: () => void;
  onPaygRegister: () => void;
  onBundleCheckout: () => void;
}

export const ClothingEditorialPricing: React.FC<ClothingEditorialPricingProps> = ({
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
    <section id="editorial-pricing" className="py-20 border-b border-black/[0.06] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="cse-badge cse-badge-gold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>تسعير شفاف لرواد الأعمال وأصحاب المحلات</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-950 tracking-tight mb-3">
            اختر الخطة المناسبة لحجم نشاطك التجاري
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
            ابدأ متجرك بـ 0 ج.م، أو ادفع 1 ج.م لكل أوردر، أو امتلك المنظومة الكاملة بـ 999 ج.م في الشهر.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-600 mt-4 font-semibold">
            <span className="text-emerald-800 flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              0% عمولة على مبيعاتك نهائياً
            </span>
            <span>• الدفع بالجنيه المصري (بدون فيزا دولارية وبدون مصاريف شوبيفاي)</span>
            <span>• مساعدة مجانية في رفع أول 50 منتج ومقاس</span>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PRICING_PLANS_DATA.map((plan) => {
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`cse-panel p-6 sm:p-8 flex flex-col justify-between relative transition-all ${
                  isPopular
                    ? "cse-panel-dark lg:-translate-y-2 border-zinc-700 ring-2 ring-black/10"
                    : "bg-[#FAF8F5] border-black/[0.08]"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-black text-[11px] font-black py-1 px-4 rounded-full shadow-md">
                      الباقة الأكثر طلباً لبراندات الملابس
                    </span>
                  </div>
                )}

                <div>
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-1.5 ${isPopular ? "text-white" : "text-zinc-950"}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-xs min-h-[32px] leading-relaxed ${isPopular ? "text-zinc-400" : "text-zinc-600"}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div className={`mb-6 pb-6 border-b ${isPopular ? "border-white/10" : "border-black/[0.08]"}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl sm:text-5xl font-black cse-tabular ${isPopular ? "text-white" : "text-zinc-950"}`}>
                        {plan.price}
                      </span>
                      <span className={`text-sm font-medium ${isPopular ? "text-zinc-400" : "text-zinc-600"}`}>
                        ج.م
                      </span>
                      {plan.pricePeriod && (
                        <span className={`text-xs mr-1.5 ${isPopular ? "text-zinc-400" : "text-zinc-500"}`}>
                          / {plan.pricePeriod}
                        </span>
                      )}
                    </div>

                    {isPopular && (
                      <div className="text-[11px] text-zinc-400 mt-2">
                        سعر الـ 17 أداة منفصلة:{" "}
                        <span className="line-through cse-tabular">
                          {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className={`space-y-3 mb-8 text-xs sm:text-sm ${isPopular ? "text-zinc-300" : "text-zinc-700"}`}>
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isPopular ? "text-emerald-400" : "text-emerald-600"}`} />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleAction(plan.action)}
                    className={`w-full text-sm py-3 px-4 font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      isPopular
                        ? "bg-white text-black hover:bg-zinc-200 rounded-xl"
                        : "cse-btn-primary rounded-xl"
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className={`flex items-center justify-center gap-1.5 text-[11px] mt-3 ${isPopular ? "text-zinc-400" : "text-zinc-500"}`}>
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
