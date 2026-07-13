const {
  sanitizePotentiallyUnsafeString,
} = require('../../utils/requestSanitizer');

describe('requestSanitizer', () => {
  test('removes script tags and javascript protocol payloads', () => {
    expect(
      sanitizePotentiallyUnsafeString(
        '<script>alert(1)</script>javascript:alert(2)',
      ),
    ).toBe('alert(2)');
  });

  test('strips html event handler attributes without corrupting utm_content params', () => {
    expect(
      sanitizePotentiallyUnsafeString('<div onclick=alert(1)>Buy</div>'),
    ).toBe('<div alert(1)>Buy</div>');

    expect(
      sanitizePotentiallyUnsafeString(
        '/shop?utm_source=facebook&utm_content=creative_a&ad_id=123',
      ),
    ).toBe('/shop?utm_source=facebook&utm_content=creative_a&ad_id=123');
  });
});
