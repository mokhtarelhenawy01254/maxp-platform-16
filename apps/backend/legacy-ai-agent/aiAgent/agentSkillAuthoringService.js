const fs = require('fs');
const path = require('path');
const agentFileSystemService = require('./agentFileSystemService');
const toolRegistryService = require('./toolRegistryService');
const skillRegistryService = require('./skillRegistryService');

function normalizeOptionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeStringList(value, limit = 12) {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeOptionalString(item))
      .filter(Boolean)
      .slice(0, limit);
  }
  if (typeof value !== 'string') return [];
  return value
    .split(/[,،\n]/)
    .map(item => normalizeOptionalString(item))
    .filter(Boolean)
    .slice(0, limit);
}

function slugifySkillId(value = '') {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
  return slug || `skill-${Date.now().toString(36)}`;
}

function titleizeSkillId(value = '') {
  const words = String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  if (words.length === 0) return null;
  return words
    .map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function firstSentence(value = '', limit = 90) {
  const text = normalizeOptionalString(value);
  if (!text) return null;
  const sentence = text.split(/[.!؟\n]/)[0]?.trim() || text;
  return sentence.slice(0, limit).trim() || null;
}

function assertSafeSkillId(skillId) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(skillId)) {
    throw new Error('SKILL_ID_INVALID: use lowercase letters, numbers, and hyphens only');
  }
  if (skillId.includes('..') || skillId.includes('/') || skillId.includes('\\')) {
    throw new Error('SKILL_ID_INVALID');
  }
}

function markdownList(items, fallback) {
  const list = normalizeStringList(items, 20);
  if (list.length === 0 && fallback) return `- ${fallback}`;
  return list.map(item => `- ${item}`).join('\n');
}

