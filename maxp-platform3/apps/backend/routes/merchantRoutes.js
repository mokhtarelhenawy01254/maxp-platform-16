const express = require('express');
const router = express.Router();
const merchantService = require('../services/merchantService');
const commissionService = require('../services/commissionService');
const verifyToken = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fulfillmentService = require('../services/fulfillmentService');

const canManageMerchants = (userRole) =>
  ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole);

const normalizeMerchantForResponse = (merchant) => {
  if (!merchant) {
    return merchant;
  }

  const normalizedProducts = merchant.products || merchant.merchantProducts || [];
  const merchantOrdersCount =
    merchant._count?.orders ?? merchant._count?.merchantOrders ?? 0;

  return {
    ...merchant,
    products: normalizedProducts,
    _count: merchant._count
      ? {
          ...merchant._count,
          orders: merchantOrdersCount
        }
      : undefined
  };
};

const decorateMerchantForCompanyDashboard = async (
  merchant,
  operationsLimit = 3
) => {
  const [merchantWithInventory, operationsSummary] = await Promise.all([
    merchantService.decorateMerchantRecordWithInventorySnapshot(merchant),
    merchantService.getMerchantOperationsSummary(merchant.id, {
      limit: operationsLimit
    })
  ]);

  return {
    ...merchantWithInventory,
    operationsSummary
  };
};

const findMerchantForCompany = (prisma, merchantId, companyId, include) =>
  prisma.merchant.findFirst({
    where: {
      id: merchantId,
      companyId
    },
    ...(include ? { include } : {})
  });

const findMerchantPayoutForCompany = (prisma, payoutId, companyId) =>
  prisma.merchantPayout.findFirst({
    where: {
      id: payoutId,
      merchant: {
        companyId
      }
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true
        }
      },
      commissions: {
        select: {
          id: true,
          amount: true,
          status: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true
            }
          }
        }
      }
    }
  });

const sumGroupedAmount = (rows, statuses) =>
  rows
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + Number(row._sum.amount || 0), 0);

const countGroupedRows = (rows, statuses) =>
  rows
    .filter((row) => statuses.includes(row.status))
    .reduce((total, row) => total + Number(row._count.id || 0), 0);

const validateFulfillmentReferences = async (prisma, companyId, body) => {
  if (body.defaultWarehouseId) {
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: body.defaultWarehouseId,
        companyId,
        isActive: true
      },
      select: { id: true }
    });

    if (!warehouse) {
      throw new Error('المخزن الافتراضي غير موجود أو لا يتبع هذه الشركة');
    }

    const fulfillmentMode = fulfillmentService.normalizeFulfillmentMode(
      body.fulfillmentMode
    );
    if (fulfillmentMode === 'COMPANY_WAREHOUSE' && warehouse.merchantId) {
      throw new Error('مخزن الشركة المشترك لا يجب أن يكون مملوكاً لتاجر محدد');
    }
  }

  if (body.defaultShippingCompanyId) {
    const shippingCompany = await prisma.shippingCompany.findFirst({
      where: {
        id: body.defaultShippingCompanyId,
        companyId,
        isActive: true
      },
      select: { id: true }
    });

    if (!shippingCompany) {
      throw new Error('شركة الشحن الافتراضية غير موجودة أو لا تتبع هذه الشركة');
    }
  }
};

/**
 * إنشاء تاجر جديد
 */
router.post('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات (OWNER أو COMPANY_ADMIN فقط)
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة التجار'
      });
    }

    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();
    await validateFulfillmentReferences(prisma, companyId, req.body);
    const merchant = await merchantService.createMerchant(companyId, req.body);

    res.json({
      success: true,
      message: 'تم إنشاء التاجر بنجاح',
      data: merchant
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error creating merchant:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إنشاء التاجر'
    });
  }
});

