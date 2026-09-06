import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { buildStorefrontPath } from '../utils/paths';
import {
  formatCustomSizeGuide,
  parseSizeGuideOverrides,
  parseSizeGuideRows,
  resolveSizeGuideOverrideForProduct,
  resolveSizeGuideRowsForProduct,
} from '../utils/dynamicSectionContent';
import { resolveSectionVariant } from '../variants';


interface SizeGuideProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    note?: string;
    ctaText?: string;
    ctaLink?: string;
    guideRows?: string;
    guideOverrides?: string;
    guideImage?: string;
    measurementSteps?: string;
    fitTips?: string;
    [key: string]: unknown;
  };
}

interface MeasurementStep {
  title: string;
  description: string;
}

type SizeGuideVariant = 'detailed' | 'compact' | 'quick';

const SIZE_GUIDE_SECTION_FAMILY = 'SizeGuide';

const normalizeSizeGuideVariant = (rawVariant: unknown): SizeGuideVariant => {
  return resolveSectionVariant<SizeGuideVariant>(
    SIZE_GUIDE_SECTION_FAMILY,
    rawVariant,
    'detailed',
  );
};

const parseMeasurementSteps = (value: unknown): MeasurementStep[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = '', description = ''] = line.split('|').map((p) => p.trim());
      return { title, description };
    })
    .filter((step) => step.title);
};

const parseFitTips = (value: unknown): string[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const SizeGuide: React.FC<SizeGuideProps> = ({ section, settings }) => {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const searchParams = React.useMemo(() => new URLSearchParams(location.search), [location.search]);
  const productIdOrSlug =
    id ||
    searchParams.get('product') ||
    searchParams.get('productId') ||
    searchParams.get('id') ||
    undefined;
  const { product } = useProduct(productIdOrSlug);

  const variant = normalizeSizeGuideVariant(section?.variant);
  const configuredRows = parseSizeGuideRows(settings?.guideRows);
  const resolvedGuideRows = resolveSizeGuideRowsForProduct(configuredRows, product);
  const configuredOverrides = parseSizeGuideOverrides(settings?.guideOverrides);
  const matchedOverride = resolveSizeGuideOverrideForProduct(configuredOverrides, product);
  const badge = settings?.badge || 'دليل المقاسات';
  const title =
    matchedOverride?.title ||
    settings?.title ||
    'دليل المقاسات';
  const subtitle =
    matchedOverride?.subtitle ||
    settings?.subtitle ||
    'راجع دليل المقاسات واختر المقاس الأنسب لك قبل الإتمام.';
  const note =
    matchedOverride?.note ||
    settings?.note ||
    '';
  const ctaText = settings?.ctaText || 'ابدأ التسوق';
  const ctaLink =
    typeof settings?.ctaLink === 'string' && settings.ctaLink.trim()
      ? settings.ctaLink.trim()
      : '/shop';
  const ctaHref = buildStorefrontPath(
    location.pathname,
    ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
    location.search,
  );
  const guideImage =
    typeof settings?.guideImage === 'string' && settings.guideImage.trim()
      ? settings.guideImage.trim()
      : '';

  const measurementSteps = parseMeasurementSteps(settings?.measurementSteps);
  const fitTips = parseFitTips(settings?.fitTips);

  const isCompact = variant === 'compact';
  const isQuick = variant === 'quick';
  const baseRows = resolvedGuideRows.length > 0 ? resolvedGuideRows : configuredRows;
  const rows = isCompact ? baseRows.slice(0, 4) : baseRows;
  const customProductSizeGuideHtml = product?.sizeGuide
    ? formatCustomSizeGuide(product.sizeGuide)
    : '';

  const sizeTable = (
    <div className="space-y-4">
      {customProductSizeGuideHtml ? (
        <div className="rounded-[var(--radius)] border border-border bg-secondary/15 p-4 sm:p-5">
          <div
            className="product-rich-description text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: customProductSizeGuideHtml }}
          />
        </div>
      ) : null}
      {!customProductSizeGuideHtml ? (
        <div className="overflow-hidden rounded-[var(--radius)] border border-border">
          <table className="w-full border-collapse text-sm" aria-label={badge}>
            <caption className="sr-only">{title}</caption>
            <thead className={`bg-secondary text-secondary-foreground ${isQuick ? 'text-xs uppercase tracking-wider' : ''}`}>
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-black">EU</th>
                <th scope="col" className="px-4 py-3 text-start font-black">UK</th>
                <th scope="col" className="px-4 py-3 text-start font-black">US</th>
                <th scope="col" className="px-4 py-3 text-start font-black">CM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.eu} className={`border-t border-border bg-card ${isQuick ? 'hover:bg-muted/50 transition-colors' : ''}`}>
                  <td className="px-4 py-3 font-bold text-foreground">{row.eu}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.uk}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.us}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );

  if (isQuick) {
    return (
      <div className="w-full text-sm space-y-4" role="region" aria-label={badge}>
        {sizeTable}
        <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground border border-border/50">
          <p className="font-semibold text-foreground mb-1">ملاحظة:</p>
          <p className="leading-relaxed">{note}</p>
        </div>
      </div>
    );
  }


  return (
    <section className="w-full bg-background py-10 md:py-14" aria-label={badge}>
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border border-border bg-card shadow-[0_20px_60px_-40px_rgba(0,0,0,0.25)]">
          <div className="border-b border-border bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--background))_100%)] px-5 py-6 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit rounded-full bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
                  {badge}
                </span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl font-heading">
                    {title}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    {subtitle}
                  </p>
                </div>
              </div>

              <Link
                to={ctaHref}
                className="inline-flex items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
              >
                {ctaText}
              </Link>
            </div>
          </div>

          <div className={`grid gap-8 px-5 py-6 md:px-8 md:py-8 ${isCompact ? 'lg:grid-cols-[1.1fr_0.9fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'}`}>
            <div className="space-y-6">
              {!isCompact ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {measurementSteps.map((step, index) => (
                      <div
                        key={step.title}
                        className="rounded-[var(--radius)] border border-border bg-background p-4"
                      >
                        <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                          {index + 1}
                        </div>
                        <h3 className="mb-2 text-sm font-black text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>

                  {guideImage ? (
                    <div className="rounded-[var(--radius)] border border-border bg-background p-4 flex items-center justify-center">
                      <img
                        src={guideImage}
                        alt="طريقة القياس"
                        className="max-h-64 w-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              {sizeTable}
            </div>

            <div className="space-y-5">
              <div className="rounded-[var(--radius)] bg-secondary p-5">
                <h3 className="mb-3 text-lg font-black text-foreground font-heading">
                  نصائح قبل اختيار المقاس
                </h3>
                <div className="space-y-3">
                  {fitTips.map((tip) => (
                    <div key={tip} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-black text-accent-foreground" aria-hidden="true">
                        ✓
                      </span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[var(--radius)] border border-dashed border-border bg-background p-5">
                <p className="text-sm font-bold text-foreground">ملاحظة سريعة</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SizeGuide;
