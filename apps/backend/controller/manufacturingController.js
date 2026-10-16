/**
 * Manufacturing Execution System (MES) Controller
 * Handles HTTP requests for BOMs, Production Orders, Shop Floor Stages,
 * Material Issues, Goods Receipts, Scrap Tracking, Settings, and Cost Analysis.
 */

const ManufacturingService = require('../services/manufacturingService');

class ManufacturingController {
  static getCompanyId(req) {
    return req.user?.companyId || req.companyId || req.user?.company?.id;
  }

  // ==========================================================================
  // Settings
  // ==========================================================================

  static async getSettings(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const settings = await ManufacturingService.getSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async updateSettings(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const settings = await ManufacturingService.updateSettings(companyId, req.body);
      res.json({ success: true, data: settings, message: 'تم تحديث إعدادات التصنيع بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Bill of Materials (BOM)
  // ==========================================================================

  static async listBoms(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const boms = await ManufacturingService.listBoms(companyId, req.query);
      res.json({ success: true, data: boms });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getBomById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const bom = await ManufacturingService.getBomById(companyId, req.params.id);
      res.json({ success: true, data: bom });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createBom(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const bom = await ManufacturingService.createBom(companyId, req.body);
      res.status(201).json({ success: true, data: bom, message: 'تم إنشاء قائمة المكونات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateBom(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const bom = await ManufacturingService.updateBom(companyId, req.params.id, req.body);
      res.json({ success: true, data: bom, message: 'تم تحديث قائمة المكونات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteBom(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      await ManufacturingService.deleteBom(companyId, req.params.id);
      res.json({ success: true, message: 'تم حذف قائمة المكونات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cloneBom(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const cloned = await ManufacturingService.cloneBomVersion(companyId, req.params.id, req.body);
      res.status(201).json({ success: true, data: cloned, message: 'تم إنشاء إصدار جديد من قائمة المكونات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async resolveVariantRequirements(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const { variantMatrix } = req.body;
      const result = await ManufacturingService.resolveVariantRequirements(companyId, req.params.id, variantMatrix);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Production Orders Lifecycle
  // ==========================================================================

  static async listOrders(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const orders = await ManufacturingService.listOrders(companyId, req.query);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getOrderById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const order = await ManufacturingService.getOrderById(companyId, req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingService.createOrder(companyId, req.body, userId);
      res.status(201).json({ success: true, data: order, message: 'تم إنشاء أمر الإنتاج بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async releaseOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingService.releaseOrder(companyId, req.params.id, userId);
      res.json({ success: true, data: order, message: 'تم اعتماد أمر الإنتاج للتشغيل بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async startOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingService.startOrder(companyId, req.params.id, {
        ...req.body,
        userId,
      });
      const hasCostWarnings = order.costWarnings && order.costWarnings.length > 0;
      const defaultMsg = order.message || (order.autoIssueSkipped ? order.autoIssueMessage : 'تم بدء تشغيل أمر الإنتاج بنجاح');
      const message = hasCostWarnings
        ? `${defaultMsg} (تنبيه: تم صرف ${order.costWarnings.length} خامة بتكلفة صفرية - تم تخطي قيد WIP)`
        : defaultMsg;
      res.json({
        success: true,
        data: order,
        costWarnings: order.costWarnings || [],
        message,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateStageProgress(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const stage = await ManufacturingService.updateStageProgress(
        companyId,
        req.params.id,
        req.params.stageId,
        req.body,
        userId
      );
      res.json({ success: true, data: stage, message: 'تم تسجيل تقدم مرحلة التشغيل بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async recordScrap(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const scrap = await ManufacturingService.recordScrap(companyId, req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: scrap, message: 'تم تسجيل الهالك بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async issueMaterials(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const issue = await ManufacturingService.issueMaterials(companyId, req.params.id, req.body, userId);
      const hasCostWarnings = issue.costWarnings && issue.costWarnings.length > 0;
      const defaultMsg = issue.message || 'تم صرف خامات التشغيل بنجاح';
      const message = hasCostWarnings
        ? `${defaultMsg} (تنبيه: تم صرف ${issue.costWarnings.length} خامة بتكلفة صفرية - تم تخطي قيد WIP)`
        : defaultMsg;
      res.status(201).json({
        success: true,
        data: issue,
        costWarnings: issue.costWarnings || [],
        message,
      });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async receiveFinishedGoods(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const receipt = await ManufacturingService.receiveFinishedGoods(companyId, req.params.id, req.body, userId);
      res.status(201).json({ success: true, data: receipt, message: 'تم استلام الإنتاج التام بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async completeOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingService.completeOrder(companyId, req.params.id, userId);
      res.json({ success: true, data: order, message: 'تم إقفال أمر الإنتاج بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cancelOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingService.cancelOrder(companyId, req.params.id, {
        ...req.body,
        userId,
      });
      res.json({ success: true, data: order, message: 'تم إلغاء أمر الإنتاج بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getOrderCostAnalysis(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const analysis = await ManufacturingService.calculateOrderCost(companyId, req.params.id);
      res.json({ success: true, data: analysis });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }
}

module.exports = ManufacturingController;
