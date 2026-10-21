import React from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { getDefaultRegisteredVariantId, hasRegisteredVariant } from '../variants';
import AutomotiveBento from './AutomotiveBento';
/* ────────────── types ────────────── */

interface FeatureItem {
  icon?: string;
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
}

interface FeaturesBarProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    image?: string;
    imageAlt?: string;
    items?: FeatureItem[];
    [key: string]: unknown;
  };
}

/* ────────────── inline icons ────────────── */

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  target: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  grid: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  search: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  clipboard: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  ),
  leaf: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89-.82 1.67-3.52C9.7 12 14 10 17 8z" />
      <path d="M6 15c2-2 4.5-3.5 8-4" />
      <path d="M21 3s-3-.5-6 1c-3 1.5-5 4-6 7 3-1 6-2 9-1" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

const ICON_KEYS = Object.keys(ICONS);

/* ────────────── defaults ────────────── */

const DEFAULT_ITEMS: FeatureItem[] = [
  { icon: 'target',    title: 'وعد أوضح',          description: 'السعر، الشحن، وسياسة الاستبدال تظهر قبل الإتمام بدون مفاجآت.' },
  { icon: 'grid',      title: 'أقسام مرتبة',        description: 'التنقل بين الفئات والعروض يختصر وقت البحث من أول زيارة.' },
  { icon: 'search',    title: 'تفاصيل تساعدك',      description: 'الخامة، المقاس، والمعلومات الأساسية تظهر بصياغة مختصرة تسهّل المقارنة.' },
  { icon: 'clipboard', title: 'خدمة مطمئنة',       description: 'متابعة الطلب، الدعم، وخيارات الدفع تكون واضحة في كل خطوة.' },
];

/* ────────────── component ────────────── */

type FeaturesBarVariant =
  | 'trust-strip'
  | 'service-clarity'
  | 'delivery-clarity'
  | 'kids-guarantee'
  | 'store-advantages-pastel'
  | 'system-assurance'
  | 'butcher-proof-board'
  | 'vela-store-advantages'
  | 'automotive-bento';

const FEATURES_BAR_FAMILY = 'FeaturesBar';
const FEATURES_BAR_DEFAULT =
  (getDefaultRegisteredVariantId(FEATURES_BAR_FAMILY) as FeaturesBarVariant | undefined) ||
  'trust-strip';

const normalizeFeaturesBarVariant = (rawVariant: unknown): FeaturesBarVariant => {
  const value = String(rawVariant || '').trim().toLowerCase();
  if (
    (
      value === 'trust-strip' ||
      value === 'service-clarity' ||
      value === 'delivery-clarity' ||
      value === 'kids-guarantee' ||
      value === 'store-advantages-pastel' ||
      value === 'system-assurance' ||
      value === 'butcher-proof-board' ||
      value === 'vela-store-advantages' ||
      value === 'automotive-bento'
    ) &&
    hasRegisteredVariant(FEATURES_BAR_FAMILY, value)
  ) {
    return value as FeaturesBarVariant;
  }
  if (value === 'automotive-bento') {
    return 'automotive-bento';
  }
  return FEATURES_BAR_DEFAULT;
};

