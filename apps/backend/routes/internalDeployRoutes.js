const express = require('express');
const router = express.Router();
const { clearStorefrontHtmlCache } = require('../controller/storefrontHtmlController');
const { clearPlatformSeoHtmlCache } = require('../middleware/platformSeoMiddleware');

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'maxp-deploy-internal-2024';

router.post('/purge-cache', (req, res) => {
  const token = req.headers['x-deploy-secret'] || req.query.secret;
  if (token !== DEPLOY_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  clearStorefrontHtmlCache();
  clearPlatformSeoHtmlCache();
  console.log('✅ [INTERNAL] Both HTML caches purged via deploy endpoint');
  return res.json({ ok: true, message: 'HTML caches purged' });
});

module.exports = router;
