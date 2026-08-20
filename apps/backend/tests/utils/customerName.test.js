const { splitCustomerName, cleanNameToken } = require('../../utils/customerName');

describe('customerName', () => {
  test('splits a full name into first and last', () => {
    expect(splitCustomerName('Heba Mohamed')).toEqual({ firstName: 'Heba', lastName: 'Mohamed' });
    expect(splitCustomerName('╪ú╪¡┘à╪» ╪╣┘ä┘è ┘à╪¡┘à┘ê╪»')).toEqual({ firstName: '╪ú╪¡┘à╪»', lastName: '╪╣┘ä┘è ┘à╪¡┘à┘ê╪»' });
  });

  test('single-token name leaves lastName empty', () => {
    expect(splitCustomerName('Heba')).toEqual({ firstName: 'Heba', lastName: '' });
    expect(splitCustomerName('╪ú╪¡┘à╪»')).toEqual({ firstName: '╪ú╪¡┘à╪»', lastName: '' });
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
    expect(cleanNameToken('   ┘à╪¡┘à╪»  ')).toBe('┘à╪¡┘à╪»');
  });
});
