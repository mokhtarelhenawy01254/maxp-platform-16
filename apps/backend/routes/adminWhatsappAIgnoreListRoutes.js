const express = require('express');
const verifyToken = require('../utils/verifyToken');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();

// Company-scoped admin endpoint: any authenticated user from the company can manage it.
router.use(verifyToken.authenticateToken);

router.get('/', async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'company_id is required' });
    }
    const result = await aiServiceAdminClient.listWhatsappAIIgnoreList(companyId);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'company_id is required' });
    }
    const result = await aiServiceAdminClient.getWhatsappAIIgnoreStats(companyId);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { companyId, phoneNumber, label, notes } = req.body || {};
    if (!companyId || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'companyId and phoneNumber are required' });
    }
    const addedByUserId = req.user && (req.user.userId || req.user.id);
    const result = await aiServiceAdminClient.addWhatsappAIIgnoreEntry(
      companyId,
      phoneNumber,
      label,
      notes,
      addedByUserId
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { companyId, items } = req.body || {};
    if (!companyId || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'companyId and items[] are required' });
    }
    const addedByUserId = req.user && (req.user.userId || req.user.id);
    const result = await aiServiceAdminClient.bulkAddWhatsappAIIgnoreEntries(
      companyId,
      items,
      addedByUserId
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.patch('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { companyId, label, notes } = req.body || {};
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }
    const result = await aiServiceAdminClient.updateWhatsappAIIgnoreEntry(
      companyId,
      entryId,
      { label, notes }
    );
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

router.delete('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const companyId = req.query.company_id;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'company_id is required' });
    }
    const result = await aiServiceAdminClient.deleteWhatsappAIIgnoreEntry(companyId, entryId);
    res.json(result);
  } catch (error) {
    res.status(502).json({ success: false, error: error.message });
  }
});

module.exports = router;
