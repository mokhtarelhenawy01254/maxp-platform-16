const { normalizeModality, resolveModality, MODALITY_BY_CATEGORY } = require('../../utils/radiologyModality');

describe('radiologyModality', () => {
  test('maps canonical English categories', () => {
    expect(normalizeModality('CT')).toBe('CT');
    expect(normalizeModality('MRI')).toBe('MR');
    expect(normalizeModality('X-Ray')).toBe('CR');
    expect(normalizeModality('US')).toBe('US');
    expect(normalizeModality('DEXA')).toBe('DXA');
    expect(normalizeModality('Fluoroscopy')).toBe('FLUOROSCOPY');
  });

  test('maps special-modality categories that have no shorthand', () => {
    expect(normalizeModality('Dental')).toBe('DENTAL');
    expect(normalizeModality('DENTAL')).toBe('DENTAL');
    expect(normalizeModality('ECHO')).toBe('ECHO');
    expect(normalizeModality('EEG')).toBe('EEG');
  });

  test('maps common Arabic category names', () => {
    expect(normalizeModality('أشعة مقطعية')).toBe('CT');
    expect(normalizeModality('مقطعية')).toBe('CT');
    expect(normalizeModality('رنين مغناطيسي')).toBe('MR');
    expect(normalizeModality('سونار')).toBe('US');
    expect(normalizeModality('ديكسا')).toBe('DXA');
  });

  test('returns null for unknown categories', () => {
    expect(normalizeModality('أشعة الصدر')).toBeNull();
    expect(normalizeModality('')).toBeNull();
    expect(normalizeModality(null)).toBeNull();
    expect(normalizeModality(undefined)).toBeNull();
  });

  test('resolveModality prefers a stored category modality over the name', () => {
    expect(resolveModality({ name: 'Dental', modality: 'DENTAL' })).toBe('DENTAL');
    expect(resolveModality({ name: 'أشعة مقطعية', modality: null })).toBe('CT');
  });

  test('resolveModality keeps legacy behavior for plain strings', () => {
    expect(resolveModality('Dental')).toBe('DENTAL');
    expect(resolveModality('أشعة الصدر')).toBe('أشعة الصدر');
    expect(resolveModality(null)).toBeNull();
  });

  test('MODALITY_BY_CATEGORY is exported', () => {
    expect(MODALITY_BY_CATEGORY.CT).toBe('CT');
  });
});
