/**
 * @module internalDeveloperRoutes
 * @description Internal service-to-service bridge for Developer Hub credential
 * verification. Used by the Python ai-service and the MCP servers to verify a
 * merchant key before executing any tool on their behalf.
 *
 * Trust model: this endpoint is only reachable with the platform service
 * value (AI_SERVICE_TOKEN / MAXP_SERVICE_TOKEN) — never exposed publicly.
 */
const express = require('express');
const router = express.Router();

const developerApiService = require('../services/developerApiService');

function getServiceValue() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

function requireServiceAccess(req, res, next) {
  const configured = getServiceValue();
  if (!configured) {
    console.error('[internal-developer] service value is not configured');
    return res.status(500).json({ success: false, error: 'service token not configured' });
  }
  const auth = String(req.headers.authorization || '');
  const presented = auth.replace(/^Bearer\s+/i, '').trim();
  if (presented !== configured) {
    return res.status(401).json({ success: false, error: 'invalid service token' });
  }
  return next();
}

router.use(requireServiceAccess);

/**
 * POST /verify-consume
 * Body: { presentedKey, source: 'API'|'MCP', method?, path?, tool?, ip? }
 * Verifies the merchant key, enforces its rate limit and writes the usage
 * audit row. Returns the tenant scope derived from the credential ONLY.
 */
router.post('/verify-consume', async (req, res) => {
  try {
    const { presentedKey, source, method, path, tool, ip } = req.body || {};
    if (!presentedKey || typeof presentedKey !== 'string') {
      return res.status(400).json({ success: false, error: 'presentedKey is required' });
    }

    const result = await developerApiService.verifyAndConsume(presentedKey, {
      method,
      path,
      tool,
      ip,
      source,
    });

    if (!result.ok) {
      const statusMap = { invalid: 401, inactive: 403, expired: 403, rate_limited: 429 };
      return res.status(statusMap[result.reason] || 401).json({
        success: false,
        reason: result.reason,
        rateLimit: result.rateLimit || null,
      });
    }

    return res.json({
      success: true,
      companyId: result.credential.companyId,
      credentialId: result.credential.id,
      credentialType: result.credential.credentialType,
      scopes: result.credential.scopes || [],
      rateLimit: result.rateLimit,
    });
  } catch (error) {
    console.error('[internal-developer] verify-consume failed:', error?.message || error);
    return res.status(503).json({ success: false, error: 'verification unavailable' });
  }
});

module.exports = router;
