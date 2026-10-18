export const parseCleanAddress = (rawAddress?: string): string => {
  if (!rawAddress) return '';
  try {
    const parsed = JSON.parse(rawAddress);
    if (parsed && typeof parsed === 'object') {
      return (
        parsed.address ||
        parsed.detailedAddress ||
        parsed.street ||
        Object.values(parsed).filter((v) => typeof v === 'string').join(' ')
      );
    }
  } catch {
    // rawAddress is plain text
  }
  return rawAddress;
};