/**
 * قائمة التجار
 */
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة التجار'
      });
    }

    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchants = await prisma.merchant.findMany({
      where: { companyId },
      include: {
        merchantProducts: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        },
        _count: {
          select: {
            merchantOrders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const merchantsWithDashboardSnapshot = await Promise.all(
      merchants.map((merchant) =>
        decorateMerchantForCompanyDashboard(merchant, 3)
      )
    );

    res.json({
      success: true,
      data: merchantsWithDashboardSnapshot.map(normalizeMerchantForResponse)
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchants:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب التجار'
    });
  }
});

/**
 * طلبات سحب مستحقات التجار
 */
router.get('/payouts', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة مستحقات التجار'
      });
    }

    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();
    const payouts = await prisma.merchantPayout.findMany({
      where: {
        merchant: { companyId }
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            status: true,
            orderId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchant payouts:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب طلبات سحب التجار'
    });
  }
});

router.post('/payouts/:payoutId/record-external', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة مستحقات التجار'
      });
    }

    const prisma = getSharedPrismaClient();
    const payout = await findMerchantPayoutForCompany(
      prisma,
      req.params.payoutId,
      req.user.companyId
    );

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'طلب سحب التاجر غير موجود'
      });
    }

    const updated = await commissionService.recordExternalMerchantPayout(
      payout.id,
      {
        transactionId: req.body.transactionId || null,
        externalReference: req.body.externalReference || null,
        processedBy: req.user.id,
        notes: req.body.notes || null
      }
    );

    res.json({
      success: true,
      message: 'تم تسجيل تحويل مستحقات التاجر',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error recording merchant payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'تعذر تسجيل تحويل مستحقات التاجر'
    });
  }
});

router.post('/payouts/:payoutId/cancel', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة مستحقات التجار'
      });
    }

    const prisma = getSharedPrismaClient();
    const payout = await findMerchantPayoutForCompany(
      prisma,
      req.params.payoutId,
      req.user.companyId
    );

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'طلب سحب التاجر غير موجود'
      });
    }

    const updated = await commissionService.cancelMerchantPayoutRequest(
      payout.id,
      {
        reason: req.body.reason,
        processedBy: req.user.id
      }
    );

    res.json({
      success: true,
      message: 'تم إلغاء طلب سحب التاجر',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error cancelling merchant payout:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'تعذر إلغاء طلب سحب التاجر'
    });
  }
});

/**
 * ملف تاجر كامل للشركة
 */
