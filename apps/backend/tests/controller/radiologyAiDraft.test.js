jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const controller = require('../../controller/radiologyAiReportController');
const service = require('../../services/radiologyAiDraftService');

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
  radiologyStudyImage: { count: jest.fn().mockResolvedValue(0) },
  aiKey: { findMany: jest.fn() },
});

const req = (overrides = {}) => ({
  user: { companyId: 'company-1', id: 'user-1' },
  params: {},
  body: {},
  ...overrides,
});

const createStudy = (overrides = {}) => ({
  id: 'study-1',
  companyId: 'company-1',
  examTypeName: 'أشعة مقطعية على الصدر',
  modality: 'CT',
  patientAge: '45 سنة',
  patientGender: 'ذكر',
  patientFlags: ['diabetic'],
  images: [],
  report: { reportText: 'تقرير سابق' },
  examType: { name: 'أشعة مقطعية على الصدر' },
  ...overrides,
});

describe('radiologyAiReportController', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns 403 when companyId is missing', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.generateDraft(req({ user: {}, params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, error: 'غير مصرح' });
    expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
  });

  test('returns 404 when study is not found', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.generateDraft(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: 'الحالة غير موجودة' });
  });

  test('happy path returns draft via OpenAI-compatible endpoint', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(createStudy());
    prisma.radiologyStudyImage.count.mockResolvedValue(12);
    prisma.aiKey.findMany.mockResolvedValue([
      { id: 'key-1', provider: 'OPENAI', apiKey: 'sk-test', baseUrl: null, priority: 1 },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'النتائج:\n...\nالانطباع:\n...' } }] }),
    });

    const res = createResponse();
    await controller.generateDraft(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(typeof res.payload.data.draft).toBe('string');
    expect(res.payload.data.draft.length).toBeGreaterThan(0);
    expect(res.payload.data.reason).toBeUndefined();
    expect(res.payload.data.provider).toBe('OPENAI');
    const url = global.fetch.mock.calls[0][0];
    expect(String(url).endsWith('/chat/completions')).toBe(true);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages[1].content).toContain('عدد الصور: 12');
  });

  test('returns AI_NOT_CONFIGURED when no AI key exists', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(createStudy());
    prisma.aiKey.findMany.mockResolvedValue([]);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.generateDraft(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.reason).toBe('AI_NOT_CONFIGURED');
    expect(res.payload.data.draft).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns AI_ERROR when fetch rejects', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(createStudy());
    prisma.aiKey.findMany.mockResolvedValue([
      { id: 'key-1', provider: 'OPENAI', apiKey: 'sk-test', baseUrl: null, priority: 1 },
    ]);
    getSharedPrismaClient.mockReturnValue(prisma);
    global.fetch.mockRejectedValue(new Error('network down'));

    const res = createResponse();
    await controller.generateDraft(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.reason).toBe('AI_ERROR');
    expect(res.payload.data.draft).toBeNull();
  });

  test('returns 400 when focus is invalid', async () => {
    const prisma = createPrisma();
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.generateDraft(
      req({ params: { id: 'study-1' }, body: { focus: 'summary' } }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, error: 'نطاق الاقتراح غير صحيح' });
    expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
  });

  test('buildAiDraftPrompt handles focus and examName', () => {
    const prompt = service.buildAiDraftPrompt({
      examName: 'أشعة سينية على الصدر',
      modality: 'XRAY',
      patientAge: '30 سنة',
      patientGender: 'أنثى',
      patientFlags: ['pregnancy'],
      imagesCount: 2,
      existingReportText: 'تقرير سابق',
      focus: 'impression',
      additionalContext: 'ألم في الجهة اليمنى',
    });

    expect(prompt.system).toContain('أخصائي أشعة');
    expect(prompt.user).toContain('الانطباع');
    expect(prompt.user).toContain('أشعة سينية على الصدر');
    expect(prompt.user).toContain('اكتب قسم الانطباع فقط');
    expect(prompt.user).not.toContain('اكتب قسم النتائج فقط');
    expect(prompt.user).toContain('حمل');
  });
});
