/**
 * Public Production Order Tracking Controller (HZ-F)
 *
 * Public unauthenticated read-only endpoint for customers tracking production orders.
 * Strictly sanitizes output: zero costs, zero selling prices, zero customer personal data, zero company internal notes.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const STATUS_LABELS_AR = {
  PLANNED: 'مخطط',
  RELEASED: 'معتمد للتشغيل',
  IN_PROGRESS: 'قيد التشغيل',
  QC_PENDING: 'بانتظار الفحص',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
};

class PublicProductionController {
  /**
   * GET /api/v1/public/production-orders/:token
   */
  static async getPublicOrder(req, res) {
    try {
      const token = String(req.params.token || '').trim();
      if (!token) {
        return res.status(404).json({
          success: false,
          error: 'الرابط غير صالح',
        });
      }

      const prisma = getSharedPrismaClient();
      const order = await prisma.productionOrder.findFirst({
        where: { publicToken: token },
        select: {
          orderNumber: true,
          status: true,
          orderType: true,
          brandName: true,
          plannedQuantity: true,
          producedQuantity: true,
          startDate: true,
          dueDate: true,
          updatedAt: true,
          stages: {
            orderBy: { sequence: 'asc' },
            select: {
              name: true,
              status: true,
              completedAt: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'أمر الإنتاج غير موجود أو الرابط غير صالح',
        });
      }

      const data = {
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabelAr: STATUS_LABELS_AR[order.status] || order.status,
        orderType: order.orderType,
        brandName: order.brandName || null,
        plannedQuantity: Number(order.plannedQuantity || 0),
        producedQuantity: Number(order.producedQuantity || 0),
        startDate: order.startDate || null,
        dueDate: order.dueDate || null,
        stages: (order.stages || []).map((stage) => ({
          name: stage.name,
          status: stage.status,
          completedAt: stage.completedAt || null,
        })),
        updatedAt: order.updatedAt,
      };

      return res.json({
        success: true,
        data,
      });
    } catch (err) {
      return res.status(err.statusCode || err.status || 500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء تحميل بيانات أمر الإنتاج',
      });
    }
  }
}

module.exports = PublicProductionController;
