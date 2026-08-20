const request = require('supertest');
const express = require('express');

jest.mock('../../middleware/subdomainMiddleware', () => ({
  extractSubdomainMiddleware: (req, _res, next) => { req.company = { id: 'company-123' }; next(); },
  requireCompany: (req, res, next) => req.company ? next() : res.status(400).json({ success: false, error: 'no company' }),
}));
jest.mock('../../services/aiSdkClient', () => ({
  sendChatMessage: jest.fn(),
}));

const widgetChatRoutes = require('../../routes/publicWidgetChatRoutes');
const aiSdkClient = require('../../services/aiSdkClient');

describe('Public Widget Chat Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(widgetChatRoutes);
  });

  it('GET /script.js serves the widget script', async () => {
    const res = await request(app).get('/script.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('javascript');
  });

  it('POST /chat returns 400 when message is missing', async () => {
    const res = await request(app).post('/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('message is required');
  });

  it('POST /chat returns 400 when message is too long', async () => {
    const res = await request(app).post('/chat').send({ message: 'x'.repeat(4001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('message too long');
  });

  it('POST /chat calls the AI pipeline with channel web_chat', async () => {
    aiSdkClient.sendChatMessage.mockResolvedValue({
      reply: '┘à╪▒╪¡╪¿╪º┘ï! ┘â┘è┘ü ╪ú╪│╪º╪╣╪»┘â╪ƒ',
      threadId: 'thread-1',
      status: 'ok',
    });

    const res = await request(app).post('/chat').send({ message: '┘à╪▒╪¡╪¿╪º' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBe('┘à╪▒╪¡╪¿╪º┘ï! ┘â┘è┘ü ╪ú╪│╪º╪╣╪»┘â╪ƒ');
    expect(aiSdkClient.sendChatMessage).toHaveBeenCalledWith({
      companyId: 'company-123',
      customerId: expect.stringMatching(/^widget_guest_/),
      message: '┘à╪▒╪¡╪¿╪º',
      threadId: null,
      channel: 'web_chat',
    });
  });

  it('POST /chat honors an explicit customerId', async () => {
    aiSdkClient.sendChatMessage.mockResolvedValue({
      reply: 'ok',
      threadId: 'thread-1',
      status: 'ok',
    });

    await request(app).post('/chat').send({ message: 'hi', customerId: 'visitor-abc' });
    expect(aiSdkClient.sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'visitor-abc',
      channel: 'web_chat',
    }));
  });

  it('POST /chat uses visitorId as the stable customer id and echoes it back', async () => {
    aiSdkClient.sendChatMessage.mockResolvedValue({
      reply: 'ok',
      threadId: 'thread-1',
      status: 'ok',
    });

    const res = await request(app).post('/chat').send({ message: 'follow-up', visitorId: 'v1.abc.123' });
    expect(res.status).toBe(200);
    expect(res.body.visitorId).toBe('v1.abc.123');
    expect(aiSdkClient.sendChatMessage).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'v1.abc.123',
      channel: 'web_chat',
    }));
  });

  it('POST /chat propagates AI service errors as 500', async () => {
    aiSdkClient.sendChatMessage.mockRejectedValue(new Error('AI down'));
    const res = await request(app).post('/chat').send({ message: '┘à╪▒╪¡╪¿╪º' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
