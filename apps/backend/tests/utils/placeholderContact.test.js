const {
  isPlaceholderPhone,
  isPlaceholderEmail,
} = require('../../utils/placeholderContact');

describe('placeholderContact.isPlaceholderPhone', () => {
  test('flags the exact flagged placeholder +20 100 000 0000', () => {
    expect(isPlaceholderPhone('+20 100 000 0000')).toBe(true);
  });

  test('flags 01000000000', () => {
    expect(isPlaceholderPhone('01000000000')).toBe(true);
  });

  test('flags 01111111111', () => {
    expect(isPlaceholderPhone('01111111111')).toBe(true);
  });

  test('flags 0000000', () => {
    expect(isPlaceholderPhone('0000000')).toBe(true);
  });

  test('does NOT flag a real-looking phone 01123087745', () => {
    expect(isPlaceholderPhone('01123087745')).toBe(false);
  });

  test('does NOT flag real numbers that contain a short zero run', () => {
    expect(isPlaceholderPhone('01110008888')).toBe(false);
    expect(isPlaceholderPhone('01550009999')).toBe(false);
    expect(isPlaceholderPhone('01234567890')).toBe(false);
    expect(isPlaceholderPhone('01000001111')).toBe(false);
    expect(isPlaceholderPhone('01100001111')).toBe(false);
  });

  test('flags a 6+ run of the same digit', () => {
    expect(isPlaceholderPhone('010000000')).toBe(true);
    expect(isPlaceholderPhone('011111111')).toBe(true);
  });

  test('returns false for empty values', () => {
    expect(isPlaceholderPhone('')).toBe(false);
    expect(isPlaceholderPhone(null)).toBe(false);
    expect(isPlaceholderPhone(undefined)).toBe(false);
    expect(isPlaceholderPhone('   ')).toBe(false);
  });
});

describe('placeholderContact.isPlaceholderEmail', () => {
  test('does NOT flag a real domain like khemetluxe.com', () => {
    expect(isPlaceholderEmail('hello@khemetluxe.com')).toBe(false);
  });

  test('flags test@example.com', () => {
    expect(isPlaceholderEmail('test@example.com')).toBe(true);
  });

  test('flags other fake domains', () => {
    expect(isPlaceholderEmail('someone@test.com')).toBe(true);
    expect(isPlaceholderEmail('someone@mailinator.com')).toBe(true);
    expect(isPlaceholderEmail('user@yopmail.com')).toBe(true);
  });

  test('flags test-prefixed addresses', () => {
    expect(isPlaceholderEmail('test123@khemetluxe.com')).toBe(true);
  });

  test('returns false for empty values', () => {
    expect(isPlaceholderEmail('')).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
    expect(isPlaceholderEmail(undefined)).toBe(false);
  });
});
