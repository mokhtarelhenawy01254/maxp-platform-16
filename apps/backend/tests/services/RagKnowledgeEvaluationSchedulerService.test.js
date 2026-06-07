jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/rag/RagKnowledgeMaintenanceService', () => ({
  runEvaluation: jest.fn(),
}));

jest.mock('../../legacy-ai-agent/aiAgent/providerLogService', () => ({
  recordProviderEvent: jest.fn(),
  listProviderLogs: jest.fn(),
}));

jest.mock('../../services/telegramAlertService', () => ({
  sendAlert: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const RagKnowledgeMaintenanceService = require('../../services/rag/RagKnowledgeMaintenanceService');
const providerLogService = require('../../legacy-ai-agent/aiAgent/providerLogService');
const telegramAlertService = require('../../services/telegramAlertService');
const schedulerService = require('../../services/rag/RagKnowledgeEvaluationSchedulerService');

const makePrisma = () => ({
  faq: {
    findMany: jest.fn(),
  },
  policy: {
    findMany: jest.fn(),
  },
});

const passingReport = {
  generatedAt: '2026-05-26T01:00:00.000Z',
  scenarioSource: 'auto',
  total: 3,
  passed: 3,
  failed: 0,
  passRate: 1,
  results: [
    { id: 'faq', name: 'FAQ retrieval', passed: true },
    { id: 'policy', name: 'Policy retrieval', passed: true },
    { id: 'guardrail', name: 'Prompt-injection guardrail', passed: true },
  ],
};

describe('RagKnowledgeEvaluationSchedulerService', () => {
  let prisma;

  beforeEach(() => {
    prisma = makePrisma();
    getSharedPrismaClient.mockReturnValue(prisma);
    schedulerService.stop();
    RagKnowledgeMaintenanceService.runEvaluation.mockReset();
    providerLogService.recordProviderEvent.mockReset();
    providerLogService.listProviderLogs.mockReset();
    telegramAlertService.sendAlert.mockReset();
    providerLogService.listProviderLogs.mockResolvedValue([]);
    providerLogService.recordProviderEvent.mockResolvedValue({ id: 'log-1' });
    RagKnowledgeMaintenanceService.runEvaluation.mockResolvedValue(passingReport);
  });

  test('persists a successful company evaluation report', async () => {
    const result = await schedulerService.runForCompany('company-1', {
      trigger: 'manual',
    });

    expect(result).toMatchObject({
      companyId: 'company-1',
      status: 'success',
      report: passingReport,
    });
    expect(providerLogService.recordProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'SYSTEM',
      companyId: 'company-1',
      scope: 'rag_knowledge_eval',
      action: 'scheduled_evaluation',
      status: 'success',
      model: 'agentic-rag-eval-v1',
      metadata: expect.objectContaining({
        trigger: 'manual',
        report: passingReport,
      }),
    }));
    expect(telegramAlertService.sendAlert).not.toHaveBeenCalled();
  });

  test('alerts when any persisted evaluation scenario fails', async () => {
    const failingReport = {
      ...passingReport,
      passed: 2,
      failed: 1,
      passRate: 2 / 3,
      results: [
        { id: 'faq', name: 'FAQ retrieval', passed: true },
        { id: 'policy', name: 'Policy retrieval', passed: false },
      ],
    };
    RagKnowledgeMaintenanceService.runEvaluation.mockResolvedValue(failingReport);

    const result = await schedulerService.runForCompany('company-1', {
      trigger: 'schedule',
      alertOnFailure: true,
    });

    expect(result.status).toBe('failed');
    expect(providerLogService.recordProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      metadata: expect.objectContaining({
        trigger: 'schedule',
        report: failingReport,
      }),
    }));
    expect(telegramAlertService.sendAlert).toHaveBeenCalledWith(expect.stringContaining('2/3 passed'));
  });

  test('runs once across unique companies with active FAQ or policies', async () => {
    prisma.faq.findMany.mockResolvedValue([
      { companyId: 'company-1' },
      { companyId: 'company-2' },
    ]);
    prisma.policy.findMany.mockResolvedValue([
      { companyId: 'company-2' },
      { companyId: 'company-3' },
    ]);

    const result = await schedulerService.runOnce({
      trigger: 'manual',
      limit: 10,
    });

    expect(result).toMatchObject({
      trigger: 'manual',
      totalCompanies: 3,
      evaluatedCompanies: 3,
      failedCompanies: 0,
    });
    expect(RagKnowledgeMaintenanceService.runEvaluation).toHaveBeenCalledTimes(3);
    expect(RagKnowledgeMaintenanceService.runEvaluation).toHaveBeenCalledWith('company-1');
    expect(RagKnowledgeMaintenanceService.runEvaluation).toHaveBeenCalledWith('company-2');
    expect(RagKnowledgeMaintenanceService.runEvaluation).toHaveBeenCalledWith('company-3');
  });
});
