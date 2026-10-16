/**
 * @module developerRoutes
 * @description Merchant Developer Hub — credential management for the
 * currently authenticated company (JWT). All operations are company-scoped
 * via req.user; tenant identifiers from the body are never trusted.
 */
const express = require('express');
const router = express.Router();

const verifyToken = require('../utils/verifyToken');
const developerApiService = require('../services/developerApiService');

const resolveCompanyId = (req) =>
  req.user?.effectiveCompanyId || req.user?.companyId || null;

const requireCompany = (req, res, next) => {
  if (!resolveCompanyId(req)) {
    return res.status(400).json({ success: false, message: 'سياق الشركة غير محدد' });
  }
  return next();
};

router.use(verifyToken.authenticateToken, requireCompany);

// GET /api/v1/developer/scopes — available scopes for key creation UIs
router.get('/scopes', (req, res) => {
  return res.json({ success: true, scopes: developerApiService.SCOPE_DEFINITIONS });
});

// GET /api/v1/developer/credentials?type=API|MCP
router.get('/credentials', async (req, res) => {
  try {
    const credentialType =
      req.query.type === 'MCP' ? 'MCP' : req.query.type === 'API' ? 'API' : undefined;
    const credentials = await developerApiService.listCredentials(resolveCompanyId(req), {
      credentialType,
    });
    return res.json({ success: true, credentials });
  } catch (error) {
    console.error('[developer] list credentials failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'تعذر تحميل المفاتيح حالياً' });
  }
});

// POST /api/v1/developer/credentials
// Body: { name, credentialType: 'API'|'MCP', scopes?, rateLimitPerMin?, expiresInDays? }
router.post('/credentials', async (req, res) => {
  try {
    const { name, credentialType, scopes, rateLimitPerMin, expiresInDays } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'اسم المفتاح مطلوب' });
    }
    const type = credentialType === 'MCP' ? 'MCP' : 'API';

    const { credential, rawKey } = await developerApiService.createCredential({
      companyId: resolveCompanyId(req),
      userId: req.user?.id || null,
      name,
      credentialType: type,
      scopes: Array.isArray(scopes) ? scopes : [],
      rateLimitPerMin,
      expiresInDays,
    });

    // rawKey is returned exactly once — it is never stored in plaintext.
    return res.status(201).json({ success: true, credential, key: rawKey });
  } catch (error) {
    if (/name is required|companyId is required/.test(String(error?.message))) {
      return res.status(400).json({ success: false, message: 'بيانات غير مكتملة' });
    }
    console.error('[developer] create credential failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'تعذر إنشاء المفتاح حالياً' });
  }
});

// PATCH /api/v1/developer/credentials/:id
router.patch('/credentials/:id', async (req, res) => {
  try {
    const updated = await developerApiService.updateCredential(
      resolveCompanyId(req),
      req.params.id,
      req.body || {},
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'المفتاح غير موجود' });
    }
    return res.json({ success: true, credential: updated });
  } catch (error) {
    console.error('[developer] update credential failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'تعذر تحديث المفتاح حالياً' });
  }
});

// DELETE /api/v1/developer/credentials/:id
router.delete('/credentials/:id', async (req, res) => {
  try {
    const removed = await developerApiService.deleteCredential(resolveCompanyId(req), req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'المفتاح غير موجود' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('[developer] delete credential failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'تعذر حذف المفتاح حالياً' });
  }
});

// GET /api/v1/developer/usage?days=30
router.get('/usage', async (req, res) => {
  try {
    const summary = await developerApiService.getUsageSummary(resolveCompanyId(req), req.query.days);
    return res.json({ success: true, usage: summary });
  } catch (error) {
    console.error('[developer] usage summary failed:', error?.message || error);
    return res.status(503).json({ success: false, message: 'تعذر تحميل الإحصائيات حالياً' });
  }
});

module.exports = router;