const FeaturesBar: React.FC<FeaturesBarProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();
  const isZenOrganic = theme.id === 'zen-organic';
  const isSmartBazaar = theme.id === 'smart-bazaar';
  const isDistrictMarket = theme.id === 'district-market';
  const isKidsPlay = theme.id === 'kids-play';
  const variant = normalizeFeaturesBarVariant(settings?.variant || section?.variant);
  const isSystemAssurance = variant === 'system-assurance';
  const isButcherProofBoard = variant === 'butcher-proof-board';
  const isPastelAdvantages = variant === 'store-advantages-pastel';
  const isVelaStoreAdvantages = variant === 'vela-store-advantages';

  if (variant === 'automotive-bento') {
    return <AutomotiveBento section={section} settings={settings as any} />;
  }

  const title = settings?.title || (isZenOrganic ? 'لماذا تختارنا' : isSmartBazaar ? 'Smart Bazaar System' : 'مميزاتنا');
  const subtitle = settings?.subtitle || '';
  const imageCandidate =
    typeof settings?.image === 'string' && settings.image.trim()
      ? settings.image.trim()
      : '';
  const sideImage =
    imageCandidate && !imageCandidate.toLowerCase().startsWith('javascript:')
      ? imageCandidate
      : '';
  const imageAlt =
    typeof settings?.imageAlt === 'string' && settings?.imageAlt.trim()
      ? settings.imageAlt.trim()
      : title || 'Feature visual';
  const configuredItems = Array.isArray(settings?.items)
    ? settings?.items
    : [];
  const items    = configuredItems.length > 0
    ? configuredItems
    : DEFAULT_ITEMS;

  if (isButcherProofBoard) {
    return (
      <section className="relative overflow-hidden bg-[#080706] py-12 text-[#f4ead8] md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(90deg,rgba(255,255,255,0.055)_0_1px,transparent_1px_104px),linear-gradient(180deg,rgba(255,255,255,0.04)_0_1px,transparent_1px_68px)]" />
        <div className="container relative z-10 px-4 md:px-6">
          <div className="grid gap-0 border-y border-[#37312c] lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <div className="border-b border-[#37312c] px-5 py-7 md:px-7 lg:border-b-0 lg:border-s">
              <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                COLD CHAIN / PROOF
              </span>
              {title ? (
                <h2 className="mt-5 font-heading text-[2rem] font-black leading-[1.05] text-[#fff7e8] md:text-[3.35rem]">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#b7ab9c] md:text-base">
                  {subtitle}
                </p>
              ) : null}
              {sideImage ? (
                <div className="mt-7 aspect-[4/3] overflow-hidden border border-[#37312c] bg-[#15110f]">
                  <img
                    src={sideImage}
                    alt={imageAlt}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale-[8%] saturate-[0.92]"
                  />
                </div>
              ) : null}
            </div>

            <div className="grid md:grid-cols-2">
              {items.slice(0, 4).map((item, idx) => {
                const IconComponent =
                  ICONS[item.icon || ''] || ICONS[ICON_KEYS[idx % ICON_KEYS.length]!]!;

                return (
                  <div
                    key={`${item.title}-${idx}`}
                    className={`group min-h-[14rem] border-[#37312c] px-5 py-6 transition-colors hover:bg-[#11100f] md:px-6 ${
                      idx % 2 === 1 ? 'md:border-s' : ''
                    } ${idx > 1 ? 'border-t' : idx > 0 ? 'border-t md:border-t-0' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[2.7rem] font-black leading-none text-[#2b2520] transition-colors group-hover:text-[#5f1118]">
                        0{idx + 1}
                      </span>
                      <span className="inline-flex h-12 w-12 items-center justify-center border border-[#4a4138] text-[#d7b674]">
                        <IconComponent className="h-6 w-6 stroke-[1.35]" />
                      </span>
                    </div>
                    <h3 className="mt-8 font-heading text-xl font-black text-[#fff7e8]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[#b7ab9c]">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isVelaStoreAdvantages) {
    return (
      <section className="bg-[#fffdfb] py-12 md:py-16">
        <div className="container px-4 md:px-6">
          {(title || subtitle) && (
            <div className="mx-auto mb-10 max-w-3xl text-center">
              {title ? (
                <h2 className="font-heading text-[1.05rem] font-semibold uppercase tracking-[0.18em] text-[#171717] md:text-[1.15rem]">
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[#171717] md:text-[2.2rem]">
                  {subtitle}
                </p>
              ) : null}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            {items.slice(0, 4).map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="flex h-full items-start gap-4 rounded-[1.35rem] border border-[#ebe5df] bg-white p-5 shadow-[0_26px_64px_-52px_rgba(18,18,18,0.16)]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8d0023]">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.imageAlt || item.title}
                      loading="lazy"
                      className="h-6 w-6 object-contain"
                    />
                  ) : (
                    <span className="text-sm font-black text-white">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-start">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8d0023]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-7 text-[#5c5c5c]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`relative w-full overflow-hidden ${variant === 'service-clarity' || variant === 'delivery-clarity' ? 'py-10 md:py-18' : 'py-8 md:py-16'} bg-background`}>
      <div className="container px-4 md:px-6 relative z-10">
        {(title || subtitle) && (
          <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center space-y-2 text-center md:mb-8">
            {title ? (
              <h2 className={`font-heading text-3xl md:text-4xl ${
                isSystemAssurance
                  ? 'font-black tracking-tight text-foreground'
                  : isPastelAdvantages
                    ? 'font-black tracking-tight text-[#3f2432]'
                  : isSmartBazaar
                    ? 'font-black tracking-tight text-foreground'
                  : 'font-extrabold tracking-tight text-foreground'
              }`}>
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        )}
        
        {/* Main Bar Wrapper */}
        <div className={`relative overflow-hidden ${
          isSystemAssurance
              ? 'rounded-[2.4rem] border border-[#1f242c]/10 bg-[linear-gradient(135deg,#1f242c,#2b313b)] shadow-[0_34px_96px_-44px_rgba(31,36,44,0.62)]'
            : isSmartBazaar
              ? 'rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/0.92)_34%,hsl(var(--foreground))_100%)] shadow-[0_34px_100px_-58px_hsl(var(--primary)/0.72)]'
            : isPastelAdvantages
              ? 'rounded-[2.25rem] border border-[#eddcd4] bg-[linear-gradient(135deg,#fffefd,#fff6f1,#fffaf7)] shadow-[0_30px_80px_-52px_rgba(90,54,57,0.18)]'
            : isDistrictMarket
              ? 'rounded-[2.35rem] border border-[#dba98d]/35 bg-[linear-gradient(135deg,#8d431f,#ad5529,#cc7442)] shadow-[0_32px_84px_-26px_rgba(120,45,18,0.38)]'
            : variant === 'service-clarity'
              ? 'rounded-[2.25rem] bg-[linear-gradient(135deg,#1f4d42,#275c4c,#2d6a57)] shadow-[0_30px_70px_-18px_rgba(20,60,40,0.45)]'
              : variant === 'delivery-clarity'
                ? 'rounded-[2.25rem] bg-[linear-gradient(135deg,#6f2f14,#9a4020,#c45b29)] shadow-[0_30px_70px_-18px_rgba(120,45,18,0.38)]'
                : variant === 'kids-guarantee' || isKidsPlay
                  ? 'rounded-[3rem] border-4 border-white bg-[linear-gradient(135deg,hsl(var(--secondary)/0.1),hsl(var(--accent)/0.1))] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.1)]'
                  : 'rounded-[2.5rem] bg-[#275c4c] shadow-[0_25px_50px_-12px_rgba(20,60,40,0.5)]'
        }`}>
          {/* Abstract overlapping curved leaves for background texture */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {isSystemAssurance ? (
              <>
                <div className="absolute inset-y-0 start-[26%] w-px bg-white/8" />
                <div className="absolute inset-y-0 start-[52%] w-px bg-white/8" />
                <div className="absolute inset-y-0 start-[78%] w-px bg-white/8" />
                <div className="absolute -top-8 end-8 h-44 w-44 rounded-full bg-[#ffd400]/20 blur-3xl" />
                <div className="absolute bottom-0 start-0 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
              </>
            ) : isSmartBazaar ? (
              <>
                <div className="absolute inset-y-0 start-[35%] w-px bg-white/10" />
                <div className="absolute -top-12 end-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute bottom-0 start-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
              </>
            ) : (
              <>
                <div className="absolute -top-1/2 -start-1/4 w-[150%] h-[150%] rounded-full bg-white/5 mix-blend-overlay rotate-[24deg]" />
                <div className="absolute top-1/2 start-1/4 w-[120%] h-[150%] rounded-full bg-black/10 mix-blend-multiply rotate-[-15deg]" />
                <div className="absolute -bottom-1/2 -end-1/4 w-[150%] h-[150%] rounded-full bg-white/5 mix-blend-overlay rotate-[-30deg]" />
              </>
            )}
          </div>

          <div
            className={`relative z-10 ${
              sideImage
                ? isDistrictMarket
                  ? 'grid gap-6 px-4 py-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:px-7 lg:py-7'
                  : 'grid gap-6 px-4 py-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:px-6 lg:py-6'
                : ''
            }`}
          >
            {sideImage ? (
              <div className={`relative overflow-hidden ${
                isDistrictMarket
                  ? 'min-h-[19.5rem] rounded-[1.95rem] border border-white/18 bg-black/5 shadow-[0_36px_90px_-54px_rgba(35,18,12,0.78)]'
                  : 'min-h-[18rem] rounded-[1.75rem] border border-white/15 bg-black/10 shadow-[0_30px_90px_-50px_rgba(20,60,40,0.8)]'
              }`}>
                <img
                  src={sideImage}
                  alt={imageAlt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className={`absolute inset-0 ${
                  isDistrictMarket
                      ? 'bg-[linear-gradient(180deg,rgba(255,250,246,0.03),rgba(39,19,11,0.18))]'
                    : 'bg-[linear-gradient(180deg,rgba(13,52,40,0.08),rgba(13,52,40,0.45))]'
                }`} />
              </div>
            ) : null}

            <div className={`grid ${
              sideImage
                ? 'grid-cols-1 gap-6 sm:grid-cols-2'
                : isSmartBazaar
                  ? 'grid-cols-1 gap-4 px-5 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8 lg:py-8'
                  : 'grid-cols-2 gap-x-6 gap-y-12 px-6 py-12 md:grid-cols-4 lg:px-12 min-h-[220px]'
            }`}>
              {items.slice(0, 4).map((item, idx) => {
                const IconComponent = ICONS[item.icon || ''] || ICONS[ICON_KEYS[idx % ICON_KEYS.length]!]!;

                return (
                  <div
                    key={`${item.title}-${idx}`}
                    className={`group relative flex flex-col ${
                      isSystemAssurance
                          ? 'rounded-[1.55rem] border border-white/10 bg-white/[0.05] p-5 text-start shadow-[0_24px_64px_-50px_rgba(0,0,0,0.55)] backdrop-blur-md'
                        : isPastelAdvantages
                          ? 'rounded-[1.5rem] border border-[#f0ddd5] bg-white p-5 text-start shadow-[0_18px_52px_-42px_rgba(90,54,57,0.12)]'
                        : isSmartBazaar
                          ? 'rounded-[1.35rem] border border-white/12 bg-white/8 p-5 text-start shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-md'
                        : isDistrictMarket
                          ? 'rounded-[1.55rem] border border-white/16 bg-white/[0.13] p-5 text-start shadow-[0_20px_48px_-38px_rgba(28,16,10,0.65)] backdrop-blur-md'
                        : variant === 'kids-guarantee' || isKidsPlay
                            ? 'rounded-[2rem] border-2 border-white/50 bg-white/40 p-6 text-center shadow-sm backdrop-blur-sm dark:bg-slate-900/40 dark:border-slate-800'
                          : sideImage
                            ? 'rounded-[1.5rem] border border-white/40 bg-white/12 p-5 text-left backdrop-blur-md'
                            : 'items-center text-center space-y-4'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`relative flex items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110 ${
                      isSystemAssurance
                          ? 'h-14 w-14 border border-white/10 bg-[#ffd400] text-[#1f242c] shadow-[0_22px_54px_-36px_rgba(255,212,0,0.72)]'
                        : isPastelAdvantages
                          ? 'h-14 w-14 border border-[#f1ddd4] bg-[#fff1ea] text-[#d86b55] shadow-[0_18px_46px_-34px_rgba(216,107,85,0.22)]'
                        : isSmartBazaar
                          ? 'h-14 w-14 border border-white/18 bg-background/12 text-white shadow-[0_16px_40px_-26px_rgba(0,0,0,0.45)]'
                          : variant === 'kids-guarantee' || isKidsPlay
                            ? 'h-16 w-16 bg-secondary text-secondary-foreground shadow-inner'
                          : sideImage
                            ? 'h-12 w-12 border border-white/30 bg-white/12 text-white'
                            : 'h-[4.5rem] w-[4.5rem] border border-white/30 text-white'
                    }`}>
                      <IconComponent className="h-7 w-7 stroke-[1.4]" />
                      {/* Abstract offset ring for aesthetic */}
                      <div className="absolute -inset-1.5 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Text Content */}
                    <div className={`space-y-2.5 ${(sideImage || isSmartBazaar || isSystemAssurance) ? 'pt-4' : 'max-w-[200px]'}`}>
                      {isSystemAssurance ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd400]">
                          {`0${idx + 1}`}
                        </span>
                      ) : null}
                      <h3 className={`drop-shadow-sm ${
                        isSystemAssurance
                            ? 'text-sm font-black uppercase tracking-[0.18em] text-white'
                          : isPastelAdvantages
                            ? 'text-base font-black text-[#3f2432]'
                          : isSmartBazaar
                            ? 'text-sm font-black uppercase tracking-[0.18em] text-white'
                            : isDistrictMarket
                              ? 'text-base font-black text-white'
                            : variant === 'kids-guarantee' || isKidsPlay
                              ? 'text-lg font-black text-foreground'
                            : 'text-[1.1rem] font-bold tracking-wide text-white'
                      }`}>
                        {item.title}
                      </h3>
                      <p className={`leading-relaxed ${
                        isSystemAssurance
                            ? 'text-xs text-white/72'
                          : isPastelAdvantages
                            ? 'text-xs leading-6 text-[#7b6367]'
                          : isSmartBazaar
                            ? 'text-xs text-white/72'
                            : isDistrictMarket
                              ? 'text-xs text-white/78'
                            : variant === 'kids-guarantee' || isKidsPlay
                              ? 'text-xs text-muted-foreground'
                            : 'text-[0.7rem] text-green-100/75 mix-blend-plus-lighter sm:text-xs'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default FeaturesBar;
