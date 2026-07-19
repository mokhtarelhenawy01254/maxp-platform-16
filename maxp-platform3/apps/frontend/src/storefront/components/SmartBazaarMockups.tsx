import React from 'react';

export type SmartBazaarSceneKey = 'daily' | 'home' | 'deals' | 'gifts';

type SmartBazaarSceneItem = {
  name: string;
  price: string;
  meta: string;
  toneClassName: string;
};

type SmartBazaarScene = {
  badge: string;
  stat: string;
  title: string;
  subtitle: string;
  footer: string;
  items: SmartBazaarSceneItem[];
};

const SMART_BAZAAR_SCENES: Record<SmartBazaarSceneKey, SmartBazaarScene> = {
  daily: {
    badge: 'طلبات يومية',
    stat: 'من 79 ج.م',
    title: 'أساسيات المطبخ والتنظيم',
    subtitle: 'علب تخزين ومنظمات وأدوات صغيرة تتكرر في الطلبات اليومية.',
    footer: '28 منتجًا سريع الطلب',
    items: [
      {
        name: 'طقم علب تخزين',
        price: '79 ج.م',
        meta: 'الأكثر طلبًا',
        toneClassName: 'from-primary/18 via-primary/6 to-white text-primary',
      },
      {
        name: 'منظم أدراج',
        price: '119 ج.م',
        meta: 'تنظيم سريع',
        toneClassName: 'from-accent/22 via-accent/8 to-white text-accent-foreground',
      },
      {
        name: 'حامل مناديل مطبخ',
        price: '94 ج.م',
        meta: 'جاهز للشحن',
        toneClassName: 'from-sky-200/50 via-sky-100/40 to-white text-sky-900',
      },
    ],
  },
  home: {
    badge: 'لترتيب البيت',
    stat: 'الأكثر زيارة',
    title: 'ركنة البيت والتنظيم',
    subtitle: 'منتجات عملية للحمام والمكتب والزوايا الصغيرة داخل البيت.',
    footer: 'حلول مرتبة للبيت والمكتب',
    items: [
      {
        name: 'سلة غسيل مطوية',
        price: '189 ج.م',
        meta: 'بيت وعائلة',
        toneClassName: 'from-emerald-200/55 via-emerald-100/45 to-white text-emerald-900',
      },
      {
        name: 'منظم مكتب',
        price: '149 ج.م',
        meta: 'ترتيب يومي',
        toneClassName: 'from-primary/14 via-white to-slate-100 text-primary',
      },
      {
        name: 'رف حمام صغير',
        price: '229 ج.م',
        meta: 'تجهيز البيت',
        toneClassName: 'from-violet-200/45 via-violet-100/35 to-white text-violet-900',
      },
    ],
  },
  deals: {
    badge: 'وفر اليوم',
    stat: 'خصم حتى 25%',
    title: 'عروض أقل من 299 جنيه',
    subtitle: 'اختيارات عملية بسعر أوضح للطلبات السريعة والحساسة للسعر.',
    footer: 'خصومات متجددة على منتجات سريعة الدوران',
    items: [
      {
        name: 'حزمة تنظيم المطبخ',
        price: '249 ج.م',
        meta: 'بدل 319',
        toneClassName: 'from-amber-200/65 via-amber-100/45 to-white text-amber-950',
      },
      {
        name: 'عرض قطعتين',
        price: '199 ج.م',
        meta: 'وفر أكثر',
        toneClassName: 'from-rose-200/55 via-rose-100/40 to-white text-rose-950',
      },
      {
        name: 'منظمات السفر',
        price: '279 ج.م',
        meta: 'عدد محدود',
        toneClassName: 'from-primary/18 via-accent/10 to-white text-primary',
      },
    ],
  },
  gifts: {
    badge: 'جاهزة للتغليف',
    stat: 'توصيل سريع',
    title: 'هدايا سريعة وآمنة',
    subtitle: 'اختيارات مرتبة للمواسم والزيارات المفاجئة والهدايا العملية.',
    footer: 'مناسبة للطلبات العاجلة والمواسم',
    items: [
      {
        name: 'بوكس هدية منزلي',
        price: '329 ج.م',
        meta: 'تغليف جاهز',
        toneClassName: 'from-slate-200/55 via-slate-100/40 to-white text-slate-900',
      },
      {
        name: 'شمعة مع فواحة',
        price: '259 ج.م',
        meta: 'اختيار سريع',
        toneClassName: 'from-orange-200/55 via-orange-100/40 to-white text-orange-950',
      },
      {
        name: 'بطاقة + تغليف',
        price: '39 ج.م',
        meta: 'إضافة على الطلب',
        toneClassName: 'from-primary/12 via-white to-amber-50 text-primary',
      },
    ],
  },
};

