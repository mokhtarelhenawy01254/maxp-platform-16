jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyCriticalFindingsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => { response.statusCode = code; return response; }),
    json: jest.fn((payload) => { response.payload = payload; return response; }),
  };
  return response;
};

const createPrisma = () => ({
  radiologyStudy: { findFirst: jest.fn() },
  radiologyReport: { findUnique: jest.fn(), update: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1', firstName: 'أحمد', lastName: 'محمود' },
  params: {},
  body: {},
  ...overrides,
});

describe('radiologyCriticalFindingsController', () => {
  test('setCriticalFinding returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ user: {}, params: { id: 'study-1' }, body: { category: 'CAT1' } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, error: 'غير مصرح' });
  });

  test('setCriticalFinding returns 404 when study is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'CAT1' } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: 'الدراسة غير موجودة' });
  });

  test('setCriticalFinding returns 400 when report is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'CAT1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'التقرير غير موجود — أنشئ مسودة أولاً' });
  });

  test('setCriticalFinding rejects an invalid category', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'CAT9' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'فئة العثور الحرج غير صحيحة' });
    expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
    expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
  });

  test('setCriticalFinding sets category, finding text and flag fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'CAT1', findingText: 'نزيف حاد' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.criticalCategory).toBe('CAT1');
    expect(call.data.criticalFindingText).toBe('نزيف حاد');
    expect(call.data.criticalFlaggedBy).toBe('أحمد محمود');
    expect(call.data.criticalFlaggedAt).toBeInstanceOf(Date);
  });

  test('setCriticalFinding does not overwrite existing flag fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', criticalFlaggedAt: new Date('2026-01-01T10:00:00Z') });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'CAT2', findingText: 'متابعة' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.criticalFlaggedBy).toBeUndefined();
    expect(call.data.criticalFlaggedAt).toBeUndefined();
    expect(call.data.criticalCategory).toBe('CAT2');
  });

  test('setCriticalFinding with NONE clears the finding text', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.setCriticalFinding(req({ params: { id: 'study-1' }, body: { category: 'NONE' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.criticalCategory).toBe('NONE');
    expect(call.data.criticalFindingText).toBeNull();
  });

  test('acknowledgeCriticalFinding returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ user: {}, params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, error: 'غير مصرح' });
  });

  test('acknowledgeCriticalFinding returns 404 when study is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: 'الدراسة غير موجودة' });
  });

  test('acknowledgeCriticalFinding returns 400 when report is missing', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'التقرير غير موجود — أنشئ مسودة أولاً' });
  });

  test('acknowledgeCriticalFinding returns 400 when there is no critical finding', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', criticalCategory: 'NONE' });
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'لا يوجد عثور حرج للاعتراف به' });
    expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
  });

  test('acknowledgeCriticalFinding sets the acknowledgment fields', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue({ id: 'rep-1', studyId: 'study-1', criticalCategory: 'CAT1' });
    prisma.radiologyReport.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rep-1', ...data }));
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    const call = prisma.radiologyReport.update.mock.calls[0][0];
    expect(call.data.criticalAcknowledgedBy).toBe('أحمد محمود');
    expect(call.data.criticalAcknowledgedAt).toBeInstanceOf(Date);
  });

  test('acknowledgeCriticalFinding is idempotent when already acknowledged', async () => {
    const prisma = createPrisma();
    const report = { id: 'rep-1', studyId: 'study-1', criticalCategory: 'CAT2', criticalAcknowledgedAt: new Date('2026-01-01T10:00:00Z'), criticalAcknowledgedBy: 'د. مدير' };
    prisma.radiologyStudy.findFirst.mockResolvedValue({ id: 'study-1' });
    prisma.radiologyReport.findUnique.mockResolvedValue(report);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.acknowledgeCriticalFinding(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ success: true, data: report });
    expect(prisma.radiologyReport.update).not.toHaveBeenCalled();
  });
});
