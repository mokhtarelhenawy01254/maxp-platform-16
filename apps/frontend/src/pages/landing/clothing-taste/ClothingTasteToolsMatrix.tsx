import React, { useState } from "react";
import { ArrowLeft, Check, Layers, Store, Barcode, Truck, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { FASHION_TOOLS, TOTAL_STANDALONE_PRICE, MONTHLY_BUNDLE_PRICE, SAVINGS_AMOUNT } from "./clothingTasteData";

interface ClothingTasteToolsMatrixProps {
  onPricingScroll: () => void;
}

export const ClothingTasteToolsMatrix: React.FC<ClothingTasteToolsMatrixProps> = ({
  onPricingScroll,
}) => {
  const [showAllTools, setShowAllTools] = useState(false);

  const pillars = [
    {
      id: "store",
      title: "منظومة المتجر وكتالوج الأزياء الذكي",
      icon: Store,
      headline: "متجر أنيق وسريع مخصص للملابس مع مستشار المقاسات",
      toolsCount: "4 أدوات مدمجة",
      standaloneCost: 677,
      highlights: [
        "متجر ويب متجاوب عالي السرعة مصمم لعرض كوليكشنات الأزياء",
        "مستشار المقاسات الذكي الذي يقترح المقاس بالسنتيمتر ويخفض المرتجع 60%",
        "بوابة التبديل والمرتجعات المنظمة لتسهيل تجربة العميل",
        "محرك العروض والأطقم (Bundles) لزيادة متوسط قيمة السلة",
      ],
    },
    {
      id: "pos",
      title: "كاشير الفروع والمخزون المتزامن لحظياً",
      icon: Barcode,
      headline: "كاشير باللمس للمحلات يمنع البيع المزدوج ويسرّع البيع",
      toolsCount: "5 أدوات مدمجة",
      standaloneCost: 747,
      highlights: [
        "كاشير Cloud POS يدعم شاشات اللمس والباركود ويعمل حتى لو فصل الإنترنت",
        "تزامن مخزون فوري: القطعة المباعة في المحل تختفي من الأونلاين في نفس الثانية",
        "طباعة فواتير حرارية سريعة (80mm) بشعار المحل وسياسة التبديل",
        "جرد تلقائي للمقاسات والألوان مع تنبيهات عند اقتراب نفاد المقاس",
      ],
    },
    {
      id: "shipping",
      title: "ماكينة الشحن الآلي مع بوسطة وتأكيد واتساب",
      icon: Truck,
      headline: "طباعة 100 بوليصة بضغطة زر ورسائل تتبع أوتوماتيكية للزبون",
      toolsCount: "4 أدوات مدمجة",
      standaloneCost: 847,
      highlights: [
        "ربط API رسمي مع بوسطة بدون أي وسيط لإصدار البوالص دفعة واحدة",
        "رسائل واتساب آلية ترسل بوليصة التتبع للزبون فور تسليم المندوب",
        "تأكيد العناوين وأرقام الموبايل قبل الشحن لمنع خروج الأوردرات الوهمية",
        "تتبع حالات التسليم وتوريدات الكاش (COD) في جدول مالي واحد",
      ],
    },
    {
      id: "finance",
      title: "حاسبة هوامش القماش والتصنيع والأرباح",
      icon: Calculator,
      headline: "معرفة صافي ربح كل قطعة بالجنيه بدلاً من التخمين وشيتات الإكسيل",
      toolsCount: "4 أدوات مدمجة",
      standaloneCost: 673,
      highlights: [
        "حساب تكلفة المتر والمصنعية والشحن لمعرفة الربح الصافي للقطعة",
        "ربط بكسل فيسبوك وتيك توك (CAPI) لرفع كفاءة إعلانات البراند",
        "استيراد وتصدير سريع لملفات الإكسيل في ثوانٍ لنقل المخزون بسهولة",
        "لوحة تحكم للمدير تظهر مبيعات كل فرع ونسبة المبيعات أونلاين vs المحل",
      ],
    },
  ];

  return (
    <section className="py-20 border-b border-black/[0.06] bg-white text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              <span>ترسانة براند الأزياء الموحدة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-2">
              4 ركائز تشغيلية مدمجة تريحك من تشتت البرامج المتعددة
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl leading-relaxed">
              بدلاً من دفع اشتراكات متفرقة لبرنامج كاشير، ومنصة متجر، وبرنامج بوالص شحن، وبرنامج حسابات بتكلفة تفوق{" "}
              <strong className="text-[#141416] cst-tabular">{TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م</strong> شهرياً، تحصل على منظومة واحدة متكاملة بـ{" "}
              <strong className="text-emerald-700 cst-tabular">{MONTHLY_BUNDLE_PRICE} ج.م</strong> فقط.
            </p>
          </div>

          {/* Arbitrage Callout Card */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/[0.08] flex items-center gap-6 shadow-sm shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-zinc-500 font-medium">البرامج المنفصلة</div>
              <div className="text-xs text-zinc-400 line-through cst-tabular font-bold">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م/شهر
              </div>
            </div>
            <div className="h-7 w-px bg-zinc-300" />
            <div className="text-right">
              <div className="text-[11px] text-zinc-600 font-medium">باقة MaxP الشاملة</div>
              <div className="text-xl font-black text-[#141416] font-mono cst-tabular">
                {MONTHLY_BUNDLE_PRICE} ج.م<span className="text-xs font-normal text-zinc-500">/شهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Power Pillars Grid (2x2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {pillars.map((pil) => {
            const Icon = pil.icon;
            return (
              <div
                key={pil.id}
                className="p-6 sm:p-7 rounded-2xl bg-[#FAF8F5] border border-black/[0.08] shadow-sm flex flex-col justify-between hover:border-black/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-white border border-black/[0.06] text-[#141416]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-black text-[#141416]">
                        {pil.title}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-600 bg-white border border-black/[0.06] px-2.5 py-1 rounded-md">
                      {pil.toolsCount}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-zinc-800 mb-4">
                    {pil.headline}
                  </p>

                  <div className="space-y-2.5 mb-6">
                    {pil.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-600 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">سعر البرامج المنفصلة المشابهة:</span>
                  <span className="text-zinc-600 font-bold line-through cst-tabular">
                    {pil.standaloneCost} ج.م/شهر
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle to view all 17 discrete tools */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setShowAllTools(!showAllTools)}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 hover:text-black py-2 px-4 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <span>{showAllTools ? "إخفاء التفاصيل الفردية" : "عرض قائمة الـ 17 أداة بالتفصيل الفردي"}</span>
            {showAllTools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expandable list of 17 tools if merchant wants exhaustive breakdown */}
        {showAllTools && (
          <div className="mt-6 pt-6 border-t border-black/[0.06] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FASHION_TOOLS.map((tool) => (
              <div
                key={tool.id}
                className="p-3.5 rounded-xl bg-white border border-black/[0.06] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-xs font-black text-[#141416]">{tool.name}</h4>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded">
                      {tool.standalonePrice} ج.م
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">
                    {tool.description}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-emerald-700 font-bold border-t border-black/[0.04] pt-1.5">
                  مشمول بالباقة الشاملة ✓
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA trigger */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={onPricingScroll}
            className="cst-btn-secondary text-xs sm:text-sm py-3 px-7 font-bold cursor-pointer"
          >
            <span>اشترك في المنظومة الشاملة (وفر {SAVINGS_AMOUNT.toLocaleString("en-US")} ج.م شهرياً)</span>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
