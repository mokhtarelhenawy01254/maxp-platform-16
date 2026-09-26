/**
 * @module aiCronSchedulerService
 * @description Hermes-Grade Natural Language Cron Scheduler for MaxP Platform.
 * Persists scheduled jobs to the database, parses natural Arabic scheduling commands,
 * and executes autonomous recurring agent workflows across specialized roles (Media Buyer, Inventory, Sales).
 */

const cron = require('node-cron');
const { getSharedPrismaClient } = require('./sharedDatabase');
const aiServiceAdminClient = require('./aiServiceAdminClient');

class AiCronSchedulerService {
  constructor() {
    this.prisma = null;
    this._memoryJobs = new Map(); // fallback memory store
    this._activeTasks = new Map(); // running cron jobs: jobId -> scheduledTask
    this._isInitialized = false;
  }

  _getPrisma() {
    if (!this.prisma) {
      try {
        this.prisma = getSharedPrismaClient();
      } catch (_) {
        this.prisma = null;
      }
    }
    return this.prisma;
  }

  /**
   * Parse natural language Arabic instructions into valid 5-field cron expressions.
   */
  parseNaturalCron(text) {
    if (!text || typeof text !== 'string') return '0 8 * * *';
    const trimmed = text.trim();

    // If it's already a valid 5-field cron expression, return it
    if (cron.validate(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();

    // Extract specific hour if provided (e.g. "الساعة 10", "الساعة 8")
    let hour = 8;
    const hourMatch = lower.match(/الساعة\s+(\d{1,2})/);
    if (hourMatch) {
      const parsedHour = parseInt(hourMatch[1], 10);
      if (parsedHour >= 0 && parsedHour <= 23) {
        hour = parsedHour;
        if ((lower.includes('مساء') || lower.includes('بليل')) && hour < 12) {
          hour += 12;
        } else if (lower.includes('صباح') && hour === 12) {
          hour = 0;
        }
      }
    } else if (lower.includes('مساء') || lower.includes('بليل')) {
      hour = 20;
    } else if (lower.includes('ظهر')) {
      hour = 12;
    }

    // Every N minutes
    if (lower.includes('كل') && (lower.includes('دقيقة') || lower.includes('دقائق'))) {
      const minMatch = lower.match(/كل\s+(\d+)\s+د/);
      const mins = minMatch ? parseInt(minMatch[1], 10) : 30;
      return `*/${Math.min(Math.max(mins, 1), 59)} * * * *`;
    }

    // Every N hours
    const hoursIntervalMatch = lower.match(/كل\s+(\d+)\s+ساع/);
    if (hoursIntervalMatch) {
      const h = parseInt(hoursIntervalMatch[1], 10);
      return `0 */${Math.min(Math.max(h, 1), 23)} * * *`;
    }

    // Every single hour ("كل ساعة" / "كل ساعه")
    if (/(?:^|\s)كل\s+ساع[ةه](?:\s|$)/.test(lower)) {
      return '0 * * * *';
    }

    // Days of week
    const hasFriday = lower.includes('جمعة') || lower.includes('الجمعة');
    const hasSaturday = lower.includes('سبت') || lower.includes('السبت');
    const hasSunday = lower.includes('أحد') || lower.includes('الاحد');
    const hasMonday = lower.includes('اثنين') || lower.includes('الاثنين');
    const hasTuesday = lower.includes('ثلاثاء') || lower.includes('الثلاثاء');
    const hasWednesday = lower.includes('اربعاء') || lower.includes('الأربعاء');
    const hasThursday = lower.includes('خميس') || lower.includes('الخميس');

    const days = [];
    if (hasSunday) days.push(0);
    if (hasMonday) days.push(1);
    if (hasTuesday) days.push(2);
    if (hasWednesday) days.push(3);
    if (hasThursday) days.push(4);
    if (hasFriday) days.push(5);
    if (hasSaturday) days.push(6);

    if (days.length > 0) {
      return `0 ${hour} * * ${days.join(',')}`;
    }

    // Monthly
    if (lower.includes('شهر') || lower.includes('شهرياً') || lower.includes('شهري')) {
      return `0 ${hour} 1 * *`;
    }

    // Daily default
    return `0 ${hour} * * *`;
  }

  /**
   * Determine the most appropriate agent role based on task description.
   */
  resolveTargetRole(description) {
    const desc = (description || '').toLowerCase();
    if (
      desc.includes('إعلان') || desc.includes('اعلان') || desc.includes('إعلانات') || desc.includes('اعلانات') ||
      desc.includes('حملة') || desc.includes('حملات') || desc.includes('فيسبوك') || desc.includes('ميتا') ||
      desc.includes('meta') || desc.includes('roas') || desc.includes('cpa') || desc.includes('ميزانية') ||
      desc.includes('ميديا باير') || desc.includes('استهداف')
    ) {
      return 'MEDIA_BUYER';
    }
    if (desc.includes('مخزون') || desc.includes('قطع') || desc.includes('منتجات') || desc.includes('جرد') || desc.includes('نقص')) {
      return 'INVENTORY';
    }
    if (desc.includes('مبيعات') || desc.includes('طلب') || desc.includes('سلات') || desc.includes('عملاء') || desc.includes('شحن')) {
      return 'SALES';
    }
    return 'GENERAL';
  }

  /**
   * List all scheduled jobs for a specific company (tenant-scoped).
   */
  async listJobs(companyId) {
    if (!companyId) throw new Error('companyId is required');

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const records = await prisma.companySkill.findMany({
          where: {
            companyId,
            name: { startsWith: '[CRON] ' },
          },
          orderBy: { createdAt: 'desc' },
        });

        return records.map(r => {
          let meta = {};
          try { meta = JSON.parse(r.metadata || '{}'); } catch (_) {}
          return {
            id: r.id,
            companyId: r.companyId,
            description: r.description || r.name.replace('[CRON] ', ''),
            cronExpression: meta.cronExpression || '0 8 * * *',
            taskType: meta.taskType || this.resolveTargetRole(r.description),
            status: r.enabled ? 'ACTIVE' : 'PAUSED',
            enabled: r.enabled,
            lastRun: meta.lastRun || null,
            lastStatus: meta.lastStatus || null,
            nextRun: meta.nextRun || '—',
            runCount: Number(meta.runCount || 0),
            createdAt: r.createdAt,
          };
        });
      } catch (err) {
        console.warn('[AiCronScheduler] DB list failed, falling back to memory store:', err.message);
      }
    }

    const companyJobs = this._memoryJobs.get(companyId) || [];
    return companyJobs;
  }

