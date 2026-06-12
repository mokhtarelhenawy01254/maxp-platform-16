/**
 * Tests for validateReply stage.
 */

jest.mock('../../legacy-ai-agent/aiAgent/agentReplyNormalizer', () => ({
  normalizeAgentReply: jest.fn(text => text || ''),
}));

jest.mock('../../legacy-ai-agent/aiAgent/agentToolCallParser', () => ({
  stripInternalToolSyntax: jest.fn(text => text || ''),
  containsInternalToolSyntax: jest.fn(() => false),
}));

jest.mock('../../legacy-ai-agent/aiAgent/agentToolGatewayService', () => ({
  logReplyBlocked: jest.fn(async () => null),
}));

jest.mock('../../legacy-ai-agent/aiAgent/executors/toolExecutionEngine', () => ({
  _validateGroundedReply: jest.fn(() => ({ valid: true })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/executors/customerReplyEngine', () => ({
  _buildCompactCustomerReplyMessages: jest.fn(() => [{ role: 'user', content: 'test' }]),
}));

const validateReply = require('../../legacy-ai-agent/aiAgent/pipeline/stages/validateReply');

describe('validateReply', () => {
  const baseContext = {
    llmResponse: 'Hello, how can I help?',
    toolEvidence: [],
    relevancePlan: { intent: 'general.chat' },
    isCustomerReplyChannel: false,
    canRepairCustomerReply: false,
    agent: {
      id: 'agent-1',
      companyId: 'company-1',
      _failedReply: jest.fn((code, reason, meta) => ({ status: 'FAILED', errorCode: code, error: reason, ...meta })),
      generateWithLLMResult: jest.fn(async () => ({ text: 'repaired reply' })),
      runInputGuardrails: jest.fn(async () => ({ allowed: true, violations: [] })),
      runOutputGuardrails: jest.fn(async () => ({ allowed: true, violations: [] })),
    },
    traceId: 'trace-1',
    executedTools: [],
    repaired: false,
    toolRounds: 0,
    loopDetectedToolCallLeak: false,
    intentMessage: 'test message',
    customerReplySourceMessage: 'test',
    formattedHistory: '',
    customerVoiceProfile: '',
    relevancePlan: { intent: 'general.chat' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns finalReply for valid reply', async () => {
    const result = await validateReply(baseContext);
    expect(result.finalReply).toBe('Hello, how can I help?');
    expect(result.earlyReturn).toBeUndefined();
  });

  test('returns earlyReturn for internal tool syntax on non-customer channel', async () => {
    const { containsInternalToolSyntax } = require('../../legacy-ai-agent/aiAgent/agentToolCallParser');
    containsInternalToolSyntax.mockReturnValueOnce(true);

    const result = await validateReply(baseContext);
    expect(result.earlyReturn).toBeDefined();
    expect(result.earlyReturn.status).toBe('FAILED');
  });

  test('handles empty reply by returning earlyReturn', async () => {
    const { normalizeAgentReply } = require('../../legacy-ai-agent/aiAgent/agentReplyNormalizer');
    normalizeAgentReply.mockReturnValueOnce('');

    const result = await validateReply({ ...baseContext, llmResponse: '' });
    expect(result.earlyReturn).toBeDefined();
    expect(result.earlyReturn.status).toBe('FAILED');
  });

  test('returns earlyReturn when grounding fails', async () => {
    const { _validateGroundedReply } = require('../../legacy-ai-agent/aiAgent/executors/toolExecutionEngine');
    _validateGroundedReply.mockReturnValueOnce({ valid: false, reason: 'ungrounded' });

    const result = await validateReply(baseContext);
    expect(result.earlyReturn).toBeDefined();
    expect(result.earlyReturn.status).toBe('FAILED');
  });

  test('strips CALL_TOOL syntax from reply', async () => {
    const result = await validateReply({
      ...baseContext,
      llmResponse: 'Hello CALL_TOOL:{"name":"test"} world',
    });
    expect(result.finalReply).toBeDefined();
  });
});
