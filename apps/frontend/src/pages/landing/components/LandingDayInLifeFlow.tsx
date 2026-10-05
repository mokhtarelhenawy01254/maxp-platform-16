import React, { useState } from "react";
import { MessageSquare, Warehouse, PackageCheck, Banknote, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export interface OrderStep {
  time: string;
  stage: string;
  title: string;
  description: string;
  merchantPain: string;
  maxpImpact: string;
  badge: string;
}

const ORDER_STEPS: OrderStep[] = [
  {
    time: "09:00 ص",
    stage: "السوشيال والواتساب",
    title: "العميل استفسر عن مقاس وسعر",
    description: "عميل بعت على واتساب بيسأل عن كوتشي مقاس 43.. الـ AI رد عليه بالكتالوج والمقاسات وصور المنتجات المتاحة فعلياً فوراً.",
    merchantPain: "العادي: موظف الرد نايم أو بيتأخر، والعميل بيزهق ويشتري من صفحة تانية.",
    maxpImpact: "مع MaxP: رد رسمي فوري 24/7 حتى لو نايم، مع حجز فوري للأوردر.",
    badge: "رد فوري على الرسائل",
  },
  {
    time: "09:02 ص",
    stage: "جرد المخازن اللحظي",
    title: "حجز القطعة أوتوماتيكياً في السيستم",
    description: "القطعة اتخصمت فوراً من المخزن الرئيسي وتحدثت على المتجر وفي فروع المحلات لمنع بيعها مرتين بالغلط.",
    merchantPain: "العادي: بتبيع نفس القطعة مرتين من المحل والواتساب وتكتشف العجز بعد فوات الأوان.",
    maxpImpact: "مع MaxP: باركود موحد وجرد لحظي متزامن بين المتجر والفروع.",
    badge: "تزامن فوري متعدد الفروع",
  },
  {
    time: "09:05 ص",
    stage: "الكول سنتر وبوليصة الشحن",
    title: "تأكيد المكالمة وإصدار بوليصة بوسطة",
    description: "النظام فحص رقم العميل وتأكد إنه مش من قائمة المشاغبين أو مرتجعات الشحن السابقة، وأصدر بوليصة الشحن بضغطة زر.",
    merchantPain: "العادي: بتشحن أوردرات وهمية وعناوين ناقصة وتتفاجئ بمرتجع 40% وخسارة مصاريف شحن.",
    maxpImpact: "مع MaxP: حظر أوتوماتيكي لأرقام المرتجعات المتكررة قبل الشحن.",
    badge: "بوليصة شحن فورية",
  },
  {
    time: "05:00 م",
    stage: "المالية والأرباح الصافية",
    title: "الكاش سمّع في حسابك والأرباح اتسجلت",
    description: "المندوب سلم الأوردر، الفلوس سُجلت في الخزنة، اتخصم منها ثمن الإعلان ونسبة المندوب، وعرفت مكسبك الصافي بالقرش.",
    merchantPain: "العادي: بايع بألوفات ومش عارف كسبان ولا خسران وشيتات إكسيل مفقودة.",
    maxpImpact: "مع MaxP: كشف فوري لصافي الربح P&L وفواتير معتمدة بنقرة واحدة.",
    badge: "مكسب صافي محسوب بالقرش",
  },
];

export const LandingDayInLifeFlow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="order-flow" className="py-24 sm:py-32 border-t border-white/[0.06] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Open Section Header */}
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block mb-2">
            دورة حياة الأوردر • من الشات للخزنة
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            كيف يتحرك الأوردر في نشاطك التجاري؟
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            شاهد الفرق بين فوضى الشيتات والتطبيقات المبعثرة، وبين سلاسة نظام MaxP الموحد في كل خطوة من يومك.
          </p>
        </div>

        {/* 4 Steps Timeline Rail — Clean Open Surface */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {ORDER_STEPS.map((step, idx) => {
            const isCurrent = idx === activeStep;
            return (
              <button
                key={step.time}
                onClick={() => setActiveStep(idx)}
                className={`text-right transition-all cursor-pointer border-t-2 pt-4 group ${
                  isCurrent
                    ? "border-emerald-400"
                    : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2 text-xs font-mono">
                  <span className={`font-bold transition-colors ${isCurrent ? "text-emerald-400" : "text-zinc-400 group-hover:text-white"}`}>
                    {step.time}
                  </span>
                  <span className="text-zinc-500 text-[11px]">{step.stage}</span>
                </div>
                <h3 className={`text-sm font-bold mb-1.5 leading-snug transition-colors ${isCurrent ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"}`}>
                  {step.title}
                </h3>
                <span className="inline-block text-[11px] font-medium text-emerald-400/90">
                  {step.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Breakdown for Active Step — Open Single Depth Surface */}
        <div className="pt-8 border-t border-white/[0.06] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-white font-bold">{ORDER_STEPS[activeStep].time}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{ORDER_STEPS[activeStep].stage}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {ORDER_STEPS[activeStep].title}
            </h3>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              {ORDER_STEPS[activeStep].description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              <div className="border-r-2 border-red-500/50 pr-4 py-1">
                <span className="font-bold text-red-400 block text-xs mb-1">الوضع التقليدي (قبل MaxP)</span>
                <p className="text-zinc-300 text-xs leading-relaxed">{ORDER_STEPS[activeStep].merchantPain}</p>
              </div>
              <div className="border-r-2 border-emerald-500/60 pr-4 py-1">
                <span className="font-bold text-emerald-400 block text-xs mb-1">مع نظام MaxP الموحد</span>
                <p className="text-zinc-300 text-xs leading-relaxed">{ORDER_STEPS[activeStep].maxpImpact}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
            <Link
              to="/auth/register"
              onClick={() =>
                trackPlatformSiteLead({
                  cta_type: "day_in_life_start",
                  placement: `order_flow_step_${activeStep}`,
                })
              }
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <span>جرّب النظام على طلباتك</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default LandingDayInLifeFlow;
