import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useCartStore } from '../store/useCartStore';
import { buildStorefrontPath } from '../utils/paths';
import type { UseSearchResult } from '../hooks/useSearch';

const ACCENT = '#e16244';

interface GracefulMenuProduct {
  title?: string;
  price?: string;
  comparePrice?: string;
  image?: string;
  link?: string;
  badge?: string;
  discount?: string;
}

interface GracefulMenuTab {
  label?: string;
  title?: string;
  link?: string;
  image?: string;
  products?: GracefulMenuProduct[];
}

interface GracefulDropdown {
  label?: string;
  items?: Array<{ label?: string; to?: string }>;
}

const TITAN_ONE_HREF =
  'https://fonts.googleapis.com/css2?family=Titan+One&display=swap';

const resolveHref = (to: string | undefined, fallback = '/shop') => {
  const target = (to || fallback).startsWith('/') ? to || fallback : `/${to || fallback}`;
  return target;
};

const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg
    className={className}
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const SocialIcon = ({ name }: { name: string }) => {
  switch (name) {
    case 'facebook':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 21v-7.8h2.62l.4-3.03H13.5V8.22c0-.88.24-1.48 1.5-1.48h1.6V4.06c-.28-.04-1.23-.12-2.34-.12-2.32 0-3.9 1.41-3.9 4v2.23H7.75v3.03h2.6V21h3.15Z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8L15.6 12 10 15.2Z" />
        </svg>
      );
    case 'twitter':
    case 'x':
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.9 3H21l-6.78 7.74L22.2 21h-6.24l-4.9-6.4L5.46 21H2.34l7.25-8.28L2 3h6.4l4.42 5.85L17.9 3Zm-1.1 16.1h1.72L7.6 4.8H5.75L16.8 19.1Z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.7 3c.36 2.1 1.9 3.72 4.3 3.9v3.03c-1.62.04-3.02-.42-4.3-1.24v6.5c0 3.6-2.44 5.81-5.53 5.81C8.2 21 6 18.86 6 16.1c0-2.86 2.4-5.06 5.62-4.87v3.1c-1.5-.28-2.6.55-2.6 1.77 0 1.1.86 1.9 1.98 1.9 1.3 0 2.16-.94 2.16-2.5V3h3.54Z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.32-.09-.8-.16-2.02.04-2.9.18-.8 1.16-5.06 1.16-5.06s-.3-.6-.3-1.48c0-1.38.8-2.42 1.8-2.42.86 0 1.26.64 1.26 1.4 0 .86-.54 2.14-.82 3.32-.24 1 .5 1.8 1.48 1.8 1.78 0 3.14-1.88 3.14-4.58 0-2.4-1.72-4.06-4.18-4.06-2.84 0-4.52 2.14-4.52 4.34 0 .86.34 1.78.74 2.28a.3.3 0 0 1 .06.28l-.28 1.14c-.04.18-.14.22-.32.14-1.18-.56-1.92-2.28-1.92-3.68 0-3 2.18-5.74 6.28-5.74 3.3 0 5.86 2.34 5.86 5.48 0 3.28-2.06 5.92-4.94 5.92-.96 0-1.86-.5-2.18-1.1l-.6 2.26c-.22.84-.8 1.88-1.2 2.52.9.28 1.86.44 2.86.44 5.52 0 10-4.48 10-10S17.52 2 12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

interface GracefulHeaderProps {
  search: UseSearchResult;
}

/**
 * GracefulHeader — Soft Graceful (Texture) fashion header:
 * dark utility bar with currency/language + rotating announcement + socials,
 * black main bar with display-font logo, dropdown/mega-menu navigation,
 * login + cart with live count badge.
 */
const GracefulHeader: React.FC<GracefulHeaderProps> = ({ search }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const setIsCartOpen = useCartStore((s) => s.setIsOpen);
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [activeMegaTab, setActiveMegaTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const header = theme.header;
  const brandName = (header?.brandName || 'Graceful').toUpperCase();
  const megaMenu = header?.megaMenu;
  const megaTabs: GracefulMenuTab[] = megaMenu?.tabs || [];
  const dropdowns: GracefulDropdown[] = header?.dropdowns || [];
  const socialLinks = (theme.footer?.socialLinks || {}) as Record<string, string | undefined>;

  const announcements = useMemo(
    () =>
      (header?.announcementText || '')
        .split('·')
        .map((part: string) => part.trim())
        .filter(Boolean),
    [header?.announcementText],
  );
  const announcement =
    announcements.length > 0
      ? announcements[announcementIndex % announcements.length]
      : '';

  useEffect(() => {
    const link = document.getElementById('graceful-titan-one-font') as HTMLLinkElement | null;
    if (link) return;
    const el = document.createElement('link');
    el.id = 'graceful-titan-one-font';
    el.rel = 'stylesheet';
    el.href = TITAN_ONE_HREF;
    document.head.appendChild(el);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (announcements.length < 2) return;
    const timer = setInterval(
      () => setAnnouncementIndex((prev) => (prev + 1) % announcements.length),
      5000,
    );
    return () => clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const navItems = header?.navigation || [];
  const homeTo = buildStorefrontPath(location.pathname, '/', location.search);
  const linkTo = (to: string) => buildStorefrontPath(location.pathname, to, location.search);

  const navRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const renderMegaProducts = (tab: GracefulMenuTab) => (
    <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-3">
      {(tab.products || []).slice(0, 3).map((product, index) => (
        <Link
          key={`${product.title}-${index}`}
          to={linkTo(resolveHref(product.link))}
          className="group flex flex-col overflow-hidden rounded-[14px] border border-black/[0.06] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-30px_rgba(0,0,0,0.35)]"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f5]">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title || 'product'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : null}
            {product.discount ? (
              <span className="absolute left-2 top-2 rounded-[4px] bg-[#e33629] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {product.discount}
              </span>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col gap-1 px-3 py-3">
            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[#171717] group-hover:text-[#e16244]">
              {product.title}
            </p>
            <p className="mt-auto flex items-baseline gap-1.5 text-[13px] font-bold text-[#171717]">
              {product.price}
              {product.comparePrice ? (
                <span className="text-[11px] font-normal text-[#9a9a9a] line-through">{product.comparePrice}</span>
              ) : null}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );

  const renderMegaMenu = () => {
    if (!megaMenu || megaTabs.length === 0 || openMenu !== 'mega') return null;
    const activeTab = megaTabs[Math.min(activeMegaTab, megaTabs.length - 1)];
    return (
      <div className="graceful-mega-panel absolute inset-x-0 top-full z-40 hidden md:block">
        <div className="mx-4 mt-1 rounded-b-[20px] border border-t-0 border-black/[0.06] bg-white shadow-[0_40px_80px_-40px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex max-w-[1360px] gap-8 px-8 py-8">
            <div className="w-[210px] shrink-0 border-r border-black/[0.07] pr-6">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-[#9a9a9a]">
                {megaMenu.triggerLabel || 'Categories'}
              </p>
              <div className="flex flex-col">
                {megaTabs.map((tab, index) => (
                  <button
                    key={`${tab.label}-${index}`}
                    type="button"
                    onMouseEnter={() => setActiveMegaTab(index)}
                    onFocus={() => setActiveMegaTab(index)}
                    className={`flex items-center justify-between rounded-lg px-3 py-3 text-start text-[15px] transition-colors ${
                      index === Math.min(activeMegaTab, megaTabs.length - 1)
                        ? 'bg-[#f6f6f6] font-semibold text-[#171717]'
                        : 'text-[#575757] hover:text-[#171717]'
                    }`}
                  >
                    {tab.label}
                    <span className="text-[#b3b3b3]">
                      <ChevronRight />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-semibold text-[#171717]">{activeTab?.title}</h3>
                <Link
                  to={linkTo(resolveHref(activeTab?.link || megaMenu.ctaLink))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#171717] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#e16244]"
                >
                  {megaMenu.ctaText || 'Shop Now'}
                </Link>
              </div>
              {renderMegaProducts(activeTab || {})}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDropdown = (item: GracefulDropdown) => {
    if (openMenu !== item.label) return null;
    return (
      <div className="graceful-dropdown-panel absolute left-1/2 top-full z-40 -translate-x-1/2 pt-2">
        <div className="min-w-[190px] rounded-xl border border-black/[0.06] bg-[#0d0d0d] py-2 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
          {(item.items || []).map((sub, index) => (
            <Link
              key={`${sub.label}-${index}`}
              to={linkTo(resolveHref(sub.to))}
              className="block px-5 py-2.5 text-center text-[13px] text-white/85 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const cartLabel = cartCount === 1 ? 'item' : 'items';

  return (
    <header className="sticky top-0 z-50 w-full" dir="ltr">
      {/* Utility bar */}
      <div className="hidden border-b border-white/10 bg-[#0a0a0a] text-white/85 md:block">
        <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-between px-6 text-[11px]">
          <div className="flex items-center gap-5">
            <button type="button" className="flex items-center gap-1.5 font-semibold tracking-[0.08em] transition-colors hover:text-white">
              USD $
              <ChevronDown className="opacity-70" />
            </button>
            <button type="button" className="flex items-center gap-1.5 font-semibold tracking-[0.08em] transition-colors hover:text-white">
              ENGLISH
              <ChevronDown className="opacity-70" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Previous announcement"
              onClick={() =>
                setAnnouncementIndex((prev) => (prev - 1 + Math.max(announcements.length, 1)) % Math.max(announcements.length, 1))
              }
              className="text-white/60 transition-colors hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <Link
              to={linkTo(resolveHref(header?.announcementLinkTo, '/shop'))}
              className="max-w-[420px] truncate text-center transition-colors hover:text-white"
              title={announcement}
            >
              {announcement}
            </Link>
            <button
              type="button"
              aria-label="Next announcement"
              onClick={() => setAnnouncementIndex((prev) => (prev + 1) % Math.max(announcements.length, 1))}
              className="text-white/60 transition-colors hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(socialLinks).map(([name, url]) =>
              url ? (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="text-white/70 transition-colors hover:text-white"
                >
                  <SocialIcon name={name} />
                </a>
              ) : null,
            )}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className={`relative border-b border-white/10 bg-[#0d0d0d] text-white transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)]' : ''
        }`}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-4 px-4 md:h-[68px] md:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          <Link to={homeTo} className="graceful-logo shrink-0" aria-label={brandName}>
            {brandName}
          </Link>

          {/* Desktop nav */}
          <div ref={navRef} className="relative hidden flex-1 justify-center md:flex">
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              {navItems.map((item) => {
                const isMegaTrigger =
                  Boolean(megaMenu) &&
                  megaTabs.length > 0 &&
                  item.label.trim().toLowerCase() ===
                    (megaMenu?.triggerLabel || '').trim().toLowerCase();
                const dropdown = dropdowns.find(
                  (candidate) =>
                    (candidate.label || '').trim().toLowerCase() === item.label.trim().toLowerCase(),
                );
                const isActiveRoute =
                  item.to === '/'
                    ? location.pathname === '/' || location.pathname.endsWith('/store')
                    : location.pathname.includes(item.to);
                return (
                  <div key={item.label} className="relative">
                    {isMegaTrigger || dropdown ? (
                      <button
                        type="button"
                        onMouseEnter={() => {
                          setOpenMenu(isMegaTrigger ? 'mega' : item.label);
                          if (isMegaTrigger) setActiveMegaTab(0);
                        }}
                        onFocus={() => setOpenMenu(isMegaTrigger ? 'mega' : item.label)}
                        className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-[14px] transition-colors ${
                          openMenu === (isMegaTrigger ? 'mega' : item.label) || isActiveRoute
                            ? 'text-[#e16244]'
                            : 'text-white/90 hover:text-[#e16244]'
                        }`}
                      >
                        {item.label}
                        <ChevronDown
                          className={`transition-transform duration-300 ${
                            openMenu === (isMegaTrigger ? 'mega' : item.label) ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        to={linkTo(item.to)}
                        className={`block rounded-lg px-3.5 py-2.5 text-[14px] transition-colors ${
                          isActiveRoute ? 'text-[#e16244]' : 'text-white/90 hover:text-[#e16244]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                    {dropdown ? renderDropdown(dropdown) : null}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Mega menu — rendered at main-bar level so it spans the full header width */}
          {renderMegaMenu()}

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
            <button
              type="button"
              aria-label="Search"
              onClick={() => search.setIsOpen(!search.isOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
            </button>
            <Link
              to={linkTo('/contact')}
              className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] text-white/90 transition-colors hover:text-[#e16244] lg:flex"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" />
              </svg>
              Login
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Shopping cart (${cartCount} ${cartLabel})`}
              className="relative flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] text-white/90 transition-colors hover:text-[#e16244]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <span className="hidden lg:inline">Cart</span>
              <span
                className="absolute -top-0.5 right-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white lg:-right-2"
                style={{ backgroundColor: ACCENT }}
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen ? (
          <div className="border-t border-white/10 bg-[#0d0d0d] px-4 pb-5 pt-2 md:hidden">
            {navItems.map((item) => {
              const megaMatch =
                Boolean(megaMenu) &&
                megaTabs.length > 0 &&
                item.label.trim().toLowerCase() === (megaMenu?.triggerLabel || '').trim().toLowerCase();
              const dropdown = dropdowns.find(
                (candidate) => (candidate.label || '').trim().toLowerCase() === item.label.trim().toLowerCase(),
              );
              const expandable = megaMatch || dropdown;
              const sectionKey = megaMatch ? 'mega' : item.label;
              const expanded = mobileSection === sectionKey;
              return (
                <div key={item.label} className="border-b border-white/[0.06] last:border-0">
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => setMobileSection(expanded ? null : sectionKey)}
                      className="flex w-full items-center justify-between py-3 text-[14px] text-white/90"
                    >
                      {item.label}
                      <ChevronDown className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link
                      to={linkTo(item.to)}
                      onClick={() => setMobileOpen(false)}
                      className="block py-3 text-[14px] text-white/90"
                    >
                      {item.label}
                    </Link>
                  )}
                  {expanded && megaMatch ? (
                    <div className="pb-3">
                      {megaTabs.map((tab, index) => (
                        <Link
                          key={`${tab.label}-${index}`}
                          to={linkTo(resolveHref(tab.link))}
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg px-3 py-2 text-[13px] text-white/70"
                        >
                          {tab.title || tab.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {expanded && dropdown ? (
                    <div className="pb-3">
                      {(dropdown.items || []).map((sub, index) => (
                        <Link
                          key={`${sub.label}-${index}`}
                          to={linkTo(resolveHref(sub.to))}
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-lg px-3 py-2 text-[13px] text-white/70"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="mt-4 flex items-center gap-3">
              <Link
                to={linkTo('/contact')}
                onClick={() => setMobileOpen(false)}
                className="flex-1 rounded-lg border border-white/20 py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-white"
              >
                Login
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setIsCartOpen(true);
                }}
                className="flex-1 rounded-lg py-2.5 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-white"
                style={{ backgroundColor: ACCENT }}
              >
                Cart ({cartCount})
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Search overlay */}
      {search.isOpen ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-black/[0.06] bg-white p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]" dir={theme.direction === 'rtl' ? 'rtl' : 'ltr'}>
          <div className="mx-auto max-w-[720px]">
            <div className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#9a9a9a]">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.2-3.2" />
              </svg>
              <input
                autoFocus
                value={search.query}
                onChange={(event) => search.setQuery(event.target.value)}
                placeholder="Search products…"
                className="w-full bg-transparent text-sm text-[#171717] outline-none placeholder:text-[#b3b3b3]"
              />
              <button type="button" aria-label="Close search" onClick={() => search.close()} className="text-[#9a9a9a] hover:text-[#171717]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {search.results.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-black/[0.06] bg-white">
                {search.results.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      search.close();
                      navigate(buildStorefrontPath(location.pathname, `/product/${product.slug || product.id}`, location.search));
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-[#f7f7f7]"
                  >
                    <span className="text-sm font-medium text-[#171717]">{product.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style>{`
        .graceful-logo {
          font-family: "Titan One", "Montserrat", sans-serif;
          font-size: 1.45rem;
          letter-spacing: 0.01em;
          color: #fff;
          text-shadow: 0 2px 0 rgba(0,0,0,0.55), 0 0 1px rgba(255,255,255,0.35);
          transform: rotate(-1.2deg);
          transition: transform 0.3s ease, color 0.3s ease;
          line-height: 1;
        }
        .graceful-logo:hover { transform: rotate(0deg) scale(1.03); }
        .graceful-mega-panel, .graceful-dropdown-panel {
          opacity: 0;
          transform: translateY(-6px);
          animation: gracefulMenuIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes gracefulMenuIn {
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .graceful-mega-panel, .graceful-dropdown-panel { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </header>
  );
};

export default GracefulHeader;
