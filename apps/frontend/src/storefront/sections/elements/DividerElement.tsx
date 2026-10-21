import React from 'react';

export interface DividerElementSettings {
  thickness?: '1px' | '2px' | '4px' | number | string;
  color?: string;
  width?: 'full' | '3/4' | '1/2' | '1/4' | string;
  align?: 'start' | 'center' | 'end' | 'left' | 'right' | string;
  margin?: 'none' | 'sm' | 'md' | 'lg' | string;
  className?: string;
}

export interface DividerElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: DividerElementSettings;
    [key: string]: any;
  };
  settings?: DividerElementSettings;
}

const resolveWidth = (width: unknown): string => {
  const w = String(width || 'full').trim().toLowerCase();
  switch (w) {
    case '3/4':
    case '75%':
      return '75%';
    case '1/2':
    case '50%':
      return '50%';
    case '1/4':
    case '25%':
      return '25%';
    case 'full':
    case '100%':
    default:
      return '100%';
  }
};

const resolveThickness = (thickness: unknown): string => {
  if (typeof thickness === 'number') {
    return `${thickness}px`;
  }
  const t = String(thickness || '1px').trim().toLowerCase();
  return t.endsWith('px') || t.endsWith('rem') ? t : `${t}px`;
};

const DividerElement: React.FC<DividerElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const thickness = resolveThickness(mergedSettings?.thickness);
  const width = resolveWidth(mergedSettings?.width);
  const rawAlign = String(mergedSettings?.align || 'center').trim().toLowerCase();
  const color = mergedSettings?.color?.trim();
  const rawMargin = String(mergedSettings?.margin || 'md').trim().toLowerCase();
  const customClass = mergedSettings?.className || '';

  // Alignment classes for inner hr / line
  let alignStyle: React.CSSProperties = {
    marginLeft: 'auto',
    marginRight: 'auto',
  };
  if (rawAlign === 'start') {
    alignStyle = {
      marginInlineStart: '0',
      marginInlineEnd: 'auto',
    };
  } else if (rawAlign === 'end') {
    alignStyle = {
      marginInlineStart: 'auto',
      marginInlineEnd: '0',
    };
  }

  // Vertical margin
  let marginClass = 'my-3';
  if (rawMargin === 'none') {
    marginClass = 'my-0';
  } else if (rawMargin === 'sm') {
    marginClass = 'my-1.5';
  } else if (rawMargin === 'lg') {
    marginClass = 'my-6';
  }

  const isAccent = color === 'accent';
  const dividerStyle: React.CSSProperties = {
    width,
    height: thickness,
    backgroundColor: isAccent ? 'var(--store-accent, #2563eb)' : color || 'hsl(var(--border, 0 0% 88%))',
    border: 'none',
    ...alignStyle,
  };

  return (
    <div
      data-storefront-element="divider"
      data-element="divider"
      data-divider-thickness={thickness}
      data-divider-color={color || 'default'}
      className={`storefront-divider-wrapper w-full ${marginClass} ${customClass}`.trim()}
    >
      <hr
        className={`storefront-divider-line rounded-full ${isAccent ? 'bg-[var(--store-accent,#2563eb)]' : ''}`}
        style={dividerStyle}
        aria-hidden="true"
      />
    </div>
  );
};

export default DividerElement;
