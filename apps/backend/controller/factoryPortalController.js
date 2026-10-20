/**
 * Factory Portal Controller (Wave 3)
 * Handles unauthenticated (token-based) portal requests from external factories.
 */

const FactoryPortalService = require('../services/factoryPortalService');

class FactoryPortalController {
  /**
   * GET /api/v1/factory-portal/context
   * Returns public identity of the factory
   */
  static async getContext(req, res) {
    try {
      const data = await FactoryPortalService.getContext(req.factory);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تحميل بيانات المصنع',
      });
    }
  }

  /**
   * GET /api/v1/factory-portal/assignments
   * Returns assigned external stages for this factory (strictly sanitized)
   */
  static async getAssignments(req, res) {
    try {
      const data = await FactoryPortalService.getAssignments(req.factory);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تحميل تكليفات المصنع',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/confirm-receipt
   */
  static async confirmReceipt(req, res) {
    try {
      const result = await FactoryPortalService.confirmReceipt(
        req.factory,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تأكيد استلام أمر التشغيل',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/start
   */
  static async startStage(req, res) {
    try {
      const result = await FactoryPortalService.startStage(
        req.factory,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء بدء مرحلة التشغيل',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/update
   */
  static async updateStage(req, res) {
    try {
      const result = await FactoryPortalService.updateStage(
        req.factory,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تحديث كميات التشغيل',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/media
   * Supports file upload via multer OR JSON body with URL
   */
  static async uploadMedia(req, res) {
    try {
      let fileUrl = req.body?.url;
      let kind = req.body?.kind;
      const caption = req.body?.caption;

      if (req.file) {
        fileUrl = `/uploads/manufacturing/${req.file.filename}`;
        if (req.file.mimetype.startsWith('video/')) {
          kind = 'VIDEO';
        } else if (req.file.mimetype.startsWith('image/')) {
          kind = 'IMAGE';
        } else {
          kind = 'DOC';
        }
      }

      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          error: 'يجب اختيار ملف للرفع أو توفير رابط المرفق (url)',
        });
      }

      const result = await FactoryPortalService.uploadMedia(
        req.factory,
        req.params.id,
        {
          url: fileUrl,
          kind,
          caption,
        }
      );
      res.status(201).json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء رفع ملف المرفق',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/request-approval
   */
  static async requestApproval(req, res) {
    try {
      const result = await FactoryPortalService.requestApproval(
        req.factory,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء إرسال طلب الاعتماد',
      });
    }
  }

  /**
   * POST /api/v1/factory-portal/assignments/:id/issues
   */
  static async reportIssue(req, res) {
    try {
      const result = await FactoryPortalService.reportIssue(
        req.factory,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (err) {
      res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تسجيل الملاحظة',
      });
    }
  }
}

module.exports = FactoryPortalController;
