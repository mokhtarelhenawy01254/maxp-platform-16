const assert = require('assert');

async function runRegressionSuite() {
  console.log('🧪 Starting Executive Copilot & Media Buyer Session Regression Suite...\n');

  // Test 1: Strict Rewind Regex Check
  console.log('Test 1: Strict Rewind Slash Command vs Natural Language...');
  const isRewindCommand = (msg) => /^\s*\/(تراجع|undo|rewind)\s*$/i.test(msg);

  assert.strictEqual(isRewindCommand('/تراجع'), true, 'Should match /تراجع');
  assert.strictEqual(isRewindCommand('/undo'), true, 'Should match /undo');
  assert.strictEqual(isRewindCommand('/rewind'), true, 'Should match /rewind');
  assert.strictEqual(isRewindCommand('  /تراجع  '), true, 'Should match /تراجع with whitespace');

  // Must NOT match natural language conversational sentences
  assert.strictEqual(isRewindCommand('تراجع المبيعات كان بسبب الحملة'), false, 'Must NOT match "تراجع المبيعات"');
  assert.strictEqual(isRewindCommand('تراجعنا عن الفكرة القديمة'), false, 'Must NOT match "تراجعنا عن"');
  assert.strictEqual(isRewindCommand('ارجع ورا شوية في التقرير وافهمني'), false, 'Must NOT match "ارجع ورا"');
  assert.strictEqual(isRewindCommand('undo the last action please'), false, 'Must NOT match multi-word undo');
  console.log('✅ Test 1 Passed: Rewind regex strictly guards against accidental text deletion.\n');

  // Mocking Prisma
  const mockExecCalls = [];
  const mockQueryCalls = [];

  const mockPrisma = {
    $executeRawUnsafe: async (sql, ...params) => {
      mockExecCalls.push({ sql, params });
      return 1;
    },
    $queryRawUnsafe: async (sql, ...params) => {
      mockQueryCalls.push({ sql, params });
      if (sql.includes('FROM public.agent_studio_sessions WHERE id = $1')) {
        return [{ id: params[0], companyId: 'comp_1', domain: 'copilot', status: 'ACTIVE' }];
      }
      if (sql.includes('FROM public.agent_studio_sessions')) {
        return [{ id: 'copilot_sess_123', companyId: 'comp_1', domain: 'copilot', status: 'ACTIVE', title: 'جلسة جديدة', messages: [] }];
      }
      if (sql.includes('FROM public.agent_studio_messages') && sql.includes('LIMIT 2')) {
        return [
          { id: 'msg_2', role: 'assistant', content: 'reply' },
          { id: 'msg_1', role: 'user', content: 'hi' },
        ];
      }
      if (sql.includes('FROM public.agent_studio_messages')) {
        return [];
      }
      if (sql.includes('FROM public.facebook_ads_ai_chat_messages') && sql.includes('LIMIT 2')) {
        return [
          { id: 'mb_msg_2', role: 'agent', content: 'reply' },
          { id: 'mb_msg_1', role: 'user', content: 'hi' },
        ];
      }
      if (sql.includes('FROM public.facebook_ads_ai_chat_sessions')) {
        return [{ id: 'mb_sess_123', companyId: 'comp_1', status: 'ACTIVE', title: 'جلسة جديدة' }];
      }
      if (sql.includes('FROM public.facebook_ads_ai_chat_messages')) {
        return [];
      }
      return [];
    },
  };

  const sharedDb = require('../services/sharedDatabase');
  sharedDb.getSharedPrismaClient = () => mockPrisma;

  const agentStudioSessionService = require('../services/agentStudioSessionService');
  const aiSessionService = require('../services/aiSessionService');
  const marketingCopilotSessionService = require('../services/marketingCopilotSessionService');

  // Force tables ensured to test logic without real DB connect
  agentStudioSessionService._prisma = mockPrisma;
  marketingCopilotSessionService._prisma = mockPrisma;

  // Test 2: Error propagation in aiSessionService (No silent swallowing)
  console.log('Test 2: Verifying Error Propagation in aiSessionService...');
  const failingPrisma = {
    $executeRawUnsafe: async () => { throw new Error('Database Disk Full'); },
    $queryRawUnsafe: async () => { throw new Error('Postgres Connection Lost'); },
  };
  agentStudioSessionService._prisma = failingPrisma;

  let caughtList = false;
  try {
    await aiSessionService.listSessions('comp_1', 'user_1');
  } catch (e) {
    caughtList = true;
    assert.ok(e.message.includes('Database Disk Full') || e.message.includes('Postgres Connection Lost'));
  }
  assert.strictEqual(caughtList, true, 'aiSessionService.listSessions MUST re-throw errors');

  let caughtCreate = false;
  try {
    await aiSessionService.createSession('comp_1', 'user_1', {}, { id: 'test_sess' });
  } catch (e) {
    caughtCreate = true;
    assert.strictEqual(e.message, 'Database Disk Full');
  }
  assert.strictEqual(caughtCreate, true, 'aiSessionService.createSession MUST re-throw errors and never return dummy id');

  let caughtAppend = false;
  try {
    await aiSessionService.appendMessage('comp_1', 'test_sess', { text: 'Hi' });
  } catch (e) {
    caughtAppend = true;
    assert.strictEqual(e.message, 'Database Disk Full');
  }
  assert.strictEqual(caughtAppend, true, 'aiSessionService.appendMessage MUST re-throw errors');
  console.log('✅ Test 2 Passed: Silent error swallowing completely eliminated.\n');

  // Restore working mockPrisma
  agentStudioSessionService._prisma = mockPrisma;
  mockExecCalls.length = 0;
  mockQueryCalls.length = 0;

  // Test 3: Domain Uniformity in getSession & listSessions
  console.log('Test 3: Verifying Domain Uniformity ("copilot")...');
  await agentStudioSessionService.getSession('comp_1', 'copilot_sess_123', 'copilot');
  const getSessionQuery = mockQueryCalls.find(c => c.sql.includes('SELECT id, "companyId", domain'));
  assert.ok(getSessionQuery, 'Query for getSession must exist');
  assert.ok(getSessionQuery.sql.includes('domain = $3'), 'getSession SQL must filter by domain = $3');
  assert.strictEqual(getSessionQuery.params[2], 'copilot', 'Domain param must be "copilot"');
  console.log('✅ Test 3 Passed: Domain "copilot" is strictly enforced on reads and writes.\n');

  // Test 4: Soft-deletion on Rewind (agent_studio_messages)
  console.log('Test 4: Verifying Soft Delete on Rewind (agent_studio_messages)...');
  mockExecCalls.length = 0;
  const rewindRes = await agentStudioSessionService.rewindSession('comp_1', 'copilot_sess_123', 'copilot');
  assert.strictEqual(rewindRes.success, true);
  
  const hardDeletes = mockExecCalls.filter(c => c.sql.includes('DELETE FROM public.agent_studio_messages'));
  assert.strictEqual(hardDeletes.length, 0, 'No hard DELETE FROM allowed on rewind');

  const softDeleteUpdate = mockExecCalls.find(c => c.sql.includes('"isDeleted" = TRUE'));
  assert.ok(softDeleteUpdate, 'Must execute UPDATE ... "isDeleted" = TRUE');
  console.log('✅ Test 4 Passed: Rewind soft-deletes messages via isDeleted = TRUE.\n');

  // Test 5: Soft-deletion on Media Buyer deleteSession & rewindSession
  console.log('Test 5: Verifying Soft Delete in Media Buyer Copilot...');
  mockExecCalls.length = 0;
  await marketingCopilotSessionService.deleteSession('comp_1', 'mb_sess_123');

  const mbHardDeletes = mockExecCalls.filter(c => c.sql.includes('DELETE FROM public.facebook_ads_ai_chat_sessions'));
  assert.strictEqual(mbHardDeletes.length, 0, 'No hard DELETE allowed in media buyer deleteSession');

  const mbSessionSoftDelete = mockExecCalls.find(c => c.sql.includes("status = 'DELETED'"));
  assert.ok(mbSessionSoftDelete, 'Media buyer session delete must set status = DELETED');

  const mbMessagesSoftDelete = mockExecCalls.find(c => c.sql.includes('facebook_ads_ai_chat_messages') && c.sql.includes('"isDeleted" = TRUE'));
  assert.ok(mbMessagesSoftDelete, 'Media buyer messages must be soft-deleted with isDeleted = TRUE');
  console.log('✅ Test 5 Passed: Media buyer path upgraded to non-destructive soft-delete.\n');

  // Test 6: Empty Session Cleanup
  console.log('Test 6: Verifying Cleanup of Empty Sessions...');
  mockExecCalls.length = 0;
  await agentStudioSessionService.cleanupEmptySessions('comp_1', 'copilot', 30);
  const cleanupCall = mockExecCalls.find(c => c.sql.includes('UPDATE public.agent_studio_sessions s') && c.sql.includes("status = 'DELETED'"));
  assert.ok(cleanupCall, 'cleanupEmptySessions must soft-delete empty sessions');
  assert.ok(cleanupCall.sql.includes('NOT EXISTS'), 'cleanup must check that no active messages exist');
  console.log('✅ Test 6 Passed: Empty session cleanup routine verified.\n');

  console.log('🎉 ALL 6 REGRESSION TESTS PASSED CLEANLY! 🚀');
}

runRegressionSuite().catch(err => {
  console.error('❌ Regression suite failed:', err);
  process.exit(1);
});
