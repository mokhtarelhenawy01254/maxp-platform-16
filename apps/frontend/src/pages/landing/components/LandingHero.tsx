import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Play, Shield, MessageSquare, PackageCheck, Zap } from "lucide-react";
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
    <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 overflow-hidden">
      {/* Ambient Atmospheric Glow (No Card/Box) */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[300px] sm:h-[450px] bg-red-600/[0.05] rounded-full blur-[140px] -z-10"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Main Content Column (7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="lg:col-span-7 text-center lg:text-right"
          >
            {/* Live Operational Status Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] text-zinc-400 text-xs font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>نظام تشغيل التجارة والمتاجر • للسوق المصري والعربي</span>
            </div>

            {/* Direct Commercial Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.75rem] font-black text-white tracking-tight leading-[1.12] mb-6">
              من أول رنة واتساب...
              <br />
              لحد ما الكاش
              <br />
              <span className="text-zinc-400 font-normal">يسمّع في خزنتك.</span>
            </h1>

            {/* Grounded Business Subtitle */}
            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8 font-normal">
              تشتت 6 برامج وشيتات إكسيل مهدرة للملايين انتهى.
              <strong className="text-white font-semibold"> Max P </strong>
              يربط الرد الذكي الفوري، جرد المخازن متعددة الفروع، كول سنتر التأكيد، بوالص الشحن لشركات (بوسطة وغيرها)، وتقفيل صافي الأرباح في شاشة واحدة واضحة.
            </p>

            {/* Action Buttons — Open & Tactile */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <Link
                to="/auth/register"
                onClick={handleLeadClick("hero_cta_register", "/auth/register")}
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-full bg-white text-black font-bold px-7 py-3.5 text-sm hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-lg shadow-white/10"
              >
                <span>ابدأ تجربة نشاطك مجاناً</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <a
                href="#systems-slider"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full text-zinc-300 hover:text-white px-6 py-3.5 text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4 text-zinc-400 fill-zinc-400" />
                <span>استعرض أنظمة المنصة الـ 6</span>
              </a>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>بدون بطاقة بنكية للتجربة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>ربط رسمي WhatsApp Cloud API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
                <span>نقل بياناتك القديمة خلال 24 ساعة</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Open Live Feed Telemetry (NO BOX-IN-BOX) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="lg:col-span-5 space-y-4"
          >
            {/* Header Telemetry Line */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>تزامن العمليات اللحظي</span>
              </span>
              <span>القاهرة • بث مباشر 24/7</span>
            </div>

            {/* Live WhatsApp Speech Balloons (Free Floating) */}
            <div className="space-y-3 pt-1">
              <div className="text-right">
                <span className="text-[11px] font-mono text-zinc-400 mb-1 block">عميل: أ/ محمد سامي</span>
                <div className="inline-block bg-zinc-900 text-zinc-100 text-xs sm:text-sm p-3.5 rounded-2xl rounded-tr-none max-w-[88%] leading-relaxed">
                  مساء الخير، متاح كوتشي جلد أسود مقاس 43؟ والشحن لمصر الجديدة بياخد قد إيه؟
                </div>
              </div>

              <div className="text-left">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 mb-1">
                  <span>رد ذكي فوري • تأكيد مخزون تلقائي</span>
                </div>
                <div className="inline-block bg-emerald-950/40 text-emerald-100 border-l-2 border-emerald-500 text-xs sm:text-sm p-3.5 rounded-2xl rounded-tl-none max-w-[92%] leading-relaxed text-right">
                  أهلاً بحضرتك يا فندم! متاح مقاس 43 وجاهز للشحن الفوري. التوصيل لمصر الجديدة خلال 24 ساعة مع شركة بوسطة، ومتاح المعاينة قبل الدفع. تحب نسجل لحضرتك الطلب؟
                </div>
              </div>
            </div>

            {/* Synchronized Metrics Strips (Clean Horizontal Divs, No Nested Box) */}
            <div className="pt-3 grid grid-cols-2 gap-3 border-t border-white/[0.08]">
              <div className="py-2">
                <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 mb-0.5">
                  <PackageCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>بوليصة الشحن</span>
                </div>
                <div className="text-sm font-bold text-white">
                  تم إصدار البوليصة فوراً
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  بوسطة • COD 850 ج.م
                </div>
              </div>

              <div className="py-2 border-r border-white/[0.08] pr-3">
                <div className="text-[11px] text-zinc-400 font-mono mb-0.5">
                  <span>جرد المخزن اللحظي</span>
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  تم خصم قطعة (باقي 17)
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  تزامن المحل + المتجر أونلاين
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default LandingHero;
