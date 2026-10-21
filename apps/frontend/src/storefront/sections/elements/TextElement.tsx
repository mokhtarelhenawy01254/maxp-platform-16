import React from 'react';

export interface TextElementSettings {
  content?: string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  size?: 'sm' | 'md' | 'lg' | string;
  color?: string;
  className?: string;
}

export interface TextElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: TextElementSettings;
    [key: string]: any;
  };
  settings?: TextElementSettings;
}

const TextElement: React.FC<TextElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const content = mergedSettings?.content ?? '';
  const rawAlign = String(mergedSettings?.align || 'start').trim().toLowerCase();
  const rawSize = String(mergedSettings?.size || 'md').trim().toLowerCase();
  const color = mergedSettings?.color?.trim();
  const customClass = mergedSettings?.className || '';

  // Typography size variants
  let sizeClass = 'text-sm sm:text-base leading-relaxed text-foreground/80';
  if (rawSize === 'sm') {
    sizeClass = 'text-xs sm:text-sm leading-relaxed text-muted-foreground';
  } else if (rawSize === 'lg') {
    sizeClass = 'text-base sm:text-lg leading-relaxed text-foreground/90';
  }

  // Alignment
  let alignClass = 'text-start';
  if (rawAlign === 'center') {
    alignClass = 'text-center';
  } else if (rawAlign === 'end' || rawAlign === 'right') {
    alignClass = 'text-end';
  }

  const customStyle: React.CSSProperties = {
    fontFamily: 'var(--store-font-family, inherit)',
  };

  if (color) {
    customStyle.color = color === 'accent' ? 'var(--store-accent, #2563eb)' : color;
  }

  return (
    <div
      data-storefront-element="text"
      data-element="text"
      data-text-size={rawSize}
      className={`storefront-text-element w-full whitespace-pre-line ${sizeClass} ${alignClass} ${customClass}`.trim()}
      style={customStyle}
    >
      {content}
    </div>
  );
};

export default TextElement;
