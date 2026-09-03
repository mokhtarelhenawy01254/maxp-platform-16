import React from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'default' | 'compact';
  className?: string;
  buttonClassName?: string;
  valueClassName?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'default',
  className,
  buttonClassName,
  valueClassName,
}) => {
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === 'rtl';
  const isCompact = size === 'compact';
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-[var(--radius)] border border-border ${
        isCompact ? 'rounded-[0.8rem]' : ''
      } ${className || ''}`}
    >
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className={`flex items-center justify-center text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isCompact ? 'h-8 w-8 hover:bg-muted/60' : 'h-10 w-10 hover:bg-muted'
        } ${buttonClassName || ''}`}
        aria-label={prefersArabicCopy ? 'تقليل الكمية' : 'Decrease quantity'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span
        className={`flex items-center justify-center border-x border-border bg-background text-foreground ${
          isCompact ? 'h-8 w-10 text-[13px] font-semibold' : 'h-10 w-12 text-sm font-medium'
        } ${valueClassName || ''}`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className={`flex items-center justify-center text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          isCompact ? 'h-8 w-8 hover:bg-muted/60' : 'h-10 w-10 hover:bg-muted'
        } ${buttonClassName || ''}`}
        aria-label={prefersArabicCopy ? 'زيادة الكمية' : 'Increase quantity'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
      </button>
    </div>
  );
};

export default QuantitySelector;