function numberedList(items, fallback) {
  const list = normalizeStringList(items, 20);
  if (list.length === 0 && fallback) return `1. ${fallback}`;
  return list.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function buildSkillMarkdown({ id, displayName, description, purpose, triggerPhrases, steps, constraints, examples, allowedTools }) {
  const toolLines = allowedTools.length
    ? allowedTools.map(tool => `- \`${tool}\``).join('\n')
    : '- No API tools required.';

  return `# ${displayName}

## Purpose
${purpose || description}

## When To Use
${markdownList(triggerPhrases, description)}

## Workflow
${numberedList(steps, 'Clarify the user goal, inspect relevant context, act through approved tools only, then report the result.')}

## Tools
${toolLines}

## Constraints
${markdownList(constraints, 'Do not claim that an external action succeeded unless the tool result confirms it.')}

## Examples
${markdownList(examples, `User asks for ${displayName}; use this skill and produce a grounded response.`)}

## Metadata
- Skill id: \`${id}\`
- Created by: \`skill.create\`
`;
}

class AgentSkillAuthoringService {
  async createSkill(companyId, request = {}) {
    if (!companyId) throw new Error('companyId is required');

    const requestedDescription = normalizeOptionalString(request.description || request.purpose);
    const displayName = normalizeOptionalString(request.displayName || request.name || request.title)
      || titleizeSkillId(request.id || request.skillId)
      || firstSentence(requestedDescription);
    const description = requestedDescription
      || (displayName ? `Skill workflow for ${displayName}.` : null);
    if (!displayName) throw new Error('SKILL_DISPLAY_NAME_REQUIRED');
    if (!description) throw new Error('SKILL_DESCRIPTION_REQUIRED');

    const id = slugifySkillId(request.id || request.skillId || displayName);
    assertSafeSkillId(id);

    const requestedTools = normalizeStringList(request.allowedTools, 20);
    if (requestedTools.length > 3) throw new Error('SKILL_TOO_MANY_TOOLS');
    const allowedTools = requestedTools.slice(0, 3);
    const toolValidation = toolRegistryService.validateToolNames(allowedTools);
    if (!toolValidation.valid) {
      throw new Error(`SKILL_UNKNOWN_TOOLS:${toolValidation.unknown.join(',')}`);
    }

    const skillDir = agentFileSystemService.resolveSharedSkillDir(id);
    const sharedRoot = path.resolve(agentFileSystemService.getWritableSharedSkillsRoot());
    const resolvedDir = path.resolve(skillDir);
    if (!resolvedDir.startsWith(sharedRoot + path.sep)) {
      throw new Error('SKILL_PATH_OUTSIDE_SHARED_ROOT');
    }
    if (fs.existsSync(resolvedDir) && request.overwrite !== true) {
      throw new Error(`SKILL_ALREADY_EXISTS:${id}`);
    }

    const triggerPhrases = normalizeStringList(request.triggerPhrases || request.triggers, 20);
    const steps = normalizeStringList(request.steps || request.workflow, 20);
    const constraints = normalizeStringList(request.constraints || request.rules, 20);
    const examples = normalizeStringList(request.examples, 12);
    const purpose = normalizeOptionalString(request.purpose) || description;
    const assignToAgentId = normalizeOptionalString(request.assignToAgentId);
    let targetAgent = null;
    if (assignToAgentId) {
      const agentProvisioningService = require('./agentProvisioningService');
      targetAgent = agentProvisioningService.getAgent(companyId, assignToAgentId);
      if (!targetAgent) throw new Error(`SKILL_ASSIGN_AGENT_NOT_FOUND:${assignToAgentId}`);
      const missingTools = allowedTools.filter(tool => !targetAgent.canUseTool(tool));
      if (missingTools.length > 0) {
        throw new Error(`SKILL_ASSIGNMENT_TOOL_MISMATCH:${missingTools.join(',')}`);
      }
    }
    const now = new Date().toISOString();

    const manifest = {
      id,
      displayName,
      version: '0.1.0',
      description,
      allowedTools,
      requiresHumanApproval: request.requiresHumanApproval !== false,
      maxToolCount: allowedTools.length,
      createdBy: 'skill.create',
      createdForCompanyId: companyId,
      createdAt: now,
    };

    const skillMd = buildSkillMarkdown({
      id,
      displayName,
      description,
      purpose,
      triggerPhrases,
      steps,
      constraints,
      examples,
      allowedTools,
    });

    fs.mkdirSync(resolvedDir, { recursive: true });
    fs.writeFileSync(path.join(resolvedDir, 'skill.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(resolvedDir, 'SKILL.md'), skillMd, 'utf8');
    skillRegistryService._resetCache();
    const verifiedSkill = skillRegistryService.getSkill(id);
    if (!verifiedSkill) {
      throw new Error(`SKILL_PERSIST_VERIFY_FAILED:${id}`);
    }

    let assignedTo = null;
    if (targetAgent) {
      const agentProvisioningService = require('./agentProvisioningService');
      const nextSkills = [...new Set([...(targetAgent.getSkills ? targetAgent.getSkills() : []), id])];
      const updatedAgent = await agentProvisioningService.updateAgent(companyId, targetAgent.id, {
        allowedSkills: nextSkills,
        audit: {
          source: 'skill.create',
          requestedBy: request.requestedBy || null,
        },
      });
      assignedTo = {
        id: updatedAgent.id,
        name: updatedAgent.name,
        role: updatedAgent.role,
        allowedSkills: updatedAgent.getSkills ? updatedAgent.getSkills() : nextSkills,
      };
    }

    return {
      id,
      displayName,
      description,
      allowedTools,
      requiresHumanApproval: manifest.requiresHumanApproval,
      version: manifest.version,
      files: ['skill.json', 'SKILL.md'],
      sharedPath: `${sharedRoot}${path.sep}${id}`,
      assignedTo,
      message: 'Skill files created and registered in the shared skill registry.',
    };
  }
}

module.exports = new AgentSkillAuthoringService();
module.exports._private = {
  slugifySkillId,
  normalizeStringList,
  buildSkillMarkdown,
};
