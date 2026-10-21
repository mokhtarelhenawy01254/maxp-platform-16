import React from 'react';

export interface CodBadgeElementSettings {
  text?: string;
  style?: 'soft' | 'bold' | 'outline' | string;
  align?: 'start' | 'center' | 'end' | string;
  className?: string;
}

export interface CodBadgeElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: CodBadgeElementSettings;
    [key: string]: any;
  };
  settings?: CodBadgeElementSettings;
}

const BanknoteShieldIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const CodBadgeElement: React.FC<CodBadgeElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };

  const text = mergedSettings?.text?.trim() || 'الدفع عند الاستلام متاح';
  const rawStyle = String(
    mergedSettings?.style || section?.variant || 'soft',
  ).trim().toLowerCase();
  const rawAlign = String(mergedSettings?.align || 'center').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  // Style variations complying with 5W Identity
  let styleClasses = '';
  const badgeStyle: React.CSSProperties = {
    borderRadius: 'var(--store-radius, 8px)',
    fontFamily: 'var(--store-font-family, inherit)',
  };

  if (rawStyle === 'bold') {
    styleClasses = 'bg-emerald-600 text-white shadow-sm';
  } else if (rawStyle === 'outline') {
    styleClasses = 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-transparent';
  } else {
    // Default: 'soft'
    styleClasses = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs';
  }

  // Alignment classes
  let alignClass = 'justify-center';
  if (rawAlign === 'start' || rawAlign === 'right') {
    alignClass = 'justify-start';
  } else if (rawAlign === 'end' || rawAlign === 'left') {
    alignClass = 'justify-end';
  }

  return (
    <div
      data-storefront-element="cod-badge"
      data-element="cod-badge"
      data-cod-style={rawStyle}
      className={`storefront-cod-badge-wrapper flex w-full ${alignClass} py-1 ${customClass}`}
      dir="rtl"
    >
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold select-none ${styleClasses}`}
        style={badgeStyle}
      >
        <BanknoteShieldIcon className="w-4 h-4 flex-shrink-0" />
        <span>{text}</span>
      </div>
    </div>
  );
};

export default CodBadgeElement;
