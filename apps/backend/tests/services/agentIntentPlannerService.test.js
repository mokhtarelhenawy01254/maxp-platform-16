/**
 * @module agentIntentPlannerService.test
 * @description Tests for intent planner service - missing slots without regex.
 */

const {
  buildIntentContract,
  buildIntentContractAsync,
  toToolPlan,
  INTENT_POLICIES,
} = require('../../legacy-ai-agent/aiAgent/agentIntentPlannerService');

describe('Agent Intent Planner Service - Missing Slots', () => {
  describe('buildIntentContract', () => {
    test('returns empty missingSlots for goals ready to execute', () => {
      const contract = buildIntentContract({
        message: 'test',
        availableTools: ['order.create_draft'],
        context: { activeGoal: { status: 'ready_to_execute' } },
        policyPlan: {
          goalRunId: 'goal-123',
          requiresTool: true,
          primaryTool: 'order.create_draft',
        },
      });
      expect(contract.missingSlots).toEqual([]);
    });

    test('uses classifier slots for customer channels (llm_structured_only)', () => {
      const contract = buildIntentContract({
        message: 'I want to order a t-shirt, my phone is 01012345678',
        availableTools: ['order.create_confirmed'],
        context: {
          customerIntentMode: 'llm_structured_only',
          classifiedSlots: {
            productName: 't-shirt',
            customerPhone: '01012345678',
          },
        },
        policyPlan: {
          requiresTool: true,
          primaryTool: 'order.create_confirmed',
          intent: 'orders.create_confirmed',
        },
      });

      // Should NOT contain productName or customerPhone (they're in classifier slots)
      expect(contract.missingSlots).not.toContain('productName');
      expect(contract.missingSlots).not.toContain('customerPhone');
    });

    test('marks all slots as missing when classifier returns no slots', () => {
      const contract = buildIntentContract({
        message: 'I want to order',
        availableTools: ['order.create_confirmed'],
        context: {
          customerIntentMode: 'llm_structured_only',
          classifiedSlots: {},
        },
        policyPlan: {
          requiresTool: true,
          primaryTool: 'order.create_confirmed',
          intent: 'orders.create_confirmed',
        },
      });

      expect(contract.missingSlots).toContain('productName');
      expect(contract.missingSlots).toContain('productPrice');
      expect(contract.missingSlots).toContain('customerName');
      expect(contract.missingSlots).toContain('customerPhone');
    });

    test('returns empty missingSlots for intents that do not require slots', () => {
      const contract = buildIntentContract({
        message: 'show me products',
        availableTools: ['product.search'],
        context: {},
        policyPlan: {
          requiresTool: true,
          primaryTool: 'product.search',
          intent: 'products',
        },
      });

      expect(contract.missingSlots).toEqual([]);
    });

    test('validates contract schema', () => {
      const contract = buildIntentContract({
        message: 'test',
        availableTools: [],
        context: {},
        policyPlan: {
          intent: 'general.chat',
        },
      });

      expect(contract.validation.valid).toBe(true);
      expect(contract.schemaVersion).toBeDefined();
      expect(contract.intent).toBe('general.chat');
    });

    test('toToolPlan converts contract correctly', () => {
      const contract = buildIntentContract({
        message: 'I want to order',
        availableTools: ['order.create_draft'],
        context: {
          customerIntentMode: 'llm_structured_only',
          classifiedSlots: {
            productName: 't-shirt',
            productPrice: 100,
            customerName: 'Ahmed',
            customerPhone: '01012345678',
            city: 'Cairo',
          },
        },
        policyPlan: {
          requiresTool: true,
          primaryTool: 'order.create_draft',
          allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
          intent: 'orders.create_draft',
        },
      });

      const toolPlan = toToolPlan(contract);
      expect(toolPlan.intent).toBe('orders.create_draft');
      expect(toolPlan.primaryTool).toBe('order.create_draft');
      expect(toolPlan.allowedTools).toContain('order.create_draft');
    });

    test('effectiveRequiresTool is false when missingSlots exist', () => {
      const contract = buildIntentContract({
        message: 'I want to order',
        availableTools: ['order.create_confirmed'],
        context: {
          customerIntentMode: 'llm_structured_only',
          classifiedSlots: {},
        },
        policyPlan: {
          requiresTool: true,
          primaryTool: 'order.create_confirmed',
          intent: 'orders.create_confirmed',
        },
      });

      expect(contract.requiresTool).toBe(false);
      expect(contract.blockedReason).toBe('MISSING_REQUIRED_SLOTS');
    });

    test('effectiveRequiresTool is true when no missingSlots', () => {
      const contract = buildIntentContract({
        message: 'I want to order',
        availableTools: ['order.create_confirmed'],
        context: {
          customerIntentMode: 'llm_structured_only',
          classifiedSlots: {
            productName: 't-shirt',
            productPrice: 100,
            customerName: 'Ahmed',
            customerPhone: '01012345678',
            city: 'Cairo',
            confirmedByCustomer: true,
          },
        },
        policyPlan: {
          requiresTool: true,
          primaryTool: 'order.create_confirmed',
          intent: 'orders.create_confirmed',
        },
      });

      expect(contract.requiresTool).toBe(true);
      expect(contract.missingSlots).toEqual([]);
    });

    test('routes SAS product intent to Google Sheets catalog tools', async () => {
      const contract = await buildIntentContractAsync({
        message: 'عايز كوتشي اسود مقاس 42، موجود وبكام؟',
        availableTools: ['googlesheets.searchProducts', 'googlesheets.submitOrder', 'googlesheets.readProducts'],
        companyId: 'company_123456',
        context: {
          customerIntentMode: 'llm_structured_only',
          preClassified: {
            intent: 'inventory',
            confidence: 0.96,
            slots: { productName: 'كوتشي اسود', productSize: '42' },
            missingSlots: [],
            toolEligibility: { status: 'allowed', requiredTool: null, blockedReason: null },
            reasonCodes: ['SLOTS_COMPLETE'],
          },
        },
      });

      const toolPlan = toToolPlan(contract);
      expect(toolPlan.primaryTool).toBe('googlesheets.searchProducts');
      expect(toolPlan.allowedTools).toEqual(['googlesheets.searchProducts', 'googlesheets.readProducts']);
      expect(toolPlan.requiresTool).toBe(true);
    });

    test('routes SAS confirmed order intent to Google Sheets submit tool without requiring productPrice', async () => {
      const contract = await buildIntentContractAsync({
        message: 'تمام أكد الطلب، اسمي Ahmed ورقمي 01012345678 وعايز كوتشي اسود',
        availableTools: ['googlesheets.searchProducts', 'googlesheets.submitOrder'],
        companyId: 'company_123456',
        context: {
          customerIntentMode: 'llm_structured_only',
          preClassified: {
            intent: 'orders.create_confirmed',
            confidence: 0.95,
            slots: {
              productName: 'كوتشي اسود',
              customerName: 'Ahmed',
              customerPhone: '01012345678',
              confirmedByCustomer: true,
            },
            missingSlots: [],
            toolEligibility: { status: 'allowed', requiredTool: null, blockedReason: null },
            reasonCodes: ['SLOTS_COMPLETE'],
          },
        },
      });

      const toolPlan = toToolPlan(contract);
      expect(toolPlan.primaryTool).toBe('googlesheets.submitOrder');
      expect(toolPlan.requiresTool).toBe(true);
      expect(toolPlan.missingSlots).toEqual([]);
      expect(toolPlan.requiredSlots).not.toContain('productPrice');
    });

    test('SAS Google Sheets confirmed orders ignore non-sheet order slots from classifier clarification', async () => {
      const contract = await buildIntentContractAsync({
        message: 'تمام أكد الطلب، اسمي Ahmed ورقمي 01012345678 وعايز كوتشي اسود',
        availableTools: ['googlesheets.searchProducts', 'googlesheets.submitOrder'],
        companyId: 'company_123456',
        context: {
          customerIntentMode: 'llm_structured_only',
          preClassified: {
            intent: 'orders.create_confirmed',
            confidence: 0.95,
            slots: {
              productName: 'كوتشي اسود',
              customerName: 'Ahmed',
              customerPhone: '01012345678',
            },
            missingSlots: ['productPrice', 'city'],
            toolEligibility: { status: 'needs_clarification', requiredTool: null, blockedReason: null },
            reasonCodes: ['MISSING_REQUIRED_SLOTS'],
          },
        },
      });

      const toolPlan = toToolPlan(contract);
      expect(toolPlan.primaryTool).toBe('googlesheets.submitOrder');
      expect(toolPlan.requiresTool).toBe(true);
      expect(toolPlan.missingSlots).toEqual([]);
      expect(toolPlan.requiredSlots).toEqual(['productName', 'customerName', 'customerPhone']);
    });
  });
});
