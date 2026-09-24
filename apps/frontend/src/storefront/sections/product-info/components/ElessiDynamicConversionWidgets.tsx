import React, { useEffect, useState, useMemo } from 'react';
import { AlarmClock } from 'lucide-react';
import {
  StaticMotionDiv,
  StaticMotionSpan,
} from '../../../components/StaticMotion';
import {
  formatSaleCountdownValue,
  getSaleCountdownParts,
} from '../../../utils/saleCountdown';

const ELESSI_COUNTDOWN_TICK_MS = 1000;
const ELESSI_SOCIAL_PROOF_ROTATION_MS = 3200;

const hashProductSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getOscillatingCounterValue = ({
  base,
  step,
  seed,
  floor = 1,
  maxSwing = 3,
  allowDip = true,
}: {
  base: number;
  step: number;
  seed: number;
  floor?: number;
  maxSwing?: number;
  allowDip?: boolean;
}) => {
  const normalizedBase = Math.max(floor, Math.round(base));
  if (step === 0) {
    return normalizedBase;
  }
  const swing = Math.max(1, Math.min(maxSwing, Math.ceil(normalizedBase * 0.2)));
  const wave = Math.sin((seed + 1) * 0.53 + step * 1.27);
  const drift = Math.cos((seed + 7) * 0.31 + step * 0.82);
  const normalized = (wave + drift + 2) / 4;
  const min = allowDip ? Math.max(floor, normalizedBase - swing) : normalizedBase;
  const max = normalizedBase + swing;
  return Math.max(floor, Math.round(min + (max - min) * normalized));
};

interface ElessiSaleCountdownDisplayProps {
  targetTimestamp: number | null;
  prefersArabicCopy: boolean;
  currency: string;
}

