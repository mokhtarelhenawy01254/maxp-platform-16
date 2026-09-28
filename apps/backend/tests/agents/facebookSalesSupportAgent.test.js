'use strict';

/**
 * 🧪 Test Suite: facebook-sales-support-agent (v2.0.0)
 *
 * Verifies:
 * 1. Contract & File Integrity (agent.json, SOUL.md, PERSONA.md, TOOLS.md, AGENTS.md, evals.json)
 * 2. Role & Tool Mapping Consistency (role_tools.yaml vs agent.json)
 * 3. Super Admin Disk Template Reader & Marketplace Registration
 * 4. Anti-AI-Detection Protocols & Dialect Constraints
 * 5. Sanitizer & Media Handling Guardrails
 * 6. Evals Test Scenarios Structure
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { sanitizeAiReply } = require('../../utils/aiReplySanitizer');

const AGENT_DIR = path.resolve(__dirname, '../../agents/facebook-sales-support-agent');
const ROLE_TOOLS_PATH = path.resolve(__dirname, '../../../ai-service/src/tools/role_tools.yaml');
const ROLES_MANIFEST_PATH = path.resolve(__dirname, '../../../ai-service/src/agents/roles.manifest.yaml');

describe('Facebook Sales Support Agent (v2.0.0) — Verification Suite', () => {

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

    it('agent.json has valid JSON and meets MaxP Agent Builder v2 specification', () => {
      const manifestPath = path.join(AGENT_DIR, 'agent.json');
      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.slug).toBe('facebook-sales-support-agent');
      expect(manifest.role).toBe('FACEBOOK_SALES_SUPPORT');
      expect(manifest.version).toBe('2.0.0');
      expect(manifest.name).toContain('سارة');
      expect(manifest.modelPolicy).toBeDefined();
      expect(manifest.modelPolicy.default).toBe('deepseek-flash');
      expect(Array.isArray(manifest.allowedTools)).toBe(true);
      expect(manifest.allowedTools.length).toBeGreaterThanOrEqual(10);
      expect(Array.isArray(manifest.channels)).toBe(true);
      expect(manifest.channels).toContain('facebook');
      expect(manifest.channels).toContain('messenger');
      expect(manifest.guardrails).toBeDefined();
      expect(manifest.guardrails.singleQuestionPerTurn).toBe(true);
      expect(manifest.personaMeta).toBeDefined();
      expect(manifest.personaMeta.dialect).toBe('egyptian');
    });
  });

  // =========================================================================
  // 2. Role & Tool Mapping Consistency
  // =========================================================================
  describe('2. Role & Tool Mapping Consistency', () => {
    it('all tools in agent.json must be registered in role_tools.yaml under FACEBOOK_SALES_SUPPORT', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
      const roleToolsContent = fs.readFileSync(ROLE_TOOLS_PATH, 'utf8');
      const roleToolsData = yaml.load(roleToolsContent);

      const assignedTools = roleToolsData.roles.FACEBOOK_SALES_SUPPORT;
      expect(Array.isArray(assignedTools)).toBe(true);

      for (const tool of manifest.allowedTools) {
        const canonical = tool.replace(/\./g, '_');
        expect(assignedTools).toContain(canonical);
      }
    });

    it('role is declared in roles.manifest.yaml with appropriate capabilities', () => {
      const manifestContent = fs.readFileSync(ROLES_MANIFEST_PATH, 'utf8');
      const rolesManifest = yaml.load(manifestContent);

      const roleDef = rolesManifest.roles.FACEBOOK_SALES_SUPPORT;
      expect(roleDef).toBeDefined();
      expect(roleDef.domain).toBe('SALES');
      expect(roleDef.capabilities.can_read_db).toBe(true);
      expect(roleDef.capabilities.can_call_tools).toBe(true);
    });
  });

  // =========================================================================
  // 3. Super Admin Disk Template Reader Simulation
  // =========================================================================
  describe('3. Super Admin Disk Template Reader', () => {
    it('correctly loads and builds template payload for Super Admin sync', () => {
      const manifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
      const soul = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');
      const persona = fs.readFileSync(path.join(AGENT_DIR, 'PERSONA.md'), 'utf8');
      const tools = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');
      const agents = fs.readFileSync(path.join(AGENT_DIR, 'AGENTS.md'), 'utf8');

      const templatePayload = {
        slug: manifest.slug,
        role: manifest.role,
        name: manifest.name,
        version: manifest.version,
        model_policy: manifest.modelPolicy,
        allowed_tools: manifest.allowedTools,
        allowed_skills: manifest.allowedSkills,
        channels: manifest.channels,
        guardrails: manifest.guardrails,
        persona_meta: manifest.personaMeta,
        instructions_soul: soul,
        instructions_agents: agents,
        instructions_tools: tools,
        instructions_persona: persona,
        is_active: manifest.isActive !== false,
      };

      expect(templatePayload.slug).toBe('facebook-sales-support-agent');
      expect(templatePayload.name).toBe('سارة — مبيعات وخدمة عملاء الصفحات (محاكاة بشرية)');
      expect(templatePayload.instructions_soul.length).toBeGreaterThan(500);
      expect(templatePayload.instructions_persona.length).toBeGreaterThan(100);
      expect(templatePayload.instructions_tools.length).toBeGreaterThan(200);
      expect(templatePayload.instructions_agents.length).toBeGreaterThan(200);
    });
  });

  // =========================================================================
  // 4. Anti-AI-Detection & Dialect Protocols
  // =========================================================================
  describe('4. Anti-AI-Detection & Dialect Protocols in SOUL.md', () => {
    let soulContent;

    beforeAll(() => {
      soulContent = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');
    });

    it('mandates Egyptian dialect and forbids robotic Arabic', () => {
      expect(soulContent).toContain('اللهجة المصرية');
      expect(soulContent).toContain('أهلاً بحضرتك');
      expect(soulContent).toContain('عنيا ليك');
    });

    it('strictly forbids robotic formatting (asterisks, bullets, tables)', () => {
      expect(soulContent).toContain('حظر التنسيق الآلي للبوتات');
      expect(soulContent).toContain('ممنوع نهائياً النجوم');
      expect(soulContent).toContain('ممنوع القوائم النقطية');
    });

    it('enforces single question per turn rule', () => {
      expect(soulContent).toContain('سؤال واحد فقط في كل رد');
    });

    it('enforces voice note courtesy protocol', () => {
      expect(soulContent).toContain('الرسائل الصوتية');
    });

    it('enforces human handoff phrase identical to allFunctions.js', () => {
      const expectedHandoff = 'ثواني بس هحول حضرتك لأحد زملائنا في خدمة العملاء عشان يتابع معاك ويفيدك بالتفصيل فوراً 🙏';
      expect(soulContent).toContain(expectedHandoff);
    });

    it('forbids revealing AI identity', () => {
      expect(soulContent).toContain('إنكار صفة الذكاء الاصطناعي');
    });
  });

  // =========================================================================
  // 5. Sanitizer & Media Handling
  // =========================================================================
  describe('5. Sanitizer & Media Handling Guardrails', () => {
    it('extracts raw image URLs into attachments and strips them from message text', () => {
      const rawAiText = 'أهلاً بحضرتك، ده الفستان المتاح عندنا باللون الأسود https://example.com/dress.jpg يناسب حضرتك مقاس إيه؟';
      const result = sanitizeAiReply(rawAiText);

      expect(result.cleanedText).not.toContain('https://example.com/dress.jpg');
      expect(result.cleanedText).toContain('أهلاً بحضرتك');
      expect(result.cleanedText).toContain('يناسب حضرتك مقاس إيه؟');
      expect(result.attachments.length).toBe(1);
      expect(result.attachments[0].url).toBe('https://example.com/dress.jpg');
    });

    it('strips markdown image embeds like ![image](url)', () => {
      const rawAiText = 'اتفضل صورة الموديل ![صورة الفستان](https://example.com/photo.png) تحب أحجزلك منه؟';
      const result = sanitizeAiReply(rawAiText);

      expect(result.cleanedText).not.toContain('![');
      expect(result.cleanedText).not.toContain('https://example.com/photo.png');
      expect(result.attachments.length).toBe(1);
      expect(result.attachments[0].url).toBe('https://example.com/photo.png');
    });
  });

  // =========================================================================
  // 6. Evals Test Scenarios
  // =========================================================================
  describe('6. Evals Test Scenarios', () => {
    it('evals.json contains valid test cases covering critical anti-detection criteria', () => {
      const evalsPath = path.join(AGENT_DIR, 'evals.json');
      const evalsData = JSON.parse(fs.readFileSync(evalsPath, 'utf8'));

      expect(Array.isArray(evalsData.evals)).toBe(true);
      expect(evalsData.evals.length).toBeGreaterThanOrEqual(4);

      for (const testCase of evalsData.evals) {
        expect(testCase.id).toBeDefined();
        expect(testCase.name).toBeDefined();
        expect(testCase.input).toBeDefined();
        expect(Array.isArray(testCase.expected_behavior)).toBe(true);
        expect(Array.isArray(testCase.anti_patterns)).toBe(true);
      }

      // Check specific scenarios
      const ids = evalsData.evals.map(e => e.id);
      expect(ids).toContain('eval_bot_identity_denial');
      expect(ids).toContain('eval_no_markdown_formatting');
      expect(ids).toContain('eval_single_entity_focus');
    });
  });
});
