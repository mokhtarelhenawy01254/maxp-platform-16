import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shirt,
  Tv,
  ShoppingBag,
  Activity,
  CheckCircle,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

interface IndustryProfile {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  painPoint: string;
  maxpFeature: string;
  bulletPoints: string[];
  metric: string;
  metricLabel: string;
}

const INDUSTRIES: IndustryProfile[] = [
  {
    id: "fashion",
    name: "الملابس والأحذية والفاشون",
    icon: Shirt,
    tagline: "إدارة المقاسات والألوان وسياسات المعاينة قبل الاستلام",
    painPoint: "ارتفاع نسبة المرتجعات بسبب المقاسات الخطأ، وتلف الأوردرات أثناء دورانها بين المحافظات.",
    maxpFeature: "مصفوفة مقاسات وألوان ذكية تفهم طلب العميل في الواتساب، وترسل بوالص شحن بوسطة مع ميزة المعاينة قبل الدفع لتقليل الإلغاء.",
    bulletPoints: [
      "مصفوفة المقاسات والألوان (Matrix Variant Grid)",
      "ربط رسمي مع شركة بوسطة وسياسة المعاينة",
      "أتمتة طلبات الاستبدال السريعة دون فقد العميل",
      "تزامن مخزون فروع المحلات مع متجر الواتساب",
    ],
    metric: "أقل",
    metricLabel: "في مرتجعات المقاسات غير المناسبة",
  },
  {
    id: "electronics",
    name: "الإلكترونيات والأجهزة المنزلية",
    icon: Tv,
    tagline: "تتبع أرقام السيريال، فترات الضمان، ومراكز الصيانة",
    painPoint: "صعوبة مطابقة السيريال نمبر عند الاسترجاع، وادعاءات العميل بوجود عيوب في قطع لم تُشترَ منك.",
    maxpFeature: "تسجيل إجباري للسيريال نمبر عند البيع من الكاشير أو الواتساب، وربطه بفاتورة العميل وفترة الضمان أوتوماتيكياً.",
    bulletPoints: [
      "تتبع دقيق للسيريال نمبر (Serial Tracking)",
      "شهادات ضمان إلكترونية ترسل في رسالة واتساب",
      "إدارة أوامر الصيانة وقطع الغيار",
      "فواتير ضريبية إلكترونية معتمدة للشركات",
    ],
    metric: "حماية",
    metricLabel: "من مطالبات الضمان الوهمية",
  },
  {
    id: "retail-fmcg",
    name: "التجزئة والسوبرماركت والكافيهات",
    icon: ShoppingBag,
    tagline: "كاشير نقاط بيع سحابي سريع وتصفية شيفتات فورية",
    painPoint: "طوابير العملاء عند الكاشير، عجز الدرج وفروقات الجرد بين الكاشير والمخزن.",
    maxpFeature: "نظام كاشير POS خفيف ينهي الفاتورة في 3 ثوانٍ، يدعم موازين الباركود، تصفية الشيفتات، وحساب العهد والمسحوبات.",
    bulletPoints: [
      "كاشير سحابي سريع يعمل بدون توقف",
      "دعم طابعات الباركود والإيصالات الحرارية",
      "تصفية ورديات الكاشير وتقرير العهدة",
      "تنبيهات تاريخ الصلاحية للمنتجات الغذائية",
    ],
    metric: "فورية",
    metricLabel: "إصدار الفاتورة عند الكاشير",
  },
  {
    id: "specialized-medical",
    name: "المعامل والعيادات والمراكز التخصصية",
    icon: Activity,
    tagline: "إدارة دورات العمل والإنتاج المتخصصة (Dental & Medical)",
    painPoint: "فقدان الحالات بين الفنيين والمعامل، وعدم دقة حساب تكلفة الخامات المستهلكة في كل حالة.",
    maxpFeature: "أنظمة مخصصة لمعامل الأسنان والعيادات تتابع كود الحالة، الفني المسؤول، الخامات، ومراحل التصنيع حتى التسليم.",
    bulletPoints: [
      "منظومة تتبع الحالات التخصصية (Work-in-Progress)",
      "شاشات الفنيين وكشك الباركود الداخلي",
      "حساب تكلفة الخامات وأرباح كل حالة",
      "تنبيهات المواعيد وتوصيل الحالات للعيادات",
    ],
    metric: "بلا",
    metricLabel: "حالات متأخرة أو مفقودة بين الأقسام",
  },
];

export const LandingIndustryProfiles: React.FC = () => {
  const [selectedIndustryId, setSelectedIndustryId] = useState("fashion");
  const activeIndustry = INDUSTRIES.find((i) => i.id === selectedIndustryId) || INDUSTRIES[0];
  const IconComponent = activeIndustry.icon;

  return (
    <section id="industries" className="relative py-24 sm:py-32 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Open Section Header */}
        <div className="max-w-3xl mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            <span>حلول مفصلة حسب نشاطك • Industry Workflows</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            نظام يتكيف مع تجارتك...
            <br />
            <span className="text-zinc-400 font-normal">مهما كانت خصوصية مجالك.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            كل مجال تجاري له دورة عمل مختلفة ومشاكل خاصة؛ MaxP مصمم بموديولات تخصصية تلبي احتياجاتك الدقيقة.
          </p>
        </div>

        {/* Industry Switcher Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/[0.06]">
          {INDUSTRIES.map((ind) => {
            const isSelected = ind.id === selectedIndustryId;
            const IndIcon = ind.icon;
            return (
              <button
                key={ind.id}
                onClick={() => setSelectedIndustryId(ind.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-white text-black shadow-lg shadow-white/10 scale-[1.02]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <IndIcon className="w-4 h-4" />
                <span>{ind.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active Industry Showcase Stage */}
        <div className="p-6 sm:p-10 rounded-2xl bg-[#09090b] border border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeIndustry.name}
                </h3>
                <span className="text-xs text-zinc-400 font-medium">
                  {activeIndustry.tagline}
                </span>
              </div>
            </div>

            {/* Pain vs MaxP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border-r-2 border-red-500/50 pr-4 py-1">
                <span className="font-bold text-red-400 block text-xs mb-1">المعاناة الحالية</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{activeIndustry.painPoint}</p>
              </div>
              <div className="border-r-2 border-emerald-500/60 pr-4 py-1">
                <span className="font-bold text-emerald-400 block text-xs mb-1">حل MaxP المخصص</span>
                <p className="text-xs text-zinc-300 leading-relaxed">{activeIndustry.maxpFeature}</p>
              </div>
            </div>

            {/* Bullet Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {activeIndustry.bulletPoints.map((pt) => (
                <div key={pt} className="flex items-center gap-2 text-xs text-zinc-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-center justify-center p-6 rounded-xl bg-zinc-950 border border-white/[0.06] text-center">
            <span className="text-xs text-zinc-400 block mb-1">الأثر المباشر في هذا القطاع</span>
            <span className="text-4xl sm:text-5xl font-black font-mono text-white mb-2">
              {activeIndustry.metric}
            </span>
            <span className="text-xs text-emerald-400 font-medium mb-6">
              {activeIndustry.metricLabel}
            </span>

            <Link
              to="/auth/register"
              onClick={() =>
                trackPlatformSiteLead({
                  cta_type: "industry_profile_start",
                  placement: `industry_${activeIndustry.id}`,
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <span>جرّب النظام لنشاط {activeIndustry.name.split(" ")[0]}</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingIndustryProfiles;
