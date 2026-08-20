const {
  validateStock,
  MAX_PRODUCT_STOCK,
} = require('../../utils/stockValidation');

describe('stockValidation.validateStock', () => {
  test('accepts a valid positive integer', () => {
    expect(validateStock(5)).toEqual({ ok: true });
  });

  test('accepts zero', () => {
    expect(validateStock(0)).toEqual({ ok: true });
  });

  test('rejects negative values', () => {
    const result = validateStock(-1);
    expect(result.ok).toBe(false);
    expect(result.message).toBeDefined();
  });

  test('rejects values above the cap (99914)', () => {
    const result = validateStock(99914);
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(MAX_PRODUCT_STOCK));
  });

  test('accepts the exact cap value', () => {
    expect(validateStock(MAX_PRODUCT_STOCK)).toEqual({ ok: true });
  });

  test('rejects NaN', () => {
    const result = validateStock(NaN);
    expect(result.ok).toBe(false);
  });

  test('rejects non-numeric strings', () => {
    const result = validateStock('abc');
    expect(result.ok).toBe(false);
  });

  test('rejects Infinity', () => {
    expect(validateStock(Infinity).ok).toBe(false);
    expect(validateStock(-Infinity).ok).toBe(false);
  });

  test('accepts numeric strings', () => {
    expect(validateStock('5000')).toEqual({ ok: true });
    expect(validateStock('0')).toEqual({ ok: true });
  });

  test('rejects numeric strings above the cap', () => {
    expect(validateStock('99914').ok).toBe(false);
  });

  test('rejects empty / null / undefined values', () => {
    expect(validateStock('').ok).toBe(false);
    expect(validateStock(null).ok).toBe(false);
    expect(validateStock(undefined).ok).toBe(false);
  });

  test('exposes the max product stock cap', () => {
    expect(MAX_PRODUCT_STOCK).toBe(10000);
  });
});
