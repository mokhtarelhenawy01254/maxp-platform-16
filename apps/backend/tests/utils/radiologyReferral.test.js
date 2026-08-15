const { suggestMarketingRep } = require('../../utils/radiologyReferral');

describe('radiologyReferral — suggestMarketingRep', () => {
  test('مندوب الطبيب يسبق مندوب الجهة', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: 'rep-physician' }, source: { marketingRepId: 'rep-source' } }))
      .toBe('rep-physician');
  });

  test('مندوب الجهة بديل عند غياب مندوب الطبيب', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: null }, source: { marketingRepId: 'rep-source' } }))
      .toBe('rep-source');
  });

  test('طبيب فقط — مندوبه يُقترح', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: 'rep-p' } })).toBe('rep-p');
  });

  test('جهة فقط — مندوبها يُقترح', () => {
    expect(suggestMarketingRep({ source: { marketingRepId: 'rep-s' } })).toBe('rep-s');
  });

  test('لا طبيب ولا جهة → null (لا افتراض خاطئ)', () => {
    expect(suggestMarketingRep({ physician: {}, source: {} })).toBeNull();
  });

  test('سياق فارغ → null', () => {
    expect(suggestMarketingRep()).toBeNull();
  });

  test('سياق بلا مندوبين → null', () => {
    expect(suggestMarketingRep({ physician: { marketingRepId: null }, source: { marketingRepId: null } })).toBeNull();
  });
});
