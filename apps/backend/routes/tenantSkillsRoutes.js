/**
 * @module tenantSkillsRoutes
 * @description API routes for merchant control plane: view learned rules, toggle rules, and trigger learning.
 */

const express = require('express');
const router = express.Router();
const tenantSkillsService = require('../services/tenantSkillsService');

// Middleware to ensure companyId exists from auth or header
function resolveTenant(req, res, next) {
  const companyId = req.companyId || req.user?.companyId || req.headers['x-company-id'] || req.query.companyId;
  if (!companyId) {
    return res.status(400).json({ success: false, error: 'companyId is required' });
  }
  req.companyId = companyId;
  next();
}

/**
 * GET /api/tenant-skills/learned
 * List all learned operational rules for the merchant's store.
 */
router.get('/learned', resolveTenant, async (req, res) => {
  try {
    const { skillType, enabled } = req.query;
    const rules = await tenantSkillsService.listLearnedRules(req.companyId, {
      skillType,
      enabled: enabled !== undefined ? enabled === 'true' : null,
    });
    return res.status(200).json({ success: true, companyId: req.companyId, count: rules.length, data: rules });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/tenant-skills/learned/:id/toggle
 * Toggle a specific learned rule on or off.
 */
router.patch('/learned/:id/toggle', resolveTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const result = await tenantSkillsService.toggleRule(req.companyId, id, enabled);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tenant-skills/distill-ads
 * Distill winning or losing rules from ad metrics into the merchant's playbook.
 */
router.post('/distill-ads', resolveTenant, async (req, res) => {
  try {
    const adMetrics = req.body;
    const result = await tenantSkillsService.distillFromAdMetrics(req.companyId, adMetrics);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tenant-skills/record-rule
 * Universal Hermes learning endpoint for ANY agent (Support, Inventory, Sales, Media Buyer, Operations)
 */
router.post('/record-rule', resolveTenant, async (req, res) => {
  try {
    const { category, ruleTitle, ruleInstructions, triggerKeywords, metadata } = req.body;
    const result = await tenantSkillsService.recordUniversalRule(req.companyId, {
      category,
      ruleTitle,
      ruleInstructions,
      triggerKeywords,
      metadata,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
/**
 * POST /api/tenant-skills/learned/:id/approve
 * Approve a pending learned rule (Hermes write_approval gate).
 */
router.post('/learned/:id/approve', resolveTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tenantSkillsService.approveSkill(req.companyId, id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tenant-skills/learned/:id/reject
 * Reject a pending learned rule.
 */
router.post('/learned/:id/reject', resolveTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await tenantSkillsService.rejectSkill(req.companyId, id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tenant-skills/l0-index
 * Progressive disclosure Level 0 compact index for system prompt injection.
 */
router.get('/l0-index', resolveTenant, async (req, res) => {
  try {
    const { agentRole } = req.query;
    const skills = await tenantSkillsService.getL0Index(req.companyId, { agentRole });
    return res.status(200).json({ success: true, count: skills.length, data: skills });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/tenant-skills/trigger-review
 * Hermes Post-Turn Background Review (decoupled reflection worker).
 */
router.post('/trigger-review', resolveTenant, async (req, res) => {
  try {
    const { agentRole, trajectory, groundTruthOutcome, metadata } = req.body;
    const result = await tenantSkillsService.triggerBackgroundReview(req.companyId, {
      agentRole,
      trajectory,
      groundTruthOutcome,
      metadata,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

