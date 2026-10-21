import React from 'react';

export interface HeadingElementSettings {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  color?: string;
  className?: string;
}

export interface HeadingElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: HeadingElementSettings;
    [key: string]: any;
  };
  settings?: HeadingElementSettings;
}

const HeadingElement: React.FC<HeadingElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const text = mergedSettings?.text ?? 'عنوان رئيسي';
  const rawLevel = String(mergedSettings?.level || 'h2').trim().toLowerCase();
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const color = mergedSettings?.color?.trim();
  const customClass = mergedSettings?.className || '';

  // Safe HTML heading tag
  const validLevels = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  const Tag = (validLevels.has(rawLevel) ? rawLevel : 'h2') as keyof JSX.IntrinsicElements;

  // Responsive font size & weights based on level
  let sizeClasses = 'text-2xl sm:text-3xl font-bold tracking-tight';
  if (Tag === 'h1') {
    sizeClasses = 'text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight';
  } else if (Tag === 'h3') {
    sizeClasses = 'text-xl sm:text-2xl font-semibold';
  } else if (Tag === 'h4') {
    sizeClasses = 'text-lg sm:text-xl font-medium';
  } else if (Tag === 'h5') {
    sizeClasses = 'text-base sm:text-lg font-medium';
  } else if (Tag === 'h6') {
    sizeClasses = 'text-sm sm:text-base font-medium';
  }

  // RTL-aware text alignment
  let alignClass = 'text-start';
  if (rawAlign === 'center') {
    alignClass = 'text-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'text-end';
  }

  let colorClass = '';
  if (color === 'accent') {
    colorClass = 'text-[var(--store-accent,#2563eb)]';
  }

  const customStyle: React.CSSProperties = {
    fontFamily: 'var(--store-font-family, inherit)',
  };

  if (color) {
    customStyle.color = color === 'accent' ? 'var(--store-accent, #2563eb)' : color;
  }

  return (
    <Tag
      data-storefront-element="heading"
      data-element="heading"
      data-heading-level={Tag}
      data-heading-color={color || 'default'}
      className={`storefront-heading-element w-full text-foreground transition-colors duration-150 ${sizeClasses} ${alignClass} ${colorClass} ${customClass}`.trim()}
      style={customStyle}
    >
      {text}
    </Tag>
  );
};

export default HeadingElement;
