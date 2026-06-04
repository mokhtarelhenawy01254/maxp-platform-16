const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const competitorPlatformService = require('../services/competitorPlatformService');

router.use(requireAuth);

router.get('/amazon/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { asin } = req.query;
    const data = await competitorPlatformService.getAmazonData(req.user.companyId, competitorId, asin);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/amazon/:competitorId/summary', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const summary = await competitorPlatformService.getAmazonSummary(req.user.companyId, competitorId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/amazon/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const data = await competitorPlatformService.upsertAmazonData(req.user.companyId, competitorId, req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/google/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const data = await competitorPlatformService.getGoogleBusiness(req.user.companyId, competitorId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/google/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const data = await competitorPlatformService.upsertGoogleBusiness(req.user.companyId, competitorId, req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/google/:competitorId/reviews', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { googleDataId } = req.body;
    const review = await competitorPlatformService.addGoogleReview(googleDataId, req.body);
    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/techstack/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { byCategory } = req.query;
    if (byCategory === 'true') {
      const stack = await competitorPlatformService.getTechStackByCategory(req.user.companyId, competitorId);
      res.json(stack);
    } else {
      const stack = await competitorPlatformService.getTechStack(req.user.companyId, competitorId);
      res.json(stack);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/techstack/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const { category, name, version, confidence } = req.body;
    const tech = await competitorPlatformService.upsertTechStack(req.user.companyId, competitorId, category, name, version, confidence);
    res.json(tech);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/shopify/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const store = await competitorPlatformService.getShopifyStore(req.user.companyId, competitorId);
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shopify/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const store = await competitorPlatformService.upsertShopifyStore(req.user.companyId, competitorId, req.body);
    res.json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const summary = await competitorPlatformService.getPlatformSummary(req.user.companyId, competitorId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/amazon/:competitorId/:asin', async (req, res) => {
  try {
    const { competitorId, asin } = req.params;
    const result = await competitorPlatformService.deleteAmazonData(req.user.companyId, competitorId, asin);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/google/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const result = await competitorPlatformService.deleteGoogleBusiness(req.user.companyId, competitorId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/techstack/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const result = await competitorPlatformService.deleteTechStack(req.user.companyId, competitorId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/shopify/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const result = await competitorPlatformService.deleteShopifyStore(req.user.companyId, competitorId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;