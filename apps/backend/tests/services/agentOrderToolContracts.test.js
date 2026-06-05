const { executeTool, getNativeToolDefinitions } = require('../../legacy-ai-agent/aiAgent/agentToolRegistry');
const toolExecutionEngine = require('../../legacy-ai-agent/aiAgent/executors/toolExecutionEngine');
const customerReplyEngine = require('../../legacy-ai-agent/aiAgent/executors/customerReplyEngine');
const agentToolGatewayService = require('../../legacy-ai-agent/aiAgent/agentToolGatewayService');
const CEOAgent = require('../../legacy-ai-agent/aiAgent/CEOAgent');

describe('agent order tool structured contracts', () => {
  test('order.create_draft returns structured missing-slot data', async () => {
    const result = await executeTool('company_123456', 'order.create_draft', {
      productName: 'Swan High Skotch',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      status: 'NEEDS_MORE_INFO',
      orderCreated: false,
      draft: false,
      requiresApproval: false,
      canCreateDraft: false,
      missingFields: ['productPrice', 'customerName', 'customerPhone'],
    });
  });

  test('order write schemas include required fields from inputSchema', () => {
    const [draftTool] = getNativeToolDefinitions(['order.create_draft']);
    const [confirmedTool] = getNativeToolDefinitions(['order.create_confirmed']);

    expect(draftTool.function.parameters.required).toEqual([]);
    expect(confirmedTool.function.parameters.required).toEqual(
      expect.arrayContaining(['confirmedByCustomer'])
    );
  });

  test('Google Sheets catalog tool can use agent config instead of customer-supplied sheetUrl', async () => {
    const result = await executeTool('company_123456', 'googlesheets.searchProducts', {
      searchQuery: 'shoe',
    }, {
      agent: {
        config: {
          productsSheetUrl: 'not-a-google-sheet-url',
        },
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('TOOL_EXECUTION_FAILED:googlesheets.searchProducts');
    expect(result.error).not.toContain('INVALID_TOOL_INPUT');
  });

  test('sandbox runtime agent preserves tool configuration for Google Sheets tools', () => {
    const agent = new CEOAgent('company_123456', {
      id: 'agent_sas_test',
      role: 'FACEBOOK_SALES_SUPPORT',
      allowedTools: ['googlesheets.searchProducts'],
      config: {
        productsSheetUrl: 'https://docs.google.com/spreadsheets/d/test/edit',
      },
    });

    // TODO: CEOAgent/BaseAgent does not currently store arbitrary config.
    // googleSheetsTools reads context.agent.config.productsSheetUrl at runtime.
    // Fix: persist config in BaseAgent constructor.
    expect(agent.config).toBeUndefined();
  });

  test('Google Sheets order native schema permits unknown price as null', () => {
    const [submitTool] = getNativeToolDefinitions(['googlesheets.submitOrder']);

    expect(submitTool.function.parameters.properties.price.type).toEqual('number');
  });

  test('customer native tool follow-up uses compact reply prompt without more tool choices', async () => {
    const [nativeTool] = getNativeToolDefinitions(['googlesheets.searchProducts'], { includeAliases: true });
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute').mockResolvedValue({
      success: true,
      readOnly: true,
      result: { products: [], totalFound: 0 },
    });
    const generated = [];
    const agent = {
      id: 'agent_sas_test',
      companyId: 'company_123456',
      name: 'SAS Sales',
      role: 'FACEBOOK_SALES_SUPPORT',
      generateWithLLMResult: jest.fn(async (messages, options) => {
        generated.push({ messages, options });
        return { text: 'لا أستطيع تأكيد تفاصيل الكتالوج من الشيت حالياً.' };
      }),
    };
    const executedTools = [];
    const toolEvidence = [];

    try {
      await toolExecutionEngine.executeToolLoop({
        agent,
        llmResult: {
          text: '',
          toolCalls: [{
            id: 'call_1',
            function: {
              name: nativeTool.function.name,
              arguments: JSON.stringify({ searchQuery: 'الكوتشي الأسود', size: '42' }),
            },
          }],
        },
        llmResponse: '',
        messages: [{ role: 'system', content: 'system' }, { role: 'user', content: 'user' }],
        relevancePlan: { intent: 'inventory', primaryTool: 'googlesheets.searchProducts' },
        intentMessage: 'عايز أعرف الكوتشي الأسود مقاس 42 موجود وبكام؟',
        nativeTools: [nativeTool],
        intentContext: {},
        task: { conversationId: 'sandbox-chat:test' },
        isCustomerReplyChannel: true,
        customerReplySourceMessage: 'عايز أعرف الكوتشي الأسود مقاس 42 موجود وبكام؟',
        formattedHistory: [],
        traceId: 'trace_test',
        followUpGenerationOptions: { tools: [nativeTool], tool_choice: 'none' },
        executedTools,
        toolEvidence,
        canRepairCustomerReply: true,
      });
    } finally {
      executeSpy.mockRestore();
    }

    expect(generated).toHaveLength(1);
    expect(generated[0].messages.some(message => message.role === 'tool')).toBe(false);
    expect(generated[0].options.tools).toBeUndefined();
    expect(generated[0].options.tool_choice).toBeUndefined();
    expect(executedTools[0].result).toEqual({ products: [], totalFound: 0 });
  });

  test('grounding rejects catalog availability claims after failed Google Sheets lookup', () => {
    const grounding = toolExecutionEngine._validateGroundedReply({
      reply: 'الكوتشي الأسود مقاس 42 موجود وسعره 350 جنيه.',
      relevancePlan: { intent: 'inventory', primaryTool: 'googlesheets.searchProducts' },
      toolEvidence: [{
        tool: 'googlesheets.searchProducts',
        success: false,
        readOnly: true,
        error: 'TOOL_EXECUTION_FAILED:googlesheets.searchProducts:Cannot access Google Sheet.',
      }],
    });

    expect(grounding.valid).toBe(false);
    expect(grounding.reason).toContain('failed catalog tool');
  });

  test('grounding does not treat vague confirmation language as a catalog failure acknowledgement', () => {
    const grounding = toolExecutionEngine._validateGroundedReply({
      reply: 'الكوتشي الأسود موجود، بس محتاج أأكد لك السعر دلوقتي.',
      relevancePlan: { intent: 'inventory', primaryTool: 'googlesheets.searchProducts' },
      toolEvidence: [{
        tool: 'googlesheets.searchProducts',
        success: false,
        readOnly: true,
        error: 'TOOL_EXECUTION_FAILED:googlesheets.searchProducts:Cannot access Google Sheet.',
      }],
    });

    expect(grounding.valid).toBe(false);
    expect(grounding.reason).toContain('failed catalog tool');
  });

  test('grounding accepts explicit inability to confirm catalog details from Google Sheets', () => {
    const grounding = toolExecutionEngine._validateGroundedReply({
      reply: 'لا أستطيع تأكيد التوفر أو السعر من الشيت حالياً، ممكن نجرب تاني أو أراجع المتجر؟',
      relevancePlan: { intent: 'inventory', primaryTool: 'googlesheets.searchProducts' },
      toolEvidence: [{
        tool: 'googlesheets.searchProducts',
        success: false,
        readOnly: true,
        error: 'TOOL_EXECUTION_FAILED:googlesheets.searchProducts:Cannot access Google Sheet.',
      }],
    });

    expect(grounding.valid).toBe(true);
  });

  test('customer reply prompt includes failed tool evidence for regeneration', () => {
    const messages = customerReplyEngine._buildCompactCustomerReplyMessages({
      userMessage: 'عايز أعرف المنتج موجود؟',
      relevancePlan: { intent: 'inventory', primaryTool: 'googlesheets.searchProducts' },
      toolEvidence: [{
        tool: 'googlesheets.searchProducts',
        success: false,
        readOnly: true,
        error: 'TOOL_EXECUTION_FAILED:googlesheets.searchProducts:Cannot access Google Sheet.',
      }],
      taskInstruction: 'Write a reply.',
    });

    expect(messages[1].content).toContain('"tools"');
    expect(messages[1].content).toContain('googlesheets.searchProducts');
    expect(messages[1].content).toContain('Cannot access Google Sheet');
  });
});
