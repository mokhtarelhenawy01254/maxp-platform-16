const { getPhoneVariants, normalizePhone, toCanonicalE164 } = require('../../utils/phoneNormalization');

describe('phoneNormalization', () => {
  test('variants cover local and international formats for the same number', () => {
    const local = getPhoneVariants('01019046551');
    const intl = getPhoneVariants('201019046551');
    const noZero = getPhoneVariants('1019046551');
    const plus = getPhoneVariants('+201019046551');

    expect(local).toEqual(expect.arrayContaining(['01019046551', '1019046551', '201019046551']));
    expect(intl).toEqual(expect.arrayContaining(['01019046551', '1019046551', '201019046551']));
    expect(noZero).toEqual(expect.arrayContaining(['01019046551', '1019046551', '201019046551']));
    expect(plus).toEqual(expect.arrayContaining(['01019046551', '1019046551', '201019046551']));
  });

  test('local Egyptian phone is normalized to its leading-zero form', () => {
    expect(normalizePhone('01019046551')).toBe('01019046551');
    expect(normalizePhone('201019046551')).toBe('01019046551');
    expect(normalizePhone('1019046551')).toBe('01019046551');
    expect(normalizePhone('00201019046551')).toBe('01019046551');
  });

  test('strips non-digit characters', () => {
    expect(normalizePhone('+20 101 904 6551')).toBe('01019046551');
  });

  test('toCanonicalE164 produces one canonical form for every input format', () => {
    expect(toCanonicalE164('01019046551')).toBe('+201019046551');
    expect(toCanonicalE164('201019046551')).toBe('+201019046551');
    expect(toCanonicalE164('1019046551')).toBe('+201019046551');
    expect(toCanonicalE164('+201019046551')).toBe('+201019046551');
    expect(toCanonicalE164('00201019046551')).toBe('+201019046551');
    expect(toCanonicalE164('')).toBeNull();
    expect(toCanonicalE164(null)).toBeNull();
  });

  test('local and international Egyptian formats collapse to the same canonical', () => {
    expect(toCanonicalE164('01019046551')).toBe(toCanonicalE164('201019046551'));
    expect(toCanonicalE164('01022953653')).toBe(toCanonicalE164('201022953653'));
    expect(toCanonicalE164('01111706433')).toBe(toCanonicalE164('201111706433'));
    expect(toCanonicalE164('01288000309')).toBe(toCanonicalE164('201288000309'));
    expect(toCanonicalE164('2001550599337')).toBe(toCanonicalE164('201550599337'));
  });
});
