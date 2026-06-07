/**
 * @module aiRuntimeService
 * @description Thin runtime facade that exposes the ModelManager singleton
 * used by agentControlRoutes for orchestration endpoints.
 *
 * ModelManager requires an aiAgentService reference, but we lazy-load it
 * to avoid circular-dependency issues at startup.
 */

const ModelManager = require('./modelManager');

let _modelManager = null;

/**
 * Returns (or lazily creates) a shared ModelManager instance.
 * The first call may incur a small setup cost; subsequent calls
 * return the cached singleton.
 */
function getModelManager() {
  if (!_modelManager) {
    // ModelManager constructor expects an aiAgentService instance.
    // We pass null and let internal logic gracefully degrade for
    // orchestration-only usage where the full service isn't needed.
    try {
      const aiAgentService = require('./aiAgentService');
      _modelManager = new ModelManager(aiAgentService);
    } catch (_err) {
      // aiAgentService may not exist; create ModelManager with a stub
      _modelManager = new ModelManager(null);
    }
  }
  return _modelManager;
}

module.exports = {
  getModelManager,
};
