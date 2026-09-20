import React from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';

interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
  stat?: string;
  statLabel?: string;
  badge?: string;
}

interface AutomotiveBentoProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: FeatureItem[];
    [key: string]: unknown;
  };
}

const DEFAULT_ITEMS: FeatureItem[] = [
  {
    badge: 'حماية كورية معتمدة',
    stat: '98%',
    statLabel: 'عزل حراري وأشعة UV',
    title: 'قماش نانو كوري معالج حرارياً',
    description:
      'نسيج نسيجي ميكروي معالج بتقنية النانو يحجب 98% من الأشعة فوق البنفسجية UV400 ويخفض حرارة الصالون فوراً حتى 34°C لحماية التابلوه والجلد من التشققات.',
  },
  {
    badge: 'صلب زنبركي مجلفن',
    stat: '360°',
    statLabel: 'مرونة ومقاومة للكسر',
    title: 'شاسيه حديد مرن غير قابل للكسر',
    description:
      'شاسيه معدني معالج ضد الصدأ ومغلف بطبقة بوليمر واقية، ينثني ويعود لشكله الفابريقة الأصلي بالمللي لموديل سيارتك.',
  },
  {
    badge: 'تثبيت فابريقة بدون أدوات',
    stat: '3s',
    statLabel: 'سرعة التركيب كبس',
    title: 'تركيب كبس بدون مسامير أو لزق',
    description:
      'يركب بالضغط داخل مجرى حلق الباب الفابريقة في ثوانٍ معدودة؛ بدون شريط لاصق يترك أثراً وبدون أي مسامير تؤثر على ضمان السيارة.',
  },
  {
    badge: 'حركة ميكانيكية حرة',
    stat: '100%',
    statLabel: 'حركة كاملة للزجاج',
    title: 'الزجاج ينزل ويطلع بحرية تامة',
    description:
      'الستارة تثبت على جسم الباب الداخلي وليس على الزجاج، مما يتيح فتح الزجاج كاملاً لدفع الكارتات أو التهوية مع حجز الأتربة والحشرات.',
  },
  {
    badge: 'بصريات أحادية الاتجاه',
    stat: 'VIP',
    statLabel: 'خصوصية وأمان',
    title: 'رؤية واضحة للمرايات مع عزل المتطفلين',
    description:
      'رؤية بانورامية واضحة للسائق والمرايات الجانبية من الداخل نهاراً وليلاً، مع حجب تام للرؤية من الخارج للحفاظ على خصوصية عائلتك.',
  },
];

const AutomotiveBento: React.FC<AutomotiveBentoProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();

  const badge = settings?.badge || 'المواصفات الفنية والهندسية المعتمدة';
  const title = settings?.title || 'هندسة فائقة مصممة لتحمل حرارة الصيف القاسية';
  const subtitle =
    settings?.subtitle ||
    'كل ستارة تم تصميمها وثني شاسيهها طبقاً لمقاييس الفابريقة الدقيقة لحماية صالون سيارتك وراحة عائلتك.';

  const configuredItems = Array.isArray(settings?.items) && settings.items.length > 0
    ? settings.items
    : DEFAULT_ITEMS;

  const heroItem = configuredItems[0] || DEFAULT_ITEMS[0];
  const secondaryItems = configuredItems.slice(1, 5);

  return (
    <section
      className="relative overflow-hidden bg-[#09090b] py-14 md:py-20 text-white"
      dir={theme.direction}
      data-section="automotive-bento"
      data-variant={section?.variant || 'automotive-bento'}
    >
      {/* Background Machined Tech Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:3.5rem_3.5rem]"
        aria-hidden="true"
      />
      {/* Subtle Radial Glow */}
      <div
        className="pointer-events-none absolute -top-40 start-1/2 -translate-x-1/2 h-96 w-[45rem] rounded-full bg-primary/10 blur-[120px]"
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        {/* Header Section */}
        <div className="mx-auto max-w-2xl text-center space-y-3.5 mb-10 md:mb-14">
          {badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>{badge}</span>
            </span>
          )}

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black tracking-tight text-white text-balance">
            {title}
          </h2>

          <p className="text-sm md:text-base text-zinc-400 text-pretty max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Asymmetrical Bento Grid (8:4 layout) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
          {/* Main Hero Card (Spans 12 on mobile, 7 or 8 on desktop) */}
          <div className="md:col-span-12 lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/70 p-6 sm:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:border-white/20">
            <div>
              <div className="flex items-center justify-between gap-3 mb-6">
                <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {heroItem.badge || 'المعيار الهندسي الأول'}
                </span>
                <span className="text-xs text-zinc-500 font-mono">SPEC-01 / THERMAL</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-4">
                <span className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl tracking-tighter text-white tabular-nums">
                  {heroItem.stat || '98%'}
                </span>
                <span className="text-sm sm:text-base font-bold text-zinc-300">
                  {heroItem.statLabel || 'عزل حراري معتمد وأشعة UV'}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-2.5">
                {heroItem.title}
              </h3>

              <p className="text-sm text-zinc-400 leading-relaxed text-pretty">
                {heroItem.description}
              </p>
            </div>

            {/* Thermal Telemetry Comparison Strip */}
            <div className="mt-8 rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span>قياس درجات الحرارة الحقيقية للصالون</span>
                <span className="text-emerald-400 font-mono">فارق تبريد 34°C</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-950/90 p-3 border border-red-500/20">
                  <div className="text-[11px] text-zinc-500 mb-1">بدون ستارة (شمس مباشرة)</div>
                  <div className="text-xl font-black text-red-400 tabular-nums">58°C</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">تلف التابلوه وضعف التكييف</div>
                </div>

                <div className="rounded-lg bg-zinc-950/90 p-3 border border-emerald-500/20">
                  <div className="text-[11px] text-zinc-500 mb-1">مع ستارة Red Line</div>
                  <div className="text-xl font-black text-emerald-400 tabular-nums">24°C</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">برودة تامة وحماية المقاعد</div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stacked Cards (Spans 12 on mobile, 5 on desktop) */}
          <div className="md:col-span-12 lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5">
            {secondaryItems.slice(0, 2).map((item, idx) => (
              <div
                key={item.title}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:border-white/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                      {item.badge}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">SPEC-0{idx + 2}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums">
                      {item.stat}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      {item.statLabel}
                    </span>
                  </div>

                  <h3 className="text-base font-heading font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-zinc-400 leading-relaxed text-pretty">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Row Cards (2 Equal Cards) */}
          {secondaryItems.slice(2, 4).map((item, idx) => (
            <div
              key={item.title}
              className="md:col-span-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:border-white/20"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300">
                  {item.badge}
                </span>
                <span className="text-xs text-zinc-500 font-mono">SPEC-0{idx + 4}</span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-heading font-black text-3xl sm:text-4xl text-white tabular-nums">
                  {item.stat}
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  {item.statLabel}
                </span>
              </div>

              <h3 className="text-base font-heading font-bold text-white mb-2">
                {item.title}
              </h3>

              <p className="text-xs text-zinc-400 leading-relaxed text-pretty">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AutomotiveBento;
