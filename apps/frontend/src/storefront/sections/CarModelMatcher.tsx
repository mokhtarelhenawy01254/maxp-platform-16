import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';

const POPULAR_CAR_MODELS: string[] = [
  // Korean
  'هيونداي إلنترا CN7',
  'هيونداي إلنترا AD',
  'هيونداي إلنترا HD',
  'هيونداي توسان',
  'هيونداي أكسنت HCI',
  'هيونداي فيرنا',
  'كيا سبورتاج',
  'كيا سيراتو',
  'كيا K3',
  'كيا K5',
  'كيا سول',
  'كيا بيكانتو',
  'كيا ريو',
  // Japanese
  'تويوتا كورولا',
  'تويوتا كامري',
  'تويوتا RAV4',
  'تويوتا يارس',
  'نيسان سنترا',
  'نيسان قشقاي',
  'نيسان صني N17',
  'نيسان صني N16',
  'ميتسوبيشي لانسر شارك',
  'ميتسوبيشي إكليبس كروس',
  'ميتسوبيشي أتراج',
  'هوندا سيفيك',
  'هوندا أكورد',
  'هوندا CR-V',
  'سوزوكي سويفت',
  'سوزوكي إرتيجا',
  'سوزوكي بالينو',
  // Chinese
  'شيري تيجو 7',
  'شيري تيجو 8',
  'شيري تيجو 3',
  'شيري أريزو 5',
  'MG 5',
  'MG ZS',
  'MG RX5',
  'MG HS',
  'MG 6',
  'بي واي دي F3',
  'جيلي إمجراند',
  'جيتور X70',
  'جيتور داشينج',
  'شانجان CS35 Plus',
  'شانجان CS55 Plus',
  'شانجان ألسفين',
  // German & European
  'بي إم دبليو الفئة الثالثة',
  'بي إم دبليو X3',
  'مرسيدس C-Class',
  'مرسيدس E-Class',
  'مرسيدس GLC',
  'فولكس فاجن جولف',
  'فولكس فاجن تيجوان',
  'فولكس فاجن باسات',
  'سكودا أوكتافيا',
  'سكودا كودياك',
  'أوبل أسترا',
  'أوبل جراند لاند',
  'أوبل كورسا',
  'بيجو 301',
  'بيجو 2008',
  'بيجو 3008',
  'بيجو 508',
  'رينو لوجان',
  'رينو ميجان',
  'رينو داستر',
  'رينو ستيب واي',
  'فيات تيبو',
  // American
  'شيفروليه أوبترا',
  'شيفروليه أفيو',
  'شيفروليه كابتيفا',
  'جيب رينيجيد',
  'جيب جراند شيروكي',
];

interface CarModelMatcherProps {
  section?: { variant?: string; [key: string]: unknown };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    placeholder?: string;
    fitMessage?: string;
    customNoteMessage?: string;
    ctaText?: string;
    ctaLink?: string;
    [key: string]: unknown;
  };
}

