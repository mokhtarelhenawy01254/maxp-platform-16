import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

interface ShoppingIntentItem {
  eyebrow?: string;
  title: string;
  subtitle: string;
  link: string;
  tone?: string;
  chip?: string;
}

interface ShoppingIntentsProps {
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: unknown;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

const DEFAULT_ITEMS: ShoppingIntentItem[] = [
  {
    eyebrow: 'وصل جديد',
    title: 'وصل حديثًا',
    subtitle: 'منتجات جديدة تحتاج مسار وصول أسرع داخل المتجر.',
    link: '/shop?sort=newest',
    tone: 'primary',
    chip: 'جديد',
  },
  {
    eyebrow: 'رادار العروض',
    title: 'عروض اليوم',
    subtitle: 'تخفيضات واضحة للعملاء الحساسين للسعر والقرارات السريعة.',
    link: '/sale',
    tone: 'accent',
    chip: 'خصم',
  },
  {
    eyebrow: 'للعائلة',
    title: 'احتياجات البيت',
    subtitle: 'تنقل أسرع داخل المنتجات العملية واليومية بدل البحث الطويل.',
    link: '/collections',
    tone: 'emerald',
    chip: 'الأكثر طلبًا',
  },
  {
    eyebrow: 'هدايا جاهزة',
    title: 'هدايا جاهزة',
    subtitle: 'اختيارات سهلة وموسمية يمكن الوصول لها في أقل عدد من الخطوات.',
    link: '/shop?sort=popular',
    tone: 'slate',
    chip: 'سريع',
  },
];

const DISTRICT_MARKET_SERVICE_POINTS = [
  {
    label: 'الشحن',
    value: '24-48 ساعة لمعظم الطلبات',
  },
  {
    label: 'الاستبدال',
    value: 'حتى 14 يومًا بخطوات واضحة',
  },
  {
    label: 'الدفع',
    value: 'بطاقات + دفع عند الاستلام',
  },
] as const;

const TONE_CLASS_MAP: Record<string, string> = {
  primary:
    'border-primary/12 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),hsl(var(--background))_55%,hsl(var(--secondary)/0.85))] text-foreground shadow-[0_26px_80px_-56px_hsl(var(--primary)/0.5)]',
  accent:
    'border-amber-200 bg-[linear-gradient(135deg,rgba(255,201,107,0.28),rgba(255,255,255,1)_48%,rgba(255,241,220,0.88))] text-foreground shadow-[0_24px_70px_-56px_rgba(217,119,6,0.45)]',
  emerald:
    'border-emerald-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(255,255,255,1)_50%,rgba(236,253,245,0.92))] text-foreground shadow-[0_24px_70px_-56px_rgba(5,150,105,0.42)]',
  slate:
    'border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(255,255,255,1)_50%,rgba(241,245,249,0.92))] text-foreground shadow-[0_24px_70px_-56px_rgba(15,23,42,0.35)]',
};

const isIntentItem = (value: unknown): value is ShoppingIntentItem =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof (value as ShoppingIntentItem).title === 'string' &&
  typeof (value as ShoppingIntentItem).subtitle === 'string' &&
  typeof (value as ShoppingIntentItem).link === 'string';

const parseIntentItems = (value: unknown): ShoppingIntentItem[] => {
  if (Array.isArray(value)) {
    const parsed = value.filter(isIntentItem).map((item) => ({
      eyebrow: item.eyebrow?.trim(),
      title: item.title.trim(),
      subtitle: item.subtitle.trim(),
      link: item.link.trim(),
      tone: item.tone?.trim(),
      chip: item.chip?.trim(),
    }));
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = value
      .split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
      .map(([eyebrow, title, subtitle, link, tone, chip]) => ({
        eyebrow: eyebrow || undefined,
        title: title || '',
        subtitle: subtitle || '',
        link: link || '/shop',
        tone: tone || undefined,
        chip: chip || undefined,
      }))
      .filter((item) => item.title && item.subtitle && item.link);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return DEFAULT_ITEMS;
};

const normalizeIntentText = (value: string): string =>
  value.trim().toLowerCase();

const resolveIntentExamples = (
  item: ShoppingIntentItem,
  index: number,
): string[] => {
  const content = normalizeIntentText(
    `${item.eyebrow || ''} ${item.title} ${item.subtitle}`,
  );

  if (
    content.includes('سنيكر') ||
    content.includes('sneaker') ||
    content.includes('رياضي')
  ) {
    return ['راحة يومية', 'نعل مرن', 'مشاوير طويلة'];
  }

  if (content.includes('كعب') || content.includes('سهرة') || content.includes('مساء')) {
    return ['ارتفاع موضح', 'ثبات أفضل', 'مناسبات'];
  }

  if (content.includes('صندل') || content.includes('صيف')) {
    return ['لبس سريع', 'خفة أعلى', 'خروج نهاري'];
  }

  if (
    content.includes('لوفر') ||
    content.includes('فلات') ||
    content.includes('عمل')
  ) {
    return ['راحة طوال اليوم', 'ستايل مرتب', 'لبس عملي'];
  }

  if (content.includes('بوت')) {
    return ['خامة أوضح', 'ثبات أعلى', 'موسمي'];
  }

  if (content.includes('هدية') || content.includes('هدايا')) {
    return ['تغليف جاهز', 'بطاقة معايدة', 'من 39 ج.م'];
  }

  if (
    content.includes('عرض') ||
    content.includes('خصم') ||
    content.includes('وفر') ||
    content.includes('اليوم')
  ) {
    return ['أقل من 299 ج.م', 'خصومات متجددة', 'عدد محدود'];
  }

  if (
    content.includes('بيت') ||
    content.includes('تنظيم') ||
    content.includes('عائلة')
  ) {
    return ['سلال تخزين', 'منظمات مكتب', 'حلول للبيت'];
  }

  if (
    content.includes('يومي') ||
    content.includes('أساسيات') ||
    content.includes('سريع')
  ) {
    return ['علب تخزين', 'منظمات أدراج', 'شحن سريع'];
  }

  return index === 0
    ? ['الأكثر طلبًا', 'من 79 ج.م', 'شحن خلال 48 ساعة']
    : ['منتجات عملية', 'قرار أسرع', 'طلب مباشر'];
};

const resolveDistrictMarketIntentCellClass = (
  index: number,
  total: number,
): string => {
  const classes = [
    'group relative flex h-full flex-col gap-5 px-5 py-5 transition-colors duration-300 hover:bg-secondary/42 sm:px-6 sm:py-6',
  ];

  if (index < total - 1) {
    classes.push('border-b border-primary/10');
  }

  const rowIndex = Math.floor(index / 2);
  const totalRows = Math.ceil(total / 2);
  const isLeftColumn = index % 2 === 0;
  const hasNeighborOnRight = index + 1 < total;

  if (isLeftColumn && hasNeighborOnRight) {
    classes.push('xl:border-s xl:border-primary/10');
  }

  if (rowIndex < totalRows - 1) {
    classes.push('xl:border-b xl:border-primary/10');
  }

  if (index === 0) {
    classes.push('bg-[linear-gradient(135deg,hsl(var(--primary)/0.07),rgba(255,255,255,0.98)_54%,hsl(var(--secondary)/0.72))]');
  }

  return classes.join(' ');
};

const ShoppingIntents: React.FC<ShoppingIntentsProps> = ({ settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const isDistrictMarket = theme.id === 'district-market';
  const badge = settings?.badge || 'ابدأ من احتياجك';
  const title = settings?.title || 'ابدأ من الشيء الناقص عندك اليوم';
  const subtitle =
    settings?.subtitle ||
    'اختر المسار الأقرب لطلبك: منتجات يومية، عروض، ركنة البيت، أو هدية جاهزة بدون لف طويل داخل المتجر.';
  const items = useMemo(() => parseIntentItems(settings?.items), [settings?.items]);
  const contentAlign = resolveSectionContentAlign(
    settings?.contentAlign,
    theme.tokens.layout?.contentAlign,
  );
  const isCentered = contentAlign === 'center';

  return (
    <section
      className={`relative w-full overflow-hidden py-10 md:py-14 ${
        isDistrictMarket
          ? 'bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.36)_46%,hsl(var(--background))_100%)]'
          : 'bg-background'
      }`}
    >
      <div className="container px-4 md:px-6">
        <div
          className={`mb-8 flex flex-col gap-3 ${
            isCentered ? 'items-center text-center' : 'text-start'
          }`}
        >
          <span
            className={`inline-flex w-fit rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-primary ${
              isCentered ? 'mx-auto' : ''
            }`}
          >
            {badge}
          </span>
          <h2
            className={`max-w-3xl font-heading text-3xl font-black tracking-tight text-foreground md:text-4xl ${
              isCentered ? 'mx-auto' : ''
            }`}
          >
            {title}
          </h2>
          <p
            className={`max-w-2xl text-sm leading-7 text-muted-foreground md:text-base ${
              isCentered ? 'mx-auto' : ''
            }`}
          >
            {subtitle}
          </p>
        </div>

        {isDistrictMarket ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card shadow-[0_24px_78px_-62px_hsl(var(--primary)/0.3)]">
            <div className="grid grid-cols-1 divide-y divide-primary/10">
              <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-y-0">
                {DISTRICT_MARKET_SERVICE_POINTS.map((point) => (
                  <div
                    key={point.label}
                    className="flex flex-col items-start gap-1 px-5 py-4 text-start md:px-6"
                  >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                      {point.label}
                    </span>
                    <span className="text-sm leading-6 text-foreground/82">
                      {point.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2">
                {items.map((item, index) => {
                  const href = buildStorefrontPath(
                    location.pathname,
                    item.link.startsWith('/') ? item.link : `/${item.link}`,
                    location.search,
                  );
                  const examples = resolveIntentExamples(item, index).slice(0, 2);

                  return (
                    <Link
                      key={`${item.title}-${index}`}
                      to={href}
                      className={resolveDistrictMarketIntentCellClass(index, items.length)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                            {item.eyebrow || `مسار 0${index + 1}`}
                          </span>
                          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/48">
                            {`0${index + 1}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/62">
                          {item.chip || 'اختيار أسرع'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="max-w-xl font-heading text-[1.45rem] font-black tracking-tight text-foreground sm:text-[1.65rem]">
                          {item.title}
                        </h3>
                        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                          {item.subtitle}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm leading-6 text-foreground/76">
                        {examples.map((example) => (
                          <div
                            key={`${item.title}-${example}`}
                            className="flex items-start gap-2"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                            <span>{example}</span>
                          </div>
                        ))}
                      </div>

                      <div className="inline-flex items-center gap-2 text-sm font-black text-primary">
                        افتح المسار
                        <span className="text-base transition-transform duration-300 group-hover:-translate-x-1">
                          ←
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                item.link.startsWith('/') ? item.link : `/${item.link}`,
                location.search,
              );
              const examples = resolveIntentExamples(item, index);

              return (
                <Link
                  key={`${item.title}-${index}`}
                  to={href}
                  className={`group relative overflow-hidden border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_-60px_hsl(var(--primary)/0.48)] ${
                    TONE_CLASS_MAP[item.tone || 'primary'] || TONE_CLASS_MAP.primary
                  } ${index === 0 ? 'xl:col-span-2' : ''} rounded-[1.6rem]`}
                >
                  <div
                    className="absolute inset-y-0 end-0 w-32 translate-x-6 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.18),transparent_70%)] opacity-80 transition-transform duration-300 group-hover:translate-x-0"
                  />
                  <div
                    className={`relative z-10 flex h-full flex-col justify-between gap-6 ${
                      isCentered ? 'items-center text-center' : ''
                    }`}
                  >
                    <div
                      className={`flex gap-3 ${
                        isCentered
                          ? 'flex-col items-center text-center'
                          : 'items-start justify-between'
                      }`}
                    >
                      <div className="space-y-3">
                        <div
                          className={`flex flex-wrap items-center gap-2 ${
                            isCentered ? 'justify-center' : ''
                          }`}
                        >
                          <span className="inline-flex rounded-full border border-white/60 bg-background/82 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary backdrop-blur">
                            {item.eyebrow || `مسار 0${index + 1}`}
                          </span>
                        </div>
                        <h3 className="font-heading text-2xl font-black tracking-tight text-foreground">
                          {item.title}
                        </h3>
                        <p
                          className={`max-w-md text-sm leading-7 text-muted-foreground ${
                            isCentered ? 'mx-auto' : ''
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>

                      {item.chip ? (
                        <span className="inline-flex rounded-full bg-foreground px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-background">
                          {item.chip}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <div
                        className={`flex flex-wrap gap-2 ${
                          isCentered ? 'justify-center' : ''
                        }`}
                      >
                        {examples.map((example) => (
                          <span
                            key={`${item.title}-${example}`}
                            className="inline-flex rounded-full border border-primary/10 bg-background/88 px-3 py-1 text-[11px] font-bold text-foreground shadow-sm"
                          >
                            {example}
                          </span>
                        ))}
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 text-sm font-black text-primary ${
                          isCentered ? 'mx-auto' : ''
                        }`}
                      >
                        افتح هذا القسم
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-background/75 text-base transition-transform duration-300 group-hover:-translate-x-1">
                          ←
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShoppingIntents;
