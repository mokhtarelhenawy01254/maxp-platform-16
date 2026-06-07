/**
 * @module pipeline
 * @description Executes a sequence of composable stages, passing context between them.
 *
 * Each stage is an async function that receives a context object and returns
 * a modified context. If a stage returns { earlyReturn: ... }, the pipeline
 * stops immediately and returns that result.
 *
 * Before running stages, checks if maxp-ai-service should handle the message.
 */

const PipelineTracer = require('../tracing/PipelineTracer');
const telemetryTracerService = require('../telemetryTracerService');
const { isAiServiceEnabled, routeToAiService } = require('../aiServiceRouter');

const tracer = new PipelineTracer(telemetryTracerService);

/**
 * Execute a pipeline of stages sequentially.
 * @param {Object} context - Initial context object
 * @param {Function[]} stages - Array of async stage functions
 * @returns {Promise<Object>} Final context after all stages
 */
async function execute(context, stages) {
  let ctx = context;

  // ── AI Service hook ─────────────────────────────────────────────
  // If maxp-ai-service is enabled for this company, route the message
  // there first and return its response if successful.
  const companyId = context.companyId || context.agent?.companyId;
  const task = context.task || {};
  if (companyId && isAiServiceEnabled(companyId)) {
    const customerId = task.intentContext?.customerId || null;
    const message = task.currentMessage || task.description || '';
    const threadId = task.conversationId || null;
    try {
      const aiResult = await routeToAiService({ companyId, customerId, message, threadId, logger: console });
      if (aiResult.status === 'ok' && aiResult.reply) {
        return { earlyReturn: { success: true, reply: aiResult.reply, source: 'ai_service' } };
      }
      if (aiResult.status === 'awaiting_approval') {
        return { earlyReturn: { success: true, reply: aiResult.reply, awaitingApproval: true, draftId: aiResult.draftId, source: 'ai_service' } };
      }
    } catch (error) {
      console.error(`AI service failed, falling back to local pipeline: ${error.message}`);
    }
  }

  for (const stage of stages) {
    const stageName = stage.name || 'unknown';
    ctx = await tracer.traceStage(stageName, ctx, async (c) => {
      return await stage(c);
    });

    if (ctx && ctx.earlyReturn) {
      return ctx;
    }
  }

  return ctx;
}

module.exports = { execute };
