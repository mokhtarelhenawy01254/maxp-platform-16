const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');
const shippingProviderService = require('../services/shippingProviderService');
const TurboService = require('../services/turboService');
const BostaService = require('../services/bostaService');
const QpExpressService = require('../services/qpExpressService');

// Ensure recent Turbo orders are reflected in prisma.shipment
async function syncTurboOrdersToShipments(prisma, companyId) {
  try {
    const unsyncedOrders = await prisma.order.findMany({
      where: {
        companyId,
        OR: [
          { turboTrackingNumber: { not: null } },
          { turboShipmentId: { not: null } },
        ],
        shipments: { none: {} },
      },
      select: {
        id: true,
        orderNumber: true,
        turboTrackingNumber: true,
        turboShipmentId: true,
        turboShipmentStatus: true,
        turboLabelUrl: true,
        turboMetadata: true,
        governorate: true,
        city: true,
        customerAddress: true,
        shippingAddress: true,
        shipping: true,
        currency: true,
        createdAt: true,
      },
      take: 60,
    });

    if (unsyncedOrders.length > 0) {
      const turboCarrier = await prisma.shippingCompany.findFirst({
        where: { companyId, providerKey: 'TURBO' },
        select: { id: true },
      });

      for (const ord of unsyncedOrders) {
        const tracking = ord.turboTrackingNumber || ord.turboShipmentId;
        if (!tracking) continue;
        await prisma.shipment.create({
          data: {
            companyId,
            orderId: ord.id,
            shippingCompanyId: turboCarrier?.id || null,
            carrierType: 'TURBO',
            status: ord.turboShipmentStatus || 'CREATED',
            trackingNumber: ord.turboTrackingNumber || null,
            externalShipmentId: ord.turboShipmentId || null,
            labelUrl: ord.turboLabelUrl || null,
            destinationGovernorate: ord.governorate || null,
            destinationCity: ord.city || null,
            destinationAddress: ord.customerAddress || ord.shippingAddress || null,
            cost: ord.shipping !== null && ord.shipping !== undefined ? Number(ord.shipping) : null,
            currency: ord.currency || 'EGP',
            createdAt: ord.createdAt || new Date(),
            metadata: ord.turboMetadata || null,
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('⚠️ [SHIPMENTS] syncTurboOrdersToShipments warning:', err.message);
  }
}

// GET /api/v1/shipments - List all shipments with multi-carrier filters & pagination
router.get('/', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const {
      page = 1,
      limit = 20,
      search,
      shippingCompanyId,
      carrierType,
      status,
      dateFrom,
      dateTo,
    } = req.query;

    // Background sync of Turbo orders to ensure UnifiedShipments reflects them
    await syncTurboOrdersToShipments(prisma, companyId);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where = { companyId };

    if (shippingCompanyId && shippingCompanyId !== 'ALL') {
      const selectedComp = await prisma.shippingCompany.findFirst({
        where: { id: shippingCompanyId, companyId },
        select: { id: true, providerKey: true },
      });
      if (selectedComp?.providerKey && selectedComp.providerKey !== 'MANUAL') {
        where.OR = [
          { shippingCompanyId },
          { carrierType: selectedComp.providerKey },
        ];
      } else {
        where.shippingCompanyId = shippingCompanyId;
      }
    }

    if (carrierType && carrierType !== 'ALL') {
      where.carrierType = carrierType;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const searchConditions = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { externalShipmentId: { contains: q, mode: 'insensitive' } },
        { destinationGovernorate: { contains: q, mode: 'insensitive' } },
        { destinationCity: { contains: q, mode: 'insensitive' } },
        {
          order: {
            OR: [
              { orderNumber: { contains: q, mode: 'insensitive' } },
              { customerName: { contains: q, mode: 'insensitive' } },
              { customerPhone: { contains: q, mode: 'insensitive' } },
              { customer: { firstName: { contains: q, mode: 'insensitive' } } },
              { customer: { lastName: { contains: q, mode: 'insensitive' } } },
              { customer: { phone: { contains: q, mode: 'insensitive' } } },
            ],
          },
        },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [total, shipments, countsByStatus, pendingAmountAggr] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        include: {
          shippingCompany: {
            select: {
              id: true,
              name: true,
              slug: true,
              providerKey: true,
              integrationMode: true,
              phone: true,
              website: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              customerPhone: true,
              total: true,
              currency: true,
              status: true,
              governorate: true,
              city: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.shipment.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { id: true },
      }),
      prisma.shipment.aggregate({
        where: {
          companyId,
          settlementStatus: 'PENDING',
        },
        _sum: { cost: true },
      }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

    // Summarize status metrics
    const statusCounts = {};
    let deliveredCount = 0;
    let inTransitCount = 0;
    let returnedCount = 0;

    countsByStatus.forEach((item) => {
      statusCounts[item.status] = item._count.id;
      const s = String(item.status || '').toUpperCase();
      if (s === 'DELIVERED' || s === 'COMPLETED') {
        deliveredCount += item._count.id;
      } else if (s.includes('TRANSIT') || s.includes('SHIPPED') || s.includes('OUT_FOR_DELIVERY') || s === 'DELIVERING') {
        inTransitCount += item._count.id;
      } else if (s.includes('RETURN') || s.includes('CANCELLED') || s.includes('FAILED')) {
        returnedCount += item._count.id;
      }
    });

    const summary = {
      totalShipments: countsByStatus.reduce((acc, curr) => acc + curr._count.id, 0),
      inTransit: inTransitCount,
      delivered: deliveredCount,
      returned: returnedCount,
      pendingRemittanceAmount: Number(pendingAmountAggr?._sum?.cost || 0),
      statusCounts,
    };

    const formattedShipments = shipments.map((s) => {
      const cust = s.order?.customer;
      const customerName =
        s.order?.customerName ||
        (cust ? [cust.firstName, cust.lastName].filter(Boolean).join(' ') : null) ||
        'عميل';
      const customerPhone = s.order?.customerPhone || cust?.phone || null;

      return {
        ...s,
        cost: s.cost !== null && s.cost !== undefined ? Number(s.cost) : null,
        order: s.order
          ? {
              ...s.order,
              total: s.order.total !== null && s.order.total !== undefined ? Number(s.order.total) : 0,
              customer: {
                id: cust?.id || null,
                name: customerName,
                phone: customerPhone,
              },
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: formattedShipments,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages,
      },
      summary,
    });
  } catch (error) {
    console.error('Error fetching shipments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/create - Create shipment for an order with selected carrier
router.post('/create', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { companyId } = req.user;
    const { orderId, shippingCompanyId, trackingNumber, manualDeliveryNotes } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, companyId },
      include: { customer: true, orderItems: { include: { product: true } } },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let shippingCompany = null;
    if (shippingCompanyId) {
      shippingCompany = await prisma.shippingCompany.findFirst({
        where: { id: shippingCompanyId, companyId },
      });
    }

    // Check if shipment already exists
    let shipment = await prisma.shipment.findFirst({
      where: { orderId: order.id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      shipment = await prisma.shipment.create({
        data: {
          companyId,
          orderId: order.id,
          shippingCompanyId: shippingCompany?.id || null,
          carrierType: shippingCompany?.providerKey || 'MANUAL',
          status: 'PENDING',
          trackingNumber: trackingNumber || null,
          destinationGovernorate: order.governorate || null,
          destinationCity: order.city || null,
          destinationAddress: order.customerAddress || order.shippingAddress || null,
          cost: order.shipping !== undefined && order.shipping !== null ? Number(order.shipping) : null,
          currency: order.currency || 'EGP',
          metadata: manualDeliveryNotes ? JSON.stringify({ notes: manualDeliveryNotes }) : null,
        },
        include: { shippingCompany: true, order: true },
      });
    } else {
      shipment = await prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          shippingCompanyId: shippingCompany?.id || shipment.shippingCompanyId,
          carrierType: shippingCompany?.providerKey || shipment.carrierType,
          trackingNumber: trackingNumber || shipment.trackingNumber,
        },
        include: { shippingCompany: true, order: true },
      });
    }

    // If company is integrated, attempt provider dispatch
    if (shippingCompany && shippingCompany.integrationMode !== 'MANUAL') {
      const dispatchResult = await shippingProviderService.createProviderShipment(
        prisma,
        shipment.id,
        { force: true, allowLiveCreate: true },
      );
      return res.json({
        success: true,
        data: dispatchResult,
        message: 'تم إنشاء الشحنة وتوجيهها لشركة الشحن',
      });
    }

    res.json({
      success: true,
      data: shipment,
      message: 'تم حفظ بيانات الشحن بنجاح',
    });
  } catch (error) {
    console.error('Error creating shipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/:id/sync - Sync shipment status with carrier
router.post('/:id/sync', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    const providerKey = shipment.shippingCompany?.providerKey || shipment.carrierType;

    // Turbo Live Sync
    if (providerKey === 'TURBO' && shipment.trackingNumber) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
      const turboService = new TurboService(turboApiKey, companyId);
      const tracking = await turboService.trackShipment(shipment.trackingNumber);

      if (tracking?.status) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: tracking.status,
            metadata: JSON.stringify({
              ...shippingProviderService.safeJsonParse(shipment.metadata, {}),
              lastLiveSync: new Date().toISOString(),
              liveStatus: tracking,
            }),
          },
        });
        return res.json({ success: true, tracking, message: 'تمت المزامنة بنجاح' });
      }
    }

    // Bosta Live Sync
    if (providerKey === 'BOSTA' && shipment.trackingNumber) {
      const bostaApiKey = shipment.shippingCompany?.apiKey;
      const bostaService = new BostaService(bostaApiKey, companyId);
      const tracking = await bostaService.trackShipment(shipment.trackingNumber);

      if (tracking?.state) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: tracking.state,
            metadata: JSON.stringify({
              ...shippingProviderService.safeJsonParse(shipment.metadata, {}),
              lastLiveSync: new Date().toISOString(),
              liveStatus: tracking,
            }),
          },
        });
        return res.json({ success: true, tracking, message: 'تمت المزامنة بنجاح' });
      }
    }

    // QP Express Live Sync
    if ((providerKey === 'QP_EXPRESS' || providerKey === 'QPEXPRESS') && shipment.trackingNumber) {
      const qpService = new QpExpressService({}, companyId);
      const tracking = await qpService.trackShipment(shipment.trackingNumber);

      if (tracking?.found) {
        await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: tracking.status,
            metadata: JSON.stringify({
              ...shippingProviderService.safeJsonParse(shipment.metadata, {}),
              lastLiveSync: new Date().toISOString(),
              liveStatus: tracking,
            }),
          },
        });
        return res.json({ success: true, tracking, message: 'تمت المزامنة مع QP Express بنجاح' });
      }
    }

    res.json({
      success: true,
      message: 'تم فحص الشحنة (لا يدعم هذا المزود المزامنة الحية المباشرة)',
    });
  } catch (error) {
    console.error('Error syncing shipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/:id/cancel - Cancel shipment with carrier
router.post('/:id/cancel', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;
    const { reason } = req.body;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment not found' });
    }

    const providerKey = shipment.shippingCompany?.providerKey || shipment.carrierType;

    if (providerKey === 'TURBO' && shipment.trackingNumber) {
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
      const turboService = new TurboService(turboApiKey, companyId);
      await turboService.cancelShipment(shipment.trackingNumber, reason || 'Cancelled by admin');
    } else if ((providerKey === 'QP_EXPRESS' || shipment.carrierType === 'QP_EXPRESS') && shipment.trackingNumber) {
      const qpService = new QpExpressService({}, companyId);
      await qpService.cancelShipment(shipment.trackingNumber);
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'CANCELLED',
        metadata: JSON.stringify({
          ...shippingProviderService.safeJsonParse(shipment.metadata, {}),
          cancelledAt: new Date().toISOString(),
          cancelReason: reason || null,
        }),
      },
    });

    res.json({ success: true, data: updated, message: 'تم إلغاء الشحنة بنجاح' });
  } catch (error) {
    console.error('Error cancelling shipment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
