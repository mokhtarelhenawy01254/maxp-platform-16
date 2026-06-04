const BaseAgent = require('./BaseAgent');
const { getSharedPrismaClient } = require('../sharedDatabase');
const agentProfileLoaderService = require('./agentProfileLoaderService');

const ROLE_TOOL_MAP = {
  SALES: ['product.search', 'order.lookup', 'order.create_draft', 'customer.info', 'inventory.check', 'shipping.rates', 'discount.apply'],
  SUPPORT: ['order.lookup', 'customer.info', 'shipping.rates', 'shipping.update', 'order.confirm', 'order.cancel', 'order.refund'],
  SHIPPING: ['order.lookup', 'shipping.rates', 'shipping.update', 'inventory.check'],
  INVENTORY: ['inventory.check', 'inventory.adjust', 'product.search', 'product.create'],
  MARKETING: ['product.search', 'inventory.check', 'facebook_ad.create_draft', 'audit.read', 'agent.handoff'],
  SAS_SALES: ['googlesheets.searchProducts', 'googlesheets.submitOrder', 'googlesheets.readProducts', 'facebook.reply', 'agent.handoff'],
  CEO: [
    'agent.spawn', 'agent.assign_task', 'agent.list_agents', 'agent.read_state',
    'agent.update_profile', 'agent.run_task', 'agent.handoff',
    'skill.create',
    'hr.attendance_today',
    'product.search', 'product.lowStock', 'product.topSelling',
    'order.summary', 'order.lookup', 'order.recentList', 'order.create_draft',
    'order.confirm', 'order.cancel', 'order.refund',
    'customer.info', 'customer.topBuyers',
    'inventory.check', 'sales.revenue', 'company.snapshot',
    'shipping.rates', 'shipping.update', 'discount.apply', 'discount.create_draft',
    'product.create', 'product.updatePrice', 'audit.read', 'scheduler.create_job',
  ],
};

