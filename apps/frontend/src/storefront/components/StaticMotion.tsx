import React from 'react';

export type StaticMotionProps<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithoutRef<T> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    whileTap?: unknown;
  };

export const resolveStaticMotionStyle = (
  animate: unknown,
  style: React.CSSProperties | undefined,
): React.CSSProperties | undefined => {
  if (!animate || typeof animate !== 'object' || Array.isArray(animate)) {
    return style;
  }

  const animatedStyle: React.CSSProperties = {};
  const values = animate as Record<string, unknown>;

  if (typeof values.width === 'string' || typeof values.width === 'number') {
    animatedStyle.width = values.width;
  }

  if (typeof values.opacity === 'string' || typeof values.opacity === 'number') {
    animatedStyle.opacity = values.opacity;
  }

  return Object.keys(animatedStyle).length > 0
    ? { ...animatedStyle, ...style }
    : style;
};

export const StaticMotionDiv = ({
  initial: _initial,
  animate,
  transition: _transition,
  style,
  ...props
}: StaticMotionProps<'div'>) => (
  <div {...props} style={resolveStaticMotionStyle(animate, style)} />
);

StaticMotionDiv.displayName = 'StaticMotionDiv';

export const StaticMotionSpan = ({
  initial: _initial,
  animate,
  transition: _transition,
  style,
  ...props
}: StaticMotionProps<'span'>) => (
  <span {...props} style={resolveStaticMotionStyle(animate, style)} />
);

StaticMotionSpan.displayName = 'StaticMotionSpan';

export const StaticMotionButton = ({
  initial: _initial,
  animate: _animate,
  transition: _transition,
  whileTap: _whileTap,
  ...props
}: StaticMotionProps<'button'>) => <button {...props} />;

StaticMotionButton.displayName = 'StaticMotionButton';