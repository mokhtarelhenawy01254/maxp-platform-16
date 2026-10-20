/**
 * Manufacturing Execution System (MES) Controller
 * Handles HTTP requests for BOMs, Production Orders, Shop Floor Stages,
 * Material Issues, Goods Receipts, Scrap Tracking, Settings, and Cost Analysis.
 */

const ManufacturingService = require('../services/manufacturingService');
const ManufacturingContractService = require('../services/manufacturingContractService');
const ManufacturingSubcontractService = require('../services/manufacturingSubcontractService');
const ManufacturingFabricService = require('../services/manufacturingFabricService');
const FactoryPortalService = require('../services/factoryPortalService');

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

  // ==========================================================================
  // Contract Manufacturing (Customer Orders & Payments)
  // ==========================================================================

  static async listCustomerOrders(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingContractService.listCustomerOrders(companyId, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getCustomerOrderById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const order = await ManufacturingContractService.getCustomerOrderById(companyId, req.params.id);
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createCustomerOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingContractService.createCustomerOrder(companyId, req.body, userId);
      res.status(201).json({ success: true, data: order, message: 'تم إنشاء أمر العميل بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateCustomerOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const order = await ManufacturingContractService.updateCustomerOrder(companyId, req.params.id, req.body);
      res.json({ success: true, data: order, message: 'تم تحديث أمر العميل بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async linkOrCreateChildOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const userId = req.user?.id || null;
      const order = await ManufacturingContractService.linkOrCreateChildOrder(
        companyId,
        req.params.id,
        req.body,
        userId
      );
      res.status(201).json({ success: true, data: order, message: 'تم ربط أمر التشغيل بأمر العميل بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async listCustomerOrderPayments(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const payments = await ManufacturingContractService.listCustomerOrderPayments(companyId, req.params.id);
      res.json({ success: true, data: payments });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async generateDefaultPayments(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const payments = await ManufacturingContractService.generateDefaultPayments(
        companyId,
        req.params.id,
        req.user
      );
      res.status(201).json({ success: true, data: payments, message: 'تم توليد خطة الدفعات الافتراضية (70/20/10) بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async createCustomerOrderPayment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const payment = await ManufacturingContractService.createCustomerOrderPayment(
        companyId,
        req.params.id,
        req.body,
        req.user
      );
      res.status(201).json({ success: true, data: payment, message: 'تمت إضافة الدفعة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateCustomerOrderPayment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingContractService.updateCustomerOrderPayment(
        companyId,
        req.params.id,
        req.params.paymentId,
        req.body,
        req.user
      );
      res.json({ success: true, data: result, message: 'تم تحديث الدفعة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // 5. Partner Factories & Subcontracting (Wave 2)
  // ==========================================================================

  static async listPartnerFactories(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const factories = await ManufacturingSubcontractService.listPartnerFactories(companyId, req.query);
      res.json({ success: true, data: factories });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getPartnerFactoryById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const factory = await ManufacturingSubcontractService.getPartnerFactoryById(companyId, req.params.id);
      res.json({ success: true, data: factory });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createPartnerFactory(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const factory = await ManufacturingSubcontractService.createPartnerFactory(companyId, req.body);
      res.status(201).json({ success: true, data: factory, message: 'تم إنشاء المصنع الشريك بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updatePartnerFactory(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const factory = await ManufacturingSubcontractService.updatePartnerFactory(
        companyId,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: factory, message: 'تم تحديث بيانات المصنع الشريك بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deletePartnerFactory(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingSubcontractService.deletePartnerFactory(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async generatePartnerFactoryPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.generatePortalLink(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async togglePartnerFactoryPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.togglePortalLink(companyId, req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async revokePartnerFactoryPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.revokePortalLink(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async assignStageExecution(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const stage = await ManufacturingSubcontractService.assignStageExecution(
        companyId,
        req.params.orderId,
        req.params.stageId,
        req.body
      );
      res.json({ success: true, data: stage, message: 'تم تحديث جهة تنفيذ المرحلة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async recordStageFactoryEvent(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const stage = await ManufacturingSubcontractService.recordStageFactoryEvent(
        companyId,
        req.params.orderId,
        req.params.stageId,
        req.body
      );
      res.json({ success: true, data: stage, message: 'تم تسجيل حدث المصنع للمرحلة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async createAttachment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const attachment = await ManufacturingSubcontractService.createAttachment(
        companyId,
        req.body,
        req.user?.id
      );
      res.status(201).json({ success: true, data: attachment, message: 'تم حفظ المرفق بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async listOrderAttachments(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const attachments = await ManufacturingSubcontractService.listOrderAttachments(
        companyId,
        req.params.id,
        req.query
      );
      res.json({ success: true, data: attachments });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async deleteAttachment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingSubcontractService.deleteAttachment(
        companyId,
        req.params.id,
        req.user
      );
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Media & Attachment Review System (Wave 3)
  // ==========================================================================

  static async listReviews(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.listReviews(companyId, req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async approveReview(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.approveAttachment(companyId, req.params.id, req.user);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async rejectReview(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.rejectAttachment(companyId, req.params.id, req.user, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async publishReview(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.publishAttachment(companyId, req.params.id, req.user);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async hideReview(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await FactoryPortalService.hideAttachment(companyId, req.params.id, req.user);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getPartnerFactoriesPerformance(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const performance = await ManufacturingSubcontractService.getPartnerFactoriesPerformance(
        companyId,
        req.query
      );
      res.json({ success: true, data: performance });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Fabric Calculator & Material Conversions (Wave 2.5)
  // ==========================================================================

  static async convertFabric(req, res) {
    try {
      const result = ManufacturingFabricService.convert(req.body || {});
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async calculateActualGsm(req, res) {
    try {
      const result = ManufacturingFabricService.calculateActualGsm(req.body || {});
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async calculateFabricRequirements(req, res) {
    try {
      const result = ManufacturingFabricService.calculateRequirements(req.body || {});
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async calculateActualWaste(req, res) {
    try {
      const result = ManufacturingFabricService.calculateActualWaste(req.body || {});
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }
}

module.exports = ManufacturingController;
