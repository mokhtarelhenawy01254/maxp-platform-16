/**
 * Voice Call Routes Integration Tests
 */

const request = require('supertest');
const express = require('express');
const voiceCallRoutes = require('../../routes/voiceCallRoutes');

describe('Voice Call Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/voice', voiceCallRoutes);
  });

  describe('Public Vapi Webhook Endpoint', () => {
    test('POST /api/v1/voice/webhook/vapi responds to generic ping/events', async () => {
      const response = await request(app)
        .post('/api/v1/voice/webhook/vapi')
        .send({ type: 'assistant-request' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test('POST /api/v1/voice/webhook/vapi handles tool-calls payload', async () => {
      const response = await request(app)
        .post('/api/v1/voice/webhook/vapi')
        .send({
          type: 'tool-calls',
          message: {
            type: 'tool-calls',
            toolCalls: [
              {
                id: 'call_tool_1',
                function: {
                  name: 'order_confirm',
                  arguments: JSON.stringify({ notes: 'Confirmed' }),
                },
              },
            ],
            call: {
              metadata: {
                companyId: 'comp_test',
                orderId: 'fake_order_id',
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results[0].toolCallId).toBe('call_tool_1');
    });

    test('POST /api/v1/voice/webhook/vapi handles end-of-call report', async () => {
      const response = await request(app)
        .post('/api/v1/voice/webhook/vapi')
        .send({
          type: 'end-of-call-report',
          message: {
            type: 'end-of-call-report',
            durationSeconds: 45,
            transcript: 'أهلاً بحضرتك... تمام أكد الأوردر شكراً',
            call: {
              metadata: {
                companyId: 'comp_test',
                orderId: 'fake_order_id',
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    test('POST /api/v1/voice/trigger rejects unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/voice/trigger')
        .send({ orderId: 'ord_123' });

      expect(response.status).toBe(401);
    });

    test('GET /api/v1/voice/settings rejects unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/voice/settings');

      expect(response.status).toBe(401);
    });
  });
});
