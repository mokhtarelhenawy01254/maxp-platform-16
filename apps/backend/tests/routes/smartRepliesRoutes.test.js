jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-1', companyId: 'company-test-123' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const smartRepliesRoutes = require('../../routes/smartRepliesRoutes');

describe('smartRepliesRoutes', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      aiSetting: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);

    app = express();
    app.use(express.json());
    app.use('/api/v1/smart-replies', smartRepliesRoutes);
  });

  describe('GET /rule-responses', () => {
    it('returns empty templates defaults when no setting exists', async () => {
      mockPrisma.aiSetting.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/v1/smart-replies/rule-responses');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enableRuleResponses).toBe(false);
      expect(res.body.data.customRuleResponses.templates).toEqual([]);
    });

    it('returns parsed templates when setting exists', async () => {
      mockPrisma.aiSetting.findUnique.mockResolvedValue({
        modelSettings: JSON.stringify({
          ruleResponses: {
            enableRuleResponses: true,
            customRuleResponses: {
              templates: [
                {
                  id: 'tpl-1',
                  name: 'ترحيب',
                  type: 'custom',
                  keywords: ['أهلا', 'مرحبا'],
                  responses: ['أهلاً وسهلاً بك'],
                },
              ],
            },
          },
        }),
      });

      const res = await request(app).get('/api/v1/smart-replies/rule-responses');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enableRuleResponses).toBe(true);
      expect(res.body.data.customRuleResponses.templates).toHaveLength(1);
      expect(res.body.data.customRuleResponses.templates[0].keywords).toEqual(['أهلا', 'مرحبا']);
    });
  });

  describe('PUT /rule-responses validation', () => {
    it('rejects template without name with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/v1/smart-replies/rule-responses')
        .send({
          enableRuleResponses: true,
          customRuleResponses: {
            templates: [
              {
                id: 'tpl-1',
                name: '   ',
                keywords: ['سعر'],
                responses: ['100'],
              },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('يتطلب اسماً');
    });

    it('rejects template without keywords with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/v1/smart-replies/rule-responses')
        .send({
          enableRuleResponses: true,
          customRuleResponses: {
            templates: [
              {
                id: 'tpl-1',
                name: 'استفسار عن السعر',
                keywords: [],
                responses: ['100 جنيه'],
              },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('يتطلب كلمة مفتاحية واحدة على الأقل');
    });

    it('rejects template without responses with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/v1/smart-replies/rule-responses')
        .send({
          enableRuleResponses: true,
          customRuleResponses: {
            templates: [
              {
                id: 'tpl-1',
                name: 'استفسار عن السعر',
                keywords: ['سعر'],
                responses: ['', '   '],
              },
            ],
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('يتطلب قالباً أو رداً واحداً على الأقل');
    });

    it('successfully saves valid templates and returns normalized data', async () => {
      mockPrisma.aiSetting.findUnique.mockResolvedValue({
        modelSettings: JSON.stringify({}),
      });
      mockPrisma.aiSetting.upsert.mockImplementation(async ({ update }) => ({
        companyId: 'company-test-123',
        modelSettings: update.modelSettings,
      }));

      const res = await request(app)
        .put('/api/v1/smart-replies/rule-responses')
        .send({
          enableRuleResponses: true,
          customRuleResponses: {
            templates: [
              {
                id: 'custom_123',
                name: 'استفسار السعر',
                type: 'custom',
                keywords: ['بكام', 'سعر', ''],
                responses: ['السعر 250 جنيه', ''],
              },
            ],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Smart replies saved successfully');
      expect(res.body.data.channels).toEqual(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']);
      expect(res.body.data.customRuleResponses.templates).toHaveLength(1);
      expect(res.body.data.customRuleResponses.templates[0].channels).toEqual(['WHATSAPP', 'FACEBOOK', 'INSTAGRAM']);
      expect(res.body.data.customRuleResponses.templates[0].keywords).toEqual(['بكام', 'سعر']);
      expect(res.body.data.customRuleResponses.templates[0].responses).toEqual(['السعر 250 جنيه']);
    });

    it('persists customized global channels and per-template channels', async () => {
      mockPrisma.aiSetting.findUnique.mockResolvedValue({
        modelSettings: JSON.stringify({}),
      });
      mockPrisma.aiSetting.upsert.mockImplementation(async ({ update }) => ({
        companyId: 'company-test-123',
        modelSettings: update.modelSettings,
      }));

      const res = await request(app)
        .put('/api/v1/smart-replies/rule-responses')
        .send({
          enableRuleResponses: true,
          channels: ['WHATSAPP', 'INSTAGRAM'],
          customRuleResponses: {
            templates: [
              {
                id: 'custom_wa_only',
                name: 'واتساب فقط',
                type: 'custom',
                channels: ['WHATSAPP'],
                keywords: ['سعر'],
                responses: ['خاص بالواتساب'],
              },
            ],
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.channels).toEqual(['WHATSAPP', 'INSTAGRAM']);
      expect(res.body.data.customRuleResponses.templates[0].channels).toEqual(['WHATSAPP']);
    });
  });
});
