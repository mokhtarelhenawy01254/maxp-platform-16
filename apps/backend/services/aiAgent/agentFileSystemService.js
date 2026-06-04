const fs = require('fs');
const path = require('path');

const AGENTS_ROOT = path.resolve(__dirname, '../../agents');
const SHARED_ROOT = path.join(AGENTS_ROOT, '_shared');
const SHARED_SKILLS_ROOT = path.join(SHARED_ROOT, 'skills');
const PRODUCTION_RUNTIME_SKILLS_ROOT = '/var/www/shared/agent-skills';

function normalizePathForCheck(value = '') {
  return String(value || '').replace(/\\/g, '/');
}

function resolveConfiguredRuntimeSkillsRoot() {
  const configured = process.env.AGENT_RUNTIME_SKILLS_ROOT || process.env.AGENT_SHARED_SKILLS_ROOT;
  if (configured) return path.resolve(configured);

  const cwd = normalizePathForCheck(process.cwd());
  const serviceDir = normalizePathForCheck(__dirname);
  const productionLike = process.env.NODE_ENV === 'production'
    || cwd.startsWith('/var/www/backend')
    || serviceDir.includes('/var/www/backend');

  return productionLike ? PRODUCTION_RUNTIME_SKILLS_ROOT : null;
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (_) {
    return false;
  }
}

function listDirectories(root) {
  if (!isDirectory(root)) return [];
  return fs.readdirSync(root)
    .map(name => ({ name, fullPath: path.join(root, name) }))
    .filter(entry => isDirectory(entry.fullPath));
}

class AgentFileSystemService {
  getAgentsRoot() {
    return AGENTS_ROOT;
  }

  getSharedRoot() {
    return SHARED_ROOT;
  }

  getSharedSkillsRoot() {
    return SHARED_SKILLS_ROOT;
  }

  getRuntimeSharedSkillsRoot() {
    return resolveConfiguredRuntimeSkillsRoot();
  }

  getWritableSharedSkillsRoot() {
    return this.getRuntimeSharedSkillsRoot() || SHARED_SKILLS_ROOT;
  }

  getSharedSkillsRoots({ includeMissing = false, writableFirst = true } = {}) {
    const roots = [];
    const runtimeRoot = this.getRuntimeSharedSkillsRoot();
    if (writableFirst && runtimeRoot) roots.push(runtimeRoot);
    roots.push(SHARED_SKILLS_ROOT);
    if (!writableFirst && runtimeRoot) roots.push(runtimeRoot);

    return [...new Set(roots.map(root => path.resolve(root)))]
      .filter(root => includeMissing || isDirectory(root));
  }

  resolveAgentDir(slug) {
    if (!slug || /[\\/]/.test(slug)) {
      throw new Error('Invalid agent slug');
    }
    return path.join(AGENTS_ROOT, slug);
  }

  resolveSharedSkillDir(skillId, options = {}) {
    if (!skillId || /[\\/]/.test(skillId)) {
      throw new Error('Invalid skill id');
    }
    const root = options.root
      ? path.resolve(options.root)
      : (options.writable === false ? SHARED_SKILLS_ROOT : this.getWritableSharedSkillsRoot());
    return path.join(root, skillId);
  }

  listAgentSlugs() {
    return listDirectories(AGENTS_ROOT)
      .map(entry => entry.name)
      .filter(name => name !== '_shared')
      .filter(name => fs.existsSync(path.join(AGENTS_ROOT, name, 'agent.json')))
      .sort();
  }

  listSharedSkillIds() {
    return this.listSharedSkillEntries().map(entry => entry.id);
  }

  listSharedSkillEntries() {
    const byId = new Map();
    for (const root of this.getSharedSkillsRoots({ writableFirst: true })) {
      for (const entry of listDirectories(root)) {
        if (!fs.existsSync(path.join(entry.fullPath, 'skill.json'))) continue;
        if (!byId.has(entry.name)) {
          byId.set(entry.name, { id: entry.name, root: entry.fullPath });
        }
      }
    }
    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  loadAgentFiles(slug) {
    const agentDir = this.resolveAgentDir(slug);
    const manifestPath = path.join(agentDir, 'agent.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Agent template not found: ${slug}`);
    }

    const manifest = readJson(manifestPath);
    return {
      slug,
      root: agentDir,
      manifest,
      agentsMd: readTextIfExists(path.join(agentDir, manifest.instructions?.agents || 'AGENTS.md')),
      soulMd: readTextIfExists(path.join(agentDir, manifest.instructions?.soul || 'SOUL.md')),
      toolsMd: readTextIfExists(path.join(agentDir, manifest.instructions?.tools || 'TOOLS.md')),
    };
  }

  loadSharedToolRegistry() {
    return readJson(path.join(SHARED_ROOT, 'tool-registry.json'));
  }

  loadSkillFiles(skillId) {
    let skillDir = null;
    for (const root of this.getSharedSkillsRoots({ writableFirst: true })) {
      const candidate = this.resolveSharedSkillDir(skillId, { root });
      if (fs.existsSync(path.join(candidate, 'skill.json'))) {
        skillDir = candidate;
        break;
      }
    }
    if (!skillDir) throw new Error(`Skill not found: ${skillId}`);
    const manifestPath = path.join(skillDir, 'skill.json');

    return {
      id: skillId,
      root: skillDir,
      manifest: readJson(manifestPath),
      skillMd: readTextIfExists(path.join(skillDir, 'SKILL.md')),
    };
  }
}

module.exports = new AgentFileSystemService();
module.exports._private = {
  AGENTS_ROOT,
  SHARED_ROOT,
  SHARED_SKILLS_ROOT,
  readTextIfExists,
  readJson,
};
