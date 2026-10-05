import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  Smartphone,
  Tablet,
  Server,
  Play,
  TrendingUp,
  RotateCw,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export const LandingHeroCockpit: React.FC = () => {
  const [activeDevice, setActiveDevice] = useState<"phone" | "pos" | "server">("phone");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const runSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(1);
    setActiveDevice("phone");

    setTimeout(() => {
      setSimStep(2);
      setActiveDevice("pos");
    }, 1200);

    setTimeout(() => {
      setSimStep(3);
      setActiveDevice("server");
    }, 2400);

    setTimeout(() => {
      setIsSimulating(false);
      setSimStep(0);
    }, 4000);
  };

  return (
    <section id="cockpit" className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
      {/* Background Cinematic Radial Ambient Light */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[400px] bg-gradient-to-b from-red-600/[0.07] via-emerald-500/[0.04] to-transparent blur-[140px] pointer-events-none rounded-full"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Eyebrow */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">MaxP Business OS 3.0</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">نظام التشغيل الموحد للتجارة والمتاجر في مصر</span>
          </div>
        </div>

        {/* Hero Headline & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.12]">
            ودّع تشتت 6 برامج وشيتات إكسيل.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
              كل نشاطك التجاري في شاشة تشغيل واحدة.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            من أول <span className="text-white font-semibold">رد ذكي على واتساب</span> فورًا،
            لخصم القطعة من <span className="text-white font-semibold">المخزن وكاشير الفرع</span>،
            لإصدار <span className="text-white font-semibold">بوليصة بوسطة بـ COD</span>،
            وحساب <span className="text-emerald-400 font-semibold">صافي أرباحك الحقيقية</span> بعد مصاريف الإعلانات.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth/register"
              onClick={() =>
                trackPlatformSiteLead({
                  cta_type: "hero_cockpit_start_free",
                  placement: "hero_primary",
                })
              }
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-black font-extrabold text-sm sm:text-base hover:bg-zinc-200 transition-transform active:scale-[0.98] shadow-2xl shadow-white/10"
            >
              <span>ابدأ تجربتك المجانية الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-white font-bold text-sm border border-white/[0.1] transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 text-emerald-400 ${isSimulating ? "animate-spin" : ""}`} />
              <span>{isSimulating ? "جارٍ محاكاة الأوردر بين الشاشات..." : "شاهد حركة الأوردر الحية"}</span>
            </button>
          </div>

          {/* Proof Badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ربط رسمي WhatsApp Cloud API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>فواتير إلكترونية معتمدة من الضرائب ETA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>بوالص فورية لشركات الشحن (بوسطة وغيرها)</span>
            </div>
          </div>
        </div>

        {/* The Living 3-Device Cockpit — Open Single Depth Surface */}
        <div className="relative max-w-6xl mx-auto pt-6">
          {/* Device Tabs Selector for Mobile / Quick Focus */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:hidden">
            <button
              onClick={() => setActiveDevice("phone")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeDevice === "phone"
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.08]"
              }`}
            >
              1. واتساب العميل
            </button>
            <button
              onClick={() => setActiveDevice("pos")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeDevice === "pos"
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.08]"
              }`}
            >
              2. كاشير الفرع
            </button>
            <button
              onClick={() => setActiveDevice("server")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeDevice === "server"
                  ? "bg-white text-black"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.08]"
              }`}
            >
              3. الشحن والخزنة
            </button>
          </div>

          {/* 3 Synchronized Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Panel 1: Customer WhatsApp (Phone View) */}
            <div
              className={`md:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#09090b] border transition-all duration-300 ${
                activeDevice === "phone" || simStep === 1
                  ? "border-emerald-500/50 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "border-white/[0.08] opacity-90 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">واتساب العميل والـ AI</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  رد في 1.8 ثانية
                </span>
              </div>

              {/* Chat Flow */}
              <div className="space-y-3 text-xs">
                {/* Incoming Message */}
                <div className="p-3 rounded-xl bg-zinc-900/90 text-zinc-200 border-r-2 border-zinc-600">
                  <span className="text-[10px] text-zinc-500 block mb-0.5">أحمد سامي • القاهرة</span>
                  <p>مساء الخير، متاح كوتشي أسود مقاس 43؟ والشحن لمدينة نصر بياخد قد إيه؟</p>
                </div>

                {/* AI Instant Reply */}
                <div className="p-3 rounded-xl bg-emerald-950/30 text-emerald-100 border-r-2 border-emerald-400">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-emerald-400">MaxP AI Assistant</span>
                    <span className="text-[9px] text-zinc-400">الآن</span>
                  </div>
                  <p>أهلاً بحضرتك يا فندم! متاح مقاس 43 أسود (جاهز للشحن الفوري). التوصيل خلال 24 ساعة مع بوسطة بـ 45 ج، ومتاح المعاينة قبل الاستلام. تحب نسجل الأوردر؟</p>
                </div>

                {/* Order Confirmation */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-emerald-500/30 text-[11px] text-zinc-300 flex items-center justify-between">
                  <span>كود المنتج: SH-BLK-43</span>
                  <span className="font-bold text-emerald-400">850 ج.م COD</span>
                </div>
              </div>
            </div>

            {/* Panel 2: Storefront & Cloud POS (Tablet View) */}
            <div
              className={`md:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#09090b] border transition-all duration-300 ${
                activeDevice === "pos" || simStep === 2
                  ? "border-blue-500/50 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/20"
                  : "border-white/[0.08] opacity-90 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <Tablet className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white">كاشير وجرد الفرع (POS)</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded-full">
                  تزامن آني 100%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Inventory Live Sync */}
                <div className="p-3 rounded-xl bg-zinc-900/90 text-zinc-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-300">فرع مدينة نصر (محل)</span>
                    <span className="font-mono text-blue-400 font-bold">16 -&gt; 15 قطعة</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-[70%]" />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">تم خصم القطعة تلقائياً لمنع البيع المزدوج</span>
                </div>

                {/* Cashier Status */}
                <div className="p-3 rounded-xl bg-blue-950/20 border-r-2 border-blue-400 text-zinc-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">شيفت كاشير الفرع</span>
                    <span className="text-[10px] text-emerald-400 font-mono">نشط</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">إجمالي مبيعات اليوم بالمحل: 28,400 ج.م • 34 فاتورة</p>
                </div>

                {/* Barcode Kiosk Feedback */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-white/[0.06] text-[11px] flex items-center justify-between text-zinc-300">
                  <span>باركود ممسوح: 622109482</span>
                  <span className="text-zinc-400 font-mono">طابعة إيصالات جاهزة</span>
                </div>
              </div>
            </div>

            {/* Panel 3: Central Operations & Shipping Server */}
            <div
              className={`md:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#09090b] border transition-all duration-300 ${
                activeDevice === "server" || simStep === 3
                  ? "border-red-500/50 shadow-2xl shadow-red-500/10 ring-1 ring-red-500/20"
                  : "border-white/[0.08] opacity-90 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <Server className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-white">سيرفر العمليات والخزنة</span>
                </div>
                <span className="text-[10px] font-mono text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full">
                  بوليصة بوسطة فورية
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {/* Bosta Waybill Card */}
                <div className="p-3 rounded-xl bg-zinc-900/90 text-zinc-200 border-r-2 border-red-500">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">بوليصة شحن: BST-892401</span>
                    <span className="text-[10px] font-mono text-emerald-400">جاهزة للاستلام</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">بوسطة • الدفع عند الاستلام: 850 ج.م • تتبع لحظي</p>
                </div>

                {/* Net Profit Calculation */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border-r-2 border-emerald-500 text-zinc-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">صافي ربح الأوردر (P&L)</span>
                    <span className="font-mono font-bold text-emerald-400">+290 ج.م</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">بعد خصم: تكلفة المنتج (410ج) + الشحن (45ج) + الـ ROAS الإعلاني (105ج)</p>
                </div>

                {/* ETA Compliance */}
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-white/[0.06] text-[11px] flex items-center justify-between text-zinc-300">
                  <span>منظومة الضرائب المصرية ETA</span>
                  <span className="text-emerald-400 font-mono">فاتورة إلكترونية معتمدة</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Cockpit Live Pulse Line */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>معالجة طلبات لحظية على خوادم MaxP</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-400 font-mono text-[11px]">
              <span className="text-emerald-400">SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHeroCockpit;
