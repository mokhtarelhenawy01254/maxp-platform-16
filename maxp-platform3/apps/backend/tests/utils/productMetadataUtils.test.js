const {
  parseProductMetadata,
  isCorruptedProductMetadata,
} = require('../../utils/productMetadataUtils');

const toCharacterMap = (value, extra = {}) =>
  value.split('').reduce(
    (acc, char, index) => {
      acc[index] = char;
      return acc;
    },
    { ...extra },
  );

describe('productMetadataUtils', () => {
  test('parses regular JSON strings into metadata objects', () => {
    expect(
      parseProductMetadata('{"shippingClass":"express","workflow":{"status":"PUBLISHED"}}'),
    ).toEqual({
      shippingClass: 'express',
      workflow: { status: 'PUBLISHED' },
    });
  });

  test('rebuilds corrupted character-map metadata and keeps latest sibling fields', () => {
    const originalMetadata = JSON.stringify({
      shippingClass: 'standard',
      workflow: { status: 'DRAFT' },
      nested: { enabled: true },
    });

    const corrupted = toCharacterMap(originalMetadata, {
      shippingClass: 'express',
      variantSettings: {
        styles: { colorMode: 'swatch' },
      },
    });

    expect(parseProductMetadata(corrupted)).toEqual({
      shippingClass: 'express',
      workflow: { status: 'DRAFT' },
      nested: { enabled: true },
      variantSettings: {
        styles: { colorMode: 'swatch' },
      },
    });
  });

  test('rebuilds repeatedly corrupted metadata layers', () => {
    const baseMetadata = {
      shippingClass: 'standard',
      excludeFromFreeShipping: false,
      workflow: { status: 'APPROVED' },
    };

    const nestedCorruption = toCharacterMap(
      JSON.stringify(
        toCharacterMap(JSON.stringify(baseMetadata), {
          shippingClass: 'heavy',
        }),
      ),
      {
        excludeFromFreeShipping: true,
      },
    );

    expect(parseProductMetadata(nestedCorruption)).toEqual({
      shippingClass: 'heavy',
      excludeFromFreeShipping: true,
      workflow: { status: 'APPROVED' },
    });
  });

  test('supports character maps that store digit characters as numbers', () => {
    const mixedCharacterMap = toCharacterMap('{"barcode":"0123","workflow":{"status":"DRAFT"}}');
    mixedCharacterMap[12] = 0;
    mixedCharacterMap[13] = 1;
    mixedCharacterMap[14] = 2;
    mixedCharacterMap[15] = 3;

    expect(parseProductMetadata(mixedCharacterMap)).toEqual({
      barcode: '0123',
      workflow: { status: 'DRAFT' },
    });
    expect(isCorruptedProductMetadata(mixedCharacterMap)).toBe(true);
  });

  test('detects corrupted character-map metadata safely', () => {
    expect(isCorruptedProductMetadata(toCharacterMap('{"shippingClass":"standard"}'))).toBe(true);
    expect(isCorruptedProductMetadata('{"shippingClass":"standard"}')).toBe(false);
    expect(isCorruptedProductMetadata({ shippingClass: 'standard' })).toBe(false);
  });
});
