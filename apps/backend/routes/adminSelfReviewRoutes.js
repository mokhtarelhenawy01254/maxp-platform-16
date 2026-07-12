const express = require('express');
const verifyToken = require('../utils/verifyToken');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireSuperAdmin);

router.get('/agents', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.listAgents(req.query.company_id, req.query.status);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.getSelfReviewStats(req.query);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.listSelfReviewLogs(req.query);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/logs/export', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.exportSelfReviewCsv(req.query);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.patch('/agents/:agentId/review-model', async (req, res) => {
  try {
    const result = await aiServiceAdminClient.updateReviewModel(req.params.agentId, req.body.model);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

module.exports = router;
