const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../../services/sharedDatabase', () => {
  const aiProviderLog = {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };

  return {
    getSharedPrismaClient: jest.fn(() => ({ aiProviderLog })),
  };
});

const agentFileSystemService = require('../../services/aiAgent/agentFileSystemService');
const toolRegistryService = require('../../services/aiAgent/toolRegistryService');
const skillRegistryService = require('../../services/aiAgent/skillRegistryService');
const agentProfileLoaderService = require('../../services/aiAgent/agentProfileLoaderService');
const agentProvisioningService = require('../../services/aiAgent/agentProvisioningService');
const agentSkillAuthoringService = require('../../services/aiAgent/agentSkillAuthoringService');
const CEOAgent = require('../../services/aiAgent/CEOAgent');

describe('Agent file-system registries', () => {
  beforeEach(() => {
    toolRegistryService._resetCache();
    skillRegistryService._resetCache();
    agentProvisioningService._reset();
  });

  test('loads the required agent templates from disk', () => {
    const slugs = agentFileSystemService.listAgentSlugs();

    expect(slugs).toEqual(expect.arrayContaining([
      'manager-ceo',
      'sales-agent',
      'facebook-sales-support-agent',
      'support-agent',
      'inventory-pricing-agent',
      'marketing-agent',
    ]));
  });

  test('validates registered tool schemas', () => {
    expect(typeof toolRegistryService.getTool('product.search').handler).toBe('function');
    expect(toolRegistryService.validateToolInput('product.search', { query: 'sneakers', limit: 5 }).valid).toBe(true);
    expect(toolRegistryService.validateToolInput('order.create_draft', {
      productName: 'Sneaker',
      productPrice: 100,
      customerName: 'Ahmed',
      customerPhone: '01000000000',
      quantity: 1,
    }).valid).toBe(true);
    expect(toolRegistryService.getTool('order.create_confirmed').requiresApproval).toBe(false);
    expect(toolRegistryService.validateToolInput('order.create_confirmed', {
      productName: 'Sneaker',
      productPrice: 100,
      customerName: 'Ahmed',
      customerPhone: '01000000000',
      city: 'Cairo',
      confirmedByCustomer: true,
      quantity: 1,
    }).valid).toBe(true);
    expect(toolRegistryService.validateToolInput('order.create_confirmed', {
      productName: 'Sneaker',
      productPrice: 100,
      customerName: 'Ahmed',
      customerPhone: '01000000000',
      city: 'Cairo',
    }).errors).toContain('input.confirmedByCustomer is required');
    expect(toolRegistryService.validateToolInput('agent.run_task', {
      agentName: 'وكيل مبيعات فيسبوك',
      task: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي سعر 100',
    }).valid).toBe(true);

    const invalid = toolRegistryService.validateToolInput('product.search', {});
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('input.query is required');
  });

  test('loads skills and verifies their compact tool scopes', () => {
    const skill = skillRegistryService.getSkill('catalog-search');

    expect(skill.displayName).toBe('Catalog Search');
    expect(skill.allowedTools).toEqual(['product.search', 'inventory.check']);
    expect(skill.allowedTools.length).toBeLessThanOrEqual(3);
  });

  test('builds the manager runtime config from AGENTS/SOUL/TOOLS files', () => {
    const config = agentProfileLoaderService.buildRuntimeConfig('company_123456', { role: 'CEO' });

    expect(config.name).toBe('CEO Agent');
    expect(config.allowedTools).toEqual(expect.arrayContaining(['agent.spawn', 'agent.assign_task']));
    expect(config.allowedSkills).toEqual(expect.arrayContaining(['hire-agent', 'delegate-goal']));
    expect(config.persona.templateSlug).toBe('manager-ceo');
    expect(config.persona.agentInstructions).toContain('CEO Agent Operating Rules');
    expect(config.persona.soulInstructions).toContain('CEO Agent Soul');
    expect(config.persona.toolsInstructions).toContain('CEO Agent Tools');
  });

  test('builds a narrow Facebook sales/support runtime config', () => {
    const config = agentProfileLoaderService.buildRuntimeConfig('company_123456', {
      role: 'FACEBOOK_SALES_SUPPORT',
    });

    expect(config.name).toBe('Facebook Sales Support Agent');
    expect(config.persona.templateSlug).toBe('facebook-sales-support-agent');
    expect(config.modelSource).toBe('policy-default');
    expect(config.persona.modelSource).toBe('policy-default');
    expect(config.policies.modelPolicy.allowModelFallback).toBe(true);
    expect(config.allowedTools).toEqual(expect.arrayContaining([
      'product.search',
      'inventory.check',
      'customer.info',
      'order.lookup',
      'shipping.rates',
      'order.create_draft',
      'order.create_confirmed',
      'agent.handoff',
    ]));
    expect(config.allowedTools).not.toEqual(expect.arrayContaining([
      'discount.create_draft',
      'whatsapp.send',
      'agent.spawn',
    ]));
    expect(config.allowedSkills).toEqual(expect.arrayContaining([
      'facebook-sales-conversion',
      'handoff-to-human',
    ]));
  });

  test('rejects requested tools or skills whose tools exceed the selected template', () => {
    expect(() => agentProfileLoaderService.buildRuntimeConfig('company_123456', {
      role: 'SALES',
      allowedTools: ['product.updatePrice'],
    })).toThrow('Requested tool not allowed by template');

    expect(() => agentProfileLoaderService.buildRuntimeConfig('company_123456', {
      role: 'SALES',
      allowedSkills: ['pricing-review'],
    })).toThrow('Skill pricing-review tool not allowed by template');
  });

  test('allows runtime-created shared skills when their tools fit the agent scope', () => {
    const config = agentProfileLoaderService.buildRuntimeConfig('company_123456', {
      role: 'SALES',
      allowedSkills: ['handoff-to-human'],
    });

    expect(config.allowedSkills).toEqual(['handoff-to-human']);
    expect(config.persona.skillInstructions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'handoff-to-human' }),
    ]));
  });

  test('loads runtime-created skills from the configured persistent root', async () => {
    const previousRuntimeRoot = process.env.AGENT_RUNTIME_SKILLS_ROOT;
    const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maxp-agent-skills-'));
    process.env.AGENT_RUNTIME_SKILLS_ROOT = runtimeRoot;
    skillRegistryService._resetCache();

    try {
      const created = await agentSkillAuthoringService.createSkill('company_123456', {
        id: 'content-writing',
        displayName: 'Content Writing',
        description: 'Write grounded marketing content from approved company context.',
        allowedTools: ['audit.read'],
      });

      expect(created.id).toBe('content-writing');
      expect(fs.existsSync(path.join(runtimeRoot, 'content-writing', 'skill.json'))).toBe(true);
      expect(skillRegistryService.getSkill('content-writing')).toEqual(expect.objectContaining({
        id: 'content-writing',
        displayName: 'Content Writing',
        allowedTools: ['audit.read'],
      }));
      expect(skillRegistryService.getSkill('catalog-search')).toEqual(expect.objectContaining({
        id: 'catalog-search',
      }));
    } finally {
      if (previousRuntimeRoot === undefined) {
        delete process.env.AGENT_RUNTIME_SKILLS_ROOT;
      } else {
        process.env.AGENT_RUNTIME_SKILLS_ROOT = previousRuntimeRoot;
      }
      skillRegistryService._resetCache();
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });

  test('refreshes skill registry cache when another process writes a runtime skill', () => {
    const previousRuntimeRoot = process.env.AGENT_RUNTIME_SKILLS_ROOT;
    const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maxp-agent-skills-cache-'));
    process.env.AGENT_RUNTIME_SKILLS_ROOT = runtimeRoot;
    skillRegistryService._resetCache();

    try {
      expect(skillRegistryService.getSkill('codex-cache-refresh')).toBeNull();
      const skillDir = path.join(runtimeRoot, 'codex-cache-refresh');
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, 'skill.json'), JSON.stringify({
        id: 'codex-cache-refresh',
        displayName: 'Codex Cache Refresh',
        version: '0.1.0',
        description: 'Verifies cross-process skill cache invalidation.',
        allowedTools: ['audit.read'],
        requiresHumanApproval: true,
        maxToolCount: 1,
      }), 'utf8');
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Codex Cache Refresh\n', 'utf8');

      expect(skillRegistryService.getSkill('codex-cache-refresh')).toEqual(expect.objectContaining({
        id: 'codex-cache-refresh',
        displayName: 'Codex Cache Refresh',
        allowedTools: ['audit.read'],
      }));
    } finally {
      if (previousRuntimeRoot === undefined) {
        delete process.env.AGENT_RUNTIME_SKILLS_ROOT;
      } else {
        process.env.AGENT_RUNTIME_SKILLS_ROOT = previousRuntimeRoot;
      }
      skillRegistryService._resetCache();
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });

  test('provisions template-backed agents with tools and skills', () => {
    const agent = agentProvisioningService.spawn('company_123456', { role: 'SALES' });

    expect(agent.role).toBe('SALES');
    expect(agent.templateSlug).toBe('sales-agent');
    expect(agent.canUseTool('product.search')).toBe(true);
    expect(agent.canUseTool('order.create_draft')).toBe(true);
    expect(agent.canUseTool('inventory.adjust')).toBe(false);
    expect(agent.canUseSkill('catalog-search')).toBe(true);
    expect(agent.canUseSkill('pricing-review')).toBe(false);
    expect(agent.persona.soulInstructions).toContain('Sales Agent Soul');
  });

  test('maps Facebook/Messenger roles to the dedicated customer agent template', () => {
    expect(agentProfileLoaderService.getTemplateSlugForRole('FACEBOOK')).toBe('facebook-sales-support-agent');
    expect(agentProfileLoaderService.getTemplateSlugForRole('MESSENGER')).toBe('facebook-sales-support-agent');
    expect(agentProfileLoaderService.getTemplateSlugForRole('FACEBOOK_SALES_SUPPORT')).toBe('facebook-sales-support-agent');
  });

  test('does not widen the Facebook customer agent to CEO tool scope', () => {
    const agent = new CEOAgent('company_123456', {
      role: 'FACEBOOK_SALES_SUPPORT',
      includeAllCeoTools: false,
    });

    expect(agent.role).toBe('FACEBOOK_SALES_SUPPORT');
    expect(agent.canUseTool('order.create_draft')).toBe(true);
    expect(agent.canUseTool('order.create_confirmed')).toBe(true);
    expect(agent.canUseTool('agent.handoff')).toBe(true);
    expect(agent.canUseTool('agent.spawn')).toBe(false);
    expect(agent.canUseTool('discount.create_draft')).toBe(false);
    expect(agent.canUseTool('whatsapp.send')).toBe(false);
  });

  test('every tool has required metadata fields', () => {
    const { TOOLS } = require('../../services/aiAgent/agentToolRegistry');
    const missing = [];

    for (const [name, tool] of Object.entries(TOOLS)) {
      const issues = [];
      if (!tool.description) issues.push('description');
      if (!tool.handler) issues.push('handler');
      if (tool.sideEffects !== 'read' && tool.sideEffects !== 'write') issues.push('sideEffects');
      if (typeof tool.requiresApproval !== 'boolean') issues.push('requiresApproval');
      if (typeof tool.companyScoped !== 'boolean') issues.push('companyScoped');
      if (!tool.inputSchema || tool.inputSchema.type !== 'object') issues.push('inputSchema');
      if (issues.length) missing.push(`${name}: ${issues.join(', ')}`);
    }

    expect(missing).toEqual([]);
  });

  test('toolRegistryService returns metadata from JS registry', () => {
    const tools = toolRegistryService.listTools();
    expect(tools.length).toBeGreaterThan(0);

    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.sideEffects).toMatch(/^(read|write)$/);
      expect(typeof tool.requiresApproval).toBe('boolean');
    }

    const orderDraft = toolRegistryService.getTool('order.create_draft');
    expect(orderDraft.sideEffects).toBe('write');
    expect(orderDraft.requiresApproval).toBe(true);
    expect(orderDraft.inputSchema).toBeDefined();

    const productSearch = toolRegistryService.getTool('product.search');
    expect(productSearch.sideEffects).toBe('read');
    expect(productSearch.requiresApproval).toBe(false);
  });
});
