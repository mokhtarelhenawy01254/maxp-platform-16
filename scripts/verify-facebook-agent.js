'use strict';

/**
 * 🚀 Standalone Deep Verification Script for facebook-sales-support-agent (v2.0.0)
 *
 * Runs comprehensive assertions:
 * 1. Contract & File Integrity (6 files)
 * 2. agent.json JSON schema & MaxP Agent Builder v2 compliance
 * 3. Role & Tool mapping alignment with role_tools.yaml
 * 4. Super Admin template payload builder simulation
 * 5. Anti-AI-Detection rules (dialect, no formatting, single question, handoff phrase)
 * 6. Sanitizer tests (raw URLs to native attachments, markdown stripping)
 * 7. Evals test cases coverage
 */

const fs = require('fs');
const path = require('path');
const yaml = require('../apps/backend/node_modules/js-yaml');

const ROOT_DIR = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT_DIR, 'apps/backend/agents/facebook-sales-support-agent');
const ROLE_TOOLS_PATH = path.join(ROOT_DIR, 'apps/ai-service/src/tools/role_tools.yaml');
const ROLES_MANIFEST_PATH = path.join(ROOT_DIR, 'apps/ai-service/src/agents/roles.manifest.yaml');
const { sanitizeAiReply } = require('../apps/backend/utils/aiReplySanitizer');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    return false;
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
    return true;
  }
}

