/**
 * @module RagKnowledgeEvaluationSchedulerService
 * @description Runs persisted, tenant-scoped Agentic RAG knowledge evaluations.
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('../sharedDatabase');
const { recordProviderEvent, listProviderLogs } = require('../../legacy-ai-agent/aiAgent/providerLogService');
const telegramAlertService = require('../telegramAlertService');
const RagKnowledgeMaintenanceService = require('./RagKnowledgeMaintenanceService');

const RAG_EVAL_SCOPE = 'rag_knowledge_eval';
const RAG_EVAL_ACTION = 'scheduled_evaluation';
const DEFAULT_CRON = '15 3 * * *';
const DEFAULT_TIMEZONE = 'Africa/Cairo';
const DEFAULT_COMPANY_LIMIT = 50;
const RECENT_SCHEDULE_WINDOW_MS = 20 * 60 * 60 * 1000;

function toSafeLimit(value, fallback = DEFAULT_COMPANY_LIMIT) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.floor(parsed), 250));
}

function serializeError(error) {
  return {
    message: error?.message || 'UNKNOWN_ERROR',
    code: error?.code || null,
  };
}

function summarizeReport(report = {}) {
  return {
    generatedAt: report.generatedAt || new Date().toISOString(),
    scenarioSource: report.scenarioSource || 'auto',
    total: Number(report.total) || 0,
    passed: Number(report.passed) || 0,
    failed: Number(report.failed) || 0,
    passRate: Number.isFinite(Number(report.passRate)) ? Number(report.passRate) : 0,
    results: Array.isArray(report.results) ? report.results : [],
  };
}

function buildLatestEvaluationFromLog(log) {
  if (!log) return null;
  const metadata = log.metadata || {};
  const report = summarizeReport(metadata.report || {});

  return {
    id: log.id,
    status: log.status,
    trigger: metadata.trigger || null,
    generatedAt: report.generatedAt,
    createdAt: log.createdAt,
    latencyMs: log.latencyMs ?? null,
    scenarioSource: report.scenarioSource,
    total: report.total,
    passed: report.passed,
    failed: report.failed,
    passRate: report.passRate,
  };
}

class RagKnowledgeEvaluationSchedulerService {
  constructor() {
    this.task = null;
    this.isRunning = false;
  }

  start(options = {}) {
    if (this.task) return this.task;
    if (process.env.RAG_KNOWLEDGE_EVAL_SCHEDULER_DISABLED === 'true') {
      console.log('[RAG-EVAL] Scheduler disabled by RAG_KNOWLEDGE_EVAL_SCHEDULER_DISABLED');
      return null;
    }

    const expression = options.cronExpression || process.env.RAG_KNOWLEDGE_EVAL_CRON || DEFAULT_CRON;
    const timezone = options.timezone || process.env.RAG_KNOWLEDGE_EVAL_TIMEZONE || DEFAULT_TIMEZONE;
    const limit = toSafeLimit(options.limit || process.env.RAG_KNOWLEDGE_EVAL_COMPANY_LIMIT);

    this.task = cron.schedule(expression, async () => {
      await this.runOnce({
        trigger: 'schedule',
        limit,
        alertOnFailure: true,
      });
    }, { timezone });

    console.log(`[RAG-EVAL] Scheduler started (${expression}, ${timezone})`);
    return this.task;
  }

  stop() {
    if (this.task?.stop) this.task.stop();
    this.task = null;
    this.isRunning = false;
  }

  async runOnce(options = {}) {
    if (this.isRunning) {
      return {
        skipped: true,
        reason: 'already_running',
        generatedAt: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const trigger = options.trigger || 'manual';
    const startedAt = Date.now();

    try {
      const companyIds = options.companyId
        ? [String(options.companyId)]
        : await this._listCompanyIds({ limit: options.limit });
      const results = [];

      for (const companyId of companyIds) {
        if (trigger === 'schedule' && await this._hasRecentScheduledRun(companyId)) {
          results.push({ companyId, skipped: true, reason: 'recent_scheduled_run' });
          continue;
        }

        results.push(await this.runForCompany(companyId, {
          trigger,
          alertOnFailure: options.alertOnFailure !== false,
        }));
      }

      const failedCompanies = results.filter(item => item.report?.failed > 0 || item.error).length;
      return {
        generatedAt: new Date().toISOString(),
        trigger,
        durationMs: Date.now() - startedAt,
        totalCompanies: companyIds.length,
        evaluatedCompanies: results.filter(item => !item.skipped).length,
        failedCompanies,
        results,
      };
    } finally {
      this.isRunning = false;
    }
  }

  async runForCompany(companyId, options = {}) {
    const trigger = options.trigger || 'manual';
    const startedAt = Date.now();

    try {
      const report = summarizeReport(await RagKnowledgeMaintenanceService.runEvaluation(companyId));
      const status = report.failed > 0 ? 'failed' : 'success';
      const log = await recordProviderEvent({
        provider: 'SYSTEM',
        companyId,
        scope: RAG_EVAL_SCOPE,
        action: RAG_EVAL_ACTION,
        status,
        latencyMs: Date.now() - startedAt,
        model: 'agentic-rag-eval-v1',
        message: `Agentic RAG eval ${report.passed}/${report.total}`,
        metadata: {
          trigger,
          report,
        },
      });

      if (status === 'failed' && options.alertOnFailure !== false) {
        await this._sendFailureAlert(companyId, report);
      }

      return {
        companyId,
        status,
        report,
        log,
      };
    } catch (error) {
      const serializedError = serializeError(error);
      const log = await recordProviderEvent({
        provider: 'SYSTEM',
        companyId,
        scope: RAG_EVAL_SCOPE,
        action: RAG_EVAL_ACTION,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        model: 'agentic-rag-eval-v1',
        message: `Agentic RAG eval error: ${serializedError.message}`,
        metadata: {
          trigger,
          error: serializedError,
        },
      });

      if (options.alertOnFailure !== false) {
        await telegramAlertService.sendAlert(
          `RAG knowledge evaluation failed for company ${companyId}: ${serializedError.message}`
        );
      }

      return {
        companyId,
        status: 'failed',
        error: serializedError,
        log,
      };
    }
  }

  async getLatestReport(companyId) {
    const logs = await listProviderLogs({
      companyId,
      scope: RAG_EVAL_SCOPE,
      action: RAG_EVAL_ACTION,
      limit: 1,
    });
    return buildLatestEvaluationFromLog(logs[0]);
  }

  async _listCompanyIds(options = {}) {
    const prisma = getSharedPrismaClient();
    const take = toSafeLimit(options.limit);
    const [faqCompanies, policyCompanies] = await Promise.all([
      prisma.faq.findMany({
        where: { isActive: true },
        distinct: ['companyId'],
        select: { companyId: true },
        take,
      }),
      prisma.policy.findMany({
        where: { isActive: true },
        distinct: ['companyId'],
        select: { companyId: true },
        take,
      }),
    ]);

    return [...new Set([...faqCompanies, ...policyCompanies].map(row => row.companyId).filter(Boolean))]
      .slice(0, take);
  }

  async _hasRecentScheduledRun(companyId) {
    const latest = await listProviderLogs({
      companyId,
      scope: RAG_EVAL_SCOPE,
      action: RAG_EVAL_ACTION,
      limit: 1,
    });
    const createdAt = latest[0]?.createdAt ? new Date(latest[0].createdAt).getTime() : 0;
    return Number.isFinite(createdAt) && Date.now() - createdAt < RECENT_SCHEDULE_WINDOW_MS;
  }

  async _sendFailureAlert(companyId, report) {
    const failedNames = report.results
      .filter(item => !item.passed)
      .slice(0, 5)
      .map(item => item.name || item.id)
      .join(', ');

    await telegramAlertService.sendAlert(
      `RAG knowledge evaluation needs review for company ${companyId}: ` +
      `${report.passed}/${report.total} passed. Failed: ${failedNames || 'unknown'}`
    );
  }
}

const service = new RagKnowledgeEvaluationSchedulerService();

module.exports = service;
module.exports._private = {
  RAG_EVAL_SCOPE,
  RAG_EVAL_ACTION,
  buildLatestEvaluationFromLog,
  summarizeReport,
  toSafeLimit,
};
