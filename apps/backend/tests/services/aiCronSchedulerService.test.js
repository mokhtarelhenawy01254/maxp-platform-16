/**
 * @file aiCronSchedulerService.test.js
 * @description Unit & Integration Test Suite for Hermes-Grade AI Cron Scheduler Service.
 */

const aiCronSchedulerService = require('../../services/aiCronSchedulerService');

describe('AiCronSchedulerService - Production Test Suite', () => {
  const companyA = 'tenant_cron_alpha_1';
  const companyB = 'tenant_cron_beta_2';

  beforeEach(() => {
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

    test('defaults to GENERAL for ambiguous tasks', () => {
      expect(aiCronSchedulerService.resolveTargetRole('قدم تقرير عام')).toBe('GENERAL');
    });
  });

  describe('3. Multi-Tenant Lifecycle & Execution', () => {
    test('creates, lists, and isolates scheduled jobs between tenants', async () => {
      const jobA = await aiCronSchedulerService.createJob(companyA, {
        naturalInput: 'كل يوم جمعة الساعة 10 صباحاً راجع حملات فيسبوك',
      });

      expect(jobA).toBeDefined();
      expect(jobA.cronExpression).toBe('0 10 * * 5');
      expect(jobA.taskType).toBe('MEDIA_BUYER');
      expect(jobA.status).toBe('ACTIVE');

      const jobB = await aiCronSchedulerService.createJob(companyB, {
        naturalInput: 'كل ساعة تحقق من المخزون',
      });

      expect(jobB.taskType).toBe('INVENTORY');

      const listA = await aiCronSchedulerService.listJobs(companyA);
      expect(listA.length).toBe(1);
      expect(listA[0].id).toBe(jobA.id);

      const listB = await aiCronSchedulerService.listJobs(companyB);
      expect(listB.length).toBe(1);
      expect(listB[0].id).toBe(jobB.id);
    });

    test('deletes job cleanly', async () => {
      const job = await aiCronSchedulerService.createJob(companyA, {
        naturalInput: 'كل يوم تقرير سريع',
      });

      const listBefore = await aiCronSchedulerService.listJobs(companyA);
      expect(listBefore.length).toBe(1);

      await aiCronSchedulerService.deleteJob(companyA, job.id);
      const listAfter = await aiCronSchedulerService.listJobs(companyA);
      expect(listAfter.length).toBe(0);
    });
  });
});
