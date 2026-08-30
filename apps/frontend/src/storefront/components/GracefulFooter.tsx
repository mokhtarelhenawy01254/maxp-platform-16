import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';

const SocialIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'facebook':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-7.8h2.62l.4-3.03H13.5V8.22c0-.88.24-1.48 1.5-1.48h1.6V4.06c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.41-3.9 4v2.23H7.75v3.03h2.6V21h3.15Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.7 3c.36 2.1 1.9 3.72 4.3 3.9v3.03c-1.62.04-3.02-.42-4.3-1.24v6.5c0 3.6-2.44 5.81-5.53 5.81C8.2 21 6 18.86 6 16.1c0-2.86 2.4-5.06 5.62-4.87v3.1c-1.5-.28-2.6.55-2.6 1.77 0 1.1.86 1.9 1.98 1.9 1.3 0 2.16-.94 2.16-2.5V3h3.54Z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.32-.09-.8-.16-2.02.04-2.9.18-.8 1.16-5.06 1.16-5.06s-.3-.6-.3-1.48c0-1.38.8-2.42 1.8-2.42.86 0 1.26.64 1.26 1.4 0 .86-.54 2.14-.82 3.32-.24 1 .5 1.8 1.48 1.8 1.78 0 3.14-1.88 3.14-4.58 0-2.4-1.72-4.06-4.18-4.06-2.84 0-4.52 2.14-4.52 4.34 0 .86.34 1.78.74 2.28a.3.3 0 0 1 .06.28l-.28 1.14c-.04.18-.14.22-.32.14-1.18-.56-1.92-2.28-1.92-3.68 0-3 2.18-5.74 6.28-5.74 3.3 0 5.86 2.34 5.86 5.48 0 3.28-2.06 5.92-4.94 5.92-.96 0-1.86-.5-2.18-1.1l-.6 2.26c-.22.84-.8 1.88-1.2 2.52.9.28 1.86.44 2.86.44 5.52 0 10-4.48 10-10S17.52 2 12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

const PaymentBadge = ({ label }: { label: string }) => (
  <span className="inline-flex h-6 min-w-[42px] items-center justify-center rounded-[4px] bg-white px-1.5 text-[8px] font-black uppercase italic tracking-tight text-[#1a1a6e]">
    {label}
  </span>
);

/**
 * GracefulFooter — Soft Graceful (Texture) dark footer: radial bronze glow,
 * display logo + newsletter column, link columns, contact row, payment badges.
 */
const GracefulFooter: React.FC = () => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  const footer = theme.footer;
  const brandName =
    (footer as { brandName?: string } | undefined)?.brandName ||
    theme.header?.brandName ||
    theme.name ||
    'Graceful';
  const navGroups = footer?.navigation || [];
  const legalLinks = footer?.legalLinks || [];
  const contactRows = footer?.contactRows || [];
  const socialLinks = (footer?.socialLinks || {}) as Record<string, string | undefined>;
  const copyright = footer?.copyrightText || `© ${new Date().getFullYear()} ${brandName}`;
  const description = footer?.description || '';

  const linkTo = (to: string) =>
    buildStorefrontPath(location.pathname, to.startsWith('/') ? to : `/${to}`, location.search);

  return (
    <footer
      dir={theme.direction === 'rtl' ? 'rtl' : 'ltr'}
      className="relative w-full overflow-hidden text-white"
      style={{
        background:
          'radial-gradient(1100px 520px at 50% 118%, #6e4a33 0%, #3a2317 34%, #191009 68%, #0d0906 100%)',
      }}
    >
      <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-14 md:px-10 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
          {/* Brand + newsletter */}
          <div className="lg:border-e lg:border-white/10 lg:pe-12">
            <p
              className="graceful-footer-logo"
              style={{ fontFamily: '"Titan One", "Montserrat", sans-serif' }}
            >
              {String(brandName).toUpperCase()}
            </p>
            <h3 className="mt-6 font-heading text-2xl font-semibold leading-snug">
              Get 20% off for your first order.
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-white/70">{description}</p>
            <form
              className="mt-6 flex max-w-sm flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (email.trim()) setSubscribed(true);
              }}
            >
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address"
                className="h-12 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/45 focus:border-white/40"
              />
              <button
                type="submit"
                className="h-12 w-fit rounded-lg bg-white px-7 text-sm font-bold text-[#171717] transition-transform duration-300 hover:scale-[1.03]"
              >
                {subscribed ? 'Subscribed ✓' : 'Subscribe Now'}
              </button>
            </form>
            <div className="mt-7 flex items-center gap-3">
              {Object.entries(socialLinks).map(([name, url]) =>
                url ? (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 transition-all duration-300 hover:border-white/40 hover:text-white"
                  >
                    <SocialIcon name={name} />
                  </a>
                ) : null,
              )}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-10 sm:grid-cols-3">
            {navGroups.slice(0, 2).map((group) => (
              <div key={group.title}>
                <h4 className="font-heading text-lg font-semibold">{group.title}</h4>
                <ul className="mt-5 space-y-3.5">
                  {(group.links || []).map((link) => (
                    <li key={link.label}>
                      <Link
                        to={linkTo(link.to)}
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="font-heading text-lg font-semibold">Information</h4>
              <ul className="mt-5 space-y-3.5">
                {legalLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={linkTo(link.to)}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                {contactRows[0] ? (
                  <li>
                    <a
                      href={contactRows[0].href || '#'}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {contactRows[0].value}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>

        {/* Contact row */}
        {contactRows.length > 0 ? (
          <div className="mt-12 grid gap-8 border-t border-white/10 pt-8 sm:grid-cols-3">
            {contactRows.map((row) => (
              <div key={row.label}>
                <p className="font-heading text-base font-semibold">{row.label} :</p>
                {row.href ? (
                  <a href={row.href} className="mt-2 block text-sm text-white/65 transition-colors hover:text-white">
                    {row.value}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-white/65">{row.value}</p>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/10 bg-black/35">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-5 py-4 text-[12px] text-white/60 md:flex-row md:px-10">
          <p>{copyright}</p>
          <div className="flex items-center gap-1.5">
            <PaymentBadge label="VISA" />
            <PaymentBadge label="MC" />
            <PaymentBadge label="AME X" />
            <PaymentBadge label="PayPal" />
            <PaymentBadge label="DISCOVER" />
          </div>
        </div>
      </div>

      <style>{`
        .graceful-footer-logo {
          font-size: 2rem;
          letter-spacing: 0.01em;
          color: #fff;
          text-shadow: 0 3px 0 rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.3);
          transform: rotate(-1.2deg);
          line-height: 1.1;
        }
      `}</style>
    </footer>
  );
};

export default GracefulFooter;
