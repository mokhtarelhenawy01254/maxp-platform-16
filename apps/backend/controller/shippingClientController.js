/**
 * Shipping Client Controller (SHIP-W2C)
 * Self-service portal controller strictly scoped to authenticated client's merchantId
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { quotePrice } = require('../services/shipping/policyService');
const { recordShipmentEvent } = require('../services/shipping/shipmentEventService');
const crypto = require('crypto');

function generateTrackingNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-${timestamp}-${random}`;
}

function generatePickupNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PCK-${dateStr}-${rand}`;
}

/**
 * GET /api/v1/shipping-client/me
 */
async function getMe(req, res) {
  try {
    return res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          firstName: req.user.firstName || '',
          lastName: req.user.lastName || '',
          role: req.user.role,
          merchantId: req.shippingClientId,
        },
        merchant: req.merchant,
      },
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getMe:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب بيانات الحساب' });
  }
}

/**
 * GET /api/v1/shipping-client/summary
 */
async function getSummary(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const prisma = getSharedPrismaClient();

    const [totalShipments, deliveredCount, returnedCount, pendingCount, pendingCodSum, recentShipments] = await Promise.all([
      prisma.shipment.count({
        where: { companyId, merchantId },
      }),
      prisma.shipment.count({
        where: { companyId, merchantId, status: 'DELIVERED' },
      }),
      prisma.shipment.count({
        where: {
          companyId,
          merchantId,
          status: { in: ['RETURNED', 'RETURN_REQUESTED', 'FAILED_ATTEMPT'] },
        },
      }),
      prisma.shipment.count({
        where: {
          companyId,
          merchantId,
          status: { in: ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT'] },
        },
      }),
      prisma.shipment.aggregate({
        where: {
          companyId,
          merchantId,
          status: { in: ['DELIVERED', 'OUT_FOR_DELIVERY', 'PENDING', 'ACCEPTED'] },
          codAmount: { not: null },
        },
        _sum: {
          codAmount: true,
        },
      }),
      prisma.shipment.findMany({
        where: { companyId, merchantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trackingNumber: true,
          recipientName: true,
          recipientPhone: true,
          destinationGovernorate: true,
          status: true,
          codAmount: true,
          cost: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

    const totalFinished = deliveredCount + returnedCount;
    const deliveryRate = totalFinished > 0 ? Math.round((deliveredCount / totalFinished) * 100) : 0;
    const estimatedPendingCod = Number(pendingCodSum?._sum?.codAmount || 0);

    return res.json({
      success: true,
      data: {
        totalShipments,
        deliveredCount,
        returnedCount,
        pendingCount,
        deliveryRate,
        estimatedPendingCod,
        recentShipments,
      },
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getSummary:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب ملخص العمليات' });
  }
}

/**
 * GET /api/v1/shipping-client/shipments
 */
async function getShipments(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const { status, search, from, to, page, limit } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {
      companyId,
      merchantId,
    };

    if (status && String(status).toUpperCase() !== 'ALL') {
      where.status = String(status).toUpperCase();
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { recipientPhone: { contains: q } },
        { recipientName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const [total, shipments] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trackingNumber: true,
          recipientName: true,
          recipientPhone: true,
          recipientPhone2: true,
          destinationGovernorate: true,
          destinationCity: true,
          destinationAddress: true,
          pieces: true,
          weight: true,
          codAmount: true,
          collectedAmount: true,
          declaredValue: true,
          contentDescription: true,
          isFragile: true,
          allowOpenPackage: true,
          status: true,
          cost: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: shipments,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getShipments:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب الشحنات' });
  }
}

/**
 * GET /api/v1/shipping-client/shipments/:id
 * Strictly scoped: Returns 404 if not found or belongs to another merchant
 */
async function getShipmentById(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: {
        id,
        companyId,
        merchantId,
      },
      select: {
        id: true,
        trackingNumber: true,
        recipientName: true,
        recipientPhone: true,
        recipientPhone2: true,
        destinationGovernorate: true,
        destinationCity: true,
        destinationAddress: true,
        pieces: true,
        weight: true,
        codAmount: true,
        collectedAmount: true,
        declaredValue: true,
        contentDescription: true,
        isFragile: true,
        allowOpenPackage: true,
        status: true,
        cost: true,
        currency: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            reasonCode: true,
            notes: true,
            actorType: true,
            actorName: true,
            createdAt: true,
          },
        },
      },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'الشحنة غير موجودة',
      });
    }

    return res.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getShipmentById:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب تفاصيل الشحنة' });
  }
}

/**
 * POST /api/v1/shipping-client/shipments
 * Forces merchantId = req.shippingClientId
 */
async function createShipment(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const prisma = getSharedPrismaClient();

    const {
      recipientName,
      recipientPhone,
      recipientPhone2,
      destinationGovernorate,
      destinationCity,
      destinationAddress,
      pieces,
      weight,
      weightKg,
      codAmount,
      declaredValue,
      contentDescription,
      isFragile,
      allowOpenPackage,
      notes,
    } = req.body;

    const name = String(recipientName || '').trim();
    const phone = String(recipientPhone || '').trim();
    const gov = String(destinationGovernorate || '').trim();
    const addr = String(destinationAddress || '').trim();

    if (!name) return res.status(400).json({ success: false, error: 'اسم المستلم مطلوب' });
    if (!phone) return res.status(400).json({ success: false, error: 'رقم هاتف المستلم مطلوب' });
    if (!gov) return res.status(400).json({ success: false, error: 'المحافظة مطلوبة' });
    if (!addr) return res.status(400).json({ success: false, error: 'العنوان التفصيلي مطلوب' });

    const finalWeight = Number(weight || weightKg || 1);
    const finalCod = codAmount !== undefined && codAmount !== null ? Number(codAmount) : 0;

    // Quote price using client rate card
    const quote = await quotePrice({
      companyId,
      merchantId,
      governorate: gov,
      weightKg: finalWeight,
      codAmount: finalCod,
      prisma,
    });

    const trackingNumber = generateTrackingNumber();

    const shipment = await prisma.shipment.create({
      data: {
        companyId,
        merchantId,
        recipientName: name,
        recipientPhone: phone,
        recipientPhone2: recipientPhone2 ? String(recipientPhone2).trim() : null,
        destinationGovernorate: quote.governorate,
        destinationCity: destinationCity ? String(destinationCity).trim() : null,
        destinationAddress: addr,
        weight: quote.breakdown?.actualWeightKg ? Number(quote.breakdown.actualWeightKg) : finalWeight,
        pieces: pieces ? Math.max(1, parseInt(pieces, 10)) : 1,
        codAmount: finalCod > 0 ? finalCod : null,
        collectedAmount: null,
        declaredValue: declaredValue ? Number(declaredValue) : null,
        contentDescription: contentDescription ? String(contentDescription).trim() : null,
        isFragile: Boolean(isFragile),
        allowOpenPackage: allowOpenPackage !== false,
        clientRateCardId: quote.rateCardId || null,
        cost: quote.price,
        currency: quote.currency || 'EGP',
        status: 'PENDING',
        source: 'CLIENT_PORTAL',
        carrierType: 'MANUAL',
        trackingNumber,
        metadata: notes
          ? JSON.stringify({ notes: String(notes).trim(), pricingSource: quote.source })
          : JSON.stringify({ pricingSource: quote.source }),
      },
    });

    // Record creation event
    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: shipment.id,
      fromStatus: null,
      toStatus: 'PENDING',
      reasonCode: 'CREATED',
      notes: 'إنشاء الشحنة عبر بوابة العميل',
      actorType: 'CLIENT',
      actorId: req.user?.id || null,
      actorName: req.merchant?.name || req.user?.firstName || 'العميل',
      metadata: {
        source: 'CLIENT_PORTAL',
        trackingNumber,
        cost: quote.price,
      },
    });

    return res.status(201).json({
      success: true,
      data: shipment,
      message: 'تم إنشاء الشحنة بنجاح',
    });
  } catch (error) {
    console.error('[ShippingClient] Error creating shipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء الشحنة',
    });
  }
}

