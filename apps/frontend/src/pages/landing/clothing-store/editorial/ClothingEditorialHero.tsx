import React, { useState, useMemo } from "react";
import { ArrowLeft, Check, Sparkles, Sliders, Truck, ShieldCheck } from "lucide-react";

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
    if (bmi < 21) return { size: "S", label: "مقاس S (تلبيس مريح Regular)" };
    if (bmi < 24.5) return { size: "M", label: "مقاس M (تلبيس مريح Regular)" };
    if (bmi < 27.5) return { size: "L", label: "مقاس L (تلبيس مناسب Perfect Fit)" };
    if (bmi < 31) return { size: "XL", label: "مقاس XL (تلبيس أوفر سايز Oversized)" };
    return { size: "2XL", label: "مقاس 2XL (تلبيس فضفاض Loose Fit)" };
  }, [height, weight]);

  const colorData: Record<string, { name: string; hex: string; stock: number }> = {
    black: { name: "أسود فحمي فاخر", hex: "#141416", stock: 18 },
    olive: { name: "زيتي عسكري مهدأ", hex: "#4a5340", stock: 9 },
    cream: { name: "أوف وايت عاجي", hex: "#e7e2d9", stock: 14 },
  };

  return (
    <section id="editorial-hero" className="py-12 sm:py-20 border-b border-black/[0.06] bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Copy (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-start text-right">
            <div className="cse-badge cse-badge-gold mb-5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>هندسة تجارة الأزياء 2026 • حلول براندات ومحلات الملابس</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 tracking-tight leading-[1.25] mb-5">
              براند الملابس بتاعك يستحق متجر يشبه مجلات الموضة.. ومنظومة فروع وشحن ما تغلطش
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed mb-8 max-w-2xl">
              من أول جلسة التصوير وعرض الكوليكشن، لحد تأكيد مقاس الزبون وطباعة بوليصة بوسطة بنقرة واحدة. واجهة متجر فاخرة لزبائنك، وسيستم ذكي يوقف نزيف المرتجعات وتضارب فروع المحل.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-10">
              <button
                onClick={onFreeRegister}
                type="button"
                className="cse-btn-primary text-base py-3.5 px-6 font-bold"
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

            {/* Quiet Luxury Telemetry Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-6 border-t border-black/[0.08]">
              <div>
                <div className="text-2xl font-bold text-zinc-950 cse-tabular">
                  0 <span className="text-xs text-zinc-500 font-normal">ج.م</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">تكلفة فتح المتجر المستمرة</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-zinc-950 cse-tabular">
                  1 <span className="text-xs text-zinc-500 font-normal">ج.م/أوردر</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">بدون اشتراك شهري ثابت</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-zinc-950 cse-tabular">
                  17 <span className="text-xs text-zinc-500 font-normal">تطبيقاً</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">باقة كاملة بـ 999 ج.م</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-emerald-600 cse-tabular">
                  60%
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">انخفاض في مرتجعات المقاس</div>
              </div>
            </div>
          </div>

          {/* Interactive Editorial Centerpiece (5 cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="cse-panel p-5 sm:p-6 shadow-xl relative bg-white">
              
              {/* Product Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    Winter Heavy Drop • كوليكشن الشتاء
                  </span>
                </div>
                <span className="text-xs font-bold text-black cse-tabular">
                  750 ج.م
                </span>
              </div>

              {/* Product Title & Swatches */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-zinc-950 mb-1">
                  سويت شيرت أوفر سايز (Heavy Fleece Cotton)
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  اللون المختار: <strong className="text-zinc-900">{colorData[selectedColor]?.name}</strong> ({colorData[selectedColor]?.stock} قطعة متاحة بالمخزن)
                </p>

                {/* Color Swatches */}
                <div className="flex items-center gap-3">
                  {Object.entries(colorData).map(([key, item]) => {
                    const isSelected = selectedColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedColor(key)}
                        style={{ backgroundColor: item.hex }}
                        className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                          isSelected ? "border-zinc-900 scale-110 shadow-md ring-2 ring-black/20" : "border-white"
                        }`}
                        title={item.name}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Live Interactive Size Advisor */}
              <div id="size-advisor" className="bg-[#FAF8F5] border border-black/[0.06] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-zinc-700" />
                    مستشار المقاسات الذكي (جرب بنفسك):
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    دقة 98.6%
                  </span>
                </div>

                {/* Sliders */}
                <div className="space-y-3 mb-3">
                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 mb-1">
                      <span>طول العميل:</span>
                      <strong className="text-zinc-950 cse-tabular">{height} سم</strong>
                    </div>
                    <input
                      type="range"
                      min="155"
                      max="198"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="cse-slider"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-zinc-600 mb-1">
                      <span>وزن العميل:</span>
                      <strong className="text-zinc-950 cse-tabular">{weight} كجم</strong>
                    </div>
                    <input
                      type="range"
                      min="55"
                      max="125"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="cse-slider"
                    />
                  </div>
                </div>

                {/* Live Recommendation Output */}
                <div className="bg-white border border-black/[0.06] rounded-lg p-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">المقاس الموصى به تلقائياً:</div>
                    <div className="text-xs font-extrabold text-zinc-950 mt-0.5">
                      {calculatedSize.label}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-sm">
                    {calculatedSize.size}
                  </div>
                </div>
              </div>

              {/* Bosta Live Shipping Signal */}
              <div className="flex items-center justify-between text-xs pt-2 text-zinc-600 border-t border-black/[0.06]">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>ربط بوسطة: بوليصة فورية بنقرة واحدة</span>
                </div>
                <span className="font-semibold text-zinc-950">
                  الدفع عند الاستلام متاح
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
