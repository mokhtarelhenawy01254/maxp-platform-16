const assert = require('assert');
const { sendMessage } = require('../../controller/aiAgentChatController');
const aiServiceAdminClient = require('../../services/aiServiceAdminClient');
const aiSessionService = require('../../services/aiSessionService');

async function testConversationHistoryPreservation() {
  console.log('🧪 Testing aiAgentChatController Multi-Turn Context & RecentMessages Preservation...\n');

  const originalChatWithAgent = aiServiceAdminClient.chatWithAgent;
  const originalAppendMessage = aiSessionService.appendMessage;
  const originalGetHistory = aiSessionService.getHistory;

  let capturedChatArgs = null;
  const mockDbMessages = [
    {
      id: 'msg_1',
      role: 'user',
      sender: 'user',
      text: 'جبلي الـ 3 منتجات باساميهم و الـ sku بتاعهم',
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: 'msg_2',
      role: 'assistant',
      sender: 'agent',
      text: 'أهلاً يا فندم، دي أول 3 منتجات في الكتالوج... تحب أكمّل وأجيب لك باقي المنتجات كلها في جدول واحد؟',
      createdAt: new Date(Date.now() - 50000).toISOString(),
    },
  ];

  aiSessionService.appendMessage = async (companyId, sessionId, msg) => {
    mockDbMessages.push({
      id: `msg_${Date.now()}`,
      role: msg.sender === 'user' ? 'user' : 'assistant',
      sender: msg.sender,
      text: msg.text,
      createdAt: new Date().toISOString(),
    });
    return true;
  };

  aiSessionService.getHistory = async (companyId, userId, sessionId) => {
    return {
      session: { id: sessionId, title: 'فحص الكتالوج', context: { activeCatalog: 'main' } },
      messages: [...mockDbMessages],
    };
  };

  aiServiceAdminClient.chatWithAgent = async (args) => {
    capturedChatArgs = args;
    return {
      status: 'ok',
      reply: 'تمام يا فندم، هجيبلك باقي المنتجات كلها حالاً...',
      tool_calls: [],
    };
  };

  try {
    console.log('Test 1: Second user turn ("عادي هات الباقي") receives prior conversation history...');
    capturedChatArgs = null;
    let resStatus = null;
    let resJson = null;

    const mockRes = {
      status: (code) => { resStatus = code; return mockRes; },
      json: (data) => { resJson = data; return mockRes; },
    };

    await sendMessage({
      user: { id: 'usr_1', companyId: 'comp_1' },
      body: {
        message: 'عادي هات الباقي',
        sessionId: 'copilot_sess_123',
        agentId: 'store-manager-agent',
      },
    }, mockRes);

    assert.strictEqual(resStatus, null, 'Should not return error status');
    assert.strictEqual(resJson.success, true, 'Should succeed');
    assert.ok(capturedChatArgs, 'chatWithAgent should have been called');

    const memoryContext = capturedChatArgs.memoryContext;
    assert.ok(memoryContext, 'memoryContext must be provided');
    assert.ok(Array.isArray(memoryContext.recentMessages), 'recentMessages must be an array');
    assert.strictEqual(memoryContext.recentMessages.length, 2, 'Should contain exactly the 2 prior messages');

    // Turn 1 User message
    assert.strictEqual(memoryContext.recentMessages[0].role, 'user');
    assert.strictEqual(memoryContext.recentMessages[0].content, 'جبلي الـ 3 منتجات باساميهم و الـ sku بتاعهم');

    // Turn 1 Assistant reply
    assert.strictEqual(memoryContext.recentMessages[1].role, 'assistant');
    assert.ok(memoryContext.recentMessages[1].content.includes('باقي المنتجات'));

    // Verify current message is NOT duplicated in recentMessages
    const hasCurrentTurnInHistory = memoryContext.recentMessages.some(m => m.content === 'عادي هات الباقي');
    assert.strictEqual(hasCurrentTurnInHistory, false, 'Current user prompt must not be duplicated in recentMessages');

    // Verify session context was also merged
    assert.strictEqual(memoryContext.activeCatalog, 'main');

    console.log('✅ Test 1 Passed: Prior turns loaded and injected cleanly into recentMessages!\n');

    console.log('🎉 ALL MULTI-TURN CONTEXT TESTS PASSED CLEANLY! 🚀');
  } finally {
    aiServiceAdminClient.chatWithAgent = originalChatWithAgent;
    aiSessionService.appendMessage = originalAppendMessage;
    aiSessionService.getHistory = originalGetHistory;
  }
}

testConversationHistoryPreservation().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
