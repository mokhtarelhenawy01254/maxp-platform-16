/**
 * @file facebookAiAutoReply.test.js
 * @description Regression tests for Facebook Messenger AI Auto-Reply integration.
 *
 * Validates:
 *   1. aiMessageProcessor.processMessage accepts a `channel` parameter
 *   2. The channel value is forwarded to telemetry (not hardcoded WHATSAPP)
 *   3. handleFacebookMessage in allFunctions.js contains the AI auto-reply block
 */

const path = require('path');
const fs = require('fs');

// ── 1. aiMessageProcessor channel parameter ─────────────────────────────────

describe('aiMessageProcessor - channel parameter', () => {
  let AIMessageProcessor;

  beforeAll(() => {
    // We only need the class definition, not a running instance
    const modulePath = path.resolve(__dirname, '../../services/aiAgent/aiMessageProcessor.js');
    // Read the source to inspect the signature without requiring all dependencies
    const src = fs.readFileSync(modulePath, 'utf8');
    AIMessageProcessor = { src };
  });

  test('processMessage accepts a channel parameter with default WHATSAPP', () => {
    // The function signature should destructure { ... channel = 'WHATSAPP' }
    expect(AIMessageProcessor.src).toMatch(/channel\s*=\s*['"]WHATSAPP['"]/);
  });

  test('telemetry startTrace uses the dynamic channel variable', () => {
    // Should pass `channel` (the variable) not the string 'WHATSAPP'
    // i.e. startTrace({ companyId, channel, ... })  not  startTrace({ companyId, channel: 'WHATSAPP', ... })
    const traceCall = AIMessageProcessor.src.match(/startTrace\(\s*\{[^}]*\}\s*\)/s);
    expect(traceCall).toBeTruthy();
    const traceBody = traceCall[0];
    // Must contain `channel` as a shorthand or `channel: channel` or `channel,`
    // Must NOT contain `channel: 'WHATSAPP'`
    expect(traceBody).not.toMatch(/channel:\s*['"]WHATSAPP['"]/);
    expect(traceBody).toMatch(/channel/);
  });

  test('processMessage JSDoc documents the channel parameter', () => {
    expect(AIMessageProcessor.src).toMatch(/@param.*channel.*WHATSAPP.*FACEBOOK/s);
  });

  test('Facebook channel routes to the dedicated sales/support agent profile', () => {
    expect(AIMessageProcessor.src).toMatch(/FACEBOOK_AGENT_ROLE\s*=\s*['"]FACEBOOK_SALES_SUPPORT['"]/);
    expect(AIMessageProcessor.src).toMatch(/includeAllCeoTools:\s*false/);
    expect(AIMessageProcessor.src).toMatch(/facebook-sales-support-agent/);
  });

  test('Facebook prompt allows confirmed direct orders instead of draft-only guidance', () => {
    expect(AIMessageProcessor.src).not.toMatch(/Create only approval-required order drafts/);
    expect(AIMessageProcessor.src).toMatch(/order\.create_confirmed/);
    expect(AIMessageProcessor.src).toMatch(/explicit customer confirmation/);
  });

  test('policy validation accepts synchronous and asynchronous policy engines', () => {
    expect(AIMessageProcessor.src).toMatch(/Promise\.resolve\(policyEnforcementEngine\.validateAction/);
    expect(AIMessageProcessor.src).not.toMatch(/policyEnforcementEngine\.validateAction\([^;]+\.catch/s);
  });

  test('semantic cache does not bypass dynamic LLM reply generation or policy validation', () => {
    expect(AIMessageProcessor.src).not.toMatch(/return\s+cacheReply/);
    expect(AIMessageProcessor.src).toMatch(/answer:\s*ragAnswer/);
    expect(AIMessageProcessor.src).toMatch(/semanticCacheService\.isCacheableResult\(ragResult,\s*content\)/);
  });
});

// ── 2. handleFacebookMessage AI auto-reply block ────────────────────────────

describe('handleFacebookMessage - AI auto-reply integration', () => {
  let allFunctionsSrc;

  beforeAll(() => {
    const filePath = path.resolve(__dirname, '../../utils/allFunctions.js');
    allFunctionsSrc = fs.readFileSync(filePath, 'utf8');
  });

  test('handleFacebookMessage contains AI auto-reply setImmediate block', () => {
    // The fire-and-forget pattern should exist
    expect(allFunctionsSrc).toMatch(/AI Auto-Reply for Facebook Messenger/);
    expect(allFunctionsSrc).toMatch(/setImmediate\(async \(\) =>/);
  });

  test('AI auto-reply calls aiMessageProcessor.processMessage with channel FACEBOOK', () => {
    expect(allFunctionsSrc).toMatch(/aiMessageProcessor\.processMessage\(/);
    expect(allFunctionsSrc).toMatch(/channel:\s*['"]FACEBOOK['"]/);
  });

  test('AI auto-reply saves the reply message to the database', () => {
    // Should create a Message record with source ai_reply
    expect(allFunctionsSrc).toMatch(/source:\s*['"]ai_reply['"]/);
    expect(allFunctionsSrc).toMatch(/prisma\.message\.create/);
  });

  test('AI auto-reply emits socket event to company room', () => {
    // Should emit new_message to the company socket room
    expect(allFunctionsSrc).toMatch(/io\.to\(`company_\$\{customer\.companyId\}`\)\.emit\('new_message'/);
  });

  test('AI auto-reply sends the message to Facebook via sendFacebookMessage', () => {
    // Should call sendFacebookMessage to deliver the reply
    expect(allFunctionsSrc).toMatch(/sendFacebookMessage\(senderId,\s*replyText/);
  });

  test('AI auto-reply updates conversation status after sending', () => {
    // Should update lastMessageIsFromCustomer to false
    expect(allFunctionsSrc).toMatch(/lastMessageIsFromCustomer:\s*false/);
  });

  test('AI auto-reply triggers for text or Messenger attachments', () => {
    expect(allFunctionsSrc).toMatch(/hasCustomerTextForAi/);
    expect(allFunctionsSrc).toMatch(/hasCustomerAttachmentsForAi/);
    expect(allFunctionsSrc).toMatch(/Customer sent Messenger attachment\(s\)/);
    expect(allFunctionsSrc).toMatch(/shouldRunFacebookAiAutoReply/);
    expect(allFunctionsSrc).toMatch(/hasCustomerTextForAi\s*\|\|\s*hasCustomerAttachmentsForAi/);
  });

  test('AI auto-reply does not use regex or keyword gates for customer image requests', () => {
    expect(allFunctionsSrc).not.toMatch(/textReferencesCustomerImageForAi/);
    expect(allFunctionsSrc).not.toMatch(/waiting for the attachment event to avoid duplicate replies/);
    expect(allFunctionsSrc).not.toMatch(/Customer image request/i);
  });
});
