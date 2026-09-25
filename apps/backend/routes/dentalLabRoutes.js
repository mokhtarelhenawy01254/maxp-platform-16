const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const controller = require('../controller/dentalLabController');
const verifyToken = require('../utils/verifyToken');
const { upload, dentalLabDir } = require('../utils/dentalLabUpload');
const { dentalRoleGuard } = require('../services/dentalRoles');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

// Serve uploaded dental-lab files — آمن: octet-stream + attachment (يمنع تنفيذ HTML/SVG على النطاق)
// ومقيّد بانتماء الشركة (لا وصول بين الشركات). يعمل لأدمن المنصة ولتوكن بوابة الدكتور عبر الـ global auth.
router.get('/files/:name', async (req, res) => {
  try {
    const name = path.basename(String(req.params.name || ''));
    if (!name) return res.status(400).json({ success: false, error: 'اسم الملف مطلوب' });
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId || req.dentist?.companyId;
    if (!companyId) return res.status(401).json({ success: false, error: 'غير مصرح' });
    const attachment = await prisma.dentalCaseAttachment.findFirst({
      where: { storedPath: name, companyId },
      select: { id: true, storedPath: true, fileName: true, mimeType: true, companyId: true },
    });
    if (!attachment || attachment.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    }
    const filePath = path.join(dentalLabDir, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'الملف غير موجود' });

    // نوع المحتوى حسب الامتداد: الصور و PDF و HTML تُفتح inline في المتصفح،
    // وملفات 3D/أخرى تبقى للتحميل (المعاينة 3D عبر model-viewer من الـ blob).
    const ext = path.extname(attachment.fileName || name).toLowerCase();
    const isHtml = ext === '.html' || ext === '.htm';
    const inlineTypes = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf', '.html', '.htm']);
    const contentTypeMap = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf',
      '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
      '.json': 'application/json', '.txt': 'text/plain',
    };
    const isInline = inlineTypes.has(ext);
    res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', isInline ? 'inline' : `attachment; filename="${encodeURIComponent(attachment.fileName || name)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (isHtml) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; style-src 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; object-src 'none'");
    }
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving dental file:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب الملف' });
  }
});

