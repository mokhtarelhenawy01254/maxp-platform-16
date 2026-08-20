jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({})),
}));

const {
  assertPreparationHoldRule,
} = require('../../services/preparationQueueService');

describe('preparationQueueService.assertPreparationHoldRule', () => {
  test('requires a reason note when putting an order on hold (ON_HOLD_PREP)', async () => {
    let caught = null;
    try {
      await assertPreparationHoldRule({
        currentPreparationStatus: 'PREPARING',
        targetStatus: 'ON_HOLD_PREP',
        notes: '',
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    expect(caught.statusCode).toBe(400);
    expect(caught.message).toContain('سبب تعليق الطلب مطلوب');
  });

  test('allows holding with a reason note', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'PREPARING',
      targetStatus: 'ON_HOLD_PREP',
      notes: 'في انتظار رد العميل على العنوان',
    });

    expect(result).toBeNull();
  });

  test('blocks a held order from moving directly to READY_TO_SHIP', async () => {
    let caught = null;
    try {
      await assertPreparationHoldRule({
        currentPreparationStatus: 'ON_HOLD_PREP',
        targetStatus: 'READY_TO_SHIP',
        notes: '',
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    expect(caught.statusCode).toBe(400);
    expect(caught.message).toContain('معلق بانتظار حل المشكلة');
  });

  test('blocks a held order from moving to any forward prep stage', async () => {
    let caught = null;
    try {
      await assertPreparationHoldRule({
        currentPreparationStatus: 'ON_HOLD_PREP',
        targetStatus: 'QUALITY_CHECK',
        notes: '',
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    expect(caught.statusCode).toBe(400);
  });

  test('allows releasing a held order back to starting status', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'ON_HOLD_PREP',
      targetStatus: 'PENDING_PREPARATION',
      notes: 'تم حل المشكلة',
    });

    expect(result).toBeNull();
  });

  test('allows terminal moves (cancel) while held', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'ON_HOLD_PREP',
      targetStatus: 'CANCELLED',
      notes: 'إلغاء',
    });

    expect(result).toBeNull();
  });

  test('allows override to bypass the forward block', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'ON_HOLD_PREP',
      targetStatus: 'READY_TO_SHIP',
      notes: '',
      isOverride: true,
    });

    expect(result).toBeNull();
  });

  test('does not block normal forward moves for non-held orders', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'PREPARING',
      targetStatus: 'QUALITY_CHECK',
      notes: '',
    });

    expect(result).toBeNull();
  });
});
