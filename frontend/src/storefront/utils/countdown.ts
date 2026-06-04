/**
 * Shared countdown utility used by ConversionStack and GlobalConversionHost.
 * Consolidates duplicate implementations into a single source of truth.
 */

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const formatCountdownParts = (
  endsAt: string,
  now: number = Date.now(),
): CountdownParts | null => {
  const target = new Date(endsAt).getTime();
  if (!Number.isFinite(target) || target <= now) {
    return null;
  }

  const diff = target - now;
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
};

export const formatCountdownText = (
  parts: CountdownParts | null,
): string => {
  if (!parts) {
    return "";
  }

  const segments = [
    parts.days > 0 ? `${parts.days}d` : null,
    `${parts.hours}h`,
    `${parts.minutes}m`,
    `${parts.seconds}s`,
  ].filter(Boolean);

  return segments.join(" ");
};

export const formatCountdownSummary = (
  parts: CountdownParts | null,
): string => {
  if (!parts) {
    return "";
  }

  return `${parts.days > 0 ? `${parts.days}d ` : ""}${parts.hours}h ${parts.minutes}m left`;
};
