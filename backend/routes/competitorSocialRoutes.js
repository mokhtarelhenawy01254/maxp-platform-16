const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const competitorSocialService = require('../services/competitorSocialService');

router.use(requireAuth);

router.get('/profile/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const profile = await competitorSocialService.getProfile(req.user.companyId, competitorId, platform);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/profiles/:competitorId', async (req, res) => {
  try {
    const { competitorId } = req.params;
    const profiles = await competitorSocialService.getProfiles(req.user.companyId, competitorId);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/profile/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const profile = await competitorSocialService.updateProfile(req.user.companyId, competitorId, platform, req.body);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/profile/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const result = await competitorSocialService.deleteProfile(req.user.companyId, competitorId, platform);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/posts/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const { take = 50, skip = 0, postType, startDate, endDate } = req.query;
    const posts = await competitorSocialService.getPosts(req.user.companyId, competitorId, platform, {
      take: parseInt(take),
      skip: parseInt(skip),
      postType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/posts/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const post = await competitorSocialService.addPost(req.user.companyId, competitorId, platform, req.body);
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/metrics/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const metrics = await competitorSocialService.recordMetrics(req.user.companyId, competitorId, platform, req.body);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/metrics/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const { days = 30 } = req.query;
    const metrics = await competitorSocialService.getMetricsHistory(req.user.companyId, competitorId, platform, parseInt(days));
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/engagement/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const { days = 30 } = req.query;
    const stats = await competitorSocialService.getEngagementStats(req.user.companyId, competitorId, platform, parseInt(days));
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sentiment/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const { periodDays = 7 } = req.body;
    const sentiment = await competitorSocialService.analyzeSentiment(req.user.companyId, competitorId, platform, periodDays);
    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sentiment/:competitorId/:platform', async (req, res) => {
  try {
    const { competitorId, platform } = req.params;
    const { months = 3 } = req.query;
    const history = await competitorSocialService.getSentimentHistory(req.user.companyId, competitorId, platform, parseInt(months));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;