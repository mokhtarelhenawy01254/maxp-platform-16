import React, { useState } from "react";
import {
  Check,
  Building2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  Sparkles,
} from "lucide-react";

type MaxPCockpitTab = "orders" | "inventory" | "shipping" | "financials";

interface TabItem {
  id: MaxPCockpitTab;
  label: string;
  badge?: string;
  headline: string;
  caption: string;
  imageSrc: string;
  imageAlt: string;
}

const TABS: TabItem[] = [
  {
    id: "orders",
    label: "تأكيد الطلبات وواتساب",
    badge: "تأكيد فوري 92%",
    headline: "تأكيد آلي للطلب عبر واتساب يمنع المرتجع",
    caption:
      "التحقق التلقائي من المقاس والعنوان فورياً، وخفض المرتجع بنسبة 40%+ قبل خروج الشحنة.",
    imageSrc: "/operix-assets/maxp-screens/maxp-orders.webp",
    imageAlt: "لوحة تحكم وتأكيد الطلبات في MaxP OS",
  },
  {
    id: "inventory",
    label: "المخزون وفروع المحلات",
    badge: "تزامن لحظي POS",
    headline: "مزامنة فورية بين فروع المحلات والمخازن",
    caption:
      "خصم لحظي للمبيعات من كاشير الفرع والمتجر الإلكتروني لمنع البيع المزدوج.",
    imageSrc: "/operix-assets/maxp-screens/maxp-inventory.webp",
    imageAlt: "إدارة المخزون وفروع المحلات في MaxP OS",
  },
  {
    id: "shipping",
    label: "بوالص بوسطة والشحن",
    badge: "بوسطة وأرامكس",
    headline: "إصدار بوالص الشحن وتتبع المناديب",
    caption:
      "طباعة مجمعة للبوالص بباركود معتمد ومتابعة دقيقة لكل شحنة حتى التسليم.",
    imageSrc: "/operix-assets/maxp-screens/maxp-shipping.webp",
    imageAlt: "ربط شركات الشحن وإصدار البوالص في MaxP OS",
  },
  {
    id: "financials",
    label: "الخزينة ومطابقة الـ COD",
    badge: "أرباحك الصافية",
    headline: "مطابقة كشوف COD واحتساب صافي الربح",
    caption:
      "مطابقة تحصيلات الدفع عند الاستلام مع شركات الشحن ومعرفة الكاش الفعلي في الخزينة.",
    imageSrc: "/operix-assets/maxp-screens/maxp-dashboard.webp",
    imageAlt: "مطابقة كشوفات التحصيل المالي في MaxP OS",
  },
];

