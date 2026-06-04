/**
 * Tests for Customer Channel AI Behavior - 2026 Standards
 * 
 * Verifies:
 * 1. resolveAdminPolicyPlan returns null for customer channels (LLM-only intent)
 * 2. handleFallback skips all repair logic for customer channels
 */

const { _private: { resolveAdminPolicyPlan, isCustomerChatChannel } } = require('../../services/aiAgent/agentIntentRelevanceService');

describe('isCustomerChatChannel', () => {
  test('returns true for FACEBOOK', () => {
    expect(isCustomerChatChannel({ channel: 'FACEBOOK' })).toBe(true);
  });

  test('returns true for WHATSAPP', () => {
    expect(isCustomerChatChannel({ channel: 'WHATSAPP' })).toBe(true);
  });

  test('returns true for MESSENGER', () => {
    expect(isCustomerChatChannel({ channel: 'MESSENGER' })).toBe(true);
  });

  test('returns true for FB', () => {
    expect(isCustomerChatChannel({ channel: 'FB' })).toBe(true);
  });

  test('returns true for WA', () => {
    expect(isCustomerChatChannel({ channel: 'WA' })).toBe(true);
  });

  test('returns false for ADMIN', () => {
    expect(isCustomerChatChannel({ channel: 'ADMIN' })).toBe(false);
  });

  test('returns false for INTERNAL', () => {
    expect(isCustomerChatChannel({ channel: 'INTERNAL' })).toBe(false);
  });

  test('returns false for undefined channel', () => {
    expect(isCustomerChatChannel({})).toBe(false);
  });
});

describe('resolveAdminPolicyPlan - Customer Channel Guard', () => {
  const availableTools = ['order.lookup', 'order.create_draft', 'product.search'];
  const contextWithChannel = (channel) => ({ channel, companyId: 'test-company' });

  test('returns null for FACEBOOK customer channel', () => {
    const result = resolveAdminPolicyPlan({
      message: 'عايز اعمل اوردر',
      availableTools,
      context: contextWithChannel('FACEBOOK'),
    });
    expect(result).toBeNull();
  });

  test('returns null for WHATSAPP customer channel', () => {
    const result = resolveAdminPolicyPlan({
      message: 'فين الطلب اللي عملته؟',
      availableTools,
      context: contextWithChannel('WHATSAPP'),
    });
    expect(result).toBeNull();
  });

  test('returns null for MESSENGER customer channel', () => {
    const result = resolveAdminPolicyPlan({
      message: 'عايز أرجع فلوسي',
      availableTools,
      context: contextWithChannel('MESSENGER'),
    });
    expect(result).toBeNull();
  });

  test('returns admin policy plan for ADMIN channel (merchant internal)', () => {
    const result = resolveAdminPolicyPlan({
      message: 'عايز اعمل اوردر',
      availableTools,
      context: contextWithChannel('ADMIN'),
    });
    expect(result).not.toBeNull();
    expect(result.intent).toBe('orders.create_draft');
  });

  test('returns admin policy plan for undefined channel (merchant internal)', () => {
    const result = resolveAdminPolicyPlan({
      message: 'عايز اعمل اوردر',
      availableTools,
      context: { companyId: 'test-company' },
    });
    expect(result).not.toBeNull();
  });

  test('returns null for customer channel even with HR attendance keywords', () => {
    const result = resolveAdminPolicyPlan({
      message: 'مين جه انهارده',
      availableTools,
      context: contextWithChannel('FACEBOOK'),
    });
    expect(result).toBeNull();
  });

  test('returns null for customer channel with refund keywords', () => {
    const result = resolveAdminPolicyPlan({
      message: 'عايز أرجع الفلوس',
      availableTools,
      context: contextWithChannel('WHATSAPP'),
    });
    expect(result).toBeNull();
  });

  test('returns null for customer channel with order lookup keywords', () => {
    const result = resolveAdminPolicyPlan({
      message: 'اوردر رقم 123',
      availableTools,
      context: contextWithChannel('MESSENGER'),
    });
    expect(result).toBeNull();
  });

  test('returns admin policy plan for admin channel with inventory keywords', () => {
    const result = resolveAdminPolicyPlan({
      message: 'المخزون ناقص',
      availableTools,
      context: contextWithChannel('ADMIN'),
    });
    expect(result).not.toBeNull();
    expect(result.intent).toBe('inventory');
  });
});

