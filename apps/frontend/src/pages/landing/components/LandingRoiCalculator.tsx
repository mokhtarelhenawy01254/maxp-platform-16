import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

/**
 * Documented figures only (cases-numbers.md / offers-pricing.md):
 * 4,500–8,000 EGP = cost of the separate tools MaxP replaces;
 * Subscription displayed as per-app sum (B1 policy 2026-10-05 — no unified 299 figure);
 * 4,200–7,700 EGP = frozen net monthly saving range (5–8 substitutions);
 * 1,000+ monthly chats = processing capacity; 999 EGP = specialized plans.
 * No computed/estimated figures are allowed here.
 */
export const LandingRoiCalculator: React.FC = () => {
  return (
    <section id="calculator" className="relative py-24 sm:py-32 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>الوفر الشهري الموثق عند الاستبدال</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            بدل ٥–٨ اشتراكات منفصلة..
            <br />
            <span className="text-zinc-400 font-normal">باقة واحدة تشتغل مع بعض.</span>
          </h2>
          <p className="mt-3 text-base text-zinc-400 leading-relaxed">
            الأرقام هنا موثقة من قائمة الأسعار الرسمية — بدون تقديرات ولا افتراضات.
          </p>
        </div>

        {/* Documented Figures — Open Clean Vertical Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-white/[0.08] pt-8 lg:pt-0 lg:pl-10">
            <span className="text-xs font-mono text-zinc-400 block mb-1">
              صافي الوفر المتوقع شهرياً:
            </span>
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight" dir="ltr">
              4,200–7,700 <span className="text-xl text-emerald-400 font-bold">ج.م/شهر</span>
            </div>
            <span className="text-xs text-zinc-400 font-mono mt-2 block">
              عند استبدال ٥–٨ اشتراكات منفصلة بباقة MaxP
            </span>
          </div>

          {/* Documented Breakdown (No Cards) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between text-sm border-b border-white/[0.06] pb-3">
              <span className="text-zinc-400">تكلفة الأدوات المنفصلة اللي بتستبدلها (واتساب رسمي، كاشير، مخازن، فواتير):</span>
              <span className="font-mono font-bold text-white" dir="ltr">4,500–8,000 ج.م</span>
            </div>

            <div className="text-sm text-zinc-400 border-b border-white/[0.06] pb-3">
              اشتراكك الشهري = مجموع التطبيقات اللي بفعّلها — وفي تطبيقات مجانية تبدأ بيها فورًا.
            </div>

            <div className="flex items-center justify-between text-sm border-b border-white/[0.06] pb-3">
              <span className="text-zinc-400">طاقة معالجة المحادثات:</span>
              <span className="font-mono font-bold text-white">أكثر من 1,000 محادثة شهرياً</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">الباقات المتخصصة تبدأ من:</span>
              <span className="font-mono font-bold text-white" dir="ltr">999 ج.م</span>
            </div>

            {/* CTA */}
            <div className="pt-6">
              <Link
                to="/register"
                onClick={() =>
                  trackPlatformSiteLead({
                    cta_type: "roi_calculator_start",
                    placement: "roi_calculator_results",
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-black font-bold px-6 py-3.5 text-sm hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <span>ابدأ الآن بهذا الوفر الموثق</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="block text-center text-[10px] text-zinc-400 font-mono mt-2">
                تجربة مجانية بالكامل • بدون إدخال فيزا
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingRoiCalculator;
