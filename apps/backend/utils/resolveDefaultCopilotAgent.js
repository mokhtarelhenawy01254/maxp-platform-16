/**
 * @module resolveDefaultCopilotAgent
 * @description Dynamic resolution chain for the default copilot agent slug.
 *
 * Priority:
 *   1. Company-level preference  (ai_settings.copilotDefaultAgentSlug)
 *   2. Platform-level setting    (system_settings  systemName='defaultCopilotAgent')
 *   3. Hardcoded fallback        ('executive-assistant-agent')
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const HARDCODED_FALLBACK = 'executive-assistant-agent';

// In-memory TTL cache — avoids a DB round-trip on every chat message.
// key = companyId | '__platform__', value = { slug, expiresAt }
const _cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resolve the default copilot agent slug for a given company.
 * @param {string} companyId
 * @returns {Promise<string>}
 */
async function resolveDefaultCopilotAgent(companyId) {
  if (!companyId) return HARDCODED_FALLBACK;

  // 1. Check TTL cache
  const cached = _cache.get(companyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  let resolved = null;

  try {
    const prisma = getSharedPrismaClient();

    // Priority 1: Company-level preference
    const aiSetting = await prisma.aiSetting.findUnique({
      where: { companyId },
      select: { copilotDefaultAgentSlug: true },
    });
    if (aiSetting?.copilotDefaultAgentSlug) {
      resolved = aiSetting.copilotDefaultAgentSlug;
    }

    // Priority 1.5: Active company agent with DASHBOARD channel assigned in channel routing
    if (!resolved) {
      try {
        const aiServiceAdminClient = require('../services/aiServiceAdminClient');
        const companyAgents = await aiServiceAdminClient.listAgents(companyId, 'ACTIVE');
        if (Array.isArray(companyAgents)) {
          const dashboardAgent = companyAgents.find((a) => {
            const channels = (a.allowedChannels || a.allowed_channels || []);
            return Array.isArray(channels) && channels.map((c) => String(c).toUpperCase()).includes('DASHBOARD');
          });
          if (dashboardAgent) {
            resolved = dashboardAgent.slug || dashboardAgent.templateSlug || dashboardAgent.template_slug || dashboardAgent.id;
          }
        }
      } catch (_) {
        // Non-blocking fallback
      }
    }

    // Priority 2: Platform-level system setting
    if (!resolved) {
      const platformCached = _cache.get('__platform__');
      if (platformCached && platformCached.expiresAt > Date.now()) {
        resolved = platformCached.slug;
      } else {
        let sysSetting = await prisma.systemSettings.findFirst({
          where: { systemName: 'defaultCopilotAgent' },
        });
        if (!sysSetting) {
          sysSetting = await prisma.systemSettings.findFirst({
            where: { systemName: 'defaultAgentTemplate' },
          });
        }
        if (sysSetting?.config) {
          try {
            const parsed = JSON.parse(sysSetting.config);
            const foundSlug = parsed.slug || parsed.templateSlug;
            if (foundSlug) {
              resolved = foundSlug;
              _cache.set('__platform__', { slug: foundSlug, expiresAt: Date.now() + CACHE_TTL_MS });
            }
          } catch (_) { /* malformed JSON — skip */ }
        }
      }
    }
  } catch (e) {
    console.warn('[resolveDefaultCopilotAgent] DB lookup failed, using fallback:', e.message);
  }

  const slug = resolved || HARDCODED_FALLBACK;

  // Populate company-level cache
  _cache.set(companyId, { slug, expiresAt: Date.now() + CACHE_TTL_MS });

  return slug;
}

/**
 * Invalidate the cache for a company (call after admin changes the setting).
 * @param {string} [companyId] — omit to clear entire cache.
 */
function invalidateDefaultAgentCache(companyId) {
  if (companyId) {
    _cache.delete(companyId);
  } else {
    _cache.clear();
  }
}

module.exports = { resolveDefaultCopilotAgent, invalidateDefaultAgentCache, HARDCODED_FALLBACK };
