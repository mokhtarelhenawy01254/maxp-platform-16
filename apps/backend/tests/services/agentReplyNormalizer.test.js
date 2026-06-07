const { normalizeAgentReply } = require('../../legacy-ai-agent/aiAgent/agentReplyNormalizer');

describe('agentReplyNormalizer', () => {
  test('removes outer quotes without changing normal customer replies', () => {
    expect(normalizeAgentReply('"أهلاً بك، السعر 499 جنيه."')).toBe('أهلاً بك، السعر 499 جنيه.');
  });

  test('blocks synthetic no-reply placeholders', () => {
    expect(normalizeAgentReply('Task processed. No specific reply generated.')).toBe('');
  });

  test('blocks leaked internal tool permission questions', () => {
    expect(
      normalizeAgentReply('أهلاً بك، هل يمكنني استخدام أداة البحث عن المنتجات لمعرفة المتاح؟')
    ).toBe('');

    expect(
      normalizeAgentReply('Can I use the lookup tool to check this order?')
    ).toBe('');
  });

  test('blocks leaked order-number permission wording', () => {
    expect(
      normalizeAgentReply('هل يمكنني استخدام رقم الطلب TEST-123 للاطلاع على أحدث المعلومات حول حالة الشحن؟')
    ).toBe('');
  });

  test('blocks leaked native tool traces and parameters', () => {
    const reply = normalizeAgentReply(
      'مرحباً! سأفحص توفر Swan High Skotch مقاس 42. check للتحقق من توفر هذا المقاس. inventory.check - productNameOrSku: Swan High Skotch - productSize: 42 سأنتظر النتيجة لكي أستطيع الإجابة عليك بشكل دقيق.'
    );

    expect(reply).toBe('');
  });

  test('blocks leaked tool schema parameter sections', () => {
    expect(
      normalizeAgentReply('مرحباً! سأبحث عن المنتج.\n\nparameters:\n- query: Platform Sneakers')
    ).toBe('');

    expect(
      normalizeAgentReply('Draft received.\n- productName: Platform Sneakers\n- customerPhone: 01000000000')
    ).toBe('');
  });

  test('strips provider reasoning blocks before returning a customer reply', () => {
    const reply = normalizeAgentReply(
      '<think>Check the order draft details and hidden tool arguments.</think>Order draft created successfully.'
    );

    expect(reply).toBe('Order draft created successfully.');
    expect(reply).not.toContain('<think>');
    expect(reply).not.toContain('hidden tool arguments');
  });

  test('blocks unclosed provider reasoning blocks', () => {
    expect(
      normalizeAgentReply('<think>Internal routing notes that should never reach a customer.')
    ).toBe('');
  });

  test('strips internal tool execution statements while keeping customer context', () => {
    const reply = normalizeAgentReply(
      'أهلاً بك أحمد، لقد تلقيت طلبك لإنشاء مسودة طلب. سأستخدم أداة إنشاء مسودة الطلب بعد تأكيد هذه التفاصيل.'
    );

    expect(reply).toBe('أهلاً بك أحمد، لقد تلقيت طلبك لإنشاء مسودة طلب.');
    expect(reply).not.toMatch(/أداة|اداة/iu);
  });

  test('blocks when leaked tool statement is the whole reply', () => {
    expect(
      normalizeAgentReply('سأستخدم أداة إنشاء مسودة الطلب بعد تأكيد هذه التفاصيل.')
    ).toBe('');
  });
});
