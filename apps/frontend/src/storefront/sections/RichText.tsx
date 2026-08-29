import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface RichTextProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    body?: string;
    align?: string;
    ctaText?: string;
    ctaLink?: string;
  };
}

const RICHTEXT_VARIANTS = new Set(['standard', 'centered', 'split']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return RICHTEXT_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const RichText: React.FC<RichTextProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'The Collection';
  const title = settings?.title || 'Inspired by Style, Designed for Everyday Living';
  const subtitle = settings?.subtitle || '';
  const body = settings?.body || '';
  const align = settings?.align || (variant === 'centered' ? 'center' : 'start');
  const ctaText = settings?.ctaText || '';
  const ctaLink = settings?.ctaLink || '';

  const alignClass =
    align === 'center' ? 'text-center mx-auto items-center' : 'text-start items-start';
  const ctaResolved = ctaLink
    ? buildStorefrontPath(location.pathname, ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`, location.search)
    : '';

  return (
    <section className="w-full bg-white py-14 md:py-20">
      <div className="container mx-auto max-w-3xl px-5 md:px-10">
        <div className={`flex flex-col gap-4 ${alignClass}`}>
          {badge && (
            <span className="inline-block w-fit border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              {badge}
            </span>
          )}
          <h2 className="font-heading text-[2.4rem] font-semibold leading-[1.2] tracking-tight text-[#171717] md:text-[3.2rem]">
            {title}
          </h2>
          {subtitle && (
            <p className="font-heading text-xl font-medium text-[#b06d31] md:text-2xl">{subtitle}</p>
          )}
          {body && <p className="text-base leading-8 text-[#575757] md:text-lg">{body}</p>}
          {ctaText && ctaLink && (
            isExternalHref(ctaLink) ? (
              <a href={ctaLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-fit rounded-lg bg-[#171717] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#e16244]">
                {ctaText}
              </a>
            ) : (
              <Link to={ctaResolved} className="mt-2 inline-flex w-fit rounded-lg bg-[#171717] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#e16244]">
                {ctaText}
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default RichText;
