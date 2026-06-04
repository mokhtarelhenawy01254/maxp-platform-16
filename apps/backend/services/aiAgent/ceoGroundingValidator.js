/**
 * @module ceoGroundingValidator
 * @description Reply-grounding and hallucination-detection validators extracted
 * from CEOAgent.js. _validateGroundedReply() is the main entry point; the rest
 * are detection helpers that check for specific false-claim patterns.
 */

const { normalizeEvidenceText } = require('./agentTextNormalization');

function _containsSuccessClaim(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(تم|نجاح|نجحت|انشات|انشاء|اضفت|اضافه|اتضاف|اتعمل|جاهز|كلفت|تكليف|created|success|done)/i.test(text);
}

function _containsFailureAcknowledgement(reply = '') {
  const text = normalizeEvidenceText(reply);
  const boundary = '(?:^|[\\s،,.!؟:;()\\[\\]{}"\'`-])';
  const end = '(?=$|[\\s،,.!؟:;()\\[\\]{}"\'`-])';
  const phrasePattern = new RegExp(`${boundary}(?:لا\\s+يمكن|ماقدرش|مقدرش|غير\\s+متاح|غير\\s+موجود|لا\\s+يوجد|تعذر|لا\\s+املك|مش\\s+عنده|missing|failed|cannot|not\\s+available)${end}`, 'i');
  const tokenPattern = new RegExp(`${boundary}(?:لم|فشل|محتاج)${end}`, 'i');
  return phrasePattern.test(text) || tokenPattern.test(text);
}

function _containsToolProcessOnlyReply(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(مش ظاهر.{0,20}(اداه|tool)|لا املك.{0,30}(اداه|وصول|tool|access)|لا امتلك.{0,30}(اداه|وصول|tool|access)|لا يمكنني الوصول|تم منع.{0,40}اداه|اداه غير مناسبه|اداه غير مناسبه|tool unavailable|no tool|blocked tool|irrelevant tool)/i.test(text);
}

function _containsProductCreateClaim(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(تم|انشات|اضفت|اتضاف).{0,60}(منتج|product)|(?:منتج).{0,60}(تم|انشات|اضفت|اتضاف)/i.test(text);
}

function _containsAgentSpawnClaim(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(?:انشات|عينت|وظفت|قمت\s+(?:ب)?انشاء|لقد\s+(?:انشات|عينت)|اضفت|تم\s+اضافه).{0,40}(وكيل|ايجنت|agent)|تم\s+(?:انشاء|تعيين|توظيف|تجهيز|اضافه)\s+(?:ال|وكيل|)?(وكيل|ايجنت|agent)|(?:وكيل|ايجنت|agent).{0,40}(?:انشات|عينت|وظفت|اتعمل|اتجهز|جاهز|تم\s+(?:انشاؤه|تعيينه|توظيفه|تجهيزه|اضافته))|(?:اسمه|اسمها|جاهز|اتعمل|اتنشا).{0,25}(?:وكيل|ايجنت)/i.test(text);
}

function _containsSkillCreateClaim(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(تم|انشات|اضفت|عملت).{0,60}(مهاره|skill)|(?:مهاره|skill).{0,60}(تم|انشات|اضفت|عملت)/i.test(text);
}

function _containsOrderDraftCreateClaim(reply = '') {
  const text = normalizeEvidenceText(reply);
  return /(تم\s+(?:تجهيز|انشاء|عمل)|جهزت|انشات|عملت).{0,45}(مسوده\s+(?:طلب|اوردر)|اوردر|order draft)|(?:مسوده\s+(?:طلب|اوردر)|اوردر|order draft).{0,45}(?:جاهزه|معلقه|للموافقه|اتجهزت|اتعملت|created|ready)/i.test(text);
}

function _parseAgentCountClaim(reply = '') {
  const text = normalizeEvidenceText(reply)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const words = {
    واحد: 1,
    وكيل: 1,
    اتنين: 2,
    اثنين: 2,
    ثلاثه: 3,
    اربعه: 4,
    خمسه: 5,
    سته: 6,
    سبعه: 7,
    ثمانيه: 8,
    تسعه: 9,
    عشره: 10,
  };
  const numeric = text.match(/(?:عندنا|لدينا|فيه|يوجد)?\s*(\d{1,2})\s*(?:وكلاء|وكيل|agents?)/i);
  if (numeric) return Number(numeric[1]);
  const wordMatch = text.match(/(?:عندنا|لدينا|فيه|يوجد)?\s*(واحد|اتنين|اثنين|ثلاثه|اربعه|خمسه|سته|سبعه|ثمانيه|تسعه|عشره)\s*(?:وكلاء|وكيل)/i);
  return wordMatch ? words[wordMatch[1]] : null;
}

