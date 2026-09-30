const assert = require('assert');
const { sanitizeAgentChatAttachments } = require('../../services/aiServiceAdminClient');

/**
 * Regression: ai-service /admin/agents/chat enforces a strict
 * AgentChatAttachment schema (detail ∈ low|high|auto|original, metadata must
 * be an object). Raw frontend attachment objects used to 422 the whole
 * request, which silently downgraded the copilot to the generic chat
 * fallback (different personality, no agent tools). The sanitizer must keep
 * every valid field and drop — never choke on — anything else.
 */
async function testSanitizeAgentChatAttachments() {
  console.log('🧪 Testing sanitizeAgentChatAttachments strict-schema coercion...\n');

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
  assert.deepStrictEqual(
    valid[0],
    {
      type: 'image',
      url: 'https://maxp.online/uploads/b.jpg',
      detail: 'high',
      metadata: { page: 1 },
      mime_type: 'image/jpeg',
      name: 'photo.jpg',
    },
    'all schema-valid fields preserved'
  );

  const mixed = sanitizeAgentChatAttachments(['garbage', null, { type: 'image' }, { data_url: 'data:image/png;base64,AAA' }]);
  assert.strictEqual(mixed.length, 1, 'entries without any payload and non-objects are dropped');
  assert.strictEqual(mixed[0].data_url, 'data:image/png;base64,AAA');

  assert.strictEqual(sanitizeAgentChatAttachments(undefined), undefined, 'non-array passthrough stays undefined');
  assert.deepStrictEqual(sanitizeAgentChatAttachments([]), []);

  console.log('✅ sanitizeAgentChatAttachments coerces raw payloads to the strict schema\n');
}

(async () => {
  await testSanitizeAgentChatAttachments();
  console.log('🎉 All sanitizeAgentChatAttachments tests passed');
})().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