// عارض التصميم 3D (exocad webview): HTML يُقدَّم في مسار معزول بنفس النطاق
// مع CSP مقفل (لا شبكة خارجية) + SAMEORIGIN + sandbox في الـ iframe،
// ومقيّد بنوع DESIGN_REVIEW وانتماء الشركة فقط.
router.get('/design-review/:name', async (req, res) => {
  try {
    const name = path.basename(String(req.params.name || ''));
    if (!name) return res.status(400).json({ success: false, error: 'اسم الملف مطلوب' });
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId || req.dentist?.companyId;
    if (!companyId) return res.status(401).json({ success: false, error: 'غير مصرح' });
    const attachment = await prisma.dentalCaseAttachment.findFirst({
      where: { storedPath: name, kind: 'DESIGN_REVIEW', companyId },
      select: { id: true, storedPath: true, fileName: true, companyId: true },
    });
    if (!attachment || attachment.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    }
    const filePath = path.join(dentalLabDir, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; media-src 'self' blob:; worker-src 'none'; object-src 'none'");
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving design review:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب مراجعة التصميم' });
  }
});

// Protection: enforce authentication & dental-lab-app subscription on all API routes
const { checkAppAccess } = require('../middleware/checkAppAccess');
router.use((req, res, next) => {
  if (req.path.startsWith('/files/') || req.path.startsWith('/design-review/')) {
    return next();
  }
  verifyToken.authenticateToken(req, res, () => {
    checkAppAccess('dental-lab-app')(req, res, next);
  });
});

// Doctors
router.get('/doctors', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT']), controller.listDoctors);
router.get('/doctors/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT']), controller.getDoctorDetail);
router.post('/doctors', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.createDoctor);
router.post('/doctors/:id/bulk-payment', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.recordDoctorBulkPayment);
router.put('/doctors/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateDoctor);
router.delete('/doctors/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteDoctor);
router.post('/doctors/:id/restore', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.restoreDoctor);
router.delete('/doctors/:id/permanent', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.permanentDeleteDoctor);

// Work types
router.get('/work-types', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.listWorkTypes);
router.post('/work-types', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.createWorkType);
router.put('/work-types/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.updateWorkType);
router.delete('/work-types/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteWorkType);

// Technicians
router.get('/technicians', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT']), controller.listTechnicians);
router.post('/technicians', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.createTechnician);
router.put('/technicians/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateTechnician);
router.delete('/technicians/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteTechnician);
router.get('/technicians/:id/payouts', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.listTechnicianPayouts);
router.post('/technicians/:id/payouts', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.recordTechnicianPayout);
router.delete('/technicians/payouts/:payoutId', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteTechnicianPayout);

// Cases
router.get('/cases', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.listCases);
router.post('/cases', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.createCase);
router.post('/scan-parse', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), upload.single('file'), controller.parseScan);

// Bulk operations (must be before /cases/:id)
router.post('/cases/bulk/advance', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkAdvanceCases);
router.post('/cases/bulk/assign', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkAssignTechnician);
router.post('/cases/bulk/priority', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkUpdatePriority);
router.post('/cases/bulk/trash', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkTrashCases);
router.post('/cases/bulk/restore', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkRestoreCases);
router.post('/cases/bulk/transfer-doctor', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.bulkTransferCasesDoctor);

router.get('/cases/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.getCaseDetail);
router.put('/cases/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.updateCase);
router.delete('/cases/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.trashCase);
router.post('/cases/:id/restore', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.restoreCase);
router.delete('/cases/:id/permanent', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.permanentDeleteCase);
router.post('/cases/:id/advance', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.advanceCaseStatus);
router.post('/cases/:id/assign', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.assignTechnician);
router.delete('/cases/:id/assignments/:assignmentId', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.removeCaseAssignment);
router.post('/cases/:id/stages/:stageId/assignees', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.addStageAssignee);
router.delete('/cases/:id/stages/:stageId/assignees/:technicianId', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.removeStageAssignee);
router.post('/cases/:id/attachments', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), upload.any(), controller.uploadCaseAttachment);
router.delete('/cases/:id/attachments/:attachmentId', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.deleteCaseAttachment);
router.get('/cases/:id/work-order', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.getWorkOrderPdf);
router.get('/cases/:id/pan-label', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.getPanLabelPdf);
router.get('/cases/:id/warranty-certificate', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.getWarrantyCertificatePdf);
router.post('/cases/:id/send-tryin', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.sendCaseToTryIn);
router.post('/cases/:id/return-tryin', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.returnCaseFromTryIn);
router.post('/cases/kiosk-scan', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.kioskScanCase);
router.get('/cases/:id/download-all', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.downloadAllAttachments);
router.post('/cases/:id/quality-check', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.recordQualityCheck);
router.get('/cases/:id/quality-checks', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.listQualityChecks);
router.post('/cases/:id/refabrication', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'TECHNICIAN']), controller.flagRefabrication);
router.post('/cases/:id/refabrications/:refabId/resolve', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.resolveRefabrication);

// Technician self-service
router.get('/me', verifyToken.authenticateToken, controller.getMyInfo);
router.get('/my-cases', verifyToken.authenticateToken, dentalRoleGuard(['TECHNICIAN']), controller.getMyCases);
router.get('/my-wage', verifyToken.authenticateToken, dentalRoleGuard(['TECHNICIAN']), controller.getMyWage);
router.post('/my-wage/advance-request', verifyToken.authenticateToken, dentalRoleGuard(['TECHNICIAN']), controller.requestTechnicianAdvance);

// Invoices
router.get('/invoices', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.listInvoices);
router.post('/invoices', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.createInvoice);
router.get('/invoices/uninvoiced-summary', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getUninvoicedSummary);
router.post('/invoices/batch-create', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.batchCreateMonthlyInvoices);
router.post('/invoices/:id/payments', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.recordInvoicePayment);
router.post('/invoices/:id/void', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.voidInvoice);
router.get('/invoices/:id/pdf', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getInvoicePdf);
router.get('/invoices/:id/payment-link', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getInvoicePaymentLink);
router.post('/notifications/scan-billing-cycle', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.scanBillingCycle);

// Monthly settlements (تقفيل المستحقات الشهرية وتجميد الأرصدة)
router.get('/monthly-settlements', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.listMonthlySettlements);
router.post('/monthly-settlements/close', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.closeMonthlySettlement);
router.post('/monthly-settlements/:id/reopen', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.reopenMonthlySettlement);

// Doctor pricing (rate sheet)
router.get('/doctors/:id/pricing', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT']), controller.getDoctorPricing);
router.put('/doctors/:id/pricing', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.setDoctorPricing);

// Dashboard
router.get('/delivery-estimate', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.getDeliveryEstimate);
router.get('/dashboard', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.getDashboard);

// Settings
router.get('/settings', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.getSettings);
router.put('/settings', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateSettings);

// Team roles
router.get('/team', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.listTeam);
router.put('/team/:userId/role', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.setTeamRole);

// Reports
router.get('/reports/doctor-statement', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getDoctorStatement);
router.get('/reports/doctor-statement/pdf', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT', 'RECEPTION']), controller.getDoctorStatementPdf);
router.get('/reports/technician-productivity', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'ACCOUNTANT']), controller.getTechnicianProductivity);
router.get('/reports/work-type-revenue', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getWorkTypeRevenue);
router.get('/reports/overdue', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getOverdueReport);
router.get('/reports/aging', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getAgingReport);
router.get('/reports/remakes-analysis', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getRemakesAnalysisReport);

// Credit notes
router.get('/credit-notes', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT']), controller.getCreditNotes);

// Custom fields
router.get('/custom-fields', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.listCustomFields);
router.post('/custom-fields', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.createCustomField);
router.put('/custom-fields/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateCustomField);
router.delete('/custom-fields/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteCustomField);

// Notifications
router.get('/notifications/schedule', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.getNotificationSchedule);

// Materials & Inventory Harmonization (خامات معمل الأسنان والموردين)
router.get('/materials/summary', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT', 'RECEPTION']), controller.getMaterialsDashboardSummary);
router.get('/materials/suppliers', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT', 'RECEPTION']), controller.listDentalSuppliers);
router.post('/materials/suppliers', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT', 'RECEPTION']), controller.createDentalSupplier);
router.get('/materials', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'ACCOUNTANT', 'RECEPTION', 'TECHNICIAN']), controller.listMaterials);
router.post('/materials', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.createMaterial);
router.put('/materials/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateMaterial);
router.delete('/materials/:id', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteMaterial);
router.post('/materials/stock-in', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION']), controller.recordMaterialStockIn);
router.post('/cases/:caseId/materials/consume', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN']), controller.recordCaseMaterialConsumption);
router.delete('/cases/:caseId/materials/:usageId', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.deleteCaseMaterialUsage);
router.put('/notifications/schedule', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.updateNotificationSchedule);
router.post('/notifications/scan-overdue', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), controller.scanOverdueNotifications);
router.post('/notifications/run-dunning', verifyToken.authenticateToken, dentalRoleGuard(['OWNER', 'MANAGER']), async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });
    const result = await require('../services/dentalLabNotificationService').runDunningCheck(companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ في تشغيل التذكيرات' });
  }
});

// جدولة تذكيرات التحصيل: كل 6 ساعات للمعامل المفعّل عليها
let dunningTimer = null;
if (!process.env.DISABLE_DUNNING_SCHEDULER) {
  const DUNNING_INTERVAL = (parseInt(process.env.DUNNING_INTERVAL_MINUTES, 10) || 360) * 60000;
  dunningTimer = setInterval(async () => {
    try {
      const prisma = getSharedPrismaClient();
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 200,
      });
      for (const company of companies) {
        try {
          const rows = await prisma.dentalSetting.findMany({ where: { companyId: company.id, key: 'notifications' } });
          if (rows.length === 0) continue;
          const value = rows[0].value && typeof rows[0].value === 'object' ? rows[0].value : {};
          if (value.dunningEnabled === true) {
            await require('../services/dentalLabNotificationService').runDunningCheck(company.id);
          }
        } catch (err) {
          // تجاهل أخطاء الشركة الواحدة
        }
      }
    } catch (err) {
      console.error('[DentalDunning] scheduler error:', err.message);
    }
  }, DUNNING_INTERVAL);
  dunningTimer.unref && dunningTimer.unref();
}

// Multer error handler
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'حجم الملف يتجاوز الحد المسموح' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, error: err.message || 'حدث خطأ أثناء رفع الملفات' });
  }
  next();
});

module.exports = router;