const SCENE_KEYWORDS: Array<{
  key: SmartBazaarSceneKey;
  matches: string[];
}> = [
  { key: 'daily', matches: ['daily', 'essentials', 'أساسيات', 'يومية', 'daily-essentials'] },
  { key: 'home', matches: ['home', 'organization', 'بيت', 'البيت', 'تنظيم', 'home-organization'] },
  { key: 'deals', matches: ['deal', 'sale', 'offer', 'عروض', 'خصومات', 'quick-deals'] },
  { key: 'gifts', matches: ['gift', 'هدية', 'هدايا', 'gift-ready'] },
];

const DEFAULT_SCENE_ORDER: SmartBazaarSceneKey[] = ['daily', 'home', 'deals', 'gifts'];

const normalizeSceneValue = (value: string): string =>
  value.trim().toLowerCase();

export const isSmartBazaarThemeAssetImage = (image?: string | null): boolean =>
  Boolean(image && image.includes('/assets/themes/smart-bazaar/'));

export const resolveSmartBazaarSceneKey = (
  value: string,
  fallbackIndex = 0,
): SmartBazaarSceneKey => {
  const normalized = normalizeSceneValue(value);
  const matchedScene = SCENE_KEYWORDS.find(({ matches }) =>
    matches.some((candidate) => normalized.includes(candidate)),
  );

  if (matchedScene) {
    return matchedScene.key;
  }

  return DEFAULT_SCENE_ORDER[fallbackIndex % DEFAULT_SCENE_ORDER.length]!;
};

interface SmartBazaarCategorySceneProps {
  sceneKey: SmartBazaarSceneKey;
  compact?: boolean;
  className?: string;
}

