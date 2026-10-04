import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Truck,
  Warehouse,
  ShoppingBag,
  CircleDollarSign,
  Users,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export interface SystemItem {
  id: string;
  number: string;
  title: string;
  category: string;
  badge: string;
  headline: string;
  problem: string;
  solution: string;
  metricValue: string;
  metricLabel: string;
  apps: string[];
  image: string;
  color: string;
  accentBorder: string;
  ctaText: string;
}

const SYSTEMS: SystemItem[] = [
  {
    id: "social-whatsapp",
    number: "01",
    title: "واتساب والسوشيال الذكي",
    category: "Conversational AI & Meta",
    badge: "مبيعات 24/7 بدون تأخير",
    headline: "الـ AI بيرد فوراً باللهجة المصرية ويسجل الأوردر في المخزن",
    problem: "الرسايل بتغرق في الـ DMs.. موظف الرد بيتأخر ساعة فالعميل بيشتري من المنافس أو بيسجل المقاس غلط في شيت إكسيل.",
    solution: "وكيل AI متصل بـ WhatsApp Cloud API، يفهم المقاسات والأسعار، يفحص المخزن لايف، ويصدر فاتورة الحجز فوراً.",
    metricValue: "فوري",
    metricLabel: "سرعة الرد وإغلاق الأوردر",
    apps: ["WhatsApp Cloud API", "Instagram Direct", "Facebook Messenger", "Bot Studio", "Broadcast Pro"],
    image: "/images/landing/whatsapp_system.jpg",
    color: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    ctaText: "شغّل ردود الواتساب الذكية",
  },
  {
    id: "shipping-fulfillment",
    number: "02",
    title: "الكول سنتر والشحن الفوري",
    category: "Logistics & Call Center",
    badge: "إنقاذ الأوردرات من الإلغاء",
    headline: "تأكيد فوري، حظر للمشاغبين، وإصدار بوالص الشحن بضغطة زر",
    problem: "مندوب الشحن بيرجع بنصف الشحنات لأن العميل كنسل أو ماردش، وأرقام وهمية بتكلفك مصاريف شحن رايح جاي.",
    solution: "كول سنتر ذكي يوزع المكالمات، كشف تلقائي لأرقام المرتجع المتكرر وحظرها، وإصدار لحظي لبوالص الشحن (بوسطة وغيرها).",
    metricValue: "أقل",
    metricLabel: "في الشحنات المرتجعة",
    apps: ["مركز التأكيد والمتابعة", "بوابة الشحن الذكي Turbo", "أتمتة الحالات", "حظر العملاء والمشاغبين", "الطلبات الجماعية"],
    image: "/images/landing/shipping_system.jpg",
    color: "text-red-400",
    accentBorder: "border-red-500/40",
    ctaText: "اضبط كول سنتر الشحن",
  },
  {
    id: "inventory-erp",
    number: "03",
    title: "المخازن وجرد الفروع (ERP)",
    category: "Multi-Warehouse & WMS",
    badge: "منع بيع العجز وفروقات الجرد",
    headline: "جرد لحظي متعدد المخازن، كشك باركود، وتنبيه نواقص قبل فوات الأوان",
    problem: "بتبيع نفس القطعة مرتين من المحل والواتساب، وفروقات جرد كل أسبوع بين الفروع والمخزن الرئيسي.",
    solution: "جرد موحد لحظي متعدد المخازن، كشك فحص باركود سريع، وتنبيه تلقائي قبل نفاد المقاس الأكثر طلباً مع أوامر شراء فورية.",
    metricValue: "متزامن",
    metricLabel: "دقة مطابقة المخزون عبر جميع الفروع",
    apps: ["إدارة المخازن المتعددة", "كشك الباركود Kiosk", "تنبيهات النواقص الذكية", "أوامر الشراء والموردين", "أذون التحويل بين الفروع"],
    image: "/images/landing/inventory_system.jpg",
    color: "text-amber-400",
    accentBorder: "border-amber-500/40",
    ctaText: "اربط مخازنك وفروعك",
  },
  {
    id: "pos-storefront",
    number: "04",
    title: "المتجر السريع ونقاط البيع (POS)",
    category: "Cloud POS & Commerce",
    badge: "كاشير فائق السرعة",
    headline: "نظام كاشير سحابي على أي تابلت ومتجر إلكتروني فائق السرعة",
    problem: "سيستم الكاشير بيهنج، وفصل تام بين مبيعات المحل الواقعي وحركة المتجر الإلكتروني.",
    solution: "نظام كاشير POS سحابي يعمل حتى لو النت فصل، يدعم تصفية الشيفتات والسحب والإيداع، ومتجر إلكتروني فائق السرعة.",
    metricValue: "بضغطة زر",
    metricLabel: "لإصدار الفاتورة وتصفية شيفت الكاشير",
    apps: ["نظام الكاشير السحابي POS", "إدارة شيفتات الكاشير", "محرك المتجر الإلكتروني Pro", "عروض الباقات والـ Upsell", "الباركود السريع"],
    image: "/images/landing/pos_store_system.jpg",
    color: "text-blue-400",
    accentBorder: "border-blue-500/40",
    ctaText: "جرّب كاشير الفروع والمتجر",
  },
  {
    id: "financial-pnl",
    number: "05",
    title: "المالية والأرباح الصافية (P&L)",
    category: "Financial Engine & ETA",
    badge: "كشف الكاش الحقيقي",
    headline: "صافي أرباحك الحقيقية بعد خصم إعلانات ميتا ومصاريف بوسطة",
    problem: "بتبيع بنصف مليون شهرياً وفاكر نفسك كسبان، وتتفاجئ آخر الشهر إن الكاش مش موجود بسبب تكلفة الإعلانات والشحن.",
    solution: "محرك مالي يحسب الـ Break-Even ومكسب كل منتج على حدة بعد خصم الـ ROAS ومصاريف الشحن، وفواتير إلكترونية معتمدة ETA.",
    metricValue: "واضح",
    metricLabel: "كشف حقيقي لصافي الربح قبل وبعد الإعلانات",
    apps: ["محرك الربحية ونقطة التعادل", "B-EV المنتج و ROAS", "القوائم المالية الشهرية", "الفواتير الإلكترونية ETA", "مصادر الطلبات والمحاسبة"],
    image: "/images/landing/pnl_finance_system.jpg",
    color: "text-emerald-400",
    accentBorder: "border-emerald-500/40",
    ctaText: "اعرف صافي أرباحك الآن",
  },
  {
    id: "hr-payroll",
    number: "06",
    title: "فريق العمل والموارد البشرية (HR)",
    category: "HR, Shifts & Payroll",
    badge: "انضباط الفريق والعمولات",
    headline: "حضور وانصراف، ورديات، وعمولات بيع أوتوماتيكية لكل موظف",
    problem: "خناقات كل آخر شهر مع فريق السيلز والكول سنتر على نسب البيع والعمولات، وغياب الموظفين بدون متابعة دقيقة لمواعيد الشيفتات.",
    solution: "نظام HR متكامل يتابع الحضور والانصراف، يحسب عمولة كل مسوق وموظف مبيعات بناءً على الأوردرات المسلّمة فعلياً، ويصدر مسير الرواتب تلقائياً.",
    metricValue: "بلا نزاعات",
    metricLabel: "في حسابات العمولات والخزنة",
    metricLabel: "شفافية مطلقة في حساب عمولات البيع",
    apps: ["نظام HR الأساسي", "الحضور والانصراف والورديات", "مسير الرواتب والعمولات", "إدارة العهد والأصول", "تقييم أداء فريق المبيعات"],
    image: "/images/landing/hr_team_system.jpg",
    color: "text-purple-400",
    accentBorder: "border-purple-500/40",
    ctaText: "نظم فريقك وعمولاتك",
  },
];