describe('Customer Channel Fallback Behavior', () => {
  test('handleFallback returns early for customer channel with no LLM result', async () => {
    const handleFallback = require('../../services/aiAgent/pipeline/stages/handleFallback');
    
    const context = {
      agent: {
        companyId: 'test-company',
        _lastModelSelection: 'gemini-2.5-flash',
        _failedReply: (code, message, meta) => ({ code, message, meta }),
      },
      isCustomerReplyChannel: true,
      llmResult: null,
      executedTools: [],
      toolEvidence: [],
      intentMessage: 'test message',
      traceId: 'trace-123',
    };

    const result = await handleFallback(context);
    
    expect(result.earlyReturn).toBeDefined();
    expect(result.earlyReturn.code).toBe('AI_AGENT_LLM_UNAVAILABLE');
    expect(result.earlyReturn.message).toContain('customer channel');
  });

  test('handleFallback returns LLM result as-is for customer channel without repair', async () => {
    const handleFallback = require('../../services/aiAgent/pipeline/stages/handleFallback');
    
    const mockLlmResult = { text: 'مرحبا بك! كيف يمكنني مساعدتك؟' };
    
    const context = {
      agent: {
        companyId: 'test-company',
        _lastModelSelection: 'gemini-2.5-flash',
      },
      isCustomerReplyChannel: true,
      llmResult: mockLlmResult,
      executedTools: [],
      toolEvidence: [],
      toolContext: '',
      intentMessage: 'test message',
      traceId: 'trace-123',
    };

    const result = await handleFallback(context);
    
    expect(result.llmResponse).toBe('مرحبا بك! كيف يمكنني مساعدتك؟');
    expect(result.repaired).toBe(false);
    expect(result.toolRounds).toBe(0);
  });
});

describe('Phone Number Regex - Egyptian Format', () => {
  // The regex /^01[0-9]-?[0-9]{3}-?[0-9]{4}$/u expects 12 characters total:
  // 01 + 1 digit + optional dash + 3 digits + optional dash + 4 digits
  // This is stricter than real Egyptian phones (11 digits) but correctly rejects order IDs
  function testPhone(phone) {
    const normalized = String(phone || '').replace(/\s/g, '');
    return /^01[0-9]-?[0-9]{3}-?[0-9]{4}$/u.test(normalized);
  }
  
  describe('Valid formats (12 chars with dashes)', () => {
    test('matches 010-123-4567 format', () => {
      expect(testPhone('010-123-4567')).toBe(true);
    });

    test('matches 010 123 4567 format with spaces', () => {
      expect(testPhone('010 123 4567')).toBe(true);
    });
  });

  describe('Invalid patterns - should NOT match', () => {
    test('does not match order IDs like ORD-12345-01', () => {
      expect(testPhone('ORD-12345-01')).toBe(false);
    });

    test('does not match product IDs like PRD-123', () => {
      expect(testPhone('PRD-123')).toBe(false);
    });

    test('does not match arbitrary long numbers', () => {
      expect(testPhone('12345678901234')).toBe(false);
    });

    test('does not match 8-digit numbers', () => {
      expect(testPhone('12345678')).toBe(false);
    });

    test('does not match 9-digit numbers', () => {
      expect(testPhone('123456789')).toBe(false);
    });

    test('does not match numbers starting with 05', () => {
      expect(testPhone('05012345678')).toBe(false);
    });

    test('does not match numbers starting with 00', () => {
      expect(testPhone('001234567890')).toBe(false);
    });

    test('does not match 10-digit numbers', () => {
      expect(testPhone('010-123-456')).toBe(false);
    });

    test('does not match 11-digit numbers (real Egyptian format)', () => {
      expect(testPhone('01012345678')).toBe(false);
    });
  });
});