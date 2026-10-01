const assert = require('assert');
const { sanitizeAgentChatAttachments, buildAgentChatRequestBody } = require('../../services/aiServiceAdminClient');

/**
 * Regression: ai-service /admin/agents/chat enforces a strict
 * AgentChatAttachment schema (detail ∈ low|high|auto|original, metadata must
 * be an object). Raw frontend attachment objects used to 422 the whole
 * request, which silently downgraded the copilot to the generic chat
 * fallback (different personality, no agent tools). The sanitizer must keep
 * every valid field and drop — never choke on — anything else, and the
 * request builder must route attachments through it at the call-site.
 */
describe('sanitizeAgentChatAttachments', () => {
  test('drops invalid detail/metadata and unknown fields from poisoned payloads', () => {
    const poisoned = sanitizeAgentChatAttachments([
      {
        type: 'image',
        url: 'https://maxp.online/uploads/a.jpg',
        detail: 'weird',
        metadata: 'not-an-object',
        junkField: { nested: true },
      },
    ]);
    assert.strictEqual(poisoned.length, 1, 'valid attachment must survive');
    assert.deepStrictEqual(
      poisoned[0],
      { type: 'image', url: 'https://maxp.online/uploads/a.jpg' },
      'invalid detail/metadata dropped, unknown fields stripped'
    );
  });

  test('preserves every schema-valid field', () => {
    const valid = sanitizeAgentChatAttachments([
      {
        type: 'image',
        url: 'https://maxp.online/uploads/b.jpg',
        detail: 'high',
        metadata: { page: 1 },
        mime_type: 'image/jpeg',
        name: 'photo.jpg',
      },
    ]);
    assert.deepStrictEqual(valid[0], {
      type: 'image',
      url: 'https://maxp.online/uploads/b.jpg',
      detail: 'high',
      metadata: { page: 1 },
      mime_type: 'image/jpeg',
      name: 'photo.jpg',
    });
  });

  test('drops entries without any payload and non-object entries', () => {
    const mixed = sanitizeAgentChatAttachments(['garbage', null, { type: 'image' }, { data_url: 'data:image/png;base64,AAA' }]);
    assert.strictEqual(mixed.length, 1);
    assert.strictEqual(mixed[0].data_url, 'data:image/png;base64,AAA');
    assert.strictEqual(sanitizeAgentChatAttachments(undefined), undefined);
    assert.deepStrictEqual(sanitizeAgentChatAttachments([]), []);
  });
});

describe('buildAgentChatRequestBody (call-site protection)', () => {
  test('poisoned attachments never reach the request body unsanitized', () => {
    const body = buildAgentChatRequestBody({
      companyId: 'company_1',
      agentId: 'agent_1',
      message: 'صور المنتج',
      threadId: 'copilot_sess_x',
      attachments: [{ type: 'image', url: 'https://x/y.jpg', detail: 'bogus', metadata: 'nope' }],
    });
    assert.deepStrictEqual(body.attachments, [{ type: 'image', url: 'https://x/y.jpg' }]);
  });

  test('memory context, channel, and ids pass through; empty attachments omitted', () => {
    const body = buildAgentChatRequestBody({
      companyId: 'company_1',
      agentId: 'agent_1',
      message: 'عادي هات الباقي',
      threadId: 'copilot_sess_x',
      memoryContext: { recentMessages: [{ role: 'user', content: 'سابق' }] },
      attachments: [],
    });
    assert.strictEqual(body.channel, 'dashboard');
    assert.strictEqual(body.company_id, 'company_1');
    assert.deepStrictEqual(body.memory_context.recentMessages, [{ role: 'user', content: 'سابق' }]);
    assert.strictEqual('attachments' in body, false, 'empty attachment list must be omitted');
  });
});
