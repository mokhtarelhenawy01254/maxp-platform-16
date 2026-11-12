const mockPrisma = {
  $executeRawUnsafe: jest.fn(async () => 0),
  messageInboundDedupe: {
    create: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const {
  claimInboundMessage,
  commitInboundClaim,
  releaseInboundClaim,
  claimInboundAutoReply,
  filterUnclaimedAutoReplyEntries,
  logDuplicateSkipped,
  getDailyDuplicateCount,
  resetDailyDuplicateCounts,
  ensureInboundDedupeSchema,
  resetSchemaEnsureState,
} = require('../../services/inboundDeduplicationGuard');

describe('inboundDeduplicationGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSchemaEnsureState();
    resetDailyDuplicateCounts();
  });

  test('claims a new (companyId, channel, externalMessageId) and returns duplicate: false', async () => {
    mockPrisma.messageInboundDedupe.create.mockResolvedValue({
      id: 'claim-1',
      companyId: 'comp-1',
      channel: 'whatsapp',
      externalMessageId: 'wamid.123',
      conversationId: 'conv-1',
    });

    const result = await claimInboundMessage({
      companyId: 'comp-1',
      channel: 'whatsapp',
      externalMessageId: 'wamid.123',
      conversationId: 'conv-1',
    });

    expect(result).toEqual({
      duplicate: false,
      claim: expect.objectContaining({ id: 'claim-1' }),
    });
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
    expect(mockPrisma.messageInboundDedupe.create).toHaveBeenCalledWith({
      data: {
        companyId: 'comp-1',
        channel: 'whatsapp',
        externalMessageId: 'wamid.123',
        conversationId: 'conv-1',
      },
    });
  });

  test('returns duplicate: true and increments duplicateCount on P2002 unique constraint violation', async () => {
    const p2002Error = new Error('Unique constraint failed on the fields: (`companyId`,`channel`,`externalMessageId`)');
    p2002Error.code = 'P2002';

    mockPrisma.messageInboundDedupe.create
      .mockResolvedValueOnce({ id: 'claim-1', companyId: 'comp-1', channel: 'whatsapp', externalMessageId: 'wamid.123' })
      .mockRejectedValueOnce(p2002Error);
    mockPrisma.messageInboundDedupe.updateMany.mockResolvedValue({ count: 1 });

    const first = await claimInboundMessage({
      companyId: 'comp-1',
      channel: 'whatsapp',
      externalMessageId: 'wamid.123',
      conversationId: 'conv-1',
    });
    const second = await claimInboundMessage({
      companyId: 'comp-1',
      channel: 'whatsapp',
      externalMessageId: 'wamid.123',
      conversationId: 'conv-1',
    });

    expect(first.duplicate).toBe(false);
    expect(second).toEqual({ duplicate: true, claim: null });
    expect(mockPrisma.messageInboundDedupe.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: 'comp-1',
        channel: 'whatsapp',
        externalMessageId: 'wamid.123',
      },
      data: {
        duplicateCount: { increment: 1 },
        lastSeenAt: expect.any(Date),
      },
    });
  });

  test('rethrows non-unique-constraint errors instead of swallowing them silently', async () => {
    const dbError = new Error('Connection terminated unexpectedly');
    dbError.code = 'P1001';
    mockPrisma.messageInboundDedupe.create.mockRejectedValue(dbError);

    await expect(
      claimInboundMessage({
        companyId: 'comp-1',
        channel: 'facebook',
        externalMessageId: 'mid.456',
        conversationId: 'conv-2',
      })
    ).rejects.toThrow('Connection terminated unexpectedly');
  });

  test('skips claiming when externalMessageId is missing', async () => {
    const result = await claimInboundMessage({
      companyId: 'comp-1',
      channel: 'facebook',
      externalMessageId: null,
      conversationId: 'conv-2',
    });

    expect(result).toEqual({ duplicate: false, claim: null });
    expect(mockPrisma.messageInboundDedupe.create).not.toHaveBeenCalled();
  });

  test('commitInboundClaim updates messageId and releaseInboundClaim deletes claim row', async () => {
    mockPrisma.messageInboundDedupe.update.mockResolvedValue({ id: 'claim-1', messageId: 'msg-99' });
    mockPrisma.messageInboundDedupe.delete.mockResolvedValue({ id: 'claim-1' });

    await commitInboundClaim('claim-1', 'msg-99');
    expect(mockPrisma.messageInboundDedupe.update).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
      data: { messageId: 'msg-99' },
    });

    const released = await releaseInboundClaim('claim-1');
    expect(released).toBe(true);
    expect(mockPrisma.messageInboundDedupe.delete).toHaveBeenCalledWith({
      where: { id: 'claim-1' },
    });
  });

  test('logDuplicateSkipped prints single-line audit log with channel, externalMessageId, companyId, conversationId and dailyCount', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const first = logDuplicateSkipped({
      channel: 'whatsapp',
      externalMessageId: 'wamid.789',
      companyId: 'comp-1',
      conversationId: 'conv-1',
    });
    const second = logDuplicateSkipped({
      channel: 'whatsapp',
      externalMessageId: 'wamid.790',
      companyId: 'comp-1',
      conversationId: 'conv-1',
    });

    expect(first.dailyCount).toBe(1);
    expect(second.dailyCount).toBe(2);
    expect(getDailyDuplicateCount({ channel: 'whatsapp', date: first.date })).toBe(2);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      `[INBOUND-DEDUPE] duplicate_skipped channel=whatsapp externalMessageId=wamid.789 companyId=comp-1 conversationId=conv-1 date=${first.date} dailyCount=1`
    );
    logSpy.mockRestore();
  });

  test('claimInboundAutoReply uses :autoreply namespace and blocks duplicate bot/AI replies', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPrisma.messageInboundDedupe.create
      .mockResolvedValueOnce({ id: 'ar-claim-1' })
      .mockRejectedValueOnce(p2002Error);
    mockPrisma.messageInboundDedupe.updateMany.mockResolvedValue({ count: 1 });

    const first = await claimInboundAutoReply({
      companyId: 'comp-1',
      channel: 'facebook',
      externalMessageId: 'm_mid_1',
      conversationId: 'conv-1',
    });
    const second = await claimInboundAutoReply({
      companyId: 'comp-1',
      channel: 'facebook',
      externalMessageId: 'm_mid_1',
      conversationId: 'conv-1',
    });

    expect(first).toEqual({ duplicate: false, claim: { id: 'ar-claim-1' } });
    expect(second).toEqual({ duplicate: true, claim: null });
    expect(mockPrisma.messageInboundDedupe.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'facebook:autoreply',
          externalMessageId: 'm_mid_1',
        }),
      })
    );
  });

  test('filterUnclaimedAutoReplyEntries drops already-claimed external IDs from debounce batch', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockPrisma.messageInboundDedupe.create
      .mockResolvedValueOnce({ id: 'ar-1' })
      .mockRejectedValueOnce(p2002Error);
    mockPrisma.messageInboundDedupe.updateMany.mockResolvedValue({ count: 1 });

    const { entriesToProcess, skippedIds } = await filterUnclaimedAutoReplyEntries({
      companyId: 'comp-1',
      channel: 'facebook',
      conversationId: 'conv-1',
      entries: [
        { fbMessageId: 'mid.fresh', message: 'hello' },
        { fbMessageId: 'mid.dup', message: 'hello' },
      ],
    });

    expect(entriesToProcess).toEqual([{ fbMessageId: 'mid.fresh', message: 'hello' }]);
    expect(skippedIds).toEqual(['mid.dup']);
  });

  test('ensureInboundDedupeSchema runs idempotent DDL once per process lifecycle', async () => {
    await ensureInboundDedupeSchema(mockPrisma);
    await ensureInboundDedupeSchema(mockPrisma);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(8);
  });
});
