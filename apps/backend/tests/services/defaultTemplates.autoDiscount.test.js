const DEFAULT_TEMPLATES = require('../../services/whatsapp/templates/defaultTemplates');

describe('defaultTemplates ΓÇö auto-discount events', () => {
  test('contains default templates for all three auto-discount events', () => {
    expect(DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_GRANTED).toBeDefined();
    expect(DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_EXPIRING).toBeDefined();
    expect(DEFAULT_TEMPLATES.AUTO_DISCOUNT_CASHBACK_CONVERTED).toBeDefined();
  });

  test('auto-discount default templates expose their variables', () => {
    const granted = DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_GRANTED;
    expect(granted.variables).toEqual(expect.arrayContaining([
      'customerName', 'discountPercent', 'voucherAmount', 'currency', 'expiryDate',
    ]));

    const expiring = DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_EXPIRING;
    expect(expiring.variables).toEqual(expect.arrayContaining([
      'customerName', 'discountPercent', 'expiryDate',
    ]));

    const converted = DEFAULT_TEMPLATES.AUTO_DISCOUNT_CASHBACK_CONVERTED;
    expect(converted.variables).toEqual(expect.arrayContaining([
      'customerName', 'voucherAmount', 'currency',
    ]));
  });

  test('auto-discount default template content references the right variables', () => {
    const granted = DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_GRANTED.content;
    expect(granted).toContain('{discountPercent}');
    expect(granted).toContain('{expiryDate}');

    const expiring = DEFAULT_TEMPLATES.AUTO_DISCOUNT_COUPON_EXPIRING.content;
    expect(expiring).toContain('{discountPercent}');

    const converted = DEFAULT_TEMPLATES.AUTO_DISCOUNT_CASHBACK_CONVERTED.content;
    expect(converted).toContain('{voucherAmount}');
  });
});
