/**
 * Decision Unification Tests - Node.js Side
 *
 * Tests to verify AI decision source unification status
 * and identify what still needs to move from Node.js to Python
 */

const path = require('path');
const fs = require('fs');

const AI_AGENT_DIR = path.join(__dirname, '../../legacy-ai-agent/aiAgent');
const AI_SERVICE_DIR = path.join(__dirname, '../../../../apps/ai-service');

describe('AI Decision Unification Tests', () => {

  describe('4.1: AI Service Mode Routing', () => {
    let aiServiceRouter;

    beforeEach(() => {
      jest.resetModules();
      aiServiceRouter = require(path.join(AI_AGENT_DIR, 'aiServiceRouter'));
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('AI_SERVICE_MODE=off → isAiServiceEnabled returns false', () => {
      process.env.AI_SERVICE_MODE = 'off';
      delete process.env.AI_SERVICE_ENABLED_COMPANIES;

      const isEnabled = aiServiceRouter.isAiServiceEnabled('any_company');
      expect(isEnabled).toBe(false);
    });

    test('AI_SERVICE_MODE=primary with * → all companies use Python', () => {
      process.env.AI_SERVICE_MODE = 'primary';
      process.env.AI_SERVICE_ENABLED_COMPANIES = '*';

      const isEnabled = aiServiceRouter.isAiServiceEnabled('any_company');
      expect(isEnabled).toBe(true);
    });

    test('AI_SERVICE_MODE=pilot → only specific companies use Python', () => {
      process.env.AI_SERVICE_MODE = 'pilot';
      process.env.AI_SERVICE_ENABLED_COMPANIES = 'co_123,co_456';

      expect(aiServiceRouter.isAiServiceEnabled('co_123')).toBe(true);
      expect(aiServiceRouter.isAiServiceEnabled('co_456')).toBe(true);
      expect(aiServiceRouter.isAiServiceEnabled('co_999')).toBe(false);
    });

    test('AI_SERVICE_MODE=shadow → isAiServiceEnabled returns false (logging only)', () => {
      process.env.AI_SERVICE_MODE = 'shadow';
      delete process.env.AI_SERVICE_ENABLED_COMPANIES;

      const isEnabled = aiServiceRouter.isAiServiceEnabled('any_company');
      expect(isEnabled).toBe(false);
    });
  });

  describe('4.5: Remaining Node.js AI Components (Not Yet Migrated)', () => {

    test('modelManager.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'modelManager.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('providerBudgetLedgerService.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'providerBudgetLedgerService.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('policyEnforcementEngine.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'policyEnforcementEngine.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('agentToolRegistry.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'agentToolRegistry.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('DAGPlannerExecutor.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'DAGPlannerExecutor.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('intentClassificationSchema.js still exists (should move to Python)', () => {
      const filePath = path.join(AI_AGENT_DIR, 'intentClassificationSchema.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('4.6: Python AI Service Components (Already Migrated)', () => {

    test('Python intent/planner.py exists', () => {
      const plannerPath = path.join(AI_SERVICE_DIR, 'src/intent/planner.py');
      expect(fs.existsSync(plannerPath)).toBe(true);
    });

    test('Python pipeline stages exist', () => {
      const stagesDir = path.join(AI_SERVICE_DIR, 'src/pipeline/stages');
      const requiredStages = [
        'resolve_intent.py',
        'execute_tools.py',
        'handle_fallback.py',
        'validate_reply.py'
      ];
      requiredStages.forEach(stage => {
        expect(fs.existsSync(path.join(stagesDir, stage))).toBe(true);
      });
    });

    test('Python episodic memory exists', () => {
      const memoryPath = path.join(AI_SERVICE_DIR, 'src/memory/episodic_memory.py');
      expect(fs.existsSync(memoryPath)).toBe(true);
    });
  });

  describe('Integration: Tool Execution Routing', () => {

    test('Node.js aiServiceRouter can route to Python when enabled', () => {
      process.env.AI_SERVICE_MODE = 'primary';
      process.env.AI_SERVICE_ENABLED_COMPANIES = '*';

      const aiServiceRouter = require(path.join(AI_AGENT_DIR, 'aiServiceRouter'));
      const isEnabled = aiServiceRouter.isAiServiceEnabled('any_company');
      expect(isEnabled).toBe(true);
    });
  });
});