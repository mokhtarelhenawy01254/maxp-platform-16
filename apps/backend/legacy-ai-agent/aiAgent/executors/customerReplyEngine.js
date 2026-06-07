/**
 * @module customerReplyEngine
 * @description Extracts and manages customer reply prompts and format constraints.
 */

function _safeJsonClone(value) {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function _relevancePlanRequestsProductImage(relevancePlan = {}) {
  const slots = {
    ..._safeJsonClone(relevancePlan?.classification?.slots || {}),
    ..._safeJsonClone(relevancePlan?.slots || {}),
  };
  return slots.requestedProductImage === true
    || slots.wantsProductImage === true
    || slots.productImageRequested === true;
}

function _collectImageUrls(value, urls = new Set()) {
  if (!value) return urls;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) urls.add(value);
    return urls;
  }
  if (Array.isArray(value)) {
    value.forEach(item => _collectImageUrls(item, urls));
    return urls;
  }
  if (typeof value === 'object') {
    Object.values(value).forEach(item => _collectImageUrls(item, urls));
  }
  return urls;
}

function _extractImageUrlsFromEvidence(toolEvidence = []) {
  const urls = new Set();
  for (const entry of toolEvidence || []) {
    if (!entry?.success) continue;
    _collectImageUrls(entry.result, urls);
  }
  return [...urls];
}

function _compactBlock(value = '', limit = 2200) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit);
}

