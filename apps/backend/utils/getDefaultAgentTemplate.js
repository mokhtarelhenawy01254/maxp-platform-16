const path = require('path');
const fs = require('fs');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const TEMPLATES_DIR = path.join(__dirname, '..', 'agents');

const TONE_MAP = {
  friendly: 'ودود', empathetic: 'ودود', professional: 'رسمي',
  formal: 'رسمي', casual: 'عفوي', funny: 'فكاهي',
};

async function getDefaultAgentTemplateSlug() {
  try {
    const prisma = getSharedPrismaClient();
    const setting = await prisma.systemSettings.findFirst({
      where: { systemName: 'defaultAgentTemplate' },
    });
    if (setting?.config) {
      const c = JSON.parse(setting.config);
      if (c.templateSlug) return c.templateSlug;
    }
  } catch (e) {
    console.warn('[DefaultAgentTemplate] Failed to read setting:', e.message);
  }
  return 'support-agent';
}

async function buildDefaultAgentConfig() {
  const templateSlug = await getDefaultAgentTemplateSlug();
  const dir = path.join(TEMPLATES_DIR, templateSlug);

  let name = '';
  let icon = '🤖';
  let role = '';
  let personaMeta = {};
  const config = {
    soul_persona: '',
    soul_goal: '',
    soul_tone: 'ودود',
    soul_language: 'تلقائي',
    soul_tasks: '',
    soul_boundaries: '',
    soul_welcome: '',
    soul_escalation: 'يسألني عبر لوحة التحكم',
    soul_custom: '',
  };

  try {
    const jsonPath = path.join(dir, 'agent.json');
    if (fs.existsSync(jsonPath)) {
      const tmpl = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      name = tmpl.name || '';
      icon = tmpl.icon || '🤖';
      role = tmpl.role || '';
      personaMeta = tmpl.personaMeta || {};

      if (personaMeta.tone) config.soul_tone = TONE_MAP[personaMeta.tone] || personaMeta.tone;
      if (personaMeta.language) {
        config.soul_language = personaMeta.language === 'arabic' ? 'العربية' : personaMeta.language === 'english' ? 'English' : 'تلقائي';
      }
    }
  } catch (e) {
    console.warn('[DefaultAgentConfig] Failed to read agent.json:', e.message);
  }

  try {
    const soulPath = path.join(dir, 'SOUL.md');
    if (fs.existsSync(soulPath)) {
      const soul = fs.readFileSync(soulPath, 'utf8').trim();
      const lines = soul.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      config.soul_persona = lines.slice(0, 3).join(' ').trim();
      config.soul_goal = lines.find(l => l.includes('مهمتك') || l.includes('هدف') || l.includes('تحويل') || l.includes('مسؤول')) || '';
    }
  } catch (e) { /* skip */ }

  try {
    const mdPath = path.join(dir, 'AGENTS.md');
    if (fs.existsSync(mdPath)) {
      const content = fs.readFileSync(mdPath, 'utf8').trim();
      const bullets = content.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''));
      if (bullets.length) config.soul_tasks = bullets.join('\n');
    }
  } catch (e) { /* skip */ }

  try {
    const personaPath = path.join(dir, 'PERSONA.md');
    if (fs.existsSync(personaPath)) {
      const content = fs.readFileSync(personaPath, 'utf8').trim();
      const inBoundaries = content.split('\n').findIndex(l => l.includes('الحدود') || l.includes('حدود'));
      if (inBoundaries >= 0) {
        const boundaryLines = content.split('\n').slice(inBoundaries + 1);
        const bullets = boundaryLines.filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''));
        if (bullets.length) config.soul_boundaries = bullets.join('\n');
      }
      const inVoice = content.split('\n').findIndex(l => l.includes('صوت') || l.includes('الشخصية') || l.includes('نمط الرد'));
      if (inVoice >= 0 && !config.soul_persona) {
        const voiceLines = content.split('\n').slice(inVoice + 1, inVoice + 4);
        config.soul_persona = voiceLines.filter(l => l.trim() && !l.startsWith('#')).join(' ').trim();
      }
    }
  } catch (e) { /* skip */ }

  return { templateSlug, name, icon, role, config };
}

module.exports = { getDefaultAgentTemplateSlug, buildDefaultAgentConfig };