router.get('/:id/profile', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة التجار'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await findMerchantForCompany(prisma, id, companyId, {
      merchantProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              stock: true,
              images: true,
              isActive: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: {
          merchantOrders: true,
          merchantProducts: true,
          commissions: true,
          merchant_payouts: true
        }
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const [
      merchantWithDashboardSnapshot,
      payoutSummary,
      commissionStats,
      commissions,
      payoutStats,
      payouts,
      user,
      defaultWarehouse,
      defaultShippingCompany,
      merchantWarehouses
    ] = await Promise.all([
      decorateMerchantForCompanyDashboard(merchant, 20),
      commissionService.getMerchantPayoutSummary(merchant.id),
      prisma.commission.groupBy({
        by: ['status'],
        where: {
          merchantId: id,
          companyId,
          type: 'MERCHANT'
        },
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.commission.findMany({
        where: {
          merchantId: id,
          companyId,
          type: 'MERCHANT'
        },
        select: {
          id: true,
          amount: true,
          status: true,
          type: true,
          calculationType: true,
          rate: true,
          markup: true,
          baseAmount: true,
          orderTotal: true,
          merchantPayoutId: true,
          paidAt: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true
            }
          },
          merchant_payout: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              processedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
      }),
      prisma.merchantPayout.groupBy({
        by: ['status'],
        where: { merchantId: id },
        _count: { id: true },
        _sum: { amount: true }
      }),
      prisma.merchantPayout.findMany({
        where: { merchantId: id },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          paymentDetails: true,
          transactionId: true,
          externalReference: true,
          processedAt: true,
          processedBy: true,
          notes: true,
          createdAt: true,
          commissions: {
            select: {
              id: true,
              amount: true,
              status: true,
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true
                }
              }
            },
            take: 10
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.user.findFirst({
        where: {
          companyId,
          role: 'MERCHANT',
          email: {
            equals: merchant.email,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          avatar: true,
          isActive: true,
          isEmailVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      merchant.defaultWarehouseId
        ? prisma.warehouse.findFirst({
            where: { id: merchant.defaultWarehouseId, companyId },
            select: {
              id: true,
              name: true,
              location: true,
              type: true,
              isActive: true,
              merchantId: true
            }
          })
        : Promise.resolve(null),
      merchant.defaultShippingCompanyId
        ? prisma.shippingCompany.findFirst({
            where: { id: merchant.defaultShippingCompanyId, companyId },
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
              providerKey: true,
              integrationMode: true,
              isActive: true
            }
          })
        : Promise.resolve(null),
      prisma.warehouse.findMany({
        where: {
          companyId,
          merchantId: id
        },
        select: {
          id: true,
          name: true,
          location: true,
          type: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              inventories: true,
              shipments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    const normalizedMerchant = normalizeMerchantForResponse(
      merchantWithDashboardSnapshot
    );
    const inventorySummary = normalizedMerchant.inventorySummary || {};
    const operationsSummary = normalizedMerchant.operationsSummary || {};
    const operationsTotals = operationsSummary.summary || {};
    const payoutBalances = payoutSummary.balances || {};

    res.json({
      success: true,
      data: {
        merchant: normalizedMerchant,
        user,
        defaultWarehouse,
        defaultShippingCompany,
        merchantWarehouses,
        inventorySummary: normalizedMerchant.inventorySummary || null,
        operationsSummary: normalizedMerchant.operationsSummary || null,
        products: normalizedMerchant.products || [],
        commissions,
        payouts,
        payoutSummary,
        stats: {
          linkedProducts: Number(inventorySummary.linkedProducts || 0),
          availableForSale: Number(inventorySummary.availableForSale || 0),
          merchantProductStock: Number(inventorySummary.merchantProductStock || 0),
          physicalQuantity: Number(inventorySummary.physicalQuantity || 0),
          physicalAvailable: Number(inventorySummary.physicalAvailable || 0),
          reservedQuantity: Number(inventorySummary.reservedQuantity || 0),
          ordersCount: Number(operationsTotals.assignedOrdersCount || 0),
          assignedPieces: Number(operationsTotals.assignedPieces || 0),
          deliveredOrders: Number(operationsTotals.deliveredOrdersCount || 0),
          deliveredPieces: Number(operationsTotals.deliveredPieces || 0),
          inShippingOrders: Number(operationsTotals.inShippingOrdersCount || 0),
          inShippingPieces: Number(operationsTotals.inShippingPieces || 0),
          notDeliveredOrders: Number(operationsTotals.notDeliveredOrdersCount || 0),
          notDeliveredPieces: Number(operationsTotals.notDeliveredPieces || 0),
          payablePieces: Number(operationsTotals.payablePieces || 0),
          pendingPayablePieces: Number(operationsTotals.pendingPayablePieces || 0),
          expectedReceivableAmount: Number(
            operationsTotals.expectedReceivableAmount || 0
          ),
          deliveredPayableAmount: Number(
            operationsTotals.deliveredPayableAmount || 0
          ),
          inShippingAmount: Number(operationsTotals.inShippingAmount || 0),
          notDeliveredAmount: Number(operationsTotals.notDeliveredAmount || 0),
          shippingCostAmount: Number(operationsTotals.shippingCostAmount || 0),
          commissionsCount: countGroupedRows(commissionStats, [
            'PENDING',
            'CONFIRMED',
            'PAID',
            'CANCELLED'
          ]),
          confirmedCommissionAmount: sumGroupedAmount(commissionStats, [
            'CONFIRMED'
          ]),
          pendingCommissionAmount: sumGroupedAmount(commissionStats, ['PENDING']),
          paidCommissionAmount: sumGroupedAmount(commissionStats, ['PAID']),
          cancelledCommissionAmount: sumGroupedAmount(commissionStats, [
            'CANCELLED'
          ]),
          availablePayoutAmount: Number(payoutBalances.availableAmount || 0),
          availableCommissionsCount: Number(
            payoutBalances.availableCommissionsCount || 0
          ),
          pendingPayoutAmount: Number(payoutBalances.pendingPayoutAmount || 0),
          confirmedPayoutAmount: Number(payoutBalances.confirmedAmount || 0),
          paidPayoutAmount: Number(payoutBalances.paidAmount || 0),
          payoutRequestsCount: payoutStats.reduce(
            (total, row) => total + Number(row._count.id || 0),
            0
          ),
          processedPayoutAmount: sumGroupedAmount(payoutStats, [
            'PROCESSED',
            'PAID'
          ])
        }
      }
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchant profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب ملف التاجر'
    });
  }
});

/**
 * ملخص تسوية وتشغيل تاجر واحد للشركة
 */
router.get('/:id/settlement-summary', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لمتابعة تسويات التجار'
      });
    }

    const { id: merchantId } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await findMerchantForCompany(prisma, merchantId, companyId, {
      merchantProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      },
      _count: {
        select: {
          merchantOrders: true,
          merchantProducts: true,
          commissions: true
        }
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const [merchantWithDashboardSnapshot, payoutSummary] = await Promise.all([
      decorateMerchantForCompanyDashboard(merchant, 8),
      commissionService.getMerchantPayoutSummary(merchant.id)
    ]);
    const normalizedMerchant = normalizeMerchantForResponse(
      merchantWithDashboardSnapshot
    );

    res.json({
      success: true,
      data: {
        merchant: normalizedMerchant,
        inventorySummary: normalizedMerchant.inventorySummary || null,
        operationsSummary: normalizedMerchant.operationsSummary || null,
        payoutSummary
      }
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting settlement summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'تعذر تحميل ملخص تسوية التاجر'
    });
  }
});

/**
 * تفاصيل تاجر
 */
router.get('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة التجار'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await findMerchantForCompany(prisma, id, companyId, {
      merchantProducts: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              images: true
            }
          }
        }
      }
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const merchantWithDashboardSnapshot =
      await decorateMerchantForCompanyDashboard(merchant, 8);

    res.json({
      success: true,
      data: normalizeMerchantForResponse(merchantWithDashboardSnapshot)
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting merchant:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب بيانات التاجر'
    });
  }
});

/**
 * تحديث تاجر
 */
router.put('/:id', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لتعديل التجار'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();
    await validateFulfillmentReferences(prisma, companyId, req.body);

    // التحقق من أن التاجر يتبع نفس الشركة
    const merchant = await findMerchantForCompany(prisma, id, companyId);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const updated = await merchantService.updateMerchant(id, req.body);

    res.json({
      success: true,
      message: 'تم تحديث التاجر بنجاح',
      data: updated
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error updating merchant:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحديث التاجر'
    });
  }
});

