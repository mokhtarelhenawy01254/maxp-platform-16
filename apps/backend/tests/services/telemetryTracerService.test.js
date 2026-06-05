const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const telemetryTracerService = require('../../legacy-ai-agent/aiAgent/telemetryTracerService');

describe('TelemetryTracerService Integration Tests', () => {
  let prisma;
  const companyId = 'test-company-telemetry';

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    // Clean up before starting
    await prisma.telemetrySpan.deleteMany({ where: { trace: { companyId } } }).catch(() => {});
    await prisma.telemetryTrace.deleteMany({ where: { companyId } }).catch(() => {});
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.telemetrySpan.deleteMany({ where: { trace: { companyId } } }).catch(() => {});
    await prisma.telemetryTrace.deleteMany({ where: { companyId } }).catch(() => {});
  });

  test('should start and end a trace with metadata merging and token calculations', async () => {
    // 1. Start Trace
    const metadata = { initialField: 'hello', system: 'test' };
    const trace = await telemetryTracerService.startTrace({
      companyId,
      channel: 'WHATSAPP',
      provider: 'GEMINI',
      metadata,
    });

    expect(trace.id).toBeDefined();
    expect(trace.companyId).toBe(companyId);
    expect(trace.channel).toBe('WHATSAPP');
    expect(trace.provider).toBe('GEMINI');
    expect(trace.status).toBe('RUNNING');
    expect(JSON.parse(trace.metadata)).toEqual(metadata);

    // 2. End Trace with updates and additional metadata
    const updatedMetadata = { additionalField: 'world' };
    const endedTrace = await telemetryTracerService.endTrace(trace.id, {
      status: 'SUCCESS',
      totalTokens: 200,
      promptTokens: 150,
      completionTokens: 50,
      totalCost: 0.005,
      metadata: updatedMetadata,
    });

    expect(endedTrace.status).toBe('SUCCESS');
    expect(endedTrace.totalTokens).toBe(200);
    expect(endedTrace.promptTokens).toBe(150);
    expect(endedTrace.completionTokens).toBe(50);
    expect(Number(endedTrace.totalCost)).toBe(0.005);

    const mergedMetadata = JSON.parse(endedTrace.metadata);
    expect(mergedMetadata.initialField).toBe('hello');
    expect(mergedMetadata.additionalField).toBe('world');
  });

  test('should handle spans creation, nesting, and duration/latency calculation', async () => {
    // 1. Create a parent trace
    const trace = await telemetryTracerService.startTrace({
      companyId,
      channel: 'DASHBOARD',
    });

    // 2. Start a parent span
    const parentSpan = await telemetryTracerService.startSpan({
      traceId: trace.id,
      name: 'MAIN_ORCHESTRATOR',
      type: 'ROUTER',
      input: { query: 'Show me my last orders' },
      metadata: { step: 1 },
    });

    expect(parentSpan.id).toBeDefined();
    expect(parentSpan.traceId).toBe(trace.id);
    expect(parentSpan.parentId).toBeNull();
    expect(parentSpan.name).toBe('MAIN_ORCHESTRATOR');
    expect(parentSpan.type).toBe('ROUTER');
    expect(JSON.parse(parentSpan.input)).toEqual({ query: 'Show me my last orders' });

    // 3. Start a nested child span (e.g. database/retrieval call)
    const childSpan = await telemetryTracerService.startSpan({
      traceId: trace.id,
      parentId: parentSpan.id,
      name: 'GET_CUSTOMER_ORDERS',
      type: 'RETRIEVAL',
      input: 'customerId: 12345',
    });

    expect(childSpan.parentId).toBe(parentSpan.id);
    expect(childSpan.name).toBe('GET_CUSTOMER_ORDERS');
    expect(childSpan.type).toBe('RETRIEVAL');
    expect(childSpan.input).toBe('customerId: 12345');

    // Wait a brief moment to simulate processing and assert latency > 0
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 4. End the child span
    const endedChildSpan = await telemetryTracerService.endSpan(childSpan.id, {
      output: { ordersCount: 3 },
      status: 'SUCCESS',
    });

    expect(endedChildSpan.status).toBe('SUCCESS');
    expect(JSON.parse(endedChildSpan.output)).toEqual({ ordersCount: 3 });
    expect(endedChildSpan.latencyMs).toBeGreaterThanOrEqual(50);

    // 5. End the parent span
    const endedParentSpan = await telemetryTracerService.endSpan(parentSpan.id, {
      output: 'Finished successfully',
      status: 'SUCCESS',
      metadata: { finished: true },
    });

    expect(endedParentSpan.status).toBe('SUCCESS');
    expect(endedParentSpan.output).toBe('Finished successfully');
    
    const parentMergedMetadata = JSON.parse(endedParentSpan.metadata);
    expect(parentMergedMetadata.step).toBe(1);
    expect(parentMergedMetadata.finished).toBe(true);

    // 6. Verify trace relation includes the spans in database
    const dbTrace = await prisma.telemetryTrace.findUnique({
      where: { id: trace.id },
      include: { spans: true },
    });

    expect(dbTrace.spans.length).toBe(2);
    const names = dbTrace.spans.map(s => s.name);
    expect(names).toContain('MAIN_ORCHESTRATOR');
    expect(names).toContain('GET_CUSTOMER_ORDERS');
  });

  test('should record spans with errors correctly', async () => {
    const trace = await telemetryTracerService.startTrace({ companyId });

    const span = await telemetryTracerService.startSpan({
      traceId: trace.id,
      name: 'FAILING_API_CALL',
      type: 'TOOL',
      input: 'api_key: invalid',
    });

    const endedSpan = await telemetryTracerService.endSpan(span.id, {
      status: 'ERROR',
      error: 'Unauthorized access',
    });

    expect(endedSpan.status).toBe('ERROR');
    expect(endedSpan.error).toBe('Unauthorized access');
  });
});
