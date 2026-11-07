const {
  isValidCustomerPhone
} = require('../../../services/orders/incompleteCartAutoConvertService');

describe('Incomplete Cart Auto Convert Service - Phone Validation Safeguards', () => {
  test('rejects empty or missing phone numbers', () => {
    expect(isValidCustomerPhone('')).toBe(false);
    expect(isValidCustomerPhone(null)).toBe(false);
    expect(isValidCustomerPhone(undefined)).toBe(false);
  });

  test('accepts valid Egyptian mobile numbers', () => {
    expect(isValidCustomerPhone('01012345678')).toBe(true);
    expect(isValidCustomerPhone('01198765432')).toBe(true);
    expect(isValidCustomerPhone('01287654321')).toBe(true);
    expect(isValidCustomerPhone('01511223344')).toBe(true);
    expect(isValidCustomerPhone('+201012345678')).toBe(true);
  });

  test('rejects dummy repeating numbers', () => {
    expect(isValidCustomerPhone('01000000000')).toBe(false);
    expect(isValidCustomerPhone('01111111111')).toBe(false);
    expect(isValidCustomerPhone('01222222222')).toBe(false);
    expect(isValidCustomerPhone('0000000000')).toBe(false);
    expect(isValidCustomerPhone('1111111111')).toBe(false);
  });

  test('rejects sequential dummy numbers and too short numbers', () => {
    expect(isValidCustomerPhone('0123456789')).toBe(false);
    expect(isValidCustomerPhone('01234567890')).toBe(false);
    expect(isValidCustomerPhone('1234567890')).toBe(false);
    expect(isValidCustomerPhone('123')).toBe(false);
  });
});
