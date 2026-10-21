import React from 'react';

export interface WhatsAppCtaElementSettings {
  phone?: string;
  message?: string;
  label?: string;
  subtitle?: string;
  variant?: 'green' | 'primary' | 'outline' | string;
  align?: 'start' | 'center' | 'end' | string;
  fullWidth?: boolean;
  className?: string;
}

export interface WhatsAppCtaElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: WhatsAppCtaElementSettings;
    [key: string]: any;
  };
  settings?: WhatsAppCtaElementSettings;
}

/**
 * Sanitizes and normalizes phone numbers for wa.me links.
 * Handles '+', spaces, dashes, parentheses, leading zeros, and Egyptian prefixes.
 * Examples:
 * - '+20 100 123 4567' -> '201001234567'
 * - '01001234567' (11 digits, starts with 0) -> '201001234567'
 * - '00201001234567' -> '201001234567'
 */
export function cleanWhatsAppPhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    // Egyptian mobile standard (010, 011, 012, 015 + 8 digits = 11 digits)
    digits = '20' + digits.slice(1);
  }

  return digits;
}

/**
 * Constructs a safe wa.me URL with clean digits and URI-encoded message.
 */
export function buildWhatsAppUrl(phone?: string, message?: string): string {
  const cleanDigits = cleanWhatsAppPhone(phone);
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';
  const encodedMessage = trimmedMessage ? encodeURIComponent(trimmedMessage) : '';

  if (!cleanDigits) {
    return encodedMessage ? `https://wa.me/?text=${encodedMessage}` : '#';
  }

  return `https://wa.me/${cleanDigits}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const WhatsAppCtaElement: React.FC<WhatsAppCtaElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };

  const phone = mergedSettings?.phone ?? '';
  const message = mergedSettings?.message ?? 'مرحباً، أود الاستفسار عن المنتجات';
  const label = mergedSettings?.label ?? 'تواصل عبر واتساب';
  const subtitle = mergedSettings?.subtitle;
  const rawVariant = String(
    mergedSettings?.variant || section?.variant || 'green',
  ).trim().toLowerCase();
  const rawAlign = String(mergedSettings?.align || 'center').trim().toLowerCase();
  const fullWidth = Boolean(mergedSettings?.fullWidth);
  const customClass = mergedSettings?.className || '';

  const cleanDigits = cleanWhatsAppPhone(phone);
  const waUrl = buildWhatsAppUrl(phone, message);

  // Variant styling complying with 5W Identity
  let variantClasses = '';
  const buttonStyle: React.CSSProperties = {
    borderRadius: 'var(--store-radius, 8px)',
    fontFamily: 'var(--store-font-family, inherit)',
  };

  if (rawVariant === 'outline') {
    variantClasses = 'border-2 border-[#25D366] text-[#128C7E] dark:text-[#25D366] bg-transparent hover:bg-[#25D366]/10';
    buttonStyle.borderColor = '#25D366';
  } else if (rawVariant === 'primary') {
    variantClasses = 'text-white bg-[var(--store-accent,#2563eb)] hover:opacity-90 shadow-sm';
    buttonStyle.backgroundColor = 'var(--store-accent, #2563eb)';
    buttonStyle.color = '#ffffff';
  } else {
    // Default green variant
    variantClasses = 'text-white bg-[#25D366] hover:bg-[#20ba5a] shadow-sm';
    buttonStyle.backgroundColor = '#25D366';
    buttonStyle.color = '#ffffff';
  }

  // Alignment classes (RTL friendly)
  let alignClass = 'justify-center';
  if (rawAlign === 'start' || rawAlign === 'right') {
    alignClass = 'justify-start';
  } else if (rawAlign === 'end' || rawAlign === 'left') {
    alignClass = 'justify-end';
  }

  return (
    <div
      data-storefront-element="whatsapp-cta"
      data-element="whatsapp-cta"
      data-whatsapp-variant={rawVariant}
      data-clean-phone={cleanDigits}
      className={`storefront-whatsapp-cta-wrapper flex w-full ${alignClass} ${customClass}`}
      dir="rtl"
    >
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}${cleanDigits ? ` - ${cleanDigits}` : ''}`}
        style={buttonStyle}
        className={`inline-flex items-center gap-3 px-6 py-3.5 transition-all duration-150 active:scale-[0.98] cursor-pointer select-none no-underline ${
          fullWidth ? 'w-full' : 'w-auto'
        } ${variantClasses}`}
      >
        <span className="flex-shrink-0 flex items-center justify-center">
          <WhatsAppIcon className="w-6 h-6" />
        </span>
        <div className="flex flex-col text-right leading-tight">
          <span className="font-semibold text-base">{label}</span>
          {subtitle && (
            <span className="text-xs opacity-90 mt-0.5 font-normal">{subtitle}</span>
          )}
        </div>
      </a>
    </div>
  );
};

export default WhatsAppCtaElement;
