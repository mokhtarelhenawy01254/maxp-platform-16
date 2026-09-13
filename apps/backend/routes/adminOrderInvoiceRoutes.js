const express = require('express');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

const router = express.Router();

/**
 * @route GET /api/v1/admin/order-invoices
 * @desc Get all order invoices across all companies with filtering and pagination
 * @access Super Admin
 */
router.get('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      paymentStatus,
      companyId,
      search,
      dateFrom,
      dateTo,
      sortBy = 'issueDate',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
        { companyName: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = new Date(dateFrom);
      if (dateTo) where.issueDate.lte = new Date(dateTo);
    }

    const [invoices, total] = await executeWithRetry(async () => {
      return await Promise.all([
        getSharedPrismaClient().orderInvoice.findMany({
          where,
          include: {
            order: {
              select: {
                orderNumber: true,
                status: true,
                turboTrackingNumber: true,
              }
            }
          },
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          }
        }),
        getSharedPrismaClient().orderInvoice.count({ where })
      ]);
    });

    const stats = await executeWithRetry(async () => {
      return await getSharedPrismaClient().orderInvoice.groupBy({
        by: ['paymentStatus'],
        _count: { id: true },
        _sum: { totalAmount: true }
      });
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.paymentStatus] = {
        count: stat._count.id,
        amount: stat._sum.totalAmount || 0
      };
      return acc;
    }, {});

    const totalRevenue = await executeWithRetry(async () => {
      return await getSharedPrismaClient().orderInvoice.aggregate({
        where: { paymentStatus: { in: ['PAID', 'COMPLETED'] } },
        _sum: { totalAmount: true }
      });
    });

    res.json({
      success: true,
      message: 'تم جلب فواتير الطلبات بنجاح',
      data: {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: {
          total,
          byPaymentStatus: statusStats,
          totalRevenue: totalRevenue._sum.totalAmount || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching order invoices:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب فواتير الطلبات',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/order-invoices/stats
 * @desc Get aggregated statistics for all order invoices
 * @access Super Admin
 */
router.get('/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      cancelledInvoices,
      totalRevenue,
      recentInvoices,
      byCompany
    ] = await Promise.all([
      getSharedPrismaClient().orderInvoice.count(),
      getSharedPrismaClient().orderInvoice.count({
        where: { paymentStatus: { in: ['PAID', 'COMPLETED'] } }
      }),
      getSharedPrismaClient().orderInvoice.count({
        where: { paymentStatus: 'PENDING' }
      }),
      getSharedPrismaClient().orderInvoice.count({
        where: { paymentStatus: 'CANCELLED' }
      }),
      getSharedPrismaClient().orderInvoice.aggregate({
        where: { paymentStatus: { in: ['PAID', 'COMPLETED'] } },
        _sum: { totalAmount: true }
      }),
      getSharedPrismaClient().orderInvoice.findMany({
        where: { issueDate: { gte: startDate } },
        orderBy: { issueDate: 'desc' },
        take: 10,
        include: {
          order: {
            select: { orderNumber: true }
          }
        }
      }),
      getSharedPrismaClient().orderInvoice.groupBy({
        by: ['companyId'],
        where: { paymentStatus: { in: ['PAID', 'COMPLETED'] } },
        _count: { id: true },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 10
      })
    ]);

    res.json({
      success: true,
      message: 'تم جلب إحصائيات فواتير الطلبات بنجاح',
      data: {
        overview: {
          totalInvoices,
          paidInvoices,
          pendingInvoices,
          cancelledInvoices,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          averageInvoiceValue: paidInvoices > 0
            ? (totalRevenue._sum.totalAmount || 0) / paidInvoices
            : 0
        },
        recentInvoices,
        byCompany,
        period: daysAgo
      }
    });

  } catch (error) {
    console.error('Error fetching order invoice stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات فواتير الطلبات',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/order-invoices/:id
 * @desc Get single order invoice details
 * @access Super Admin
 */
router.get('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await executeWithRetry(async () => {
      return await getSharedPrismaClient().orderInvoice.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              orderNumber: true,
              status: true,
              turboTrackingNumber: true,
              orderItems: {
                select: {
                  productName: true,
                  quantity: true,
                  price: true,
                  total: true,
                  productSku: true,
                  productColor: true,
                  productSize: true,
                  product: {
                    select: {
                      sku: true,
                      barcode: true,
                    }
                  },
                  productVariant: {
                    select: {
                      sku: true,
                    }
                  }
                }
              }
            }
          }
        }
      });
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة'
      });
    }

    if (invoice?.order?.orderItems) {
      invoice.order.orderItems = invoice.order.orderItems.map(item => {
        let metaSku = null;
        if (item.metadata) {
          let m = item.metadata;
          if (typeof m === 'string' && m.trim()) {
            try { m = JSON.parse(m); } catch (e) { m = null; }
          }
          if (m && typeof m === 'object') {
            metaSku = m.sku || m.variantSku || m.productSku || m.code || m.barcode || null;
          }
        }
        return {
          ...item,
          productSku:
            item.productSku ||
            item.sku ||
            item.code ||
            item.productVariant?.sku ||
            item.product?.sku ||
            metaSku ||
            item.barcode ||
            item.product?.barcode ||
            null
        };
      });
    }

    res.json({
      success: true,
      message: 'تم جلب بيانات الفاتورة بنجاح',
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching order invoice:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات الفاتورة',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/admin/order-invoices/companies/list
 * @desc Get list of companies that have order invoices
 * @access Super Admin
 */
router.get('/companies/list', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await executeWithRetry(async () => {
      return await getSharedPrismaClient().orderInvoice.groupBy({
        by: ['companyId', 'companyName'],
        _count: { id: true },
        orderBy: { companyName: 'asc' }
      });
    });

    res.json({
      success: true,
      message: 'تم جلب قائمة الشركات بنجاح',
      data: companies.map(c => ({
        companyId: c.companyId,
        companyName: c.companyName,
        invoiceCount: c._count.id
      }))
    });

  } catch (error) {
    console.error('Error fetching companies list:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب قائمة الشركات',
      error: error.message
    });
  }
});

module.exports = router;
