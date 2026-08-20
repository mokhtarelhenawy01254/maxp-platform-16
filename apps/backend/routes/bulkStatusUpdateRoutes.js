const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const MAX_ROWS = 2000;
const STATUS_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

const readSheetRows = (fileBuffer) => {
  try {
    const wb = XLSX.read(fileBuffer, { type: 'buffer', raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch (error) {
    return null;
  }
};

router.get('/template', verifyToken.authenticateToken, verifyToken.requireRole(STATUS_ROLES), async (req, res) => {
  try {
    const ws = XLSX.utils.aoa_to_sheet([['orderNumber', 'status']]);
    ws['!cols'] = [{ wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'statuses');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-status-template.xlsx"');
    res.send(buf);
  } catch (error) {
    console.error('Γ¥î [BULK-STATUS] Error generating template:', error);
    res.status(500).json({ success: false, message: '╪¬╪╣╪░╪▒ ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿' });
  }
});

router.post('/', verifyToken.authenticateToken, verifyToken.requireRole(STATUS_ROLES), upload.single('file'), async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à┘ü┘é┘ê╪»' });
    if (!req.file) return res.status(400).json({ success: false, message: '╪º┘ä┘à┘ä┘ü ┘à╪╖┘ä┘ê╪¿' });

    const records = readSheetRows(req.file.buffer);
    if (!records) return res.status(400).json({ success: false, message: '╪¬╪╣╪░╪▒ ┘é╪▒╪º╪í╪⌐ ╪º┘ä┘à┘ä┘ü╪î ╪º╪│╪¬╪«╪»┘à ┘é╪º┘ä╪¿ Excel ╪ú┘ê CSV' });
    if (records.length === 0) return res.status(400).json({ success: false, message: '╪º┘ä┘à┘ä┘ü ┘ü╪º╪▒╪║' });
    if (records.length > MAX_ROWS) {
      return res.status(400).json({ success: false, message: `╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ${MAX_ROWS} ╪╡┘ü ┘ä┘â┘ä ┘à┘ä┘ü` });
    }

    const userId = req.user?.id;
    const userName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || null;

    const results = [];
    for (const row of records) {
      const orderNumber = String(row.orderNumber || row['╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿'] || row['order_number'] || '').trim();
      const status = String(row.status || row['╪º┘ä╪¡╪º┘ä╪⌐'] || '').trim().toUpperCase();

      if (!orderNumber || !status) {
        results.push({ orderNumber, status, success: false, message: '╪¿┘è╪º┘å╪º╪¬ ┘å╪º┘é╪╡╪⌐ (╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿ ╪ú┘ê ╪º┘ä╪¡╪º┘ä╪⌐)' });
        continue;
      }

      try {
        await orderService.updateOrderStatus(orderNumber, companyId, status, '╪¬╪¡╪»┘è╪½ ╪¼┘à╪º╪╣┘è ┘à┘å ┘à┘ä┘ü Excel', userId, userName);
        results.push({ orderNumber, status, success: true });
      } catch (error) {
        results.push({ orderNumber, status, success: false, message: error.message || '┘ü╪┤┘ä ╪º┘ä╪¬╪¡╪»┘è╪½' });
      }
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length
    };

    res.json({ success: true, data: { summary, results } });
  } catch (error) {
    console.error('Γ¥î [BULK-STATUS] Error processing upload:', error);
    res.status(500).json({ success: false, message: error.message || '╪¬╪╣╪░╪▒ ┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä┘à┘ä┘ü' });
  }
});

module.exports = router;