async function runVerification() {
  console.log('=================================================================');
  console.log('🧪 Starting Verification Suite: facebook-sales-support-agent v2.0.0');
  console.log('=================================================================\n');

  // 1. Contract Files Existence & Size
  console.log('--- 1. Contract & File Integrity ---');
  const requiredFiles = ['agent.json', 'SOUL.md', 'PERSONA.md', 'TOOLS.md', 'AGENTS.md', 'evals.json'];
  for (const f of requiredFiles) {
    const p = path.join(AGENT_DIR, f);
    const exists = fs.existsSync(p);
    assert(exists, `File ${f} exists`);
    if (exists) {
      const size = fs.statSync(p).size;
      assert(size > 50, `File ${f} is non-empty (${size} bytes)`);
    }
  }

  // 2. agent.json Structure & Validation
  console.log('\n--- 2. agent.json Manifest & Rules ---');
  const manifest = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'agent.json'), 'utf8'));
  assert(manifest.slug === 'facebook-sales-support-agent', 'Slug is facebook-sales-support-agent');
  assert(manifest.role === 'FACEBOOK_SALES_SUPPORT', 'Role is FACEBOOK_SALES_SUPPORT');
  assert(manifest.version === '2.0.0', 'Version is 2.0.0');
  assert(manifest.name.includes('سارة'), 'Name contains "سارة"');
  assert(manifest.modelPolicy?.default === 'deepseek-flash', 'Model is deepseek-flash');
  assert(Array.isArray(manifest.allowedTools) && manifest.allowedTools.length >= 10, `Allowed tools count >= 10 (actual: ${manifest.allowedTools.length})`);
  assert(manifest.channels.includes('facebook') && manifest.channels.includes('messenger'), 'Channels contain facebook & messenger');
  assert(manifest.guardrails?.singleQuestionPerTurn === true, 'Guardrail singleQuestionPerTurn is true');
  assert(manifest.personaMeta?.dialect === 'egyptian', 'Persona dialect is egyptian');

  // 3. Tool Mapping in role_tools.yaml
  console.log('\n--- 3. Role Tools Alignment (role_tools.yaml) ---');
  const roleToolsData = yaml.load(fs.readFileSync(ROLE_TOOLS_PATH, 'utf8'));
  const registeredTools = roleToolsData.roles.FACEBOOK_SALES_SUPPORT || [];
  assert(Array.isArray(registeredTools) && registeredTools.length > 0, 'FACEBOOK_SALES_SUPPORT defined in role_tools.yaml');

  let allToolsMapped = true;
  for (const tool of manifest.allowedTools) {
    const canonical = tool.replace(/\./g, '_');
    const isMapped = registeredTools.includes(canonical);
    if (!isMapped) {
      assert(false, `Tool ${tool} (${canonical}) must be in role_tools.yaml`);
      allToolsMapped = false;
    }
  }
  if (allToolsMapped) {
    assert(true, `All ${manifest.allowedTools.length} tools in agent.json are mapped in role_tools.yaml`);
  }

  // 4. Role in roles.manifest.yaml
  console.log('\n--- 4. Role Capabilities in roles.manifest.yaml ---');
  const rolesManifest = yaml.load(fs.readFileSync(ROLES_MANIFEST_PATH, 'utf8'));
  const roleDef = rolesManifest.roles.FACEBOOK_SALES_SUPPORT;
  assert(roleDef !== undefined, 'Role FACEBOOK_SALES_SUPPORT defined in roles.manifest.yaml');
  assert(roleDef?.domain === 'SALES', 'Role domain is SALES');
  assert(roleDef?.capabilities?.knowledge_retrieval === true, 'Role capability knowledge_retrieval is true');
  assert(roleDef?.capabilities?.episodic_memory === true, 'Role capability episodic_memory is true');
  assert(roleDef?.capabilities?.learning === true, 'Role capability learning is true');

  // 5. Super Admin Disk Template Sync Simulation
  console.log('\n--- 5. Super Admin Disk Template Sync Simulation ---');
  const soul = fs.readFileSync(path.join(AGENT_DIR, 'SOUL.md'), 'utf8');
  const persona = fs.readFileSync(path.join(AGENT_DIR, 'PERSONA.md'), 'utf8');
  const tools = fs.readFileSync(path.join(AGENT_DIR, 'TOOLS.md'), 'utf8');
  const agents = fs.readFileSync(path.join(AGENT_DIR, 'AGENTS.md'), 'utf8');

  const superAdminPayload = {
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

  assert(superAdminPayload.instructions_soul.length > 500, `SOUL instructions length > 500 (${superAdminPayload.instructions_soul.length} chars)`);
  assert(superAdminPayload.instructions_persona.length > 100, `PERSONA instructions length > 100 (${superAdminPayload.instructions_persona.length} chars)`);
  assert(superAdminPayload.instructions_tools.length > 200, `TOOLS instructions length > 200 (${superAdminPayload.instructions_tools.length} chars)`);
  assert(superAdminPayload.instructions_agents.length > 200, `AGENTS instructions length > 200 (${superAdminPayload.instructions_agents.length} chars)`);

  // 6. Anti-Detection & Dialect Protocols
  console.log('\n--- 6. Anti-Detection & Dialect Protocols in SOUL.md ---');
  assert(soul.includes('لهجة مصرية عامية بيضاء'), 'SOUL enforces Egyptian white dialect');
  assert(soul.includes('حظر كامل للنجوم'), 'SOUL strictly forbids asterisks / bold formatting');
  assert(soul.includes('حظر كامل للقوائم النقطية'), 'SOUL strictly forbids bullet points');
  assert(soul.includes('سؤال تفاعلي واحد') || soul.includes('سؤال واحد فقط'), 'SOUL enforces single question per turn rule');
  assert(soul.includes('الرسائل الصوتية'), 'SOUL handles audio notes courteously');
  assert(soul.includes('هو أنا بكلم بني آدم ولا بوت؟'), 'SOUL handles bot probe with witty human reply');
  assert(soul.includes('سارة من فريق مبيعات المتجر'), 'SOUL identity confirms Sara from sales team');

  const expectedHandoff = 'ثواني بس هحول حضرتك لأحد زملائنا في خدمة العملاء عشان يتابع معاك ويفيدك بالتفصيل فوراً 🙏';
  assert(soul.includes(expectedHandoff), 'SOUL handoff reassurance matches backend allFunctions.js exactly');

  // 7. Sanitizer & Media Handling
  console.log('\n--- 7. aiReplySanitizer Guardrails ---');
  const sampleRawReply = 'أهلاً بحضرتك يا فندم، ده الفستان المتاح عندنا https://cdn.example.com/dress.jpg يناسبك مقاس L؟';
  const sanitized = sanitizeAiReply(sampleRawReply);
  assert(!sanitized.cleanedText.includes('https://cdn.example.com/dress.jpg'), 'Sanitizer removed raw image URL from text');
  assert(sanitized.cleanedText.includes('يناسبك مقاس L؟'), 'Sanitizer preserved human conversational text');
  assert(sanitized.attachments.length === 1 && sanitized.attachments[0].url === 'https://cdn.example.com/dress.jpg', 'Sanitizer extracted image into native attachment');

  const sampleMarkdownImg = 'اتفضل الصورة ![فستان أسود](https://cdn.example.com/dress2.png) تحب أجهزهولك؟';
  const sanitizedMd = sanitizeAiReply(sampleMarkdownImg);
  assert(!sanitizedMd.cleanedText.includes('!['), 'Sanitizer stripped markdown image syntax');
  assert(sanitizedMd.attachments.length === 1 && sanitizedMd.attachments[0].url === 'https://cdn.example.com/dress2.png', 'Sanitizer extracted markdown image URL');

  // 8. Evals Scenarios
  console.log('\n--- 8. Evals Scenarios Verification ---');
  const evalsData = JSON.parse(fs.readFileSync(path.join(AGENT_DIR, 'evals.json'), 'utf8'));
  const scenarios = evalsData.scenarios || evalsData.evals;
  assert(Array.isArray(scenarios) && scenarios.length >= 5, `Evals scenarios count >= 5 (actual: ${scenarios.length})`);
  const names = scenarios.map(s => s.name || s.id);
  assert(names.includes('bot_detection_probe'), 'Evals has bot detection probe test');
  assert(names.includes('price_inquiry_no_bold_no_bullet'), 'Evals has no-markdown formatting test');
  assert(names.includes('single_entity_focus_photo'), 'Evals has single entity focus test');
  assert(names.includes('customer_decline_respect'), 'Evals has decline respect test');
  assert(names.includes('voice_note_courtesy'), 'Evals has voice note courtesy test');

  // Summary
  console.log('\n=================================================================');
  console.log(`🏁 Verification Finished: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('=================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled error during verification:', err);
  process.exit(1);
});
