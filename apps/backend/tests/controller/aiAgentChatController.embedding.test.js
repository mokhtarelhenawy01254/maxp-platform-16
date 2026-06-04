const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const RagKnowledgeMaintenanceService = require('../../services/rag/RagKnowledgeMaintenanceService');
const episodicMemoryService = require('../../services/aiAgent/episodicMemoryService');
const aiAgentChatController = require('../../controller/aiAgentChatController');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/rag/RagKnowledgeMaintenanceService', () => ({
  _private: {
    buildFaqKnowledgeText: jest.fn(),
    buildPolicyKnowledgeText: jest.fn()
  }
}));

jest.mock('../../services/aiAgent/episodicMemoryService', () => ({
  generateEmbeddingAsync: jest.fn()
}));

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };
  return response;
};

describe('aiAgentChatController Embedding Status & Generation', () => {
  let mockPrisma;
  const baseReq = {
    user: {
      id: 'user-1',
      companyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      faq: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      },
      policy: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      }
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('listFaqsEmbeddingStatus', () => {
    test('requires companyId and fails if missing', async () => {
      const res = createResponse();
      await aiAgentChatController.listFaqsEmbeddingStatus({ user: {} }, res);

      expect(res.statusCode).toBe(401);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('Authentication required');
    });

    test('returns paginated and search-filtered list of FAQs', async () => {
      mockPrisma.faq.count
        .mockResolvedValueOnce(5)  // for total with filter
        .mockResolvedValueOnce(10) // totalAll
        .mockResolvedValueOnce(7); // withEmbedding

      const mockFaqsList = [
        { id: 'faq-1', question: 'Q1', answer: 'A1', category: 'General', isActive: true, embedding: '[]', embeddingGeneratedAt: new Date() },
        { id: 'faq-2', question: 'Q2', answer: 'A2', category: 'Billing', isActive: true, embedding: null, embeddingGeneratedAt: null }
      ];
      mockPrisma.faq.findMany.mockResolvedValue(mockFaqsList);

      const req = {
        ...baseReq,
        query: { page: '1', limit: '2', search: 'test', status: 'all' }
      };
      const res = createResponse();

      await aiAgentChatController.listFaqsEmbeddingStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.faqs).toHaveLength(2);
      expect(res.payload.faqs[0].hasEmbedding).toBe(true);
      expect(res.payload.faqs[1].hasEmbedding).toBe(false);
      expect(res.payload.summary).toEqual({
        total: 10,
        withEmbedding: 7,
        withoutEmbedding: 3
      });
      expect(res.payload.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3
      });
    });
  });

  describe('generateFaqEmbedding', () => {
    test('successfully generates and updates embedding for a single FAQ', async () => {
      const mockFaq = { id: 'faq-1', question: 'Q1', answer: 'A1', companyId: 'company-1' };
      mockPrisma.faq.findFirst.mockResolvedValue(mockFaq);
      RagKnowledgeMaintenanceService._private.buildFaqKnowledgeText.mockReturnValue('Question: Q1 Answer: A1');
      episodicMemoryService.generateEmbeddingAsync.mockResolvedValue([0.1, 0.2, 0.3]);

      const req = {
        ...baseReq,
        body: { faqId: 'faq-1' }
      };
      const res = createResponse();

      await aiAgentChatController.generateFaqEmbedding(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.faq.hasEmbedding).toBe(true);
      expect(mockPrisma.faq.update).toHaveBeenCalledWith({
        where: { id: 'faq-1' },
        data: expect.objectContaining({
          embedding: JSON.stringify([0.1, 0.2, 0.3])
        })
      });
    });

    test('returns 404 if FAQ is not found', async () => {
      mockPrisma.faq.findFirst.mockResolvedValue(null);

      const req = {
        ...baseReq,
        body: { faqId: 'non-existent' }
      };
      const res = createResponse();

      await aiAgentChatController.generateFaqEmbedding(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.payload.success).toBe(false);
      expect(res.payload.error).toBe('FAQ not found');
    });
  });

  describe('generateBulkFaqEmbedding', () => {
    test('successfully generates embeddings in bulk', async () => {
      const mockFaqs = [
        { id: 'faq-1', question: 'Q1', answer: 'A1', companyId: 'company-1' },
        { id: 'faq-2', question: 'Q2', answer: 'A2', companyId: 'company-1' }
      ];
      mockPrisma.faq.findMany.mockResolvedValue(mockFaqs);
      RagKnowledgeMaintenanceService._private.buildFaqKnowledgeText.mockReturnValue('FAQ Text');
      episodicMemoryService.generateEmbeddingAsync.mockResolvedValue([0.5, 0.6]);

      const req = {
        ...baseReq,
        body: { faqIds: ['faq-1', 'faq-2'] }
      };
      const res = createResponse();

      await aiAgentChatController.generateBulkFaqEmbedding(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.results).toEqual([
        { faqId: 'faq-1', success: true },
        { faqId: 'faq-2', success: true }
      ]);
      expect(mockPrisma.faq.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('listPoliciesEmbeddingStatus', () => {
    test('returns paginated and search-filtered list of Policies', async () => {
      mockPrisma.policy.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);

      const mockPoliciesList = [
        { id: 'policy-1', title: 'P1', content: 'C1', category: 'Shipping', isActive: true, embedding: '[]', embeddingGeneratedAt: new Date() }
      ];
      mockPrisma.policy.findMany.mockResolvedValue(mockPoliciesList);

      const req = {
        ...baseReq,
        query: { page: '1', limit: '10', search: 'shipping', status: 'all' }
      };
      const res = createResponse();

      await aiAgentChatController.listPoliciesEmbeddingStatus(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.policies).toHaveLength(1);
      expect(res.payload.policies[0].hasEmbedding).toBe(true);
      expect(res.payload.summary).toEqual({
        total: 5,
        withEmbedding: 4,
        withoutEmbedding: 1
      });
    });
  });

  describe('generatePolicyEmbedding', () => {
    test('successfully generates and updates embedding for a single Policy', async () => {
      const mockPolicy = { id: 'policy-1', title: 'P1', content: 'C1', companyId: 'company-1' };
      mockPrisma.policy.findFirst.mockResolvedValue(mockPolicy);
      RagKnowledgeMaintenanceService._private.buildPolicyKnowledgeText.mockReturnValue('Policy text content');
      episodicMemoryService.generateEmbeddingAsync.mockResolvedValue([0.7, 0.8]);

      const req = {
        ...baseReq,
        body: { policyId: 'policy-1' }
      };
      const res = createResponse();

      await aiAgentChatController.generatePolicyEmbedding(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.policy.hasEmbedding).toBe(true);
      expect(mockPrisma.policy.update).toHaveBeenCalledWith({
        where: { id: 'policy-1' },
        data: expect.objectContaining({
          embedding: JSON.stringify([0.7, 0.8])
        })
      });
    });
  });

  describe('generateBulkPolicyEmbedding', () => {
    test('successfully generates policy embeddings in bulk', async () => {
      const mockPolicies = [
        { id: 'policy-1', title: 'P1', content: 'C1', companyId: 'company-1' }
      ];
      mockPrisma.policy.findMany.mockResolvedValue(mockPolicies);
      RagKnowledgeMaintenanceService._private.buildPolicyKnowledgeText.mockReturnValue('Policy Text');
      episodicMemoryService.generateEmbeddingAsync.mockResolvedValue([0.9]);

      const req = {
        ...baseReq,
        body: { policyIds: ['policy-1'] }
      };
      const res = createResponse();

      await aiAgentChatController.generateBulkPolicyEmbedding(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.payload.success).toBe(true);
      expect(res.payload.results).toEqual([
        { policyId: 'policy-1', success: true }
      ]);
      expect(mockPrisma.policy.update).toHaveBeenCalledTimes(1);
    });
  });
});
