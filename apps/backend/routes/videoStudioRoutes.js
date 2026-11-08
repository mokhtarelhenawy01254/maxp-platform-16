/**
 * AI Video Studio routes — mounted at /api/v1/video-studio (server.js).
 * - router: merchant surface (JWT + company access)
 * - router.superAdminRouter: pricing/settings surface (JWT + requireSuperAdmin)
 */
const express = require('express');
const videoStudioController = require('../controller/videoStudioController');
const videoStudioService = require('../services/videoStudioService');
const verifyToken = require('../utils/verifyToken');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();

const auth = [verifyToken.authenticateToken, verifyToken.requireCompanyAccess];

// Config & pricing
router.get('/config', ...auth, (req, res) => videoStudioController.getConfig(req, res));
router.post('/estimate', ...auth, (req, res) => videoStudioController.estimate(req, res));

// Jobs
router.post('/jobs', ...auth, (req, res) => videoStudioController.createJob(req, res));
router.get('/jobs', ...auth, (req, res) => videoStudioController.listJobs(req, res));
router.get('/jobs/:id', ...auth, (req, res) => videoStudioController.getJob(req, res));
router.post('/jobs/:id/cancel', ...auth, (req, res) => videoStudioController.cancelJob(req, res));

// Characters
router.get('/characters', ...auth, (req, res) => videoStudioController.listCharacters(req, res));
router.post('/characters', ...auth, (req, res) => videoStudioController.createCharacter(req, res));
router.put('/characters/:id', ...auth, (req, res) => videoStudioController.updateCharacter(req, res));
router.delete('/characters/:id', ...auth, (req, res) => videoStudioController.deleteCharacter(req, res));
router.post('/characters/:id/generate-sheet', ...auth, (req, res) => videoStudioController.generateCharacterSheet(req, res));

// Stories
router.get('/stories', ...auth, (req, res) => videoStudioController.listStories(req, res));
router.post('/stories', ...auth, (req, res) => videoStudioController.createStory(req, res));
router.get('/stories/:id', ...auth, (req, res) => videoStudioController.getStory(req, res));
router.put('/stories/:id', ...auth, (req, res) => videoStudioController.updateStory(req, res));
router.delete('/stories/:id', ...auth, (req, res) => videoStudioController.deleteStory(req, res));
router.post('/stories/:id/scenes', ...auth, (req, res) => videoStudioController.addScene(req, res));
router.put('/scenes/:sceneId', ...auth, (req, res) => videoStudioController.updateScene(req, res));
router.delete('/scenes/:sceneId', ...auth, (req, res) => videoStudioController.deleteScene(req, res));
router.post('/stories/:id/render', ...auth, (req, res) => videoStudioController.renderStory(req, res));

// BYOK (bring your own Higgsfield key)
router.get('/byok', ...auth, (req, res) => videoStudioController.getByok(req, res));
router.put('/byok', ...auth, (req, res) => videoStudioController.saveByok(req, res));
router.delete('/byok', ...auth, (req, res) => videoStudioController.deleteByok(req, res));

// Key test + merchant usage
router.post('/test-key', ...auth, (req, res) => videoStudioController.testKey(req, res));
router.get('/usage', ...auth, (req, res) => videoStudioController.getUsage(req, res));

// ---------- Super-admin: pricing & limits ----------
const superAdminRouter = express.Router();
superAdminRouter.use(authenticateToken);
superAdminRouter.use(requireSuperAdmin);

superAdminRouter.get('/settings', async (req, res) => {
  try {
    const data = await videoStudioService.getSettings();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

superAdminRouter.put('/settings', async (req, res) => {
  try {
    const allowed = ['usdToEgp', 'markupPercent', 'minChargeEgp', 'maxJobsPerDayPerCompany', 'simulationMode', 'baseUrl'];
    const patch = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    }
    const data = await videoStudioService.updateSettings(patch);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

superAdminRouter.get('/connection-test', async (req, res) => {
  try {
    const data = await videoStudioService.testKey(null, {});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

superAdminRouter.get('/usage', async (req, res) => {
  try {
    const data = await videoStudioService.getUsage({});
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.superAdminRouter = superAdminRouter;

module.exports = router;
