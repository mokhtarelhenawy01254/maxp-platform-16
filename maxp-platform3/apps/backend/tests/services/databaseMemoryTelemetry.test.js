const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Agentic Memory & Telemetry Schema CRUD Tests', () => {
  let prisma;
  const companyId = 'test-company-memory-telemetry';

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    // Ensure cleanup of any previous leftovers
    await prisma.agenticMemoryFact.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.telemetrySpan.deleteMany({ where: { trace: { companyId } } }).catch(() => {});
    await prisma.telemetryTrace.deleteMany({ where: { companyId } }).catch(() => {});
  });

  afterAll(async () => {
    // Cleanup created data
    await prisma.agenticMemoryFact.deleteMany({ where: { companyId } }).catch(() => {});
    await prisma.telemetrySpan.deleteMany({ where: { trace: { companyId } } }).catch(() => {});
    await prisma.telemetryTrace.deleteMany({ where: { companyId } }).catch(() => {});
  });

  test('should create, read, and delete an AgenticMemoryFact', async () => {
    const content = 'العميل يفضل التواصل عبر الواتساب في الفترة المسائية';
    
    // 1. Create
    const fact = await prisma.agenticMemoryFact.create({
      data: {
        companyId,
        customerId: 'customer-123',
        type: 'PREFERENCE',
        content,
        confidence: 0.95,
        importance: 4,
        validFrom: new Date(),
        metadata: JSON.stringify({ source: 'messenger_chat' })
      }
    });

    expect(fact.id).toBeDefined();
    expect(fact.companyId).toBe(companyId);
    expect(fact.content).toBe(content);
    expect(fact.type).toBe('PREFERENCE');

    // 2. Read
    const foundFact = await prisma.agenticMemoryFact.findFirst({
      where: { companyId, customerId: 'customer-123' }
    });
    expect(foundFact).toBeDefined();
    expect(foundFact.id).toBe(fact.id);
    expect(foundFact.confidence).toBe(0.95);

    // 3. Delete
    await prisma.agenticMemoryFact.delete({ where: { id: fact.id } });
    const deletedFact = await prisma.agenticMemoryFact.findFirst({
      where: { id: fact.id }
    });
    expect(deletedFact).toBeNull();
  });

  test('should create nested TelemetryTrace and TelemetrySpan records', async () => {
    // 1. Create Trace
    const trace = await prisma.telemetryTrace.create({
      data: {
        companyId,
        channel: 'WHATSAPP',
        provider: 'GEMINI',
        totalTokens: 1500,
        promptTokens: 1000,
        completionTokens: 500,
        totalCost: 0.0035,
        status: 'SUCCESS',
        metadata: JSON.stringify({ userIp: '127.0.0.1' })
      }
    });

    expect(trace.id).toBeDefined();
    expect(trace.companyId).toBe(companyId);
    expect(trace.channel).toBe('WHATSAPP');
    expect(Number(trace.totalCost)).toBe(0.0035);

    // 2. Create Span under Trace
    const span = await prisma.telemetrySpan.create({
      data: {
        traceId: trace.id,
        name: 'LLM_GENERATE',
        type: 'LLM',
        startTime: new Date(),
        endTime: new Date(),
        latencyMs: 1200,
        input: 'مرحبا بك في متجرنا',
        output: 'كيف يمكنني مساعدتك اليوم؟',
        status: 'SUCCESS',
        metadata: JSON.stringify({ model: 'gemini-2.5-flash' })
      }
    });

    expect(span.id).toBeDefined();
    expect(span.traceId).toBe(trace.id);
    expect(span.name).toBe('LLM_GENERATE');
    expect(span.latencyMs).toBe(1200);

    // 3. Read Trace with relation
    const foundTrace = await prisma.telemetryTrace.findUnique({
      where: { id: trace.id },
      include: { spans: true }
    });

    expect(foundTrace).toBeDefined();
    expect(foundTrace.spans.length).toBe(1);
    expect(foundTrace.spans[0].id).toBe(span.id);
    expect(foundTrace.spans[0].output).toBe('كيف يمكنني مساعدتك اليوم؟');
  });
});