export const OlCockpitSurface: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MaxPCockpitTab>("orders");

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div id="cockpit" className="relative pt-6 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Module Switcher Tabs Bar */}
        <div className="flex justify-center mb-6">
          <div className="ol-tabs-bar" role="tablist">
            {TABS.map((tab) => {
              const isSelected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className="ol-tab-btn"
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? "bg-[#3fffba] text-[#002624]"
                          : "bg-[#013735]/5 text-[#013735]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="ol-comet" aria-hidden="true">
                      <span />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Context Banner */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h3 className="text-lg sm:text-xl font-bold text-[#013735]">
            {currentTab.headline}
          </h3>
          <p className="text-xs sm:text-sm text-[#4e6362] mt-1.5 leading-relaxed font-normal">
            {currentTab.caption}
          </p>
        </div>

        {/* The 3D High-End Stage */}
        <div className="ol-stage-container">
          {/* Main 3D Plate housing MaxP Business OS */}
          <div className="ol-main-plate">
            {/* Comet Light Beam running around the plate border */}
            <span className="ol-comet" aria-hidden="true">
              <span />
            </span>

            <div className="ol-plate-inner bg-[#ffffff]">
              {/* Window Header Bar */}
              <div className="flex items-center justify-between border-b border-[#013735]/8 px-4 py-3 bg-[#f8faf9] text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="font-bold text-[#013735] text-xs sm:text-sm">
                    MaxP Business OS 3.0 · متجر سوان للأزياء (Swan Store)
                  </span>
                </div>

                {/* Dynamic Telemetry Status depending on active tab */}
                <div className="flex items-center gap-2">
                  {activeTab === "orders" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      ربط بوسطة وواتساب نشط
                    </span>
                  )}
                  {activeTab === "inventory" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
                      <Building2 className="w-3.5 h-3.5 text-blue-700" />
                      مخزن التجهيز الرئيسي
                    </span>
                  )}
                  {activeTab === "shipping" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      <Truck className="w-3.5 h-3.5 text-emerald-700" />
                      ربط سحابي معتمد مع بوسطة وأرامكس
                    </span>
                  )}
                  {activeTab === "financials" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      مطابقة كشف حساب بوسطة الأخير
                    </span>
                  )}
                </div>
              </div>

              {/* High-Resolution Vector Dashboard Plate */}
              <div className="relative overflow-hidden bg-white">
                <img
                  src={currentTab.imageSrc}
                  alt={currentTab.imageAlt}
                  className="w-full h-auto block select-none transition-opacity duration-300"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>

          {/* Floating Satellite Card 1 (Top Left / Right in RTL): Dynamic Contextual Badge */}
          <div className="ol-float-plate-tl !bg-[#ffffff] !p-4 !border-2 !border-[#3fffba]/50 shadow-2xl">
            {activeTab === "orders" && (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#013735]/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#013735]">
                      تأكيد آلي فوري عبر واتساب MaxP
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    رسمي من ميتا
                  </span>
                </div>
                <div className="text-[11px] text-[#072524] space-y-1.5 leading-relaxed bg-[#f0f5f3]/80 p-2.5 rounded-xl border border-[#013735]/5">
                  <p className="font-semibold text-[#013735]">
                    تم التحقق من المقاس والعنوان: سموحة، الإسكندرية.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>العميل أكّد الطلب للشحن الفوري</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-emerald-700 font-bold flex items-center justify-between">
                  <span>توليد بوليصة الشحن تلقائياً</span>
                  <span className="text-[#013735] font-bold">وفرت مصاريف المرتجع</span>
                </div>
              </>
            )}

            {activeTab === "inventory" && (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#013735]/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#013735]">
                      تنبيه ذكي لإعادة الطلب (Stock Alert)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                    باقي 2 قطع
                  </span>
                </div>
                <div className="text-[11px] text-[#072524] space-y-1.5 leading-relaxed bg-[#fef9ee] p-2.5 rounded-xl border border-amber-200/60">
                  <p className="font-semibold text-[#013735]">
                    فرع الإسكندرية - سموحة: فستان سواريه شيفون بيج
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-amber-900 font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>تم اقتراح أمر تحويل من مخزن التجمع الرئيسي</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-amber-800 font-bold flex items-center justify-between">
                  <span>منع نفاد المقاس الأكثر طلباً</span>
                  <span className="text-[#013735] font-bold">تحديث لحظي</span>
                </div>
              </>
            )}

            {activeTab === "shipping" && (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#013735]/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#013735]">
                      مركز بوسطة وأرامكس السحابي
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    ربط API نشط
                  </span>
                </div>
                <div className="text-[11px] text-[#072524] space-y-1.5 leading-relaxed bg-[#f0f5f3]/80 p-2.5 rounded-xl border border-[#013735]/5">
                  <p className="font-semibold text-[#013735]">
                    تم تسليم 128 شحنة اليوم بنجاح في القاهرة والجيزة.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نسبة تسليم قياسية: 95.8%</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-emerald-700 font-bold flex items-center justify-between">
                  <span>تتبع لحظي لموقع المندوب</span>
                  <span className="text-[#013735] font-bold">صفر تأخير</span>
                </div>
              </>
            )}

            {activeTab === "financials" && (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#013735]/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#013735]">
                      مطابقة كشوفات تحصيل COD
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    مطابقة 100%
                  </span>
                </div>
                <div className="text-[11px] text-[#072524] space-y-1.5 leading-relaxed bg-[#f0f5f3]/80 p-2.5 rounded-xl border border-[#013735]/5">
                  <p className="font-semibold text-[#013735]">
                    كشف حساب بوسطة الأخير: تم إيداع 214,000 ج.م في الخزينة.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تمت مطابقة 142 طلباً دون عجز مالي واحد</span>
                  </div>
                </div>
                <div className="mt-2 text-[10px] text-emerald-700 font-bold flex items-center justify-between">
                  <span>كشف أرباح صافي لحظي</span>
                  <span className="text-[#013735] font-bold">خزينة منضبطة</span>
                </div>
              </>
            )}
          </div>

          {/* Floating Satellite Card 2 (Bottom Right / Left in RTL): Dynamic Metric Badge */}
          <div className="ol-float-plate-br !bg-[#013735] !text-white !p-3.5 !border-2 !border-[#3fffba]/60 shadow-2xl">
            {activeTab === "orders" && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#3fffba] font-bold tracking-wider uppercase">
                    بوسطة BOSTA AWB
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#3fffba] animate-ping" />
                </div>
                <span className="text-xs font-mono font-bold text-white block">
                  #BST-EG-948210
                </span>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">التحصيل COD:</span>
                  <span className="text-[#3fffba] font-bold tabular-nums text-xs">
                    1,450 ج.م
                  </span>
                </div>
                <span className="mt-1 block text-[9px] text-zinc-300">
                  خط سير الإسكندرية · تم التسليم
                </span>
              </>
            )}

            {activeTab === "inventory" && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#3fffba] font-bold tracking-wider uppercase">
                    تزامن الفروع اللحظي
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#3fffba] animate-ping" />
                </div>
                <span className="text-xs font-bold text-white block">
                  3 فروع + المتجر الإلكتروني
                </span>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">تحديث الكاشير POS:</span>
                  <span className="text-[#3fffba] font-bold text-xs">
                    لحظي (0 ثانية)
                  </span>
                </div>
                <span className="mt-1 block text-[9px] text-zinc-300">
                  منع البيع المزدوج نهائياً
                </span>
              </>
            )}

            {activeTab === "shipping" && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#3fffba] font-bold tracking-wider uppercase">
                    طباعة البوالص المجمعة
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#3fffba] animate-ping" />
                </div>
                <span className="text-xs font-bold text-white block">
                  45 بوليصة بنقرة واحدة
                </span>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">وقت التجهيز:</span>
                  <span className="text-[#3fffba] font-bold text-xs">
                    -75% سرعة إنجاز
                  </span>
                </div>
                <span className="mt-1 block text-[9px] text-zinc-300">
                  باركود قياسي معتمد للمناديب
                </span>
              </>
            )}

            {activeTab === "financials" && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#3fffba] font-bold tracking-wider uppercase">
                    وفر عمولات المنصة
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#3fffba] animate-ping" />
                </div>
                <span className="text-xs font-bold text-[#3fffba] block">
                  0% عمولة على مبيعاتك
                </span>
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">الوفر الشهري:</span>
                  <span className="text-[#3fffba] font-bold tabular-nums text-xs">
                    18,400+ ج.م
                  </span>
                </div>
                <span className="mt-1 block text-[9px] text-zinc-300">
                  مقارنة بعمولات المنصات الأخرى
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
