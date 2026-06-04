const agentFileSystemService = require('./agentFileSystemService');
const toolRegistryService = require('./toolRegistryService');
const fs = require('fs');
const path = require('path');

class SkillRegistryService {
  constructor() {
    this._cache = null;
  }

  _buildCacheKey() {
    try {
      return agentFileSystemService.listSharedSkillEntries()
        .map(entry => {
          const manifestPath = path.join(entry.root, 'skill.json');
          const skillPath = path.join(entry.root, 'SKILL.md');
          const manifestMtime = fs.existsSync(manifestPath)
            ? fs.statSync(manifestPath).mtimeMs
            : 0;
          const skillMtime = fs.existsSync(skillPath)
            ? fs.statSync(skillPath).mtimeMs
            : 0;
          return `${entry.id}:${manifestMtime}:${skillMtime}`;
        })
        .join('|');
    } catch (_) {
      return `uncached:${Date.now()}`;
    }
  }

  loadSkills({ force = false } = {}) {
    const cacheKey = this._buildCacheKey();
    if (!this._cache || force || this._cache.cacheKey !== cacheKey) {
      const skills = agentFileSystemService.listSharedSkillIds()
        .map(skillId => agentFileSystemService.loadSkillFiles(skillId))
        .map(files => this._normalizeSkill(files));
      this._cache = {
        cacheKey,
        skills,
        byId: new Map(skills.map(skill => [skill.id, skill])),
      };
    }
    return this._cache;
  }

  _normalizeSkill(files) {
    const manifest = files.manifest || {};
    const allowedTools = Array.isArray(manifest.allowedTools) ? manifest.allowedTools : [];
    const toolValidation = toolRegistryService.validateToolNames(allowedTools);
    if (!toolValidation.valid) {
      throw new Error(`Skill ${files.id} references unknown tools: ${toolValidation.unknown.join(', ')}`);
    }
    if (allowedTools.length > 3) {
      throw new Error(`Skill ${files.id} exposes more than 3 tools`);
    }

    return {
      id: manifest.id || files.id,
      displayName: manifest.displayName || files.id,
      version: manifest.version || '0.0.0',
      description: manifest.description || '',
      allowedTools,
      requiresHumanApproval: Boolean(manifest.requiresHumanApproval),
      maxToolCount: manifest.maxToolCount || allowedTools.length,
      skillMd: files.skillMd,
      root: files.root,
    };
  }

  listSkills() {
    return this.loadSkills().skills.map(skill => ({ ...skill }));
  }

  getSkill(skillId) {
    const skill = this.loadSkills().byId.get(skillId);
    return skill ? { ...skill } : null;
  }

  validateSkillIds(skillIds = []) {
    const unknown = skillIds.filter(skillId => !this.getSkill(skillId));
    return {
      valid: unknown.length === 0,
      unknown,
    };
  }

  getSkillsForIds(skillIds = []) {
    return skillIds.map(skillId => this.getSkill(skillId)).filter(Boolean);
  }

  _resetCache() {
    this._cache = null;
  }
}

module.exports = new SkillRegistryService();
