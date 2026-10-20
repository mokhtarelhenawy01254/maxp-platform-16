import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

type DetailItem = {
  label?: string;
  value: string;
};

interface InfoContentSectionProps {
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    body?: unknown;
    detailsTitle?: string;
    details?: unknown;
    ctaText?: string;
    ctaLink?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const parseParagraphs = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n\s*\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const parseDetailItems = (value: unknown): DetailItem[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') {
          const [label, detailValue] = entry.split('|').map((part) => part.trim());
          if (!label && !detailValue) {
            return null;
          }
          return {
            label: label || undefined,
            value: detailValue || label || '',
          };
        }

        if (!isRecord(entry)) {
          return null;
        }

        const label =
          typeof entry.label === 'string'
            ? entry.label.trim()
            : typeof entry.title === 'string'
              ? entry.title.trim()
              : '';
        const detailValue =
          typeof entry.value === 'string'
            ? entry.value.trim()
            : typeof entry.description === 'string'
              ? entry.description.trim()
              : '';

        if (!label && !detailValue) {
          return null;
        }

        return {
          label: label || undefined,
          value: detailValue || label,
        };
      })
      .filter((entry): entry is DetailItem => Boolean(entry?.value));
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, detailValue] = line.split('|').map((part) => part.trim());
        return {
          label: label || undefined,
          value: detailValue || label || '',
        };
      })
      .filter((entry) => entry.value);
  }

  return [];
};

const normalizeSmartBazaarInfoValue = (value: string): string =>
  value.trim().toLowerCase();

const resolveSmartBazaarQuickFacts = (
  badge: string,
  title: string,
): string[] => {
  const content = normalizeSmartBazaarInfoValue(`${badge} ${title}`);

  if (content.includes('دعم') || content.includes('تواصل')) {
    return ['رد يومي سريع', 'أولوية لأرقام الطلبات', 'قنوات تواصل واضحة'];
  }

  if (content.includes('شحن') || content.includes('توصيل')) {
    return ['تجهيز 24-48 ساعة', 'تكلفة قبل التأكيد', 'تحديث حالة الشحنة'];
  }

  if (content.includes('استبدال') || content.includes('استرجاع')) {
    return ['حتى 14 يومًا', 'المنتج بحالته الأصلية', 'بدء الطلب عبر الدعم'];
  }

  if (content.includes('خصوصية')) {
    return ['بيانات الطلب فقط', 'استخدام تشغيلي واضح', 'التزام بالشفافية'];
  }

  if (content.includes('شروط') || content.includes('أحكام')) {
    return ['تأكيد حسب التوفر', 'الدفع حسب الوسيلة', 'تحديثات تشغيلية معلنة'];
  }

  return ['معلومات أوضح', 'رسائل مختصرة', 'قرار أسهل'];
};

