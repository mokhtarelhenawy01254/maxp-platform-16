/**
 * @module aiServiceAgentProxy
 * @description Frontend-facing proxy routes that forward agent requests to the ai-service.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;

// GET /agents — list agents from ai-service
router.get('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const result = await aiServiceAdminClient.listAgents(companyId);
    if (!result.ok) {
      return res.status(result.status || 502).json({ success: false, error: result.data?.error || result.error || 'ai-service unreachable' });
    }
    return res.json(result.data);
  } catch (error) {
    console.error('[ai-proxy] list agents failed:', error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});

// POST /agents/chat — send message to a specific agent on ai-service
router.post('/agents/chat', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const { message, agentId, threadId } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ success: false, error: 'message is required' });
    if (!agentId) return res.status(400).json({ success: false, error: 'agentId is required' });

    const result = await aiServiceAdminClient.chatWithAgent({ companyId, agentId, message, threadId });
    if (!result.ok) {
      return res.status(result.status || 502).json({ success: false, error: result.data?.error || result.error || 'ai-service unreachable' });
    }
    return res.json(result.data);
  } catch (error) {
    console.error('[ai-proxy] agent chat failed:', error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});

module.exports = router;
