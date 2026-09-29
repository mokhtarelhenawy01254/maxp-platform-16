/**
 * @file aiCronSchedulerService.test.js
 * @description Unit & Integration Test Suite for Hermes-Grade AI Cron Scheduler Service.
 */

const aiCronSchedulerService = require('../../services/aiCronSchedulerService');

describe('AiCronSchedulerService - Production Test Suite', () => {
  let companyA;
  let companyB;

  beforeEach(() => {
    companyA = `tenant_cron_alpha_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    companyB = `tenant_cron_beta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    aiCronSchedulerService._memoryJobs.clear();
    for (const [, task] of aiCronSchedulerService._activeTasks) {
      task.stop();
    }
    aiCronSchedulerService._activeTasks.clear();
  });

  describe('1. Natural Language Cron Expression Parsing (Arabic)', () => {
    test('parses hourly command', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('كل ساعة راجع حالة الحملات');
      expect(expr).toBe('0 * * * *');
    });

    test('parses daily morning command with explicit hour', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('كل يوم الساعة 8 صباحاً ابعت تقرير المبيعات');
      expect(expr).toBe('0 8 * * *');
    });

    test('parses daily evening command', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('كل يوم مساء راجع المخزون');
      expect(expr).toBe('0 20 * * *');
    });

    test('parses Friday morning command', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('كل يوم جمعة الساعة 10 صباحاً قدم ملخص أسبوعي');
      expect(expr).toBe('0 10 * * 5');
    });

    test('parses monthly command', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('أول كل شهر طلع الحسابات');
      expect(expr).toBe('0 8 1 * *');
    });

    test('preserves valid raw cron expression if passed directly', () => {
      const expr = aiCronSchedulerService.parseNaturalCron('0 9 * * 1-5');
      expect(expr).toBe('0 9 * * 1-5');
    });
  });

  describe('2. Intelligent Role Routing', () => {
    test('routes ads/campaign tasks to MEDIA_BUYER', () => {
      expect(aiCronSchedulerService.resolveTargetRole('راجع حملات فيسبوك الإعلانية ووقف الإعلان الخاسر')).toBe('MEDIA_BUYER');
      expect(aiCronSchedulerService.resolveTargetRole('افحص ROAS الحملات وعدل الميزانية')).toBe('MEDIA_BUYER');
    });

    test('routes inventory/stock tasks to INVENTORY', () => {
      expect(aiCronSchedulerService.resolveTargetRole('كل يوم جرد المخزون والمنتجات اللي قربت تخلص')).toBe('INVENTORY');
      expect(aiCronSchedulerService.resolveTargetRole('تنبيه نقص القطع والمقاسات')).toBe('INVENTORY');
    });

    test('routes sales/orders tasks to SALES', () => {
      expect(aiCronSchedulerService.resolveTargetRole('تابع طلبات السلات المتروكة وأرسل عروض للعملاء')).toBe('SALES');
    });

    test('routes aov/basket tasks to AOV_SPECIALIST', () => {
      expect(aiCronSchedulerService.resolveTargetRole('راجع متوسط قيمة الطلب وزود سلة المشتريات')).toBe('AOV_SPECIALIST');
      expect(aiCronSchedulerService.resolveTargetRole('عايز تقرير AOV يومي')).toBe('AOV_SPECIALIST');
      expect(aiCronSchedulerService.resolveTargetRole('اقتراحات upsell لزيادة متوسط السلة')).toBe('AOV_SPECIALIST');
    });

    test('defaults to GENERAL for ambiguous tasks', () => {
      expect(aiCronSchedulerService.resolveTargetRole('قدم تقرير عام')).toBe('GENERAL');
    });
  });

  describe('3. Multi-Tenant Lifecycle & Execution', () => {
    test('automatically ensures default daily 9:00 AM AOV report job exists and isolates between tenants', async () => {
      const listA = await aiCronSchedulerService.listJobs(companyA);
      const aovJobA = listA.find(j => j.taskType === 'AOV_SPECIALIST');
      expect(aovJobA).toBeDefined();
      expect(aovJobA.cronExpression).toBe('0 9 * * *');
      expect(aovJobA.status).toBe('ACTIVE');
      expect(aovJobA.description).toContain('متوسط قيمة الطلب (AOV)');

      const listB = await aiCronSchedulerService.listJobs(companyB);
      const aovJobB = listB.find(j => j.taskType === 'AOV_SPECIALIST');
      expect(aovJobB).toBeDefined();
      expect(aovJobB.companyId).toBe(companyB);
      expect(aovJobA.id).not.toBe(aovJobB.id);
    });

    test('creates custom scheduled jobs alongside default AOV job', async () => {
      const jobA = await aiCronSchedulerService.createJob(companyA, {
        naturalInput: 'كل يوم جمعة الساعة 10 صباحاً راجع حملات فيسبوك',
      });

      expect(jobA).toBeDefined();
      expect(jobA.cronExpression).toBe('0 10 * * 5');
      expect(jobA.taskType).toBe('MEDIA_BUYER');
      expect(jobA.status).toBe('ACTIVE');

      const listA = await aiCronSchedulerService.listJobs(companyA);
      expect(listA.some(j => j.id === jobA.id)).toBe(true);
      expect(listA.some(j => j.taskType === 'AOV_SPECIALIST')).toBe(true);
    });

    test('deletes custom job cleanly while preserving default jobs', async () => {
      const job = await aiCronSchedulerService.createJob(companyA, {
        naturalInput: 'كل يوم تقرير سريع',
      });

      const listBefore = await aiCronSchedulerService.listJobs(companyA);
      expect(listBefore.some(j => j.id === job.id)).toBe(true);

      await aiCronSchedulerService.deleteJob(companyA, job.id);
      const listAfter = await aiCronSchedulerService.listJobs(companyA);
      expect(listAfter.some(j => j.id === job.id)).toBe(false);
    });

    test('executes AOV daily report job and generates real formatted report', async () => {
      const list = await aiCronSchedulerService.listJobs(companyA);
      const aovJob = list.find(j => j.taskType === 'AOV_SPECIALIST');
      expect(aovJob).toBeDefined();

      const result = await aiCronSchedulerService.executeJob(companyA, aovJob.id);
      expect(result.success).toBe(true);
      expect(result.execution.status).toBe('SUCCESS');
      expect(result.execution.reply).toContain('متوسط قيمة الطلب (AOV)');
      expect(result.execution.reply).toContain('مؤشرات السلة والإيرادات');
      expect(result.execution.runCount).toBeGreaterThanOrEqual(1);
    });
  });
});
