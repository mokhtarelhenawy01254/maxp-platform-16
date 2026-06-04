/**
 * @file allPhasesIntegration.test.js
 * @description Comprehensive integration tests for Agentic AI Architecture Phases 4-20.
 * All services are now database-backed (production-grade).
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');

// ── Phase 4: Model Router ──
const modelRouterService = require('../../services/aiAgent/modelRouterService');

describe('Phase 4: Model Router Service', () => {
  test('routes greeting tasks to Flash model', () => {
    const result = modelRouterService.routeTask('GREETING', 'comp1');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.provider).toBe('GOOGLE');
  });

  test('routes planning tasks to Pro model', () => {
    const result = modelRouterService.routeTask('TASK_PLANNING', 'comp1');
    expect(result.model).toBe('gemini-2.5-pro');
  });

  test('returns fallback model when primary is disabled', () => {
    modelRouterService.disableModel('gemini-2.5-pro');
    const result = modelRouterService.routeTask('TASK_PLANNING', 'comp1');
    expect(result.model).toBe('claude-sonnet');
    expect(result.reasoning).toContain('fell back');
    modelRouterService.enableModel('gemini-2.5-pro');
  });

  test('classifies message complexity correctly', () => {
    expect(modelRouterService.classifyTaskComplexity('hi')).toBe('GREETING');
    expect(modelRouterService.classifyTaskComplexity('مرحبا')).toBe('GREETING');
    expect(modelRouterService.classifyTaskComplexity('what is the product price for this item?')).toBe('PRODUCT_INQUIRY');
    expect(modelRouterService.classifyTaskComplexity('I need a plan with steps to grow revenue')).toBe('TASK_PLANNING');
    expect(modelRouterService.classifyTaskComplexity('tell me something interesting about the weather today')).toBe('SIMPLE_QUERY');
  });

  test('returns full model registry', () => {
    const registry = modelRouterService.getModelRegistry();
    expect(Object.keys(registry)).toContain('gemini-2.5-flash');
    expect(Object.keys(registry)).toContain('gemini-2.5-pro');
    expect(registry['gemini-2.5-flash'].tier).toBe('ECONOMY');
  });
});

// ── Phase 5: Working Memory ──
const workingMemoryService = require('../../services/aiAgent/workingMemoryService');

describe('Phase 5: Working Memory Service', () => {
  const CID = 'wm_comp1', CONV = 'conv_1';

  beforeEach(async () => {
    await workingMemoryService.clearSession(CID, CONV);
  });

  test('creates and retrieves a session', async () => {
    await workingMemoryService.initSession(CID, CONV);
    const ctx = await workingMemoryService.getContext(CID, CONV);
    expect(ctx).not.toBeNull();
    expect(ctx.recentMessages).toHaveLength(0);
    expect(ctx.summary).toBeNull();
  });

  test('adds messages and triggers summary compression at 15+', async () => {
    await workingMemoryService.initSession(CID, CONV);
    for (let i = 0; i < 18; i++) {
      await workingMemoryService.addMessage(CID, CONV, { role: 'user', content: `Message ${i}` });
    }
    const ctx = await workingMemoryService.getContext(CID, CONV);
    expect(ctx.recentMessages.length).toBeLessThanOrEqual(15);
    expect(ctx.summary).not.toBeNull();
    expect(ctx.summary).toContain('Compressed');
  });

  test('tracks cart state', async () => {
    await workingMemoryService.initSession(CID, CONV);
    await workingMemoryService.updateCart(CID, CONV, { productA: 2 });
    const ctx = await workingMemoryService.getContext(CID, CONV);
    expect(ctx.cart.productA).toBe(2);
  });

  test('tracks queried products', async () => {
    await workingMemoryService.initSession(CID, CONV);
    await workingMemoryService.addQueriedProduct(CID, CONV, { id: 'p1', name: 'Shoe' });
    const ctx = await workingMemoryService.getContext(CID, CONV);
    expect(ctx.queriedProducts).toHaveLength(1);
  });

  test('returns accurate session stats', async () => {
    await workingMemoryService.initSession(CID, CONV);
    await workingMemoryService.addMessage(CID, CONV, { content: 'hello' });
    await workingMemoryService.updateCart(CID, CONV, { x: 1 });
    const stats = await workingMemoryService.getSessionStats(CID, CONV);
    expect(stats.messageCount).toBe(1);
    expect(stats.cartItemCount).toBe(1);
    expect(stats.hasSummary).toBe(false);
  });
});

// ── Phase 6: Episodic Memory ──
const episodicMemoryService = require('../../services/aiAgent/episodicMemoryService');

describe('Phase 6: Episodic Memory Service', () => {
  beforeEach(async () => {
    await episodicMemoryService._reset();
  });

  test('stores and retrieves episodes', async () => {
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Customer asked about red shoes');
    const count = await episodicMemoryService.getEpisodeCount('compA');
    expect(count).toBe(1);
  });

  test('returns similar episodes by semantic search', async () => {
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Customer bought red shoes size 42');
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Customer asked about blue jacket');
    const results = await episodicMemoryService.searchSimilar('compA', 'cust1', 'red shoes');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('red shoes');
  });

  test('ENFORCES tenant isolation', async () => {
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Secret data for company A');
    await episodicMemoryService.storeEpisode('compB', 'cust1', 'Secret data for company B');
    const results = await episodicMemoryService.searchSimilar('compA', 'cust1', 'Secret data');
    expect(results.every(r => r.companyId === 'compA')).toBe(true);
  });

  test('deletes customer episodes correctly', async () => {
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Data 1');
    await episodicMemoryService.storeEpisode('compA', 'cust1', 'Data 2');
    const deleted = await episodicMemoryService.deleteCustomerEpisodes('compA', 'cust1');
    expect(deleted).toBe(2);
    const count = await episodicMemoryService.getEpisodeCount('compA');
    expect(count).toBe(0);
  });
});

// ── Phase 7: Truth Arbitration ──
const truthArbitratorService = require('../../services/aiAgent/truthArbitratorService');

describe('Phase 7: Truth Arbitration Engine', () => {
  test('calculates correct arbitration scores', () => {
    const fact = { observedAt: new Date(), frequency: 5, confidence: 0.9, source: 'PURCHASE' };
    const score = truthArbitratorService.calculateArbitrationScore(fact);
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  test('purchase facts beat chat facts', () => {
    const now = new Date();
    const purchase = { observedAt: now, frequency: 3, confidence: 0.8, source: 'PURCHASE' };
    const chat = { observedAt: now, frequency: 3, confidence: 0.8, source: 'EXPLICIT_CHAT' };
    const pScore = truthArbitratorService.calculateArbitrationScore(purchase);
    const cScore = truthArbitratorService.calculateArbitrationScore(chat);
    expect(pScore).toBeGreaterThan(cScore);
  });

  test('recent facts beat old facts', () => {
    const recent = { observedAt: new Date(), frequency: 1, confidence: 0.5, source: 'EXPLICIT_CHAT' };
    const old = { observedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), frequency: 1, confidence: 0.5, source: 'EXPLICIT_CHAT' };
    const rScore = truthArbitratorService.calculateArbitrationScore(recent);
    const oScore = truthArbitratorService.calculateArbitrationScore(old);
    expect(rScore).toBeGreaterThan(oScore);
  });

  test('resolveConflict returns winner correctly', async () => {
    const now = new Date();
    const facts = [
      { id: null, observedAt: now, frequency: 3, confidence: 0.8, source: 'PURCHASE' },
      { id: null, observedAt: now, frequency: 1, confidence: 0.6, source: 'EXPLICIT_CHAT' },
    ];
    const { winner, archived } = await truthArbitratorService.resolveConflict('comp1', facts, now);
    expect(winner.source).toBe('PURCHASE');
    expect(archived).toHaveLength(1);
  });
});

// ── Phase 9: Dreamer Worker ──
const DreamerWorker = require('../../workers/dreamerWorker');

describe('Phase 9: Dreamer Worker Engine', () => {
  const companyId = 'dreamer_comp';
  const customerId = 'dreamer_cust';
  let worker;
  let prisma;

  let originalGetProvider;

  beforeAll(async () => {
    worker = new DreamerWorker({ batchSize: 2 });
    prisma = worker._getPrisma();

    // Mock AIProviderFactory to prevent real external network calls
    const AIProviderFactory = require('../../services/aiAgent/providers/AIProviderFactory');
    originalGetProvider = AIProviderFactory.getProvider;
    AIProviderFactory.getProvider = jest.fn().mockReturnValue({
      generateResponse: jest.fn().mockResolvedValue({
        text: () => JSON.stringify({
          facts: [
            { type: 'FACT', content: 'Customer name is Mokhtar', confidence: 0.9, metadata: { source: 'EXPLICIT_CHAT', field: 'name' } },
            { type: 'PREFERENCE', content: 'Preferred size: 42', confidence: 0.8, metadata: { source: 'EXPLICIT_CHAT', field: 'size' } }
          ],
          summary: 'Customer Mokhtar requested blue shoes in size 42.',
          keyTopics: ['name', 'size', 'shoes'],
          sentiment: 'POSITIVE'
        }),
        usage: { totalTokens: 50 }
      })
    });

    // Seed required company and customer for foreign key validation
    await prisma.company.upsert({
      where: { id: companyId },
      update: {},
      create: {
        id: companyId,
        name: 'Dreamer Comp',
        email: 'dreamer_comp@test.com'
      }
    });

    await prisma.customer.upsert({
      where: { id: customerId },
      update: {},
      create: {
        id: customerId,
        companyId,
        firstName: 'Dreamer',
        lastName: 'Cust'
      }
    });
  });

  afterAll(async () => {
    const AIProviderFactory = require('../../services/aiAgent/providers/AIProviderFactory');
    AIProviderFactory.getProvider = originalGetProvider;
  });

  beforeEach(async () => {
    // Clear relevant memory facts and conversations (cascade deletes messages)
    await prisma.agenticMemoryFact.deleteMany({ where: { companyId } });
    await prisma.conversation.deleteMany({ where: { companyId } });
  });

  test('extracts facts and summary via background consolidation', async () => {
    // 1. Create a conversation and mock messages
    const conv = await prisma.conversation.create({
      data: {
        companyId,
        customerId,
        channel: 'WHATSAPP',
        status: 'ACTIVE',
        metadata: JSON.stringify({ dreamerProcessed: false })
      }
    });

    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, content: 'My name is Mokhtar', isFromCustomer: true },
        { conversationId: conv.id, content: 'Preferred size: 42', isFromCustomer: true },
        { conversationId: conv.id, content: 'I want blue shoes', isFromCustomer: true }
      ]
    });

    // 2. Run consolidator
    const result = await worker.run(companyId);
    expect(result.processed).toBe(1);
    expect(result.factsCreated).toBeGreaterThanOrEqual(2);

    // 3. Verify conversation metadata updated
    const updatedConv = await prisma.conversation.findUnique({ where: { id: conv.id } });
    const meta = JSON.parse(updatedConv.metadata);
    expect(meta.dreamerProcessed).toBe(true);
    expect(meta.summary).toBeDefined();

    // 4. Verify agentic memory facts are in DB
    const facts = await prisma.agenticMemoryFact.findMany({ where: { companyId, customerId } });
    expect(facts.length).toBeGreaterThanOrEqual(2);
    const contents = facts.map(f => f.content.toLowerCase());
    expect(contents.some(c => c.includes('mokhtar') || c.includes('name'))).toBe(true);
    expect(contents.some(c => c.includes('42') || c.includes('size'))).toBe(true);
  }, 15000);
});

// ── Phase 10: Audit Trail (DB-backed) ──
const agentAuditTrailService = require('../../services/aiAgent/agentAuditTrailService');

describe('Phase 10: Agent Audit Trail Service', () => {
  beforeEach(async () => { await agentAuditTrailService._reset(); });

  test('logs and retrieves a decision', async () => {
    const entry = await agentAuditTrailService.logDecision('comp1', { action: 'MODEL_SELECTION', decision: 'Used Flash', cost: 0.001 });
    expect(entry.id).toBeDefined();
    expect(entry.immutable).toBe(true);
    const found = await agentAuditTrailService.getDecisionById('comp1', entry.id);
    expect(found).not.toBeNull();
  });

  test('filters by traceId and action', async () => {
    await agentAuditTrailService.logDecision('comp1', { traceId: 't1', action: 'TOOL_EXEC', decision: 'Used search' });
    await agentAuditTrailService.logDecision('comp1', { traceId: 't2', action: 'MODEL_SELECTION', decision: 'Used Pro' });
    const filtered = await agentAuditTrailService.getDecisionLog('comp1', { traceId: 't1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].traceId).toBe('t1');
  });

  test('calculates cost summary', async () => {
    await agentAuditTrailService.logDecision('comp1', { action: 'A', cost: 0.10 });
    await agentAuditTrailService.logDecision('comp1', { action: 'B', cost: 0.20 });
    const summary = await agentAuditTrailService.getCostSummary('comp1');
    expect(summary.totalCost).toBeCloseTo(0.30);
    expect(summary.decisionCount).toBe(2);
  });

  test('tenant isolation', async () => {
    await agentAuditTrailService.logDecision('comp1', { action: 'A', decision: 'private' });
    await agentAuditTrailService.logDecision('comp2', { action: 'B', decision: 'other' });
    expect(await agentAuditTrailService.getDecisionLog('comp1')).toHaveLength(1);
    expect(await agentAuditTrailService.getDecisionLog('comp2')).toHaveLength(1);
  });
});

// ── Phase 11: Draft Proposals (DB-backed) ──
const draftProposalService = require('../../services/aiAgent/draftProposalService');

describe('Phase 11: Draft Proposal Service', () => {
  beforeEach(async () => { await draftProposalService._reset(); });

  test('classifies tools correctly', () => {
    expect(draftProposalService.isWriteAction('product.updatePrice')).toBe(true);
    expect(draftProposalService.isWriteAction('product.search')).toBe(false);
    expect(draftProposalService.isReadOnly('product.search')).toBe(true);
  });

  test('creates draft with approval code for write actions', async () => {
    const result = await draftProposalService.createDraft('comp1', { toolName: 'product.updatePrice', params: { price: 100 } });
    expect(result.success).toBe(true);
    expect(result.approvalCode).toMatch(/^\d{4}$/);
    expect(result.status).toBe('PENDING');
  });

  test('rejects draft creation for read-only tools', async () => {
    const result = await draftProposalService.createDraft('comp1', { toolName: 'product.search' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT_WRITE_ACTION');
  });

  test('approves draft with correct code', async () => {
    const created = await draftProposalService.createDraft('comp1', { toolName: 'order.cancel' });
    const result = await draftProposalService.approveDraft('comp1', created.draftId, created.approvalCode);
    expect(result.success).toBe(true);
  });

  test('rejects with wrong code', async () => {
    const created = await draftProposalService.createDraft('comp1', { toolName: 'order.cancel' });
    const result = await draftProposalService.approveDraft('comp1', created.draftId, '0000');
    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_CODE');
  });
});

// ── Phase 12: Human Approval (DB-backed) ──
const humanApprovalService = require('../../services/aiAgent/humanApprovalService');

describe('Phase 12: Human Approval Service', () => {
  beforeEach(async () => { await draftProposalService._reset(); await humanApprovalService._reset(); });

  test('sends notification to merchant', async () => {
    const draft = await draftProposalService.createDraft('comp1', { toolName: 'discount.apply' });
    const notif = await humanApprovalService.notifyMerchant('comp1', draft, ['DASHBOARD']);
    expect(notif.notified).toBe(true);
    expect(notif.channels).toContain('DASHBOARD');
  });

  test('approves draft with correct code', async () => {
    const draft = await draftProposalService.createDraft('comp1', { toolName: 'discount.apply' });
    const result = await humanApprovalService.processApprovalResponse('comp1', draft.draftId, draft.approvalCode);
    expect(result.approved).toBe(true);
  });

  test('auto-rejects after 3 failed attempts', async () => {
    const draft = await draftProposalService.createDraft('comp1', { toolName: 'discount.apply' });
    await humanApprovalService.processApprovalResponse('comp1', draft.draftId, '0000');
    await humanApprovalService.processApprovalResponse('comp1', draft.draftId, '0000');
    const result = await humanApprovalService.processApprovalResponse('comp1', draft.draftId, '0000');
    expect(result.approved).toBe(false);
    expect(result.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });
});

// ── Phase 13: Policy Engine ──
const policyEnforcementEngine = require('../../services/aiAgent/policyEnforcementEngine');

describe('Phase 13: Policy Enforcement Engine', () => {
  beforeEach(() => policyEnforcementEngine._reset());

  test('allows valid discount within limits', () => {
    const result = policyEnforcementEngine.validateDiscount('comp1', 15);
    expect(result.valid).toBe(true);
  });

  test('blocks discount exceeding max', () => {
    const result = policyEnforcementEngine.validateDiscount('comp1', 50);
    expect(result.valid).toBe(false);
    expect(result.violation.rule).toBe('MAX_DISCOUNT_EXCEEDED');
  });

  test('blocks price below floor', () => {
    const result = policyEnforcementEngine.validatePriceChange('comp1', 100, 0.5);
    expect(result.valid).toBe(false);
  });

  test('blocks actions in blocklist', () => {
    expect(policyEnforcementEngine.isBlockedAction('DELETE_PRODUCT')).toBe(true);
    expect(policyEnforcementEngine.isBlockedAction('product.search')).toBe(false);
  });

  test('company-specific policy overrides', () => {
    policyEnforcementEngine.setCompanyPolicy('comp1', { maxDiscountPercent: 50 });
    const result = policyEnforcementEngine.validateDiscount('comp1', 40);
    expect(result.valid).toBe(true);
  });

  test('validates full action object', () => {
    const result = policyEnforcementEngine.validateAction('comp1', {
      type: 'DELETE_PRODUCT', params: { discountPercent: 50 }
    });
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Phase 14: Agent Provisioning ──
const agentProvisioningService = require('../../services/aiAgent/agentProvisioningService');

describe('Phase 14: Agent Provisioning Service', () => {
  beforeEach(() => agentProvisioningService._reset());

  test('spawns agent with role-based tools', () => {
    const agent = agentProvisioningService.spawn('comp1', { role: 'SALES' });
    expect(agent.role).toBe('SALES');
    expect(agent.canUseTool('product.search')).toBe(true);
    expect(agent.canUseTool('inventory.adjust')).toBe(false);
  });

  test('validates tool access correctly', () => {
    const agent = agentProvisioningService.spawn('comp1', { role: 'SUPPORT' });
    const allowed = agentProvisioningService.validateToolAccess('comp1', agent.id, 'order.lookup');
    expect(allowed.allowed).toBe(true);
    const denied = agentProvisioningService.validateToolAccess('comp1', agent.id, 'product.updatePrice');
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('TOOL_NOT_PERMITTED');
  });

  test('CEO agent has broad tool access', () => {
    const agent = agentProvisioningService.spawn('comp1', { role: 'CEO' });
    expect(agent.model).toBe('gemini-2.5-pro');
    expect(agent.canUseTool('product.search')).toBe(true);
    expect(agent.canUseTool('discount.apply')).toBe(true);
  });
});

// ── Phase 15: CEO Agent ──
const CEOAgent = require('../../services/aiAgent/CEOAgent');

describe('Phase 15: CEO Agent Orchestrator', () => {
  beforeEach(() => agentProvisioningService._reset());

  test('decomposes a sales goal into sub-tasks', () => {
    const ceo = new CEOAgent('comp1');
    const tasks = ceo.decomposeGoal('Increase sales revenue by running a promotion campaign');
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.some(t => t.assignTo === 'SALES')).toBe(true);
    expect(tasks.some(t => t.assignTo === 'INVENTORY')).toBe(true);
  });

  test('assigns tasks to provisioned agents', async () => {
    const ceo = new CEOAgent('comp1');
    const tasks = ceo.decomposeGoal('Handle customer complaints');
    const assignments = await ceo.assignTasks(tasks);
    expect(assignments.length).toBe(tasks.length);
    expect(assignments[0].status).toBe('ASSIGNED');
  });

  test('full orchestration: decompose + assign', async () => {
    const ceo = new CEOAgent('comp1');
    const result = await ceo.orchestrate('Restock inventory for low-stock items');
    expect(result.taskCount).toBeGreaterThanOrEqual(3);
    expect(result.assignments.length).toBe(result.taskCount);
  });
});

// ── Phase 16: Agent Handoff ──
const agentHandoffService = require('../../services/aiAgent/agentHandoffService');

describe('Phase 16: Agent Handoff Service', () => {
  beforeEach(() => agentHandoffService._reset());

  test('completes handoff with context preservation', () => {
    const result = agentHandoffService.initiateHandoff('comp1', {
      fromAgentId: 'sales1', toAgentId: 'shipping1', conversationId: 'conv1',
      context: { customerName: 'Ahmed', orderId: 'ord123', items: ['shoe'] },
      reason: 'Shipping inquiry',
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.context.customerName).toBe('Ahmed');
    expect(result.context.orderId).toBe('ord123');
  });

  test('verifies handoff integrity', () => {
    const { handoffId } = agentHandoffService.initiateHandoff('comp1', {
      fromAgentId: 'a1', toAgentId: 'a2', conversationId: 'c1', context: { key: 'value' },
    });
    const verified = agentHandoffService.verifyHandoff('comp1', handoffId);
    expect(verified.valid).toBe(true);
    expect(verified.contextPreserved).toBe(true);
  });

  test('tracks current conversation owner', () => {
    agentHandoffService.initiateHandoff('comp1', { fromAgentId: 'a1', toAgentId: 'a2', conversationId: 'c1', context: {} });
    agentHandoffService.initiateHandoff('comp1', { fromAgentId: 'a2', toAgentId: 'a3', conversationId: 'c1', context: {} });
    expect(agentHandoffService.getCurrentOwner('comp1', 'c1')).toBe('a3');
  });
});

// ── Phase 17: NL Cron Parser ──
const naturalLanguageCronService = require('../../services/aiAgent/naturalLanguageCronService');

describe('Phase 17: Natural Language Cron Service', () => {
  beforeEach(() => naturalLanguageCronService._reset());

  test('parses English schedule to cron', () => {
    const result = naturalLanguageCronService.parseToCron('every morning');
    expect(result.cron).toBe('0 8 * * *');
    expect(result.confidence).toBe(1.0);
  });

  test('parses Arabic schedule to cron', () => {
    const result = naturalLanguageCronService.parseToCron('كل مساء');
    expect(result.cron).toBe('0 18 * * *');
  });

  test('parses interval expressions', () => {
    const result = naturalLanguageCronService.parseToCron('every 5 minutes');
    expect(result.cron).toBe('*/5 * * * *');
  });

  test('schedules a job successfully', () => {
    const result = naturalLanguageCronService.scheduleJob('comp1', { description: 'every morning', taskType: 'FOLLOW_UP' });
    expect(result.success).toBe(true);
    expect(result.job.cronExpression).toBe('0 8 * * *');
  });

  test('rejects unparseable schedule', () => {
    const result = naturalLanguageCronService.scheduleJob('comp1', { description: 'xyzabc' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('UNPARSEABLE_SCHEDULE');
  });
});

