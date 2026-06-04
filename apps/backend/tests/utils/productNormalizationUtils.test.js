const {
  normalizeVariantAttributes,
  parseVariantMetadata,
  resolveVariantAttributes,
} = require('../../utils/productNormalizationUtils');

describe('productNormalizationUtils variant attributes', () => {
  test('canonicalizes plural Arabic color keys to Color', () => {
    expect(
      normalizeVariantAttributes({
        الالوان: 'أسود',
        الألوان: 'أبيض',
        المقاس: '39',
      }),
    ).toEqual({
      Color: 'أبيض',
      Size: '39',
    });
  });

  test('parses imported metadata arrays into storefront variant attributes', () => {
    expect(
      parseVariantMetadata([
        { name: 'ألوان', option: 'بيج' },
        { name: 'المقاسات', option: '40' },
      ]),
    ).toEqual({
      Color: 'بيج',
      Size: '40',
    });
  });

  test('resolves plural color metadata when direct variant attributes are absent', () => {
    expect(
      resolveVariantAttributes({
        name: 'Imported variant',
        type: 'combination',
        metadata: JSON.stringify({
          attributes: [{ name: 'الألوان', option: 'أسود' }],
        }),
      }),
    ).toEqual({
      Color: 'أسود',
    });
  });
});
