/**
 * Standalone Verification Script for Merchant Copilot Session Deep-Link & Multi-Tenant Isolation
 */
const assert = require('assert');

// Mock sharedDatabase before requiring services
const mockPrisma = {
  $queryRawUnsafe: async (sql, ...params) => {
    const normSql = (sql || '').replace(/\s+/g, ' ');

    // 1. check query: SELECT id, "companyId", status FROM public.agent_studio_sessions WHERE id = $1
    if (normSql.includes('SELECT id, "companyId", status FROM public.agent_studio_sessions WHERE id = $1')) {
      const sessionId = params[0];
      if (sessionId === 'sess_valid') {
        return [{ id: 'sess_valid', companyId: 'company_A', status: 'ACTIVE' }];
      }
      if (sessionId === 'sess_other_tenant') {
        return [{ id: 'sess_other_tenant', companyId: 'company_OTHER', status: 'ACTIVE' }];
      }
      if (sessionId === 'sess_deleted') {
        return [{ id: 'sess_deleted', companyId: 'company_A', status: 'DELETED' }];
      }
      return []; // not found
    }

    // 2. getSession metadata query
    if (normSql.includes('WHERE "companyId" = $1 AND id = $2 AND status != \'DELETED\'')) {
      const [comp, sess] = params;
      if (comp === 'company_A' && sess === 'sess_valid') {
        return [{
          id: 'sess_valid',
          companyId: 'company_A',
          domain: 'copilot',
          userId: 'user_1',
          title: 'جلسة تحليل الأرباح والمبيعات',
          status: 'ACTIVE',
          context: {},
          createdAt: new Date('2026-09-28T10:00:00Z'),
          updatedAt: new Date('2026-09-28T10:05:00Z'),
        }];
      }
      return [];
    }

    // 3. getSession messages query
    if (normSql.includes('WHERE "sessionId" = $1')) {
      const sessionId = params[0];
      if (sessionId === 'sess_valid') {
        return [
          {
            id: 'msg_1',
            sessionId: 'sess_valid',
            role: 'user',
            content: 'ما هو صافي الأرباح لهذا الأسبوع؟',
            createdAt: new Date('2026-09-28T10:00:00Z'),
          },
          {
            id: 'msg_2',
            sessionId: 'sess_valid',
            role: 'assistant',
            content: 'بلغ صافي أرباح المتجر 43,800 ر.س بنمو 14% مقارنة بالأسبوع الماضي.',
            createdAt: new Date('2026-09-28T10:00:05Z'),
          },
        ];
      }
      return [];
    }

    return [];
  },
  $executeRawUnsafe: async () => 1,
};

require('../services/sharedDatabase').getSharedPrismaClient = () => mockPrisma;

const agentStudioSessionService = require('../services/agentStudioSessionService');
const aiSessionService = require('../services/aiSessionService');
const aiAgentChatController = require('../controller/aiAgentChatController');

async function runVerification() {
  console.log('🧪 Starting Copilot Session Deep-Link & Multi-Tenant Verification...\n');

  // Case 1: Non-existent session
  console.log('Test 1: Non-existent session returns 404 SESSION_NOT_FOUND');
  let status1 = null;
  let json1 = null;
  await aiAgentChatController.getHistory(
    { user: { id: 'u1', companyId: 'company_A' }, query: { sessionId: 'sess_unknown_123' } },
    {
      status: (s) => { status1 = s; return { json: (d) => { json1 = d; } }; },
      json: (d) => { json1 = d; },
    }
  );
  assert.strictEqual(status1, 404, 'Expected status 404 for non-existent session');
  assert.strictEqual(json1.code, 'SESSION_NOT_FOUND', 'Expected code SESSION_NOT_FOUND');
  assert.strictEqual(json1.success, false, 'Expected success: false');
  console.log('  ✓ 404 Not Found verified with message:', json1.error);

  // Case 2: Cross-company / foreign tenant session
  console.log('\nTest 2: Cross-company session returns 403 FORBIDDEN_SESSION (Privacy & Tenant Isolation)');
  let status2 = null;
  let json2 = null;
  await aiAgentChatController.getHistory(
    { user: { id: 'u1', companyId: 'company_A' }, query: { sessionId: 'sess_other_tenant' } },
    {
      status: (s) => { status2 = s; return { json: (d) => { json2 = d; } }; },
      json: (d) => { json2 = d; },
    }
  );
  assert.strictEqual(status2, 403, 'Expected status 403 for cross-company session');
  assert.strictEqual(json2.code, 'FORBIDDEN_SESSION', 'Expected code FORBIDDEN_SESSION');
  assert.strictEqual(json2.success, false, 'Expected success: false');
  console.log('  ✓ 403 Forbidden verified with message:', json2.error);

  // Case 3: Deleted session
  console.log('\nTest 3: Deleted session returns 404 SESSION_NOT_FOUND');
  let status3 = null;
  let json3 = null;
  await aiAgentChatController.getHistory(
    { user: { id: 'u1', companyId: 'company_A' }, query: { sessionId: 'sess_deleted' } },
    {
      status: (s) => { status3 = s; return { json: (d) => { json3 = d; } }; },
      json: (d) => { json3 = d; },
    }
  );
  assert.strictEqual(status3, 404, 'Expected status 404 for deleted session');
  assert.strictEqual(json3.code, 'SESSION_NOT_FOUND', 'Expected code SESSION_NOT_FOUND');
  console.log('  ✓ 404 Deleted session verified with message:', json3.error);

  // Case 4: Valid session lookup
  console.log('\nTest 4: Valid session returns 200 with full session details and chronological message history');
  let status4 = 200;
  let json4 = null;
  await aiAgentChatController.getHistory(
    { user: { id: 'u1', companyId: 'company_A' }, query: { sessionId: 'sess_valid' } },
    {
      status: (s) => { status4 = s; return { json: (d) => { json4 = d; } }; },
      json: (d) => { json4 = d; },
    }
  );
  assert.strictEqual(status4, 200, 'Expected status 200');
  assert.strictEqual(json4.success, true, 'Expected success: true');
  assert.strictEqual(json4.session.title, 'جلسة تحليل الأرباح والمبيعات', 'Expected exact session title');
  assert.strictEqual(json4.messages.length, 2, 'Expected 2 messages in session history');
  assert.strictEqual(json4.messages[0].sender, 'user');
  assert.strictEqual(json4.messages[0].content, 'ما هو صافي الأرباح لهذا الأسبوع؟');
  assert.strictEqual(json4.messages[1].sender, 'agent');
  assert.strictEqual(json4.messages[1].content, 'بلغ صافي أرباح المتجر 43,800 ر.س بنمو 14% مقارنة بالأسبوع الماضي.');
  console.log('  ✓ 200 OK verified. Session title:', json4.session.title, '| Messages count:', json4.messages.length);

  console.log('\n🎉 ALL 4 SECURITY & DEEP-LINK TEST CASES PASSED PERFECTLY!\n');
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
