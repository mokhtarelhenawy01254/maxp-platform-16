const { resolveShippingClass } = require('../shippingClassUtils');

describe('resolveShippingClass', () => {
  test('uses product shipping class when variant only carries standard fallback', () => {
  const variantMetadata = JSON.stringify({ shippingClass: 'standard' });
  const productMetadata = JSON.stringify({ shippingClass: 'وم' });

    expect(resolveShippingClass(variantMetadata, productMetadata)).toBe('وم');
  });

  test('keeps variant shipping class when it explicitly differs from standard', () => {
    const variantMetadata = JSON.stringify({ shippingClass: 'express' });
    const productMetadata = JSON.stringify({ shippingClass: 'وم' });

    expect(resolveShippingClass(variantMetadata, productMetadata)).toBe('express');
  });

  test('falls back to standard when no shipping class exists anywhere', () => {
    expect(resolveShippingClass(null, null)).toBe('standard');
  });
});
