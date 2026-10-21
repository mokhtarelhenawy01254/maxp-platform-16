import React from 'react';

export interface ButtonElementSettings {
  label?: string;
  href?: string;
  variant?: 'primary' | 'outline' | 'ghost' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  fullWidth?: boolean;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  className?: string;
}

export interface ButtonElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: ButtonElementSettings;
    [key: string]: any;
  };
  settings?: ButtonElementSettings;
}

const ButtonElement: React.FC<ButtonElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const label = mergedSettings?.label ?? 'زر الإجراء';
  const href = mergedSettings?.href?.trim() || '#';
  const rawVariant = String(
    mergedSettings?.variant || section?.variant || 'primary',
  ).trim().toLowerCase();
  const rawSize = String(mergedSettings?.size || 'md').trim().toLowerCase();
  const fullWidth = Boolean(mergedSettings?.fullWidth);
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  // Size styling
  let sizeClasses = 'px-5 py-2.5 text-sm font-medium';
  if (rawSize === 'sm') {
    sizeClasses = 'px-3.5 py-1.5 text-xs font-medium';
  } else if (rawSize === 'lg') {
    sizeClasses = 'px-7 py-3.5 text-base font-semibold';
  }

  // Variant styling & CSS variables integration
  const buttonStyle: React.CSSProperties = {
    borderRadius: 'var(--store-radius, 8px)',
    fontFamily: 'var(--store-font-family, inherit)',
  };

  let variantClasses = '';
  if (rawVariant === 'outline') {
    variantClasses = 'border border-[var(--store-accent,#2563eb)] text-[var(--store-accent,#2563eb)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5';
    buttonStyle.borderColor = 'var(--store-accent, #2563eb)';
    buttonStyle.color = 'var(--store-accent, #2563eb)';
  } else if (rawVariant === 'ghost') {
    variantClasses = 'text-[var(--store-accent,#2563eb)] bg-transparent hover:bg-black/5 dark:hover:bg-white/5';
    buttonStyle.color = 'var(--store-accent, #2563eb)';
  } else {
    // Primary default
    variantClasses = 'text-white bg-[var(--store-accent,#2563eb)] shadow-sm hover:opacity-90';
    buttonStyle.backgroundColor = 'var(--store-accent, #2563eb)';
    buttonStyle.color = '#ffffff';
  }

  // Alignment classes for button container
  let alignClass = 'justify-start';
  if (rawAlign === 'center') {
    alignClass = 'justify-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'justify-end';
  }

  const baseButtonClasses = `inline-flex items-center justify-center text-center cursor-pointer select-none transition-all duration-150 active:scale-[0.98] ${
    fullWidth ? 'w-full' : 'w-auto'
  } ${sizeClasses} ${variantClasses} ${customClass}`.trim();

  return (
    <div
      data-storefront-element="button"
      data-element="button"
      data-button-variant={rawVariant}
      data-button-size={rawSize}
      className={`storefront-button-wrapper flex w-full ${alignClass}`}
    >
      <a
        href={href}
        className={baseButtonClasses}
        style={buttonStyle}
      >
        {label}
      </a>
    </div>
  );
};

export default ButtonElement;
