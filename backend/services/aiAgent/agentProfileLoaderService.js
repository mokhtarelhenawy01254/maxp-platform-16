const agentFileSystemService = require('./agentFileSystemService');
const toolRegistryService = require('./toolRegistryService');
const skillRegistryService = require('./skillRegistryService');

const ROLE_TEMPLATE_MAP = {
  CEO: 'manager-ceo',
  MANAGER: 'manager-ceo',
  SALES: 'sales-agent',
  FACEBOOK: 'facebook-sales-support-agent',
  MESSENGER: 'facebook-sales-support-agent',
  FACEBOOK_SALES_SUPPORT: 'facebook-sales-support-agent',
  SUPPORT: 'support-agent',
  SHIPPING: 'support-agent',
  INVENTORY: 'inventory-pricing-agent',
  MARKETING: 'marketing-agent',
  SAS_SALES: 'sas-sales-agent',
};

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function subsetOrThrow(requested, allowed, label) {
  const disallowed = requested.filter(item => !allowed.includes(item));
  if (disallowed.length > 0) {
    throw new Error(`${label} not allowed by template: ${disallowed.join(', ')}`);
  }
}

class AgentProfileLoaderService {
  getTemplateSlugForRole(role) {
    return ROLE_TEMPLATE_MAP[normalizeRole(role)] || null;
  }

  listProfiles() {
    return agentFileSystemService.listAgentSlugs().map(slug => this.loadProfile(slug));
  }

  loadProfile(slug) {
    const files = agentFileSystemService.loadAgentFiles(slug);
    const manifest = files.manifest || {};
    const allowedTools = unique(manifest.allowedTools || []);
    const allowedSkills = unique(manifest.allowedSkills || []);

    const toolValidation = toolRegistryService.validateToolNames(allowedTools);
    if (!toolValidation.valid) {
      throw new Error(`Agent ${slug} references unknown tools: ${toolValidation.unknown.join(', ')}`);
    }

    const skillValidation = skillRegistryService.validateSkillIds(allowedSkills);
    if (!skillValidation.valid) {
      throw new Error(`Agent ${slug} references unknown skills: ${skillValidation.unknown.join(', ')}`);
    }

    const skills = skillRegistryService.getSkillsForIds(allowedSkills);
    for (const skill of skills) {
      subsetOrThrow(skill.allowedTools, allowedTools, `Skill ${skill.id} tool`);
    }

    return {
      slug,
      name: manifest.name || slug,
      role: normalizeRole(manifest.role || slug),
      version: manifest.version || '0.0.0',
      modelPolicy: manifest.modelPolicy || {},
      allowedTools,
      allowedSkills,
      skills,
      channels: manifest.channels || [],
      budget: manifest.budget || {},
      instructions: {
        agents: files.agentsMd,
        soul: files.soulMd,
        tools: files.toolsMd,
      },
      root: files.root,
    };
  }

  buildRuntimeConfig(companyId, options = {}) {
    const role = normalizeRole(options.role);
    const templateSlug = options.templateSlug || this.getTemplateSlugForRole(role);
    const profile = templateSlug ? this.loadProfile(templateSlug) : null;
    const templateTools = profile?.allowedTools || [];
    const templateSkills = profile?.allowedSkills || [];
    const requestedTools = unique(options.allowedTools || []);
    const requestedSkills = unique(options.allowedSkills || []);

    let allowedTools = requestedTools.length > 0 ? requestedTools : templateTools;
    let allowedSkills = requestedSkills.length > 0 ? requestedSkills : templateSkills;
    if (requestedTools.length > 0 && requestedSkills.length === 0) {
      allowedSkills = templateSkills.filter((skillId) => {
        const skill = skillRegistryService.getSkill(skillId);
        return skill && skill.allowedTools.every(tool => allowedTools.includes(tool));
      });
    }

    const toolValidation = toolRegistryService.validateToolNames(allowedTools);
    if (!toolValidation.valid) {
      throw new Error(`Unknown tools: ${toolValidation.unknown.join(', ')}`);
    }

    const skillValidation = skillRegistryService.validateSkillIds(allowedSkills);
    if (!skillValidation.valid) {
      throw new Error(`Unknown skills: ${skillValidation.unknown.join(', ')}`);
    }

    if (profile && requestedTools.length > 0) {
      subsetOrThrow(requestedTools, templateTools, 'Requested tool');
    }
    // Runtime-created skills are allowed for template-backed agents only when
    // their own tool scope is already covered by the agent tool scope below.
    const skills = skillRegistryService.getSkillsForIds(allowedSkills);
    for (const skill of skills) {
      subsetOrThrow(skill.allowedTools, allowedTools, `Skill ${skill.id} tool`);
    }

    const hasRequestedModel = Boolean(options.model);
    const model = options.model || profile?.modelPolicy?.default || (role === 'CEO' ? 'gemini-2.5-pro' : 'gemini-2.5-flash');
    const modelSource = hasRequestedModel
      ? 'explicit'
      : (profile?.modelPolicy?.default ? 'policy-default' : 'runtime-default');
    const personaOverrides = Object.fromEntries(
      Object.entries(options.persona || {}).filter(([, value]) => value !== undefined)
    );
    const policiesOverrides = Object.fromEntries(
      Object.entries(options.policies || {}).filter(([, value]) => value !== undefined)
    );

    return {
      companyId,
      name: options.name || profile?.name || `${role || 'CUSTOM'} Agent`,
      role: role || profile?.role || 'CUSTOM',
      model,
      modelSource,
      allowedTools,
      allowedSkills,
      persona: {
        ...personaOverrides,
        templateSlug,
        version: profile?.version || null,
        modelSource,
        modelPolicy: profile?.modelPolicy || {},
        agentInstructions: profile?.instructions?.agents || '',
        soulInstructions: personaOverrides.soulInstructions || profile?.instructions?.soul || '',
        toolsInstructions: profile?.instructions?.tools || '',
        skillInstructions: skills.map(skill => ({
          id: skill.id,
          displayName: skill.displayName,
          skillMd: skill.skillMd,
        })),
      },
      policies: {
        modelPolicy: profile?.modelPolicy || {},
        budget: profile?.budget || {},
        channels: profile?.channels || [],
        ...policiesOverrides,
      },
      profile,
    };
  }
}

module.exports = new AgentProfileLoaderService();
module.exports._private = { ROLE_TEMPLATE_MAP, normalizeRole, unique, subsetOrThrow };
