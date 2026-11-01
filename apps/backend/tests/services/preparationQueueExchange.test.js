/**
 * Regression tests — exchange (replacement) orders must reach the preparation queue.
 *
 * Bug (task 4b5b8635): a replacement order was saved with status EXCHANGED, and the
 * preparation queue treats EXCHANGED as a terminal status, so the replacement never
 * appeared for preparation and never shipped. The ORIGINAL order must stay EXCHANGED
 * and stay out of the queue.
 */

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const {
  getEffectivePreparationStatus,
  mapRegularOrderToSimple,
} = require('../../services/preparationQueueService');

describe('preparation queue — exchange replacement exception (task 4b5b8635)', () => {
  it('treats an EXCHANGED order flagged as an exchange replacement as PENDING_PREPARATION', () => {
    expect(
      getEffectivePreparationStatus('EXCHANGED', { requestType: 'exchange' })
    ).toBe('PENDING_PREPARATION');

    expect(
      getEffectivePreparationStatus('EXCHANGED', {
        requestType: 'exchange',
        originalOrderId: 'orig-1',
        originalOrderNumber: 'ORD-000001-111',
      })
    ).toBe('PENDING_PREPARATION');
  });

  it('also admits a replacement identified only by originalOrderId (legacy rows)', () => {
    expect(
      getEffectivePreparationStatus('EXCHANGED', { originalOrderId: 'orig-1' })
    ).toBe('PENDING_PREPARATION');
  });

  it('keeps the ORIGINAL EXCHANGED order terminal and out of preparation', () => {
    // An original order carries neither requestType=exchange nor originalOrderId.
    expect(getEffectivePreparationStatus('EXCHANGED', {})).toBe('EXCHANGED');
    expect(getEffectivePreparationStatus('EXCHANGED', null)).toBe('EXCHANGED');
  });

  it('does not resurrect a replacement that already has a preparation status', () => {
    expect(
      getEffectivePreparationStatus('EXCHANGED', {
        requestType: 'exchange',
        preparationStatus: 'PREPARING',
      })
    ).toBe('PREPARING');
  });

  it('leaves every other terminal status untouched', () => {
    for (const status of ['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']) {
      expect(
        getEffectivePreparationStatus(status, { requestType: 'exchange' })
      ).toBe(status);
    }
  });

  it('exposes originalOrderId/originalOrderNumber on the queue row for the badge + link', () => {
    const mapped = mapRegularOrderToSimple({
      orderNumber: 'ORD-000002-222',
      status: 'PENDING_PREPARATION',
      metadata: {
        requestType: 'exchange',
        originalOrderId: 'orig-1',
        originalOrderNumber: 'ORD-000001-111',
      },
      customer: { name: 'عميل', phone: '01000000000' },
      items: [],
      shipments: [],
    });

    expect(mapped.originalOrderId).toBe('orig-1');
    expect(mapped.originalOrderNumber).toBe('ORD-000001-111');
  });
});
