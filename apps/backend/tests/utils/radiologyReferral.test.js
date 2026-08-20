const { suggestMarketingRep } = require('../../utils/radiologyReferral');

describe('radiologyReferral ΓÇö suggestMarketingRep', () => {
  test('┘à┘å╪»┘ê╪¿ ╪º┘ä╪╖╪¿┘è╪¿ ┘è╪│╪¿┘é ┘à┘å╪»┘ê╪¿ ╪º┘ä╪¼┘ç╪⌐', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: 'rep-physician' }, source: { marketingRepId: 'rep-source' } }))
      .toBe('rep-physician');
  });

  test('┘à┘å╪»┘ê╪¿ ╪º┘ä╪¼┘ç╪⌐ ╪¿╪»┘è┘ä ╪╣┘å╪» ╪║┘è╪º╪¿ ┘à┘å╪»┘ê╪¿ ╪º┘ä╪╖╪¿┘è╪¿', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: null }, source: { marketingRepId: 'rep-source' } }))
      .toBe('rep-source');
  });

  test('╪╖╪¿┘è╪¿ ┘ü┘é╪╖ ΓÇö ┘à┘å╪»┘ê╪¿┘ç ┘è┘Å┘é╪¬╪▒╪¡', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: 'rep-p' } })).toBe('rep-p');
  });

  test('╪¼┘ç╪⌐ ┘ü┘é╪╖ ΓÇö ┘à┘å╪»┘ê╪¿┘ç╪º ┘è┘Å┘é╪¬╪▒╪¡', () => {
    expect(suggestMarketingRep({ source: { marketingRepId: 'rep-s' } })).toBe('rep-s');
  });

  test('┘ä╪º ╪╖╪¿┘è╪¿ ┘ê┘ä╪º ╪¼┘ç╪⌐ ΓåÆ null (┘ä╪º ╪º┘ü╪¬╪▒╪º╪╢ ╪«╪º╪╖╪ª)', () => {
    expect(suggestMarketingRep({ physician: {}, source: {} })).toBeNull();
  });

  test('╪│┘è╪º┘é ┘ü╪º╪▒╪║ ΓåÆ null', () => {
    expect(suggestMarketingRep()).toBeNull();
  });

  test('╪│┘è╪º┘é ╪¿┘ä╪º ┘à┘å╪»┘ê╪¿┘è┘å ΓåÆ null', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: null }, source: { marketingRepId: null } })).toBeNull();
  });
});
