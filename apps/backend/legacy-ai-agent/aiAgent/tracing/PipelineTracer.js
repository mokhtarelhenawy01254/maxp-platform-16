/**
 * Auto-instruments pipeline stages with tracing.
 */
class PipelineTracer {
  constructor(telemetryService) {
    this.telemetry = telemetryService;
  }

  async traceStage(stageName, context, stageFn) {
    const traceId = context.traceId;
    let span = null;
    
    if (traceId && this.telemetry) {
      span = await this.telemetry.startSpan({
        traceId,
        name: `stage.${stageName}`,
        type: 'pipeline_stage',
        input: JSON.stringify(context.task || {}),
      });
    }

    try {
      const result = await stageFn(context);
      
      if (span) {
        await this.telemetry.endSpan(span.id, {
          status: 'SUCCESS',
          output: JSON.stringify(result?.result || {}),
        });
      }
      
      return result;
    } catch (error) {
      if (span) {
        await this.telemetry.endSpan(span.id, {
          status: 'ERROR',
          error: error.message,
        });
      }
      throw error;
    }
  }
}

module.exports = PipelineTracer;
