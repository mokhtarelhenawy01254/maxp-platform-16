import React, { useState, useMemo } from 'react';

export interface ShippingCompanyLogoProps {
  company?: {
    name?: string;
    providerKey?: string;
    slug?: string;
    settings?: string | null | Record<string, any>;
  } | null;
  size?: number;
  className?: string;
  alt?: string;
}

const resolveBrandLogo = (company?: ShippingCompanyLogoProps['company']): string | null => {
  if (!company) return null;

  // 1. Explicit custom logo from settings
  let parsedSettings: Record<string, any> = {};
  if (company.settings) {
    if (typeof company.settings === 'string') {
      try {
        parsedSettings = JSON.parse(company.settings);
      } catch {}
    } else if (typeof company.settings === 'object') {
      parsedSettings = company.settings;
    }
  }

  if (parsedSettings.logoUrl && typeof parsedSettings.logoUrl === 'string' && parsedSettings.logoUrl.trim()) {
    return parsedSettings.logoUrl.trim();
  }

  // 2. Built-in provider logos
  const key = String(company.providerKey || '').trim().toUpperCase();
  const slug = String(company.slug || '').trim().toLowerCase();
  const name = String(company.name || '').trim().toLowerCase();

  if (key === 'TURBO' || slug.includes('turbo') || name.includes('turbo') || name.includes('تربو')) {
    return '/brands/turbo.svg';
  }
  if (key === 'BOSTA' || key === 'BOSTA_DEMO' || slug.includes('bosta') || name.includes('bosta') || name.includes('بوستا')) {
    return '/brands/bosta.svg';
  }
  if (key === 'QP_EXPRESS' || slug.includes('qp') || name.includes('qp') || name.includes('كيو بي')) {
    return '/brands/qp_express.svg';
  }
  if (key === 'MYLERZ_DEMO' || slug.includes('mylerz') || name.includes('mylerz') || name.includes('مايلرز')) {
    return '/brands/mylerz.svg';
  }
  if (key === 'ARAMEX_DEMO' || slug.includes('aramex') || name.includes('aramex') || name.includes('أرامكس')) {
    return '/brands/aramex.svg';
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
  size = 40,
  className = '',
  alt,
}) => {
  const [hasError, setHasError] = useState(false);

  const logoSrc = useMemo(() => resolveBrandLogo(company), [company]);
  const companyName = company?.name || 'شركة شحن';
  const altText = alt || companyName;
  const initials = useMemo(() => getCompanyInitials(company?.name), [company?.name]);

  // Reset error if company changes
  React.useEffect(() => {
    setHasError(false);
  }, [logoSrc]);

  if (!logoSrc || hasError) {
    return (
      <div
        data-testid="shipping-company-logo-fallback"
        className={`rounded-lg border border-border/80 bg-muted/60 text-foreground flex items-center justify-center font-bold font-mono shrink-0 select-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.35)) }}
        title={companyName}
        aria-label={altText}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      data-testid="shipping-company-logo"
      src={logoSrc}
      alt={altText}
      width={size}
      height={size}
      className={`rounded-lg object-contain shrink-0 border border-border/60 bg-background/50 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export default ShippingCompanyLogo;
