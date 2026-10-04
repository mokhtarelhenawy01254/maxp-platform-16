import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare,
  Truck,
  Warehouse,
  ShoppingBag,
  TrendingUp,
  Users,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

export interface SystemStory {
  id: string;
  title: string;
  badge: string;
  headline: string;
  problem: string;
  solution: string;
  metricValue: string;
  metricLabel: string;
  apps: string[];
  image: string;
  ctaText: string;
}

export const SYSTEM_STORIES: SystemStory[] = [
  {
    id: "social-whatsapp",
    title: "واتساب والسوشيال الذكي",
    badge: "مبيعات 24/7 بدون تأخير",
    headline: "الـ AI بيرد فوراً باللهجة المصرية ويسجل الأوردر في المخزن",
    problem: "بتصرف آلاف على الإعلانات، والرسايل بتغرق في الـ DMs.. موظف الرد بيتأخر ساعة فالعميل بيشتري من المنافس، أو بيسجل المقاس غلط في شيت إكسيل.",
    solution: "وكيل ذكاء اصطناعي رسمي متصل بـ WhatsApp Cloud API وانستجرام وفيسبوك، يفهم المقاسات والأسعار، يفحص المخزن لايف، ويصدر فاتورة الحجز فوراً.",
    metricValue: "فوري",
    metricLabel: "سرعة الرد وإغلاق الأوردر",
    apps: ["WhatsApp Business API", "Instagram for Business", "Facebook Pages Connect", "Bot Automation", "Broadcast Pro"],
    image: "/images/landing/whatsapp_system.webp",
    ctaText: "شغّل ردود الواتساب الذكية",
  },
  {
    id: "shipping-fulfillment",
    title: "الكول سنتر والشحن الفوري",
    badge: "إنقاذ الأوردرات من الإلغاء",
    headline: "تأكيد فوري، حظر للمشاغبين، وإصدار بوالص الشحن بضغطة زر",
    problem: "مندوب الشحن بيرجع بنصف الشحنات لأن العميل كنسل أو ماردش، وأرقام تليفونات وهمية ومكررة بتكلفك مصاريف شحن رايح جاي.",
    solution: "كول سنتر ذكي يوزع مكالمات التأكيد، كشف تلقائي لأرقام 'المرتجع المتكرر' وحظرها، وإصدار لحظي لبوالص الشحن لشركات (بوسطة وغيرها) وتتبعها أوتوماتيك.",
    metricValue: "أقل",
    metricLabel: "في الشحنات المرتجعة",
    apps: ["مركز التأكيد والمتابعة", "بوابة الشحن الذكي (Turbo)", "أتمتة الحالات", "حظر العملاء والمشاغبين", "الطلبات الجماعية"],
    image: "/images/landing/shipping_system.webp",
    ctaText: "اضبط كول سنتر الشحن",
  },
  {
    id: "inventory-erp",
    title: "المخازن وجرد الفروع (ERP)",
    badge: "بلا عجز في البضاعة",
    headline: "جرد موحد لحظي يربط محلاتك ومستودعاتك والمتجر بباركود واحد",
    problem: "بتبيع قطعة كوتشي في المحل، وفي نفس اللحظة عميل يطلبها أونلاين وتكتشف إنها خلصت.. أو عجز مستمر في الجرد آخر الشهر وضياع بضاعة بمئات الآلاف.",
    solution: "نظام ERP ومخازن سحابي فوري؛ أي قطعة تتباع في أي فرع تخصم لحظياً من المتجر، مع تنبيهات ذكية قبل نفاد المقاسات وإدارة سهلة لأوامر الشراء من الموردين.",
    metricValue: "متزامن",
    metricLabel: "الجرد الفعلي مع النظام",
    apps: ["المخزون والمستودعات الشامل", "المخزون المتعدد والفروع", "المشتريات وإدارة الموردين", "البيع بالجملة", "باركود كشك التجهيز"],
    image: "/images/landing/inventory_system.webp",
    ctaText: "اربط مخازنك وفروعك الآن",
  },
  {
    id: "pos-store",
    title: "المتجر السريع ونقاط البيع (POS)",
    badge: "أسرع كاشير ومتجر إلكتروني",
    headline: "بيع في المحل وأونلاين في نفس اللحظة بدون عمولات بالدولار",
    problem: "منصات المتاجر الأجنبية بتاخد عمولات بالدولار وبطيئة، وكاشير المحل شغال على برنامج قديم منفصل مش حاسس بمبيعات الأونلاين.",
    solution: "متجر إلكتروني محلي فائق السرعة مهيأ لمعدل تحويل عالي، مع كاشير POS للمحلات يطبع الفواتير ويسجل نقاط ولاء العملاء في حساب موحد.",
    metricValue: "أعلى",
    metricLabel: "في معدل إتمام الشراء (Conversion)",
    apps: ["متجر ماكس السريع", "نظام كاشير POS للمحلات", "عروض الكميات والـ Upsell", "تقييمات العملاء", "تكامل WooCommerce"],
    image: "/images/landing/pos_store_system.webp",
    ctaText: "أطلق متجرك ونقطة البيع",
  },
  {
    id: "finance-pnl",
    title: "المالية والأرباح الصافية (P&L)",
    badge: "مكسبك بالقرش الحقيقي",
    headline: "حساب صافي أرباحك الحقيقية بعد خصم الإعلانات والشحن والمرتجع",
    problem: "بتبيع بنصف مليون جنيه شهرياً وفاكر نفسك كسبان، وتتفاجئ آخر الشهر إن الكاش مش موجود بسبب تكلفة الإعلانات والشحن والمرتجع المجهول.",
    solution: "محرك مالي دقيق يحسب الـ Break-Even ومكسب كل منتج على حدة بعد خصم الـ ROAS ومصاريف الشحن، وفواتير إلكترونية معتمدة وتقارير أرباح وخسائر بنقرة واحدة.",
    metricValue: "واضح",
    metricLabel: "كشف صافي الربح قبل وبعد الإعلانات",
    apps: ["محرك الربحية ونقطة التعادل", "B-EV المنتج و ROAS", "القوائم المالية الشهرية", "الفواتير الإلكترونية", "مصادر الطلبات والمحاسبة"],
    image: "/images/landing/pnl_finance_system.webp",
    ctaText: "اعرف صافي أرباحك الآن",
  },
  {
    id: "hr-payroll",
    title: "فريق العمل والموارد البشرية (HR)",
    badge: "انضباط الفريق والعمولات",
    headline: "حضور وانصراف، ورديات، وعمولات بيع أوتوماتيكية لكل موظف",
    problem: "خناقات كل آخر شهر مع فريق السيلز والكول سنتر على نسب البيع والعمولات، وغياب الموظفين بدون متابعة دقيقة لمواعيد الشيفتات.",
    solution: "نظام HR متكامل يتابع الحضور والانصراف، يحسب عمولة كل مسوق وموظف مبيعات بناءً على الأوردرات المسلّمة فعلياً، ويصدر مسير الرواتب تلقائياً.",
    metricValue: "0 نزاعات",
    metricLabel: "شفافية مطلقة في حساب عمولات البيع",
    apps: ["نظام HR الأساسي", "الحضور والانصراف والورديات", "مسير الرواتب والعمولات", "إدارة العهد والأصول", "تقييم أداء فريق المبيعات"],
    image: "/images/landing/hr_team_system.webp",
    ctaText: "نظم فريقك وعمولاتك",
  },
];

