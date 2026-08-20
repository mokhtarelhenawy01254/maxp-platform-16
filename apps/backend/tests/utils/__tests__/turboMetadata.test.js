const {
  parseTurboMetadata,
  mergeTurboMetadata,
  serializeTurboMetadata,
} = require('../../../utils/turbo/turboMetadata');

describe('turboMetadata helpers', () => {
  test('serializeTurboMetadata merges a patch onto existing metadata', () => {
    const existing = JSON.stringify({ bar_code: 'X1', settlementStatus: 'SETTLED', settledBy: 'u-1' });
    const merged = JSON.parse(serializeTurboMetadata(existing, { tracking_number: 'T1', actualShippingCost: 50 }));

    expect(merged.bar_code).toBe('X1');
    expect(merged.tracking_number).toBe('T1');
    expect(merged.actualShippingCost).toBe(50);
  });

  test('preserves settlement state even when the patch carries a settlement key', () => {
    const existing = JSON.stringify({ settlementStatus: 'SETTLED', settledAt: '2026-01-02T00:00:00.000Z' });
    const merged = JSON.parse(serializeTurboMetadata(existing, { status: 'delivered', settlementStatus: 'PENDING' }));

    expect(merged.settlementStatus).toBe('SETTLED');
    expect(merged.settledAt).toBe('2026-01-02T00:00:00.000Z');
    expect(merged.status).toBe('delivered');
  });

  test('keeps a null existing metadata harmless (no settlement to preserve)', () => {
    const merged = JSON.parse(serializeTurboMetadata(null, { code: 'C1', status: 'created' }));
    expect(merged.code).toBe('C1');
    expect(merged.settlementStatus).toBeUndefined();
  });

  test('mergeTurboMetadata preserves existing keys for all writers', () => {
    const merged = mergeTurboMetadata(
      JSON.stringify({ actualShippingCost: 60, actualShippingCostSource: 'turbo-live-api' }),
      { code: 'C2' },
    );

    expect(merged.actualShippingCost).toBe(60);
    expect(merged.actualShippingCostSource).toBe('turbo-live-api');
    expect(merged.code).toBe('C2');
  });

  test('parseTurboMetadata tolerates invalid JSON', () => {
    expect(parseTurboMetadata('not-json')).toEqual({});
    expect(parseTurboMetadata(null)).toEqual({});
    expect(parseTurboMetadata({ a: 1 })).toEqual({ a: 1 });
  });
});