const InfoContentSection: React.FC<InfoContentSectionProps> = ({ settings }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const isSmartBazaar = theme.id === 'smart-bazaar';
  const badge =
    typeof settings?.badge === 'string' && settings.badge.trim()
      ? settings.badge.trim()
      : 'معلومات مهمة';
  const title =
    typeof settings?.title === 'string' && settings.title.trim()
      ? settings.title.trim()
      : 'تفاصيل أوضح قبل القرار';
  const subtitle =
    typeof settings?.subtitle === 'string' ? settings.subtitle.trim() : '';
  const detailsTitle =
    typeof settings?.detailsTitle === 'string' ? settings.detailsTitle.trim() : '';
  const ctaText =
    typeof settings?.ctaText === 'string' ? settings.ctaText.trim() : '';
  const ctaLink =
    typeof settings?.ctaLink === 'string' ? settings.ctaLink.trim() : '';
  const paragraphs = useMemo(() => parseParagraphs(settings?.body), [settings?.body]);
  const details = useMemo(() => parseDetailItems(settings?.details), [settings?.details]);
  const quickFacts = useMemo(
    () => resolveSmartBazaarQuickFacts(badge, title),
    [badge, title],
  );
  const contentAlign = resolveSectionContentAlign(
    settings?.contentAlign,
    theme.tokens?.layout?.contentAlign,
  );
  const isCentered = contentAlign === 'center';

  const resolvedCtaLink =
    ctaLink && !ctaLink.toLowerCase().startsWith('javascript:')
      ? isExternalHref(ctaLink)
        ? ctaLink
        : buildStorefrontPath(
            location.pathname,
            ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
            location.search,
          )
      : '';

  const contentColumnClassName = isSmartBazaar
    ? 'rounded-[2rem] border border-primary/10 bg-white/90 p-6 shadow-[0_28px_90px_-58px_hsl(var(--primary)/0.28)] backdrop-blur md:p-8'
    : 'rounded-[1.75rem] border border-border bg-card p-6 md:p-8';

  return (
    <section className="w-full bg-background py-10 md:py-14">
      <div className="container px-4 md:px-6">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className={`space-y-3 ${isCentered ? 'text-center' : 'text-start'}`}>
            <span className={`inline-flex w-fit rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-primary ${isCentered ? 'mx-auto' : ''}`}>
              {badge}
            </span>
            <h2 className={`max-w-3xl font-heading text-3xl font-black tracking-tight text-foreground md:text-4xl ${isCentered ? 'mx-auto' : ''}`}>
              {title}
            </h2>
            {subtitle ? (
              <p className={`max-w-3xl text-sm leading-7 text-muted-foreground md:text-base ${isCentered ? 'mx-auto' : ''}`}>
                {subtitle}
              </p>
            ) : null}
          </div>

          {isSmartBazaar ? (
            <div className={`flex flex-wrap gap-3 ${isCentered ? 'justify-center' : ''}`}>
              {quickFacts.map((fact) => (
                <span
                  key={fact}
                  className="inline-flex rounded-full border border-primary/10 bg-white/88 px-4 py-2 text-xs font-black text-foreground shadow-[0_16px_34px_-26px_hsl(var(--primary)/0.32)]"
                >
                  {fact}
                </span>
              ))}
            </div>
          ) : null}

          <div className={`grid grid-cols-1 gap-5 ${isCentered ? 'lg:grid-cols-1' : 'lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]'}`}>
            <div className={`${contentColumnClassName} space-y-5 ${isCentered ? 'text-center' : ''}`}>
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, index) => (
                  <p
                    key={`${index}-${paragraph.slice(0, 24)}`}
                    className={`text-sm leading-8 text-foreground/90 md:text-[15px] ${isCentered ? 'mx-auto max-w-3xl' : ''}`}
                  >
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className={`text-sm leading-8 text-muted-foreground md:text-[15px] ${isCentered ? 'mx-auto max-w-3xl' : ''}`}>
                  سيتم إضافة محتوى هذه الصفحة قريبًا.
                </p>
              )}

              {resolvedCtaLink && ctaText ? (
                isExternalHref(resolvedCtaLink) ? (
                  <a
                    href={resolvedCtaLink}
                    className={`inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 ${isCentered ? 'mx-auto' : ''}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {ctaText}
                  </a>
                ) : (
                  <Link
                    to={resolvedCtaLink}
                    className={`inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 ${isCentered ? 'mx-auto' : ''}`}
                  >
                    {ctaText}
                  </Link>
                )
              ) : null}
            </div>

            {details.length > 0 ? (
              <aside
                className={`rounded-[1.75rem] border p-6 ${
                  isSmartBazaar
                    ? 'border-primary/10 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.8),hsl(var(--background))_100%)]'
                    : 'border-border bg-card'
                } ${isCentered ? 'text-center' : ''}`}
              >
                {detailsTitle ? (
                  <h3 className="mb-4 font-heading text-xl font-black text-foreground">
                    {detailsTitle}
                  </h3>
                ) : null}
                <div className="space-y-4">
                  {details.map((item, index) => (
                    <div
                      key={`${item.label || 'detail'}-${index}`}
                      className="rounded-2xl border border-primary/10 bg-background/70 p-4"
                    >
                      {item.label ? (
                        <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-primary">
                          {item.label}
                        </div>
                      ) : null}
                      <div className="text-sm leading-7 text-foreground/90">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoContentSection;