export const LandingSystemStorySlider: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStory = SYSTEM_STORIES[activeIndex];

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SYSTEM_STORIES.length);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + SYSTEM_STORIES.length) % SYSTEM_STORIES.length);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleNext();
      if (e.key === "ArrowRight") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <section id="systems-slider" className="relative py-24 sm:py-32 overflow-hidden border-t border-white/[0.06]">
      {/* Background Soft Ambient Light */}
      <div
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-red-600/[0.04] blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Open Header — No Box */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>منظومة تشغيل متكاملة • 6 أنظمة في مكان واحد</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.2]">
            كل دورة بيع في نشاطك التجاري...
            <br />
            <span className="text-zinc-400 font-normal">ليها نظام متخصص ينهيها في ثوانٍ.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            استعرض كيف يحل كل نظام أزمة حقيقية تواجه تجار مصر يومياً — اختر النظام لترى القصة والتطبيقات والأثر الفعلي.
          </p>
        </div>

        {/* Minimal Open Nav Tabs (No boxed border) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/[0.06]">
          {SYSTEM_STORIES.map((story, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={story.id}
                onClick={() => setActiveIndex(idx)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white text-black shadow-lg shadow-white/10 scale-[1.02]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {story.title}
              </button>
            );
          })}
        </div>

        {/* The Open Stage — Single Depth Layout (NO BOX IN BOX) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Narrative Column (6 cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeStory.badge}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {activeStory.headline}
            </h3>

            {/* Problem & Solution Flow — Open Hairline Dividers */}
            <div className="space-y-4 pt-2">
              <div className="border-r-2 border-red-500/40 pr-3.5 py-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-red-400/90 mb-1">
                  المشكلة عند أغلب التجار
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {activeStory.problem}
                </p>
              </div>

              <div className="border-r-2 border-emerald-500/60 pr-3.5 py-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 mb-1">
                  حل Max P التلقائي
                </span>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {activeStory.solution}
                </p>
              </div>
            </div>

            {/* Impact Metric & Integrated Apps */}
            <div className="pt-4 border-t border-white/[0.06] flex flex-wrap sm:flex-nowrap items-center gap-6">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {activeStory.metricValue}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {activeStory.metricLabel}
                </div>
              </div>

              <div className="h-8 w-px bg-white/[0.1] hidden sm:block" />

              <div className="flex-1">
                <span className="block text-[11px] font-semibold text-zinc-400 mb-2">
                  التطبيقات المدمجة في هذا النظام:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeStory.apps.map((app) => (
                    <span
                      key={app}
                      className="text-[10px] font-medium text-zinc-300 bg-white/[0.05] hover:bg-white/[0.08] px-2.5 py-1 rounded-md transition-colors"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA & Slide Controls */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <Link
                to="/register"
                onClick={() =>
                  trackPlatformSiteLead({
                    cta_type: "system_story_start",
                    placement: `system_slider_${activeStory.id}`,
                  })
                }
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-transform active:scale-[0.98]"
              >
                <span>{activeStory.ctaText}</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              {/* Next/Prev Navigation Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  aria-label="النظام السابق"
                  className="w-10 h-10 rounded-full border border-white/[0.12] hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  aria-label="النظام التالي"
                  className="w-10 h-10 rounded-full border border-white/[0.12] hover:border-white/30 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Visual Artwork Column (6 cols) — Open Display, No Nested Frame */}
          <div className="lg:col-span-6 relative">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950/80 shadow-2xl border border-white/[0.08] group">
              <img
                src={activeStory.image}
                alt={activeStory.title}
                className="w-full h-auto object-cover aspect-[16/9] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />
              {/* Subtle Atmospheric Gradient Overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
                aria-hidden="true"
              />
              {/* Live Status Chip on Top of Artwork */}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-white flex items-center gap-1.5 border border-white/[0.1]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>نظام نشط في باقتك</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingSystemStorySlider;
