/**
 * @module toolOrchestratorService
 * @description Central execution gate for agent tool calls.
 */

const { TOOLS } = require('./agentToolRegistry');
const toolRegistryService = require('./toolRegistryService');
const agentProvisioningService = require('./agentProvisioningService');
const draftProposalService = require('./draftProposalService');
const agentAuditTrailService = require('./agentAuditTrailService');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

function safeErrorMessage(error) {
  return error && error.message ? error.message : String(error);
}

class ToolOrchestratorService {
  constructor() {
    this._handlers = new Map();
  }

  registerHandler(handlerName, handler) {
    this._handlers.set(handlerName, handler);
  }

  unregisterHandler(handlerName) {
    this._handlers.delete(handlerName);
  }

  listHandlers() {
    return Object.keys(TOOLS).sort();
  }

  async execute(companyId, { agentId, toolName, input = {}, traceId, reasoning, estimatedImpact } = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!agentId) throw new Error('agentId is required');
    if (!toolName) throw new Error('toolName is required');

    const tool = toolRegistryService.getTool(toolName);
    if (!tool) {
      return this._deny(companyId, { traceId, agentId, toolName, reason: 'UNKNOWN_TOOL' });
    }

    const access = agentProvisioningService.validateToolAccess(companyId, agentId, toolName);
    if (!access.allowed) {
      return this._deny(companyId, { traceId, agentId, toolName, reason: access.reason, metadata: access });
    }

    const inputValidation = toolRegistryService.validateToolInput(toolName, input);
    if (!inputValidation.valid) {
      return this._deny(companyId, {
        traceId,
        agentId,
        toolName,
        reason: 'INVALID_TOOL_INPUT',
        metadata: { errors: inputValidation.errors },
      });
    }

    if (tool.sideEffects === 'write' && tool.requiresApproval) {
      const draft = await draftProposalService.createDraft(companyId, {
        agentId,
        toolName,
        params: input,
        reasoning,
        estimatedImpact,
        traceId,
      });

      await this._audit(companyId, {
        traceId,
        agentId,
        action: `TOOL_DRAFT:${toolName}`,
        decision: draft.success ? 'Tool call converted to approval draft' : 'Tool draft failed',
        metadata: { toolName, draftId: draft.draftId || null, error: draft.error || null },
      });

      return {
        success: draft.success,
        status: draft.success ? 'PENDING_APPROVAL' : 'DRAFT_FAILED',
        toolName,
        requiresApproval: true,
        draft,
      };
    }

    const handler = this._handlers.get(toolName) || TOOLS[toolName]?.handler;
    if (!handler) {
      await this._audit(companyId, {
        traceId,
        agentId,
        action: `TOOL_NOT_IMPLEMENTED:${toolName}`,
        decision: 'Tool call validated but no handler is registered',
        metadata: { toolName },
      });

      await this._recordRun(companyId, { agentId, toolName, status: 'FAILED', error: `Tool ${toolName} has no runtime handler.`, traceId });

      return {
        success: false,
        status: 'NOT_IMPLEMENTED',
        toolName,
        error: `Tool ${toolName} is registered in the schema but has no runtime handler implemented.`,
        output: null,
      };
    }

    const startedAt = Date.now();
    let runRecord = { companyId, agentId, toolName, traceId };
    try {
      const agent = agentProvisioningService.getAgent(companyId, agentId);
      const output = await handler(companyId, input, { agent, traceId, tool });
      const latencyMs = Date.now() - startedAt;
      await this._audit(companyId, {
        traceId,
        agentId,
        action: `TOOL_EXECUTED:${toolName}`,
        decision: 'Tool handler executed',
        metadata: { toolName },
      });

      await this._recordRun(companyId, {
        agentId,
        toolName,
        status: 'SUCCESS',
        output,
        latencyMs,
        modelUsed: agent?.model || null,
        traceId,
      });

      return {
        success: true,
        status: 'EXECUTED',
        toolName,
        output,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this._audit(companyId, {
        traceId,
        agentId,
        action: `TOOL_FAILED:${toolName}`,
        decision: safeErrorMessage(error),
        metadata: { toolName },
      });

      await this._recordRun(companyId, {
        agentId,
        toolName,
        status: 'FAILED',
        error: safeErrorMessage(error),
        latencyMs,
        traceId,
      });

      return {
        success: false,
        status: 'HANDLER_FAILED',
        toolName,
        error: safeErrorMessage(error),
      };
    }
  }

  async _deny(companyId, { traceId, agentId, toolName, reason, metadata = {} }) {
    await this._audit(companyId, {
      traceId,
      agentId,
      action: `TOOL_DENIED:${toolName || 'unknown'}`,
      decision: reason,
      metadata: { toolName, ...metadata },
    });

    return {
      success: false,
      status: 'DENIED',
      toolName,
      error: reason,
      metadata,
    };
  }

  async _audit(companyId, event) {
    try {
      await agentAuditTrailService.logDecision(companyId, event);
    } catch (_) {}
  }

  async _recordRun(companyId, { agentId, toolName, status, output, error, latencyMs, modelUsed, traceId, taskId = null }) {
    try {
      const prisma = getSharedPrismaClient();
      if (!prisma.aiAgentRun?.create || !prisma.aiAgentTask?.create) {
        return;
      }
      const runData = {
        companyId,
        agentId,
        stepName: toolName,
        status,
        output: output !== undefined ? JSON.stringify(output) : null,
        error: error || null,
        latencyMs: latencyMs || 0,
        modelUsed: modelUsed || null,
        providerUsed: null,
      };

      if (taskId) {
        await prisma.aiAgentRun.create({
          data: { ...runData, taskId },
        });
      } else {
        // Try to find a recent active task for this agent to attach the run to
        const recentTask = await prisma.aiAgentTask.findFirst({
          where: { companyId, agentId, status: { in: ['CHECKED_OUT', 'IN_PROGRESS'] } },
          orderBy: { updatedAt: 'desc' },
        });
        if (recentTask) {
          await prisma.aiAgentRun.create({
            data: { ...runData, taskId: recentTask.id },
          });
        } else {
          const task = await prisma.aiAgentTask.create({
            data: {
              companyId,
              agentId,
              title: toolName || 'unknown',
              description: null,
              status: 'COMPLETED',
              priority: 'low',
              completedAt: new Date(),
              traceId: traceId || null,
              metadata: {
                source: 'tool_orchestrator',
                synthetic: true,
                toolName,
              },
            },
          });
          await prisma.aiAgentRun.create({
            data: { ...runData, taskId: task.id },
          });
        }
      }
    } catch (e) {
      // Non-blocking: run recording should not fail the tool execution
      console.warn('[TOOL-ORCHESTRATOR] Failed to record run:', e.message);
    }
  }
}

module.exports = new ToolOrchestratorService();
