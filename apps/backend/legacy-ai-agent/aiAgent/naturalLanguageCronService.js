const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getAiServiceMode } = require('./aiServiceRouter');

const CRON_PATTERNS = {
  // English patterns
  'every minute': '* * * * *',
  'every hour': '0 * * * *',
  'every day': '0 9 * * *',
  'every morning': '0 8 * * *',
  'every evening': '0 18 * * *',
  'every night': '0 22 * * *',
  'every monday': '0 9 * * 1',
  'every tuesday': '0 9 * * 2',
  'every wednesday': '0 9 * * 3',
  'every thursday': '0 9 * * 4',
  'every friday': '0 9 * * 5',
  'every saturday': '0 9 * * 6',
  'every sunday': '0 9 * * 0',
  'every week': '0 9 * * 1',
  'every month': '0 9 1 * *',
  'twice a day': '0 9,18 * * *',
  // Arabic patterns
  'كل دقيقة': '* * * * *',
  'كل ساعة': '0 * * * *',
  'كل يوم': '0 9 * * *',
  'كل صباح': '0 8 * * *',
  'كل مساء': '0 18 * * *',
  'كل ليلة': '0 22 * * *',
  'كل اسبوع': '0 9 * * 1',
  'كل شهر': '0 9 1 * *',
  'كل سبت': '0 9 * * 6',
  'كل احد': '0 9 * * 0',
  'كل اتنين': '0 9 * * 1',
  'كل ثلاثاء': '0 9 * * 2',
  'كل اربعاء': '0 9 * * 3',
  'كل خميس': '0 9 * * 4',
  'كل جمعة': '0 9 * * 5',
  'مرتين في اليوم': '0 9,18 * * *',
};

let _jobIdCounter = 0;

class NaturalLanguageCronService {
  constructor() {
    /** @type {Map<string, Array>} companyId -> scheduled jobs */
    this._jobs = new Map();
    if (getAiServiceMode() !== 'primary') {
      this._initRecovery();
    }
  }

  /**
   * Recovers scheduled jobs asynchronously from database logs.
   */
  _initRecovery() {
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.findMany({
        where: { scope: 'agent_scheduled_job' }
      }).then(logs => {
        for (const log of logs) {
          try {
            const job = JSON.parse(log.metadata);
            job.status = log.status;
            if (!this._jobs.has(log.companyId)) this._jobs.set(log.companyId, []);
            
            // Avoid duplicates on load
            const existing = this._jobs.get(log.companyId);
            if (!existing.some(j => j.id === job.id)) {
              existing.push(job);
              // Sync local counter to prevent collision
              const numId = parseInt(job.id.replace('job_', ''), 10);
              if (!isNaN(numId) && numId > _jobIdCounter) {
                _jobIdCounter = numId;
              }
            }
          } catch (e) {
            console.warn('[NL-CRON-RECOVERY] Error parsing log metadata:', e.message);
          }
        }
      }).catch(() => {});
    } catch (_) {}
  }

  /**
   * Parses natural language text into a cron expression.
   * @param {string} text - Natural language schedule description
   * @returns {{ cron: string|null, confidence: number, parsed: string }}
   */
  parseToCron(text) {
    if (!text || typeof text !== 'string') return { cron: null, confidence: 0, parsed: '' };
    const normalized = text.toLowerCase().trim();

    // Direct pattern match
    for (const [pattern, cron] of Object.entries(CRON_PATTERNS)) {
      if (normalized.includes(pattern)) {
        return { cron, confidence: 1.0, parsed: pattern };
      }
    }

    // Time-based extraction: "at 3pm", "الساعة 3"
    const timeMatch = normalized.match(/(?:at|الساعة|عند)\s*(\d{1,2})\s*(?:pm|مساء|م)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      if (/pm|مساء|م/.test(normalized) && hour < 12) hour += 12;
      return { cron: `0 ${hour} * * *`, confidence: 0.8, parsed: `daily at ${hour}:00` };
    }

    // Interval extraction: "every 5 minutes", "كل 30 دقيقة"
    const intervalMatch = normalized.match(/(?:every|كل)\s*(\d+)\s*(?:minutes?|دقيقة|دقائق)/i);
    if (intervalMatch) {
      const mins = parseInt(intervalMatch[1], 10);
      if (mins > 0 && mins <= 59) {
        return { cron: `*/${mins} * * * *`, confidence: 0.9, parsed: `every ${mins} minutes` };
      }
    }

    const hourIntervalMatch = normalized.match(/(?:every|كل)\s*(\d+)\s*(?:hours?|ساعة|ساعات)/i);
    if (hourIntervalMatch) {
      const hours = parseInt(hourIntervalMatch[1], 10);
      if (hours > 0 && hours <= 23) {
        return { cron: `0 */${hours} * * *`, confidence: 0.9, parsed: `every ${hours} hours` };
      }
    }

    return { cron: null, confidence: 0, parsed: '' };
  }

  /**
   * Schedules a job from natural language description.
   */
  scheduleJob(companyId, { description, taskType, agentId, payload }) {
    const { cron, confidence, parsed } = this.parseToCron(description);
    if (!cron) return { success: false, error: 'UNPARSEABLE_SCHEDULE', description };

    const job = {
      id: `job_${++_jobIdCounter}`,
      companyId,
      cronExpression: cron,
      parsedDescription: parsed,
      confidence,
      taskType: taskType || 'GENERAL',
      agentId: agentId || null,
      payload: payload || {},
      status: 'ACTIVE',
      createdAt: new Date(),
      lastRun: null,
      nextRun: null,
    };

    if (!this._jobs.has(companyId)) this._jobs.set(companyId, []);
    this._jobs.get(companyId).push(job);

    // Persist durably to database (fire-and-forget)
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.create({
        data: {
          provider: 'NATURAL_LANGUAGE_CRON',
          companyId,
          scope: 'agent_scheduled_job',
          action: job.taskType,
          status: job.status,
          message: job.parsedDescription || '',
          metadata: JSON.stringify(job),
        },
      }).catch(() => {});
    } catch (_) {}

    return { success: true, job };
  }

  getJobs(companyId) { return this._jobs.get(companyId) || []; }

  cancelJob(companyId, jobId) {
    const jobs = this._jobs.get(companyId) || [];
    const job = jobs.find(j => j.id === jobId);
    if (!job) return false;
    job.status = 'CANCELLED';

    // Persist update durably to database (fire-and-forget)
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.updateMany({
        where: {
          companyId,
          scope: 'agent_scheduled_job',
          metadata: {
            contains: `"id":"${jobId}"`
          }
        },
        data: {
          status: 'CANCELLED'
        }
      }).catch(() => {});
    } catch (_) {}

    return true;
  }

  _reset() {
    this._jobs.clear();
    _jobIdCounter = 0;
    try {
      const prisma = getSharedPrismaClient();
      prisma.aiProviderLog.deleteMany({
        where: { scope: 'agent_scheduled_job' }
      }).catch(() => {});
    } catch (_) {}
  }
}

module.exports = new NaturalLanguageCronService();