function _extractAgentEvidence(toolEvidence = []) {
  for (const entry of toolEvidence) {
    if (!entry.success) continue;
    if (entry.tool === 'agent.list_agents' && Array.isArray(entry.result)) {
      return entry.result;
    }
    if (entry.tool === 'agent.read_state' && Array.isArray(entry.result?.agents)) {
      return entry.result.agents;
    }
  }
  return null;
}

function _hasSuccessfulOrderDraftEvidence(toolEvidence = []) {
  return toolEvidence.some((entry) => {
    if (!entry.success) return false;
    if (entry.tool === 'order.create_draft') return true;
    if (entry.tool !== 'agent.run_task') return false;
    const runResult = entry.result || {};
    const nestedToolResult = runResult.result || {};
    const nestedPayload = nestedToolResult.result || {};
    return nestedPayload.toolName === 'order.create_draft'
      || Boolean(nestedPayload.orderDraft)
      || Boolean(nestedPayload.draftId);
  });
}

function _validateGroundedReply({ reply, toolEvidence = [], relevancePlan = null }) {
  const failedTools = toolEvidence.filter(entry => !entry.success);
  const hasSuccessfulEvidence = toolEvidence.some(entry => entry.success);
  const acknowledgesFailure = _containsFailureAcknowledgement(reply);
  if (hasSuccessfulEvidence && _containsToolProcessOnlyReply(reply)) {
    return {
      valid: false,
      reason: 'Model described tool access/blocking instead of the successful tool result',
      intent: relevancePlan?.intent || null,
    };
  }
  if (failedTools.length > 0 && _containsSuccessClaim(reply) && !acknowledgesFailure) {
    return {
      valid: false,
      reason: 'Model claimed success after a failed tool execution',
      failedTools: failedTools.map(entry => ({ tool: entry.tool, error: entry.error })),
    };
  }

  const successfulTools = new Set(toolEvidence.filter(entry => entry.success).map(entry => entry.tool));
  if (_containsProductCreateClaim(reply) && !acknowledgesFailure && !successfulTools.has('product.create')) {
    return {
      valid: false,
      reason: 'Model claimed product creation without successful product.create evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsAgentSpawnClaim(reply) && !acknowledgesFailure && !successfulTools.has('agent.spawn')) {
    return {
      valid: false,
      reason: 'Model claimed agent creation without successful agent.spawn evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsSkillCreateClaim(reply) && !acknowledgesFailure && !successfulTools.has('skill.create')) {
    return {
      valid: false,
      reason: 'Model claimed skill creation without successful skill.create evidence',
      intent: relevancePlan?.intent || null,
    };
  }
  if (_containsOrderDraftCreateClaim(reply) && !acknowledgesFailure && !_hasSuccessfulOrderDraftEvidence(toolEvidence)) {
    return {
      valid: false,
      reason: 'Model claimed order draft creation without successful order.create_draft evidence',
      intent: relevancePlan?.intent || null,
    };
  }

  const agents = _extractAgentEvidence(toolEvidence);
  const claimedAgentCount = _parseAgentCountClaim(reply);
  if (Array.isArray(agents) && claimedAgentCount !== null && claimedAgentCount !== agents.length) {
    return {
      valid: false,
      reason: `Model claimed ${claimedAgentCount} agent(s), but tool evidence has ${agents.length}`,
      claimedAgentCount,
      actualAgentCount: agents.length,
    };
  }

  return { valid: true };
}

module.exports = {
  _containsSuccessClaim,
  _containsFailureAcknowledgement,
  _containsToolProcessOnlyReply,
  _containsProductCreateClaim,
  _containsAgentSpawnClaim,
  _containsSkillCreateClaim,
  _containsOrderDraftCreateClaim,
  _parseAgentCountClaim,
  _extractAgentEvidence,
  _hasSuccessfulOrderDraftEvidence,
  _validateGroundedReply,
};
