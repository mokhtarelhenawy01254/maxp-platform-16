import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Layers,
  Store,
  MessageSquare,
  Truck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  FASHION_TOOLS,
  TOTAL_STANDALONE_PRICE,
  MONTHLY_BUNDLE_PRICE,
  SAVINGS_AMOUNT,
} from "./clothingTasteData";

interface ClothingTasteToolsMatrixProps {
  onPricingScroll: () => void;
}

export const ClothingTasteToolsMatrix: React.FC<ClothingTasteToolsMatrixProps> = ({
  onPricingScroll,
}) => {
  const [showAllTools, setShowAllTools] = useState(false);

  const pillars = [
    {
      id: "selling",
      title: "البيع والتشغيل الميداني",
      icon: Store,
      headline: "كتالوج سريع، مسار طلبات مخصص، وطباعة جماعية",
      toolsCount: "4 أدوات مدمجة",
      standaloneCost: 947,
      highlights: [
        "المتجر الإلكتروني المتكامل (699 ج.م) — كتالوج وسلة شراء وكاشير فروع بالباركود",
        "مسار الطلبات المخصص (149 ج.م) — تنظيم حالات الأوردر من جديد للتسليم",
        "معالجة الطلبات الجماعية (99 ج.م) — تعديل حالات وطباعة مئات الطلبات دفعة واحدة",
        "تجهيز الطلبات ومعالجة النواقص (0 ج.م — بونص) — حصر نواقص المقاسات قبل الشحن",
      ],
    },
    {
      id: "conversations",
      title: "المحادثات والتأكيد الآلي",
      icon: MessageSquare,
      headline: "واتساب رسمي وتجميع رسائل كل المنصات في شاشة واحدة",
      toolsCount: "3 أدوات مدمجة",
      standaloneCost: 798,
      highlights: [
        "WhatsApp Business API رسمي (350 ج.م) — تأكيد فوري يمنع الأوردرات الوهمية",
        "صندوق الوارد الموحد Unified Inbox (299 ج.م) — تجميع رسائل فيسبوك وإنستجرام وواتساب",
        "أتمتة المحادثات والرد الآلي (149 ج.م) — ردود فورية بالكلمات المفتاحية على المقاسات والأسعار",
      ],
    },
    {
      id: "logistics",
      title: "الشحن والمخزون والمرتجعات",
      icon: Truck,
      headline: "ربط بوسطة وتوربو، جرد المستودعات، وتشخيص المرتجعات",
      toolsCount: "4 أدوات مدمجة",
      standaloneCost: 546,
      highlights: [
        "الشحن الذكي Turbo وبوسطة وQP Express (149 ج.م) — إصدار بوالص وتتبع بنقرة واحدة",
        "المخزون والمستودعات ومصفوفة المقاسات (199 ج.م) — جرد دقيق لمقاسات S إلى 2XL وتنبيهات النفاد",
        "إعدادات وقواعد المرتجعات (99 ج.م) — شروط وسياسات مراجعة واضحة للإرجاع والاستبدال",
        "تحليلات أسباب المرتجعات (99 ج.م) — تشخيص دقيق لسبب الارتجاع لعلاجه وخفض الهدر المالي",
      ],
    },
    {
      id: "measurement",
      title: "القياس وصافي الأرباح والإعلانات",
      icon: BarChart3,
      headline: "إسناد كل أوردر لحملته الإعلانية وحساب صافي الربح الحقيقي",
      toolsCount: "6 أدوات مدمجة",
      standaloneCost: 645,
      highlights: [
        "إسناد الحملات Campaign Attribution (149 ج.م) — معرفة الإعلان الممول المباشر لكل أوردر",
        "إعلانات فيسبوك وانستجرام الذكية (199 ج.م) — إدارة الحملات ومزامنة الكتالوج من اللوحة",
        "تحليلات الأرباح وصافي الهامش (99 ج.م) — حساب صافي الربح بعد خصم التصنيع والشحن والإعلان",
        "تحليلات الطلبات والمبيعات (99 ج.م) — مؤشرات المبيعات النقدية والملغاة والمقارنات الزمنية",
        "ربط صفحات فيسبوك والمنشورات (99 ج.م) — تحويل تفاعلات المنشورات لطلبات شراء",
        "بيانات أداء الحملات التسويقية (0 ج.م — بونص) — تحليل عائد الصرف الإعلاني (ROAS)",
      ],
    },
  ];

  return (
    <section id="tools-matrix" className="py-20 border-b border-black/[0.06] bg-white text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-xs font-mono text-zinc-700 mb-3">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              <span>ترسانة براند الأزياء الموحدة</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#141416] tracking-tight leading-tight mb-2">
              17 أداة تشغيلية في 4 محاور تحميك من تشتت الاشتراكات
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 max-w-xl leading-relaxed">
              بدلاً من دفع اشتراكات متفرقة لمنصة متجر، وبرنامج واتساب، وبرنامج بوالص شحن، وبرنامج مخزون بتكلفة إجمالية{" "}
              <strong className="text-[#141416] cst-tabular">{TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م</strong> شهرياً، تحصل على كل الأدوات في باقة واحدة بـ{" "}
              <strong className="text-emerald-700 cst-tabular">{MONTHLY_BUNDLE_PRICE} ج.م</strong> فقط.
            </p>
          </div>

          {/* Arbitrage Callout Card */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-black/[0.08] flex items-center gap-6 shadow-sm shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-zinc-500 font-medium">الاشتراكات المنفردة</div>
              <div className="text-xs text-zinc-400 line-through cst-tabular font-bold">
                {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م/شهر
              </div>
            </div>
            <div className="w-px h-8 bg-black/10" />
            <div className="text-right">
              <div className="text-[11px] text-emerald-800 font-bold">سعر الباقة الموحدة</div>
              <div className="text-xl font-black text-[#141416] cst-tabular">
                {MONTHLY_BUNDLE_PRICE} ج.م<span className="text-xs font-normal text-zinc-600">/شهر</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="cst-panel rounded-2xl p-6 bg-[#FAF8F5] border border-black/[0.08] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-zinc-600 px-2.5 py-1 rounded-md bg-white border border-black/[0.06]">
                      {pillar.toolsCount}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-500">
                        قيمة منفردة: {pillar.standaloneCost} ج.م
                      </span>
                      <div className="p-2 rounded-lg bg-[#141416] text-white">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-[#141416] mb-1">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-zinc-600 font-medium mb-4">
                    {pillar.headline}
                  </p>

                  <ul className="space-y-2 mb-6 text-xs text-zinc-700 leading-relaxed">
                    {pillar.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expandable 17-Tool Comprehensive Breakdown Table */}
        <div className="rounded-2xl border border-black/[0.08] bg-[#FAF8F5] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAllTools(!showAllTools)}
            className="w-full p-4 sm:p-5 flex items-center justify-between bg-white hover:bg-zinc-50 transition-colors text-right cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-zinc-900">
                {showAllTools ? "إخفاء جدول تفاصيل الأدوات" : "عرض تفاصيل الـ 17 أداة كاملة بالأسعار المنفردة"}
              </span>
              <span className="text-xs text-emerald-700 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                وفر {SAVINGS_AMOUNT.toLocaleString("en-US")} ج.م شهرياً
              </span>
            </div>
            <div className="text-zinc-500">
              {showAllTools ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showAllTools && (
            <div className="p-4 sm:p-6 border-t border-black/[0.06] overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-zinc-500 font-medium">
                    <th className="pb-3 pr-2">الأداة التشغيلية</th>
                    <th className="pb-3">الوظيفة الأساسية في متجر ملابسك</th>
                    <th className="pb-3 text-left pl-2">السعر المنفرد</th>
                    <th className="pb-3 text-left pl-2">داخل باقة 999</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {FASHION_TOOLS.map((tool) => (
                    <tr key={tool.id} className="hover:bg-black/[0.02]">
                      <td className="py-3 pr-2 font-bold text-[#141416] whitespace-nowrap">
                        {tool.name}
                      </td>
                      <td className="py-3 text-zinc-600 max-w-md">
                        {tool.description}
                      </td>
                      <td className="py-3 text-left pl-2 font-mono text-zinc-500 cst-tabular whitespace-nowrap">
                        {tool.standalonePrice === 0 ? "بونص شامل" : `${tool.standalonePrice} ج.م`}
                      </td>
                      <td className="py-3 text-left pl-2 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        مشمولة مجاناً ✓
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black/10 font-bold">
                    <td colSpan={2} className="pt-4 text-sm text-[#141416]">
                      الإجمالي المنفرد vs باقة المتجر الكاملة
                    </td>
                    <td className="pt-4 text-left pl-2 text-zinc-400 line-through font-mono cst-tabular text-sm">
                      {TOTAL_STANDALONE_PRICE.toLocaleString("en-US")} ج.م
                    </td>
                    <td className="pt-4 text-left pl-2 text-emerald-700 font-mono cst-tabular text-base">
                      {MONTHLY_BUNDLE_PRICE} ج.م/شهر
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
