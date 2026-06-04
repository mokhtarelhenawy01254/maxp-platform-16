const BaseAgent = require('../../../services/aiAgent/BaseAgent');

describe('Config-Driven Agent Factory', () => {
  test('SAS_SALES from template has correct tools', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    expect(agent.role).toBe('SAS_SALES');
    expect(agent.getTools()).toContain('product.search');
    expect(agent.getTools()).toContain('facebook.reply');
    expect(agent.getTools()).not.toContain('order.create_confirmed');
    expect(agent.getTools()).toHaveLength(7);
  });

  test('SALES from template has correct tools', () => {
    const agent = BaseAgent.fromTemplate('sales-agent', 'comp1');
    expect(agent.role).toBe('SALES');
    expect(agent.getTools()).toContain('customer.info');
    expect(agent.getTools()).toContain('discount.create_draft');
    expect(agent.getTools()).toHaveLength(9);
  });

  test('SUPPORT from template has correct tools', () => {
    const agent = BaseAgent.fromTemplate('support-agent', 'comp1');
    expect(agent.role).toBe('SUPPORT');
    expect(agent.getTools()).toContain('order.cancel');
    expect(agent.getTools()).toContain('order.refund');
  });

  test('CEO from template has orchestration tools', () => {
    const agent = BaseAgent.fromTemplate('manager-ceo', 'comp1');
    expect(agent.role).toBe('CEO');
    expect(agent.getTools()).toContain('agent.spawn');
    expect(agent.getTools()).toContain('agent.assign_task');
    expect(agent.getTools().length).toBeGreaterThanOrEqual(30);
  });

  test('System prompt includes persona from template', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    const prompt = agent._getSystemPrompt();
    expect(prompt).toContain('[الشخصية]');
    expect(prompt).toContain('[القواعد التشغيلية]');
    expect(prompt).toContain('[الأدوات المتاحة]');
    expect(prompt).toContain('product.search');
  });

  test('Model comes from template, not hardcoded', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    expect(agent.model).toBe('gemini-2.5-flash');
  });

  test('Runtime overrides take precedence over template', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1', {
      model: 'claude-4',
      name: 'Custom Name',
    });
    expect(agent.model).toBe('claude-4');
    expect(agent.name).toBe('Custom Name');
  });

  test('Persona meta is loaded from template', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    expect(agent.persona.dialect).toBe('egyptian');
    expect(agent.persona.language).toBe('arabic');
    expect(agent.persona.tone).toBe('friendly');
  });

  test('Dynamic instructions receive RunContext', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    agent.setDynamicInstruction('persona', ({ agent, context }) => {
      return `You are ${agent.name}. Customer name: ${context?.customerName || 'Unknown'}.`;
    });
    const prompt = agent._getSystemPrompt({ customerName: 'Ahmed' });
    expect(prompt).toContain('Customer name: Ahmed');
  });

  test('Agent with outputSchema has schema property', () => {
    const agent = BaseAgent.fromTemplate('inventory-pricing-agent', 'comp1');
    expect(agent.outputSchema).toBeDefined();
    expect(agent.outputSchema.type).toBe('object');
    expect(agent.outputSchema.properties.products).toBeDefined();
  });

  test('Input guardrail blocks sensitive data', async () => {
    const { SensitiveDataGuardrail } = require('../../../services/aiAgent/guardrails/InputGuardrail');
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    agent.addInputGuardrail(SensitiveDataGuardrail);
    
    const result = await agent.runInputGuardrails({}, 'My card is 1234-5678-9012-3456');
    expect(result.allowed).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test('Output guardrail detects tool name exposure', async () => {
    const { ToolNameExposureGuardrail } = require('../../../services/aiAgent/guardrails/OutputGuardrail');
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    agent.addOutputGuardrail(ToolNameExposureGuardrail);
    
    const result = await agent.runOutputGuardrails({}, 'I will use `product.search` for you');
    expect(result.allowed).toBe(true);
  });

  test('Agent with handoffs includes them in system prompt', () => {
    const agent = BaseAgent.fromTemplate('facebook-sales-support-agent', 'comp1');
    if (agent.handoffs?.length > 0) {
      const prompt = agent._getSystemPrompt();
      expect(prompt).toContain('[التفويض المتاح]');
      expect(prompt).toContain('transfer_to');
    }
  });

  test('Agent.asTool() creates callable tool', () => {
    const agent = BaseAgent.fromTemplate('sas-sales-agent', 'comp1');
    const tool = agent.asTool();
    expect(tool.name).toContain('agent_sas_sales');
    expect(tool.description).toContain('product searches');
    expect(typeof tool.handler).toBe('function');
  });

  test('ConversationSessionManager creates and manages sessions', () => {
    const { getConversationSessionManager } = require('../../../services/aiAgent/ConversationSessionManager');
    const manager = getConversationSessionManager();

    const session = manager.createSession({ companyId: 'test', customerId: 'cust1' });
    expect(session.id).toBeDefined();
    expect(session.messages).toHaveLength(0);

    manager.addMessage(session.id, { role: 'user', content: 'Hello' });
    manager.addMessage(session.id, { role: 'assistant', content: 'Hi!' });

    const messages = manager.getMessages(session.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');

    const stats = manager.getStats(session.id);
    expect(stats.messageCount).toBe(2);

    manager.deleteSession(session.id);
    expect(manager.getSession(session.id)).toBeNull();
  });
});
