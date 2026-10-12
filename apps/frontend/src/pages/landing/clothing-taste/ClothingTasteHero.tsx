import React, { useState } from "react";
import { ArrowLeft, Check, Smartphone, Store, PackageCheck, Zap, MessageCircle } from "lucide-react";
import { TasteMode } from "./types";
import { WHATSAPP_CONSULT_URL } from "./clothingTasteData";

interface ClothingTasteHeroProps {
  onFreeRegister: () => void;
  onPricingScroll: () => void;
  mode: TasteMode;
}

export const ClothingTasteHero: React.FC<ClothingTasteHeroProps> = ({
  onFreeRegister,
  onPricingScroll,
  mode,
}) => {
  // Interactive mini-simulator in the hero asset
  const [testHeight, setTestHeight] = useState<number>(178);
  const [testWeight, setTestWeight] = useState<number>(76);
  const [activeTab, setActiveTab] = useState<"advisor" | "pos" | "bosta">("advisor");

  const calculateSize = (h: number, w: number) => {
    const bmi = w / ((h / 100) * (h / 100));
    if (bmi < 21) return { size: "M", fit: "Regular Fit (مظبوط مريح)", returnRisk: "3% منخفض جداً" };
    if (bmi < 25.5) return { size: "L", fit: "Standard Fit (مثالي)", returnRisk: "4% منخفض جداً" };
    if (bmi < 29) return { size: "XL", fit: "Comfort / Oversized", returnRisk: "5% آمن" };
    return { size: "2XL", fit: "Loose Oversized", returnRisk: "6% آمن" };
  };

  const advice = calculateSize(testHeight, testWeight);

  if (mode === "slop") {
    // ── Simulation of Generic AI Slop (Pre-Skill Architecture) ──
    return (
      <section className="relative overflow-hidden py-16 text-center border-b border-purple-500/20">
        <div className="cst-slop-mesh" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-semibold mb-6">
            <span>🚀 🤖 الذكاء الاصطناعي السحري الخارق الأول في الشرق الأوسط ✨ 🔥</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-4 tracking-normal">
            أحدث ثورة خارقة في عالم الموضة والأزياء بضغطة زر واحدة!
          </h1>
          <p className="text-lg text-purple-200/80 max-w-2xl mb-8 leading-relaxed">
            تمتع بقوة لا نهائية تفتح لك آفاق النجاح غير المسبوقة، نظام ذكي يفهم زبائنك بالحدس ويجعل أرباحك تتضاعف تلقائياً دون أي جهد أو تعب.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button
              onClick={onFreeRegister}
              className="cst-btn-primary py-3.5 px-8 text-base font-bold"
            >
              <span>🚀 ابدأ رحلة المجد الخارق الآن مجاناً 🚀</span>
            </button>
            <button
              onClick={onPricingScroll}
              className="cst-btn-secondary py-3.5 px-6 text-sm"
            >
              <span>شاهد الأسعار</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Taste-Skill Architecture (Anti-Slop Discipline) ──
  return (
    <section id="editorial-hero" className="relative overflow-hidden pt-8 md:pt-14 pb-12 border-b border-white/[0.08] cst-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Main Hero Copy — Single Focused Conversion Message (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-start text-right">
            
            {/* 1. Eyebrow: Trust & Platform Definition */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-zinc-300 mb-4 font-sans">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-mono text-blue-400 font-semibold">MAXP APPAREL OS</span>
              <span className="text-zinc-500">•</span>
              <span>منظومة متكاملة لبراندات ومحلات الملابس</span>
            </div>

            {/* 2. Headline (Max 2 lines desktop) */}
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.18] mb-4 cst-text-balance">
              متجر يوقف نزيف المرتجعات، وكاشير فروع يضبط مخزونك لحظياً
            </h1>

            {/* 3. Subtext (Strictly under 20 words) */}
            <p className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed mb-6 max-w-xl cst-text-pretty">
              منظومة متكاملة لبراندات الملابس: متجر مجاني، كاشير فروع، ربط شحن بوسطة، ومستشار مقاسات ذكي يخفض الاستبدال 60%.
            </p>

            {/* 4. Single Dominant Primary CTA + Direct WhatsApp Link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-4">
              <button
                onClick={onFreeRegister}
                type="button"
                className="cst-btn-primary text-sm py-3.5 px-7 font-bold shadow-lg shadow-white/10"
              >
                <span>ابدأ متجرك مجاناً (0 ج.م)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <a
                href={WHATSAPP_CONSULT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-zinc-300 transition-all whitespace-nowrap min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>استشارة واتساب مع خبير</span>
              </a>
            </div>

            {/* Explicit Risk Reversals (Zero Risk Assurance) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400 font-medium mb-2">
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Check className="w-3.5 h-3.5" />
                0% عمولة مبيعات
              </span>
              <span>• بدون فيزا دولارية وبدون شوبيفاي</span>
              <span>• ربط رسمي بضغطة زر مع بوسطة</span>
            </div>

            <div className="text-[11px] text-zinc-500">
              تفعيل المتجر متاح فوراً خلال دقيقة واحدة • مساعدة مجانية في رفع المنتجات
            </div>

          </div>

          {/* Interactive Live Commerce Chassis (6 cols) */}
          <div className="lg:col-span-6 w-full">
            <div className="cst-panel rounded-2xl p-4 sm:p-5 border border-white/15 bg-[#101217]">
              
              {/* Chassis Tab Switcher */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("advisor")}
                    className={`py-1 px-2.5 rounded text-xs font-bold transition-all ${
                      activeTab === "advisor" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    مستشار المقاسات
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pos")}
                    className={`py-1 px-2.5 rounded text-xs font-bold transition-all ${
                      activeTab === "pos" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    تزامن الفروع (POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("bosta")}
                    className={`py-1 px-2.5 rounded text-xs font-bold transition-all ${
                      activeTab === "bosta" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    بوليصة بوسطة
                  </button>
                </div>
              </div>

              {/* Tab 1: Interactive Size Advisor */}
              {activeTab === "advisor" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">جرّب خوارزمية المقاس الذكي:</span>
                    <span className="text-emerald-400 font-mono">خفض المرتجعات 60%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="text-[11px] text-zinc-400 mb-1">طول العميل (سم)</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white cst-tabular">{testHeight} سم</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTestHeight((h) => Math.max(150, h - 2))}
                            className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center text-xs hover:bg-white/20"
                            aria-label="تقليل الطول"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestHeight((h) => Math.min(205, h + 2))}
                            className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center text-xs hover:bg-white/20"
                            aria-label="زيادة الطول"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="text-[11px] text-zinc-400 mb-1">وزن العميل (كجم)</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-white cst-tabular">{testWeight} كجم</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTestWeight((w) => Math.max(45, w - 2))}
                            className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center text-xs hover:bg-white/20"
                            aria-label="تقليل الوزن"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestWeight((w) => Math.min(140, w + 2))}
                            className="w-6 h-6 rounded bg-white/10 text-white flex items-center justify-center text-xs hover:bg-white/20"
                            aria-label="زيادة الوزن"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-blue-300">المقاس المقترح للقطعة</div>
                      <div className="text-xs text-zinc-300 font-medium">{advice.fit}</div>
                    </div>
                    <div className="text-2xl font-black text-blue-400 font-mono cst-tabular px-3 py-1 bg-blue-500/20 rounded-lg">
                      {advice.size}
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                    <span>نسبة احتمالية خطأ المقاس:</span>
                    <span className="text-emerald-400 font-bold">{advice.returnRisk}</span>
                  </div>
                </div>
              )}

              {/* Tab 2: POS Live Synchronization */}
              {activeTab === "pos" && (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-300 font-medium">
                    محاكاة بيع قطعة من فرع (المعادي) عبر الكاشير:
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold">تيشيرت هودي أوفرسايز (أسود - L)</span>
                      <span className="text-blue-400 font-mono cst-tabular">550 ج.م</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                      <span>باركود: 62230098412</span>
                      <span className="text-emerald-400">تم المسح ضوئياً ✓</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>تم خصم مقاس L فورياً من المتجر الإلكتروني لمنع البيع المزدوج.</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Bosta AWB Generation */}
              {activeTab === "bosta" && (
                <div className="space-y-3">
                  <div className="text-xs text-zinc-300 font-medium">
                    إصدار بوليصة شحن بوسطة بنقرة واحدة:
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">رقم البوليصة:</span>
                      <span className="text-white font-bold">BST-894102-EG</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">قيمة التحصيل (COD):</span>
                      <span className="text-emerald-400 font-bold cst-tabular">850 ج.م</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center justify-between">
                    <span>حالة رسالة الواتساب:</span>
                    <span className="text-emerald-400 font-mono">أُرسلت للعميل برقم التتبع ✓</span>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
