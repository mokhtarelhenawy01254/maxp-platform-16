const makeProfile = (model) => ({
  id: 'agent_status_1',
  name: 'CEO Agent',
  role: 'CEO',
  companyId: 'company_status',
  model,
  persona: {},
  policies: {},
  getTools: () => ['agent.list_agents'],
  getSkills: () => [],
  getInfo: () => ({
    id: 'agent_status_1',
    name: 'CEO Agent',
    role: 'CEO',
    companyId: 'company_status',
    model,
    toolCount: 1,
    skillCount: 0,
    hasLLM: false,
  }),
});

describe('aiChatService.getAgentStatus', () => {
  let managerProfile;

  beforeEach(() => {
    jest.resetModules();
    managerProfile = makeProfile('openai/gpt-oss-120b');

    jest.doMock('../../services/aiAgent/agentManagerService', () => ({
      getManagerAgent: jest.fn(async () => managerProfile),
    }));
    jest.doMock('../../services/aiAgent/workingMemoryService', () => ({}));
    jest.doMock('../../services/rag/CorrectiveRAGEngine', () => ({}));
    jest.doMock('../../services/aiAgent/telemetryTracerService', () => ({}));
    jest.doMock('../../services/aiRuntimeService', () => ({}));
    jest.doMock('../../services/redisCacheService', () => ({}));
    jest.doMock('../../services/aiAgent/agentReplyNormalizer', () => ({
      normalizeAgentReply: (value) => value,
    }));
    jest.doMock('../../services/aiAgent/agentToolCallParser', () => ({
      containsInternalToolSyntax: () => false,
    }));
    jest.doMock('../../services/aiAgent/agentChatTranscriptService', () => ({}));
    jest.doMock('../../services/aiAgent/CEOAgent', () => class MockCEOAgent {
      constructor(companyId, config = {}) {
        this.companyId = companyId;
        this.id = config.id || 'agent_status_1';
        this.name = config.name || 'CEO Agent';
        this.role = config.role || 'CEO';
        this.model = config.model || 'gemini-2.5-flash';
        this.allowedTools = new Set(config.allowedTools || []);
        this.allowedSkills = new Set(config.allowedSkills || []);
        this.persona = config.persona || {};
        this.policies = config.policies || {};
        this.status = 'ACTIVE';
        this._modelManager = null;
      }

      getInfo() {
        return {
          id: this.id,
          name: this.name,
          role: this.role,
          companyId: this.companyId,
          model: this.model,
          toolCount: this.allowedTools.size,
          skillCount: this.allowedSkills.size,
          status: this.status,
          hasLLM: Boolean(this._modelManager),
        };
      }
    });
  });

  test('refreshes cached CEO profile metadata before reporting status', async () => {
    const aiChatService = require('../../services/aiAgent/aiChatService');
    const staleStatus = await aiChatService.getAgentStatus('company_status');

    expect(staleStatus.model).toBe('openai/gpt-oss-120b');

    managerProfile = makeProfile('minimaxai/minimax-m2.7');
    const refreshedStatus = await aiChatService.getAgentStatus('company_status');

    expect(refreshedStatus.spawned).toBe(true);
    expect(refreshedStatus.model).toBe('minimaxai/minimax-m2.7');
  });
});
