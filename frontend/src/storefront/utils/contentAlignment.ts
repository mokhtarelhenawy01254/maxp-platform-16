export type SectionContentAlign = 'start' | 'center';

const normalizeSectionContentAlign = (
  value: unknown,
): SectionContentAlign | null => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'center') {
    return 'center';
  }

  if (normalized === 'start') {
    return 'start';
  }

  return null;
};

export const resolveSectionContentAlign = (
  value: unknown,
  fallback?: unknown,
): SectionContentAlign =>
  normalizeSectionContentAlign(value) ??
  normalizeSectionContentAlign(fallback) ??
  'start';

export const isCenteredSectionContent = (
  value: unknown,
  fallback?: unknown,
): boolean => resolveSectionContentAlign(value, fallback) === 'center';
