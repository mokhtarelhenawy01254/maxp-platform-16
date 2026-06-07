const aiSdkClient = require('../../services/aiSdkClient');

const VALID_MODES = new Set(['off', 'shadow', 'pilot', 'primary']);

function getAiServiceMode() {
  const configured = String(process.env.AI_SERVICE_MODE || '').trim().toLowerCase();
  if (VALID_MODES.has(configured)) return configured;
  return getEnabledCompanies().length > 0 ? 'pilot' : 'off';
}

function getEnabledCompanies() {
  const raw = process.env.AI_SERVICE_ENABLED_COMPANIES || '';
  if (raw === '*') return '*';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Check if maxp-ai-service is enabled for a given company.
 * @param {string} companyId
 * @returns {boolean}
 */
function isAiServiceEnabled(companyId) {
  const mode = getAiServiceMode();
  if (mode === 'off' || mode === 'shadow') return false;

  const enabled = getEnabledCompanies();
  if (enabled === '*') return mode === 'primary' || mode === 'pilot';
  if (mode === 'primary' && enabled.length === 0) return true;
  if (mode === 'pilot') return enabled.includes(companyId);
  return enabled.includes(companyId);
}

/**
 * Route a customer message through maxp-ai-service.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.customerId
 * @param {string} params.message
 * @param {string} [params.threadId]
 * @param {Object} [params.logger]
 * @returns {Promise<Object>} AI service response
 */
async function routeToAiService({ companyId, customerId, message, threadId, logger }) {
  const log = logger || console;
  log.info(`Routing message to AI service for company ${companyId}`);

  try {
    const result = await aiSdkClient.sendChatMessage({
      companyId,
      customerId,
      message,
      threadId,
    });

    log.info(`AI service responded`, { status: result.status, threadId: result.threadId });
    return result;
  } catch (error) {
    log.error(`AI service error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getAiServiceMode,
  isAiServiceEnabled,
  routeToAiService,
};
