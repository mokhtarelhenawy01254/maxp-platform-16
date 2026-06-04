jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/aiAgent/episodicMemoryService', () => ({
  generateEmbeddingAsync: jest.fn(),
}));

jest.mock('../../services/rag/CorrectiveRAGEngine', () => ({
  getFailureQueue: jest.fn(),
  query: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const episodicMemoryService = require('../../services/aiAgent/episodicMemoryService');
const correctiveRAGEngine = require('../../services/rag/CorrectiveRAGEngine');
const ragKnowledgeMaintenanceService = require('../../services/rag/RagKnowledgeMaintenanceService');

const makePrisma = () => ({
  faq: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  policy: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  aiToolApprovalRequest: {
    findMany: jest.fn(),
  },
});

describe('RagKnowledgeMaintenanceService', () => {
  let prisma;

  beforeEach(() => {
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    episodicMemoryService.generateEmbeddingAsync.mockReset();
    correctiveRAGEngine.getFailureQueue.mockReset();
    correctiveRAGEngine.query.mockReset();
  });

  test('summarizes tenant FAQ, policy, proposal, and RAG failure health', async () => {
    prisma.faq.findMany.mockResolvedValue([
      {
        id: 'faq-1',
        category: 'SHIPPING_POLICY',
        isActive: true,
        embedding: '[0.1]',
        embeddingGeneratedAt: new Date('2026-05-24T10:00:00.000Z'),
      },
      {
        id: 'faq-2',
        category: 'RETURN_POLICY',
        isActive: false,
        embedding: null,
        embeddingGeneratedAt: null,
      },
    ]);
    prisma.policy.findMany.mockResolvedValue([
      {
        id: 'policy-1',
        category: 'SHIPPING_POLICY',
        isActive: true,
        effectiveAt: new Date('2026-05-01T00:00:00.000Z'),
        expiresAt: null,
        embedding: null,
        embeddingGeneratedAt: null,
      },
      {
        id: 'policy-2',
        category: 'DISCOUNT_POLICY',
        isActive: true,
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-02-01T00:00:00.000Z'),
        embedding: '[0.2]',
        embeddingGeneratedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'policy-3',
        category: 'LOCATION_POLICY',
        isActive: true,
        effectiveAt: new Date('2026-12-01T00:00:00.000Z'),
        expiresAt: null,
        embedding: '[0.3]',
        embeddingGeneratedAt: new Date('2026-05-24T10:00:00.000Z'),
      },
    ]);
    prisma.aiToolApprovalRequest.findMany.mockResolvedValue([
      { status: 'PENDING' },
      { status: 'APPROVED' },
      { status: 'REJECTED' },
      { status: 'PENDING' },
    ]);
    correctiveRAGEngine.getFailureQueue.mockResolvedValue([
      { id: 'trace-1', blocked: false },
      { id: 'trace-2', blocked: true },
    ]);

    const overview = await ragKnowledgeMaintenanceService.getOverview('company-1');

    expect(overview.faqs).toMatchObject({
      total: 2,
      active: 1,
      inactive: 1,
      missingEmbeddings: 1,
    });
    expect(overview.policies).toMatchObject({
      total: 3,
      active: 3,
      current: 1,
      expired: 1,
      future: 1,
      missingEmbeddings: 1,
    });
    expect(overview.proposals).toMatchObject({
      total: 4,
      pending: 2,
      approved: 1,
      rejected: 1,
    });
    expect(overview.failures).toMatchObject({
      recentCount: 2,
      guardrailedCount: 1,
      unansweredCount: 1,
    });
  });

  test('backfills missing FAQ embeddings through the active embedding provider', async () => {
    prisma.faq.findMany.mockResolvedValue([
      {
        id: 'faq-1',
        question: 'الشحن للقاهرة بياخد كام يوم؟',
        answer: 'الشحن داخل القاهرة خلال 2 إلى 3 أيام عمل.',
        category: 'SHIPPING_POLICY',
        tags: JSON.stringify(['shipping']),
        embedding: null,
        embeddingGeneratedAt: null,
      },
    ]);
    prisma.policy.findMany.mockResolvedValue([]);
    prisma.faq.update.mockResolvedValue({});
    episodicMemoryService.generateEmbeddingAsync.mockResolvedValue([0.1, 0.2, 0.3]);

    const result = await ragKnowledgeMaintenanceService.backfillEmbeddings('company-1', {
      target: 'faq',
      limit: 5,
    });

    expect(result).toMatchObject({
      scanned: 1,
      updated: 1,
      skipped: 0,
    });
    expect(episodicMemoryService.generateEmbeddingAsync).toHaveBeenCalledWith(expect.stringContaining('FAQ question'));
    expect(prisma.faq.update).toHaveBeenCalledWith({
      where: { id: 'faq-1' },
      data: expect.objectContaining({
        embedding: JSON.stringify([0.1, 0.2, 0.3]),
        embeddingGeneratedAt: expect.any(Date),
      }),
    });
  });

  test('runs auto evaluation scenarios for FAQ, policy, and guardrails', async () => {
    prisma.faq.findMany.mockResolvedValue([
      {
        id: 'faq-1',
        question: 'الشحن للقاهرة بياخد كام يوم؟',
        answer: 'الشحن داخل القاهرة خلال 2 إلى 3 أيام عمل.',
        category: 'SHIPPING_POLICY',
      },
    ]);
    prisma.policy.findMany.mockResolvedValue([
      {
        id: 'policy-1',
        title: 'سياسة الاستبدال',
        content: 'الاستبدال متاح خلال 7 أيام بشرط الحالة الأصلية.',
        category: 'RETURN_POLICY',
      },
    ]);
    correctiveRAGEngine.query.mockImplementation(async (_companyId, message) => {
      if (message.includes('انسى')) {
        return {
          answer: null,
          finalSource: 'GUARDRAIL',
          retrievalMode: 'guardrail',
          grading: { avgRelevance: 0, blocked: true },
        };
      }
      if (message.includes('الشحن')) {
        return {
          answer: 'Based on available information: الشحن داخل القاهرة خلال 2 إلى 3 أيام عمل.',
          finalSource: 'HYBRID_KNOWLEDGE',
          retrievalMode: 'hybrid',
          grading: { avgRelevance: 0.91 },
        };
      }
      return {
        answer: 'Based on available information: الاستبدال متاح خلال 7 أيام بشرط الحالة الأصلية.',
        finalSource: 'POLICY_DB',
        retrievalMode: 'source_fallback',
        grading: { avgRelevance: 0.88 },
      };
    });

    const report = await ragKnowledgeMaintenanceService.runEvaluation('company-1');

    expect(report).toMatchObject({
      scenarioSource: 'auto',
      total: 3,
      passed: 3,
      failed: 0,
    });
    expect(correctiveRAGEngine.query).toHaveBeenCalledTimes(3);
    expect(correctiveRAGEngine.query).toHaveBeenCalledWith(
      'company-1',
      expect.any(String),
      expect.objectContaining({ persistTrace: false }),
    );
  });
});
