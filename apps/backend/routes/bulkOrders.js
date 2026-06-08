const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../utils/verifyToken');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { bulkOrderService, BULK_ORDER_PERMISSIONS } = require('../services/bulkOrderService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

router.get('/', requirePermission(BULK_ORDER_PERMISSIONS.VIEW), async (req, res) => {
  try {
    const { page, limit, status, search, sortBy, sortOrder, userId, dateFrom, dateTo } = req.query;
    const result = await bulkOrderService.list({
      companyId: req.user.companyId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      search,
      sortBy,
      sortOrder,
      userId,
      dateFrom,
      dateTo,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', requirePermission(BULK_ORDER_PERMISSIONS.VIEW), async (req, res) => {
  try {
    const record = await bulkOrderService.getById(req.params.id, req.user.companyId);
    if (!record) return res.status(404).json({ success: false, error: 'Bulk order not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', requirePermission(BULK_ORDER_PERMISSIONS.CREATE), async (req, res) => {
  try {
    const record = await bulkOrderService.create(req.body, req.user);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', requirePermission(BULK_ORDER_PERMISSIONS.EDIT), async (req, res) => {
  try {
    const record = await bulkOrderService.update(req.params.id, req.body, req.user);
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requirePermission(BULK_ORDER_PERMISSIONS.DELETE), async (req, res) => {
  try {
    await bulkOrderService.delete(req.params.id, req.user.companyId, req.user);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/duplicate', requirePermission(BULK_ORDER_PERMISSIONS.CREATE), async (req, res) => {
  try {
    const record = await bulkOrderService.duplicate(req.params.id, req.user);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/export', requirePermission(BULK_ORDER_PERMISSIONS.EXPORT), async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const result = await bulkOrderService.export(req.params.id, req.user.companyId, format, req.user);
    await bulkOrderService.logAudit('BULK_ORDER_EXPORTED', req.params.id, req.user.companyId, req.user.id, { format });
    if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/import', requirePermission(BULK_ORDER_PERMISSIONS.EDIT), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'File is required' });
    const items = await bulkOrderService.parseUpload(req.file.buffer, req.file.mimetype);
    const result = await bulkOrderService.importItems(req.params.id, items, req.user);
    res.json({ success: true, imported: result.count, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/execute', requirePermission(BULK_ORDER_PERMISSIONS.EDIT), async (req, res) => {
  try {
    const result = await bulkOrderService.execute(req.params.id, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/', requirePermission(BULK_ORDER_PERMISSIONS.DELETE), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'IDs array is required' });
    }
    const results = [];
    for (const id of ids) {
      try {
        await bulkOrderService.delete(id, req.user.companyId, req.user);
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
