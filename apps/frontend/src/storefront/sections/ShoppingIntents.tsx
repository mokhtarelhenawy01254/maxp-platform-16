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
  tags?: string[];
}

interface ShoppingIntentsProps {
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: unknown;
    contentAlign?: string;
    ctaText?: string;
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
    'border-border/80 bg-card text-foreground shadow-sm hover:border-primary/50 hover:shadow-[0_16px_36px_-16px_hsl(var(--primary)/0.22)]',
  accent:
    'border-border/80 bg-card text-foreground shadow-sm hover:border-primary/40 hover:shadow-md',
  emerald:
    'border-border/80 bg-card text-foreground shadow-sm hover:border-emerald-500/40 hover:shadow-md',
  slate:
    'border-border/80 bg-card text-foreground shadow-sm hover:border-slate-400/40 hover:shadow-md',
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
      tags: Array.isArray((item as any).tags)
        ? (item as any).tags.filter(Boolean)
        : undefined,
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
      .map(([eyebrow, title, subtitle, link, tone, chip, tagsRaw]) => ({
        eyebrow: eyebrow || undefined,
        title: title || '',
        subtitle: subtitle || '',
        link: link || '/shop',
        tone: tone || undefined,
        chip: chip || undefined,
        tags: tagsRaw
          ? tagsRaw
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
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
  _index?: number,
): string[] => {
  // 1. Explicit tags take top priority
  if (item.tags && item.tags.length > 0) {
    return item.tags;
  }

  const content = normalizeIntentText(
    `${item.eyebrow || ''} ${item.title} ${item.subtitle}`,
  );

  // 2. Automotive / Car Accessories detection
  if (
    content.includes('ستار') ||
    content.includes('سيار') ||
    content.includes('عربيت') ||
    content.includes('سيدان') ||
    content.includes('suv') ||
    content.includes('جيب') ||
    content.includes('شباك') ||
    content.includes('زجاج') ||
    content.includes('كبس') ||
    content.includes('جرار') ||
    content.includes('سحاب') ||
    content.includes('صالون')
  ) {
    if (content.includes('سيدان') || content.includes('5 قطع') || content.includes('خمس قطع')) {
      return ['4 أبواب + خلفي', 'عزل حراري 98%', 'كبس فابريقة'];
    }
    if (content.includes('suv') || content.includes('جيب') || content.includes('7 قطع') || content.includes('سبع قطع')) {
      return ['تغطية صالون كاملة', '4 أبواب + 2 مثلث + خلفي', 'حماية VIP'];
    }
    if (content.includes('2 قطعة') || content.includes('قطعتين') || content.includes('أمامي')) {
      return ['حماية السائق والمرافق', 'تركيب في ثوانٍ', 'توفير عملي'];
    }
    if (content.includes('جرار') || content.includes('سحاب')) {
      return ['سحاب معدني سلس', 'دفع كارتة بدون فك', 'تهوية سهلة'];
    }
    if (content.includes('خلفي') || content.includes('كنبة')) {
      return ['حماية الكنبة الخلفية', 'منع وهج الشمس', 'شاسيه مرن'];
    }
    if (content.includes('معاين') || content.includes('دفع') || content.includes('ضمان') || content.includes('استلام')) {
      return ['تجربة على حلق الباب', 'الدفع بعد التأكد 100%', 'ضمان استبدال 14 يوم'];
    }
    return ['تفصيل بالمللي', 'عزل حراري 98%', 'معاينة وتجربة قبل الدفع'];
  }

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

  if (content.includes('صندل')) {
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
    return ['تغليف جاهز', 'بطاقة معايدة', 'اختيار راقي'];
  }

  if (
    content.includes('عرض') ||
    content.includes('خصم') ||
    content.includes('وفر') ||
    content.includes('اليوم')
  ) {
    return ['خصومات مميزة', 'توفير حقيقي', 'كميات محدودة'];
  }

  // Safe check for home goods — never trigger on automotive text containing "عربيتك"
  if (
    !content.includes('عربيت') &&
    !content.includes('سيار') &&
    (content.includes('تنظيم') ||
      content.includes('ديكور') ||
      /(?:^|\s)(?:بيت|البيت|منزل|المنزل)(?:$|\s)/.test(content))
  ) {
    return ['خيارات متعددة', 'قرار أسهل', 'متوفر الآن'];
  }

  if (
    content.includes('يومي') ||
    content.includes('أساسيات') ||
    content.includes('سريع')
  ) {
    return ['جودة مضمونة', 'شحن سريع', 'طلب مباشر'];
  }

  return ['مواصفات دقيقة', 'جودة مضمونة', 'طلب مباشر'];
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
  const ctaText = settings?.ctaText || 'افتح هذا القسم';
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
                  const examples = item.chip
                    ? []
                    : resolveIntentExamples(item, index).slice(0, 2);

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
          <div
            className={`grid grid-cols-1 gap-4.5 sm:gap-5 ${
              items.length === 6
                ? 'md:grid-cols-2 lg:grid-cols-3'
                : items.length % 4 === 0
                ? 'md:grid-cols-2 xl:grid-cols-4'
                : 'md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {items.map((item, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                item.link.startsWith('/') ? item.link : `/${item.link}`,
                location.search,
              );
              const examples = resolveIntentExamples(item, index);
              const isSixItems = items.length === 6;

              return (
                <Link
                  key={`${item.title}-${index}`}
                  to={href}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[1.25rem] border p-5 transition-all duration-300 hover:-translate-y-1 ${
                    TONE_CLASS_MAP[item.tone || 'primary'] ||
                    TONE_CLASS_MAP['primary']
                  } ${
                    index === 0 && !isSixItems && items.length < 5
                      ? 'xl:col-span-2'
                      : ''
                  }`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-[11px] font-bold tracking-wide text-primary">
                          {item.eyebrow || `باقة 0${index + 1}`}
                        </span>

                        {item.chip ? (
                          <span className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/90 px-2.5 py-0.5 text-[10.5px] font-bold tracking-wide text-background shadow-sm">
                            {item.chip}
                          </span>
                        ) : null}
                      </div>

                      <div
                        className={`space-y-1.5 ${
                          isCentered ? 'text-center' : 'text-start'
                        }`}
                      >
                        <h3 className="font-heading text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[1.35rem]">
                          {item.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-1">
                      <div
                        className={`flex flex-wrap gap-1.5 ${
                          isCentered ? 'justify-center' : 'justify-start'
                        }`}
                      >
                        {examples.map((example) => (
                          <span
                            key={`${item.title}-${example}`}
                            className="inline-flex items-center rounded-md border border-border/80 bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5"
                          >
                            {example}
                          </span>
                        ))}
                      </div>

                      <div
                        className={`flex items-center justify-between border-t border-border/50 pt-3 text-xs font-bold text-primary ${
                          isCentered ? 'justify-center gap-2' : ''
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5 font-heading">
                          <span>{ctaText || 'تحديد الباقة والمعاينة'}</span>
                          <span className="inline-block text-sm transition-transform duration-300 group-hover:-translate-x-1">
                            ←
                          </span>
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          معاينة وتجربة
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
