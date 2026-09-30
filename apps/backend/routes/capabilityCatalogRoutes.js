/**
 * Capability Catalog admin API — merchant-facing coverage dashboard.
 *
 * Backs the AI Hub "coverage" tab: the live capability matrix (domain ×
 * exposure state), one-click activation of auto-discovered drafts (the
 * approved policy: reads auto-activate, writes need this review), and the
 * drift report (stale endpoints, auto-added rows).
 *
 * Catalog rows live in schema `ai` (owned by the ai-service) — accessed
 * via parameterized raw SQL, same pattern as aiSandboxController.
 */
const express = require('express');
const { verifyToken } = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

const router = express.Router();
router.use(verifyToken.authenticateToken);

const VALID_STATES = ['active', 'draft', 'hidden', 'tracked'];

/**
 * GET /api/v1/capability-catalog — catalog rows + per-domain coverage summary.
 */
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const rows = await prisma.$queryRaw`
      SELECT name, domain, description_en, usage_hint_ar, endpoint, http_method,
             permission_key, app_slug, risk_level, exposure_state, roles, source,
             catalog_metadata, updated_at
      FROM ai.agent_tool_catalog
      ORDER BY domain ASC, name ASC
    `;

    const domains = {};
    for (const row of rows) {
      const d = (domains[row.domain] = domains[row.domain] || {
        domain: row.domain, total: 0, active: 0, draft: 0, hidden: 0, tracked: 0, writes: 0,
      });
      d.total += 1;
      d[row.exposure_state] = (d[row.exposure_state] || 0) + 1;
      if (row.risk_level === 'write') d.writes += 1;
    }

    res.json({
      success: true,
      domains: Object.values(domains).sort((a, b) => b.total - a.total),
      capabilities: rows.map((r) => ({
        ...r,
        stale: Boolean(r.catalog_metadata && r.catalog_metadata.stale),
      })),
    });
  } catch (error) {
    console.error('[capabilityCatalog] list failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load capability catalog' });
  }
});

/**
 * POST /api/v1/capability-catalog/:name/activate — one-click review:
 * promote a draft (auto-discovered or curated) to active. Also registers
 * the capability's roles grant for the next agent build.
 */
router.post('/:name/activate', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { roles } = req.body || {};
    const roleName = Array.isArray(roles) && roles[0] ? String(roles[0]) : 'STORE_MANAGER';

    const updated = await prisma.$executeRaw`
      UPDATE ai.agent_tool_catalog
      SET exposure_state = 'active',
          roles = CASE WHEN roles::jsonb @> ${JSON.stringify([roleName])}::jsonb THEN roles ELSE roles || ${JSON.stringify([roleName])}::jsonb END,
          catalog_metadata = COALESCE(catalog_metadata, '{}'::jsonb) || ${JSON.stringify({ activatedAt: new Date().toISOString(), activatedBy: req.user.id })}::jsonb,
          updated_at = NOW()
      WHERE name = ${req.params.name} AND exposure_state IN ('draft', 'hidden')
    `;

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Capability not found or already active' });
    }
    res.json({ success: true, name: req.params.name, exposureState: 'active', role: roleName });
  } catch (error) {
    console.error('[capabilityCatalog] activate failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to activate capability' });
  }
});

/**
 * POST /api/v1/capability-catalog/:name/hide — exclude from agents.
 */
router.post('/:name/hide', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const updated = await prisma.$executeRaw`
      UPDATE ai.agent_tool_catalog
      SET exposure_state = 'hidden', updated_at = NOW()
      WHERE name = ${req.params.name} AND exposure_state IN ('draft', 'active')
    `;
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Capability not found or already hidden' });
    }
    res.json({ success: true, name: req.params.name, exposureState: 'hidden' });
  } catch (error) {
    console.error('[capabilityCatalog] hide failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to hide capability' });
  }
});

/**
 * GET /api/v1/capability-catalog/drift — drift findings: stale rows +
 * auto-added drafts since the last review.
 */
router.get('/drift', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const stale = await prisma.$queryRaw`
      SELECT name, domain, endpoint, http_method, exposure_state, catalog_metadata
      FROM ai.agent_tool_catalog
      WHERE catalog_metadata->>'stale' = 'true'
      ORDER BY updated_at DESC LIMIT 100
    `;
    const autoDrafts = await prisma.$queryRaw`
      SELECT name, domain, description_en, endpoint, http_method, risk_level
      FROM ai.agent_tool_catalog
      WHERE source = 'auto' AND exposure_state = 'draft'
      ORDER BY updated_at DESC LIMIT 100
    `;
    res.json({ success: true, stale, autoDrafts });
  } catch (error) {
    console.error('[capabilityCatalog] drift report failed:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load drift report' });
  }
});

module.exports = router;
