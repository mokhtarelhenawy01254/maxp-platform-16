import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Grid3X3,
  Home,
  MessageCircle,
  Search,
  ShoppingBag,
  User,
  type LucideIcon,
} from 'lucide-react';
import { buildStorefrontPath } from '../utils/paths';
import { useCartStore } from '../store/useCartStore';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { isPharmacyThemeId } from '../utils/pharmacyThemes';
import { tokenManager } from '../../utils/tokenManager';

interface MobileBottomNavProps {
  onSearchOpen?: () => void;
}

type NavItem = {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  active: boolean;
  emphasized?: boolean;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
};

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onSearchOpen }) => {
  const location = useLocation();
  const { isOpen: isCartOpen, setIsOpen: setCartOpen } = useCartStore();
  const { theme } = useStorefrontTheme();

  const totalCartItems = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const isBiteRush = theme.id === 'restaurant-demo';
  const isCafeDemo = theme.id === 'cafe-demo';
  const isWomenFashion = theme.id === 'women-fashion-eg';
  const isMenShoes = theme.id === 'men-shoes-eg';
  const isPerfumeEg = theme.id === 'perfume-eg';
  const isVelaFashion =
    theme.id === 'vela-fashion-eg' &&
    theme.header?.variant?.trim().toLowerCase() !== 'legacy-default-old';
  const isPharmacy = isPharmacyThemeId(theme.id);

  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);

  // "حسابي" => main-app customer portal (NOT a /store route). If the customer is
  // already logged in, go straight to /account; otherwise open the WhatsApp OTP login.
  const isCustomerLoggedIn = (() => {
    try {
      const token = tokenManager.getAccessToken();
      if (!token) return false;
      return JSON.parse(atob(token.split('.')[1]))?.role === 'CUSTOMER';
    } catch {
      return false;
    }
  })();
  const buildAccountPath = () => {
    const target = isCustomerLoggedIn ? '/account' : '/auth/customer-register';
    const params = new URLSearchParams(location.search);
    const next = new URLSearchParams();
    ['companyId', 'previewTheme', 'previewSource', 'previewAdminOrigin'].forEach((key) => {
      const value = params.get(key);
      if (value) next.set(key, value);
    });
    const queryString = next.toString();
    return `${target}${queryString ? `?${queryString}` : ''}`;
  };
  const accountPath = buildAccountPath();

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isHome = normalizedPath === '/' || normalizedPath.endsWith('/store');
  const isShop = normalizedPath.includes('/shop') || normalizedPath.includes('/category');
  const isCart = normalizedPath.includes('/cart') || isCartOpen;
  const isAccount =
    normalizedPath.includes('/auth') || normalizedPath.startsWith('/account');
  const isProductDetail = normalizedPath.includes('/product');
  const isCheckoutFlow =
    normalizedPath.includes('/checkout') || normalizedPath.includes('/thank-you');

  const handleSearchClick = () => {
    onSearchOpen?.();
  };

  const handleCartClick = () => {
    setCartOpen(true);
  };

  if (isVelaFashion) {
    return null;
  }

  const isPortfolio =
    theme.id === 'creative-portfolio' ||
    theme.category?.primary?.id === 'creative' ||
    theme.header?.showCart === false;
  const showCart = theme.header?.showCart !== false;
  const showSearch = theme.header?.showSearch !== false;

  const rawItems: (NavItem | null)[] = [
    {
      key: 'home',
      labelAr: 'الرئيسية',
      labelEn: 'Home',
      icon: Home,
      active: isHome,
      href: homePath,
      ariaLabel: theme.direction === 'rtl' ? 'الرئيسية' : 'Home',
    },
    {
      key: 'shop',
      labelAr: isBiteRush ? 'المنيو' : isPortfolio ? 'أعمالنا' : 'التسوق',
      labelEn: isPortfolio ? 'Works' : 'Shop',
      icon: isPortfolio ? Briefcase : Grid3X3,
      active: isShop,
      href: shopPath,
      ariaLabel:
        theme.direction === 'rtl'
          ? isPortfolio
            ? 'أعمالنا'
            : 'المتجر'
          : isPortfolio
            ? 'Works'
            : 'Shop',
    },
    showSearch
      ? {
          key: 'search',
          labelAr: 'بحث',
          labelEn: 'Search',
          icon: Search,
          active: false,
          onClick: handleSearchClick,
          ariaLabel: theme.direction === 'rtl' ? 'بحث' : 'Search',
        }
      : null,
    showCart
      ? {
          key: 'cart',
          labelAr: 'السلة',
          labelEn: 'Cart',
          icon: ShoppingBag,
          active: isCart,
          emphasized: totalCartItems > 0,
          onClick: handleCartClick,
          ariaLabel:
            theme.direction === 'rtl'
              ? `سلة التسوق (${totalCartItems} منتجات)`
              : `Shopping cart (${totalCartItems} items)`,
        }
      : {
          key: 'contact',
          labelAr: 'تواصل',
          labelEn: 'Contact',
          icon: MessageCircle,
          active: normalizedPath.includes('/contact'),
          href: buildStorefrontPath(location.pathname, '/contact', location.search),
          ariaLabel: theme.direction === 'rtl' ? 'تواصل معنا' : 'Contact Us',
        },
    {
      key: 'account',
      labelAr: 'حسابي',
      labelEn: 'Account',
      icon: User,
      active: isAccount,
      href: accountPath,
      ariaLabel: theme.direction === 'rtl' ? 'حسابي' : 'My Account',
    },
  ];

  const items: NavItem[] = rawItems.filter((item): item is NavItem => item !== null);

  const biteRushDockStyle = {
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.55rem)',
  } as const;

  const defaultDockStyle = {
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)',
  } as const;

  const renderCartBadge = () => {
    if (totalCartItems <= 0) {
      return null;
    }

    return (
      <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#fff4e8] px-1 text-[9px] font-black text-[#111111] shadow-sm">
        {totalCartItems}
      </span>
    );
  };

  if (isBiteRush) {
    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={biteRushDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-center justify-between gap-1.5 rounded-[2rem] border border-[#312319] bg-[#111111]/96 px-2 py-2 shadow-[0_28px_90px_-26px_rgba(17,17,17,0.88)] backdrop-blur-2xl">
          {items.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const className = `relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[1.35rem] px-2 py-2 transition-all duration-200 ${
              item.active
                ? 'bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white shadow-[0_18px_46px_-24px_rgba(249,115,22,0.9)]'
                : item.emphasized
                  ? 'border border-white/10 bg-white/6 text-[#ffe1cf]'
                  : 'text-[#cdb09d] hover:bg-white/6 hover:text-white'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={20} strokeWidth={item.active ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className="text-[10px] font-black leading-none tracking-[0.04em]">
                  {label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  if (isCafeDemo) {
    if (isCheckoutFlow) {
      return null;
    }

    const cafeItems: NavItem[] = [
      items[0]!,
      items[1]!,
      items[3]!,
      items[2]!,
      items[4]!,
    ];

    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={defaultDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1.5 rounded-[2rem] border border-[#dbc1ab] bg-[rgba(33,24,18,0.96)] px-2 py-2 shadow-[0_28px_90px_-34px_rgba(33,24,18,0.7)] backdrop-blur-2xl">
          {cafeItems.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const isCartAction = item.key === 'cart';
            const className = `relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-all duration-200 ${
              isCartAction
                ? `min-h-[72px] rounded-[1.6rem] border border-[#fff0e2]/30 py-3 text-[#2c1d14] shadow-[0_26px_60px_-28px_rgba(214,167,122,0.58)] -translate-y-3 ${
                    item.active || item.emphasized
                      ? 'bg-[linear-gradient(135deg,#f1cfaf_0%,#d6a77a_100%)]'
                      : 'bg-[linear-gradient(135deg,#f7dec6_0%,#d6a77a_100%)]'
                  }`
                : item.active
                  ? 'min-h-[60px] rounded-[1.35rem] py-2 bg-[linear-gradient(135deg,#d6a77a_0%,#8c5e3c_100%)] text-white shadow-[0_18px_46px_-24px_rgba(214,167,122,0.45)]'
                  : item.emphasized
                    ? 'min-h-[60px] rounded-[1.35rem] border border-[#dbc1ab]/30 bg-white/8 py-2 text-[#f7dec6]'
                    : 'min-h-[60px] rounded-[1.35rem] py-2 text-[#d7b89c] hover:bg-white/8 hover:text-white'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={isCartAction ? 22 : 20} strokeWidth={item.active || isCartAction ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className={`font-black leading-none tracking-[0.04em] ${
                  isCartAction ? 'text-[11px]' : 'text-[10px]'
                }`}>
                  {item.key === 'shop' ? 'المنيو' : label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  if (isMenShoes) {
    if (isCheckoutFlow) {
      return null;
    }

    const menShoesItems: NavItem[] = [
      items[0]!,
      items[1]!,
      items[3]!,
      items[2]!,
      items[4]!,
    ];

    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={defaultDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1.5 rounded-[2rem] border border-[#d8c8bb] bg-[rgba(255,252,248,0.97)] px-2 py-2 shadow-[0_30px_90px_-36px_rgba(25,20,16,0.34)] backdrop-blur-2xl">
          {menShoesItems.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const isCartAction = item.key === 'cart';
            const className = `relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-all duration-200 ${
              isCartAction
                ? `min-h-[72px] rounded-[1.6rem] border border-[#fff5eb] py-3 text-white shadow-[0_28px_68px_-30px_rgba(245,122,29,0.62)] -translate-y-3 ${
                    item.active || item.emphasized
                      ? 'bg-[linear-gradient(135deg,#f57a1d_0%,#d65700_100%)]'
                      : 'bg-[linear-gradient(135deg,#fb923c_0%,#d97706_100%)]'
                  }`
                : item.active
                  ? 'min-h-[60px] rounded-[1.35rem] py-2 bg-[#1f262b] text-white shadow-[0_18px_46px_-24px_rgba(31,38,43,0.52)]'
                  : item.emphasized
                    ? 'min-h-[60px] rounded-[1.35rem] border border-[#e7d7c8] bg-white py-2 text-[#1f262b]'
                    : 'min-h-[60px] rounded-[1.35rem] py-2 text-[#4f4034] hover:bg-[#fff4ea] hover:text-[#1f262b]'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={isCartAction ? 22 : 20} strokeWidth={item.active || isCartAction ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className={`font-black leading-none tracking-[0.04em] ${
                  isCartAction ? 'text-[11px]' : 'text-[10px]'
                }`}>
                  {label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  if (isWomenFashion) {
    if (isCheckoutFlow || isHome || isProductDetail) {
      return null;
    }

    const womenFashionItems: NavItem[] = [
      items[0]!,
      items[1]!,
      items[3]!,
      items[2]!,
      items[4]!,
    ];

    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={defaultDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1.5 rounded-[2.15rem] border border-[#ebd7df] bg-[rgba(255,250,251,0.97)] px-2 py-2 shadow-[0_30px_88px_-40px_rgba(104,49,73,0.26)] backdrop-blur-2xl">
          {womenFashionItems.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const isCartAction = item.key === 'cart';
            const className = `relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-all duration-200 ${
              isCartAction
                ? `min-h-[72px] rounded-[1.7rem] border border-[#fff1f5] py-3 text-white shadow-[0_28px_68px_-32px_rgba(190,63,112,0.44)] -translate-y-3 ${
                    item.active || item.emphasized
                      ? 'bg-[linear-gradient(135deg,#be3f70_0%,#f05886_100%)]'
                      : 'bg-[linear-gradient(135deg,#d14d7c_0%,#f48fb1_100%)]'
                  }`
                : item.active
                  ? 'min-h-[60px] rounded-[1.4rem] py-2 bg-[linear-gradient(135deg,#5d253a_0%,#a93d63_100%)] text-white shadow-[0_18px_46px_-24px_rgba(93,37,58,0.42)]'
                  : item.emphasized
                    ? 'min-h-[60px] rounded-[1.4rem] border border-[#edd8df] bg-white py-2 text-[#5d253a]'
                    : 'min-h-[60px] rounded-[1.4rem] py-2 text-[#75505e] hover:bg-[#fff3f6] hover:text-[#5d253a]'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={isCartAction ? 22 : 20} strokeWidth={item.active || isCartAction ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className={`font-black leading-none tracking-[0.04em] ${
                  isCartAction ? 'text-[11px]' : 'text-[10px]'
                }`}>
                  {label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  if (isPerfumeEg) {
    if (isCheckoutFlow) {
      return null;
    }

    const perfumeItems: NavItem[] = [
      items[0]!,
      items[1]!,
      items[3]!,
      items[2]!,
      items[4]!,
    ];

    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={defaultDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1.5 rounded-[2.2rem] border border-[#dfd1c5] bg-[rgba(254,250,246,0.97)] px-2 py-2 shadow-[0_30px_92px_-38px_rgba(65,29,57,0.28)] backdrop-blur-2xl">
          {perfumeItems.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const isCartAction = item.key === 'cart';
            const className = `relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-all duration-200 ${
              isCartAction
                ? `min-h-[72px] rounded-[1.75rem] border border-[#fff2dc] py-3 text-white shadow-[0_30px_70px_-32px_rgba(92,57,64,0.44)] -translate-y-3 ${
                    item.active || item.emphasized
                      ? 'bg-[linear-gradient(135deg,#5b3940_0%,#9f7b43_100%)]'
                      : 'bg-[linear-gradient(135deg,#6d454d_0%,#c09758_100%)]'
                  }`
                : item.active
                  ? 'min-h-[60px] rounded-[1.45rem] py-2 bg-[linear-gradient(135deg,#41233a_0%,#6d454d_100%)] text-white shadow-[0_18px_46px_-24px_rgba(65,35,58,0.44)]'
                  : item.emphasized
                    ? 'min-h-[60px] rounded-[1.45rem] border border-[#eadfd7] bg-white py-2 text-[#5b3940]'
                    : 'min-h-[60px] rounded-[1.45rem] py-2 text-[#755f59] hover:bg-[#fff7ef] hover:text-[#5b3940]'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={isCartAction ? 22 : 20} strokeWidth={item.active || isCartAction ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className={`font-black leading-none tracking-[0.04em] ${
                  isCartAction ? 'text-[11px]' : 'text-[10px]'
                }`}>
                  {label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  if (isPharmacy) {
    if (isCheckoutFlow) {
      return null;
    }

    const pharmacyItems: NavItem[] = [
      items[0]!,
      items[1]!,
      items[3]!,
      items[2]!,
      items[4]!,
    ];

    return (
      <nav
        dir={theme.direction}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[88] px-3 md:hidden"
        style={defaultDockStyle}
      >
        <div className="pointer-events-auto mx-auto flex max-w-sm items-end justify-between gap-1.5 rounded-[2rem] border border-[#99f6e4] bg-[rgba(247,255,253,0.97)] px-2 py-2 shadow-[0_28px_90px_-34px_rgba(15,118,110,0.32)] backdrop-blur-2xl">
          {pharmacyItems.map((item) => {
            const Icon = item.icon;
            const label = theme.direction === 'rtl' ? item.labelAr : item.labelEn;
            const isCartAction = item.key === 'cart';
            const className = `relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-all duration-200 ${
              isCartAction
                ? `min-h-[72px] rounded-[1.6rem] border border-white/80 py-3 text-white shadow-[0_26px_60px_-28px_rgba(13,148,136,0.95)] -translate-y-3 ${
                    item.active || item.emphasized
                      ? 'bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)]'
                      : 'bg-[linear-gradient(135deg,#14b8a6_0%,#2dd4bf_100%)]'
                  }`
                : item.active
                  ? 'min-h-[60px] rounded-[1.35rem] py-2 bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_18px_46px_-24px_rgba(20,184,166,0.58)]'
                  : item.emphasized
                    ? 'min-h-[60px] rounded-[1.35rem] border border-[#99f6e4] bg-white py-2 text-[#0f766e]'
                    : 'min-h-[60px] rounded-[1.35rem] py-2 text-[#0f766e]/78 hover:bg-[#ecfdf9] hover:text-[#0f766e]'
            }`;

            const content = (
              <>
                <div className="relative">
                  <Icon size={isCartAction ? 22 : 20} strokeWidth={item.active || isCartAction ? 2.6 : 2} />
                  {item.key === 'cart' ? renderCartBadge() : null}
                </div>
                <span className={`font-black leading-none tracking-[0.04em] ${
                  isCartAction ? 'text-[11px]' : 'text-[10px]'
                }`}>
                  {label}
                </span>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-label={item.ariaLabel}
                className={className}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      dir={theme.direction}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-4 md:hidden"
      style={defaultDockStyle}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center justify-around rounded-[2.5rem] border border-border/40 bg-background/80 p-2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] backdrop-blur-2xl">
        {items.map((item) => {
          const Icon = item.icon;
          const className = `relative flex flex-1 flex-col items-center gap-1 rounded-2xl p-3 transition-all duration-300 ${
            item.active
              ? 'scale-110 text-primary'
              : item.emphasized
                ? 'text-foreground'
                : 'text-muted-foreground/60 hover:text-foreground'
          }`;

          const content = (
            <>
              <div className="relative">
                <Icon size={24} strokeWidth={item.active ? 2.5 : 1.5} />
                {item.key === 'cart' && totalCartItems > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">
                    {totalCartItems}
                  </span>
                ) : null}
              </div>
            </>
          );

          if (item.href) {
            return (
              <Link key={item.key} to={item.href} aria-label={item.ariaLabel} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-label={item.ariaLabel}
              className={className}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