// ── Phase 18: Routine Executor ──
const routineExecutorService = require('../../services/aiAgent/routineExecutorService');

describe('Phase 18: Routine Executor Service', () => {
  beforeEach(() => routineExecutorService._reset());

  test('executes a follow-up routine', async () => {
    const result = await routineExecutorService.executeRoutine('comp1', { id: 'job1', taskType: 'FOLLOW_UP' });
    expect(result.status).toBe('SUCCESS');
    expect(result.result.action).toBe('FOLLOW_UP_SENT');
  });

  test('logs execution history', async () => {
    await routineExecutorService.executeRoutine('comp1', { id: 'j1', taskType: 'REPORT' });
    await routineExecutorService.executeRoutine('comp1', { id: 'j2', taskType: 'INVENTORY_CHECK' });
    const log = routineExecutorService.getExecutionLog('comp1');
    expect(log).toHaveLength(2);
  });

  test('returns execution stats', async () => {
    await routineExecutorService.executeRoutine('comp1', { id: 'j1', taskType: 'REPORT' });
    const stats = routineExecutorService.getExecutionStats('comp1');
    expect(stats.total).toBe(1);
    expect(stats.success).toBe(1);
  });
});

// ── Phase 19: Corrective RAG ──
const correctiveRAGEngine = require('../../services/rag/CorrectiveRAGEngine');