function _redactSensitiveCustomerEvidence(value = '') {
  return String(value || '')
    .replace(/"?(?:approvalCode|requestKey|draftId|traceId|agentId|adminReviewPath|id)"?\s*:\s*("[^"]*"|[0-9]+|null),?/gi, '"internalField": "[redacted]",')
    .replace(/\b(?:approvalCode|approval code|request key|draft id|trace id|agent id)\b\s*[:=]\s*\S+/gi, '[redacted internal id]');
}

function _buildCustomerVoiceProfile({
  companyName = '',
  agentName = '',
  role = '',
  style = '',
  soulInstructions = '',
} = {}) {
  const parts = [
    `Company: ${companyName || 'merchant'}`,
    `Agent: ${agentName || 'customer support'}`,
    `Role: ${role || 'support'}`,
  ];

  const compactStyle = _compactBlock(style, 500);
  const compactSoul = _compactBlock(soulInstructions);

  if (compactStyle) {
    parts.push(`Saved reply style:\n${compactStyle}`);
  }
  if (compactSoul) {
    parts.push(`Agent personality and voice:\n${compactSoul}`);
  }

  return parts.join('\n\n');
}

function _buildCompactCustomerReplyMessages({
  agentName = '',
  role = '',
  userMessage = '',
  toolContext = '',
  toolEvidence = [],
  relevancePlan = null,
  taskInstruction = 'Write the final customer-facing reply only.',
  conversationHistory = '',
  voiceProfile = '',
} = {}) {
  const evidence = {
    intent: relevancePlan?.intent || null,
    primaryTool: relevancePlan?.primaryTool || null,
    decision: relevancePlan?.decision || null,
    isContinuation: Boolean(String(conversationHistory || '').trim()),
    requestedProductImage: _relevancePlanRequestsProductImage(relevancePlan),
    imageUrls: _relevancePlanRequestsProductImage(relevancePlan)
      ? _extractImageUrlsFromEvidence(toolEvidence).slice(0, 5)
      : [],
    toolResultsText: _redactSensitiveCustomerEvidence(toolContext).slice(0, 10000),
    tools: Array.isArray(toolEvidence) ? toolEvidence.map(e => ({
      tool: e.tool || null,
      success: Boolean(e.success),
      error: e.error || null,
    })) : [],
  };

  return [
    {
      role: 'system',
      content: [
        'You write one final customer-facing reply for Messenger or WhatsApp.',
        'Follow the agent voice profile for dialect, tone, brevity, warmth, and greeting behavior unless it conflicts with safety or factual evidence.',
        'Use only the current customer message, previous conversation history, and structured runtime evidence.',
        'Use the merchant/agent voice as the default style; adapt lightly to the customer language and tone within that style.',
        'If the latest customer message has multiple distinct customer-visible asks, address each answerable ask from history/evidence; do not silently collapse the reply to only the primary tool action.',
        'For continuing customer support turns, do not start with a fresh greeting; answer the latest request directly unless the latest customer message is only a greeting.',
        'Ensure response diversity: Never repeat the exact same greeting or starting words in sequential turns.',
        'Vary your sentence structures and Arabic openings dynamically to sound like a natural human assistant, not a repetitive script.',
        'Never expose tool names, schema names, JSON keys, parameter names, raw JSON, runtime traces, or internal reasoning.',
        'Never reveal approval codes, request keys, internal draft IDs, trace IDs, agent IDs, or admin-only paths to customers.',
        'For approval-required order drafts, say the request is pending store/merchant team review; do not tell the customer that they must approve it.',
        'Do not mention customer account areas, favorites, tracking pages, call queues, shipping steps, or internal workflows unless the structured evidence contains that exact capability or link.',
        'Never say customer data, address, order details, shipping details, or contact details were updated, saved, recorded, changed, or confirmed unless structured evidence contains a successful write/draft result for that exact change.',
        'If the latest customer asks to change an address or order details but there is no order identifier or successful draft/write evidence, ask for the order number/details and say the request can be sent for review.',
        'For exchange, return, refund, complaint, or handoff evidence with missing order identifiers, only acknowledge support review and ask for the missing order number/details.',
        'If product.search tool succeeded and returned products, list each product\'s name and price directly in your reply — never redirect to a store URL, catalog link, or external page for this.',
        'If the customer asks for product images or image links and the structured evidence contains image URLs, include the most relevant URL(s) exactly as customer-visible links.',
        'If the customer asks for product images but the structured evidence has no image URLs, say naturally that no current image is available in the catalog.',
        'For exchange, return, refund, complaint, or handoff evidence, acknowledge review by support; do not promise approval, refund, replacement, or shipping changes.',
        'When structured evidence says isContinuation=true, do not start with a fresh greeting, welcome, or salutation in any language; answer the latest request directly.',
        ...(voiceProfile ? ['[Agent voice profile]', _compactBlock(voiceProfile, 1200), '[/Agent voice profile]'] : []),
        `Agent: ${agentName || 'customer support'}`,
        `Role: ${role || 'support'}`,
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        ...(conversationHistory ? [`Previous conversation history:\n${conversationHistory}`] : []),
        `Customer message:\n${String(userMessage || '').slice(0, 1200)}`,
        '[Structured runtime evidence]',
        JSON.stringify(evidence, null, 2),
        '[/Structured runtime evidence]',
        taskInstruction,
      ].join('\n\n'),
    },
  ];
}

function _buildCompactCustomerToolMessages({
  agentName = '',
  role = '',
  userMessage = '',
  relevancePlan = null,
  conversationHistory = '',
  voiceProfile = '',
} = {}) {
  const plan = {
    intent: relevancePlan?.intent || 'general.chat',
    decision: relevancePlan?.decision || 'answer',
    requiresTool: Boolean(relevancePlan?.requiresTool),
    primaryTool: relevancePlan?.primaryTool || null,
    allowedTools: Array.isArray(relevancePlan?.allowedTools) ? relevancePlan.allowedTools : [],
    missingSlots: Array.isArray(relevancePlan?.missingSlots) ? relevancePlan.missingSlots : [],
    slots: relevancePlan?.classification?.slots || relevancePlan?.slots || {},
    riskLevel: relevancePlan?.riskLevel || null,
    isContinuation: Boolean(String(conversationHistory || '').trim()),
  };

  return [
    {
      role: 'system',
      content: [
        'You are a customer-facing Messenger or WhatsApp sales/support agent.',
        'Use native tool calls when the intent contract requires current catalog, inventory, shipping, order, or support action evidence.',
        'If the intent contract has missing slots, ask one natural clarification instead of guessing.',
        'If no tool is required, answer naturally from the conversation and merchant voice only.',
        'Never expose tool names, schemas, JSON, internal policy, runtime traces, or reasoning to the customer.',
        'Do not write text tool-call syntax such as CALL_TOOL, tool_calls, DSML, or agenttool__.',
        'Never reveal approval codes, request keys, internal draft IDs, trace IDs, agent IDs, or admin-only paths to customers.',
        'For approval-required order drafts, say the request is pending store/merchant team review; do not tell the customer that they must approve it.',
        'Do not mention customer account areas, favorites, tracking pages, call queues, shipping steps, or internal workflows unless the structured evidence contains that exact capability or link.',
        'Never say customer data, address, order details, shipping details, or contact details were updated, saved, recorded, changed, or confirmed unless structured evidence contains a successful write/draft result for that exact change.',
        'If the latest customer asks to change an address or order details but there is no order identifier or successful draft/write evidence, ask for the order number/details and say the request can be sent for review.',
        'For exchange, return, refund, complaint, or handoff evidence with missing order identifiers, only acknowledge support review and ask for the missing order number/details.',
        'For continuing customer support turns, do not start with a fresh greeting unless the latest customer message is only a greeting.',
        'When the intent contract says isContinuation=true, do not start with a fresh greeting, welcome, or salutation in any language; answer the latest request directly.',
        'Follow the agent voice profile for dialect, tone, brevity, warmth, and greeting behavior.',
        ...(voiceProfile ? ['[Agent voice profile]', _compactBlock(voiceProfile, 1400), '[/Agent voice profile]'] : []),
        `Agent: ${agentName || 'customer support'}`,
        `Role: ${role || 'support'}`,
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        ...(conversationHistory ? [`Previous conversation history:\n${_compactBlock(conversationHistory, 1800)}`] : []),
        `Customer message:\n${String(userMessage || '').slice(0, 1200)}`,
        '[Intent contract]',
        JSON.stringify(plan, null, 2),
        '[/Intent contract]',
        'Respond to the customer or call the appropriate native tool. Keep the visible customer reply concise and natural.',
      ].join('\n\n'),
    },
  ];
}

module.exports = {
  _relevancePlanRequestsProductImage,
  _extractImageUrlsFromEvidence,
  _buildCustomerVoiceProfile,
  _buildCompactCustomerReplyMessages,
  _buildCompactCustomerToolMessages,
};
