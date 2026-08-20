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
    expect(caught.message).toContain('╪│╪¿╪¿ ╪¬╪╣┘ä┘è┘é ╪º┘ä╪╖┘ä╪¿ ┘à╪╖┘ä┘ê╪¿');
  });

  test('allows holding with a reason note', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'PREPARING',
      targetStatus: 'ON_HOLD_PREP',
      notes: '┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪▒╪» ╪º┘ä╪╣┘à┘è┘ä ╪╣┘ä┘ë ╪º┘ä╪╣┘å┘ê╪º┘å',
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
    expect(caught.message).toContain('┘à╪╣┘ä┘é ╪¿╪º┘å╪¬╪╕╪º╪▒ ╪¡┘ä ╪º┘ä┘à╪┤┘â┘ä╪⌐');
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
      notes: '╪¬┘à ╪¡┘ä ╪º┘ä┘à╪┤┘â┘ä╪⌐',
    });

    expect(result).toBeNull();
  });

  test('allows terminal moves (cancel) while held', async () => {
    const result = await assertPreparationHoldRule({
      currentPreparationStatus: 'ON_HOLD_PREP',
      targetStatus: 'CANCELLED',
      notes: '╪Ñ┘ä╪║╪º╪í',
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
