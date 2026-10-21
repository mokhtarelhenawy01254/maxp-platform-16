import React from 'react';

export interface PaymentMethodsElementSettings {
  title?: string;
  methods?: string[] | string;
  align?: 'start' | 'center' | 'end' | string;
  note?: string;
  className?: string;
}

export interface PaymentMethodsElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: PaymentMethodsElementSettings;
    [key: string]: any;
  };
  settings?: PaymentMethodsElementSettings;
}

// 100% Inline SVG icons — NO external assets
const VisaIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-6' }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" aria-label="Visa" role="img">
    <rect width="48" height="32" rx="4" fill="#1A1F71" />
    <path
      d="M19.46 20.89l2.42-11.83h2.95l-2.42 11.83h-2.95zm11.77-11.53c-.59-.23-1.51-.48-2.67-.48-2.94 0-5.01 1.57-5.02 3.81-.02 1.66 1.48 2.58 2.61 3.13 1.16.57 1.55.93 1.55 1.44 0 .78-.94 1.14-1.81 1.14-1.21 0-1.85-.18-2.84-.62l-.39-.19-.42 2.06c.69.32 1.96.6 3.28.62 3.12 0 5.15-1.54 5.18-3.93.02-1.31-.78-2.31-2.48-3.13-1.04-.53-1.67-.88-1.67-1.42 0-.49.53-.99 1.68-.99.96-.02 1.65.2 2.19.43l.26.12.44-2.14l.09-.05zm8.44 7.64l1.24-5.96.71 3.44c.12.6.58 2.52.58 2.52h-2.53zm3.76-7.94h-2.28c-.71 0-1.24.21-1.55.95l-4.42 10.88h3.1l.62-1.72h3.79c.09.4.36 1.72.36 1.72h2.74l-2.36-11.83zm-16.71 0l-2.88 8.08-.31-1.58c-.54-1.83-2.23-3.82-4.11-4.83l2.67 10.15h3.12l4.64-11.82h-3.13z"
      fill="#FFFFFF"
    />
  </svg>
);

const MastercardIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-6' }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" aria-label="Mastercard" role="img">
    <rect width="48" height="32" rx="4" fill="#252525" />
    <circle cx="19" cy="16" r="10" fill="#EB001B" />
    <circle cx="29" cy="16" r="10" fill="#F79E1B" fillOpacity="0.9" />
  </svg>
);

const CodIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Cash on Delivery" role="img">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const PaymobIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-6' }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" aria-label="Paymob" role="img">
    <rect width="48" height="32" rx="4" fill="#0E1E40" />
    <circle cx="17" cy="16" r="6" fill="#00B2FF" />
    <path d="M25 10h3v12h-3zm5 0h3v12h-3z" fill="#FFFFFF" />
  </svg>
);

const FawryIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-6' }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" aria-label="Fawry" role="img">
    <rect width="48" height="32" rx="4" fill="#FFC805" />
    <path d="M12 16h24M24 10l6 6-6 6" stroke="#003580" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InstaPayIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-6' }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" aria-label="InstaPay" role="img">
    <rect width="48" height="32" rx="4" fill="#582484" />
    <path d="M15 16l5-6v12l5-6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="33" cy="16" r="3.5" fill="#FF5000" />
  </svg>
);

const WalletIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Electronic Wallets" role="img">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 7v13a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h3v-4h-3z" />
  </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export interface PaymentMethodItem {
  id: string;
  name: string;
  badgeLabel?: string;
  icon: React.ReactNode;
  featured?: boolean;
}

export function parsePaymentMethods(raw?: string[] | string): string[] {
  if (Array.isArray(raw)) {
    return raw.map((m) => String(m).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean);
  }
  // Default Egyptian merchant payment methods
  return ['cod', 'visa', 'mastercard', 'paymob', 'fawry', 'instapay', 'wallet'];
}

const ALL_PAYMENT_METHODS: Record<string, PaymentMethodItem> = {
  cod: {
    id: 'cod',
    name: 'الدفع عند الاستلام',
    badgeLabel: 'الدفع عند الاستلام متاح',
    icon: <CodIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    featured: true,
  },
  visa: {
    id: 'visa',
    name: 'Visa',
    icon: <VisaIcon />,
  },
  mastercard: {
    id: 'mastercard',
    name: 'Mastercard',
    icon: <MastercardIcon />,
  },
  paymob: {
    id: 'paymob',
    name: 'Paymob',
    icon: <PaymobIcon />,
  },
  fawry: {
    id: 'fawry',
    name: 'فوري Fawry',
    icon: <FawryIcon />,
  },
  instapay: {
    id: 'instapay',
    name: 'إنستاباي InstaPay',
    icon: <InstaPayIcon />,
  },
  wallet: {
    id: 'wallet',
    name: 'محافظ إلكترونية',
    icon: <WalletIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
};

const PaymentMethodsElement: React.FC<PaymentMethodsElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };

  const title = mergedSettings?.title;
  const rawMethods = mergedSettings?.methods;
  const rawAlign = String(mergedSettings?.align || 'center').trim().toLowerCase();
  const note = mergedSettings?.note;
  const customClass = mergedSettings?.className || '';

  const selectedMethodKeys = parsePaymentMethods(rawMethods);
  const activeMethods = selectedMethodKeys
    .map((key) => ALL_PAYMENT_METHODS[key])
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
      data-storefront-element="payment-methods"
      data-element="payment-methods"
      className={`storefront-payment-methods-wrapper flex flex-col w-full gap-3 py-3 ${alignClass} ${customClass}`}
      style={containerStyle}
      dir="rtl"
    >
      {title && (
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
        {activeMethods.map((method) => {
          if (method.featured) {
            // Distinguished / Highlighted COD Badge
            return (
              <div
                key={method.id}
                data-payment-method="cod"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs transition-colors"
                style={{ borderRadius: 'var(--store-radius, 8px)' }}
              >
                {method.icon}
                <span>{method.badgeLabel || method.name}</span>
              </div>
            );
          }

          return (
            <div
              key={method.id}
              data-payment-method={method.id}
              className="inline-flex items-center gap-1.5 p-1 rounded-md bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-2xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              style={{ borderRadius: 'var(--store-radius, 6px)' }}
              title={method.name}
            >
              {method.icon}
              {method.id === 'wallet' && (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-1">
                  {method.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {note && (
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <LockIcon />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsElement;
