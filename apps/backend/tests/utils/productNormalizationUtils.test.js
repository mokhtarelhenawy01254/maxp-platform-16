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

  test('parses variant names with hyphen without surrounding spaces (e.g. بيج-41, Black-42)', () => {
    expect(
      resolveVariantAttributes({
        name: 'بيج-41',
      }),
    ).toEqual({
      Color: 'بيج',
      Size: '41',
    });

    expect(
      resolveVariantAttributes({
        name: 'Black-42',
      }),
    ).toEqual({
      Color: 'Black',
      Size: '42',
    });

    expect(
      resolveVariantAttributes({
        name: 'Off-White - 42',
      }),
    ).toEqual({
      Color: 'Off-White',
      Size: '42',
    });
  });
});
