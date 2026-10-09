import React, { useState, useMemo } from "react";
import { ArrowLeft, Sparkles, Sliders, ShieldCheck } from "lucide-react";
import { Lens } from "../../../../components/ui/luxury/Lens";
import { BlurFade } from "../../../../components/ui/luxury/BlurFade";
import { LuxuryMarquee } from "../../../../components/ui/luxury/LuxuryMarquee";

interface ClothingEditorialHeroProps {
  onFreeRegister: () => void;
  onPricingScroll: () => void;
}

export const ClothingEditorialHero: React.FC<ClothingEditorialHeroProps> = ({
  onFreeRegister,
  onPricingScroll,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>("black");
  const [height, setHeight] = useState<number>(178);
  const [weight, setWeight] = useState<number>(80);

  // Dynamic Size Advisor calculation logic
  const calculatedSize = useMemo(() => {
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi < 21) return { size: "S", label: "مقاس S (تلبيس Regular)" };
    if (bmi < 24.5) return { size: "M", label: "مقاس M (تلبيس Regular)" };
    if (bmi < 27.5) return { size: "L", label: "مقاس L (تلبيس مناسب Perfect Fit)" };
    if (bmi < 31) return { size: "XL", label: "مقاس XL (تلبيس Oversized)" };
    return { size: "2XL", label: "مقاس 2XL (تلبيس فضفاض Loose Fit)" };
  }, [height, weight]);

  const colorData: Record<string, { name: string; hex: string; stock: number }> = {
    black: { name: "أسود فحم ستوديو", hex: "#141416", stock: 18 },
    olive: { name: "زيتي عسكري مهدأ", hex: "#4a5340", stock: 9 },
    cream: { name: "أوف وايت عاجي", hex: "#e7e2d9", stock: 14 },
  };

  return (
    <section id="editorial-hero" className="border-b border-black/[0.08] bg-[#FAF8F5] pt-8 sm:pt-16 pb-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Main Hero Copy (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-start text-right">
            <BlurFade delay={0.05}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-mono tracking-widest uppercase mb-4 text-zinc-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>MAXP ATELIER • FASHION ENGINEERING 2026</span>
              </div>
            </BlurFade>

            <BlurFade delay={0.1}>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-zinc-950 tracking-tight leading-[1.15] mb-4 font-serif">
                براند الملابس بتاعك يستحق متجر يشبه مجلات الموضة.. ومنظومة فروع وشحن ما تغلطش
              </h1>
            </BlurFade>

            <BlurFade delay={0.15}>
              <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed mb-6 max-w-xl">
                من أول جلسة التصوير لكوليكشن 2026، حتى تأكيد المقاس وطباعة بوليصة بوسطة بنقرة واحدة. واجهة استثنائية لزبائنك مع سيستم ذكي يوقف نزيف المرتجعات.
              </p>
            </BlurFade>

            {/* CTAs */}
            <BlurFade delay={0.2} className="w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-8">
                <button
                  onClick={onFreeRegister}
                  type="button"
                  className="cse-btn-primary text-base py-3.5 px-7 font-bold shadow-lg shadow-black/10 hover:shadow-black/20"
                >
                  <span>افتح متجرك مجاناً (0 ج.م)</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onPricingScroll}
                  type="button"
                  className="cse-btn-secondary text-base py-3.5 px-6 font-semibold"
                >
                  <span>باقة المتجر الكاملة (999 ج.م)</span>
                </button>
              </div>
            </BlurFade>

            {/* Key Telemetry Stats */}
            <BlurFade delay={0.25} className="w-full">
              <div className="grid grid-cols-3 gap-4 border-t border-black/10 pt-6 w-full">
                <div>
                  <div className="text-2xl font-black text-zinc-950 cse-tabular">0 ج.م</div>
                  <div className="text-xs text-zinc-500">تكلفة فتح المتجر المستمرة</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-zinc-950 cse-tabular">1 ج.م/أوردر</div>
                  <div className="text-xs text-zinc-500">بدون اشتراك شهري ثابت</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-700 cse-tabular">60%</div>
                  <div className="text-xs text-zinc-500">انخفاض في مرتجعات المقاس</div>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Interactive Fashion Lens Canvas (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <BlurFade delay={0.2} className="w-full max-w-md sm:max-w-lg">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10 bg-white">
                
                {/* Aceternity UI Lens Component wrapping the real editorial fashion photo */}
                <Lens zoomFactor={2.4} lensSize={180}>
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-900">
                    <img
                      src="/images/fashion/editorial-streetwear.jpg"
                      alt="كوليكشن الأزياء والستريت وير"
                      className="w-full h-full object-cover select-none"
                    />

                    {/* Lens hint badge */}
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono tracking-wider border border-white/20">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>مرر الماوس لفحص نسيج القماش (LENS 2.4X)</span>
                    </div>

                    {/* Collection badge */}
                    <div className="absolute bottom-4 right-4 z-20 px-3 py-1 rounded-lg bg-white/90 backdrop-blur-md text-zinc-900 text-xs font-bold border border-black/10 shadow-sm">
                      سويت شيرت أوفر سايز (Heavy Fleece) • 750 ج.م
                    </div>
                  </div>
                </Lens>

                {/* Embedded Minimal Size Advisor Controls */}
                <div id="size-advisor" className="p-4 sm:p-5 bg-white border-t border-black/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-zinc-900" />
                      <span className="text-xs sm:text-sm font-bold text-zinc-900">
                        مستشار المقاسات الذكي (جرب بنفسك):
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold cse-tabular">
                      دقة 98.6%
                    </span>
                  </div>

                  {/* Sliders */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-600 mb-1">
                        <span>طول العميل</span>
                        <span className="font-bold text-zinc-900 cse-tabular">{height} سم</span>
                      </div>
                      <input
                        type="range"
                        min="155"
                        max="198"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                        aria-label="طول العميل بالسنتيمتر"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-zinc-600 mb-1">
                        <span>وزن العميل</span>
                        <span className="font-bold text-zinc-900 cse-tabular">{weight} كجم</span>
                      </div>
                      <input
                        type="range"
                        min="55"
                        max="125"
                        value={weight}
                        onChange={(e) => setWeight(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                        aria-label="وزن العميل بالكيلوجرام"
                      />
                    </div>
                  </div>

                  {/* Recommendation banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-black/5">
                    <span className="text-xs text-zinc-600">المقاس الموصى به تلقائياً:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black px-2.5 py-0.5 rounded-md bg-black text-white">
                        {calculatedSize.size}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">
                        {calculatedSize.label}
                      </span>
                    </div>
                  </div>

                  {/* Color Swatches */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-zinc-600">اللون: {colorData[selectedColor].name}</span>
                    <div className="flex items-center gap-2">
                      {Object.entries(colorData).map(([key, val]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedColor(key)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            selectedColor === key ? "border-black scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: val.hex }}
                          title={val.name}
                          aria-label={`اختيار لون ${val.name}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </BlurFade>
          </div>

        </div>
      </div>

      {/* Magic UI Luxury Infinite Marquee */}
      <div className="mt-14 py-4 border-y border-black/[0.08] bg-black text-white">
        <LuxuryMarquee repeat={5} className="[--duration:25s]">
          <div className="flex items-center gap-8 text-xs font-mono tracking-widest uppercase">
            <span className="text-amber-400 font-bold">✦ MAXP ATELIER 2026</span>
            <span className="text-zinc-400">• ZARA OMNICHANNEL ENGINE</span>
            <span className="text-zinc-200 font-bold">• ربط بوسطة وبوليسة الشحن بلحظة</span>
            <span className="text-zinc-400">• كاشير وفروع CLOUD POS</span>
            <span className="text-emerald-400 font-bold">• 0 ج.م متجر مجاني</span>
            <span className="text-zinc-400">• مصفوفة المقاسات والألوان (MATRIX)</span>
            <span className="text-white font-bold">• باقة 999 ج.م الشاملة</span>
          </div>
        </LuxuryMarquee>
      </div>
    </section>
  );
};
