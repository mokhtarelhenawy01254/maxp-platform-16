import React from 'react';

export interface ShippingPartnersElementSettings {
  title?: string;
  partners?: string[] | string;
  note?: string;
  align?: 'start' | 'center' | 'end' | string;
  className?: string;
}

export interface ShippingPartnersElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: ShippingPartnersElementSettings;
    [key: string]: any;
  };
  settings?: ShippingPartnersElementSettings;
}

// 100% Inline SVG icons — NO external assets
const BostaIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Bosta" role="img">
    <circle cx="12" cy="12" r="10" fill="#E21D24" />
    <path d="M8 12l3 3 5-6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AramexIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Aramex" role="img">
    <rect width="24" height="24" rx="4" fill="#ED1C24" />
    <path d="M5 12h14M13 7l5 5-5 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EgyptPostIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-label="Egypt Post" role="img">
    <rect width="24" height="24" rx="4" fill="#005B38" />
    <circle cx="12" cy="12" r="6" stroke="#D4AF37" strokeWidth="2" fill="none" />
    <path d="M10 12l2 2 3-3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CourierIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Courier" role="img">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export interface ShippingPartnerItem {
  id: string;
  name: string;
  nameAr: string;
  icon: React.ReactNode;
}

export function parseShippingPartners(raw?: string[] | string): string[] {
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
  }
  // Default partners in Egypt
  return ['bosta', 'aramex', 'egypt-post', 'courier'];
}

const ALL_SHIPPING_PARTNERS: Record<string, ShippingPartnerItem> = {
  bosta: {
    id: 'bosta',
    name: 'Bosta',
    nameAr: 'بوسطة Bosta',
    icon: <BostaIcon />,
  },
  aramex: {
    id: 'aramex',
    name: 'Aramex',
    nameAr: 'أرامكس Aramex',
    icon: <AramexIcon />,
  },
  'egypt-post': {
    id: 'egypt-post',
    name: 'Egypt Post',
    nameAr: 'البريد المصري',
    icon: <EgyptPostIcon />,
  },
  courier: {
    id: 'courier',
    name: 'Courier',
    nameAr: 'شحن سريع خاص',
    icon: <CourierIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />,
  },
};

const ShippingPartnersElement: React.FC<ShippingPartnersElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };

  const title = mergedSettings?.title;
  const rawPartners = mergedSettings?.partners;
  const note = mergedSettings?.note ?? 'الشحن خلال 48 ساعة لمعظم المحافظات';
  const rawAlign = String(mergedSettings?.align || 'center').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  const selectedPartnerKeys = parseShippingPartners(rawPartners);
  const activePartners = selectedPartnerKeys
    .map((key) => ALL_SHIPPING_PARTNERS[key])
    .filter(Boolean);

  // Alignment classes
  let alignClass = 'items-center justify-center text-center';
  if (rawAlign === 'start' || rawAlign === 'right') {
    alignClass = 'items-start justify-start text-right';
  } else if (rawAlign === 'end' || rawAlign === 'left') {
    alignClass = 'items-end justify-end text-left';
  }

  const containerStyle: React.CSSProperties = {
    fontFamily: 'var(--store-font-family, inherit)',
    borderRadius: 'var(--store-radius, 8px)',
  };

  return (
    <div
      data-storefront-element="shipping-partners"
      data-element="shipping-partners"
      className={`storefront-shipping-partners-wrapper flex flex-col w-full gap-3 py-3 ${alignClass} ${customClass}`}
      style={containerStyle}
      dir="rtl"
    >
      {title && (
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
        {activePartners.map((partner) => (
          <div
            key={partner.id}
            data-shipping-partner={partner.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-2xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            style={{ borderRadius: 'var(--store-radius, 8px)' }}
          >
            {partner.icon}
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              {partner.nameAr}
            </span>
          </div>
        ))}
      </div>

      {note && (
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          <ClockIcon className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{note}</span>
        </div>
      )}
    </div>
  );
};

export default ShippingPartnersElement;
