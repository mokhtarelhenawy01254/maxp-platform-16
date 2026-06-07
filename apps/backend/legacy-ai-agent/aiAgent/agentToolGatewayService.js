/**
 * @module agentToolGatewayService
 * @description Controlled execution boundary for CEOAgent tools. The LLM plans;
 * this gateway validates permissions, checks write conflicts, executes API tools,
 * and records audit entries.
 */

const crypto = require('crypto');
const {
  TOOLS,
  executeTool,
  fromNativeToolName,
} = require('./agentToolRegistry');
const agentAuditTrailService = require('./agentAuditTrailService');
const agentConflictGuardService = require('./agentConflictGuardService');
const agentIntentRelevanceService = require('./agentIntentRelevanceService');
const { getRunStateManager } = require('./RunStateManager');
const PauseRequiredError = require('./errors/PauseRequiredError');
const humanApprovalService = require('./humanApprovalService');

function makeTraceId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `trace_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function logDecision(companyId, payload) {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    return await agentAuditTrailService.logDecision(companyId, payload);
  } catch (error) {
    console.warn('[AGENT-TOOL-GATEWAY] Audit write failed:', error.message);
    return null;
  }
}

function normalizeToolName({ tool, nativeName }) {
  return tool || fromNativeToolName(nativeName || '');
}

class AgentToolGatewayService {
  newTraceId() {
    return makeTraceId();
  }

  async logIntentPlan(companyId, {
    traceId,
    agentId,
    relevancePlan,
    intentMessage = '',
    context = {},
    sessionId = null,
    conversationId = null,
  } = {}) {
    return logDecision(companyId, {
      traceId,
      agentId: agentId || 'unknown-agent',
      action: 'AGENT_INTENT_PLAN',
      decision: relevancePlan?.intent || 'general.chat',
      reasoning: relevancePlan?.reason || 'No current system data required',
      metadata: {
        intent: relevancePlan?.intent || 'general.chat',
        schemaVersion: relevancePlan?.schemaVersion || null,
        policyVersion: relevancePlan?.policyVersion || null,
        source: relevancePlan?.source || null,
        decision: relevancePlan?.decision || null,
        confidence: Number.isFinite(relevancePlan?.confidence) ? relevancePlan.confidence : null,
        actionType: relevancePlan?.actionType || null,
        riskLevel: relevancePlan?.riskLevel || null,
        requiresTool: Boolean(relevancePlan?.requiresTool),
        primaryTool: relevancePlan?.primaryTool || null,
        allowedTools: relevancePlan?.allowedTools || [],
        blockedTools: relevancePlan?.blockedTools || [],
        requiredSlots: relevancePlan?.requiredSlots || [],
        missingSlots: relevancePlan?.missingSlots || [],
        selectionScore: Number.isFinite(relevancePlan?.selectionScore) ? relevancePlan.selectionScore : null,
        classification: relevancePlan?.classification || null,
        alternatives: relevancePlan?.alternatives || [],
        ambiguous: Boolean(relevancePlan?.ambiguous),
        nextState: relevancePlan?.nextState || null,
        guardrails: relevancePlan?.guardrails || [],
        contractValid: relevancePlan?.validation?.valid ?? null,
        contractErrors: relevancePlan?.validation?.errors || [],
        goalRunId: relevancePlan?.goalRunId || null,
        goalStatus: context?.activeGoal?.status || null,
        goalNextStep: context?.activeGoal?.nextStep || null,
        intentMessage: String(intentMessage || '').slice(0, 500),
        sessionId: sessionId || null,
        conversationId: conversationId || null,
        contextMessageCount: Array.isArray(context?.recentMessages) ? context.recentMessages.length : 0,
      },
    });
  }

  async execute({
    companyId,
    agent,
    tool,
    nativeName,
    params = {},
    traceId,
    source = 'llm',
    relevancePlan = null,
    userMessage = '',
    idempotencyKey = null,
    runId = null,
  }) {
    const toolName = normalizeToolName({ tool, nativeName });
    const toolDef = TOOLS[toolName];
    const readOnly = toolDef?.readOnly !== false;
    const agentId = agent?.id || agent?.name || 'unknown-agent';

    // ── Security Layer 1: Adversarial prompt injection scan ────────────────
    if (userMessage) {
      const injectionCheck = this._scanForInjection(userMessage);
      const shouldBlockInjection = injectionCheck.blocked || (!readOnly && injectionCheck.riskLevel === 'high');
      if (shouldBlockInjection) {
        await logDecision(companyId, {
          traceId, agentId,
          action: 'AGENT_TOOL_DENIED',
          decision: 'INJECTION_BLOCKED',
          reasoning: injectionCheck.reason,
          metadata: { tool: toolName, params, source, userMessage: String(userMessage).slice(0, 500) },
        });
        return { success: false, error: 'Request blocked by security policy', readOnly };
      }
    }

    // ── Security Layer 2: Role-to-tool scope enforcement ───────────────────
    const roleCheck = this._enforceRoleScope(agent, toolName);
    if (roleCheck.blocked) {
      await logDecision(companyId, {
        traceId, agentId,
        action: 'AGENT_TOOL_DENIED',
        decision: 'ROLE_SCOPE_VIOLATION',
        reasoning: roleCheck.reason,
        metadata: { tool: toolName, agentRole: agent?.role, params, source },
      });
      return { success: false, error: 'Insufficient role permissions for this tool', readOnly };
    }

    // ── Security Layer 3: Parameter sanitization (write ops only) ──────────
    if (!readOnly) {
      const paramCheck = this._sanitizeWriteParams(toolName, params);
      if (paramCheck.blocked) {
        await logDecision(companyId, {
          traceId, agentId,
          action: 'AGENT_TOOL_DENIED',
          decision: 'PARAM_TAMPERING',
          reasoning: paramCheck.reason,
          metadata: { tool: toolName, params, source },
        });
        return { success: false, error: 'Invalid parameters detected', readOnly };
      }
      params = paramCheck.sanitized;
    }

    if (!toolDef) {
      const result = { success: false, error: `TOOL_NOT_FOUND:${toolName}`, readOnly };
      await logDecision(companyId, {
        traceId,
        agentId,
        action: 'AGENT_TOOL_DENIED',
        decision: 'UNKNOWN_TOOL',
        reasoning: `Tool ${toolName} is not registered`,
        metadata: { tool: toolName, nativeName, params, source, idempotencyKey },
      });
      return result;
    }

    if (agent && typeof agent.canUseTool === 'function' && !agent.canUseTool(toolName)) {
      const result = { success: false, error: `TOOL_NOT_ALLOWED:${toolName}`, readOnly };
      await logDecision(companyId, {
        traceId,
        agentId,
        action: 'AGENT_TOOL_DENIED',
        decision: 'FORBIDDEN_TOOL',
        reasoning: `Agent is not allowed to use ${toolName}`,
        metadata: { tool: toolName, nativeName, params, source, readOnly, idempotencyKey },
      });
      return result;
    }

    if (relevancePlan && !agentIntentRelevanceService.isToolRelevant(relevancePlan, toolName, { params, readOnly })) {
      const result = {
        success: false,
        error: relevancePlan.validation?.valid === false
          ? `INTENT_CONTRACT_INVALID:${toolName}:${(relevancePlan.validation.errors || []).join(', ')}`
          : Array.isArray(relevancePlan.missingSlots) && relevancePlan.missingSlots.length > 0
            ? `INTENT_MISSING_SLOTS:${toolName}:${relevancePlan.missingSlots.join(', ')}`
            : `TOOL_NOT_RELEVANT:${toolName}`,
        readOnly,
      };
      await logDecision(companyId, {
        traceId,
        agentId,
        action: 'AGENT_TOOL_DENIED',
        decision: 'IRRELEVANT_TOOL',
        reasoning: `Tool ${toolName} is not relevant for ${relevancePlan.intent}`,
        metadata: {
          tool: toolName,
          nativeName,
          params,
          source,
          readOnly,
          intent: relevancePlan.intent,
          allowedTools: relevancePlan.allowedTools || [],
          blockedTools: relevancePlan.blockedTools || [],
          missingSlots: relevancePlan.missingSlots || [],
          contractValid: relevancePlan.validation?.valid ?? null,
          contractErrors: relevancePlan.validation?.errors || [],
          userMessage: String(userMessage || '').slice(0, 500),
          idempotencyKey,
        },
      });
      return result;
    }

    if (!readOnly) {
      const conflictShape = agentConflictGuardService.buildToolConflict(toolName, params);
      const conflict = await agentConflictGuardService.findPendingToolConflict(companyId, conflictShape);
      if (
        conflict
        && conflict.existingAction !== conflict.requestedAction
        && !agentConflictGuardService.canSupersedePendingToolConflict(toolName, conflict)
      ) {
        const result = {
          success: false,
          error: 'PENDING_CONFLICTING_DRAFT',
          readOnly,
          conflict,
        };
        await logDecision(companyId, {
          traceId,
          agentId,
          action: 'AGENT_TOOL_BLOCKED',
          decision: 'CONFLICT',
          reasoning: 'A pending write command targets the same resource with a different action',
          metadata: { tool: toolName, nativeName, params, source, conflict, readOnly, idempotencyKey },
        });
        return result;
      }
    }

    // ── Human-in-the-Loop approval check (write ops only) ────────────────
    if (!readOnly && runId) {
      const hitlConfig = agent?.policies?.humanApproval || agent?.humanApproval;
      const toolRequiresApproval = hitlConfig?.requiredTools?.includes(toolName);
      if (toolRequiresApproval && hitlConfig) {
        const runManager = getRunStateManager();
        const run = runManager.getRun(runId);
        if (run && run.humanDecision?.approved !== true) {
          const { approval } = runManager.pauseForApproval(runId, {
            toolName,
            params,
            reason: `Tool '${toolName}' requires human approval before execution.`,
            approvalType: hitlConfig?.mode || 'ALWAYS',
          });
          await humanApprovalService.notifyRunApproval(companyId, {
            runId,
            approvalId: approval.id,
            toolName,
            reason: approval.reason,
            channels: hitlConfig?.merchantChannels || ['DASHBOARD'],
          });
          await logDecision(companyId, {
            traceId,
            agentId,
            action: 'AGENT_TOOL_PAUSED',
            decision: 'HITL_APPROVAL_REQUIRED',
            reasoning: `Tool '${toolName}' paused for human approval (run: ${runId})`,
            metadata: {
              tool: toolName,
              runId,
              approvalId: approval.id,
              approvalType: hitlConfig?.mode || 'ALWAYS',
            },
          });
          throw new PauseRequiredError({
            runId,
            pauseType: 'APPROVAL',
            reason: `Waiting for approval to execute ${toolName}`,
            metadata: { approvalId: approval.id, toolName },
          });
        }
      }
    }

    await logDecision(companyId, {
      traceId,
      agentId,
      action: 'AGENT_TOOL_REQUEST',
      decision: 'ALLOW',
      reasoning: readOnly ? 'Read-only tool' : 'Write/action tool passed permission and conflict checks',
      metadata: { tool: toolName, nativeName, params, source, readOnly, idempotencyKey },
    });

    const result = await executeTool(companyId, toolName, params);

    await logDecision(companyId, {
      traceId,
      agentId,
      action: 'AGENT_TOOL_RESULT',
      decision: result.success ? 'SUCCESS' : 'ERROR',
      reasoning: result.error || 'Tool execution completed',
      metadata: {
        tool: toolName,
        nativeName,
        source,
        readOnly: result.readOnly !== false,
        success: Boolean(result.success),
        idempotencyKey,
      },
    });

    return result;
  }

  // ── Security Guardrail Methods ──────────────────────────────────────────

  /**
   * Scan user message for adversarial prompt injection patterns.
   * Checks both English and Arabic attack vectors.
   */
  _scanForInjection(text) {
    const HARD_BLOCK_PATTERNS = [
      /ignore\s+(previous|all|prior)\s+(instructions?|prompts?|rules?)/i,
      /bypass\s+(approvals?|security|permissions?|restrictions?)/i,
      /override\s+(system|safety|policy|rules?)/i,
      /system\s+prompt/i,
      /show\s+(me\s+)?(your|the)\s+(instructions?|prompt|rules?|system)/i,
      /reveal\s+(your|the)\s+(instructions?|prompt|config)/i,
      /\u062a\u062c\u0627\u0647\u0644\s+\u0627\u0644\u062a\u0639\u0644\u064a\u0645\u0627\u062a/,
      /\u062a\u062c\u0627\u0648\u0632\s+\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062a/,
      /\u0627\u0639\u0631\u0636\s+\u062a\u0639\u0644\u064a\u0645\u0627\u062a\u0643/,
      /\u0643\u0634\u0641\s+\u0627\u0644\u0646\u0638\u0627\u0645/,
      /\u0627\u0644\u063a\u0627\u0621\s+\u0627\u0644\u0642\u064a\u0648\u062f/,
      /(DROP|DELETE|UPDATE|INSERT)\s+(TABLE|FROM|INTO)/i,
      /[{}\[\]<>]{4,}/,
    ];
    const HIGH_RISK_PATTERNS = [
      /(refund|delete|drop|remove)\s+all/i,
      /\u062d\u0630\u0641\s+\u0627\u0644\u0643\u0644/,
    ];
    const SOFT_RISK_PATTERNS = [
      /you\s+are\s+now/i,
      /act\s+as\s+(a|an|the)?/i,
      /pretend\s+(you|to\s+be)/i,
      /repeat\s+after\s+me/i,
      /say\s+exactly/i,
      /\u062a\u0635\u0631\u0641\s+\u0643\u0623\u0646\u0643/,
    ];

    for (const pattern of HARD_BLOCK_PATTERNS) {
      if (pattern.test(text)) {
        return { blocked: true, riskLevel: 'critical', reason: `Adversarial pattern detected: ${pattern.source.slice(0, 40)}` };
      }
    }
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(text)) {
        return { blocked: false, riskLevel: 'high', reason: `High-risk instruction pattern detected: ${pattern.source.slice(0, 40)}` };
      }
    }
    for (const pattern of SOFT_RISK_PATTERNS) {
      if (pattern.test(text)) {
        return { blocked: false, riskLevel: 'low', reason: `Soft prompt-shaping pattern detected: ${pattern.source.slice(0, 40)}` };
      }
    }
    return { blocked: false, riskLevel: 'none', reason: null };
  }

  /**
   * Enforce role-to-tool scope: prevent lower-privilege agents from accessing
   * high-risk tools regardless of prompt content.
   */
  _enforceRoleScope(agent, toolName) {
    const RESTRICTED_TOOLS = {
      'agent.spawn': ['SYSTEM_ADMIN', 'CEO'],
      'system.shutdown': ['SYSTEM_ADMIN'],
      'system.config': ['SYSTEM_ADMIN'],
      'agent.delete': ['SYSTEM_ADMIN'],
      'order.refund': ['SYSTEM_ADMIN', 'CEO', 'SUPPORT', 'SUPPORT_LEAD'],
      'order.cancel': ['SYSTEM_ADMIN', 'CEO', 'SUPPORT', 'SUPPORT_LEAD'],
      'product.delete': ['SYSTEM_ADMIN', 'CEO'],
      'customer.delete': ['SYSTEM_ADMIN'],
    };

    const allowedRoles = RESTRICTED_TOOLS[toolName];
    if (!allowedRoles) return { blocked: false, reason: null };

    const agentRole = String(agent?.role || '').toUpperCase();
    if (!agentRole || !allowedRoles.includes(agentRole)) {
      return {
        blocked: true,
        reason: `Tool '${toolName}' requires role [${allowedRoles.join('|')}] but agent has role '${agentRole || 'NONE'}'`,
      };
    }
    return { blocked: false, reason: null };
  }

  /**
   * Validate and sanitize parameters for write operations.
   * Catches tampered numeric fields, invalid phone/email formats.
   */
  _sanitizeWriteParams(toolName, params) {
    const issues = [];
    const sanitized = { ...params };

    // Numeric field validation for order-related tools
    if (toolName.includes('order')) {
      for (const field of ['totalAmount', 'price', 'quantity', 'amount']) {
        if (field in sanitized) {
          const val = Number(sanitized[field]);
          if (!Number.isFinite(val) || val < 0) {
            issues.push(`${field} must be a non-negative finite number (got: ${sanitized[field]})`);
          }
        }
      }
    }

    // Phone validation
    if (sanitized.phone && !/^\+?[0-9\s\-]{7,20}$/.test(String(sanitized.phone).trim())) {
      issues.push(`Invalid phone format: '${String(sanitized.phone).slice(0, 30)}'`);
    }

    // Email validation
    if (sanitized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(sanitized.email).trim())) {
      issues.push(`Invalid email format: '${String(sanitized.email).slice(0, 50)}'`);
    }

    if (issues.length > 0) {
      return { blocked: true, reason: issues.join('; '), sanitized };
    }
    return { blocked: false, reason: null, sanitized };
  }

  async logReplyBlocked(companyId, { traceId, agentId, reason, metadata = {} }) {
    return logDecision(companyId, {
      traceId,
      agentId,
      action: 'AGENT_REPLY_BLOCKED',
      decision: 'BLOCKED',
      reasoning: reason,
      metadata,
    });
  }

  async logReplyPresented(companyId, { traceId, agentId, reason, metadata = {} }) {
    return logDecision(companyId, {
      traceId,
      agentId,
      action: 'AGENT_REPLY_PRESENTED',
      decision: 'TOOL_RESULT_PRESENTED',
      reasoning: reason,
      metadata,
    });
  }
}

module.exports = new AgentToolGatewayService();
