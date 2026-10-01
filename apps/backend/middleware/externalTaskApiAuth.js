// Re-export from the generalized externalApiAuth middleware for backwards compatibility
const {
  authenticateExternalApi,
  authenticateExternalTaskApi,
  requireExternalScope,
  requireExternalTaskScope
} = require('./externalApiAuth');

module.exports = {
  authenticateExternalApi,
  authenticateExternalTaskApi,
  requireExternalScope,
  requireExternalTaskScope
};
