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
const ManufacturingTechPackService = require('../services/manufacturingTechPackService');
const ManufacturingSampleService = require('../services/manufacturingSampleService');
const ManufacturingStageTemplateService = require('../services/manufacturingStageTemplateService');
const ManufacturingFactoryAgreementService = require('../services/manufacturingFactoryAgreementService');
const CustomerPortalService = require('../services/customerPortalService');

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
  // Customer Portal Link Management (Wave 8)
  // ==========================================================================

  static async generateCustomerOrderPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await CustomerPortalService.generatePortalLink(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async toggleCustomerOrderPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await CustomerPortalService.togglePortalLink(companyId, req.params.id, req.body);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async deleteCustomerOrderPortalLink(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await CustomerPortalService.deletePortalLink(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
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

  // ==========================================================================
  // 7. Technical Packs & Size Charts (Wave 4)
  // ==========================================================================

  // Tech Packs
  static async listTechPacks(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.listTechPacks(companyId, req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getTechPackById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.getTechPackById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createTechPack(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.createTechPack(companyId, req.user, req.body);
      res.status(201).json({ success: true, data, message: 'تم إنشاء ملف المنتج الفني بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateTechPack(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingTechPackService.updateTechPack(companyId, req.user, req.params.id, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cloneTechPackVersion(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.cloneVersion(companyId, req.user, req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'تم استنساخ إصدار مسودة جديد بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async approveTechPack(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.approveTechPack(companyId, req.user, req.params.id);
      res.json({ success: true, data, message: 'تم اعتماد ملف المنتج الفني بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async archiveTechPack(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.archiveTechPack(companyId, req.user, req.params.id);
      res.json({ success: true, data, message: 'تم أرشفة ملف المنتج الفني' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getTechPackVersions(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.getTechPackVersions(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async uploadTechPackFile(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      let fileData = {};
      if (req.file) {
        fileData = {
          fileName: req.file.originalname,
          url: `/uploads/manufacturing/${req.file.filename}`,
          kind: (req.file.mimetype || '').includes('pdf') ? 'PDF' : 'IMAGE',
        };
      } else if (req.body) {
        fileData = {
          fileName: req.body.fileName || 'ملف فني',
          url: req.body.url,
          kind: req.body.kind || 'IMAGE',
        };
      }
      if (!fileData.url) {
        return res.status(400).json({ success: false, message: 'رابط الملف أو الملف المرفوع مطلوب' });
      }
      const result = await ManufacturingTechPackService.addTechPackFile(companyId, req.user, req.params.id, fileData);
      res.status(201).json({ success: true, ...result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteTechPackFile(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingTechPackService.deleteTechPackFile(
        companyId,
        req.user,
        req.params.id,
        req.params.fileId
      );
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // Size Charts
  static async listSizeCharts(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.listSizeCharts(companyId, req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getSizeChartById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.getSizeChartById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createSizeChart(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.createSizeChart(companyId, req.user, req.body);
      res.status(201).json({ success: true, data, message: 'تم إنشاء جدول المقاسات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateSizeChart(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingTechPackService.updateSizeChart(companyId, req.user, req.params.id, req.body);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cloneSizeChartVersion(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.cloneSizeChartVersion(companyId, req.user, req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'تم استنساخ إصدار مسودة جديد من جدول المقاسات' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async approveSizeChart(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.approveSizeChart(companyId, req.user, req.params.id);
      res.json({ success: true, data, message: 'تم اعتماد جدول المقاسات بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async archiveSizeChart(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.archiveSizeChart(companyId, req.user, req.params.id);
      res.json({ success: true, data, message: 'تم أرشفة جدول المقاسات' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getSizeChartVersions(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.getSizeChartVersions(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getSizeChartMatrix(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingTechPackService.getSizeChartMatrix(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Wave 5: Standalone Sample Orders (أوامر تصنيع العينات المستقلة والتحويل)
  // ==========================================================================

  static async listSampleOrders(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.listSampleOrders(companyId, req.query);
      res.json({ success: true, ...data });
    } catch (error) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  static async getSampleOrderById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.getSampleOrderById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createSampleOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.createSampleOrder(companyId, req.user, req.body);
      res.status(201).json({ success: true, data, message: 'تم إنشاء أمر العينة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateSampleOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.updateSampleOrder(companyId, req.user, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم تحديث بيانات العينة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteSampleOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingSampleService.deleteSampleOrder(companyId, req.user, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async addSampleStage(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.addSampleStage(companyId, req.user, req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'تم إضافة مرحلة للعينة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateSampleStage(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.updateSampleStage(companyId, req.user, req.params.id, req.params.stageId, req.body);
      res.json({ success: true, data, message: 'تم تحديث مرحلة العينة' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async uploadSampleFile(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const fileData = req.file || req.body;
      const data = await ManufacturingSampleService.uploadSampleFile(companyId, req.user, req.params.id, fileData);
      res.status(201).json({ success: true, data, message: 'تم رفع مرفق العينة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async approveSampleOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.approveSampleOrder(companyId, req.user, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم اعتماد العينة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async rejectSampleOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingSampleService.rejectSampleOrder(companyId, req.user, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم رفض العينة وتسجيل السبب' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async convertSampleToOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingSampleService.convertSampleToOrder(companyId, req.user, req.params.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }


  // ==========================================================================
  // Wave 6: Standard Production Stage Templates & Sets Library
  // ==========================================================================

  static async listStageTemplates(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.listTemplates(companyId, req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getStageTemplateById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.getTemplateById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.status || error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createStageTemplate(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.createTemplate(companyId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'تم إنشاء قالب مرحلة الإنتاج القياسية بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateStageTemplate(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.updateTemplate(companyId, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم تحديث قالب مرحلة الإنتاج بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async archiveStageTemplate(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.archiveTemplate(companyId, req.params.id);
      res.json({ success: true, data, message: 'تم تعطيل قالب مرحلة الإنتاج' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async listStageTemplateSets(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.listSets(companyId, req.query);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getStageTemplateSetById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.getSetById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.status || error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createStageTemplateSet(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.createSet(companyId, req.body, req.user?.id);
      res.status(201).json({ success: true, data, message: 'تم إنشاء مجموعة مراحل الإنتاج القياسية بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateStageTemplateSet(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.updateSet(companyId, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم تحديث مجموعة المراحل بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async archiveStageTemplateSet(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.archiveSet(companyId, req.params.id);
      res.json({ success: true, data, message: 'تم تعطيل مجموعة المراحل القياسية' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async addStageTemplateSetItem(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.addSetItem(companyId, req.params.id, req.body);
      res.status(201).json({ success: true, data, message: 'تمت إضافة المرحلة إلى المجموعة' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async removeStageTemplateSetItem(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.removeSetItem(companyId, req.params.id, req.params.itemId);
      res.json({ success: true, data, message: 'تم حذف المرحلة من المجموعة' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async reorderStageTemplateSetItems(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingStageTemplateService.reorderSetItems(companyId, req.params.id, req.body.itemIds || req.body.orderedItemIds);
      res.json({ success: true, data, message: 'تمت إعادة ترتيب مراحل المجموعة بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async applyStageSetToOrder(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingStageTemplateService.applyStageSetToOrder(
        companyId,
        req.params.orderId,
        req.body,
        req.user?.id
      );
      res.json({ success: true, data: result, message: 'تم استدعاء وتطبيق المراحل القياسية على أمر التشغيل بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async applyStageSetToBom(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingStageTemplateService.applyStageSetToBom(
        companyId,
        req.params.bomId,
        req.body
      );
      res.json({ success: true, data: result, message: 'تم تطبيق المراحل القياسية على قائمة المكونات (BOM) بنجاح' });
    } catch (error) {
      res.status(error.status || error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  // ==========================================================================
  // Wave 7: Partner Factory Agreements & Payments
  // ==========================================================================

  static async listFactoryAgreements(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.listAgreements(companyId, req.query);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async getFactoryAgreementById(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.getAgreementById(companyId, req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      res.status(error.statusCode || 404).json({ success: false, message: error.message });
    }
  }

  static async createFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.createAgreement(companyId, req.user, req.body);
      res.status(201).json({ success: true, data, message: 'تم إنشاء اتفاقية المصنع الشريك بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async updateFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.updateAgreement(companyId, req.params.id, req.body);
      res.json({ success: true, data, message: 'تم تحديث بيانات الاتفاقية بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async activateFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.activateAgreement(companyId, req.params.id);
      res.json({ success: true, data, message: 'تم تفعيل الاتفاقية بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async closeFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.closeAgreement(companyId, req.params.id);
      res.json({ success: true, data, message: 'تم إغلاق الاتفاقية بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cancelFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const data = await ManufacturingFactoryAgreementService.cancelAgreement(companyId, req.params.id);
      res.json({ success: true, data, message: 'تم إلغاء الاتفاقية بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteFactoryAgreement(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.deleteAgreement(companyId, req.params.id);
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async generateAgreementPayments(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.generateDefaultPayments(
        companyId,
        req.params.id,
        req.body
      );
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async createAgreementPayment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.createPayment(
        companyId,
        req.params.id,
        req.body
      );
      res.status(201).json({ success: true, data: result.data, agreement: result.agreement, message: 'تمت إضافة الدفعة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async payAgreementPayment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.payPayment(
        companyId,
        req.params.id,
        req.params.paymentId,
        req.body,
        req.user
      );
      res.json({ success: true, data: result.data, agreement: result.agreement, message: 'تم تسجيل سداد الدفعة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async cancelAgreementPayment(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.cancelPayment(
        companyId,
        req.params.id,
        req.params.paymentId
      );
      res.json({ success: true, data: result.data, agreement: result.agreement, message: 'تم إلغاء الدفعة بنجاح' });
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async uploadAgreementFile(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'الملف مطلوب للرفع' });
      }
      const result = await ManufacturingFactoryAgreementService.addFile(
        companyId,
        req.params.id,
        req.file,
        req.user
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

  static async deleteAgreementFile(req, res) {
    try {
      const companyId = ManufacturingController.getCompanyId(req);
      const result = await ManufacturingFactoryAgreementService.deleteFile(
        companyId,
        req.params.id,
        req.params.fileId
      );
      res.json(result);
    } catch (error) {
      res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
  }

}

module.exports = ManufacturingController;