export const LandingSystemsShowcase: React.FC = () => {
  const [activeSystemId, setActiveSystemId] = useState<string>("social-whatsapp");
  const activeSystem = SYSTEMS.find((s) => s.id === activeSystemId) || SYSTEMS[0];

  return (
    <section id="systems" className="relative py-24 sm:py-32 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Open Section Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>الأنظمة الستة المتكاملة • The 6 Core Systems</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            منظومة 360 درجة...
            <br />
            <span className="text-zinc-400 font-normal">تغطي كل مرحلة في تجارتك.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            استعرض الأنظمة الستة الأساسية التي تحل المشاكل الأكثر تكلفة في التجارة المصرية — اختر أي نظام لمعاينة تفاصيله ولوحة تشغيله.
          </p>
        </div>

        {/* 6 Systems Navigation Strip — Horizontal Smooth Scroll on Mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/[0.06]">
          {SYSTEMS.map((system) => {
            const isActive = system.id === activeSystemId;
            return (
              <button
                key={system.id}
                onClick={() => setActiveSystemId(system.id)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-black shadow-lg shadow-white/10 scale-[1.02]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>{system.number}. {system.title}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed Single-Depth Stage for Active System */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Narrative Column (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeSystem.badge}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">{activeSystem.category}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {activeSystem.headline}
            </h3>

            {/* Problem & Solution Flow — Open Hairline Dividers (NO BOX IN BOX) */}
            <div className="space-y-4 pt-2">
              <div className="border-r-2 border-red-500/50 pr-4 py-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">
                  المشكلة عند أغلب التجار
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {activeSystem.problem}
                </p>
              </div>

              <div className="border-r-2 border-emerald-500/60 pr-4 py-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  حل Max P التلقائي
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {activeSystem.solution}
                </p>
              </div>
            </div>

            {/* Impact Metric & Apps */}
            <div className="pt-4 border-t border-white/[0.06] flex flex-wrap sm:flex-nowrap items-center gap-6">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
                  {activeSystem.metricValue}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {activeSystem.metricLabel}
                </div>
              </div>

              <div className="h-8 w-px bg-white/[0.1] hidden sm:block" />

              <div className="flex-1">
                <span className="block text-[11px] font-semibold text-zinc-400 mb-2">
                  التطبيقات المدمجة في هذا النظام:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeSystem.apps.map((app) => (
                    <span
                      key={app}
                      className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 font-medium"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <Link
                to="/auth/register"
                onClick={() =>
                  trackPlatformSiteLead({
                    cta_type: "system_showcase_start",
                    placement: `system_${activeSystem.id}`,
                  })
                }
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <span>{activeSystem.ctaText}</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Visual Artwork Column (6 cols) */}
          <div className="lg:col-span-6 relative">
            <div className="relative overflow-hidden rounded-2xl bg-[#09090b] shadow-2xl border border-white/[0.08] group">
              <img
                src={activeSystem.image}
                alt={activeSystem.title}
                className="w-full h-auto object-cover aspect-[16/9] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none"
                aria-hidden="true"
              />
              <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between pointer-events-none">
                <span className="text-xs font-mono font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  {activeSystem.title} • Active
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  MaxP Unified Engine
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingSystemsShowcase;
