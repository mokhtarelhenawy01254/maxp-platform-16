export interface SaleCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const resolveSaleCountdownTimestamp = (value: string): number | null => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (DATE_ONLY_PATTERN.test(trimmedValue)) {
    const [year, month, day] = trimmedValue.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  }

  const parsedTimestamp = new Date(trimmedValue).getTime();
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
};

export const getSaleCountdownParts = (
  targetTimestamp: number,
  nowTimestamp = Date.now(),
): SaleCountdownParts | null => {
  const remainingMs = targetTimestamp - nowTimestamp;
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return null;
  }

  const totalSeconds = Math.floor(remainingMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

export const formatSaleCountdownValue = (
  value: number,
  locale: string,
  minimumIntegerDigits = 1,
) =>
  new Intl.NumberFormat(locale, {
    minimumIntegerDigits,
    useGrouping: false,
  }).format(Math.max(0, Math.floor(value)));
