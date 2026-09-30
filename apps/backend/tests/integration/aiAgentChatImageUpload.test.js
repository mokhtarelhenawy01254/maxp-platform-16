const assert = require('assert');
const express = require('express');
const request = require('supertest');

// Mocks
const verifyToken = require('../../utils/verifyToken');
verifyToken.authenticateToken = (req, res, next) => {
  req.user = { id: 'usr_merchant_1', companyId: 'comp_swan_1' };
  next();
};

const aiServiceAdminClient = require('../../services/aiServiceAdminClient');
const aiSessionService = require('../../services/aiSessionService');
const agentStudioSessionService = require('../../services/agentStudioSessionService');

async function runIntegrationVerification() {
  console.log('🧪 Starting Full Express Supertest Integration Test for AI Chat Image Upload...\n');

  let interceptedChatPayload = null;
  let inMemorySessionStore = {};

  // Mock aiServiceAdminClient.chatWithAgent
  const origChat = aiServiceAdminClient.chatWithAgent;
  aiServiceAdminClient.chatWithAgent = async (args) => {
    interceptedChatPayload = args;
    return {
      status: 'ok',
      reply: 'تم تحليل الصورة المرفقة بنجاح: الشريط الأحمر هو شريط الترويجات ويمكن تعديله من تبويب العروض الترويجية.',
      tool_calls: [],
      model: 'DeepSeek-V3',
    };
  };

  // Mock aiSessionService
  const origAppend = aiSessionService.appendMessage;
  const origGetHistoryWithCheck = aiSessionService.getHistoryWithCheck;

  aiSessionService.appendMessage = async (companyId, sessionId, msg) => {
    if (!inMemorySessionStore[sessionId]) {
      inMemorySessionStore[sessionId] = [];
    }
    inMemorySessionStore[sessionId].push({
      id: `msg_${Date.now()}_${Math.random()}`,
      role: msg.sender || 'user',
      content: msg.text || '',
      images: msg.images || [],
      toolCalls: msg.toolCalls || [],
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  aiSessionService.getHistoryWithCheck = async (companyId, userId, sessionId) => {
    return {
      ok: true,
      session: { id: sessionId, title: 'جلسة فحص الشريط الأحمر' },
      messages: inMemorySessionStore[sessionId] || [],
    };
  };

  // Setup express test app
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Simulate authenticated user middleware
  app.use((req, res, next) => {
    req.user = { id: 'usr_merchant_1', companyId: 'comp_swan_1' };
    next();
  });

  const aiAgentChatRoutes = require('../../routes/aiAgentChatRoutes');
  app.use('/api/v1/ai/chat', aiAgentChatRoutes);

  try {
    // ----------------------------------------------------
    // CASE 1: Sending empty message with NO images
    // ----------------------------------------------------
    console.log('Case 1: Sending whitespace message without images...');
    const res1 = await request(app)
      .post('/api/v1/ai/chat/message')
      .send({ message: '   ' });

    assert.strictEqual(res1.status, 400, 'Must return HTTP 400');
    assert.strictEqual(res1.body.success, false);
    assert.strictEqual(res1.body.error, 'message is required');
    console.log('✅ Case 1 Passed: Correctly returns 400 "message is required" when no text and no images.\n');

    // ----------------------------------------------------
    // CASE 2: Sending empty message WITH image attached (The User Bug)
    // ----------------------------------------------------
    console.log('Case 2: Sending ONLY an image (The exact user bug)...');
    const mockBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const testSessionId = 'sess_live_test_101';

    const res2 = await request(app)
      .post('/api/v1/ai/chat/message')
      .send({
        message: '',
        images: [mockBase64Image],
        sessionId: testSessionId,
        agentId: 'executive-assistant-agent',
      });

    assert.strictEqual(res2.status, 200, 'Must return HTTP 200 OK');
    assert.strictEqual(res2.body.success, true);
    assert.ok(res2.body.reply.includes('الشريط الأحمر'), 'Reply should match simulated agent response');
    assert.ok(interceptedChatPayload, 'AI Agent must have received task');
    assert.ok(interceptedChatPayload.message.includes('الصورة المرفقة'), 'Fallback prompt was injected for LLM context');
    assert.strictEqual(interceptedChatPayload.attachments.length, 1);
    assert.strictEqual(interceptedChatPayload.attachments[0].type, 'image');
    assert.strictEqual(interceptedChatPayload.attachments[0].data_url, mockBase64Image);
    console.log('✅ Case 2 Passed: Sending only an image succeeds, injects prompt fallback, and forwards normalized image attachments.\n');

    // ----------------------------------------------------
    // CASE 3: Sending text inquiry + image together
    // ----------------------------------------------------
    console.log('Case 3: Sending user inquiry text + screenshot URL...');
    const res3 = await request(app)
      .post('/api/v1/ai/chat/message')
      .send({
        message: 'الشريط الاحمر ده الاقيه فين في الموقع عشان اغيره',
        images: ['https://maxp.online/uploads/products/promo-bar.png'],
        sessionId: testSessionId,
        agentId: 'executive-assistant-agent',
      });

    assert.strictEqual(res3.status, 200, 'Must return HTTP 200 OK');
    assert.strictEqual(res3.body.success, true);
    assert.strictEqual(interceptedChatPayload.message, 'الشريط الاحمر ده الاقيه فين في الموقع عشان اغيره');
    assert.strictEqual(interceptedChatPayload.attachments[0].url, 'https://maxp.online/uploads/products/promo-bar.png');
    console.log('✅ Case 3 Passed: Combined text query and image URL accurately forwarded.\n');

    // ----------------------------------------------------
    // CASE 4: Retrieve session history and verify images persisted
    // ----------------------------------------------------
    console.log('Case 4: Checking session history persistence for images...');
    const res4 = await request(app)
      .get(`/api/v1/ai/chat/history?sessionId=${testSessionId}`);

    assert.strictEqual(res4.status, 200);
    assert.strictEqual(res4.body.success, true);
    assert.ok(Array.isArray(res4.body.messages), 'Messages should be an array');
    assert.strictEqual(res4.body.messages.length >= 2, true);

    const firstMsg = res4.body.messages[0];
    assert.ok(firstMsg.images && firstMsg.images.length === 1, 'First message must have stored image');
    assert.strictEqual(firstMsg.images[0], mockBase64Image);
    console.log('✅ Case 4 Passed: Chat history preserves uploaded images.\n');

    console.log('🎉 ALL 4 EXPRESS INTEGRATION TESTS PASSED WITH 100% SUCCESS! 🚀');
  } finally {
    aiServiceAdminClient.chatWithAgent = origChat;
    aiSessionService.appendMessage = origAppend;
    aiSessionService.getHistoryWithCheck = origGetHistoryWithCheck;
  }
}

runIntegrationVerification().catch((err) => {
  console.error('❌ Integration test failed:', err);
  process.exit(1);
});
