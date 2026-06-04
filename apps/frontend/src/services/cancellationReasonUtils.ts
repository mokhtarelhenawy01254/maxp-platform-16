const MAX_CANCELLATION_REASON_OPTIONS = 30;
const MAX_CANCELLATION_REASON_LENGTH = 120;

export const normalizeCancellationReasonOptions = (
  value: unknown,
): string[] => {
  let rawOptions = value;

  if (typeof rawOptions === "string") {
    rawOptions = rawOptions.split(/\r?\n/);
  }

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  const normalizedOptions: string[] = [];
  const seen = new Set<string>();

  rawOptions.forEach((option) => {
    const normalizedOption = String(option ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_CANCELLATION_REASON_LENGTH);

    if (!normalizedOption) {
      return;
    }

    const dedupeKey = normalizedOption.toLowerCase();
    if (seen.has(dedupeKey)) {
      return;
    }

    seen.add(dedupeKey);
    normalizedOptions.push(normalizedOption);
  });

  return normalizedOptions.slice(0, MAX_CANCELLATION_REASON_OPTIONS);
};
