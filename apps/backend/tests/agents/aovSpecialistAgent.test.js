'use strict';

/**
 * 🧪 Test Suite: aov-specialist-agent (v1.0.0)
 *
 * Verifies:
 * 1. Contract & File Integrity (agent.json, SOUL.md, PERSONA.md, TOOLS.md, AGENTS.md, evals.json)
 * 2. Role & Tool Mapping Consistency (role_tools.yaml vs agent.json vs roles.manifest.yaml)
 * 3. Zero-Hallucination Guardrails ("مش متاح" for missing data, zero fabricated numbers)
 * 4. Write-Gate & Explicit Confirmation Enforcement (no autonomous store mutation)
 * 5. Evals Test Scenarios Structure & Completeness
 * 6. Daily 9:00 AM Scheduler Job Integration
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const aiCronSchedulerService = require('../../services/aiCronSchedulerService');

const AGENT_DIR = path.resolve(__dirname, '../../agents/aov-specialist-agent');
const ROLE_TOOLS_PATH = path.resolve(__dirname, '../../../ai-service/src/tools/role_tools.yaml');
const ROLES_MANIFEST_PATH = path.resolve(__dirname, '../../../ai-service/src/agents/roles.manifest.yaml');

describe('AOV Specialist Agent (v1.0.0) — Verification Suite', () => {

  // =========================================================================
  // 1. Contract & File Integrity
  // =========================================================================
  describe('1. Contract & File Integrity', () => {
    it('all 6 contract files must exist and be non-empty', () => {
      const requiredFiles = [
        'agent.json',
        'SOUL.md',
        'PERSONA.md',
        'TOOLS.md',
        'AGENTS.md',
        'evals.json',
      ];

      for (const fileName of requiredFiles) {
        const filePath = path.join(AGENT_DIR, fileName);
        expect(fs.existsSync(filePath)).toBe(true);
        const stat = fs.statSync(filePath);
        expect(stat.size).toBeGreaterThan(50);
      }
    });

    it('agent.json has valid JSON and meets MaxP Agent Builder specification', () => {
      const manifestPath = path.join(AGENT_DIR, 'agent.json');
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.slug).toBe('aov-specialist-agent');
      expect(manifest.role).toBe('AOV_SPECIALIST');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.name).toContain('كريم');
      expect(manifest.name).toContain('AOV');
      expect(manifest.modelPolicy).toBeDefined();
      expect(manifest.modelPolicy.default).toBe('deepseek-flash');
      expect(Array.isArray(manifest.allowedTools)).toBe(true);
      expect(manifest.allowedTools.length).toBeGreaterThanOrEqual(10);
      expect(manifest.allowedSkills).toContain('upsell-engine');
      expect(manifest.guardrails).toBeDefined();
      expect(manifest.guardrails.requireExplicitConfirmation).toBe(true);
      expect(manifest.guardrails.noUnverifiedNumbers).toBe(true);
      expect(manifest.personaMeta).toBeDefined();
      expect(manifest.personaMeta.dialect).toBe('egyptian');
    });
  });

  // =========================================================================
  // 2. Role & Tool Mapping Consistency
  // =========================================================================
  describe('2. Role & Tool Mapping Consistency', () => {
    it('all tools in agent.json must be registered in role_tools.yaml under AOV_SPECIALIST', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
      const roleToolsContent = fs.readFileSync(ROLE_TOOLS_PATH, 'utf8');
      const roleToolsData = yaml.load(roleToolsContent);

      const assignedTools = roleToolsData.roles.AOV_SPECIALIST;
      expect(Array.isArray(assignedTools)).toBe(true);

      for (const tool of manifest.allowedTools) {
        const canonical = tool.replace(/\./g, '_');
        expect(assignedTools).toContain(canonical);
      }
    });

    it('role is declared in roles.manifest.yaml with full 2026 capabilities (Equal Power Law)', () => {
      const manifestContent = fs.readFileSync(ROLES_MANIFEST_PATH, 'utf8');
      const rolesManifest = yaml.load(manifestContent);

      const roleDef = rolesManifest.roles.AOV_SPECIALIST;
      expect(roleDef).toBeDefined();
      expect(roleDef.domain).toBe('AOV');
      expect(roleDef.capabilities.episodic_memory).toBe(true);
      expect(roleDef.capabilities.knowledge_retrieval).toBe(true);
      expect(roleDef.capabilities.learning).toBe(true);
      expect(roleDef.capabilities.approvals).toBe(true);
      expect(roleDef.approval_policy.allowed_scopes).toContain('AOV');
      expect(roleDef.approval_policy.allowed_scopes).toContain('DISCOUNTS');
      expect(roleDef.approval_policy.forbidden_prefixes).toContain('hr_');
    });
  });

  // =========================================================================
  // 3. Zero-Hallucination & Fallback Guardrails
  // =========================================================================
  describe('3. Zero-Hallucination Guardrails', () => {
    it('SOUL.md and TOOLS.md enforce strict fallback "مش متاح" and zero guessing', () => {
      const soulContent = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');
      const toolsContent = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');

      expect(soulContent).toContain('قانون الصدق الرياضي ومنع الاختلاق الصارم');
      expect(soulContent).toContain('مش متاح');
      expect(toolsContent).toContain('مش متاح');
      expect(toolsContent).toContain('sales_revenue');
      expect(toolsContent).toContain('order_summary');
    });
  });

  // =========================================================================
  // 4. Write Gate & Explicit Confirmation
  // =========================================================================
  describe('4. Write Gate & Explicit Confirmation', () => {
    it('mutating tools (conversion_tool_toggle, threshold, discounts) require explicit approval', () => {
      const soulContent = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');
      const toolsContent = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');

      expect(soulContent).toContain('قانون بوابات التعديل والموافقة الصريحة');
      expect(soulContent).toContain('conversion_tool_toggle');
      expect(soulContent).toContain('conversion_tool_set_threshold');
      expect(toolsContent).toContain('Strict Write Gate');
    });
  });

  // =========================================================================
  // 5. Evals Test Scenarios
  // =========================================================================
  describe('5. Evals Test Scenarios', () => {
    it('evals.json contains all required scenarios (missing data, write gate, calculation)', () => {
      const evalsPath = path.join(AGENT_DIR, 'evals.json');
      const evals = JSON.parse(fs.readFileSync(evalsPath, 'utf8'));

      expect(Array.isArray(evals.scenarios)).toBe(true);
      expect(evals.scenarios.length).toBeGreaterThanOrEqual(5);

      const missingDataScenario = evals.scenarios.find(s => s.name === 'missing_data_zero_hallucination');
      expect(missingDataScenario).toBeDefined();
      expect(missingDataScenario.must_contain).toContain('مش متاح');

      const confirmationScenario = evals.scenarios.find(s => s.name === 'mutation_requires_confirmation_free_shipping');
      expect(confirmationScenario).toBeDefined();
      expect(confirmationScenario.must_contain).toContain('موافقة');

      const calcScenario = evals.scenarios.find(s => s.name === 'aov_calculation_integrity');
      expect(calcScenario).toBeDefined();
      expect(calcScenario.must_contain).toContain('إجمالي المبيعات');
      expect(calcScenario.must_contain).toContain('عدد الطلبات');
    });
  });

  // =========================================================================
  // 6. Scheduled Daily Report
  // =========================================================================
  describe('6. Scheduled Daily Report in aiCronSchedulerService', () => {
    it('routes AOV queries to AOV_SPECIALIST', () => {
      expect(aiCronSchedulerService.resolveTargetRole('عايز تقرير AOV يومي وزيادة السلة')).toBe('AOV_SPECIALIST');
    });

    it('ensures default daily 9:00 AM Egypt time report job exists', async () => {
      const testCompany = `test_aov_eval_${Date.now()}`;
      const jobs = await aiCronSchedulerService.listJobs(testCompany);
      const aovJob = jobs.find(j => j.taskType === 'AOV_SPECIALIST');

      expect(aovJob).toBeDefined();
      expect(aovJob.cronExpression).toBe('0 9 * * *');
      expect(aovJob.status).toBe('ACTIVE');

      const runResult = await aiCronSchedulerService.executeJob(testCompany, aovJob.id);
      expect(runResult.success).toBe(true);
      expect(runResult.execution.status).toBe('SUCCESS');
      expect(runResult.execution.reply).toContain('التقرير الصباحي لمتوسط قيمة الطلب (AOV)');
      expect(runResult.execution.reply).toContain('متوسط قيمة الطلب (AOV)');
    });
  });
});
