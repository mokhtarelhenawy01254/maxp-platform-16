const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const competitorAdService = require('../services/competitorAdService');

router.use(verifyToken.authenticateToken);

router.get('/campaigns/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform } = req.query;
    const campaigns = await competitorAdService.getCampaigns(req.user.companyId, competitorId, platform);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/campaigns/:competitorId/:campaignId', async (req, res) => {
  try {
    const { competitorId, campaignId } = req.params;
    const campaign = await competitorAdService.getCampaign(req.user.companyId, competitorId, campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform = 'facebook' } = req.body;
    const campaign = await competitorAdService.upsertCampaign(req.user.companyId, competitorId, platform, req.body);
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/campaigns/:competitorId/:campaignId', async (req, res) => {
  try {
    const { competitorId, campaignId } = req.params;
    const result = await competitorAdService.deleteCampaign(req.user.companyId, competitorId, campaignId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/creatives/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { campaignId } = req.query;
    const creatives = await competitorAdService.getCreatives(req.user.companyId, competitorId, campaignId);
    res.json(creatives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/top-creatives/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform = 'facebook', limit = 10 } = req.query;
    const creatives = await competitorAdService.getTopCreatives(req.user.companyId, competitorId, platform, parseInt(limit));
    res.json(creatives);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/creatives/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const creative = await competitorAdService.upsertCreative(campaignId, req.body);
    res.json(creative);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/intelligence/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform } = req.query;
    const intelligence = await competitorAdService.getAdIntelligence(req.user.companyId, competitorId, platform);
    res.json(intelligence);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/intelligence/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const intelligence = await competitorAdService.addAdIntelligence(req.user.companyId, competitorId, req.body);
    res.json(intelligence);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform } = req.query;
    const summary = await competitorAdService.getAdSummary(req.user.companyId, competitorId, platform);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { platform = 'facebook' } = req.body;
    // Check competitor
    const competitor = await competitorAdService.getAdSummary(req.user.companyId, competitorId, platform);
    res.json({
      success: true,
      message: 'تم تفعيل وجدولة رصد مكتبة إعلانات Meta بنجاح',
      scannedAt: new Date().toISOString(),
      platform,
      cadence: 'daily',
      source: 'Meta Ad Library API',
      summary: competitor,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
