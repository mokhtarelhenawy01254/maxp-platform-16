'use strict';

/**
 * 🧪 Test Suite: executive-assistant-agent (v1.0.0) — Complete Store Bundle (17 Apps)
 *
 * Verifies:
 * 1. Contract & File Integrity (agent.json, SOUL.md, PERSONA.md, TOOLS.md, AGENTS.md, evals.json)
 * 2. 100% Coverage of the 17 Apps in 'store-complete-bundle'
 * 3. Synchronization between agent.json allowedTools and role_tools.yaml
 * 4. Structured tool signatures in TOOLS.md and store_suite.py
 * 5. Rule Ban AI Keys in .env compliance
 */

const fs = require('fs');
const path = require('path');

const AGENT_DIR = path.resolve(__dirname, '../../agents/executive-assistant-agent');
const AI_SERVICE_DIR = path.resolve(__dirname, '../../../ai-service');
const ROLE_TOOLS_PATH = path.join(AI_SERVICE_DIR, 'src/tools/role_tools.yaml');
const STORE_SUITE_PY_PATH = path.join(AI_SERVICE_DIR, 'src/tools/definitions/store_suite.py');

describe('Executive Assistant Agent (Saleem) — Complete Store Bundle (17 Apps) Verification', () => {
  let agentManifest;
  let roleToolsYaml;
  let toolsDoc;
  let evalsJson;
  let storeSuitePy;

  beforeAll(() => {
    agentManifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
    roleToolsYaml = fs.readFileSync(ROLE_TOOLS_PATH, 'utf8');
    toolsDoc = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');
    evalsJson = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'evals.json'), 'utf8'));
    storeSuitePy = fs.readFileSync(STORE_SUITE_PY_PATH, 'utf8');
  });

  // =========================================================================
  // 1. Contract Files Integrity
  // =========================================================================
  test('all 6 contract files must exist and be non-empty', () => {
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
      expect(stat.size).toBeGreaterThan(100);
    }
  });

  test('agent.json has valid metadata, allowedSkills, and 76 allowedTools', () => {
    expect(agentManifest.slug).toBe('executive-assistant-agent');
    expect(agentManifest.role).toBe('EXECUTIVE_ASSISTANT');
    expect(agentManifest.name).toContain('سليم');
    expect(Array.isArray(agentManifest.allowedTools)).toBe(true);
    expect(agentManifest.allowedTools.length).toBe(76);

    const requiredSkills = [
      'store-suite-operations',
      'campaign-attribution-watch',
      'bulk-order-operations',
      'chat-inbox-telemetry',
    ];
    for (const skill of requiredSkills) {
      expect(agentManifest.allowedSkills).toContain(skill);
    }
  });

  // =========================================================================
  // 2. 100% Coverage of the 17 Apps in Complete Store Bundle
  // =========================================================================
  const BUNDLE_17_APPS = [
    { id: 'store', name: 'المتجر', tools: ['conversion.tools.read', 'conversion.tool.toggle'] },
    { id: 'order-workflow', name: 'مسار الطلبات', tools: ['order_confirm', 'order_cancel', 'order_update_details'] },
    { id: 'whatsapp-business', name: 'WhatsApp Business API', tools: ['whatsapp_send'] },
    { id: 'bot-automation', name: 'أتمتة المحادثات', tools: ['bot_automation_manage'] },
    { id: 'bulk-orders', name: 'الطلبات الجماعية', tools: ['orders_bulk_status_update'] },
    { id: 'order-preparation-hold', name: 'تجهيز وتعليق الطلبات', tools: ['order_set_preparation_hold'] },
    { id: 'order-shipping-turbo', name: 'بوابة وشركات الشحن الذكي', tools: ['shipping.companies.list', 'shipment.track'] },
    { id: 'inventory-pro', name: 'المخزون والمستودعات الشامل', tools: ['inventory.check', 'inventory.adjust'] },
    { id: 'returns-settings', name: 'إعدادات المرتجعات', tools: ['returns_settings_manage'] },
    { id: 'returns-reasons-analytics', name: 'أسباب المرتجعات', tools: ['returns_settings_manage'] },
    { id: 'orders-analytics', name: 'تحليلات الطلبات', tools: ['order.summary', 'order.recent.list'] },
    { id: 'profit-analytics', name: 'تحليلات الأرباح والمبيعات', tools: ['sales.revenue', 'bridge_get_treasury_expenses'] },
    { id: 'campaign-attribution', name: 'Campaign Attribution', tools: ['orders_campaign_attribution_report'] },
    { id: 'campaign-attribution-analytics', name: 'بيانات الحملة', tools: ['orders_campaign_attribution_report'] },
    { id: 'facebook-ads-pro', name: 'إعلانات فيسبوك وانستجرام', tools: ['facebook_ad_account_info', 'facebook_ad_publish_draft'] },
    { id: 'facebook-pages-connect', name: 'ربط صفحات فيسبوك', tools: ['facebook_pages_connected_list'] },
    { id: 'unified-inbox', name: 'Unified Inbox', tools: ['unified_inbox_manage'] },
  ];

  test('all 17 bundle apps have bound executable tools in agent.json', () => {
    expect(BUNDLE_17_APPS.length).toBe(17);
    for (const app of BUNDLE_17_APPS) {
      for (const tool of app.tools) {
        expect(agentManifest.allowedTools).toContain(tool);
      }
    }
  });

  test('all 17 bundle apps are documented in TOOLS.md', () => {
    for (const app of BUNDLE_17_APPS) {
      for (const tool of app.tools) {
        expect(toolsDoc).toContain(tool);
      }
    }
  });

  // =========================================================================
  // 3. Python Service & YAML Alignment
  // =========================================================================
  test('store_suite.py exports all 6 new tools in __all_tools__', () => {
    const expectedPythonTools = [
      'orders_bulk_status_update_tool',
      'order_set_preparation_hold_tool',
      'bot_automation_manage_tool',
      'returns_settings_manage_tool',
      'unified_inbox_manage_tool',
      'facebook_pages_connected_list_tool',
    ];

    for (const toolVar of expectedPythonTools) {
      expect(storeSuitePy).toContain(toolVar);
    }
    expect(storeSuitePy).toContain('__all_tools__ = [');
  });

  test('role_tools.yaml contains EXECUTIVE_ASSISTANT with Complete Store Bundle tools', () => {
    const expectedYamlTools = [
      'orders_bulk_status_update',
      'order_set_preparation_hold',
      'bot_automation_manage',
      'returns_settings_manage',
      'unified_inbox_manage',
      'facebook_pages_connected_list',
      'whatsapp_send',
      'orders_campaign_attribution_report',
      'facebook_ad_account_info',
      'order_confirm',
      'order_cancel',
      'order_update_details',
    ];

    for (const toolName of expectedYamlTools) {
      expect(roleToolsYaml).toContain(toolName);
    }
  });

  // =========================================================================
  // 4. Evals Scenarios
  // =========================================================================
  test('evals.json covers all 17 scenarios including Complete Store Bundle apps', () => {
    expect(Array.isArray(evalsJson.evalScenarios)).toBe(true);
    expect(evalsJson.evalScenarios.length).toBe(17);

    const scenarioIds = evalsJson.evalScenarios.map(s => s.id);
    expect(scenarioIds).toContain('scenario_bulk_orders_update');
    expect(scenarioIds).toContain('scenario_order_preparation_hold');
    expect(scenarioIds).toContain('scenario_whatsapp_customer_outreach');
    expect(scenarioIds).toContain('scenario_campaign_attribution');
    expect(scenarioIds).toContain('scenario_bot_automation_config');
    expect(scenarioIds).toContain('scenario_returns_policy_settings');
    expect(scenarioIds).toContain('scenario_unified_inbox_monitoring');
    expect(scenarioIds).toContain('scenario_facebook_connected_pages');
  });

  // =========================================================================
  // 5. Zero AI Keys in .env Guard
  // =========================================================================
  test('strict rule compliance: zero AI provider keys in .env files', () => {
    const rootEnvPath = path.resolve(__dirname, '../../../.env');
    const backendEnvPath = path.resolve(__dirname, '../../.env');

    const bannedKeyPatterns = [
      /GEMINI_API_KEY/i,
      /OPENAI_API_KEY/i,
      /ANTHROPIC_API_KEY/i,
      /DEEPSEEK_API_KEY/i,
      /GROQ_API_KEY/i,
    ];

    [rootEnvPath, backendEnvPath].forEach(envFile => {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        bannedKeyPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      }
    });
  });
});