const CarModelMatcher: React.FC<CarModelMatcherProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const badge = settings?.badge || 'تطابق فابريقة 100%';
  const title = settings?.title || 'تأكد من مطابقة الستارة لموديل سيارتك';
  const subtitle =
    settings?.subtitle ||
    'ابحث عن ماركة وموديل سيارتك للتأكد من توفر باترون الشاسيه الدقيق بالمللي قبل تأكيد الطلب.';
  const placeholder = settings?.placeholder || 'اكتب موديل سيارتك (مثال: كيا سبورتاج أو إلنترا CN7)...';
  const fitMessage = settings?.fitMessage || 'المقاس فابريقة ومطابق 100% لموديل وسنة صنع سيارتك';
  const customNoteMessage =
    settings?.customNoteMessage ||
    'موديلك مدعوم — يكفي كتابة الموديل وسنة الصنع في خانة الملاحظات وسنقوم بتفصيله بالمللي.';
  const ctaText = settings?.ctaText || 'اطلب باقة سيارتك الآن';
  const ctaLink = typeof settings?.ctaLink === 'string' && settings.ctaLink.trim() ? settings.ctaLink.trim() : '#pdp-buybox';

  const normalizedQuery = query.trim().toLowerCase();

  const matchingSuggestions = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 2) return [];
    return POPULAR_CAR_MODELS.filter((model) =>
      model.toLowerCase().includes(normalizedQuery)
    ).slice(0, 6);
  }, [normalizedQuery]);

  const isExactMatch = useMemo(() => {
    if (selectedModel) return true;
    if (!normalizedQuery) return false;
    return POPULAR_CAR_MODELS.some(
      (model) => model.toLowerCase() === normalizedQuery
    );
  }, [selectedModel, normalizedQuery]);

  const activeModelName = selectedModel || (isExactMatch ? query.trim() : null);

  const handleSelectSuggestion = (model: string) => {
    setSelectedModel(model);
    setQuery(model);
    setIsFocused(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('maxp:storefront:select-car-model', {
          detail: { carModel: model },
        })
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (selectedModel) {
      setSelectedModel(null);
    }
    if (val.trim().length >= 3 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('maxp:storefront:select-car-model', {
          detail: { carModel: val.trim() },
        })
      );
    }
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const modelToSync = activeModelName || query.trim();
    if (modelToSync && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('maxp:storefront:select-car-model', {
          detail: { carModel: modelToSync },
        })
      );
    }
    if (ctaLink.startsWith('#')) {
      e.preventDefault();
      const targetElement =
        document.querySelector('#storefront-pdp-checkout') ||
        document.querySelector(ctaLink) ||
        document.querySelector('[data-section="pdp-checkout"]') ||
        document.querySelector('[data-section="quantity-offers"]') ||
        document.querySelector('#pdp-buybox');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const targetHref = ctaLink.startsWith('#')
    ? ctaLink
    : buildStorefrontPath(location.pathname, ctaLink, location.search);

  return (
    <section
      className="mx-auto w-full max-w-5xl px-4 py-8 md:py-12"
      dir={theme.direction}
      data-section="car-model-matcher"
      data-variant={section?.variant || 'default'}
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-xl">
        <div className="mx-auto max-w-2xl text-center space-y-3">
          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{badge}</span>
            </span>
          )}

          <h3 className="text-xl md:text-2xl lg:text-3xl font-heading font-black tracking-tight text-foreground text-balance">
            {title}
          </h3>

          <p className="text-sm md:text-base text-muted-foreground text-pretty max-w-xl mx-auto">
            {subtitle}
          </p>

          {/* Search Input Container */}
          <div className="relative mt-6 text-start">
            <div className="relative flex items-center">
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-border bg-background px-4 py-3.5 pe-11 text-sm md:text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all shadow-sm"
                aria-label="البحث عن موديل السيارة"
              />
              <div className="absolute end-3.5 flex items-center pointer-events-none text-muted-foreground">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {isFocused && matchingSuggestions.length > 0 && (
              <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-popover py-1.5 shadow-2xl backdrop-blur-md">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/50">
                  موديلات شائعة متطابقة:
                </div>
                {matchingSuggestions.map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleSelectSuggestion(model)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-start text-sm text-foreground hover:bg-muted/80 transition-colors focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="font-medium">{model}</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      جاهز للتفصيل
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Badges */}
          {activeModelName ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-start flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-black text-foreground">
                    تم التأكد: <span className="text-primary">{activeModelName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {fitMessage}
                  </div>
                </div>
              </div>
              <a
                href={targetHref}
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs md:text-sm font-bold text-primary-foreground shadow-md transition-transform hover:opacity-95 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                {ctaText}
              </a>
            </div>
          ) : query.trim().length >= 3 ? (
            <div className="mt-4 rounded-xl border border-border/80 bg-muted/50 p-4 text-start flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    موديل سيارتك متاح للتفصيل المخصص
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {customNoteMessage}
                  </div>
                </div>
              </div>
              <a
                href={targetHref}
                onClick={handleCtaClick}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-xs md:text-sm font-bold text-primary-foreground shadow-md transition-transform hover:opacity-95 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                {ctaText}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CarModelMatcher;
