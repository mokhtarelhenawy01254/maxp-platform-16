import { useEffect, useMemo, useState } from "react";
import type { ElessiFooterData } from "../components/storefront/elessi/ElessiFooter";
import { apiClient } from "../services/apiClient";
import {
  parseStorefrontFooterContentConfig,
  parseStorefrontHeaderContentConfig,
} from "../utils/storefrontLayoutStudio";
import { withStorefrontCompany } from "../utils/storefrontLinks";

interface StorePage {
  id: string;
  title: string;
  slug: string;
  showInFooter: boolean;
  isActive: boolean;
}

interface UseElessiFooterDataOptions {
  companyId?: string | null;
  fallback: ElessiFooterData;
  designTokens?: Record<string, unknown> | null;
}

const normalizeMeta = (value: string, fallback: string): string => {
  const cleaned = String(value || "").trim();
  return cleaned || fallback;
};

export const useElessiFooterData = ({
  companyId,
  fallback,
  designTokens,
}: UseElessiFooterDataOptions): ElessiFooterData => {
  const [storePages, setStorePages] = useState<StorePage[]>([]);

  useEffect(() => {
    if (!companyId) {
      setStorePages([]);
      return;
    }
    let isMounted = true;
    apiClient
      .get(`/store-pages/${companyId}/public`, { params: { companyId } })
      .then((response) => {
        if (!isMounted) return;
        const pages = Array.isArray(response.data?.data)
          ? (response.data.data as StorePage[])
          : [];
        setStorePages(
          pages.filter((page) => page.showInFooter && page.isActive),
        );
      })
      .catch(() => {
        if (isMounted) {
          setStorePages([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  return useMemo(() => {
  const footerContent = parseStorefrontFooterContentConfig(designTokens);
  const headerContent = parseStorefrontHeaderContentConfig(designTokens);
  const footerColumns = [...fallback.columns];
    const placeholderMap: Record<string, string> = {
      "#about": "/about",
      "#journal": "/blog",
      "#blog": "/blog",
      "#contact": "/contact",
      "#support": "/contact",
      "#sustainability": "/about",
      "#careers": "/contact",
      "#shipping": "/shop/page/shipping-policy",
      "#returns": "/shop/page/return-policy",
      "#size-guide": "/shop/page/size-guide",
      "#track": "/shop/page/track-order",
      "#privacy": "/shop/page/privacy-policy",
      "#terms": "/shop/page/terms",
    };

    const resolveLink = (href: string): string => {
      const normalized = String(href || "").trim();
      if (!normalized) return withStorefrontCompany("/shop", companyId);
      if (normalized.startsWith("#")) {
        const mapped = placeholderMap[normalized.toLowerCase()];
        return withStorefrontCompany(mapped || "/shop", companyId);
      }
      if (normalized.startsWith("/")) {
        return withStorefrontCompany(normalized, companyId);
      }
      return normalized;
    };

    const quickLinks = storePages.length
      ? storePages.map((page) => ({
          label: page.title,
          href: withStorefrontCompany(`/shop/page/${page.slug}`, companyId),
        }))
      : (footerColumns[0]?.links || []).map((link) => ({
          ...link,
          href: resolveLink(link.href),
        }));

    const columns = footerColumns.map((column, index) => ({
      ...column,
      links: column.links.map((link) => ({
        ...link,
        href: resolveLink(link.href),
      })),
      ...(index === 0
        ? {
            title: column.title || "روابط المتجر",
            links: quickLinks,
          }
        : {}),
    }));

    const resolvedColumns = footerContent.showQuickLinks
      ? columns
      : columns.slice(1);

    const socials = fallback.socials
      .map((social) => {
        if (social.id === "email") {
          if (!footerContent.showEmail || !footerContent.email) {
            return null;
          }
          return {
            ...social,
            href: `mailto:${footerContent.email}`,
            label: footerContent.email,
          };
        }
        return social;
      })
      .filter((social): social is typeof fallback.socials[number] => Boolean(social));

    const metaBase = footerContent.showCopyright
      ? normalizeMeta(
          footerContent.copyrightText,
          fallback.meta,
        )
      : "";
    const year = new Date().getFullYear().toString();

    return {
      brand: {
        name: headerContent.brandName || fallback.brand.name,
        description: footerContent.aboutStore || fallback.brand.description,
      },
      columns: resolvedColumns,
      newsletter: fallback.newsletter,
      socials,
      meta: metaBase.replace("{year}", year),
    };
  }, [companyId, designTokens, fallback, storePages]);
};

export default useElessiFooterData;
