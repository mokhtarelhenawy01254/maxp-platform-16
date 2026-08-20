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
  examTypeName: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒',
  modality: 'CT',
  patientAge: '45 ╪│┘å╪⌐',
  patientGender: '╪░┘â╪▒',
  patientFlags: ['diabetic'],
  images: [],
  report: { reportText: '╪¬┘é╪▒┘è╪▒ ╪│╪º╪¿┘é' },
  examType: { name: '╪ú╪┤╪╣╪⌐ ┘à┘é╪╖╪╣┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒' },
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
    expect(res.payload).toEqual({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
  });

  test('returns 404 when study is not found', async () => {
    const prisma = createPrisma();
    prisma.radiologyStudy.findFirst.mockResolvedValue(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await controller.generateDraft(req({ params: { id: 'study-1' } }), res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, error: '╪º┘ä╪¡╪º┘ä╪⌐ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»╪⌐' });
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
      json: async () => ({ choices: [{ message: { content: '╪º┘ä┘å╪¬╪º╪ª╪¼:\n...\n╪º┘ä╪º┘å╪╖╪¿╪º╪╣:\n...' } }] }),
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
    expect(body.messages[1].content).toContain('╪╣╪»╪» ╪º┘ä╪╡┘ê╪▒: 12');
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
    expect(res.payload).toEqual({ success: false, error: '┘å╪╖╪º┘é ╪º┘ä╪º┘é╪¬╪▒╪º╪¡ ╪║┘è╪▒ ╪╡╪¡┘è╪¡' });
    expect(prisma.radiologyStudy.findFirst).not.toHaveBeenCalled();
  });

  test('buildAiDraftPrompt handles focus and examName', () => {
    const prompt = service.buildAiDraftPrompt({
      examName: '╪ú╪┤╪╣╪⌐ ╪│┘è┘å┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒',
      modality: 'XRAY',
      patientAge: '30 ╪│┘å╪⌐',
      patientGender: '╪ú┘å╪½┘ë',
      patientFlags: ['pregnancy'],
      imagesCount: 2,
      existingReportText: '╪¬┘é╪▒┘è╪▒ ╪│╪º╪¿┘é',
      focus: 'impression',
      additionalContext: '╪ú┘ä┘à ┘ü┘è ╪º┘ä╪¼┘ç╪⌐ ╪º┘ä┘è┘à┘å┘ë',
    });

    expect(prompt.system).toContain('╪ú╪«╪╡╪º╪ª┘è ╪ú╪┤╪╣╪⌐');
    expect(prompt.user).toContain('╪º┘ä╪º┘å╪╖╪¿╪º╪╣');
    expect(prompt.user).toContain('╪ú╪┤╪╣╪⌐ ╪│┘è┘å┘è╪⌐ ╪╣┘ä┘ë ╪º┘ä╪╡╪»╪▒');
    expect(prompt.user).toContain('╪º┘â╪¬╪¿ ┘é╪│┘à ╪º┘ä╪º┘å╪╖╪¿╪º╪╣ ┘ü┘é╪╖');
    expect(prompt.user).not.toContain('╪º┘â╪¬╪¿ ┘é╪│┘à ╪º┘ä┘å╪¬╪º╪ª╪¼ ┘ü┘é╪╖');
    expect(prompt.user).toContain('╪¡┘à┘ä');
  });
});
