const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require('../utils/verifyToken');
const shippingProviderService = require('../services/shippingProviderService');
const TurboService = require('../services/turboService');
const BostaService = require('../services/bostaService');
const QpExpressService = require('../services/qpExpressService');
const { STATUS_FILTER_ALIASES } = require('../utils/turbo/constants');

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

    const andConditions = [{ companyId }];

    if (shippingCompanyId && shippingCompanyId !== 'ALL') {
      const selectedComp = await prisma.shippingCompany.findFirst({
        where: { id: shippingCompanyId, companyId },
        select: { id: true, providerKey: true },
      });
      if (selectedComp?.providerKey && selectedComp.providerKey !== 'MANUAL') {
        andConditions.push({
          OR: [
            { shippingCompanyId },
            { carrierType: selectedComp.providerKey },
          ],
        });
      } else {
        andConditions.push({ shippingCompanyId });
      }
    }

    if (carrierType && carrierType !== 'ALL') {
      andConditions.push({ carrierType });
    }

    if (status && status !== 'ALL') {
      const sKey = String(status).toLowerCase().trim();
      const targetAliases = STATUS_FILTER_ALIASES[sKey] || [status, sKey, sKey.toUpperCase()];
      andConditions.push({
        OR: [
          { status: { in: targetAliases } },
          { order: { turboShipmentStatus: { in: targetAliases } } },
        ],
      });
    }

    if (dateFrom || dateTo) {
      const dateCondition = {};
      if (dateFrom) dateCondition.gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateCondition.lte = to;
      }
      andConditions.push({ createdAt: dateCondition });
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      andConditions.push({
        OR: [
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
                { turboTrackingNumber: { contains: q, mode: 'insensitive' } },
                { turboShipmentId: { contains: q, mode: 'insensitive' } },
                { turboCaptainName: { contains: q, mode: 'insensitive' } },
                { turboCaptainPhone: { contains: q, mode: 'insensitive' } },
                { turboBranchName: { contains: q, mode: 'insensitive' } },
                { customer: { firstName: { contains: q, mode: 'insensitive' } } },
                { customer: { lastName: { contains: q, mode: 'insensitive' } } },
                { customer: { phone: { contains: q, mode: 'insensitive' } } },
              ],
            },
          },
        ],
      });
    }

    const where = { AND: andConditions };

    const [total, shipments, countsByStatus, pendingAmountAggr, allCarrierShipments] = await Promise.all([
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
              shippingAddress: true,
              customerAddress: true,
              shipping: true,
              paymentMethod: true,
              notes: true,
              turboShipmentId: true,
              turboTrackingNumber: true,
              turboShipmentStatus: true,
              turboCaptainName: true,
              turboCaptainPhone: true,
              turboBranchName: true,
              turboBranchPhone: true,
              turboDelayReason: true,
              turboReturnReason: true,
              turboExpectedBranch: true,
              turboMetadata: true,
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
      prisma.shipment.findMany({
        where: {
          companyId,
          ...(shippingCompanyId && shippingCompanyId !== 'ALL' ? { shippingCompanyId } : {}),
        },
        select: {
          status: true,
          order: {
            select: {
              turboShipmentStatus: true,
            },
          },
        },
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

    // Granular 12-stage Turbo / Carrier counts
    const carrierStagesCounts = {
      all: allCarrierShipments.length,
      incomplete: 0,
      turbo_sent: 0,
      processing: 0,
      out_for_delivery: 0,
      delayed: 0,
      delivered: 0,
      returned_to_company: 0,
      returned_destroyed: 0,
      returned_missing: 0,
      returned_resent: 0,
      remitted: 0,
      returned_received: 0,
    };

    allCarrierShipments.forEach((item) => {
      const rawSt = (item.order?.turboShipmentStatus || item.status || '').toLowerCase().trim();
      if (['incomplete', 'turbo_saved', 'created', 'status_1', 'status_18', '1', '18'].includes(rawSt)) {
        carrierStagesCounts.incomplete++;
      } else if (['turbo_sent', 'sent', 'waiting', 'pending', 'status_2', '2'].includes(rawSt) || rawSt.includes('انتظار')) {
        carrierStagesCounts.turbo_sent++;
      } else if (['processing', 'underway', 'accepted', 'status_3', '3'].includes(rawSt) || rawSt.includes('تنفيذ')) {
        carrierStagesCounts.processing++;
      } else if (['out_for_delivery', 'under delivery', 'with captain', 'in transit', 'shipped', 'status_4', '4'].includes(rawSt) || rawSt.includes('مسلمة للمندوب')) {
        carrierStagesCounts.out_for_delivery++;
      } else if (['delayed', 'on hold', 'status_13', '13'].includes(rawSt) || rawSt.includes('مؤجل')) {
        carrierStagesCounts.delayed++;
      } else if (['delivered', 'completed', 'status_7', '7'].includes(rawSt) || rawSt.includes('تسليم')) {
        carrierStagesCounts.delivered++;
      } else if (['returned_to_company', 'returned with company', 'returned', 'status_5', 'status_14', '5', '14'].includes(rawSt) || (rawSt.includes('مرتجع') && !rawSt.includes('وصلتني') && !rawSt.includes('معدوم') && !rawSt.includes('مفقود') && !rawSt.includes('ارسال'))) {
        carrierStagesCounts.returned_to_company++;
      } else if (['returned_destroyed', 'status_12', 'status_17', '12', '17'].includes(rawSt) || rawSt.includes('معدوم')) {
        carrierStagesCounts.returned_destroyed++;
      } else if (['returned_missing', 'lost', 'status_11', 'status_16', '11', '16'].includes(rawSt) || rawSt.includes('مفقود')) {
        carrierStagesCounts.returned_missing++;
      } else if (['returned_resent', 'status_10', 'status_15', '10', '15'].includes(rawSt) || rawSt.includes('ارسال')) {
        carrierStagesCounts.returned_resent++;
      } else if (['remitted', 'supplied', 'status_8', 'status_19', '8', '19'].includes(rawSt) || rawSt.includes('توريد')) {
        carrierStagesCounts.remitted++;
      } else if (['returned_received', 'status_20', '20'].includes(rawSt) || rawSt.includes('وصلتني')) {
        carrierStagesCounts.returned_received++;
      }
    });

    const summary = {
      totalShipments: countsByStatus.reduce((acc, curr) => acc + curr._count.id, 0),
      inTransit: inTransitCount,
      delivered: deliveredCount,
      returned: returnedCount,
      pendingRemittanceAmount: Number(pendingAmountAggr?._sum?.cost || 0),
      statusCounts,
      carrierStatusCounts: carrierStagesCounts,
    };

    const formattedShipments = shipments.map((s) => {
      const ord = s.order;
      const cust = ord?.customer;
      const customerName =
        ord?.customerName ||
        (cust ? [cust.firstName, cust.lastName].filter(Boolean).join(' ') : null) ||
        'عميل';
      const customerPhone = ord?.customerPhone || cust?.phone || null;
      const metadata = shippingProviderService.safeJsonParse(s.metadata, {});
      const liveStatus = metadata.liveStatus || {};

      const fullAddress =
        s.destinationAddress ||
        (ord?.shippingAddress && typeof ord.shippingAddress === 'object'
          ? [ord.shippingAddress.address, ord.shippingAddress.street, ord.shippingAddress.city].filter(Boolean).join(', ')
          : ord?.shippingAddress) ||
        (ord?.customerAddress && typeof ord.customerAddress === 'object'
          ? [ord.customerAddress.address, ord.customerAddress.street, ord.customerAddress.city].filter(Boolean).join(', ')
          : ord?.customerAddress) ||
        null;

      return {
        ...s,
        cost: s.cost !== null && s.cost !== undefined ? Number(s.cost) : null,
        destinationAddress: fullAddress,
        captainName: ord?.turboCaptainName || liveStatus.captain || liveStatus.captainName || null,
        captainPhone: ord?.turboCaptainPhone || liveStatus.captainPhone || liveStatus.captainNumber1 || null,
        branchName: ord?.turboBranchName || liveStatus.branch || liveStatus.branchName || null,
        branchPhone: ord?.turboBranchPhone || liveStatus.branchPhone || liveStatus.branchNumber1 || null,
        expectedBranch: ord?.turboExpectedBranch || liveStatus.expectedBranch || null,
        delayReason: ord?.turboDelayReason || liveStatus.delayReason || liveStatus.delay_reason || null,
        returnReason: ord?.turboReturnReason || liveStatus.returnReason || liveStatus.return_reason || null,
        receivedAmount: liveStatus.receivedAmount || liveStatus.received_amount || null,
        notes: ord?.notes || null,
        order: ord
          ? {
              ...ord,
              total: ord.total !== null && ord.total !== undefined ? Number(ord.total) : 0,
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

// GET /api/v1/shipments/:id/messages - Get shipment chat/messages
router.get('/:id/messages', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const code =
      shipment.trackingNumber ||
      shipment.externalShipmentId ||
      shipment.order?.turboTrackingNumber ||
      shipment.order?.turboShipmentId;

    if (!code) {
      return res.status(400).json({ success: false, error: 'لا يوجد كود تتبع لهذه الشحنة' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
    const turboService = new TurboService(turboApiKey, companyId);

    const result = await turboService.getShipmentMessages(code);
    res.json({ success: true, code, ...result });
  } catch (error) {
    console.error('Error fetching shipment messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/:id/messages - Send shipment message to courier
router.post('/:id/messages', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'نص الرسالة مطلوب' });
    }

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const code =
      shipment.trackingNumber ||
      shipment.externalShipmentId ||
      shipment.order?.turboTrackingNumber ||
      shipment.order?.turboShipmentId;

    if (!code) {
      return res.status(400).json({ success: false, error: 'لا يوجد كود تتبع لهذه الشحنة' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
    const turboService = new TurboService(turboApiKey, companyId);

    const result = await turboService.sendShipmentMessage(code, String(message).trim());
    res.json({ success: true, ...result, message: 'تم إرسال الرسالة بنجاح' });
  } catch (error) {
    console.error('Error sending shipment message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/:id/resend - Request resending from Turbo API
router.post('/:id/resend', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const code =
      shipment.trackingNumber ||
      shipment.externalShipmentId ||
      shipment.order?.turboTrackingNumber ||
      shipment.order?.turboShipmentId;

    if (!code) {
      return res.status(400).json({ success: false, error: 'لا يوجد كود تتبع لهذه الشحنة' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
    const turboService = new TurboService(turboApiKey, companyId);

    const result = await turboService.resendRequest(code);
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: 'RETURNED_RESENT' },
    });

    res.json({ success: true, ...result, message: 'تم إرسال طلب إعادة التوصيل لشركة الشحن بنجاح' });
  } catch (error) {
    console.error('Error requesting shipment resend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/shipments/:id/cancel-request - Request shipment cancellation via Turbo API
router.post('/:id/cancel-request', verifyToken.authenticateToken, async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const { id } = req.params;
    const { companyId } = req.user;

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: { shippingCompany: true, order: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const code =
      shipment.trackingNumber ||
      shipment.externalShipmentId ||
      shipment.order?.turboTrackingNumber ||
      shipment.order?.turboShipmentId;

    if (!code) {
      return res.status(400).json({ success: false, error: 'لا يوجد كود تتبع لهذه الشحنة' });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    const turboApiKey = shipment.shippingCompany?.apiKey || company?.turboApiKey;
    const turboService = new TurboService(turboApiKey, companyId);

    const result = await turboService.cancelRequest(code);
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, ...result, message: 'تم إرسال طلب إلغاء الشحنة لشركة الشحن بنجاح' });
  } catch (error) {
    console.error('Error sending cancellation request:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
