const request = require('supertest');
const express = require('express');

const mockAiSdkClient = {
  trainKnowledge: jest.fn(),
  listKnowledgeQuestions: jest.fn().mockResolvedValue({ questions: [], count: 0 }),
  countPendingKnowledgeQuestions: jest.fn().mockResolvedValue({ count: 0 }),
  answerKnowledgeQuestion: jest.fn(),
};

jest.mock('../../services/aiSdkClient', () => mockAiSdkClient);
jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { companyId: 'company-123' };
    next();
  },
}));

const knowledgeQuestionRoutes = require('../../routes/knowledgeQuestionRoutes');

describe('Knowledge Question Routes — Train', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(knowledgeQuestionRoutes);
  });

  it('POST /train returns 400 when text is missing', async () => {
    const res = await request(app).post('/train').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Text is required');
  });

  it('POST /train calls trainKnowledge and returns the result', async () => {
    mockAiSdkClient.trainKnowledge.mockResolvedValue({
      success: true,
      saved: 3,
      statements: [{ index: 1, statement: 'Delivery 60 EGP' }],
    });
    const res = await request(app).post('/train').send({ text: 'Delivery is 60 EGP inside Cairo. Free above 1500.', topic: 'delivery' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result.saved).toBe(3);
    expect(mockAiSdkClient.trainKnowledge).toHaveBeenCalledWith({
      companyId: 'company-123',
      text: 'Delivery is 60 EGP inside Cairo. Free above 1500.',
      topic: 'delivery',
    });
  });

  it('POST /train propagates AI service errors', async () => {
    mockAiSdkClient.trainKnowledge.mockRejectedValue(new Error('AI down'));
    const res = await request(app).post('/train').send({ text: 'hello' });
    expect(res.status).toBe(502);
  });
});
