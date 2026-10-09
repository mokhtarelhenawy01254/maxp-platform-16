import React, { useState } from "react";
import { ArrowLeft, Smartphone, Store, Package, Check, ShieldCheck, Printer, Barcode } from "lucide-react";
import { BlurFade } from "../../../../components/ui/luxury/BlurFade";
import { LuxuryMarquee } from "../../../../components/ui/luxury/LuxuryMarquee";
import { WHATSAPP_CONSULT_URL } from "../clothingStoreData";

interface ClothingEditorialHeroProps {
  onFreeRegister: () => void;
  onPricingScroll: () => void;
}

export const ClothingEditorialHero: React.FC<ClothingEditorialHeroProps> = ({
  onFreeRegister,
  onPricingScroll,
}) => {
  // Active demo tab inside the merchant cockpit mockup
  const [activeTab, setActiveTab] = useState<"storefront" | "pos" | "bosta">("storefront");

  return (
    <section id="editorial-hero" className="border-b border-black/[0.08] bg-[#FAF8F5] pt-10 sm:pt-16 pb-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Main Hero Copy for the Merchant (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-start text-right">
            <BlurFade delay={0.05}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-mono tracking-widest uppercase mb-4 text-zinc-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>MAXP APPAREL OS • سوفت وير إدارة براندات ومحلات الملابس</span>
              </div>
            </BlurFade>

            <BlurFade delay={0.1}>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-zinc-950 tracking-tight leading-[1.15] mb-4 font-serif text-balance">
                متجر إلكتروني يشبه زارا… وسيستم فروع وشحن يوقف نزيف المرتجعات
              </h1>
            </BlurFade>

            <BlurFade delay={0.15}>
              <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed mb-6 max-w-xl">
                منظومة مخصصة لتجار وبراندات الملابس في مصر: متجر فاخر لزبائنك، كاشير سحابي متزامن مع فروع المحل، وطباعة بوالص بوسطة بنقرة واحدة، ومستشار مقاسات ذكي يمنع تبديل القطع.
              </p>
            </BlurFade>

            {/* Merchant Primary CTAs */}
            <BlurFade delay={0.2} className="w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-stretch gap-3 w-full sm:w-auto mb-4">
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
                <a
                  href={WHATSAPP_CONSULT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-black/10 bg-white hover:bg-neutral-100 text-xs sm:text-sm font-bold text-zinc-900 transition-all whitespace-nowrap"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>تواصل عبر واتساب</span>
                </a>
              </div>

              {/* Explicit Risk Reversals */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 mb-6 font-medium">
                <span className="text-emerald-800 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  0% عمولة على مبيعاتك نهائياً
                </span>
                <span>• بدون فيزا دولارية وبدون مصاريف شوبيفاي</span>
                <span>• مساعدة في رفع أول 50 منتج مجاناً</span>
              </div>
            </BlurFade>

            {/* Key Telemetry Stats for the Merchant */}
            <BlurFade delay={0.25} className="w-full">
              <div className="grid grid-cols-3 gap-4 border-t border-black/10 pt-6 w-full">
                <div>
                  <div className="text-2xl font-black text-zinc-950 cse-tabular">0 ج.م</div>
                  <div className="text-xs text-zinc-500">متجر أونلاين مجاني دائم</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-zinc-950 cse-tabular">1 ج.م/أوردر</div>
                  <div className="text-xs text-zinc-500">تدفع فقط لما تشحن</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-700 cse-tabular">60%</div>
                  <div className="text-xs text-zinc-500">انخفاض في مرتجعات المقاس</div>
                </div>
              </div>
            </BlurFade>
          </div>

          {/* Interactive Merchant Cockpit Preview (6 cols) */}
          <div className="lg:col-span-6 flex flex-col items-center w-full">
            <BlurFade delay={0.2} className="w-full max-w-lg">
              <div className="rounded-3xl overflow-hidden shadow-2xl border border-black/15 bg-zinc-950 text-white">
                
                {/* Mockup Header & Interactive Switcher for the 3 Superpowers */}
                <div className="p-3 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    MaxP Apparel OS • معاينة شاشات النظام الحية
                  </span>
                </div>

                {/* 3 Interactive Mode Tabs */}
                <div className="grid grid-cols-3 bg-zinc-900/60 p-1 border-b border-white/10 text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("storefront")}
                    className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "storefront"
                        ? "bg-white text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>متجر الزبائن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pos")}
                    className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "pos"
                        ? "bg-white text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>كاشير الفروع</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("bosta")}
                    className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === "bosta"
                        ? "bg-white text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>بوليصة بوسطة</span>
                  </button>
                </div>

                {/* Tab 1: Customer Storefront Preview */}
                {activeTab === "storefront" && (
                  <div className="p-5 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <div className="text-xs text-zinc-400">واجهة متجرك الإلكتروني الفاخر</div>
                        <div className="text-base font-bold text-white">store.yourbrand.com</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        LIVE & FAST (P95 &lt; 0.8s)
                      </span>
                    </div>

                    <div className="flex gap-4 items-center bg-zinc-900/90 p-3 rounded-2xl border border-white/10">
                      <img
                        src="/images/fashion/editorial-streetwear.jpg"
                        alt="كوليكشن المتجر"
                        className="w-20 h-24 object-cover rounded-xl shrink-0"
                      />
                      <div className="space-y-1.5 flex-1">
                        <div className="text-xs font-bold text-white">سويت شيرت أوفر سايز (Heavy Fleece)</div>
                        <div className="text-xs text-zinc-400">المقاس الموصى به: <span className="text-white font-bold">L (Perfect Fit)</span></div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-sm font-black text-white font-serif cse-tabular">750 ج.م</span>
                          <span className="text-[10px] text-zinc-400">(متبقي 4 قطع بالمخزن)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مستشار المقاسات الذكي مدمج في صفحة المنتج</span>
                      </span>
                      <span className="text-emerald-400 font-bold">-60% مرتجعات</span>
                    </div>
                  </div>
                )}

                {/* Tab 2: Branch POS & Live Inventory Sync */}
                {activeTab === "pos" && (
                  <div className="p-5 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <div className="text-xs text-zinc-400">نظام كاشير الفروع والمخزون الموحد</div>
                        <div className="text-base font-bold text-white">Cloud POS • مزامنة لحظية</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                        SYNCED 100%
                      </span>
                    </div>

                    {/* Branches stock breakdown */}
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-400 font-bold">توزيع رصيد المقاسات بين الفروع والمتجر:</div>
                      
                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between text-xs">
                        <span className="text-zinc-200">فرع المهندسين (الكاشير 1)</span>
                        <span className="font-bold text-white font-mono">5 قطع (L)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between text-xs">
                        <span className="text-zinc-200">فرع مدينة نصر (الكاشير 2)</span>
                        <span className="font-bold text-white font-mono">3 قطع (L)</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold">متاح على المتجر الإلكتروني</span>
                        <span className="font-bold text-emerald-400 font-mono">8 قطع (مزامنة تلقائية)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <Barcode className="w-4 h-4 shrink-0" />
                      <span>أي قطعة تتباع على كاشير المحل تتخصم فوراً من الموقع والعكس.</span>
                    </div>
                  </div>
                )}

                {/* Tab 3: Automated Bosta Waybill & Tracking */}
                {activeTab === "bosta" && (
                  <div className="p-5 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div>
                        <div className="text-xs text-zinc-400">طباعة بوالص الشحن بنقرة واحدة</div>
                        <div className="text-base font-bold text-white">ربط مباشر مع بوسطة (Bosta API)</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                        AUTO-GENERATED
                      </span>
                    </div>

                    {/* Simulated Bosta Waybill */}
                    <div className="p-4 rounded-2xl bg-white text-zinc-950 border border-white/20 space-y-2 text-right">
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                        <span className="font-black text-sm font-serif">BOSTA AIRWAY BILL</span>
                        <span className="text-xs font-mono font-bold">#BST-89420-EG</span>
                      </div>
                      <div className="text-xs font-bold text-zinc-900">العميل: أحمد محمود • 01012345678</div>
                      <div className="text-xs text-zinc-600">العنوان: المعادي، القاهرة (توصيل غداً)</div>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                        <span className="text-zinc-500">التحصيل عند الاستلام (COD):</span>
                        <span className="font-black text-base cse-tabular">750 ج.م</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة طابعة حرارية 10×15 بنقرة واحدة</span>
                      </span>
                      <span>إشعار واتساب تلقائي</span>
                    </div>
                  </div>
                )}

              </div>
            </BlurFade>
          </div>

        </div>
      </div>

      {/* Magic UI Luxury Infinite Marquee for Merchants */}
      <div className="mt-14 py-4 border-y border-black/[0.08] bg-black text-white">
        <LuxuryMarquee repeat={5} className="[--duration:25s]">
          <div className="flex items-center gap-8 text-xs font-mono tracking-widest uppercase">
            <span className="text-amber-400 font-bold">✦ MAXP APPAREL PLATFORM</span>
            <span className="text-zinc-400">• ربط بوسطة وشركات الشحن بلحظة</span>
            <span className="text-zinc-200 font-bold">• كاشير سحابي متزامن مع الفروع (CLOUD POS)</span>
            <span className="text-zinc-400">• مستشار المقاسات الذكي لخفض المرتجعات 60%</span>
            <span className="text-emerald-400 font-bold">• 0 ج.م متجر مجاني</span>
            <span className="text-zinc-400">• مصفوفة المقاسات والألوان (MATRIX S/M/L/XL)</span>
            <span className="text-white font-bold">• باقة 999 ج.م الشاملة</span>
          </div>
        </LuxuryMarquee>
      </div>
    </section>
  );
};
