import React from 'react';

export interface SpacerElementSettings {
  height?: 'density' | 'sm' | 'md' | 'lg' | 'xl' | number | string;
  className?: string;
}

export interface SpacerElementProps {
  section?: {
    type?: string;
    variant?: string;
    settings?: SpacerElementSettings;
    [key: string]: any;
  };
  settings?: SpacerElementSettings;
}

const resolveSpacerHeight = (height: unknown): string => {
  if (typeof height === 'number') {
    return `${height}px`;
  }
  const h = String(height || 'md').trim().toLowerCase();
  switch (h) {
    case 'density':
      return 'var(--store-density-gap, 1.5rem)';
    case 'sm':
      return '12px';
    case 'md':
      return '24px';
    case 'lg':
      return '48px';
    case 'xl':
      return '64px';
    default:
      return h.endsWith('px') || h.endsWith('rem') || h.endsWith('em') || h.endsWith('vh')
        ? h
        : !isNaN(Number(h))
        ? `${h}px`
        : '24px';
  }
};

const SpacerElement: React.FC<SpacerElementProps> = ({ section, settings: directSettings }) => {
  const mergedSettings = { ...section?.settings, ...directSettings };
  const rawHeight = String(mergedSettings?.height || 'md').trim().toLowerCase();
  const resolvedHeight = resolveSpacerHeight(mergedSettings?.height);
  const isDensity = rawHeight === 'density';
  const customClass = mergedSettings?.className || '';

  return (
    <div
      data-storefront-element="spacer"
      data-element="spacer"
      data-spacer-height={rawHeight}
      className={`storefront-spacer-element w-full select-none pointer-events-none ${isDensity ? 'h-[var(--store-density-gap,1.5rem)]' : ''} ${customClass}`.trim()}
      style={{ height: resolvedHeight }}
      aria-hidden="true"
    />
  );
};

export default SpacerElement;
