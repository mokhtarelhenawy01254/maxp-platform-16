import React, { useState } from "react";
import { ArrowLeft, Check, MessageCircle, ShieldCheck } from "lucide-react";
import { WHATSAPP_CONSULT_URL, PLATFORM_TELEMETRY } from "./clothingTasteData";

interface ClothingTasteHeroProps {
  onFreeRegister: () => void;
  onPricingScroll: () => void;
}

export const ClothingTasteHero: React.FC<ClothingTasteHeroProps> = ({
  onFreeRegister,
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

  return (
    <section id="editorial-hero" className="relative overflow-hidden pt-8 md:pt-14 pb-12 border-b border-black/[0.06] bg-[#FAF8F5] cst-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Main Hero Copy — Single Focused Conversion Message (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-start text-right">
            
            {/* 1. Eyebrow: Trust & Platform Definition */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs text-zinc-700 mb-4 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-bold text-zinc-900">{PLATFORM_TELEMETRY.activeStores} متجر نشط في مصر</span>
              <span className="text-zinc-400">•</span>
              <span>17 أداة في باقة واحدة</span>
              <span className="text-zinc-400">•</span>
              <span>ربط بوسطة وتوربو وواتساب API</span>
            </div>

            {/* 2. Headline (Outcome-Focused, Clear, Specific) */}
            <h1 className="text-3xl sm:text-5xl font-black text-[#141416] tracking-tight leading-[1.18] mb-4 cst-text-balance">
              المنظومة التشغيلية لبراندات ومحلات الملابس: 17 أداة تحكم مبيعاتك ومخزونك وشحنك
            </h1>

            {/* 3. Subtext (Benefits over features, customer language) */}
            <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed mb-6 max-w-xl cst-text-pretty">
              من استقبال الأوردر وتأكيد واتساب التلقائي، إلى طباعة بوالص بوسطة وتوربو الجماعية، وتزامن كاشير الفروع بالباركود، وتشخيص أسباب المرتجعات بالأرقام.
            </p>

            {/* 4. Single Dominant Primary CTA + Direct WhatsApp Link */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mb-3">
              <button
                onClick={onFreeRegister}
                type="button"
                className="cst-btn-primary text-sm py-3.5 px-7 font-bold shadow-md cursor-pointer"
              >
                <span>ابدأ متجرك مجاناً في 60 ثانية</span>
                <ArrowLeft className="w-4 h-4 mr-1" />
              </button>

              <a
                href={WHATSAPP_CONSULT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg border border-black/10 bg-white hover:bg-zinc-50 text-xs sm:text-sm font-semibold text-zinc-800 transition-all whitespace-nowrap min-h-[44px] shadow-xs"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>استشارة واتساب مع خبير المنظومة</span>
              </a>
            </div>

            {/* Explicit Risk Reversals (Zero Risk Assurance) */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-600 font-medium mb-2">
              <span className="flex items-center gap-1 text-emerald-800 font-bold">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                0% عمولة مبيعات
              </span>
              <span>• بدون فيزا دولارية وبدون شوبيفاي</span>
              <span>• وفر 1,937 ج.م شهرياً في باقة 999</span>
            </div>

            <div className="text-[11px] text-zinc-500 font-medium">
              تفعيل فوري في 60 ثانية • إعداد أول 50 منتج ومصفوفة المقاسات مجاناً بمعرفة فريقنا
            </div>

          </div>

          {/* Interactive Live Commerce Showcase (6 cols) */}
          <div className="lg:col-span-6 w-full">
            <div className="rounded-2xl p-4 sm:p-6 border border-black/[0.08] bg-white shadow-xl">
              
              {/* Showcase Tab Switcher */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/[0.06]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("advisor")}
                    className={`py-1 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "advisor" ? "bg-white text-black shadow-xs" : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    مستشار المقاسات
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pos")}
                    className={`py-1 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "pos" ? "bg-white text-black shadow-xs" : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    تزامن الفروع (POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("bosta")}
                    className={`py-1 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "bosta" ? "bg-white text-black shadow-xs" : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    بوليصة بوسطة وتوربو
                  </button>
                </div>
              </div>

              {/* Tab 1: Interactive Size Advisor */}
              {activeTab === "advisor" && (
                <div className="space-y-4 text-right">
                  <div className="flex items-center justify-between text-xs text-zinc-600">
                    <span className="font-bold text-zinc-900">جرّب مستشار المقاس التفاعلي للمشتري:</span>
                    <span className="text-emerald-700 font-bold">خفض المرتجعات 60%</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06]">
                      <div className="text-[11px] text-zinc-500 mb-1 font-medium">طول العميل (سم)</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-zinc-900 cst-tabular">{testHeight} سم</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTestHeight((h) => Math.max(150, h - 2))}
                            className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center text-xs hover:bg-zinc-100 font-bold cursor-pointer"
                            aria-label="تقليل الطول"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestHeight((h) => Math.min(205, h + 2))}
                            className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center text-xs hover:bg-zinc-100 font-bold cursor-pointer"
                            aria-label="زيادة الطول"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06]">
                      <div className="text-[11px] text-zinc-500 mb-1 font-medium">وزن العميل (كجم)</div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-zinc-900 cst-tabular">{testWeight} كجم</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setTestWeight((w) => Math.max(45, w - 2))}
                            className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center text-xs hover:bg-zinc-100 font-bold cursor-pointer"
                            aria-label="تقليل الوزن"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => setTestWeight((w) => Math.min(140, w + 2))}
                            className="w-6 h-6 rounded bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center text-xs hover:bg-zinc-100 font-bold cursor-pointer"
                            aria-label="زيادة الوزن"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-emerald-800 font-medium">المقاس المقترح الموصى به:</div>
                      <div className="text-xs text-emerald-950 font-bold">{advice.fit}</div>
                    </div>
                    <div className="text-2xl font-black text-emerald-800 cst-tabular px-3 py-1 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                      {advice.size}
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 flex items-center justify-between">
                    <span>نسبة احتمالية خطأ المقاس:</span>
                    <span className="text-emerald-700 font-bold">{advice.returnRisk}</span>
                  </div>
                </div>
              )}

              {/* Tab 2: POS Live Synchronization */}
              {activeTab === "pos" && (
                <div className="space-y-3 text-right">
                  <div className="text-xs text-zinc-700 font-bold">
                    محاكاة بيع قطعة من فرع المحل عبر كاشير الفروع (Cloud POS):
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-900 font-bold">تيشيرت أوفرسايز صيفي (أسود - L)</span>
                      <span className="text-zinc-900 font-black cst-tabular">550 ج.م</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                      <span>باركود: <span className="font-mono">62230098412</span></span>
                      <span className="text-emerald-700 font-bold">تم المسح ضوئياً بالباركود ✓</span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                    <span className="font-medium">تم خصم مقاس L فورياً من المتجر الإلكتروني لمنع البيع المزدوج للقطعة.</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Bosta AWB Generation */}
              {activeTab === "bosta" && (
                <div className="space-y-3 text-right">
                  <div className="text-xs text-zinc-700 font-bold">
                    إصدار بوليصة شحن بوسطة وتوربو بنقرة واحدة:
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-black/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">رقم البوليصة:</span>
                      <span className="text-zinc-900 font-black font-mono">BST-894102-EG</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">قيمة التحصيل عند الاستلام (COD):</span>
                      <span className="text-emerald-700 font-black cst-tabular">850 ج.م</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-100 border border-black/[0.06] text-xs text-zinc-700 flex items-center justify-between">
                    <span>رسالة تتبع الواتساب للزبون:</span>
                    <span className="text-emerald-700 font-bold">أُرسلت تلقائياً برقم التتبع ✓</span>
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
