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
    description: "عميل بعت على واتساب بيسأل عن كوتشي مقاس 43.. الـ AI رد عليه بالكتالوج والمقاسات وصور المنتجات المتاحة فعلياً في ثانيتين.",
    merchantPain: "العادي: موظف الرد نايم أو بيتأخر، والعميل بيزهق ويشتري من صفحة تانية.",
    maxpImpact: "مع MaxP: رد رسمي فوري 24/7 حتى لو نايم، مع حجز فوري للأوردر.",
    badge: "سرعة رد 2 ثانية",
  },
  {
    time: "09:02 ص",
    stage: "جرد المخازن اللحظي",
    title: "حجز القطعة أوتوماتيكياً في السيستم",
    description: "القطعة اتخصمت فوراً من المخزن الرئيسي وتحدثت على المتجر وفي فروع المحلات لمنع بيعها مرتين بالغلط.",
    merchantPain: "العادي: بتبيع نفس القطعة مرتين من المحل والواتساب وتكتشف العجز بعد فوات الأوان.",
    maxpImpact: "مع MaxP: باركود موحد وجرد لحظي دقيق بنسبة 100%.",
    badge: "تزامن فوري متعدد الفروع",
  },
  {
    time: "09:05 ص",
    stage: "الكول سنتر وبوليصة الشحن",
    title: "تأكيد المكالمة وإصدار بوليصة بوسطة",
    description: "النظام فحص رقم العميل وتأكد إنه مش من قائمة المشاغبين أو مرتجعات الشحن السابقة، وأصدر بوليصة الشحن بضغطة زر.",
    merchantPain: "العادي: بتشحن أوردرات وهمية وعناوين ناقصة وتتفاجئ بمرتجع 40% وخسارة مصاريف شحن.",
    maxpImpact: "مع MaxP: حظر أوتوماتيكي لأرقام المرتجعات وخفض المرتجع بنسبة 35%.",
    badge: "بوليصة شحن في ثانية",
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

        {/* 4 Steps Timeline Grid — Open Single Depth Surface */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {ORDER_STEPS.map((step, idx) => {
            const isCurrent = idx === activeStep;
            return (
              <div
                key={step.time}
                onClick={() => setActiveStep(idx)}
                className={`p-5 rounded-2xl transition-all cursor-pointer border ${
                  isCurrent
                    ? "bg-white/[0.05] border-white/25 shadow-xl"
                    : "bg-transparent border-white/[0.06] hover:border-white/15"
                }`}
              >
                <div className="flex items-center justify-between mb-3 text-xs font-mono">
                  <span className="font-bold text-white px-2 py-0.5 rounded bg-white/10">
                    {step.time}
                  </span>
                  <span className="text-zinc-400 text-[11px]">{step.stage}</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-2 leading-snug">
                  {step.title}
                </h3>
                <span className="inline-block text-[10px] font-semibold text-emerald-400">
                  {step.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detailed Breakdown for Active Step */}
        <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/70 border border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="text-white font-bold">{ORDER_STEPS[activeStep].time}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{ORDER_STEPS[activeStep].stage}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              {ORDER_STEPS[activeStep].title}
            </h3>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              {ORDER_STEPS[activeStep].description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-red-950/20 border-r-2 border-red-500/50 text-xs">
                <span className="font-bold text-red-400 block mb-1">الوضع التقليدي (قبل MaxP)</span>
                <span className="text-zinc-300">{ORDER_STEPS[activeStep].merchantPain}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/20 border-r-2 border-emerald-500/50 text-xs">
                <span className="font-bold text-emerald-400 block mb-1">مع نظام MaxP الموحد</span>
                <span className="text-zinc-300">{ORDER_STEPS[activeStep].maxpImpact}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 text-center sm:text-left flex flex-col items-start sm:items-end justify-center">
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