export const SmartBazaarCategoryScene: React.FC<SmartBazaarCategorySceneProps> = ({
  sceneKey,
  compact = false,
  className = '',
}) => {
  const scene = SMART_BAZAAR_SCENES[sceneKey];
  const items = compact ? scene.items.slice(0, 2) : scene.items;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[linear-gradient(140deg,rgba(8,47,107,0.06),rgba(255,255,255,0.88)_44%,rgba(245,248,255,1))] ${className}`.trim()}
    >
      <div className="absolute -end-12 top-0 h-36 w-36 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute -start-10 bottom-0 h-28 w-28 rounded-full bg-accent/18 blur-3xl" />

      <div className="relative flex h-full flex-col gap-3 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-primary/10 bg-background/90 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-primary">
            {scene.badge}
          </span>
          <span className="inline-flex rounded-full bg-foreground px-3 py-1 text-[10px] font-black tracking-[0.18em] text-background">
            {scene.stat}
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="max-w-[16ch] font-heading text-xl font-black leading-tight text-foreground">
            {scene.title}
          </h4>
          <p className="max-w-[28ch] text-xs leading-6 text-muted-foreground">
            {scene.subtitle}
          </p>
        </div>

        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {items.map((item) => (
            <div
              key={`${sceneKey}-${item.name}`}
              className={`rounded-[1.2rem] border border-white/70 bg-gradient-to-br ${item.toneClassName} p-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]`}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/85 text-xs font-black text-foreground shadow-sm">
                {item.price.split(' ')[0]}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black leading-5 text-foreground">
                  {item.name}
                </p>
                <p className="text-[11px] font-bold text-muted-foreground">
                  {item.meta}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto rounded-[1.2rem] border border-primary/10 bg-white/92 px-4 py-3 text-xs font-bold text-foreground shadow-sm">
          {scene.footer}
        </div>
      </div>
    </div>
  );
};

type HeroProductCard = {
  name: string;
  price: string;
  compare?: string;
  badge: string;
  toneClassName: string;
};

const HERO_PRODUCTS: HeroProductCard[] = [
  {
    name: 'طقم علب تخزين 6 قطع',
    price: '249 ج.م',
    compare: '319 ج.م',
    badge: 'الأكثر طلبًا',
    toneClassName: 'from-primary/18 via-primary/6 to-white',
  },
  {
    name: 'منظم مكتب خشبي',
    price: '179 ج.م',
    compare: '219 ج.م',
    badge: 'وصل جديد',
    toneClassName: 'from-amber-200/50 via-amber-100/35 to-white',
  },
  {
    name: 'بوكس هدية عملي',
    price: '329 ج.م',
    badge: 'تغليف جاهز',
    toneClassName: 'from-slate-200/55 via-slate-100/40 to-white',
  },
];

const HERO_QUICK_LINKS = ['تنظيم البيت', 'أقل من 299', 'هدايا جاهزة'];
const HERO_TRUST_NOTES = ['شحن المدن الرئيسية خلال 48 ساعة', 'استبدال حتى 14 يوم', 'الدفع عند الاستلام متاح'];

export const SmartBazaarHeroMockup: React.FC = () => (
  <div className="relative aspect-[10/11] overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(241,247,255,0.98))] shadow-[0_36px_120px_-70px_hsl(var(--primary)/0.38)]">
    <div className="absolute -top-12 end-4 h-28 w-28 rounded-full bg-accent/18 blur-3xl" />
    <div className="absolute -bottom-10 start-2 h-32 w-32 rounded-full bg-primary/14 blur-3xl" />

    <div className="relative flex h-full flex-col gap-4 p-4 md:p-5">
      <div className="rounded-[1.3rem] border border-primary/10 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary/35" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/55" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <div className="ms-2 flex-1 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-muted-foreground">
            ابحث عن منظمات البيت والهدايا والعروض السريعة
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {HERO_QUICK_LINKS.map((item) => (
          <span
            key={item}
            className="inline-flex rounded-full border border-primary/10 bg-background/86 px-3 py-1 text-[11px] font-black text-foreground shadow-sm"
          >
            {item}
          </span>
        ))}
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.6rem] border border-primary/10 bg-[linear-gradient(145deg,hsl(var(--primary)/0.95),hsl(var(--primary)/0.78))] p-5 text-primary-foreground shadow-[0_28px_70px_-46px_hsl(var(--primary)/0.55)]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[10px] font-black tracking-[0.18em]">
                ركنة الأسبوع
              </span>
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[10px] font-black text-primary">
                خصم حتى 25%
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <h3 className="max-w-[12ch] font-heading text-3xl font-black leading-tight">
                تجهيز البيت اليومي من مكان واحد
              </h3>
              <p className="max-w-[28ch] text-sm leading-7 text-white/86">
                منظمات المطبخ والحمام والمكتب مع هدايا عملية وعروض واضحة قبل الدفع.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[1.15rem] border border-white/15 bg-white/10 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-white/72">
                  عرض اليوم
                </p>
                <p className="mt-1 text-sm font-black">حزمة تنظيم المطبخ</p>
                <p className="mt-1 text-xs text-white/78">ابدأ من 199 ج.م</p>
              </div>
              <div className="rounded-[1.15rem] border border-white/15 bg-white/10 p-3">
                <p className="text-[10px] font-black tracking-[0.18em] text-white/72">
                  شحن سريع
                </p>
                <p className="mt-1 text-sm font-black">القاهرة والجيزة</p>
                <p className="mt-1 text-xs text-white/78">خلال 48 ساعة عمل</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {HERO_TRUST_NOTES.map((note, index) => (
              <div
                key={note}
                className={`rounded-[1.2rem] border p-4 shadow-sm ${
                  index === 0
                    ? 'border-primary/10 bg-white/92'
                    : index === 1
                      ? 'border-accent/25 bg-amber-50/90'
                      : 'col-span-2 border-slate-200 bg-slate-50/92'
                }`}
              >
                <p className="text-[11px] font-black tracking-[0.18em] text-muted-foreground">
                  {index === 0 ? 'التوصيل' : index === 1 ? 'الاستبدال' : 'الدفع'}
                </p>
                <p className="mt-1 text-sm font-black text-foreground">{note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {HERO_PRODUCTS.map((product) => (
            <div
              key={product.name}
              className="rounded-[1.35rem] border border-primary/10 bg-white/92 p-3 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.42)]"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-20 w-20 shrink-0 items-end rounded-[1.2rem] bg-gradient-to-br ${product.toneClassName} p-3`}
                >
                  <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-foreground shadow-sm">
                    {product.badge}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black leading-6 text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs font-bold text-muted-foreground">
                        جاهز للشحن السريع داخل المدن الرئيسية
                      </p>
                    </div>
                    <span className="inline-flex rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-black text-primary">
                      متاح
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-foreground">
                      {product.price}
                    </span>
                    {product.compare ? (
                      <span className="text-xs font-bold text-muted-foreground line-through">
                        {product.compare}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-[1.35rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(255,186,73,0.22),rgba(255,255,255,0.96)_56%,rgba(243,248,255,1))] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black tracking-[0.18em] text-muted-foreground">
                  ملخص سريع
                </p>
                <p className="mt-1 text-sm font-black text-foreground">
                  عروض وهدايا ومنظمات في نفس الواجهة
                </p>
              </div>
              <span className="rounded-full bg-foreground px-3 py-1 text-[10px] font-black text-background">
                متجر حقيقي
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
