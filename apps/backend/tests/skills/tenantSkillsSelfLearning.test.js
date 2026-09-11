/**
 * @file tenantSkillsSelfLearning.test.js
 * @description Hard Testing Suite for Hermes Multi-Tenant Self-Learning Engine.
 * Verifies multi-tenant isolation, closed-loop ad & sales distillation, rule deduplication,
 * and merchant control plane toggles.
 */

const tenantSkillsService = require('../../services/tenantSkillsService');

describe('Hermes Multi-Tenant Self-Learning Engine - Test Suite', () => {
  const merchantEgypt = 'comp_fashion_cairo_2026';
  const merchantSaudi = 'comp_electronics_riyadh_2026';

  beforeEach(() => {
    // Clear in-memory store before each test
    tenantSkillsService._memoryStore.clear();
  });

  describe('1. Multi-Tenant Isolation & Privacy', () => {
    test('strictly isolates learned playbooks between merchants without any cross-tenant data leakage', async () => {
      // Merchant Egypt: Distill a fashion ad rule
      await tenantSkillsService.distillFromAdMetrics(merchantEgypt, {
        ad_name: 'Fashion Dress Reel #1',
        angle: 'summer_discount',
        product_name: 'فستان صيفي',
        spend: 400,
        revenue: 1600,
        purchases: 8,
        target_cpa: 60,
        currency: 'EGP',
      });

      // Merchant Saudi: Distill an electronics ad rule
      await tenantSkillsService.distillFromAdMetrics(merchantSaudi, {
        ad_name: 'Smart Watch Ad #4',
        angle: 'free_shipping_saudi',
        product_name: 'ساعة ذكية',
        spend: 500,
        revenue: 2000,
        purchases: 10,
        target_cpa: 80,
        currency: 'SAR',
      });

      // Query Merchant Egypt
      const egRules = await tenantSkillsService.listLearnedRules(merchantEgypt);
      expect(egRules.length).toBe(1);
      expect(egRules[0].instructions).toContain('فستان صيفي');
      expect(egRules[0].instructions).not.toContain('ساعة ذكية');
      expect(egRules[0].instructions).toContain('EGP');

      // Query Merchant Saudi
      const saRules = await tenantSkillsService.listLearnedRules(merchantSaudi);
      expect(saRules.length).toBe(1);
      expect(saRules[0].instructions).toContain('ساعة ذكية');
      expect(saRules[0].instructions).not.toContain('فستان صيفي');
      expect(saRules[0].instructions).toContain('SAR');
    });

    test('rejects operations without companyId', async () => {
      await expect(tenantSkillsService.listLearnedRules('')).rejects.toThrow('companyId is required');
      await expect(tenantSkillsService.distillFromAdMetrics('', {})).rejects.toThrow('companyId is required');
    });
  });

  describe('2. Closed-Loop Performance Distillation (Media Buyer)', () => {
    test('distills WINNING_SCALE rule when ROAS >= 2.2 and CPA is under target', async () => {
      const result = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, {
        ad_name: 'Shoes Winner Reel',
        angle: 'social_proof_reviews',
        product_name: 'حذاء كاجوال خفيف',
        spend: 200,
        revenue: 800,
        purchases: 4,
        target_cpa: 70,
        currency: 'EGP',
      });

      expect(result.success).toBe(true);
      expect(result.ruleAdded).toContain('رابح / SCALE');
      expect(result.ruleAdded).toContain('ROAS = 4x');
      expect(result.ruleAdded).toContain('خصص 70%+ من الميزانية');

      const rules = await tenantSkillsService.listLearnedRules(merchantEgypt);
      expect(rules[0].instructions).toContain('حذاء كاجوال خفيف');
      expect(rules[0].enabled).toBe(true);
    });

    test('distills CREATIVE_FATIGUE rule when frequency >= 2.3 and CPA spikes', async () => {
      const result = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, {
        ad_name: 'Tired Promo Ad',
        angle: 'flash_sale',
        product_name: 'تيشيرت بيسك',
        spend: 600,
        revenue: 600,
        purchases: 4,
        frequency: 2.7,
        target_cpa: 50,
        currency: 'EGP',
      });

      expect(result.success).toBe(true);
      expect(result.ruleAdded).toContain('إرهاق إعلاني / FATIGUE');
      expect(result.ruleAdded).toContain('وصل تكراره إلى 2.7');
      expect(result.ruleAdded).toContain('أوقف هذه المجموعة');
    });

    test('distills BLEEDING_KILL rule when spend exceeds budget threshold with zero sales', async () => {
      const result = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, {
        ad_name: 'Bleeding Bad Ad',
        angle: 'vague_hook',
        product_name: 'حقيبة سفر',
        spend: 350,
        revenue: 0,
        purchases: 0,
        target_cpa: 60,
        currency: 'EGP',
      });

      expect(result.success).toBe(true);
      expect(result.ruleAdded).toContain('نزيف مالي / KILL');
      expect(result.ruleAdded).toContain('أنفق 350 EGP دون أي مبيعات');
    });
  });

  describe('3. Sales Dialogue Distillation (WhatsApp / Messenger Closings)', () => {
    test('distills SUCCESSFUL_CLOSING rule from winning objection handling', async () => {
      const result = await tenantSkillsService.distillFromSalesDialogue(merchantEgypt, {
        outcome: 'CONFIRMED',
        objection: 'مصاريف الشحن 50 جنيه غالية',
        closingAngle: 'عرض خصم 50% على الشحن لو ضفت قطعة ثانية',
        productName: 'ساعة رجالي',
      });

      expect(result.success).toBe(true);
      expect(result.ruleAdded).toContain('إغلاق ناجح');
      expect(result.ruleAdded).toContain('مصاريف الشحن 50 جنيه غالية');
      expect(result.ruleAdded).toContain('عرض خصم 50% على الشحن لو ضفت قطعة ثانية');

      const rules = await tenantSkillsService.listLearnedRules(merchantEgypt, { skillType: 'SALES_CLOSING' });
      expect(rules.length).toBe(1);
      expect(rules[0].skillType).toBe('SALES_CLOSING');
    });

    test('distills ABANDONED_OBJECTION rule to guide gentle recovery', async () => {
      const result = await tenantSkillsService.distillFromSalesDialogue(merchantEgypt, {
        outcome: 'ABANDONED',
        objection: 'محتاج ضمان أطول',
        closingAngle: 'إصرار جاف على سياسة الشركة',
        productName: 'سماعة بلوتوث',
      });

      expect(result.success).toBe(true);
      expect(result.ruleAdded).toContain('انسحاب عميل');
      expect(result.ruleAdded).toContain('تجنب الإلحاح الجاف');
    });
  });

  describe('4. Deduplication & Control Plane Toggles', () => {
    test('prevents duplicate lines when same rule is distilled multiple times', async () => {
      const payload = {
        ad_name: 'Winner Ad Duplicate Test',
        angle: 'angle_x',
        product_name: 'نظارة شمسية',
        spend: 200,
        revenue: 800,
        purchases: 4,
        target_cpa: 60,
        currency: 'EGP',
      };

      // Distill once
      const first = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, payload);
      expect(first.totalRules).toBe(1);

      // Distill identical metrics
      const second = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, payload);
      expect(second.totalRules).toBe(1);

      const rules = await tenantSkillsService.listLearnedRules(merchantEgypt);
      const occurrences = (rules[0].instructions.match(/نظارة شمسية/g) || []).length;
      expect(occurrences).toBe(1);
    });

    test('allows merchant to toggle rules on/off in the control plane', async () => {
      const res = await tenantSkillsService.distillFromAdMetrics(merchantEgypt, {
        ad_name: 'Toggle Test Ad',
        angle: 'discount',
        product_name: 'منتج تجريبي',
        spend: 100,
        revenue: 400,
        purchases: 2,
        target_cpa: 50,
      });

      const skillId = res.skillId;
      // Disable rule
      const toggleOff = await tenantSkillsService.toggleRule(merchantEgypt, skillId, false);
      expect(toggleOff.success).toBe(true);
      expect(toggleOff.enabled).toBe(false);

      // Verify list filters respected
      const enabledOnly = await tenantSkillsService.listLearnedRules(merchantEgypt, { enabled: true });
      expect(enabledOnly.length).toBe(0);

      const disabledOnly = await tenantSkillsService.listLearnedRules(merchantEgypt, { enabled: false });
      expect(disabledOnly.length).toBe(1);

      // Re-enable rule
      const toggleOn = await tenantSkillsService.toggleRule(merchantEgypt, skillId, true);
      expect(toggleOn.success).toBe(true);
      expect(toggleOn.enabled).toBe(true);
    });
  });
});
