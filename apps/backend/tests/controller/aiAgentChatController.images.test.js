const assert = require('assert');
const { sendMessage } = require('../../controller/aiAgentChatController');
const aiServiceAdminClient = require('../../services/aiServiceAdminClient');
const aiSessionService = require('../../services/aiSessionService');

async function testImageAttachments() {
  console.log('🧪 Testing aiAgentChatController Image Attachments & Empty Message Handling...\n');

  // Backup original functions
  const originalChatWithAgent = aiServiceAdminClient.chatWithAgent;
  const originalAppendMessage = aiSessionService.appendMessage;

  let capturedChatArgs = null;
  let capturedAppendArgs = [];

  aiServiceAdminClient.chatWithAgent = async (args) => {
    capturedChatArgs = args;
    return {
      status: 'ok',
      reply: 'تم فحص الصورة بنجاح وتحديد الشريط الأحمر المطلوب تعديله',
      tool_calls: [],
    };
  };

  aiSessionService.appendMessage = async (companyId, sessionId, msg) => {
    capturedAppendArgs.push({ companyId, sessionId, msg });
    return true;
  };

  try {
    // Test 1: Both message and images are missing -> 400 'message is required'
    console.log('Test 1: Empty message without images rejected...');
    let resStatus = null;
    let resJson = null;
    const mockRes1 = {
      status: (code) => { resStatus = code; return mockRes1; },
      json: (data) => { resJson = data; return mockRes1; },
    };

    await sendMessage({
      user: { id: 'usr_1', companyId: 'comp_1' },
      body: { message: '   ' },
    }, mockRes1);

    assert.strictEqual(resStatus, 400, 'Should return 400');
    assert.strictEqual(resJson.error, 'message is required', 'Should say message is required');
    console.log('✅ Test 1 Passed: Empty message with no images properly rejected.\n');

    // Test 2: Message is empty, but images attached -> Should succeed and pass attachments to chatWithAgent!
    console.log('Test 2: Empty message WITH image attachment accepted and forwarded...');
    resStatus = null;
    resJson = null;
    capturedChatArgs = null;
    capturedAppendArgs = [];

    const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const mockRes2 = {
      status: (code) => { resStatus = code; return mockRes2; },
      json: (data) => { resJson = data; return mockRes2; },
    };

    await sendMessage({
      user: { id: 'usr_1', companyId: 'comp_1' },
      body: {
        message: '',
        images: [testDataUrl],
        sessionId: 'sess_img_1',
        agentId: 'executive-assistant-agent',
      },
    }, mockRes2);

    assert.strictEqual(resStatus, null, 'Should not return error status');
    assert.strictEqual(resJson.success, true, 'Should succeed');
    assert.ok(capturedChatArgs, 'chatWithAgent should have been called');
    assert.strictEqual(capturedChatArgs.agentId, 'executive-assistant-agent');
    assert.ok(capturedChatArgs.message && capturedChatArgs.message.length > 0, 'Should have fallback prompt message');
    assert.ok(Array.isArray(capturedChatArgs.attachments), 'Attachments should be an array');
    assert.strictEqual(capturedChatArgs.attachments.length, 1);
    assert.strictEqual(capturedChatArgs.attachments[0].type, 'image');
    assert.strictEqual(capturedChatArgs.attachments[0].data_url, testDataUrl);
    console.log('✅ Test 2 Passed: Empty message with image attachment succeeds and forwards normalized attachments.\n');

    // Test 3: Message with text AND image
    console.log('Test 3: Message with text and image URL...');
    resStatus = null;
    resJson = null;
    capturedChatArgs = null;

    const testUrl = 'https://maxp.online/uploads/products/banner.png';
    const mockRes3 = {
      status: (code) => { resStatus = code; return mockRes3; },
      json: (data) => { resJson = data; return mockRes3; },
    };

    await sendMessage({
      user: { id: 'usr_1', companyId: 'comp_1' },
      body: {
        message: 'الشريط الاحمر ده الاقيه فين في الموقع عشان اغيره',
        images: [testUrl],
        sessionId: 'sess_img_2',
        agentId: 'executive-assistant-agent',
      },
    }, mockRes3);

    assert.strictEqual(resJson.success, true, 'Should succeed');
    assert.strictEqual(capturedChatArgs.message, 'الشريط الاحمر ده الاقيه فين في الموقع عشان اغيره');
    assert.strictEqual(capturedChatArgs.attachments[0].url, testUrl);
    console.log('✅ Test 3 Passed: Combined text and image attachment forwarded accurately.\n');

    console.log('🎉 ALL AI AGENT IMAGE TESTS PASSED CLEANLY! 🚀');
  } finally {
    aiServiceAdminClient.chatWithAgent = originalChatWithAgent;
    aiSessionService.appendMessage = originalAppendMessage;
  }
}

testImageAttachments().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
