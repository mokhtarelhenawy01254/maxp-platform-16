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
    expect(normalizeModality('╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐')).toBe('CT');
    expect(normalizeModality('┘à┘é╪╖╪╣┘è╪⌐')).toBe('CT');
    expect(normalizeModality('╪▒┘å┘è┘å ┘à╪║┘å╪º╪╖┘è╪│┘è')).toBe('MR');
    expect(normalizeModality('╪│┘ê┘å╪º╪▒')).toBe('US');
    expect(normalizeModality('╪»┘è┘â╪│╪º')).toBe('DXA');
  });

  test('returns null for unknown categories', () => {
    expect(normalizeModality('╪ú╪┤╪╣╪⌐ ╪º┘ä╪╡╪»╪▒')).toBeNull();
    expect(normalizeModality('')).toBeNull();
    expect(normalizeModality(null)).toBeNull();
    expect(normalizeModality(undefined)).toBeNull();
  });

  test('resolveModality prefers a stored category modality over the name', () => {
    expect(resolveModality({ name: 'Dental', modality: 'DENTAL' })).toBe('DENTAL');
    expect(resolveModality({ name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐', modality: null })).toBe('CT');
  });

  test('resolveModality keeps legacy behavior for plain strings', () => {
    expect(resolveModality('Dental')).toBe('DENTAL');
    expect(resolveModality('╪ú╪┤╪╣╪⌐ ╪º┘ä╪╡╪»╪▒')).toBe('╪ú╪┤╪╣╪⌐ ╪º┘ä╪╡╪»╪▒');
    expect(resolveModality(null)).toBeNull();
  });

  test('MODALITY_BY_CATEGORY is exported', () => {
    expect(MODALITY_BY_CATEGORY.CT).toBe('CT');
  });
});
