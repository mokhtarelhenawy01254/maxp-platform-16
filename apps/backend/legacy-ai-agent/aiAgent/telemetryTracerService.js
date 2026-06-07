const { getSharedPrismaClient } = require('../../services/sharedDatabase');

class TelemetryTracerService {
  constructor() {
    this.prisma = getSharedPrismaClient();
  }

  /**
   * Starts a new telemetry trace.
   * @param {Object} params
   * @param {string} params.companyId - The ID of the tenant company.
   * @param {string} [params.channel="DASHBOARD"] - The channel name (e.g., WHATSAPP, FACEBOOK, DASHBOARD).
   * @param {string} [params.provider] - The AI provider name (e.g., GEMINI, GROQ).
   * @param {Object} [params.metadata] - Optional additional metadata.
   * @returns {Promise<Object>} The created trace object.
   */
  async startTrace({ companyId, channel = 'DASHBOARD', provider = null, metadata = null }) {
    try {
      const trace = await this.prisma.telemetryTrace.create({
        data: {
          companyId,
          channel,
          provider,
          status: 'RUNNING',
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
      return trace;
    } catch (error) {
      console.error('[TelemetryTracerService] failed to start trace:', error);
      throw error;
    }
  }

  /**
   * Ends a trace and updates its summary metrics.
   * @param {string} traceId - The trace ID.
   * @param {Object} params
   * @param {string} [params.status="SUCCESS"] - The final status (SUCCESS, ERROR).
   * @param {number} [params.totalTokens=0] - Total tokens consumed in the trace session.
   * @param {number} [params.promptTokens=0] - Total prompt tokens.
   * @param {number} [params.completionTokens=0] - Total completion tokens.
   * @param {number|string} [params.totalCost=0.0] - Total monetary cost.
   * @param {Object} [params.metadata] - Additional metadata updates to merge.
   * @returns {Promise<Object>} The updated trace.
   */
  async endTrace(traceId, { status = 'SUCCESS', totalTokens = 0, promptTokens = 0, completionTokens = 0, totalCost = 0.0, metadata = null } = {}) {
    try {
      const existing = await this.prisma.telemetryTrace.findUnique({ where: { id: traceId } });
      let updatedMetadata = null;
      if (metadata) {
        const oldMetadata = existing?.metadata ? JSON.parse(existing.metadata) : {};
        updatedMetadata = JSON.stringify({ ...oldMetadata, ...metadata });
      }

      const trace = await this.prisma.telemetryTrace.update({
        where: { id: traceId },
        data: {
          status,
          totalTokens,
          promptTokens,
          completionTokens,
          totalCost: parseFloat(totalCost) || 0.0,
          ...(updatedMetadata && { metadata: updatedMetadata }),
        },
      });
      return trace;
    } catch (error) {
      console.error('[TelemetryTracerService] failed to end trace:', error);
      throw error;
    }
  }

  /**
   * Starts a telemetry span nested under a trace.
   * @param {Object} params
   * @param {string} params.traceId - The ID of the trace.
   * @param {string} [params.parentId=null] - The ID of the parent span, if nested.
   * @param {string} params.name - The name of the operation (e.g. LLM_CALL, TOOL_EXECUTE).
   * @param {string} [params.type="LLM"] - The span type (LLM, TOOL, RETRIEVAL, ROUTER).
   * @param {Object|string} [params.input] - Input arguments/parameters.
   * @param {Object} [params.metadata] - Optional additional metadata.
   * @returns {Promise<Object>} The created span object.
   */
  async startSpan({ traceId, parentId = null, name, type = 'LLM', input = null, metadata = null }) {
    try {
      const stringifiedInput = typeof input === 'object' && input !== null ? JSON.stringify(input) : input;
      const span = await this.prisma.telemetrySpan.create({
        data: {
          traceId,
          parentId,
          name,
          type,
          input: stringifiedInput,
          status: 'SUCCESS', // default status
          metadata: metadata ? JSON.stringify(metadata) : null,
          startTime: new Date(),
        },
      });
      return span;
    } catch (error) {
      console.error('[TelemetryTracerService] failed to start span:', error);
      throw error;
    }
  }

  /**
   * Ends a span and calculates latency.
   * @param {string} spanId - The ID of the span to end.
   * @param {Object} params
   * @param {Object|string} [params.output] - The output of the operation.
   * @param {string} [params.status="SUCCESS"] - The final status (SUCCESS, ERROR).
   * @param {string} [params.error] - Optional error message.
   * @param {Object} [params.metadata] - Optional additional metadata to merge.
   * @returns {Promise<Object>} The updated span.
   */
  async endSpan(spanId, { output = null, status = 'SUCCESS', error = null, metadata = null } = {}) {
    try {
      const span = await this.prisma.telemetrySpan.findUnique({ where: { id: spanId } });
      if (!span) {
        throw new Error(`[TelemetryTracerService] Span not found for ID: ${spanId}`);
      }

      const endTime = new Date();
      const latencyMs = endTime.getTime() - new Date(span.startTime).getTime();
      const stringifiedOutput = typeof output === 'object' && output !== null ? JSON.stringify(output) : output;

      let updatedMetadata = null;
      if (metadata) {
        const oldMetadata = span.metadata ? JSON.parse(span.metadata) : {};
        updatedMetadata = JSON.stringify({ ...oldMetadata, ...metadata });
      }

      const updatedSpan = await this.prisma.telemetrySpan.update({
        where: { id: spanId },
        data: {
          endTime,
          latencyMs: latencyMs >= 0 ? latencyMs : 0,
          output: stringifiedOutput,
          status,
          error,
          ...(updatedMetadata && { metadata: updatedMetadata }),
        },
      });
      return updatedSpan;
    } catch (err) {
      console.error('[TelemetryTracerService] failed to end span:', err);
      throw err;
    }
  }
}

module.exports = new TelemetryTracerService();
