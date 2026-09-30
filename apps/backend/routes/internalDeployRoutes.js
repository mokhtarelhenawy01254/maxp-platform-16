const express = require('express');
const router = express.Router();
const { clearStorefrontHtmlCache } = require('../controller/storefrontHtmlController');
const { clearPlatformSeoHtmlCache } = require('../middleware/platformSeoMiddleware');

// 🔐 لا قيمة افتراضية في الكود (CWE-798) — لو DEPLOY_SECRET مش متظبط في البيئة
// الإندبوينت مقفول تمامًا (403) مع تحذير صاخب عند الإقلاع.
const DEPLOY_SECRET = String(process.env.DEPLOY_SECRET || '').trim();

if (!DEPLOY_SECRET) {
  console.warn('🚫 [INTERNAL] DEPLOY_SECRET غير متظبط في البيئة — /api/v1/internal/purge-cache مرفوض دائمًا (403). ظبطه في .env الإنتاجي عشان الديبلاوي يعرف ينضّف الكاش.');
}

router.post('/purge-cache', (req, res) => {
  const crypto = require('crypto');
  const token = String(req.headers['x-deploy-secret'] || req.query.secret || '');
  let keyOk = false;
  if (DEPLOY_SECRET.length > 0 && token.length === DEPLOY_SECRET.length) {
    try {
      keyOk = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(DEPLOY_SECRET));
    } catch (_) {
      keyOk = false;
    }
  }

  if (!keyOk) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  clearStorefrontHtmlCache();
  clearPlatformSeoHtmlCache();
  console.log('✅ [INTERNAL] Both HTML caches purged via deploy endpoint');
  return res.json({ ok: true, message: 'HTML caches purged' });
});

module.exports = router;
