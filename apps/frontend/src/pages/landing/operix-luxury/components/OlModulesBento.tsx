import React from "react";
import { CheckCircle2, Package, ShoppingCart, MessageSquare, Users, Truck, Layers } from "lucide-react";

interface ModuleCard {
  title: string;
  icon: React.ReactNode;
  description: string;
  badge: string;
  imageSrc: string;
  floatingChip: {
    title: string;
    subtitle: string;
    statusColor: string;
  };
}

const MODULES: ModuleCard[] = [
  {
    title: "إدارة وتأكيد الطلبات",
    badge: "دورة الطلب الكاملة",
    icon: <ShoppingCart className="w-5 h-5 text-[#3fffba]" />,
    description:
      "تأكيد آلي عبر واتساب، تتبع حالات الطلبات، وإدارة المدفوعات من واجهة موحدة.",
    imageSrc: "/operix-assets/maxp-screens/maxp-orders.webp",
    floatingChip: {
      title: "تأكيد آلي عبر واتساب",
      subtitle: "سموحة، الإسكندرية · تم التحقق من المقاس",
      statusColor: "bg-emerald-500",
    },
  },
  {
    title: "إدارة المخزون والمستودعات",
    badge: "مزامنة لحظية",
    icon: <Package className="w-5 h-5 text-[#3fffba]" />,
    description:
      "مزامنة فورية بين فروع المحلات والمستودع والمتجر مع تنبيهات عند قرب النفاد.",
    imageSrc: "/operix-assets/maxp-screens/maxp-inventory.webp",
    floatingChip: {
      title: "تنبيه انخفاض مخزون",
      subtitle: "المخزن الرئيسي: باقي قطعتين فقط",
      statusColor: "bg-amber-500",
    },
  },
  {
    title: "التذاكر والمرتجعات وخدمة العملاء",
    badge: "خدمة ما بعد البيع",
    icon: <MessageSquare className="w-5 h-5 text-[#3fffba]" />,
    description:
      "صندوق محادثات موحد لواتساب وفيسبوك وإنستجرام مع سجل كامل لطلبات واستفسارات كل عميل.",
    imageSrc: "/operix-assets/maxp-screens/maxp-inbox.webp",
    floatingChip: {
      title: "محادثات موحدة نشطة",
      subtitle: "واتساب وفيسبوك وإنستجرام بسجل واحد",
      statusColor: "bg-blue-500",
    },
  },
  {
    title: "التحليلات المالية والـ CRM",
    badge: "أرباحك الصافية",
    icon: <Users className="w-5 h-5 text-[#3fffba]" />,
    description:
      "لوحة قيادة تنفيذية لمتابعة الإيرادات اليومية، متوسط سلة الشراء، وتحليلات ولاء العملاء.",
    imageSrc: "/operix-assets/maxp-screens/maxp-dashboard.webp",
    floatingChip: {
      title: "مبيعات الأسبوع الصافية",
      subtitle: "+348,500 ج.م · نسبة تسليم 95.7%",
      statusColor: "bg-emerald-500",
    },
  },
  {
    title: "الشحن واللوجستيات",
    badge: "ربط معتمد بوسطة وأرامكس",
    icon: <Truck className="w-5 h-5 text-[#3fffba]" />,
    description:
      "إصدار بوالص الشحن بنقرة واحدة، طباعة الباركود، ومتابعة المناديب لحظياً.",
    imageSrc: "/operix-assets/maxp-screens/maxp-shipping.webp",
    floatingChip: {
      title: "بوليصة بوسطة AWB",
      subtitle: "#BST-EG-99214 · جاهز للشحن والتسليم",
      statusColor: "bg-[#3fffba]",
    },
  },
  {
    title: "نقاط البيع ومطابقة COD",
    badge: "كاشير الفروع",
    icon: <Layers className="w-5 h-5 text-[#3fffba]" />,
    description:
      "مزامنة كاشير الفروع مع المتجر، ومطابقة تحصيلات الدفع عند الاستلام مع الخزينة.",
    imageSrc: "/operix-assets/maxp-screens/maxp-pos.webp",
    floatingChip: {
      title: "كاشير الفروع POS",
      subtitle: "تم الدفع نقداً: 2,450 ج.م · مزامنة لحظية",
      statusColor: "bg-emerald-500",
    },
  },
];

export const OlModulesBento: React.FC = () => {
  return (
    <section id="modules" className="py-24 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#013735]/6 border border-[#013735]/10 text-xs font-semibold text-[#013735] mb-4">
            <span>وحدات النظام</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-[#013735] tracking-tight leading-tight">
            وحدات نظام MaxP
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4e6362] leading-relaxed font-normal">
            نظام تشغيل متكامل مبني ليربط ويؤتمت كل جزء من عمليات تجارتك — من الطلب إلى التسليم وما بعده.
          </p>
        </div>

        {/* Modules 3-column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODULES.map((mod, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl bg-white border border-[#013735]/8 shadow-[0_4px_20px_rgba(1,55,53,0.04)] hover:shadow-[0_12px_30px_rgba(1,55,53,0.08)] hover:border-[#013735]/20 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#013735] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    {mod.icon}
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#f0f5f3] text-[#013735] font-bold border border-[#013735]/8">
                    {mod.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#013735] mb-3">
                  {mod.title}
                </h3>

                <p className="text-sm text-[#4e6362] leading-relaxed font-normal">
                  {mod.description}
                </p>
              </div>

              {/* Module Layered 3D Stage (Anti-Flat Software Canvas) */}
              <div className="ol-bento-stage">
                {/* Window Dots Header */}
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1 border-b border-[#013735]/6">
                  <span className="w-2 h-2 rounded-full bg-rose-400/80" />
                  <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                </div>

                {/* Base Screenshot Layer */}
                <img
                  src={mod.imageSrc}
                  alt={mod.title}
                  className="ol-bento-base-img"
                  loading="lazy"
                  decoding="async"
                />

                {/* Foreground Floating Layered Chip */}
                <div className="ol-bento-floating-chip">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${mod.floatingChip.statusColor} animate-pulse`}
                    />
                    <span className="text-xs font-bold text-[#013735]">
                      {mod.floatingChip.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#4e6362] block mt-0.5 font-medium">
                    {mod.floatingChip.subtitle}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
