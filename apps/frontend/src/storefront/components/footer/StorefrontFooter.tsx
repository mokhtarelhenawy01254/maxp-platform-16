import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStorefrontTheme } from "../../engine/ThemeProvider";
import { buildStorefrontPath, getStorefrontProductRouteKey } from "../../utils/paths";
import { useStorefrontSettings } from "../../hooks/useStorefrontSettings";
import { formatStorefrontCurrency } from "../../utils/currency";
import { sanitizeStorefrontHtml } from "../../utils/html";
import GracefulFooter from "../GracefulFooter";
import AutomotiveFooter from "./AutomotiveFooter";
import StorefrontProductImage from "../StorefrontProductImage";
import { getProductImageCandidates } from "../../utils/productImages";
import { shouldStorefrontForceDocumentNavigation } from "../../utils/navigationGuards";
import { footerSettingsService, type FooterSettings } from "../../../services/footerSettingsService";
import { StorefrontHomeLink } from "../header/StorefrontHeader";
import type { Product } from "../../hooks/useProducts";
const StorefrontFooter: React.FC<{ isMinimal?: boolean }> = ({ isMinimal }) => {
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const location = useLocation();

  // Fetch footerSettings from API (user's custom footer data from settings page)
  const [footerSettings, setFooterSettings] = useState<FooterSettings | null>(null);

  useEffect(() => {
    const companyId = settings?.company?.id;
    if (!companyId) return;

    let isMounted = true;
    const fetchFooter = () => {
      footerSettingsService
        .getPublicSettings(companyId)
        .then((res) => {
          if (isMounted && res?.success && res?.data) {
            setFooterSettings(res.data as FooterSettings);
          }
        })
        .catch(() => {
          // Ignore errors, theme.footer will be used as fallback
        });
    };

    // Defer footer settings request so it never competes with above-the-fold catalog images
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(fetchFooter, { timeout: 2500 });
      return () => {
        isMounted = false;
        if ("cancelIdleCallback" in window) {
          (window as any).cancelIdleCallback(handle);
        }
      };
    } else {
      const timer = setTimeout(fetchFooter, 1000);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [settings?.company?.id]);
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const shouldForceDocumentNavigation =
    shouldStorefrontForceDocumentNavigation(
      theme.id,
      Boolean(getStorefrontProductRouteKey(normalizedPath)),
    );
  const isHomePath = normalizedPath === '/' || normalizedPath.endsWith('/store');
  const isAtelierNova = theme.id === 'atelier-nova';
  const isCartPath = normalizedPath.endsWith('/cart');
  const isCheckoutPath = normalizedPath.endsWith('/checkout');
  const isThankYouPath = normalizedPath.endsWith('/thank-you');
  const isAtelierNovaCommercePath =
    isAtelierNova && (isCartPath || isCheckoutPath || isThankYouPath);
  const isSoleaFemme = theme.id === 'solea-femme';
  const isIntruderNft = theme.id === 'intruder-nft';
  const isMenShoes = theme.id === 'men-shoes-eg';
  const isPcHub = theme.id === 'pc-hub-eg';
  const isMensGroomingPro = theme.id === 'mens-grooming-pro';
  const footerVariant = theme.footer?.variant?.trim().toLowerCase() || 'default';
  // Soft Graceful — dedicated Texture-style dark footer
  if (theme.id === 'soft-graceful') {
    return <GracefulFooter />;
  }
  const isEditorialSoftFooter = footerVariant === 'editorial-soft';
  const isUtilityFrameFooter = footerVariant === 'utility-frame';
  const isSignaturePanelFooter = footerVariant === 'signature-panel';
  const isDigitalCommandFooter = footerVariant === 'digital-command';
  const isFashionRetailFooter = footerVariant === 'fashion-retail';
  const isButcherAtelierFooter = footerVariant === 'butcher-atelier';
  const isLegacyDefaultOldFooter = footerVariant === 'legacy-default-old';
  const isVelaFashionFooter = footerVariant === 'vela-fashion';
  const isAutomotiveChassis = theme.id === 'redline-auto' || footerVariant === 'automotive-chassis';
  const isThemePreview = new URLSearchParams(location.search).has('previewTheme');
  const isFastlyTheme = theme.id === 'fastly-eg';
  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const displayStoreName =
    (isThemePreview && theme.header?.brandName) ||
    settings?.storefront?.settings?.storeName ||
    theme.header?.brandName ||
    settings?.company?.name ||
    theme.name;
  const runtimeStoreName =
    settings?.storefront?.settings?.storeName ||
    settings?.company?.name ||
    '';
  const themeBrandNames = [theme.header?.brandName, theme.name].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  const isAppliedRuntimeStorefront =
    !isThemePreview &&
    Boolean(runtimeStoreName) &&
    themeBrandNames.some((brandName) => brandName.trim() !== runtimeStoreName.trim());
  const replaceThemeBrandText = (value?: string | null): string => {
    if (!value) {
      return '';
    }

    return themeBrandNames.reduce((text, brandName) => {
      const trimmedBrandName = brandName.trim();
      if (!trimmedBrandName || trimmedBrandName === displayStoreName) {
        return text;
      }

      const escapedBrandName = trimmedBrandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return text.replace(new RegExp(escapedBrandName, 'g'), displayStoreName);
    }, value);
  };

  // Build merged footer: footerSettings (user's data from settings page) takes priority over theme.footer
  const mergedFooterDescription = footerSettings?.aboutStore
    ? replaceThemeBrandText(footerSettings.aboutStore)
    : replaceThemeBrandText(theme.footer?.description);

  const mergedFooterCopyright = footerSettings?.copyrightText
    ? replaceThemeBrandText(footerSettings.copyrightText.replace('{year}', new Date().getFullYear().toString()))
    : replaceThemeBrandText(theme.footer?.copyrightText);

  // Build contact rows from footerSettings (user settings) or fall back to theme
  const mergedFooterContactRows = (() => {
    const rows: Array<{ label: string; value: string; href?: string }> = [];
    if (footerSettings?.phone && footerSettings.showPhone) {
      rows.push({
        label: theme.direction === 'rtl' ? 'الهاتف' : 'Phone',
        value: footerSettings.phone,
        href: `tel:${footerSettings.phone}`,
      });
    }
    if (footerSettings?.email && footerSettings.showEmail) {
      rows.push({
        label: theme.direction === 'rtl' ? 'البريد الإلكتروني' : 'Email',
        value: footerSettings.email,
        href: `mailto:${footerSettings.email}`,
      });
    }
    if (footerSettings?.address && footerSettings.showAddress) {
      rows.push({
        label: theme.direction === 'rtl' ? 'العنوان' : 'Address',
        value: footerSettings.address,
      });
    }
    // If no user settings and not a live applied storefront, fall back to theme contact rows
    if (rows.length === 0 && !isAppliedRuntimeStorefront && theme.footer?.contactRows) {
      return theme.footer.contactRows.filter(
        (row): row is { label: string; value: string; href?: string } => Boolean(row?.label && row?.value),
      );
    }
    return rows;
  })();

  // Build social links: only the user's footer settings links are collected here
  // so they can take priority when merged in `socialIcons` below. Theme defaults
  // are spread first there — previously they were also included here and, being
  // spread last, silently overrode the store's real links (facebook/instagram/
  // whatsapp stayed on demo values while tiktok worked). footerSettings also
  // carries non-social string fields (aboutStore/email/phone/copyrightText/
  // address) which the allow-list filters out.
  const mergedFooterSocialLinks = normalizeSocialLinks(
    footerSettings?.socialLinks || footerSettings,
    [
      'facebook', 'instagram', 'whatsapp', 'messenger', 'x', 'twitter',
      'youtube', 'tiktok', 'snapchat', 'linkedin', 'telegram', 'pinterest',
      'ticktok', 'snap', 'x.com', 'twitter.com', 'instagram.com',
      'facebook.com', 'whatsapp.com', 'wa.me', 'tiktok.com', 'youtube.com',
      'linkedin.com', 'telegram.com', 'pinterest.com',
    ],
  );

  const runtimeStorefrontSettings =
    settings?.storefront?.settings && typeof settings.storefront.settings === 'object'
      ? (settings.storefront.settings as Record<string, unknown>)
      : {};
  const runtimeDesignTokens =
    settings?.storefront?.designTokens && typeof settings.storefront.designTokens === 'object'
      ? (settings.storefront.designTokens as Record<string, unknown>)
      : {};
  function normalizeSocialLinks(
    value: unknown,
    allowedKeys?: string[],
  ): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const allowed = allowedKeys?.length
      ? new Set(allowedKeys.map((key) => key.toLowerCase()))
      : null;

    return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
      (links, [key, url]) => {
        if (typeof url === 'string' && url.trim()) {
          if (allowed && !allowed.has(key.trim().toLowerCase())) {
            return links;
          }
          links[key] = url.trim();
        }
        return links;
      },
      {},
    );
  }
  const getRuntimeFooterValue = (...keys: string[]): string =>
    keys
      .map((key) => runtimeStorefrontSettings[key])
      .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      ?.trim() || '';
  const runtimePhoneValue = getRuntimeFooterValue(
    'phone',
    'phoneNumber',
    'supportPhone',
    'whatsapp',
    'whatsappNumber',
  );
  const runtimeEmailValue = getRuntimeFooterValue(
    'email',
    'supportEmail',
    'contactEmail',
  );
  const runtimeFooterContactRows = [
    runtimePhoneValue
      ? {
          label: theme.direction === 'rtl' ? 'واتساب' : 'WhatsApp',
          value: runtimePhoneValue,
          href: runtimePhoneValue.replace(/\D/g, '')
            ? `https://wa.me/${runtimePhoneValue.replace(/\D/g, '')}`
            : undefined,
        }
      : null,
    runtimeEmailValue
      ? {
          label: theme.direction === 'rtl' ? 'البريد' : 'Email',
          value: runtimeEmailValue,
          href: `mailto:${runtimeEmailValue}`,
        }
      : null,
  ].filter(
    (
      row,
    ): row is {
      label: string;
      value: string;
      href?: string;
    } => Boolean(row?.value),
  );
  const footerCopyrightText = mergedFooterCopyright;
  const footerDescriptionText = mergedFooterDescription;

  const footerLinksData = theme.footer?.navigation?.map((group) => ({
    title: group.title,
    links: group.links.map((link) => ({
      label: link.label,
      to: buildStorefrontPath(location.pathname, link.to, location.search),
    })),
  })) || [
    {
      title: theme.direction === "rtl" ? "المتجر" : "Shop",
      links: [
        {
          label: theme.direction === "rtl" ? "كل المنتجات" : "All Products",
          to: shopPath,
        },
        {
          label: theme.direction === "rtl" ? "وصل حديثاً" : "New Arrivals",
          to: shopPath,
        },
      ],
    },
    {
      title: theme.direction === "rtl" ? "الدعم" : "Support",
      links: [
        {
          label: theme.direction === "rtl" ? "اتصل بنا" : "Contact Us",
          to: homePath,
        },
        {
          label: theme.direction === "rtl" ? "الأسئلة الشائعة" : "FAQs",
          to: homePath,
        },
      ],
    },
  ];

  const customSocialLinks = {
    ...normalizeSocialLinks(runtimeStorefrontSettings.socialLinks),
    ...normalizeSocialLinks(runtimeDesignTokens.socialLinks),
    ...mergedFooterSocialLinks, // User footer settings take priority
  };
  const hasCustomSocialLinks = Object.values(customSocialLinks).some((url) => Boolean(url && url.trim()));

  const socialIcons = hasCustomSocialLinks
    ? customSocialLinks
    : isAppliedRuntimeStorefront
      ? {}
      : theme.footer?.socialLinks || {};
  const legalLinks = theme.footer?.legalLinks?.map((link) => ({
    label: link.label,
    to: buildStorefrontPath(location.pathname, link.to, location.search),
  })) || [];
  const themeFooterContactRows = Array.isArray(theme.footer?.contactRows)
    ? theme.footer.contactRows.filter(
        (
          row,
        ): row is {
          label: string;
          value: string;
          href?: string;
        } => Boolean(row?.label && row?.value),
      )
    : [];
  const footerContactRows = mergedFooterContactRows.length
    ? mergedFooterContactRows
    : runtimeFooterContactRows.length
      ? runtimeFooterContactRows
      : isAppliedRuntimeStorefront
        ? []
        : themeFooterContactRows;

  if (isAutomotiveChassis && !isMinimal) {
    return (
      <AutomotiveFooter
        displayStoreName={displayStoreName}
        descriptionText={footerDescriptionText}
        copyrightText={footerCopyrightText}
        contactRows={footerContactRows}
        socialIcons={socialIcons}
        linksData={footerLinksData}
        legalLinks={legalLinks}
        shouldForceDocumentNavigation={shouldForceDocumentNavigation}
        direction={theme.direction}
      />
    );
  }

  const velaFooterContactRows = [
    {
      key: 'address',
      label: 'Address',
      value: theme.footer?.addressText,
      href: undefined as string | undefined,
    },
    {
      key: 'phone',
      label: 'Phone',
      value: theme.footer?.phoneText,
      href: theme.footer?.phoneText ? `tel:${theme.footer.phoneText}` : undefined,
    },
    {
      key: 'email',
      label: 'Email',
      value: theme.footer?.emailText,
      href: theme.footer?.emailText ? `mailto:${theme.footer.emailText}` : undefined,
    },
  ].filter(
    (
      row,
    ): row is {
      key: 'address' | 'phone' | 'email';
      label: string;
      value: string;
      href?: string;
    } => Boolean(row.value),
  );
  const resolveVelaFooterHref = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return '#';
    }

    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    return buildStorefrontPath(
      location.pathname,
      trimmed,
      location.search,
    );
  };
  const renderVelaFooterIcon = (icon: 'address' | 'phone' | 'email' | 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'tiktok' | 'snapchat' | 'whatsapp') => {
    switch (icon) {
      case 'address':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
            <circle cx="12" cy="11" r="2.5" />
          </svg>
        );
      case 'phone':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.77 19.77 0 0 1-8.63-3.07 19.3 19.3 0 0 1-6-6A19.77 19.77 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.79.62 2.65a2 2 0 0 1-.45 2.11L8 9.77a16 16 0 0 0 6.23 6.23l1.29-1.28a2 2 0 0 1 2.11-.45c.86.29 1.75.5 2.65.62A2 2 0 0 1 22 16.92Z" />
          </svg>
        );
      case 'email':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        );
      case 'facebook':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M13.5 22v-8.1h2.7l.4-3.1h-3.1V8.8c0-.9.3-1.6 1.7-1.6h1.5V4.4c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.9v2.2H8v3.1h2.8V22h2.7Z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
            <circle cx="12" cy="12" r="3.8" />
            <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
          </svg>
        );
      case 'youtube':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M21.4 7.2a2.9 2.9 0 0 0-2-2C17.7 4.7 12 4.7 12 4.7s-5.7 0-7.4.5a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.6 4.8a2.9 2.9 0 0 0 2 2c1.7.5 7.4.5 7.4.5s5.7 0 7.4-.5a2.9 2.9 0 0 0 2-2c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8ZM10 15.6V8.4l6 3.6-6 3.6Z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.06 2.06 0 1 0 5.3 7.12 2.06 2.06 0 0 0 5.25 3ZM20.44 12.5c0-3.47-1.85-5.08-4.32-5.08-2 0-2.89 1.1-3.39 1.88V8.5H9.35V20h3.38v-6.37c0-1.67.31-3.29 2.39-3.29 2.05 0 2.08 1.92 2.08 3.4V20h3.38l-.14-7.5Z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="currentColor">
            <path d="M18.9 2H22l-6.77 7.74L23 22h-6.06l-4.74-6.2L6.77 22H3.66l7.23-8.27L1 2h6.22l4.28 5.67L18.9 2Zm-1.07 18h1.68L6.31 3.9H4.5L17.83 20Z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M14.7 3h2.9c.2 1.7 1.3 3.2 3 3.8v2.9a7.06 7.06 0 0 1-3-.8v5.6a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.7 2.4V3Z" />
          </svg>
        );
      case 'snapchat':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M12 2.7c2.5 0 4.3 1.9 4.3 4.4 0 .7-.1 1.4-.3 2 .3.4.7.7 1.3.9.6.2 1.2.4 1.8.5.3.1.5.3.5.6 0 .6-1 .9-1.7 1.1-.4.1-.8.3-.9.5-.5 1.1-1.5 1.9-2.8 2.2-.2.8-.9 1.4-1.8 1.4s-1.6-.6-1.8-1.4c-1.3-.3-2.3-1.1-2.8-2.2-.1-.2-.5-.4-.9-.5-.7-.2-1.7-.5-1.7-1.1 0-.3.2-.5.5-.6.6-.1 1.2-.3 1.8-.5.6-.2 1-.5 1.3-.9-.2-.6-.3-1.3-.3-2C7.7 4.6 9.5 2.7 12 2.7Z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="currentColor">
            <path d="M20 11.8A8 8 0 0 1 8.3 19l-4.3 1.3L5.4 16A8 8 0 1 1 20 11.8Zm-4.7 1.9c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.1-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.26 7.26 0 0 1-1.3-1.6c-.1-.2 0-.3.1-.5l.3-.4.2-.4c.1-.1 0-.3 0-.4s-.5-1.3-.7-1.8c-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4a9.94 9.94 0 0 0 3.8 3.3c.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.2-.5 1.4-.9.2-.4.2-.8.1-.9-.1-.1-.3-.2-.5-.3Z" />
          </svg>
        );
      default:
        return null;
    }
  };
  const renderStorefrontSocialBrandIcon = (
    social: string,
    className = 'h-[15px] w-[15px]',
  ): React.ReactNode => {
    const key = String(social || '').trim().toLowerCase();
    const filledSvg = (path: string, size = '15') => (
      <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d={path} />
      </svg>
    );

    if (key === 'facebook' || key === 'fb' || key === 'facebook.com') {
      return filledSvg('M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z');
    }

    if (key === 'instagram' || key === 'insta' || key === 'ig') {
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    }

    if (key === 'whatsapp' || key === 'wa' || key === 'whatsapp.com' || key === 'واتساب') {
      return filledSvg('M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z');
    }

    if (key === 'messenger' || key === 'm.me' || key === 'facebook-messenger') {
      return filledSvg('M12 0C5.373 0 0 4.974 0 11.111c0 3.353 1.655 6.353 4.242 8.305V24l3.895-2.135c1.16.325 2.384.502 3.672.502h.09C18.438 22.367 24 17.4 24 11.111 24 4.974 18.627 0 12 0zm0 2c5.514 0 10 4.088 10 9.111 0 5.035-4.486 9.122-10 9.122-1.19 0-2.34-.189-3.418-.536l-.417-.135-2.586 1.418.502-2.403-.267-.427A8.926 8.926 0 012 11.11C2 6.089 6.486 2 12 2zm.874 7.283l-5.119 5.432 4.646-2.583 2.35 2.625 5.014-5.36-4.677 2.48z');
    }

    if (key === 'x' || key === 'twitter' || key === 'x.com' || key === 'twitter.com') {
      return filledSvg('M18.9 2H22l-6.77 7.74L23 22h-6.06l-4.74-6.2L6.77 22H3.66l7.23-8.27L1 2h6.22l4.28 5.67L18.9 2Zm-1.07 18h1.68L6.31 3.9H4.5L17.83 20Z', '14');
    }

    if (key === 'youtube' || key === 'yt' || key === 'youtube.com') {
      return filledSvg('M21.4 7.2a2.9 2.9 0 0 0-2-2C17.7 4.7 12 4.7 12 4.7s-5.7 0-7.4.5a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.6 4.8a2.9 2.9 0 0 0 2 2c1.7.5 7.4.5 7.4.5s5.7 0 7.4-.5a2.9 2.9 0 0 0 2-2c.6-1.7.6-4.8.6-4.8s0-3.1-.6-4.8ZM10 15.6V8.4l6 3.6-6 3.6Z');
    }

    if (key === 'tiktok' || key === 'ticktok' || key === 'tiktok.com') {
      return filledSvg('M14.7 3h2.9c.2 1.7 1.3 3.2 3 3.8v2.9a7.06 7.06 0 0 1-3-.8v5.6a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3a2.5 2.5 0 1 0 1.7 2.4V3Z');
    }

    if (key === 'snapchat' || key === 'snap') {
      return filledSvg('M12 2.7c2.5 0 4.3 1.9 4.3 4.4 0 .7-.1 1.4-.3 2 .3.4.7.7 1.3.9.6.2 1.2.4 1.8.5.3.1.5.3.5.6 0 .6-1 .9-1.7 1.1-.4.1-.8.3-.9.5-.5 1.1-1.5 1.9-2.8 2.2-.2.8-.9 1.4-1.8 1.4s-1.6-.6-1.8-1.4c-1.3-.3-2.3-1.1-2.8-2.2-.1-.2-.5-.4-.9-.5-.7-.2-1.7-.5-1.7-1.1 0-.3.2-.5.5-.6.6-.1 1.2-.3 1.8-.5.6-.2 1-.5 1.3-.9-.2-.6-.3-1.3-.3-2C7.7 4.6 9.5 2.7 12 2.7Z');
    }

    if (key === 'linkedin' || key === 'linkedin.com') {
      return filledSvg('M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A2.06 2.06 0 1 0 5.3 7.12 2.06 2.06 0 0 0 5.25 3ZM20.44 12.5c0-3.47-1.85-5.08-4.32-5.08-2 0-2.89 1.1-3.39 1.88V8.5H9.35V20h3.38v-6.37c0-1.67.31-3.29 2.39-3.29 2.05 0 2.08 1.92 2.08 3.4V20h3.38l-.14-7.5Z');
    }

    if (key === 'telegram' || key === 'tg' || key === 'telegram.com') {
      return filledSvg('M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z');
    }

    if (key === 'pinterest' || key === 'pinterest.com') {
      return filledSvg('M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z');
    }

    return null;
  };
  const velaSocialOrder = [
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'twitter',
    'tiktok',
    'snapchat',
    'whatsapp',
  ] as const;
  const velaSocialEntries = velaSocialOrder
    .map((key) => [key, socialIcons[key]] as const)
    .filter((entry): entry is readonly [typeof velaSocialOrder[number], string] => Boolean(entry[1]));

  if (isMensGroomingPro && !isMinimal) {
    const mgSocialIcons: Record<string, { href: string; label: string; d: string }> = {
      facebook: { href: socialIcons.facebook, label: 'Facebook', d: 'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.93H7.9V12H10V9.8c0-2.07 1.23-3.22 3.12-3.22.9 0 1.85.16 1.85.16v2.03h-1.04c-1.03 0-1.35.64-1.35 1.29V12h2.3l-.37 2.87h-1.93v6.93c4.56-.93 8-4.96 8-9.8Z' },
      instagram: { href: socialIcons.instagram, label: 'Instagram', d: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07Zm0 4.5a5.34 5.34 0 1 0 0 10.68 5.34 5.34 0 0 0 0-10.68Zm0 8.8a3.46 3.46 0 1 1 0-6.92 3.46 3.46 0 0 1 0 6.92Zm6.8-9.2a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z' },
      twitter: { href: socialIcons.twitter || socialIcons.x, label: 'Twitter', d: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z' },
      youtube: { href: socialIcons.youtube, label: 'YouTube', d: 'M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z' },
    };
    const mgSocialEntries = Object.entries(mgSocialIcons).filter(([, v]) => Boolean(v.href));
    return (
      <footer dir={theme.direction} className="border-t border-[#e8e8e8] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-3 px-4 py-6 md:flex-row md:justify-between md:px-6">
          <p className="text-sm text-[#666]">{footerCopyrightText}</p>
          <nav className="flex flex-wrap items-center justify-center gap-5">
            {legalLinks.map((link) => (
              <Link key={link.label} to={link.to} reloadDocument={shouldForceDocumentNavigation} className="text-sm text-[#19212B] hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
          {mgSocialEntries.length ? (
            <div className="flex items-center gap-3">
              {mgSocialEntries.map(([key, v]) => (
                <a key={key} href={v.href} target="_blank" rel="noopener noreferrer" aria-label={v.label} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f1f1] text-[#19212B] transition-colors hover:bg-[#19212B] hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={v.d} /></svg>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    );
  }

  if (isButcherAtelierFooter) {
    return (
      <footer dir={theme.direction} className="border-t border-[#37312c] bg-[#080706] text-[#f4ead8]">
        <div className="container px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 border-y border-[#37312c] py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
            <div className="space-y-5">
              <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                Premium butcher shop
              </span>
              <h2 className="font-heading text-[2.2rem] font-black leading-tight text-[#fff7e8] md:text-[3rem]">
                {displayStoreName}
              </h2>
              <p className="max-w-xl text-sm leading-7 text-[#b7ab9c]">
                {footerDescriptionText}
              </p>
              {footerContactRows.length ? (
                <div className="flex flex-wrap gap-2">
                  {footerContactRows.map((row) =>
                    row.href ? (
                      <a
                        key={`${row.label}-${row.value}`}
                        href={row.href}
                        className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-sm font-bold text-[#d6cbbb] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                      >
                        {row.label}: {row.value}
                      </a>
                    ) : (
                      <span
                        key={`${row.label}-${row.value}`}
                        className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-sm font-bold text-[#d6cbbb]"
                      >
                        {row.label}: {row.value}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </div>

            {!isMinimal &&
              footerLinksData.map((group) => (
                <div key={group.title} className="border-s border-[#37312c] ps-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                    {group.title}
                  </h3>
                  <ul className="mt-5 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          reloadDocument={shouldForceDocumentNavigation}
                          className="text-sm font-bold text-[#b7ab9c] transition-colors hover:text-[#fff7e8]"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>

          <div className="flex flex-col gap-4 border-b border-[#37312c] py-5 text-sm text-[#8f8579] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-[#f4ead8]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(socialIcons).map(([social, url]) =>
                url ? (
                  <a
                    key={social}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center border border-[#37312c] text-xs font-black uppercase text-[#d7b674] transition-colors hover:border-[#8b6b3e] hover:text-[#fff7e8]"
                    aria-label={
                      theme.direction === "rtl"
                        ? `تابعنا على ${social}`
                        : `Follow us on ${social}`
                    }
                  >
                    {renderStorefrontSocialBrandIcon(social) ?? social[0]?.toUpperCase()}
                  </a>
                ) : null,
              )}
            </div>
          </div>

          <p className="pt-5 text-sm text-[#8f8579]">
            {footerCopyrightText}
          </p>
        </div>
      </footer>
    );
  }

  if (isLegacyDefaultOldFooter && !isMinimal) {
    if (isFastlyTheme) {
      return (
        <footer dir={theme.direction} className="border-t border-[#111111]/10 bg-white text-[#111111]">
          <div className="container px-4 py-6 text-center md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#111111]">
              <span>{footerCopyrightText}</span>
            </div>
          </div>
        </footer>
      );
    }

    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#111111]/10 bg-white text-[#111111]"
      >
        <div className="container px-4 py-8 text-center md:px-6 md:py-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#111111]">
              {legalLinks.map((link) => (
                <Link
                  key={`legacy-footer-${link.to}`}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-[#555555]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {footerContactRows.length ? (
              <div className="flex flex-col items-center gap-1.5 text-sm text-[#5f5f5f]">
                {footerContactRows.map((row) =>
                  row.href ? (
                    <a
                      key={`${row.label}-${row.value}`}
                      href={row.href}
                      className="transition-colors hover:text-[#111111]"
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

            <p className="text-sm text-[#5f5f5f]">
              {footerCopyrightText}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  if (isFashionRetailFooter && isAtelierNovaCommercePath) {
    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#ead5cd] bg-[#f8eee9] text-[#2c2426]"
      >
        <div className="container px-4 py-6 md:px-6 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2.5">
              <span className="font-heading text-xl font-semibold tracking-tight text-[#2c2426] md:text-2xl">
                {displayStoreName}
              </span>
              <p className="max-w-xl text-sm leading-7 text-[#6f5960]">
                {theme.direction === "rtl"
                  ? "مسار الشراء هنا يظل هادئًا: مراجعة أوضح، متابعة حتى الاستلام، وروابط الخدمة الأساسية قريبة عند الحاجة."
                  : "The purchase flow stays quiet here: clearer review, follow-up through delivery, and the key service links close at hand."}
              </p>
              {footerContactRows.length ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#5c4b4f]">
                  {footerContactRows.slice(0, 2).map((row) =>
                    row.href ? (
                      <a
                        key={`${row.label}-${row.value}`}
                        href={row.href}
                        className="transition-colors hover:text-[#2c2426]"
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
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#6f5960]">
                {legalLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    reloadDocument={shouldForceDocumentNavigation}
                    className="transition-colors hover:text-[#2c2426]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(socialIcons).map(([social, url]) =>
                  url ? (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8cbc1] bg-[#fff8f5] text-[#7a5d63] transition-colors hover:border-[#c78672] hover:text-[#2c2426]"
                      aria-label={
                        theme.direction === "rtl"
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
                  ) : null,
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[#e8cbc1] pt-4 text-sm text-[#7a5d63]">
            <p>{footerCopyrightText}</p>
          </div>
        </div>
      </footer>
    );
  }

  if (isVelaFashionFooter) {
    const isVelaInnerPage = !isHomePath;
    const velaFooterShellClassName = isVelaInnerPage
      ? 'mt-10 border-t border-[#e8cfd3] bg-[#f6dadd] text-[#111111]'
      : 'mt-10 border-t border-[#ece7e3] bg-white text-[#111111]';
    const velaCardClassName = isVelaInnerPage
      ? 'flex items-start gap-3 rounded-[1.2rem] border border-[#ecd9dd] bg-white/92 px-4 py-4'
      : 'flex items-start gap-3 rounded-[1.2rem] border border-[#efebe8] bg-white px-4 py-4';
    const velaIconClassName = isVelaInnerPage
      ? 'mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#ead7db] text-[#151515]'
      : 'mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#ece7e3] text-[#151515]';
    const velaDividerClassName = isVelaInnerPage
      ? 'border-[#ead3d8]'
      : 'border-[#ece7e3]';

    return (
      <footer dir={theme.direction} className={velaFooterShellClassName}>
        <div className="container px-4 py-10 md:px-6 md:py-12">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)]">
            <div className="space-y-3">
              {velaFooterContactRows.map((row) => {
                const content = (
                  <div className={velaCardClassName}>
                    <span className={velaIconClassName}>
                      {renderVelaFooterIcon(row.key)}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-[#111111]">
                        {row.label}
                        <span className="text-[#777777]"> : </span>
                        <span className="font-normal text-[#5c5c5c]">{row.value}</span>
                      </p>
                    </div>
                  </div>
                );

                return row.href ? (
                  <a
                    key={row.key}
                    href={row.href}
                    className="block transition-colors hover:text-[#111111]"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={row.key}>
                    {content}
                  </div>
                );
              })}
            </div>

            {!isMinimal && footerLinksData.map((group) => (
              <div key={group.title}>
                <h3 className="text-lg font-semibold text-[#111111]">{group.title}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className="text-sm text-[#5c5c5c] transition-colors hover:text-[#111111]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {!isMinimal && velaSocialEntries.length ? (
            <div className={`mt-8 flex flex-wrap items-center justify-center gap-3 border-t pt-6 ${velaDividerClassName}`}>
              {velaSocialEntries.map(([social, url]) => (
                <a
                  key={social}
                  href={resolveVelaFooterHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-[#111111] transition-colors hover:border-[#111111] ${
                    isVelaInnerPage ? 'border-[#ead3d8] bg-white/88' : 'border-[#ece7e3]'
                  }`}
                  aria-label={`Follow us on ${social}`}
                >
                  {renderVelaFooterIcon(social)}
                </a>
              ))}
            </div>
          ) : null}

        </div>
      </footer>
    );
  }

  if (isPcHub && !isMinimal) {
    return (
      <footer
        dir={theme.direction}
        className="border-t border-[#d8dee8] bg-[#1f2937] text-white"
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex w-full items-center justify-center border-b border-white/10 bg-[#334155] px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-[#3b4758] hover:text-white"
        >
          {theme.direction === "rtl" ? "العودة للأعلى" : "Back to top"}
        </button>

        <div className="container px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-[#facc15] text-[#111827]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="8" rx="2" />
                    <path d="M7 4h10" />
                  </svg>
                </span>
                <span className="font-heading text-xl font-semibold tracking-tight text-white">
                  {displayStoreName}
                </span>
              </div>
              <p className="max-w-xs text-sm leading-7 text-white/68">
                {theme.footer?.description}
              </p>
              <div className="flex items-center gap-3">
                {Object.entries(socialIcons).map(([social, url]) =>
                  url ? (
                    <a
                      key={social}
                      href={url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition-colors hover:border-[#facc15] hover:bg-[#facc15] hover:text-[#111827]"
                      aria-label={
                        theme.direction === "rtl"
                          ? `تابعنا على ${social}`
                          : `Follow us on ${social}`
                      }
                    >
                      {renderVelaFooterIcon(social as 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'tiktok' | 'snapchat' | 'whatsapp') ?? (
                        <span className="inline-flex items-center justify-center" aria-hidden="true">
                          {renderStorefrontSocialBrandIcon(social) ?? (
                            <span className="text-xs capitalize">{social[0]?.toUpperCase()}</span>
                          )}
                        </span>
                      )}
                    </a>
                  ) : null,
                )}
              </div>
            </div>

            {footerLinksData.map((group) => (
              <div key={group.title}>
                <h3 className="mb-4 text-sm font-semibold text-white">
                  {group.title}
                </h3>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        reloadDocument={shouldForceDocumentNavigation}
                        className="text-sm text-white/62 transition-colors hover:text-[#facc15]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#111827]">
          <div className="container flex flex-col gap-4 px-4 py-5 text-sm text-white/58 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  reloadDocument={shouldForceDocumentNavigation}
                  className="transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p>{theme.footer?.copyrightText}</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      dir={theme.direction}
      className={`relative overflow-hidden border-t ${
        isMenShoes ? "py-8 md:py-14" : "py-12 md:py-16"
      } ${
        isSoleaFemme
          ? "border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.72)_100%)]"
          : isIntruderNft
            ? "border-primary/15 bg-[linear-gradient(180deg,rgba(8,10,16,0.98)_0%,rgba(10,8,18,1)_100%)]"
            : isEditorialSoftFooter
              ? "border-[#ead8e0] bg-[linear-gradient(180deg,#fffafb_0%,#fcf2f6_100%)]"
              : isMenShoes
                ? "border-[#e7d8cb] bg-[linear-gradient(180deg,#f9f1ea_0%,#fffdfa_100%)]"
                : isSignaturePanelFooter
                  ? "border-[#ded1c5] bg-[linear-gradient(180deg,#faf4ee_0%,#fffdf9_100%)]"
                  : "border-border bg-card"
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
              ? "rounded-[2rem] border border-white/65 bg-white/58 p-6 shadow-[0_26px_90px_-60px_hsl(var(--primary)/0.8)] backdrop-blur md:p-8"
              : isIntruderNft
                ? "rounded-[1.75rem] border border-primary/15 bg-background/55 p-6 shadow-[0_0_70px_-45px_hsl(var(--primary)/0.55)] backdrop-blur md:p-8"
                : isEditorialSoftFooter
                  ? "rounded-[2.1rem] border border-[#ead8e0] bg-white/82 p-6 shadow-[0_32px_90px_-64px_rgba(104,49,73,0.26)] backdrop-blur md:p-8"
                  : isMenShoes
                    ? "grid-cols-1 rounded-[1.6rem] border border-[#eadccf] bg-white/92 p-5 shadow-[0_24px_70px_-46px_rgba(31,38,43,0.18)] md:p-8"
                    : isSignaturePanelFooter
                      ? "rounded-[2rem] border border-[#e3d5ca] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(250,243,237,0.92))] p-6 shadow-[0_34px_96px_-64px_rgba(65,35,58,0.28)] backdrop-blur md:p-8"
                      : ""
          }`}
        >
          {/* Brand Column */}
          <div
            className={`space-y-4 ${
              isMenShoes
                ? "col-span-1 md:col-span-1"
                : "col-span-2 md:col-span-1"
            }`}
          >
            {/* Footer brand: use logo if available, else storeName */}
            {theme.header?.logoUrl ||
            settings?.storefront?.settings?.["logoUrl"] ||
            settings?.company?.logo ? (
              <img
                src={
                  theme.header?.logoUrl ||
                  (settings?.storefront?.settings?.["logoUrl"] as string) ||
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
                    ? "text-2xl font-black text-[#5c263b]"
                    : isSignaturePanelFooter
                      ? "text-2xl font-semibold tracking-[0.06em] text-[#41233a]"
                      : isSoleaFemme
                        ? "text-xl font-black"
                        : isIntruderNft
                          ? "text-xl font-black uppercase tracking-[0.28em]"
                          : "text-lg font-bold"
                }`}
              >
                {displayStoreName}
              </span>
            )}
            <p
              className={`max-w-xs text-sm leading-relaxed ${
                isIntruderNft
                  ? "text-white/65"
                  : isMenShoes
                    ? "text-[#675548]"
                    : "text-muted-foreground"
              } ${
                isEditorialSoftFooter
                  ? "text-[#745767]"
                  : isSignaturePanelFooter
                    ? "text-[#6d5658]"
                    : ""
              }`}
            >
              {footerDescriptionText ||
                (theme.direction === "rtl"
                  ? "مجموعات مختارة مصممة للحياة العصرية. الجودة تلتقي بالجمال البسيط."
                  : "Curated collections designed for modern living. Quality meets minimal aesthetic.")}
            </p>
            {footerContactRows.length ? (
              <div
                className={`space-y-1.5 text-sm ${
                  isIntruderNft
                    ? "text-white/65"
                    : isMenShoes
                      ? "text-[#675548]"
                      : "text-muted-foreground"
                } ${
                  isEditorialSoftFooter
                    ? "text-[#745767]"
                    : isSignaturePanelFooter
                      ? "text-[#6d5658]"
                      : ""
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
                          ? "border border-primary/20 bg-background/70 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
                          : isEditorialSoftFooter
                            ? "border border-[#ead8e0] bg-white text-[#8f5168] hover:border-[#d58ba8] hover:bg-[#fbeaf0] hover:text-[#5c263b]"
                            : isMenShoes
                              ? "border border-[#eadccf] bg-[#fff8f2] text-[#4f4034] hover:border-[#f57a1d] hover:bg-[#f57a1d] hover:text-white"
                              : isSignaturePanelFooter
                                ? "border border-[#e3d5ca] bg-white text-[#6d454d] hover:border-[#c09758] hover:bg-[#fff6ea] hover:text-[#41233a]"
                                : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
                      }`}
                      aria-label={
                        theme.direction === "rtl"
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
                className={isMenShoes ? "hidden md:block" : undefined}
              >
                <h3
                  className={`mb-4 text-sm font-semibold font-heading uppercase tracking-wide ${
                    isIntruderNft
                      ? "text-white/75"
                      : isEditorialSoftFooter
                        ? "text-[#8f5168]"
                        : isMenShoes
                          ? "text-[#1f262b]"
                          : isSignaturePanelFooter
                            ? "text-[#6d454d]"
                            : "text-foreground"
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
                        className={`text-sm transition-colors ${
                          isIntruderNft
                            ? "text-white/60 hover:text-primary"
                            : isEditorialSoftFooter
                              ? "text-[#745767] hover:text-[#5c263b]"
                              : isMenShoes
                                ? "text-[#675548] hover:text-[#f57a1d]"
                                : isSignaturePanelFooter
                                  ? "text-[#6d5658] hover:text-[#41233a]"
                                  : "text-muted-foreground hover:text-foreground"
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
            isMenShoes ? "mt-6 pt-5" : "mt-12 pt-8"
          } ${
            isSoleaFemme
              ? "border-primary/10"
              : isIntruderNft
                ? "border-primary/10"
                : isEditorialSoftFooter
                  ? "border-[#ead8e0]"
                  : isMenShoes
                    ? "border-[#eadccf]"
                    : isSignaturePanelFooter
                      ? "border-[#e3d5ca]"
                      : "border-border"
          }`}
        >
          <p
            className={`text-sm ${isIntruderNft ? "text-white/50" : isEditorialSoftFooter ? "text-[#876674]" : isMenShoes ? "text-[#7b6556]" : isSignaturePanelFooter ? "text-[#7d6967]" : "text-muted-foreground"}`}
          >
            {footerCopyrightText ||
              (theme.direction === "rtl"
                ? `© ٢٠٢٦ ${theme.name}. جميع الحقوق محفوظة.`
                : `© 2026 ${theme.name}. All rights reserved.`)}
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-4 text-sm ${
              isIntruderNft
                ? "text-white/50"
                : isEditorialSoftFooter
                  ? "text-[#876674]"
                  : isMenShoes
                    ? "text-[#7b6556]"
                    : isSignaturePanelFooter
                      ? "text-[#7d6967]"
                      : "text-muted-foreground"
            }`}
          >
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                reloadDocument={shouldForceDocumentNavigation}
                className={`transition-colors ${
                  isIntruderNft
                    ? "hover:text-primary"
                    : isEditorialSoftFooter
                      ? "hover:text-[#5c263b]"
                      : isMenShoes
                        ? "hover:text-[#f57a1d]"
                        : isSignaturePanelFooter
                          ? "hover:text-[#41233a]"
                          : "hover:text-foreground"
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

export default StorefrontFooter;