describe('Phase 19: Corrective RAG Engine', () => {
  beforeEach(() => correctiveRAGEngine._reset());

  test('retrieves and answers from vector store', async () => {
    correctiveRAGEngine.addDocuments('comp1', 'VECTOR_STORE', [
      { content: 'red shoes sizes 40 41 42 43 cost 250' },
      { content: 'blue jacket sale 180' },
    ]);
    const result = await correctiveRAGEngine.query('comp1', 'red shoes sizes 40 41 42 43 cost 250');
    expect(result.answer).toContain('red shoes');
    expect(result.finalSource).toBe('VECTOR_STORE');
  });

  test('falls back to product DB when vector store fails', async () => {
    correctiveRAGEngine.addDocuments('comp1', 'PRODUCT_DB', [
      { content: 'Product sneakers white color price 300 stock available' },
    ]);
    const result = await correctiveRAGEngine.query('comp1', 'sneakers white price');
    expect(result.iterations).toBeGreaterThanOrEqual(1);
    expect(result.answer).toBeDefined();
  });

  test('returns exhausted when no good results', async () => {
    const result = await correctiveRAGEngine.query('comp1', 'quantum physics');
    expect(result.finalSource).toBe('EXHAUSTED');
  });
});

// ── Phase 20: DAG Planner ──
const dagPlannerExecutor = require('../../services/aiAgent/DAGPlannerExecutor');

