/**
 * spawnReadyAgentsService.js
 * Automatically provisions active ready agent profiles for a company upon subscription.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');
const aiServiceAdminClient = require('./aiServiceAdminClient');

const TONE_MAP = {
  friendly: 'ودود ومتعاون',
  formal: 'رسمي ومهني',
  concise: 'مختصر ومباشر',
  detailed: 'مفصل وشامل',
};

const LANG_MAP = {
  auto: 'حسب لغة العميل (عربي أو إنجليزي)',
  ar: 'العربية',
  en: 'English',
};

const ESCALATION_MAP = {
  knowledge_ask: 'إذا كنت لا تعرف الإجابة، اسأل التاجر عبر لوحة التحكم.',
  escalate_human: 'إذا كنت لا تعرف الإجابة، حول المحادثة إلى فريق الدعم البشري.',
  apologize: 'إذا كنت لا تعرف الإجابة، اعتذر للعميل واطلب منه التواصل مع الدعم.',
};

function buildSoulContent(config) {
  const persona = config.soul_persona || '';
  const goal = config.soul_goal || '';
  const tone = TONE_MAP[config.soul_tone] || '';
  const tasks = config.soul_tasks || '';
  const boundaries = config.soul_boundaries || '';
  const language = LANG_MAP[config.soul_language] || '';
  const welcome = config.soul_welcome || '';
  const escalation = ESCALATION_MAP[config.soul_escalation] || ESCALATION_MAP.knowledge_ask;

  const parts = [];
  if (persona || goal) {
    parts.push(goal ? `أنت ${persona}، ${goal}.` : `أنت ${persona}.`);
  }
  if (tone) parts.push(`\n## أسلوب الرد\n${tone}`);
  if (tasks) parts.push(`\n## المهام الأساسية\n${tasks}`);
  if (boundaries) parts.push(`\n## الحدود\n${boundaries}`);
  if (welcome) parts.push(`\n## رسالة الترحيب\n${welcome}`);
  if (escalation) parts.push(`\n## عندما لا تعرف الإجابة\n${escalation}`);
  if (language) parts.push(`\n## لغة الرد\n${language}`);
  if (config.soul_custom) parts.push(`\n## تعليمات إضافية\n${config.soul_custom}`);

  return parts.join('\n\n');
}

/**
 * Spawns all active ready agents for a company.
 * @param {string} companyId 
 */
async function spawnAllReadyAgents(companyId) {
  console.log(`[SPAWN-AGENTS] Checking active profiles to spawn for company: ${companyId}`);
  const prisma = getSharedPrismaClient();

  const setting = await prisma.systemSettings.findFirst({
    where: { systemName: 'agentQuickProfiles' },
  });

  if (!setting?.config) {
    console.warn('[SPAWN-AGENTS] No quick profiles setting found in DB.');
    return [];
  }

  const { profiles } = JSON.parse(setting.config);
  if (!Array.isArray(profiles)) {
    console.warn('[SPAWN-AGENTS] Profiles configuration is invalid.');
    return [];
  }

  const activeProfiles = profiles.filter((p) => p.isActive !== false);
  const spawned = [];

  for (const profile of activeProfiles) {
    try {
      console.log(`[SPAWN-AGENTS] Spawning ready agent: ${profile.title} (${profile.slug})`);

      // Choose first personality as default
      const defaultPers = profile.personalities?.[0] || {
        id: 'default',
        name: 'افتراضي',
        desc: profile.desc,
        tone: 'friendly',
        persona: profile.title,
        goal: profile.desc,
      };

      const config = {
        soul_persona: defaultPers.persona || '',
        soul_goal: defaultPers.goal || '',
        soul_tone: defaultPers.tone || 'friendly',
        soul_tasks: defaultPers.tasks || '',
        soul_boundaries: defaultPers.boundaries || '',
        soul_welcome: defaultPers.welcome || '',
        soul_language: defaultPers.language || 'auto',
        soul_escalation: defaultPers.escalation || 'knowledge_ask',
        soul_custom: defaultPers.customPrompt || '',
        merchant_locks: {
          lockIdentity: profile.lockIdentity || false,
          lockPersona: profile.lockPersona || false,
          lockRules: profile.lockRules || false,
          lockCustomPrompt: profile.lockCustomPrompt || false,
        },
      };

      const soulInstructions = buildSoulContent(config);

      // 1. Spawn agent
      const agent = await aiServiceAdminClient.spawnAgent({
        companyId,
        templateSlug: profile.templateSlug || profile.slug,
        name: profile.title,
        icon: profile.icon || '🤖',
        description: defaultPers.desc || profile.desc || null,
        allowedChannels: profile.channels || ['whatsapp', 'facebook', 'dashboard'],
      });

      if (agent && agent.id) {
        // 2. Put config and files to fully set up the agent
        await aiServiceAdminClient.updateAgent(agent.id, companyId, {
          name: profile.title,
          icon: profile.icon || '🤖',
          description: defaultPers.desc || profile.desc || null,
          config,
          soulInstructions,
          personaInstructions: defaultPers.desc || '',
          agentInstructions: '',
          toolsInstructions: '',
        });

        spawned.push(agent.id);
        console.log(`[SPAWN-AGENTS] Successfully spawned and configured agent: ${agent.id}`);
      }
    } catch (e) {
      console.error(`[SPAWN-AGENTS] Error spawning agent ${profile.slug}:`, e.message);
    }
  }

  return spawned;
}

module.exports = { spawnAllReadyAgents };
