const { splitCustomerName, cleanNameToken } = require('../../utils/customerName');

describe('customerName', () => {
  test('splits a full name into first and last', () => {
    expect(splitCustomerName('Heba Mohamed')).toEqual({ firstName: 'Heba', lastName: 'Mohamed' });
    expect(splitCustomerName('أحمد علي محمود')).toEqual({ firstName: 'أحمد', lastName: 'علي محمود' });
  });

  test('single-token name leaves lastName empty', () => {
    expect(splitCustomerName('Heba')).toEqual({ firstName: 'Heba', lastName: '' });
    expect(splitCustomerName('أحمد')).toEqual({ firstName: 'أحمد', lastName: '' });
  });

  test('strips decorative characters from WhatsApp-style names', () => {
    expect(splitCustomerName('~ Heba ~')).toEqual({ firstName: 'Heba', lastName: '' });
    expect(splitCustomerName('~ Heba ~ Mohamed')).toEqual({ firstName: 'Heba', lastName: 'Mohamed' });
    expect(splitCustomerName('Sara*')).toEqual({ firstName: 'Sara', lastName: '' });
  });

  test('falls back to WhatsApp User for empty input', () => {
    expect(splitCustomerName('')).toEqual({ firstName: 'WhatsApp User', lastName: '' });
    expect(splitCustomerName(null)).toEqual({ firstName: 'WhatsApp User', lastName: '' });
    expect(splitCustomerName('   ')).toEqual({ firstName: 'WhatsApp User', lastName: '' });
  });

  test('cleanNameToken trims surrounding symbols', () => {
    expect(cleanNameToken('~Heba~')).toBe('Heba');
    expect(cleanNameToken('*Sara*')).toBe('Sara');
    expect(cleanNameToken('   محمد  ')).toBe('محمد');
  });
});
