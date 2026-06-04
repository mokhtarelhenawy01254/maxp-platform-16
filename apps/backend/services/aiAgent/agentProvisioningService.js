const BaseAgent = require('./BaseAgent');
const { getSharedPrismaClient } = require('../sharedDatabase');
const agentProfileLoaderService = require('./agentProfileLoaderService');
const { getAiServiceMode } = require('./aiServiceRouter');
const agentAiServiceClient = require('./agentAiServiceClient');
const crypto = require('crypto');

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

function createAgentFromConfig(companyId, config) {
  const role = String(config.role || '').toUpperCase();

  // CEO keeps orchestration logic; everything else is config-driven
  if (role === 'CEO') {
    const CEOAgent = require('./CEOAgent');
    return new CEOAgent(companyId, config);
  }

  // All specialist agents are now BaseAgent + template config
  const agentProfileLoaderService = require('./agentProfileLoaderService');
  const templateSlug = config.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(role);
  if (templateSlug) {
    return BaseAgent.fromTemplate(templateSlug, companyId, config);
  }

  // Fallback: plain BaseAgent with provided config
  return new BaseAgent(config);
}

class AgentProvisioningService {
  constructor() {
    /** @type {Map<string, Map<string, BaseAgent>>} companyId -> agentId -> agent */
    this._registry = new Map();
    if (getAiServiceMode() !== 'primary') {
      this._initRecovery();
    }
  }

