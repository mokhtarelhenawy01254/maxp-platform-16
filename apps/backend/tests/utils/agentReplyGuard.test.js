/**
 * Unit tests — حارس الصدق في ردود الوكيل (Task 0bb2afa9).
 * المرافق: apps/backend/utils/agentReplyGuard.js
 *
 * الحالة المرجعية: المستخدم طلب «شيل العروض»، الوكيل ردّ «شلته»،
 * ومفيش أداة حذف ولا tool_call في الدورة.
 */

const {
  detectExecutionClaim,
  hasSuccessfulToolCall,
  applyReplyGuard,
  DEFAULT_FALLBACK_MESSAGE,
} = require('../../utils/agentReplyGuard');

describe('agent reply guard — execution claims (task 0bb2afa9)', () => {
  it('detects the exact production phrase "شلته"', () => {
    expect(detectExecutionClaim('شلته')).toBe(true);
    expect(detectExecutionClaim('تم شلته خلاص')).toBe(true);
  });

  it('detects other Arabic execution claims', () => {
    expect(detectExecutionClaim('تم الحذف بنجاح')).toBe(true);
    expect(detectExecutionClaim('أضفت العرض للمتجر')).toBe(true);
    expect(detectExecutionClaim('اتعمل التعديل')).toBe(true);
  });

  it('detects English execution claims', () => {
    expect(detectExecutionClaim('Done — I deleted the offer')).toBe(true);
    expect(detectExecutionClaim('The offer has been removed')).toBe(true);
  });

  it('does not fire on plain informational replies', () => {
    expect(detectExecutionClaim('العروض الشغالة: كوبون رمضان 10%')).toBe(false);
    expect(detectExecutionClaim('مفيش أداة حذف متاحة عندي')).toBe(false);
    expect(detectExecutionClaim('')).toBe(false);
    expect(detectExecutionClaim(null)).toBe(false);
  });
});

describe('agent reply guard — tool results (task 0bb2afa9)', () => {
  it('treats an empty tool list as no evidence', () => {
    expect(hasSuccessfulToolCall([])).toBe(false);
    expect(hasSuccessfulToolCall(undefined)).toBe(false);
  });

  it('accepts a successful tool call', () => {
    expect(hasSuccessfulToolCall([{ name: 'offers_list_active', status: 'success' }])).toBe(true);
    expect(hasSuccessfulToolCall([{ name: 'x', output: { success: true } }])).toBe(true);
  });

  it('rejects failed tool calls', () => {
    expect(hasSuccessfulToolCall([{ name: 'x', status: 'failed' }])).toBe(false);
    expect(hasSuccessfulToolCall([{ name: 'x', error: 'boom' }])).toBe(false);
    expect(hasSuccessfulToolCall([{ name: 'x', output: { success: false } }])).toBe(false);
  });

  it('counts one success among failures as evidence', () => {
    expect(
      hasSuccessfulToolCall([
        { name: 'a', status: 'failed' },
        { name: 'b', status: 'success' },
      ])
    ).toBe(true);
  });
});

describe('agent reply guard — response path (task 0bb2afa9)', () => {
  it('(أ) replaces a claim when no tool ran', () => {
    const result = applyReplyGuard({ reply: 'شلته', toolCalls: [] });

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe('EXECUTION_CLAIM_WITHOUT_TOOL_RESULT');
    expect(result.reply).toBe(DEFAULT_FALLBACK_MESSAGE);
    expect(result.reply).not.toContain('شلته');
    expect(result.originalReply).toBe('شلته');
  });

  it('(ب) lets a claim through when a tool succeeded in the same turn', () => {
    const result = applyReplyGuard({
      reply: 'تم الحذف',
      toolCalls: [{ name: 'offers_delete', status: 'success' }],
    });

    expect(result.blocked).toBe(false);
    expect(result.reply).toBe('تم الحذف');
  });

  it('never blocks a normal reply', () => {
    const reply = 'المصادر اللي قُرئت: الكوبونات + عرض المتجر. الكوبونات 3.';
    const result = applyReplyGuard({ reply, toolCalls: [] });

    expect(result.blocked).toBe(false);
    expect(result.reply).toBe(reply);
  });

  it('uses a custom fallback message when provided', () => {
    const result = applyReplyGuard({
      reply: 'تم الحذف',
      toolCalls: [],
      fallbackMessage: 'مش متاح دلوقتي',
    });

    expect(result.reply).toBe('مش متاح دلوقتي');
  });
});