export const ElessiSaleCountdownDisplay: React.FC<ElessiSaleCountdownDisplayProps> = React.memo(({
  targetTimestamp,
  prefersArabicCopy,
  currency,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetTimestamp) return undefined;
    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, ELESSI_COUNTDOWN_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [targetTimestamp]);

  if (!targetTimestamp) return null;

  const countdownParts = getSaleCountdownParts(targetTimestamp, now);
  if (!countdownParts) return null;

  const locale = 'en-US';
  const srLocale = currency === 'SAR' ? 'ar-SA' : currency === 'AED' ? 'ar-AE' : 'ar-EG';
  const countdownLabel = prefersArabicCopy
    ? 'أسرعي! العرض بيخلص خلال:'
    : 'Hurry up! Sale end in:';

  const units = [
    {
      key: 'days' as const,
      label: prefersArabicCopy ? 'يوم' : 'DAYS',
      value: formatSaleCountdownValue(countdownParts.days, locale),
    },
    {
      key: 'hours' as const,
      label: prefersArabicCopy ? 'ساعة' : 'HOURS',
      value: formatSaleCountdownValue(countdownParts.hours, locale, 2),
    },
    {
      key: 'minutes' as const,
      label: prefersArabicCopy ? 'دقيقة' : 'MINS',
      value: formatSaleCountdownValue(countdownParts.minutes, locale, 2),
    },
    {
      key: 'seconds' as const,
      label: prefersArabicCopy ? 'ثانية' : 'SECS',
      value: formatSaleCountdownValue(countdownParts.seconds, locale, 2),
    },
  ];

  const srDateLabel = new Intl.DateTimeFormat(srLocale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(targetTimestamp));

  return (
    <div className="border-t border-[#efe0d4] pt-3 sm:pt-4">
      <div className="flex items-center justify-end gap-2 text-[16px] font-black text-[#2d211e]">
        <StaticMotionSpan
          animate={{ rotate: [0, -12, 10, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex text-[#c59a7a]"
        >
          <AlarmClock className="h-[15px] w-[15px]" />
        </StaticMotionSpan>
        <span>{countdownLabel}</span>
      </div>
      <div dir="ltr" className="mt-3 grid grid-cols-4 gap-2.5 sm:gap-3">
        {units.map((unit) => (
          <StaticMotionDiv
            key={`${unit.key}-${unit.value}`}
            initial={{ opacity: 0.7, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-[1.05rem] border border-[#e7d8cb] bg-[linear-gradient(180deg,#fffdfa_0%,#fcf7f1_100%)] px-2.5 py-3 text-center shadow-[0_1px_0_rgba(45,33,30,0.02)]"
          >
            <div className="text-[22px] font-black leading-none tracking-[0.02em] text-[#2d211e] tabular-nums">
              {unit.value}
            </div>
            <div className="mt-2 text-[10px] font-semibold tracking-[0.04em] text-[#967a6c]">
              {unit.label}
            </div>
          </StaticMotionDiv>
        ))}
      </div>
      <p className="sr-only">
        {prefersArabicCopy
          ? `العرض الحالي ينتهي في ${srDateLabel}`
          : `Current offer ends on ${srDateLabel}`}
      </p>
    </div>
  );
});

ElessiSaleCountdownDisplay.displayName = 'ElessiSaleCountdownDisplay';

interface ElessiSocialProofTickerDisplayProps {
  productId?: string;
  prefersArabicCopy: boolean;
  recentOrderCount: number;
  activeCartPressure: number;
  soldCounterEnabled: boolean;
  purchaseFomoEnabled: boolean;
}

export const ElessiSocialProofTickerDisplay: React.FC<ElessiSocialProofTickerDisplayProps> = React.memo(({
  productId,
  prefersArabicCopy,
  recentOrderCount,
  activeCartPressure,
  soldCounterEnabled,
  purchaseFomoEnabled,
}) => {
  const [step, setStep] = useState(0);

  const seed = useMemo(() => (productId ? hashProductSeed(productId) % 23 : 0), [productId]);

  const animatedRecentOrders =
    soldCounterEnabled && recentOrderCount > 0
      ? getOscillatingCounterValue({
          base: recentOrderCount,
          step,
          seed,
          floor: 1,
          maxSwing: 2,
        })
      : 0;

  const animatedCartPressure =
    purchaseFomoEnabled && activeCartPressure > 0
      ? getOscillatingCounterValue({
          base: activeCartPressure,
          step: step + 1,
          seed: seed + 5,
          floor: 2,
          maxSwing: 3,
        })
      : 0;

  const items = useMemo(() => {
    return [
      animatedRecentOrders > 0
        ? {
            accentClassName: 'text-[#e2753f]',
            emoji: '🔥',
            key: 'sold' as const,
            label: prefersArabicCopy
              ? `${animatedRecentOrders} اتباعت في آخر ٧ ساعات`
              : `${animatedRecentOrders} sold in the last 7 hours`,
          }
        : null,
      animatedCartPressure > 0
        ? {
            accentClassName: 'text-[#caa487]',
            emoji: '✨',
            key: 'cart' as const,
            label: prefersArabicCopy
              ? `أكثر من ${animatedCartPressure} عميلة ضافتهم لسلاتهم دلوقتي`
              : `Hurry! Over ${animatedCartPressure} shoppers have this in their carts`,
          }
        : null,
    ].filter(Boolean) as Array<{
      accentClassName: string;
      emoji: string;
      key: 'sold' | 'cart';
      label: string;
    }>;
  }, [animatedCartPressure, animatedRecentOrders, prefersArabicCopy]);

  useEffect(() => {
    setStep(0);
  }, [productId]);

  useEffect(() => {
    if (items.length === 0) return undefined;
    const intervalId = window.setInterval(() => {
      setStep((curr) => curr + 1);
    }, ELESSI_SOCIAL_PROOF_ROTATION_MS);
    return () => window.clearInterval(intervalId);
  }, [items.length]);

  if (items.length === 0) return null;

  const activeItem = items[step % items.length];
  if (!activeItem) return null;

  return (
    <StaticMotionDiv
      key={`${activeItem.key}-${step}-${activeItem.label}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      data-testid="elessi-social-proof-ticker"
      aria-live="polite"
      className="flex items-center gap-2 text-sm font-bold text-[#8f5c44]"
    >
      <StaticMotionSpan
        aria-hidden="true"
        animate={
          activeItem.key === 'sold'
            ? { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }
            : { opacity: [0.55, 1, 0.55], y: [0, -1, 0] }
        }
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex text-base leading-none ${activeItem.accentClassName}`}
      >
        {activeItem.emoji}
      </StaticMotionSpan>
      <span>{activeItem.label}</span>
    </StaticMotionDiv>
  );
});

ElessiSocialProofTickerDisplay.displayName = 'ElessiSocialProofTickerDisplay';
