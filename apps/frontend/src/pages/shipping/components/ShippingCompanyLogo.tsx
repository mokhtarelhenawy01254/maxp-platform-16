export const BRAND_ASSET_VERSION = '20261105';
export const BRAND_CANVAS_WIDTH = 96;
export const BRAND_CANVAS_HEIGHT = 32;

import React, { useState, useMemo } from 'react';

export interface ShippingCompanyLogoProps {
  company?: {
    name?: string;
    providerKey?: string;
    slug?: string;
    logo?: string | null;
    logoUrl?: string | null;
    settings?: string | null | Record<string, any>;
  } | null;
  size?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  alt?: string;
}

const normalizeBrandAssetPath = (assetPath: string): string => {
  return assetPath.replace(/qp_express\.svg/g, 'qp-express.svg');
};

const resolveBrandLogo = (company?: ShippingCompanyLogoProps['company']): string | null => {
  if (!company) return null;

  // 1. Direct logo or logoUrl from company object
  if (company.logoUrl && typeof company.logoUrl === 'string' && company.logoUrl.trim()) {
    return normalizeBrandAssetPath(company.logoUrl.trim());
  }
  if (company.logo && typeof company.logo === 'string' && company.logo.trim()) {
    return normalizeBrandAssetPath(company.logo.trim());
  }

  // 2. Explicit custom logo from settings
  let parsedSettings: Record<string, any> = {};
  if (company.settings) {
    if (typeof company.settings === 'string') {
      try {
        const parsed = JSON.parse(company.settings);
        if (parsed && typeof parsed === 'object') {
          parsedSettings = parsed;
        }
      } catch {}
    } else if (typeof company.settings === 'object' && company.settings !== null) {
      parsedSettings = company.settings;
    }
  }

  if (parsedSettings?.logoUrl && typeof parsedSettings.logoUrl === 'string' && parsedSettings.logoUrl.trim()) {
    return normalizeBrandAssetPath(parsedSettings.logoUrl.trim());
  }
  if (parsedSettings?.logo && typeof parsedSettings.logo === 'string' && parsedSettings.logo.trim()) {
    return normalizeBrandAssetPath(parsedSettings.logo.trim());
  }

  // 3. Built-in provider logos
  const key = String(company.providerKey || '').trim().toUpperCase();
  const slug = String(company.slug || '').trim().toLowerCase();
  const name = String(company.name || '').trim().toLowerCase();

  const withVersion = (file: string) => `/brands/v2/${file}?v=${BRAND_ASSET_VERSION}`;

  if (key === 'TURBO' || slug.includes('turbo') || name.includes('turbo') || name.includes('تربو')) {
    return withVersion('turbo.svg');
  }
  if (key === 'MAXP_NETWORK' || slug.includes('maxp_network') || name.includes('شبكة maxp') || name.includes('شحن على maxp')) {
    return withVersion('maxp_network.svg');
  }
  if (key === 'BOSTA' || key === 'BOSTA_DEMO' || slug.includes('bosta') || name.includes('bosta') || name.includes('بوستا')) {
    return withVersion('bosta.svg');
  }
  if (key === 'QP_EXPRESS' || key === 'QP' || slug.includes('qp') || name.includes('qp') || name.includes('كيو بي')) {
    return withVersion('qp-express.svg');
  }
  if (key === 'MYLERZ' || key === 'MYLERZ_DEMO' || slug.includes('mylerz') || name.includes('mylerz') || name.includes('مايلرز')) {
    return withVersion('mylerz.svg');
  }
  if (key === 'ARAMEX' || key === 'ARAMEX_DEMO' || slug.includes('aramex') || name.includes('aramex') || name.includes('أرامكس')) {
    return withVersion('aramex.svg');
  }

  return null;
};

const getCompanyInitials = (name?: string): string => {
  const clean = String(name || '').trim();
  if (!clean) return 'ش';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

export const ShippingCompanyLogo: React.FC<ShippingCompanyLogoProps> = ({
  company,
  size,
  width,
  height,
  className = '',
  alt,
}) => {
  const [hasError, setHasError] = useState(false);

  const logoSrc = useMemo(() => resolveBrandLogo(company), [company]);
  const companyName = company?.name || 'شركة شحن';
  const altText = alt || companyName;
  const initials = useMemo(() => getCompanyInitials(company?.name), [company?.name]);

  const renderedWidth = width !== undefined ? width : size !== undefined ? size : BRAND_CANVAS_WIDTH;
  const renderedHeight = height !== undefined ? height : size !== undefined ? size : BRAND_CANVAS_HEIGHT;

  // Reset error if company changes
  React.useEffect(() => {
    setHasError(false);
  }, [logoSrc]);

  if (!logoSrc || hasError) {
    return (
      <div
        data-testid="shipping-company-logo-fallback"
        className={`rounded-lg border border-border/80 bg-muted/60 text-foreground flex items-center justify-center font-medium shrink-0 select-none shadow-2xs overflow-hidden px-1.5 text-center ${className}`}
        style={{ width: renderedWidth, height: renderedHeight }}
        title={companyName}
        aria-label={altText}
      >
        <span className="truncate text-xs font-semibold leading-tight">{companyName}</span>
        <span className="sr-only">{initials}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg border border-border/70 dark:border-border/60 bg-white shadow-2xs flex items-center justify-center p-1 shrink-0 overflow-hidden ${className}`}
      style={{ width: renderedWidth, height: renderedHeight }}
    >
      <img
        data-testid="shipping-company-logo"
        src={logoSrc}
        alt={altText}
        width={renderedWidth}
        height={renderedHeight}
        className="w-full h-full object-contain select-none"
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default ShippingCompanyLogo;