  /**
   * Create and persist a new natural language cron job.
   */
  async createJob(companyId, { description, naturalInput, taskType = null, role = null, payload = {} } = {}) {
    if (!companyId) throw new Error('companyId is required');
    const desc = description || naturalInput || '';
    if (!desc.trim()) throw new Error('description or naturalInput is required');

    const cronExpr = this.parseNaturalCron(desc);
    const resolvedType = taskType || role || this.resolveTargetRole(desc);
    const id = `cron_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const jobData = {
      id,
      companyId,
      description: desc,
      cronExpression: cronExpr,
      taskType: resolvedType,
      status: 'ACTIVE',
      enabled: true,
      lastRun: null,
      lastStatus: null,
      nextRun: '—',
      runCount: 0,
      payload,
      createdAt: new Date().toISOString(),
    };

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const meta = {
          cronExpression: cronExpr,
          taskType: resolvedType,
          payload,
          runCount: 0,
          lastRun: null,
          lastStatus: null,
          isCronJob: true,
        };

        const created = await prisma.companySkill.create({
          data: {
            id,
            companyId,
            name: `[CRON] ${desc.slice(0, 50)}`,
            description: desc,
            triggerPhrases: cronExpr,
            instructions: desc,
            priority: 5,
            enabled: true,
            metadata: JSON.stringify(meta),
          },
        });

        jobData.id = created.id;
      } catch (err) {
        console.warn('[AiCronScheduler] DB create failed, storing in memory:', err.message);
      }
    }

    // Store in memory
    const existing = this._memoryJobs.get(companyId) || [];
    existing.unshift(jobData);
    this._memoryJobs.set(companyId, existing);

    // Register active cron task
    this._registerCronTask(jobData);

    return jobData;
  }

  /**
   * Delete a scheduled cron job.
   */
  async deleteJob(companyId, jobId) {
    if (!companyId || !jobId) throw new Error('companyId and jobId are required');

    // Cancel active node-cron runner
    const task = this._activeTasks.get(jobId);
    if (task) {
      task.stop();
      this._activeTasks.delete(jobId);
    }

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        await prisma.companySkill.deleteMany({
          where: { id: jobId, companyId },
        });
      } catch (err) {
        console.warn('[AiCronScheduler] DB delete failed:', err.message);
      }
    }

    const existing = this._memoryJobs.get(companyId) || [];
    const filtered = existing.filter(j => j.id !== jobId);
    this._memoryJobs.set(companyId, filtered);

    return { success: true, jobId };
  }

  /**
   * Execute a scheduled job immediately (on-demand or via cron trigger).
   */
  async executeJob(companyId, jobId) {
    if (!companyId || !jobId) throw new Error('companyId and jobId are required');

    const jobs = await this.listJobs(companyId);
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      throw new Error('JOB_NOT_FOUND');
    }

    const startTime = new Date().toISOString();
    let status = 'FAILED';
    let reply = '';

    try {
      const runTimestamp = Date.now();
      const response = await aiServiceAdminClient.chatWithAgent({
        companyId,
        agentId: '',
        message: job.description,
        threadId: `cron_${companyId}_${job.id}_${runTimestamp}`,
      });

      status = response && response.success !== false ? 'SUCCESS' : 'FAILED';
      reply = response?.reply || '';
    } catch (err) {
      console.error(`[AiCronScheduler] Job ${jobId} failed to execute:`, err.message);
      status = 'FAILED';
      reply = err.message;
    }

    // Update job metadata
    const runCount = (job.runCount || 0) + 1;
    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const record = await prisma.companySkill.findFirst({ where: { id: jobId, companyId } });
        if (record) {
          let meta = {};
          try { meta = JSON.parse(record.metadata || '{}'); } catch (_) {}
          meta.lastRun = startTime;
          meta.lastStatus = status;
          meta.runCount = runCount;

          await prisma.companySkill.update({
            where: { id: record.id },
            data: { metadata: JSON.stringify(meta), updatedAt: new Date() },
          });
        }
      } catch (err) {
        console.warn('[AiCronScheduler] DB update after run failed:', err.message);
      }
    }

    // Update memory
    job.lastRun = startTime;
    job.lastStatus = status;
    job.runCount = runCount;

    return {
      success: true,
      jobId,
      execution: {
        status,
        lastRun: startTime,
        runCount,
        reply,
      },
    };
  }

  /**
   * Register a job with node-cron in the background.
   */
  _registerCronTask(job) {
    if (!job.cronExpression || !cron.validate(job.cronExpression)) {
      return;
    }

    // Stop existing task if any
    const existingTask = this._activeTasks.get(job.id);
    if (existingTask) {
      existingTask.stop();
    }

    try {
      const task = cron.schedule(job.cronExpression, async () => {
        console.log(`[AiCronScheduler] Triggering scheduled job '${job.id}' for company '${job.companyId}'`);
        await this.executeJob(job.companyId, job.id);
      });
      this._activeTasks.set(job.id, task);
    } catch (err) {
      console.warn(`[AiCronScheduler] Failed to schedule cron task ${job.id}:`, err.message);
    }
  }

  /**
   * Initialize and rehydrate all saved cron jobs on server boot.
   */
  async initialize() {
    if (this._isInitialized) return;
    this._isInitialized = true;

    const prisma = this._getPrisma();
    if (prisma && prisma.companySkill) {
      try {
        const cronRecords = await prisma.companySkill.findMany({
          where: {
            name: { startsWith: '[CRON] ' },
            enabled: true,
          },
        });

        for (const record of cronRecords) {
          let meta = {};
          try { meta = JSON.parse(record.metadata || '{}'); } catch (_) {}
          const job = {
            id: record.id,
            companyId: record.companyId,
            description: record.description || record.instructions,
            cronExpression: meta.cronExpression || record.triggerPhrases,
            taskType: meta.taskType || 'GENERAL',
            enabled: record.enabled,
            lastRun: meta.lastRun || null,
            lastStatus: meta.lastStatus || null,
            runCount: Number(meta.runCount || 0),
          };
          this._registerCronTask(job);
        }
        console.log(`[AiCronScheduler] Rehydrated ${cronRecords.length} active cron tasks from DB.`);
      } catch (err) {
        console.warn('[AiCronScheduler] Rehydration from DB failed:', err.message);
      }
    }
  }
}

module.exports = new AiCronSchedulerService();
