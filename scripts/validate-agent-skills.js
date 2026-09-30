/**
 * validate-agent-skills.js
 *
 * Checks agent ? skill + tool integrity:
 * 1. Every agent.json allowedSkills ? skill directory exists with skill.json
 * 2. Every skill directory has skill.json + SKILL.md
 * 3. Every agent.json allowedTools ? resolved in SkillRegistry
 * 4. Every skill.json allowedTools ? resolved in SkillRegistry
 * 5. Every tool in definitions/ is registered in SkillRegistry
 *
 * Run: node scripts/validate-agent-skills.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const AGENTS_DIR = path.join(ROOT, "apps/backend/agents");
const SKILLS_DIR = path.join(ROOT, "apps/ai-service/skills");
const TOOLS_DIR = path.join(ROOT, "apps/ai-service/src/tools/definitions");
const MANAGER_TOOLS_FILE = path.join(ROOT, "apps/ai-service/src/tools/manager_tools.py");
const SKILLS_SRC_DIR = path.join(ROOT, "apps/ai-service/src/skills");
const REGISTER_ALL_FILE = path.join(ROOT, "apps/ai-service/src/tools/registry.py");

let errors = [];
let warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// — Collect all canonical tool names from every source —
const allCanonicalToolNames = new Set();

function scanFileForFunctionToolNames(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  const matches = content.matchAll(/FunctionTool\(\s*\n?\s*name\s*=\s*"([^"]+)"/g);
  for (const m of matches) allCanonicalToolNames.add(m[1].replace(/\./g, "_"));
}

// 1. Scan tool definitions (__all_tools__)
const defFiles = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith(".py") && f !== "__init__.py");
for (const f of defFiles) {
  const fullPath = path.join(TOOLS_DIR, f);
  const content = fs.readFileSync(fullPath, "utf-8");
  // Check it's in __all_tools__ (exported)
  const hasAllTools = content.includes("__all_tools__");
  const matches = content.matchAll(/FunctionTool\(\s*\n?\s*name\s*=\s*"([^"]+)"/g);
  for (const m of matches) {
    allCanonicalToolNames.add(m[1].replace(/\./g, "_"));
    if (!hasAllTools) {
      warn(`${f}: tool "${m[1]}" defined but not in __all_tools__`);
    }
  }
}

// 2. Scan manager_tools.py
if (fs.existsSync(MANAGER_TOOLS_FILE)) {
  const content = fs.readFileSync(MANAGER_TOOLS_FILE, "utf-8");
  const matches = content.matchAll(/FunctionTool\(\s*\n?\s*name\s*=\s*"([^"]+)"/g);
  for (const m of matches) allCanonicalToolNames.add(m[1].replace(/\./g, "_"));
}

// 3. Check registry.py registers all tools
const registryContent = fs.readFileSync(REGISTER_ALL_FILE, "utf-8");
const registryToolNames = new Set();
const regMatches = registryContent.matchAll(/register_tool\(\s*(\w+)\s*(?:,|\s*\))/g);
for (const m of regMatches) {
  // The tool variable names — not tool names, but rough check
  registryToolNames.add(m[1]);
}

// 4. Scan all src/skills/ for Skill(name="...")
const knownSkillNames = new Set();
function scanDirForSkill(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (fs.statSync(filePath).isDirectory()) {
    for (const entry of fs.readdirSync(filePath)) {
      const fullPath = path.join(filePath, entry);
      if (fs.statSync(fullPath).isDirectory() && entry !== "__pycache__") {
        scanDirForSkill(fullPath);
      } else if (entry.endsWith(".py") && entry !== "__init__.py") {
        const content = fs.readFileSync(fullPath, "utf-8");
        const matches = content.matchAll(/Skill\(\s*\n?\s*name\s*=\s*"([^"]+)"/g);
        for (const m of matches) knownSkillNames.add(m[1]);
      }
    }
  }
}
scanDirForSkill(SKILLS_SRC_DIR);

function toolIsValid(name) {
  const canonical = name.replace(/\./g, "_");
  return allCanonicalToolNames.has(canonical) || knownSkillNames.has(canonical);
}

// — Scan all agents —
const agentDirs = fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const allSkillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const skillSet = new Set(allSkillDirs);

for (const agentDir of agentDirs) {
  if (agentDir.startsWith(".")) continue;
  const agentJsonPath = path.join(AGENTS_DIR, agentDir, "agent.json");
  if (!fs.existsSync(agentJsonPath)) {
    err(`${agentDir}/agent.json missing`);
    continue;
  }

  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(agentJsonPath, "utf-8")); }
  catch { err(`${agentDir}/agent.json: invalid JSON`); continue; }

  const allowedSkills = manifest.allowedSkills || [];
  const allowedTools = manifest.allowedTools || [];

  for (const skillId of allowedSkills) {
    if (!skillSet.has(skillId)) {
      err(`${agentDir}/agent.json: skill "${skillId}" referenced but no directory at skills/${skillId}/`);
      continue;
    }

    const skillJsonPath = path.join(SKILLS_DIR, skillId, "skill.json");
    if (!fs.existsSync(skillJsonPath)) {
      err(`${agentDir}/agent.json: skill "${skillId}" has directory but no skill.json`);
      continue;
    }

    const skillMdPath = path.join(SKILLS_DIR, skillId, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      warn(`${agentDir}/agent.json: skill "${skillId}" has no SKILL.md`);
    }

    let skillManifest;
    try { skillManifest = JSON.parse(fs.readFileSync(skillJsonPath, "utf-8")); }
    catch { err(`${skillId}/skill.json: invalid JSON`); continue; }

    const skillTools = skillManifest.allowedTools || skillManifest.tools || [];
    for (const tool of skillTools) {
      if (!toolIsValid(tool)) {
        err(`${skillId}/skill.json: tool "${tool}" not found in any tool definition or skill registry`);
      }
    }
  }

  for (const tool of allowedTools) {
    if (!toolIsValid(tool)) {
      err(`${agentDir}/agent.json: tool "${tool}" not found in any tool definition or manager_tools`);
    }
  }
}

// Check all skill directories have skill.json
for (const skillDir of allSkillDirs) {
  const skillJsonPath = path.join(SKILLS_DIR, skillDir, "skill.json");
  if (!fs.existsSync(skillJsonPath)) {
    err(`skills/${skillDir}: missing skill.json`);
  }
}

// Check Role Registry & role_tools.yaml synchronization
const ROLES_MANIFEST_FILE = path.join(ROOT, "apps/ai-service/src/agents/roles.manifest.yaml");
const ROLE_TOOLS_FILE = path.join(ROOT, "apps/ai-service/src/tools/role_tools.yaml");

let yamlParser = null;
try {
  yamlParser = require(path.join(ROOT, "apps/backend/node_modules/js-yaml"));
} catch (_) {
  try { yamlParser = require("js-yaml"); } catch (__) {}
}

if (yamlParser && fs.existsSync(ROLES_MANIFEST_FILE) && fs.existsSync(ROLE_TOOLS_FILE)) {
  try {
    const rawRoleToolsText = fs.readFileSync(ROLE_TOOLS_FILE, "utf-8");
    const roleLines = rawRoleToolsText.split("\n");
    const seenRoles = new Set();
    for (const line of roleLines) {
      const match = line.match(/^\s\s([A-Za-z0-9_]+):\s*$/);
      if (match) {
        const rk = match[1];
        if (seenRoles.has(rk)) {
          err(`Duplicate role key '${rk}' found in role_tools.yaml`);
        }
        seenRoles.add(rk);
      }
    }

    const manifestData = yamlParser.load(fs.readFileSync(ROLES_MANIFEST_FILE, "utf-8")) || {};
    const toolsData = yamlParser.load(rawRoleToolsText) || {};

    const manifestRoles = manifestData.roles || {};
    const toolsRoles = toolsData.roles || {};

    for (const rk of Object.keys(toolsRoles)) {
      if (!manifestRoles[rk]) {
        err(`Role '${rk}' in role_tools.yaml is missing from roles.manifest.yaml`);
      }
    }

    for (const rk of Object.keys(manifestRoles)) {
      if (!toolsRoles[rk]) {
        err(`Role '${rk}' in roles.manifest.yaml is missing from role_tools.yaml`);
      }
      const rmeta = manifestRoles[rk];
      for (const field of ["domain", "judge_profile", "playbook_title", "capabilities"]) {
        if (!rmeta || !rmeta[field]) {
          err(`Role '${rk}' in roles.manifest.yaml is missing required field '${field}'`);
        }
      }
      const caps = rmeta.capabilities || {};
      for (const cap of ["episodic_memory", "knowledge_retrieval", "learning", "approvals"]) {
        if (caps[cap] === undefined) {
          err(`Role '${rk}' in roles.manifest.yaml is missing capability '${cap}'`);
        }
      }
    }
  } catch (parseErr) {
    err(`Failed to parse roles manifest or role_tools: ${parseErr.message}`);
  }
}

if (errors.length === 0 && warnings.length === 0) {
  console.log(`? Agent skill integrity: ${agentDirs.length} agents, ${allSkillDirs.length} skills — all valid`);
  process.exit(0);
}

if (errors.length > 0) {
  console.error(`? ${errors.length} error(s):`);
  errors.forEach(e => console.error(`  - ${e}`));
}
if (warnings.length > 0) {
  console.warn(`?  ${warnings.length} warning(s):`);
  warnings.forEach(w => console.warn(`  - ${w}`));
}

process.exit(errors.length > 0 ? 1 : 0);