  /**
   * Recovers provisioned agents asynchronously from CompanyAgent table
   * and optionally from the ai-service.
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
              // Agent recovered successfully
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

        // Also fetch agents from ai-service if primary mode
        if (agentAiServiceClient.isAiServicePrimary()) {
          this._syncFromRemote().catch(e => {
            console.warn('[AGENT-PROVISION-RECOVERY] Remote sync failed:', e.message);
          });
        }
      }).catch(err => {
        console.warn('[AGENT-PROVISION-RECOVERY] Failed to recover from company_agents:', err.message);
      });
    } catch (_) {}
  }

  async _syncFromRemote() {
    // Collect all unique company IDs from local registry
    const companyIds = new Set(this._registry.keys());
    if (companyIds.size === 0) return;

    for (const companyId of companyIds) {
      try {
        const remoteAgents = await agentAiServiceClient.listAgents(companyId, { status: 'ACTIVE' });
        const localMap = this._registry.get(companyId) || new Map();
        const localIds = new Set(localMap.keys());

        for (const remote of remoteAgents) {
          if (!localIds.has(remote.id)) {
            // Agent exists in remote but not locally — restore it
            this._restoreAgent(companyId, {
              id: remote.id,
              name: remote.name,
              role: remote.role,
              model: remote.model || undefined,
              templateSlug: remote.template_slug || undefined,
              parentId: remote.parent_id || undefined,
              allowedTools: remote.allowed_tools || [],
              allowedSkills: remote.allowed_skills || [],
              soul: remote.persona?.soulInstructions || null,
              status: remote.status,
            });
          }
        }
        console.log(`[AGENT-PROVISION-RECOVERY] Synced ${remoteAgents.length} agent(s) from ai-service for company ${companyId}`);
      } catch (e) {
        console.warn(`[AGENT-PROVISION-RECOVERY] Failed to sync agents from remote for ${companyId}:`, e.message);
      }
    }
  }

  /**
   * Spawns a new agent with role-based tool scoping.
   */
  async spawn(companyId, {
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
    let runtimeConfig = this._buildRuntimeConfig(companyId, {
      name,
      role: normalizedRole,
      model,
      persona,
      policies,
      allowedTools: requestedTools,
      allowedSkills: requestedSkills,
      templateSlug,
    });

    // Enforce canonical tool scope for known roles (ignore stale DB/tools)
    runtimeConfig = this._enforceRoleToolScope(runtimeConfig, requestedTools);

    let agentId = `agent_${companyId.slice(-6)}_${crypto.randomUUID()}`;

    // If ai-service is primary, spawn via ai-service first
    if (agentAiServiceClient.isAiServicePrimary()) {
      try {
        const remote = await agentAiServiceClient.spawnAgent(companyId, {
          name: runtimeConfig.name,
          role: runtimeConfig.role,
          model: runtimeConfig.model,
          template_slug: runtimeConfig.persona?.templateSlug || templateSlug,
          allowed_tools: runtimeConfig.allowedTools,
          allowed_skills: runtimeConfig.allowedSkills,
          persona: runtimeConfig.persona,
          guardrails: runtimeConfig.policies?.guardrails,
          budget: runtimeConfig.policies?.budget,
          parent_id: parentId,
          config: {},
        });
        if (remote?.id) {
          agentId = remote.id;
        }
        Object.assign(runtimeConfig, { name: remote.name, role: remote.role, model: remote.model });
      } catch (e) {
        console.warn('[AGENT-PROVISION] AI service spawn failed, falling back to local:', e.message);
      }
    }

    const agent = createAgentFromConfig(companyId, {
      id: agentId,
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

    // Register MCP servers from template if any
    if (agent.templateSlug) {
      try {
        const profile = agentProfileLoaderService.loadProfile(agent.templateSlug);
        if (profile?.mcpServers?.length > 0) {
          const { getMcpRegistry } = require('./McpServerRegistry');
          const mcpRegistry = getMcpRegistry();
          for (const mcpConfig of profile.mcpServers) {
            await mcpRegistry.registerServer(mcpConfig.name, mcpConfig);
          }
          // Add MCP tools to the agent
          const mcpTools = mcpRegistry.getAllAgentTools();
          for (const tool of mcpTools) {
            agent.allowedTools.add(tool.name);
          }
        }
      } catch (e) {
        console.warn('[AGENT-PROVISION] Could not load MCP servers from template:', e.message);
      }
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

    // Sync with ai-service if primary mode
    if (agentAiServiceClient.isAiServicePrimary()) {
      try {
        await agentAiServiceClient.updateAgent(agentId, {
          name: updates.name,
          model: updates.model,
          allowed_tools: updates.allowedTools,
          allowed_skills: updates.allowedSkills,
          persona: updates.persona,
          guardrails: updates.policies?.guardrails,
          budget: updates.policies?.budget,
          config: updates.config,
        });
      } catch (e) {
        console.warn('[AGENT-PROVISION] AI service update failed:', e.message);
      }
    }

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
      // Enforce canonical tool scope after UI/DB update
      const scoped = this._enforceRoleToolScope(runtime, updates.allowedTools);
      agent.allowedTools = new Set(scoped.allowedTools);
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

    // Invalidate cached system prompt so next turn picks up changes immediately
    if (typeof agent.clearPromptCache === 'function') {
      agent.clearPromptCache();
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

    let allowedTools = [];
    const templateSlug = options.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(normalizedRole);
    if (templateSlug) {
      try {
        const profile = agentProfileLoaderService.loadProfile(templateSlug);
        allowedTools = profile.allowedTools || [];
      } catch (e) {
        console.warn('[AGENT-PROVISION] Could not load template for tools:', e.message);
      }
    }
    return {
      companyId,
      name: options.name || `${normalizedRole || 'CUSTOM'} Agent`,
      role: normalizedRole || 'CUSTOM',
      model: options.model || null,
      modelSource: options.model ? 'explicit' : 'runtime-default',
      allowedTools,
      allowedSkills: [],
      persona: options.persona || {},
      policies: options.policies || {},
    };
  }

  /**
   * Enforces canonical tool list from agent template profile for known roles.
   * The canonical list acts as an allowlist: the runtime config may only
   * use tools that exist in the template's allowedTools for its role.
   * - If UI/DB sends a subset of canonical tools → uses that subset.
   * - If UI/DB sends tools outside canonical → filters them out.
   * - If no tools are specified → falls back to the full canonical list.
   * @param {Object} runtimeConfig
   * @param {string[]|undefined} requestedTools - Tools explicitly passed from UI/DB (undefined if not provided)
   */
  _enforceRoleToolScope(runtimeConfig, requestedTools) {
    const role = String(runtimeConfig.role || '').toUpperCase();
    const templateSlug = runtimeConfig.templateSlug || agentProfileLoaderService.getTemplateSlugForRole(role);
    let canonicalTools = [];
    if (templateSlug) {
      try {
        const profile = agentProfileLoaderService.loadProfile(templateSlug);
        canonicalTools = profile.allowedTools || [];
      } catch (e) {
        console.warn('[AGENT-PROVISION] Could not load template for tool scope:', e.message);
      }
    }
    if (!canonicalTools.length) {
      return { ...runtimeConfig, allowedTools: requestedTools || [] };
    }
    if (!requestedTools || requestedTools.length === 0) {
      return { ...runtimeConfig, allowedTools: canonicalTools };
    }
    const scoped = requestedTools.filter(t => canonicalTools.includes(t));
    return { ...runtimeConfig, allowedTools: scoped.length > 0 ? scoped : canonicalTools };
  }

  _restoreAgent(companyId, { id, name, role, model, templateSlug, parentId, allowedTools, allowedSkills, soul, status } = {}) {
    if (!companyId || !id || !role) return null;
    if (!this._registry.has(companyId)) this._registry.set(companyId, new Map());
    const existing = this._registry.get(companyId).get(id);
    if (existing) return existing;

    let runtimeConfig = this._buildRuntimeConfig(companyId, {
      name,
      role: String(role).toUpperCase(),
      model,
      templateSlug,
      allowedTools,
      allowedSkills,
    });
    // Enforce canonical tool scope for known roles (ignore stale DB/tools)
    runtimeConfig = this._enforceRoleToolScope(runtimeConfig, allowedTools);

    // For known roles, always load template SOUL if persisted soul is empty/stale
    let runtimeSoul = runtimeConfig.persona?.soulInstructions || '';
    if (!runtimeSoul && agentProfileLoaderService.getTemplateSlugForRole(runtimeConfig.role)) {
      try {
        const slug = templateSlug || agentProfileLoaderService.getTemplateSlugForRole(runtimeConfig.role);
        if (slug) {
          const profile = agentProfileLoaderService.loadProfile(slug);
          runtimeSoul = profile.instructions?.soul || '';
          runtimeConfig.persona = {
            ...runtimeConfig.persona,
            soulInstructions: runtimeSoul,
            agentInstructions: profile.instructions?.agents || runtimeConfig.persona?.agentInstructions || '',
            toolsInstructions: profile.instructions?.tools || runtimeConfig.persona?.toolsInstructions || '',
          };
        }
      } catch (_) {}
    }

    const refreshTemplateSoul = shouldRefreshTemplateSoulSnapshot({
      persistedSoul: soul,
      runtimeSoul,
    });
    const soulInstructions = refreshTemplateSoul ? runtimeSoul : (soul || runtimeSoul);

    const agent = createAgentFromConfig(companyId, {
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

  async refreshAgentFromRemote(companyId, agentId) {
    if (!agentAiServiceClient.isAiServicePrimary()) return null;
    try {
      const remote = await agentAiServiceClient.getAgent(agentId);
      if (!remote || remote.company_id !== companyId) return null;
      const agent = this._restoreAgent(companyId, {
        id: remote.id,
        name: remote.name,
        role: remote.role,
        model: remote.model || undefined,
        templateSlug: remote.template_slug || undefined,
        parentId: remote.parent_id || undefined,
        allowedTools: remote.allowed_tools || [],
        allowedSkills: remote.allowed_skills || [],
        soul: remote.persona?.soulInstructions || null,
        status: remote.status,
      });
      return agent;
    } catch (e) {
      console.warn('[AGENT-PROVISION] Failed to refresh agent from remote:', e.message);
      return null;
    }
  }

  removeRuntimeAgent(companyId, agentId) {
    const map = this._registry.get(companyId);
    if (!map || !agentId) return false;
    const agent = map.get(agentId);
    if (!agent) return false;
    map.delete(agentId);
    for (const candidate of map.values()) {
      if (Array.isArray(candidate._children)) {
        candidate._children = candidate._children.filter(child => child?.id !== agentId);
      }
    }
    return true;
  }

  async reconcileTemplateDefaults(companyId, agent, { persist = true } = {}) {
    if (!companyId || !agent?.templateSlug) return agent;

    // Sync with ai-service if primary mode
    if (agentAiServiceClient.isAiServicePrimary()) {
      try {
        await agentAiServiceClient.reconcileAgent(agent.id);
      } catch (e) {
        console.warn('[AGENT-PROVISION] AI service reconcile failed:', e.message);
      }
    }

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

    // Sync with ai-service if primary mode
    if (agentAiServiceClient.isAiServicePrimary()) {
      agentAiServiceClient.archiveAgent(agentId).catch(e => {
        console.warn('[AGENT-PROVISION] AI service archive failed:', e.message);
      });
    }

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
    if (agentId === 'ai-service') {
      return { allowed: true, role: 'AI_SERVICE_BRIDGE' };
    }
    const agent = this.getAgent(companyId, agentId);
    if (!agent) return { allowed: false, reason: 'AGENT_NOT_FOUND' };
    if (agent.status !== 'ACTIVE') return { allowed: false, reason: 'AGENT_INACTIVE' };
    if (!agent.canUseTool(toolName)) return { allowed: false, reason: 'TOOL_NOT_PERMITTED', agent: agent.role, tool: toolName };
    return { allowed: true };
  }

  _reset() {
    this._registry.clear();
    // NOTE: We no longer delete from ai_provider_logs (historical diagnostics).
    // In test environments, CompanyAgent rows can be cleaned up separately.
  }
}

module.exports = new AgentProvisioningService();
