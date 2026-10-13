import React from "react";
import { ArrowLeft, Check, Sparkles, Gift, ShieldAlert, ShieldCheck } from "lucide-react";
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
    <section id="pricing" className="py-20 border-b border-black/[0.06] bg-[#FAF8F5] text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
            <span>خطط تسعير شفافة • بدون عمولات مبيعات</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-3">
            اختر الخطة المناسبة لحجم مبيعات براندك
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto leading-relaxed">
            ابدأ مجاناً (0 ج.م) لاختبار المتجر بدون أي عمولة، أو اشترك في باقة الـ 17 أداة الشاملة (999 ج.م) ووفر 1,937 ج.م شهرياً مع ربط بوسطة وتوربو وكاشير الفروع.
          </p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mb-12">
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
                      <span>الباقة الشاملة الأكثر اختياراً لتجار الملابس</span>
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

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-relaxed">
                        <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 bg-emerald-50 rounded-full p-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Irresistible Onboarding Bonus on 999 Plan */}
                  {isPopular && (
                    <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 mb-6 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Gift className="w-4 h-4 text-amber-700" />
                        <span>بونص الانضمام الفوري (قيمة 1,500 ج.م مجاناً):</span>
                      </div>
                      <ul className="text-[11px] space-y-1 text-amber-900/90 pr-2">
                        <li>• رفع وتجهيز أول 50 منتج ومصفوفة المقاسات بواسطة فريقنا.</li>
                        <li>• جلسة تدريب فيديو مباشرة لموظفي الكاشير في فرعك.</li>
                        <li>• مدير حساب مخصص على واتساب طوال الموسم.</li>
                      </ul>
                    </div>
                  )}
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

        {/* 14-Day Zero-Risk Guarantee Banner */}
        <div className="max-w-3xl mx-auto p-5 rounded-2xl bg-white border border-black/[0.08] shadow-xs flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="p-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#141416] mb-1">
              ضمان استرجاع كامل للاشتراك لمدة 14 يوماً بدون أي أسئلة
            </h4>
            <p className="text-xs text-zinc-600 leading-relaxed">
              اشترك في باقة الـ 999 ج.م، وجرب كاشير الفروع وربط بوسطة ومستشار المقاسات؛ إذا لم تشعر بالراحة التامة وانضباط العمليات وانخفاض المرتجعات، يمكنك استرداد اشتراكك فورياً بنقرة واحدة عبر واتساب.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