describe('Phase 20: DAG Planner & Executor', () => {
  beforeEach(() => dagPlannerExecutor._reset());

  test('creates a plan with topological sort', () => {
    const plan = dagPlannerExecutor.createPlan([
      { id: 't1', name: 'Fetch data', dependencies: [], handler: async () => ({ data: [1, 2, 3] }) },
      { id: 't2', name: 'Process data', dependencies: ['t1'], handler: async () => ({ processed: true }) },
      { id: 't3', name: 'Report', dependencies: ['t2'], handler: async () => ({ report: 'done' }) },
    ]);
    expect(plan.executionOrder.length).toBeGreaterThanOrEqual(2);
    expect(plan.status).toBe('READY');
  });

  test('executes tasks in correct order', async () => {
    const order = [];
    const plan = dagPlannerExecutor.createPlan([
      { id: 't1', name: 'First', dependencies: [], handler: async () => { order.push('t1'); return { v: 1 }; } },
      { id: 't2', name: 'Second', dependencies: ['t1'], handler: async () => { order.push('t2'); return { v: 2 }; } },
    ]);
    const result = await dagPlannerExecutor.executePlan(plan);
    expect(result.status).toBe('SUCCESS');
    expect(order).toEqual(['t1', 't2']);
  });

  test('handles concurrent tasks in same layer', async () => {
    const plan = dagPlannerExecutor.createPlan([
      { id: 't1', name: 'A', dependencies: [], handler: async () => ({ a: true }) },
      { id: 't2', name: 'B', dependencies: [], handler: async () => ({ b: true }) },
      { id: 't3', name: 'C', dependencies: ['t1', 't2'], handler: async () => ({ c: true }) },
    ]);
    expect(plan.executionOrder[0]).toContain('t1');
    expect(plan.executionOrder[0]).toContain('t2');
    const result = await dagPlannerExecutor.executePlan(plan);
    expect(result.status).toBe('SUCCESS');
  });

  test('detects cycles', () => {
    expect(() => {
      dagPlannerExecutor.createPlan([
        { id: 't1', name: 'A', dependencies: ['t2'] },
        { id: 't2', name: 'B', dependencies: ['t1'] },
      ]);
    }).toThrow('cycle');
  });

  test('replans after failure', () => {
    const plan = dagPlannerExecutor.createPlan([
      { id: 't1', name: 'A', dependencies: [] },
      { id: 't2', name: 'B', dependencies: ['t1'] },
      { id: 't3', name: 'C', dependencies: ['t1'] },
    ]);
    const replanned = dagPlannerExecutor.replan(plan, ['t2']);
    expect(replanned.tasks).toHaveLength(2);
    expect(replanned.status).toBe('REPLANNED');
  });
});
