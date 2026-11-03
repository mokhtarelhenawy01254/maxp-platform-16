import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

const FLIP_WORDS = ["لأتمتة", "لتسريع", "للتحكم في"];

export const OlHero: React.FC = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % FLIP_WORDS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative pt-16 sm:pt-24 pb-4 text-center">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Top Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#013735]/15 shadow-sm text-xs font-semibold text-[#013735] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22c790] animate-ping" />
          <span className="font-bold text-[#013735]">MaxP Business OS 3.0</span>
          <span className="text-[#013735]/30">•</span>
          <span className="text-[#025956]">نظام تشغيل التجارة لعلامتك التجارية</span>
        </div>

        {/* Dynamic 3D Flip Headline (Exact Operix Typography & Underline Mechanics) */}
        <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-bold text-[#013735] tracking-tight leading-[1.3] sm:leading-[1.22] max-w-4xl mx-auto">
          نظامك الشامل{" "}
          <span className="ol-flip-container inline-block text-[#013735]">
            {FLIP_WORDS.map((w, idx) => (
              <span
                key={w}
                className={`ol-flip-word ${idx === wordIndex ? "active" : ""}`}
              >
                {w}
                <span className="ol-flip-underline" aria-hidden="true">
                  <img
                    src="/operix-assets/headline-underline.svg"
                    alt=""
                  />
                </span>
              </span>
            ))}
          </span>
          <br className="hidden sm:inline" />
          <span className="inline-block mt-1 sm:mt-0">
            عمليات تجارتك ومبيعاتك
          </span>
        </h1>

        {/* Crisp Sub-headline without wordy fluff (Exact Operix Cadence) */}
        <p className="mt-6 text-base sm:text-lg text-[#4e6362] max-w-2xl mx-auto leading-relaxed font-normal">
          تحكّم بالكامل في متجرك — من تأكيد واتساب وإدارة الفروع والمخازن إلى الشحن والتحصيل في منصة واحدة.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="ol-btn-hero text-base !py-3.5 !px-8 shadow-xl shadow-[#013735]/15"
          >
            <span>ابدأ تجربتك المجانية الآن</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <a
            href="https://wa.me/201123087745?text=مرحباً،%20أريد%20معرفة%20المزيد%20عن%20نظام%20تشغيل%20MaxP%20للتجارة"
            target="_blank"
            rel="noopener noreferrer"
            className="ol-btn-ghost-hero text-base !py-3.5 !px-6"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>احجز عرضاً توضيحياً</span>
          </a>
        </div>

        {/* Real Merchant Value Chips */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-[#4e6362]">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#22c790]" />
            بدون بطاقة ائتمان
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#22c790]" />
            خفض المرتجع بنسبة 45%+
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#22c790]" />
            ربط فوري مع بوسطة وأرامكس
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#22c790]" />
            0% عمولة على المبيعات
          </span>
        </div>

        {/* Floating Down Arrow Guide */}
        <div className="mt-8 flex justify-center opacity-70 hover:opacity-100 transition-opacity">
          <a href="#cockpit" aria-label="انتقل إلى قمرة القيادة" className="inline-block animate-bounce">
            <img src="/operix-assets/hero-arrow.svg" alt="" className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  );
};
