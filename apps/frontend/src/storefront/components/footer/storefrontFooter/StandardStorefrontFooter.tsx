import React from 'react';
import { Link } from 'react-router-dom';
import type { StorefrontFooterController } from './useStorefrontFooterController';
import { renderStorefrontSocialBrandIcon } from './FooterSocialIcons';

export const StandardStorefrontFooter: React.FC<{ controller: StorefrontFooterController }> = ({
  controller,
}) => {
  const {
    theme,
    settings,
    isMenShoes,
    isSoleaFemme,
    isIntruderNft,
    isEditorialSoftFooter,
    isSignaturePanelFooter,
    displayStoreName,
    footerDescriptionText,
    footerContactRows,
    socialIcons,
    isMinimal,
    footerLinksData,
    shouldForceDocumentNavigation,
    footerCopyrightText,
    showPaymentBadges,
    legalLinks,
  } = controller;

  return (
    <footer
      dir={theme.direction}
      className={`relative overflow-hidden border-t ${
        isMenShoes ? 'py-8 md:py-14' : 'py-12 md:py-16'
      } ${
        isSoleaFemme
          ? 'border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_100%)]'
          : isIntruderNft
            ? 'border-primary/15 bg-[linear-gradient(180deg,rgba(8,10,16,0.98)_0%,rgba(10,8,18,1)_100%)]'
            : isEditorialSoftFooter
              ? 'border-[#ead8e0] bg-[linear-gradient(180deg,#fffafb_0%,#fcf2f6_100%)]'
              : isMenShoes
                ? 'border-[#e7d8cb] bg-[linear-gradient(180deg,#f9f1ea_0%,#fffdfa_100%)]'
                : isSignaturePanelFooter
                  ? 'border-[#ded1c5] bg-[linear-gradient(180deg,#faf4ee_0%,#fffdf9_100%)]'
                  : 'border-border bg-card'
      }`}
    >
      {isIntruderNft ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-[150px]" />
        </div>
      ) : null}
      <div className="container relative z-10 px-4 md:px-6">
        <div
          className={`grid gap-6 md:grid-cols-4 ${
            isSoleaFemme
              ? 'rounded-[2rem] border border-white/65 bg-white/58 p-6 shadow-[0_26px_90px_-60px_hsl(var(--primary)/0.8)] backdrop-blur md:p-8'
              : isIntruderNft
                ? 'rounded-[1.75rem] border border-primary/15 bg-background/55 p-6 shadow-[0_0_70px_-45px_hsl(var(--primary)/0.55)] backdrop-blur md:p-8'
                : isEditorialSoftFooter
                  ? 'rounded-[2.1rem] border border-[#ead8e0] bg-white/82 p-6 shadow-[0_32px_90px_-64px_rgba(104,49,73,0.26)] backdrop-blur md:p-8'
                  : isMenShoes
                    ? 'grid-cols-1 rounded-[1.6rem] border border-[#eadccf] bg-white/92 p-5 shadow-[0_24px_70px_-46px_rgba(31,38,43,0.18)] md:p-8'
                    : isSignaturePanelFooter
                      ? 'rounded-[2rem] border border-[#e3d5ca] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(250,243,237,0.92))] p-6 shadow-[0_34px_96px_-64px_rgba(65,35,58,0.28)] backdrop-blur md:p-8'
                      : ''
          }`}
        >
          {/* Brand Column */}
          <div
            className={`space-y-4 ${
              isMenShoes ? 'col-span-1 md:col-span-1' : 'col-span-2 md:col-span-1'
            }`}
          >
            {theme.header?.logoUrl ||
            settings?.storefront?.settings?.['logoUrl'] ||
            settings?.company?.logo ? (
              <img
                src={
                  theme.header?.logoUrl ||
                  (settings?.storefront?.settings?.['logoUrl'] as string) ||
                  (settings?.company?.logo as string)
                }
                alt={displayStoreName}
                loading="lazy"
                width="112"
                height="28"
                className="h-7 w-auto object-contain"
              />
            ) : (
              <span
                className={`font-heading text-foreground ${
                  isEditorialSoftFooter
                    ? 'text-2xl font-black text-[#5c263b]'
                    : isSignaturePanelFooter
                      ? 'text-2xl font-semibold tracking-[0.06em] text-[#41233a]'
                      : isSoleaFemme
                        ? 'text-xl font-black'
                        : isIntruderNft
                          ? 'text-xl font-black uppercase tracking-[0.28em]'
                          : 'text-lg font-bold'
                }`}
              >
                {displayStoreName}
              </span>
            )}
            <p
              className={`max-w-xs text-sm leading-relaxed ${
                isIntruderNft
                  ? 'text-white/65'
                  : isMenShoes
                    ? 'text-[#675548]'
                    : 'text-muted-foreground'
              } ${
                isEditorialSoftFooter
                  ? 'text-[#745767]'
                  : isSignaturePanelFooter
                    ? 'text-[#6d5658]'
                    : ''
              }`}
            >
              {footerDescriptionText ||
                (theme.direction === 'rtl'
                  ? 'مجموعات مختارة مصممة للحياة العصرية. الجودة تلتقي بالجمال البسيط.'
                  : 'Curated collections designed for modern living. Quality meets minimal aesthetic.')}
            </p>
            {footerContactRows.length ? (
              <div
                className={`space-y-1.5 text-sm ${
                  isIntruderNft
                    ? 'text-white/65'
                    : isMenShoes
                      ? 'text-[#675548]'
                      : 'text-muted-foreground'
                } ${
                  isEditorialSoftFooter
                    ? 'text-[#745767]'
                    : isSignaturePanelFooter
                      ? 'text-[#6d5658]'
                      : ''
                }`}
              >
                {footerContactRows.map((row) =>
                  row.href ? (
                    <a
                      key={`${row.label}-${row.value}`}
                      href={row.href}
                      className="block transition-colors hover:text-foreground"
                    >
                      {row.label}: {row.value}
                    </a>
                  ) : (
                    <p key={`${row.label}-${row.value}`}>
                      {row.label}: {row.value}
                    </p>
                  ),
                )}
              </div>
            ) : null}
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {Object.entries(socialIcons).map(
                ([social, url]) =>
                  url && (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                        isIntruderNft
                          ? 'border border-primary/20 bg-background/70 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)]'
                          : isEditorialSoftFooter
                            ? 'border border-[#ead8e0] bg-white text-[#8f5168] hover:border-[#d58ba8] hover:bg-[#fbeaf0] hover:text-[#5c263b]'
                            : isMenShoes
                              ? 'border border-[#eadccf] bg-[#fff8f2] text-[#4f4034] hover:border-[#f57a1d] hover:bg-[#f57a1d] hover:text-white'
                              : isSignaturePanelFooter
                                ? 'border border-[#e3d5ca] bg-white text-[#6d454d] hover:border-[#c09758] hover:bg-[#fff6ea] hover:text-[#41233a]'
                                : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                      }`}
                      aria-label={
                        theme.direction === 'rtl'
                          ? `تابعنا على ${social}`
                          : `Follow us on ${social}`
                      }
                    >
                      <span className="inline-flex items-center justify-center" aria-hidden="true">
                        {renderStorefrontSocialBrandIcon(social) ?? (
                          <span className="text-xs capitalize">{social[0]?.toUpperCase()}</span>
                        )}
                      </span>
                    </a>
                  ),
              )}
            </div>
          </div>

          {/* Link Columns */}
          {!isMinimal &&
            footerLinksData.map((group) => (
              <div
                key={group.title}
                className={isMenShoes ? 'hidden md:block' : undefined}
              >
                <h3
                  className={`mb-4 text-sm font-semibold font-heading uppercase tracking-wide ${
                    isIntruderNft
                      ? 'text-white/75'
                      : isEditorialSoftFooter
                        ? 'text-[#8f5168]'
                        : isMenShoes
                          ? 'text-[#1f262b]'
                          : isSignaturePanelFooter
                            ? 'text-[#6d454d]'
                            : 'text-foreground'
                  }`}
                >
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className={`relative text-sm transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] ${
                          isIntruderNft
                            ? 'text-white/60 hover:text-primary'
                            : isEditorialSoftFooter
                              ? 'text-[#745767] hover:text-[#5c263b]'
                              : isMenShoes
                                ? 'text-[#675548] hover:text-[#f57a1d]'
                                : isSignaturePanelFooter
                                  ? 'text-[#6d5658] hover:text-[#41233a]'
                                  : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>

        {/* Bottom bar */}
        <div
          className={`flex flex-col items-center justify-between gap-4 border-t md:flex-row ${
            isMenShoes ? 'mt-6 pt-5' : 'mt-12 pt-8'
          } ${
            isSoleaFemme
              ? 'border-primary/10'
              : isIntruderNft
                ? 'border-primary/10'
                : isEditorialSoftFooter
                  ? 'border-[#ead8e0]'
                  : isMenShoes
                    ? 'border-[#eadccf]'
                    : isSignaturePanelFooter
                      ? 'border-[#e3d5ca]'
                      : 'border-border'
          }`}
        >
          <p
            className={`text-sm ${
              isIntruderNft
                ? 'text-white/50'
                : isEditorialSoftFooter
                  ? 'text-[#876674]'
                  : isMenShoes
                    ? 'text-[#7b6556]'
                    : isSignaturePanelFooter
                      ? 'text-[#7d6967]'
                      : 'text-muted-foreground'
            }`}
          >
            {footerCopyrightText ||
              (theme.direction === 'rtl'
                ? `© ٢٠٢٦ ${theme.name}. جميع الحقوق محفوظة.`
                : `© 2026 ${theme.name}. All rights reserved.`)}
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-4 text-sm ${
              isIntruderNft
                ? 'text-white/50'
                : isEditorialSoftFooter
                  ? 'text-[#876674]'
                  : isMenShoes
                    ? 'text-[#7b6556]'
                    : isSignaturePanelFooter
                      ? 'text-[#7d6967]'
                      : 'text-muted-foreground'
            }`}
          >
            {showPaymentBadges ? (
              <div data-testid="storefront-payment-badges" className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex h-6 min-w-[38px] items-center justify-center rounded bg-slate-100 border border-slate-200 px-1.5 text-[8.5px] font-black tracking-tight text-slate-800">
                  VISA
                </span>
                <span className="inline-flex h-6 min-w-[38px] items-center justify-center rounded bg-slate-100 border border-slate-200 px-1.5 text-[8.5px] font-black tracking-tight text-slate-800">
                  Mastercard
                </span>
                <span className="inline-flex h-6 min-w-[38px] items-center justify-center rounded bg-slate-100 border border-slate-200 px-1.5 text-[8.5px] font-black tracking-tight text-slate-800">
                  ميزة
                </span>
                <span className="inline-flex h-6 min-w-[38px] items-center justify-center rounded bg-slate-100 border border-slate-200 px-1.5 text-[8.5px] font-black tracking-tight text-slate-800">
                  InstaPay
                </span>
              </div>
            ) : null}
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                reloadDocument={shouldForceDocumentNavigation}
                className={`relative transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] ${
                  isIntruderNft
                    ? 'hover:text-primary'
                    : isEditorialSoftFooter
                      ? 'hover:text-[#5c263b]'
                      : isMenShoes
                        ? 'hover:text-[#f57a1d]'
                        : isSignaturePanelFooter
                          ? 'hover:text-[#41233a]'
                          : 'hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