function shouldRefreshTemplateSoulSnapshot({ persistedSoul = '', runtimeSoul = '' } = {}) {
  const persisted = String(persistedSoul || '').trim();
  const runtime = String(runtimeSoul || '').trim();
  if (!persisted || !runtime || persisted === runtime) return false;

  const runtimeHeading = runtime.match(/^#\s+.+$/m)?.[0] || '';
  if (!runtimeHeading || !persisted.includes(runtimeHeading)) return false;
  if (persisted.includes('## Voice and Dialect Policy')) return false;

  return (
    persisted.includes('Arabic-speaking Messenger sales/support agent')
    || persisted.includes('Multilingual Egyptian Arabic')
  ) && persisted.length < runtime.length;
}

class AgentProvisioningService {
  constructor() {
    /** @type {Map<string, Map<string, BaseAgent>>} companyId -> agentId -> agent */
    this._registry = new Map();
    this._idCounter = 0;
    this._initRecovery();
  }

  /**
   * Recovers provisioned agents asynchronously from CompanyAgent table.
   */
  _initRecovery() {
    try {
      const prisma = getSharedPrismaClient();
      prisma.companyAgent.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { createdAt: 'asc' }
      }).then(rows => {
        const recoveredByCompany = new Map();
        for (const row of rows) {
          try {
            const recoveredSkills = (() => {
              try {
                const parsed = JSON.parse(row.skills || '[]');
                return Array.isArray(parsed) ? parsed : [];
              } catch { return []; }
            })();

            const agent = this._restoreAgent(row.companyId, {
              id: row.id,
              name: row.name,
              role: row.role,
              model: row.model,
              templateSlug: row.templateSlug,
              parentId: row.parentId,
              allowedSkills: recoveredSkills,
              soul: row.soul,
              status: row.status,
            });

            if (agent) {
              const compMap = this._registry.get(row.companyId);
              if (!recoveredByCompany.has(row.companyId)) {
                recoveredByCompany.set(row.companyId, compMap);
              }
              // Sync local counter to prevent collisions
              const numId = parseInt(agent.id.split('_').pop(), 10);
              if (!isNaN(numId) && numId > this._idCounter) {
                this._idCounter = numId;
              }
            }
          } catch (e) {
            console.warn('[AGENT-PROVISION-RECOVERY] Error recovering agent row:', e.message);
          }
        }
        for (const compMap of recoveredByCompany.values()) {
          for (const agent of compMap.values()) {
            if (!agent.parentId) continue;
            const parent = compMap.get(agent.parentId);
            if (parent && parent.id !== agent.id) parent.addChild(agent);
          }
        }
        console.log(`[AGENT-PROVISION-RECOVERY] Recovered ${rows.length} agent(s) from company_agents.`);
      }).catch(err => {
        console.warn('[AGENT-PROVISION-RECOVERY] Failed to recover from company_agents:', err.message);
      });
    } catch (_) {}
  }

  /**
   * Spawns a new agent with role-based tool scoping.
   */
  spawn(companyId, {
    name,
    role,
    model,
    persona,
    policies,
    parentId,
    allowedTools: requestedTools,
    allowedSkills: requestedSkills,
    templateSlug,
  } = {}) {
    if (!companyId) throw new Error('companyId is required');
    if (!role) throw new Error('role is required');

    const normalizedRole = role.toUpperCase();
    const runtimeConfig = this._buildRuntimeConfig(companyId, {
      name,
      role: normalizedRole,
      model,
      persona,
      policies,
      allowedTools: requestedTools,
      allowedSkills: requestedSkills,
      templateSlug,
    });

    const agent = new BaseAgent({
      id: `agent_${companyId.slice(-6)}_${++this._idCounter}`,
      name: runtimeConfig.name,
      role: runtimeConfig.role,
      companyId,
      allowedTools: runtimeConfig.allowedTools,
      allowedSkills: runtimeConfig.allowedSkills,
      templateSlug: runtimeConfig.persona?.templateSlug,
      version: runtimeConfig.persona?.version,
      model: runtimeConfig.model,
      persona: runtimeConfig.persona,
      policies: runtimeConfig.policies,
      parentId,
    });

    if (!this._registry.has(companyId)) this._registry.set(companyId, new Map());
    this._registry.get(companyId).set(agent.id, agent);

    // Link to parent if specified
    if (parentId) {
      const parent = this.getAgent(companyId, parentId);
      if (parent) parent.addChild(agent);
    }

    // Persist durably to CompanyAgent table (fire-and-forget, but real table)
    try {
      const prisma = getSharedPrismaClient();
      prisma.companyAgent.upsert({
        where: { id: agent.id },
        create: {
          id: agent.id,
          companyId,
          name: agent.name,
          role: agent.role,
          description: agent.description || null,
          icon: '🤖',
          soul: agent.persona?.soulInstructions || null,
          rules: null,
          skills: JSON.stringify(agent.getSkills()),
          model: agent.model,
          status: agent.status,
          parentId: parentId || null,
          templateSlug: agent.templateSlug || null,
          createdBy: 'agent_provisioning_service',
        },
        update: {
          name: agent.name,
          role: agent.role,
          model: agent.model,
          status: agent.status,
          parentId: parentId || null,
          templateSlug: agent.templateSlug || null,
          updatedAt: new Date(),
        },
      }).catch(err => {
        console.warn('[AGENT-PROVISION] Failed to persist agent to company_agents:', err.message);
      });
    } catch (_) {}

    return agent;
  }

  async updateAgent(companyId, agentId, updates = {}) {
    if (!companyId) throw new Error('companyId is required');
    const agent = this.getAgent(companyId, agentId);
    if (!agent) throw new Error('AGENT_NOT_FOUND');

    if (typeof updates.name === 'string' && updates.name.trim()) {
      agent.name = updates.name.trim();
    }
    if (typeof updates.role === 'string' && updates.role.trim()) {
      agent.role = updates.role.trim().toUpperCase();
    }
    if (typeof updates.model === 'string' && updates.model.trim()) {
      agent.model = updates.model.trim();
    }
    if (Array.isArray(updates.allowedTools)) {
      const runtime = this._buildRuntimeConfig(companyId, {
        role: agent.role,
        templateSlug: agent.templateSlug,
        allowedTools: updates.allowedTools,
        allowedSkills: Array.isArray(updates.allowedSkills) ? updates.allowedSkills : agent.getSkills(),
      });
      agent.allowedTools = new Set(runtime.allowedTools);
      agent.allowedSkills = new Set(runtime.allowedSkills);
    } else if (Array.isArray(updates.allowedSkills)) {
      const runtime = this._buildRuntimeConfig(companyId, {
        role: agent.role,
        templateSlug: agent.templateSlug,
        allowedTools: agent.getTools(),
        allowedSkills: updates.allowedSkills,
      });
      agent.allowedTools = new Set(runtime.allowedTools);
      agent.allowedSkills = new Set(runtime.allowedSkills);
    }
    if (updates.persona && typeof updates.persona === 'object') {
      agent.persona = {
        ...agent.persona,
        ...updates.persona,
      };
    }
    if (updates.policies && typeof updates.policies === 'object') {
      agent.policies = {
        ...agent.policies,
        ...updates.policies,
      };
    }

    await this._persistAgentSnapshot(companyId, agent, updates.audit || {});
    return agent;
  }

  async _persistAgentSnapshot(companyId, agent, audit = {}) {
    try {
      const prisma = getSharedPrismaClient();
      const existing = await prisma.companyAgent.findUnique({
        where: { id: agent.id },
      }).catch(() => null);

      const updateData = {
        name: agent.name,
        role: agent.role,
        model: agent.model || null,
        status: agent.status || 'ACTIVE',
        soul: agent.persona?.soulInstructions || null,
        skills: JSON.stringify(agent.getSkills()),
        templateSlug: agent.templateSlug || null,
        parentId: agent.parentId || null,
        updatedAt: new Date(),
      };

      if (existing) {
        await prisma.companyAgent.update({
          where: { id: agent.id },
          data: updateData,
        });
      } else {
        await prisma.companyAgent.create({
          data: {
            id: agent.id,
            companyId,
            ...updateData,
            createdBy: audit.requestedBy || 'agent_provisioning_service',
          },
        });
      }
    } catch (error) {
      console.warn('[AGENT-PROVISION] Failed to persist agent snapshot to company_agents:', error.message);
    }
  }

  _buildRuntimeConfig(companyId, options = {}) {
    const normalizedRole = String(options.role || '').trim().toUpperCase();
    const hasTemplate = Boolean(options.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(normalizedRole));
    const hasRequestedTools = Array.isArray(options.allowedTools) && options.allowedTools.length > 0;
    const hasRequestedSkills = Array.isArray(options.allowedSkills) && options.allowedSkills.length > 0;

    try {
      return agentProfileLoaderService.buildRuntimeConfig(companyId, {
        ...options,
        role: normalizedRole,
      });
    } catch (error) {
      if (hasTemplate || hasRequestedTools || hasRequestedSkills) {
        throw error;
      }
    }

    const allowedTools = ROLE_TOOL_MAP[normalizedRole] || [];
    return {
      companyId,
      name: options.name || `${normalizedRole || 'CUSTOM'} Agent`,
      role: normalizedRole || 'CUSTOM',
      model: options.model || (normalizedRole === 'CEO' ? 'gemini-2.5-pro' : 'gemini-2.5-flash'),
      modelSource: options.model ? 'explicit' : 'runtime-default',
      allowedTools,
      allowedSkills: [],
      persona: options.persona || {},
      policies: options.policies || {},
    };
  }

  _restoreAgent(companyId, { id, name, role, model, templateSlug, parentId, allowedTools, allowedSkills, soul, status } = {}) {
    if (!companyId || !id || !role) return null;
    if (!this._registry.has(companyId)) this._registry.set(companyId, new Map());
    const existing = this._registry.get(companyId).get(id);
    if (existing) return existing;

    const runtimeConfig = this._buildRuntimeConfig(companyId, {
      name,
      role: String(role).toUpperCase(),
      model,
      templateSlug,
      allowedTools,
      allowedSkills,
    });
    const runtimeSoul = runtimeConfig.persona?.soulInstructions || '';
    const refreshTemplateSoul = shouldRefreshTemplateSoulSnapshot({
      persistedSoul: soul,
      runtimeSoul,
    });
    const soulInstructions = refreshTemplateSoul ? runtimeSoul : soul;

    const agent = new BaseAgent({
      id,
      name: runtimeConfig.name,
      role: runtimeConfig.role,
      companyId,
      allowedTools: runtimeConfig.allowedTools,
      allowedSkills: runtimeConfig.allowedSkills,
      templateSlug: runtimeConfig.persona?.templateSlug || templateSlug,
      version: runtimeConfig.persona?.version,
      model: runtimeConfig.model,
      modelSource: runtimeConfig.modelSource || runtimeConfig.persona?.modelSource,
      status: status === 'PAUSED' ? 'INACTIVE' : (status || 'ACTIVE'),
      persona: {
        ...runtimeConfig.persona,
        ...(soulInstructions ? { soulInstructions } : {}),
        ...(refreshTemplateSoul ? { templateSoulRefreshed: true } : {}),
      },
      policies: runtimeConfig.policies,
      parentId,
    });
    this._registry.get(companyId).set(id, agent);

    const numId = parseInt(id.split('_').pop(), 10);
    if (!isNaN(numId) && numId > this._idCounter) this._idCounter = numId;

    if (parentId) {
      const parent = this.getAgent(companyId, parentId);
      if (parent) parent.addChild(agent);
    }
    return agent;
  }

  getAgent(companyId, agentId) {
    return this._registry.get(companyId)?.get(agentId) || null;
  }

  listAgents(companyId) {
    const map = this._registry.get(companyId);
    return map ? [...map.values()] : [];
  }

  removeRuntimeAgent(companyId, agentId) {
    const map = this._registry.get(companyId);
    if (!map || !agentId) return false;
    const agent = map.get(agentId);
    if (!agent) return false;
    map.delete(agentId);
    for (const candidate of map.values()) {
      if (Array.isArray(candidate.children)) {
        candidate.children = candidate.children.filter(child => child?.id !== agentId);
      }
    }
    return true;
  }

  async reconcileTemplateDefaults(companyId, agent, { persist = true } = {}) {
    if (!companyId || !agent?.templateSlug) return agent;

    let runtime = null;
    try {
      runtime = this._buildRuntimeConfig(companyId, {
        name: agent.name,
        role: agent.role,
        model: agent.model,
        templateSlug: agent.templateSlug,
        persona: agent.persona,
        policies: agent.policies,
      });
    } catch (error) {
      console.warn('[AGENT-PROVISION] Failed to reconcile template defaults:', error.message);
      return agent;
    }

    const currentTools = agent.getTools ? agent.getTools() : [];
    const currentSkills = agent.getSkills ? agent.getSkills() : [];
    const nextTools = [...new Set([...currentTools, ...(runtime.allowedTools || [])])];
    const nextSkills = [...new Set([...currentSkills, ...(runtime.allowedSkills || [])])];
    const changedTools = nextTools.length !== currentTools.length;
    const changedSkills = nextSkills.length !== currentSkills.length;
    const changedVersion = runtime.persona?.version && runtime.persona.version !== agent.version;
    const runtimeSoul = runtime.persona?.soulInstructions || '';
    const refreshTemplateSoul = shouldRefreshTemplateSoulSnapshot({
      persistedSoul: agent.persona?.soulInstructions,
      runtimeSoul,
    });

    if (!changedTools && !changedSkills && !changedVersion && !refreshTemplateSoul) return agent;

    agent.allowedTools = new Set(nextTools);
    agent.allowedSkills = new Set(nextSkills);
    agent.templateSlug = runtime.persona?.templateSlug || agent.templateSlug;
    agent.version = runtime.persona?.version || agent.version;
    agent.persona = {
      ...(agent.persona || {}),
      templateSlug: runtime.persona?.templateSlug || agent.templateSlug,
      version: runtime.persona?.version || agent.version,
      agentInstructions: runtime.persona?.agentInstructions || agent.persona?.agentInstructions || '',
      toolsInstructions: runtime.persona?.toolsInstructions || agent.persona?.toolsInstructions || '',
      soulInstructions: refreshTemplateSoul ? runtimeSoul : (agent.persona?.soulInstructions || runtimeSoul || ''),
      ...(refreshTemplateSoul ? { templateSoulRefreshed: true } : {}),
      skillInstructions: runtime.persona?.skillInstructions || agent.persona?.skillInstructions || [],
    };
    agent.policies = {
      ...(runtime.policies || {}),
      ...(agent.policies || {}),
    };

    if (persist) {
      await this._persistAgentSnapshot(companyId, agent, {
        source: 'template-default-reconcile',
        missingToolsAdded: nextTools.filter(tool => !currentTools.includes(tool)),
        missingSkillsAdded: nextSkills.filter(skill => !currentSkills.includes(skill)),
      });
    }

    return agent;
  }

  decommission(companyId, agentId) {
    const agent = this.getAgent(companyId, agentId);
    if (agent) {
      agent.deactivate();

      // Persist status change to CompanyAgent table (fire-and-forget)
      try {
        const prisma = getSharedPrismaClient();
        prisma.companyAgent.update({
          where: { id: agentId },
          data: {
            status: 'INACTIVE',
            updatedAt: new Date(),
          },
        }).catch(err => {
          console.warn('[AGENT-PROVISION] Failed to update decommission status:', err.message);
        });
      } catch (_) {}

      return true;
    }
    return false;
  }

  /**
   * Validates that an agent can ONLY access its scoped tools.
   */
  validateToolAccess(companyId, agentId, toolName) {
    const agent = this.getAgent(companyId, agentId);
    if (!agent) return { allowed: false, reason: 'AGENT_NOT_FOUND' };
    if (agent.status !== 'ACTIVE') return { allowed: false, reason: 'AGENT_INACTIVE' };
    if (!agent.canUseTool(toolName)) return { allowed: false, reason: 'TOOL_NOT_PERMITTED', agent: agent.role, tool: toolName };
    return { allowed: true };
  }

  _reset() {
    this._registry.clear();
    this._idCounter = 0;
    // NOTE: We no longer delete from ai_provider_logs (historical diagnostics).
    // In test environments, CompanyAgent rows can be cleaned up separately.
  }
}

module.exports = new AgentProvisioningService();