/**
 * GET /api/v1/shipping-client/pickups
 */
async function getPickups(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const prisma = getSharedPrismaClient();

    const pickups = await prisma.pickupRequest.findMany({
      where: { companyId, merchantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pickupNumber: true,
        status: true,
        scheduledDate: true,
        timeSlot: true,
        contactName: true,
        contactPhone: true,
        pickupAddress: true,
        city: true,
        governorate: true,
        expectedParcels: true,
        actualParcels: true,
        notes: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: pickups,
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getPickups:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب طلبات الاستلام' });
  }
}

/**
 * POST /api/v1/shipping-client/pickups
 * Forces merchantId = req.shippingClientId
 */
async function createPickup(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const prisma = getSharedPrismaClient();

    const {
      scheduledDate,
      timeSlot,
      contactName,
      contactPhone,
      pickupAddress,
      city,
      governorate,
      expectedParcels,
      notes,
    } = req.body;

    const cName = String(contactName || req.merchant?.name || '').trim();
    const cPhone = String(contactPhone || req.merchant?.phone || '').trim();
    const pAddr = String(pickupAddress || req.merchant?.address || '').trim();
    const pGov = String(governorate || '').trim();

    if (!cName) return res.status(400).json({ success: false, error: 'اسم مسؤول الاستلام مطلوب' });
    if (!cPhone) return res.status(400).json({ success: false, error: 'رقم هاتف مسؤول الاستلام مطلوب' });
    if (!pAddr) return res.status(400).json({ success: false, error: 'عنوان الاستلام مطلوب' });
    if (!pGov) return res.status(400).json({ success: false, error: 'المحافظة مطلوبة' });
    if (!scheduledDate) return res.status(400).json({ success: false, error: 'تاريخ الاستلام مطلوب' });

    const pickupNumber = generatePickupNumber();

    const pickup = await prisma.pickupRequest.create({
      data: {
        companyId,
        merchantId,
        pickupNumber,
        status: 'REQUESTED',
        scheduledDate: new Date(scheduledDate),
        timeSlot: timeSlot ? String(timeSlot).trim() : null,
        contactName: cName,
        contactPhone: cPhone,
        pickupAddress: pAddr,
        city: city ? String(city).trim() : null,
        governorate: pGov,
        expectedParcels: expectedParcels ? Math.max(1, parseInt(expectedParcels, 10)) : 1,
        notes: notes ? String(notes).trim() : null,
      },
    });

    return res.status(201).json({
      success: true,
      data: pickup,
      message: 'تم إنشاء طلب الاستلام بنجاح',
    });
  } catch (error) {
    console.error('[ShippingClient] Error creating pickup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء طلب الاستلام',
    });
  }
}

/**
 * GET /api/v1/shipping-client/rate-card
 * Zero internal cost fields. Returns only this client's rate cards.
 */
async function getRateCard(req, res) {
  try {
    const { companyId } = req.user;
    const merchantId = req.shippingClientId;
    const prisma = getSharedPrismaClient();

    const rateCards = await prisma.clientRateCard.findMany({
      where: {
        companyId,
        merchantId,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        governorateCode: true,
        basePrice: true,
        baseWeightKg: true,
        extraKgPrice: true,
        codFeeFixed: true,
        codFeePercent: true,
        returnFee: true,
        minWeight: true,
        maxWeight: true,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      data: rateCards,
    });
  } catch (error) {
    console.error('[ShippingClient] Error in getRateCard:', error);
    return res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب بطاقة الأسعار' });
  }
}

module.exports = {
  getMe,
  getSummary,
  getShipments,
  getShipmentById,
  createShipment,
  getPickups,
  createPickup,
  getRateCard,
};