/**
 * إضافة منتج للتاجر
 */
router.post('/:id/products', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة منتجات التجار'
      });
    }

    const { id: merchantId } = req.params;
    const { productId, ...productData } = req.body;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const [merchant, product] = await Promise.all([
      findMerchantForCompany(prisma, merchantId, companyId),
      prisma.product.findFirst({
        where: {
          id: productId,
          companyId
        },
        select: { id: true }
      })
    ]);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const merchantProduct = await merchantService.addMerchantProduct(
      merchantId,
      productId,
      productData
    );

    res.json({
      success: true,
      message: 'تم إضافة المنتج للتاجر بنجاح',
      data: merchantProduct
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error adding product:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء إضافة المنتج'
    });
  }
});

/**
 * طلبات التاجر
 */
router.get('/:id/orders', verifyToken.authenticateToken, async (req, res) => {
  try {
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة طلبات التجار'
      });
    }

    const { id: merchantId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await findMerchantForCompany(prisma, merchantId, companyId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const orders = await merchantService.getMerchantOrders(merchantId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الطلبات'
    });
  }
});

/**
 * مزامنة المخزون
 */
router.post('/:id/sync', verifyToken.authenticateToken, async (req, res) => {
  try {
    // التحقق من الصلاحيات
    if (!canManageMerchants(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لمزامنة المخزون'
      });
    }

    const { id: merchantId } = req.params;
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    const merchant = await findMerchantForCompany(prisma, merchantId, companyId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'التاجر غير موجود'
      });
    }

    const result = await merchantService.syncMerchantInventory(merchantId);

    res.json({
      success: true,
      message: 'تمت المزامنة بنجاح',
      data: result
    });
  } catch (error) {
    console.error('❌ [MERCHANT-ROUTES] Error syncing inventory:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء المزامنة'
    });
  }
});

module.exports = router;
