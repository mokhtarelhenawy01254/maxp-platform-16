import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Play, Shield, MessageSquare, PackageCheck } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

interface LandingHeroProps {
  onPreloadRegister?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onPreloadRegister,
}) => {
  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "enterprise-os",
      });
    };

  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 overflow-hidden">
      {/* Subtle Monochrome Ambient Radial Glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[350px] sm:h-[450px] bg-red-950/15 rounded-full blur-[120px] -z-10" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          
          {/* Left / Main Text Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="lg:col-span-7 text-center lg:text-right"
          >
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400 text-[11px] font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>منظومة تشغيل الأعمال المتكاملة • MAX P BUSINESS OS</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.65rem] font-black text-white tracking-tight leading-[1.12] mb-6">
              كل مبيعاتك، مخازنك،
              <br />
              ورسائل عملائك...
              <br />
              <span className="text-zinc-400 font-normal">في نظام تشغيل واحد.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8 font-normal">
              من أول ما العميل يبعت يستفسر على الواتساب، لحد ما مندوب الشحن يسلم الطلب والفلوس تسمّع في حسابك.
              <strong className="text-white font-semibold"> Max P </strong>
              يربط دورة البيع بالكامل: المحادثات، المخازن، الفروع، والموظفين في شاشة مركزية واحدة — بدون شيتات إكسيل مبعثرة أو اشتراكات متفرقة تستهلك ميزانيتك.
            </p>

            {/* Action Buttons (Button-in-Button Architecture) */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <Link
                to="/auth/register"
                onClick={handleLeadClick("hero_cta_register", "/auth/register")}
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
                className="w-full sm:w-auto group inline-flex items-center justify-between rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-6 py-3.5 text-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-lg shadow-white/5"
              >
                <span>ابدأ تجربة نشاطك مجاناً</span>
                <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-3 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
              </Link>

              <a
                href="#modules"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 px-6 py-3.5 text-sm font-medium text-zinc-300 transition-all duration-300"
              >
                <Play className="w-3.5 h-3.5 text-zinc-400 fill-zinc-400" />
                <span>شاهد كيف يعمل النظام</span>
              </a>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>بدون بطاقة بنكية للتجربة</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>ربط رسمي مع WhatsApp Cloud API</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                <span>بيانات مشفرة ونسخ احتياطي ساعي</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Double-Bezel Live Operations Console */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Double-Bezel Architecture */}
            <div className="p-1 sm:p-1.5 rounded-[2.25rem] bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] shadow-2xl">
              <div className="rounded-[calc(2.25rem-0.375rem)] bg-zinc-950 border border-white/[0.05] p-5 sm:p-6 space-y-5">
                
                {/* Console Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Operations Feed</span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">Max P Engine v3.4</span>
                </div>

                {/* Scenario 1: Real Arabic WhatsApp Interaction */}
                <div className="space-y-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 text-xs font-sans">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>محادثة واتساب مباشرة</span>
                    </div>
                    <span className="font-mono text-zinc-500">عميل: أ/ محمد سامي</span>
                  </div>

                  {/* Incoming Client Message */}
                  <div className="bg-zinc-900 border border-white/5 p-3 rounded-2xl rounded-tr-none text-zinc-200 max-w-[85%] leading-relaxed">
                    مساء الخير، متاح حذاء جلد أسود مقاس 43؟ والشحن لمصر الجديدة بياخد قد إيه؟
                  </div>

                  {/* Automated Context-Aware Reply */}
                  <div className="bg-zinc-900/90 border border-emerald-500/20 p-3 rounded-2xl rounded-tl-none text-zinc-200 mr-auto max-w-[90%] leading-relaxed space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono">
                      <span>رد ذكي فوري (2 ثانية)</span>
                      <span>تأكيد مخزون تلقائي</span>
                    </div>
                    <p className="text-zinc-300">
                      أهلاً بحضرتك يا فندم! متاح مقاس 43 وجاهز للشحن الفوري. التوصيل لمصر الجديدة خلال 24 ساعة ومتاح المعاينة قبل الاستلام. تحب نسجل لحضرتك الطلب؟
                    </p>
                  </div>
                </div>

                {/* Scenario 2: Synchronized Dispatch & Stock */}
                <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-1">
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      <PackageCheck className="w-3 h-3 text-blue-400" />
                      حالة الشحنة
                    </div>
                    <div className="font-bold text-zinc-200 text-xs">
                      تم إنشاء البوليصة
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      شركة بوسطة • COD 850 ج.م
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-1">
                    <div className="text-[10px] font-mono text-zinc-400">
                      جرد المخزن اللحظي
                    </div>
                    <div className="font-bold text-emerald-400 text-xs">
                      تم خصم قطعة (باقي 17)
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      تزامن المخزن الرئيسي
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>3 قنوات متزامنة (واتساب + المتجر + المخزن)</span>
                  <span className="text-emerald-400">0 أخطاء إدخال</span>
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
