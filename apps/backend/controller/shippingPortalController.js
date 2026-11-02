/**
 * Shipping Portal Controller (SHIP-W1A)
 * Standalone shipments, client rate-card pricing, and parcel timeline
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

/**
 * POST /api/v1/shipping-portal/quote
 * Calculate shipping price for a client/merchant parcel
 */
async function getShippingQuote(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, governorate, weightKg, codAmount } = req.body;

    if (!governorate) {
      return res.status(400).json({
        success: false,
        error: 'المحافظة مطلوبة لاحتساب سعر الشحن',
      });
    }

    const prisma = getSharedPrismaClient();

    // If merchantId provided, verify it belongs to this company
    if (merchantId) {
      const merchant = await prisma.merchant.findFirst({
        where: { id: merchantId, companyId },
      });
      if (!merchant) {
        return res.status(400).json({
          success: false,
          error: 'العميل/التاجر غير موجود أو لا يتبع هذه الشركة',
        });
      }
    }

    const quote = await quotePrice({
      companyId,
      merchantId: merchantId || null,
      governorate,
      weightKg: weightKg ? Number(weightKg) : 1,
      codAmount: codAmount ? Number(codAmount) : 0,
      prisma,
    });

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error calculating quote:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء احتساب تكلفة الشحن',
    });
  }
}

/**
 * POST /api/v1/shipping-portal/shipments
 * Create a standalone shipment without an order
 */
async function createStandaloneShipment(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const {
      recipientName,
      recipientPhone,
      recipientPhone2,
      governorate,
      destinationGovernorate,
      address,
      destinationAddress,
      city,
      destinationCity,
      senderName,
      senderPhone,
      senderAddress,
      pieces,
      weight,
      weightKg,
      codAmount,
      declaredValue,
      contentDescription,
      isFragile,
      allowOpenPackage,
      merchantId,
      notes,
      manualDeliveryNotes,
    } = req.body;

    // Validate mandatory fields
    const name = (recipientName || '').trim();
    const phone = (recipientPhone || '').trim();
    const gov = (destinationGovernorate || governorate || '').trim();
    const addr = (destinationAddress || address || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, error: 'اسم المستلم مطلوب' });
    }
    if (!phone) {
      return res.status(400).json({ success: false, error: 'رقم هاتف المستلم مطلوب' });
    }
    if (!gov) {
      return res.status(400).json({ success: false, error: 'المحافظة مطلوبة' });
    }
    if (!addr) {
      return res.status(400).json({ success: false, error: 'العنوان التفصيلي مطلوب' });
    }

    // Validate merchant if provided (strict tenant isolation)
    if (merchantId) {
      const merchant = await prisma.merchant.findFirst({
        where: { id: merchantId, companyId },
      });
      if (!merchant) {
        return res.status(400).json({
          success: false,
          error: 'العميل/التاجر غير موجود أو لا يتبع هذه الشركة',
        });
      }
    }

    const finalWeight = Number(weightKg || weight || 1);
    const finalCod = codAmount !== undefined && codAmount !== null && codAmount !== '' ? Number(codAmount) : 0;

    // Calculate dynamic cost quote
    const quote = await quotePrice({
      companyId,
      merchantId: merchantId || null,
      governorate: gov,
      weightKg: finalWeight,
      codAmount: finalCod,
      prisma,
    });

    const trackingNumber = generateTrackingNumber();

    const shipment = await prisma.shipment.create({
      data: {
        companyId,
        merchantId: merchantId || null,
        recipientName: name,
        recipientPhone: phone,
        recipientPhone2: recipientPhone2 ? String(recipientPhone2).trim() : null,
        senderName: senderName ? String(senderName).trim() : null,
        senderPhone: senderPhone ? String(senderPhone).trim() : null,
        senderAddress: senderAddress ? String(senderAddress).trim() : null,
        destinationGovernorate: quote.governorate,
        destinationCity: city || destinationCity ? String(city || destinationCity).trim() : null,
        destinationAddress: addr,
        weight: quote.breakdown?.actualWeightKg ? Number(quote.breakdown.actualWeightKg) : finalWeight,
        pieces: pieces ? Math.max(1, parseInt(pieces, 10)) : 1,
        codAmount: finalCod > 0 ? finalCod : (codAmount !== undefined && codAmount !== null ? Number(codAmount) : null),
        collectedAmount: null, // Remains null until courier actually collects cash on delivery
        declaredValue: declaredValue ? Number(declaredValue) : null,
        contentDescription: contentDescription ? String(contentDescription).trim() : null,
        isFragile: Boolean(isFragile),
        allowOpenPackage: allowOpenPackage !== false,
        clientRateCardId: quote.rateCardId || null,
        cost: quote.price,
        currency: quote.currency || 'EGP',
        status: 'PENDING',
        source: 'PORTAL',
        carrierType: 'MANUAL',
        trackingNumber,
        metadata: notes || manualDeliveryNotes
          ? JSON.stringify({ notes: notes || manualDeliveryNotes, pricingSource: quote.source })
          : JSON.stringify({ pricingSource: quote.source }),
      },
    });

    // Record creation event in Timeline
    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: shipment.id,
      fromStatus: null,
      toStatus: 'PENDING',
      reasonCode: 'CREATED',
      notes: 'إنشاء الشحنة المستقلة عبر بوابة الشحن',
      actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
      actorId: req.user?.id || null,
      actorName: req.user?.name || null,
      metadata: {
        source: 'PORTAL',
        trackingNumber,
        cost: quote.price,
        pricingSource: quote.source,
      },
    });

    return res.status(201).json({
      success: true,
      data: shipment,
      message: 'تم إنشاء الطرد بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error creating standalone shipment:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء الشحنة',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/shipments
 * List shipments with multi-attribute filtering and pagination
 */
async function getShipments(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const {
      status,
      governorate,
      merchantId,
      from,
      to,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = { companyId };

    if (status) {
      where.status = String(status).toUpperCase();
    }
    if (governorate) {
      where.destinationGovernorate = String(governorate);
    }
    if (merchantId) {
      where.merchantId = String(merchantId);
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
        include: {
          merchant: { select: { id: true, name: true, phone: true } },
          shippingCompany: { select: { id: true, name: true } },
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
    console.error('[ShippingPortal] Error listing shipments:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب الشحنات',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/shipments/:id
 * Get single shipment with full event timeline
 */
async function getShipmentById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
        merchant: { select: { id: true, name: true, phone: true } },
        shippingCompany: { select: { id: true, name: true, providerKey: true } },
        courier: { select: { id: true, name: true, phone: true } },
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
    console.error('[ShippingPortal] Error getting shipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب تفاصيل الشحنة',
    });
  }
}

/**
 * DELETE /api/v1/shipping-portal/shipments/:id/cancel
 * Cancel a shipment if it is PENDING
 */
async function cancelShipment(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId },
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'الشحنة غير موجودة',
      });
    }

    if (shipment.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إلغاء الشحنة إلا إذا كانت في حالة قيد الانتظار (PENDING)',
      });
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'CANCELLED',
      },
    });

    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: shipment.id,
      fromStatus: 'PENDING',
      toStatus: 'CANCELLED',
      reasonCode: 'CANCELLED_BY_ADMIN',
      notes: req.body?.reason ? String(req.body.reason).trim() : 'إلغاء الشحنة بواسطة المستخدم',
      actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
      actorId: req.user?.id || null,
      actorName: req.user?.name || null,
      metadata: {
        cancelledAt: new Date().toISOString(),
      },
    });

    return res.json({
      success: true,
      message: 'تم إلغاء الشحنة بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error cancelling shipment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إلغاء الشحنة',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/rate-cards
 * List client rate cards
 */
async function getRateCards(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, governorateCode, isActive } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (merchantId) where.merchantId = String(merchantId);
    if (governorateCode !== undefined && governorateCode !== '') {
      where.governorateCode = governorateCode === 'null' ? null : String(governorateCode);
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const rateCards = await prisma.clientRateCard.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    const merchantIds = [...new Set(rateCards.map((c) => c.merchantId).filter(Boolean))];
    const merchants = await prisma.merchant.findMany({
      where: { id: { in: merchantIds }, companyId },
      select: { id: true, name: true, phone: true, email: true },
    });
    const merchantMap = Object.fromEntries(merchants.map((m) => [m.id, m]));

    const data = rateCards.map((c) => ({
      ...c,
      merchant: merchantMap[c.merchantId] || null,
    }));

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error listing rate cards:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب بطاقات الأسعار',
    });
  }
}

/**
 * POST /api/v1/shipping-portal/rate-cards
 * Create client rate card
 */
async function createRateCard(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const {
      merchantId,
      name,
      governorateCode,
      basePrice,
      baseWeightKg = 1,
      extraKgPrice = 0,
      codFeeFixed = 0,
      codFeePercent = 0,
      returnFee = 0,
      minWeight,
      maxWeight,
      isActive = true,
    } = req.body;

    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'العميل/التاجر مطلوب' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'اسم بطاقة السعر مطلوب' });
    }
    if (basePrice === undefined || basePrice === null || isNaN(Number(basePrice))) {
      return res.status(400).json({ success: false, error: 'السعر الأساسي مطلوب كرقم صالح' });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { id: merchantId, companyId },
    });
    if (!merchant) {
      return res.status(400).json({ success: false, error: 'التاجر المحدد غير موجود أو لا يتبع هذه الشركة' });
    }

    const existing = await prisma.clientRateCard.findFirst({
      where: { companyId, merchantId, name: name.trim() },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `توجد بالفعل بطاقة سعر بنفس الاسم (${name.trim()}) لهذا العميل`,
      });
    }

    let normGov = null;
    if (governorateCode && String(governorateCode).trim() && String(governorateCode).trim() !== 'null') {
      const { normalizeGovernorateName } = require('../utils/orderLocationNormalizer');
      normGov = normalizeGovernorateName(String(governorateCode).trim()) || String(governorateCode).trim();
    }

    const card = await prisma.clientRateCard.create({
      data: {
        companyId,
        merchantId,
        name: name.trim(),
        governorateCode: normGov,
        basePrice: Number(basePrice),
        baseWeightKg: Number(baseWeightKg || 1),
        extraKgPrice: Number(extraKgPrice || 0),
        codFeeFixed: Number(codFeeFixed || 0),
        codFeePercent: Number(codFeePercent || 0),
        returnFee: Number(returnFee || 0),
        minWeight: minWeight ? Number(minWeight) : null,
        maxWeight: maxWeight ? Number(maxWeight) : null,
        isActive: Boolean(isActive),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء بطاقة السعر بنجاح',
      data: {
        ...card,
        merchant: { id: merchant.id, name: merchant.name, phone: merchant.phone },
      },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error creating rate card:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء بطاقة السعر',
    });
  }
}

/**
 * PUT /api/v1/shipping-portal/rate-cards/:id
 * Update client rate card
 */
async function updateRateCard(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.clientRateCard.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'بطاقة السعر غير موجودة' });
    }

    const {
      name,
      governorateCode,
      basePrice,
      baseWeightKg,
      extraKgPrice,
      codFeeFixed,
      codFeePercent,
      returnFee,
      minWeight,
      maxWeight,
      isActive,
    } = req.body;

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (governorateCode !== undefined) {
      if (!governorateCode || String(governorateCode).trim() === 'null') {
        dataToUpdate.governorateCode = null;
      } else {
        const { normalizeGovernorateName } = require('../utils/orderLocationNormalizer');
        dataToUpdate.governorateCode = normalizeGovernorateName(String(governorateCode).trim()) || String(governorateCode).trim();
      }
    }
    if (basePrice !== undefined) dataToUpdate.basePrice = Number(basePrice);
    if (baseWeightKg !== undefined) dataToUpdate.baseWeightKg = Number(baseWeightKg);
    if (extraKgPrice !== undefined) dataToUpdate.extraKgPrice = Number(extraKgPrice);
    if (codFeeFixed !== undefined) dataToUpdate.codFeeFixed = Number(codFeeFixed);
    if (codFeePercent !== undefined) dataToUpdate.codFeePercent = Number(codFeePercent);
    if (returnFee !== undefined) dataToUpdate.returnFee = Number(returnFee);
    if (minWeight !== undefined) dataToUpdate.minWeight = minWeight ? Number(minWeight) : null;
    if (maxWeight !== undefined) dataToUpdate.maxWeight = maxWeight ? Number(maxWeight) : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.clientRateCard.update({
      where: { id: existing.id },
      data: dataToUpdate,
    });

    return res.json({
      success: true,
      message: 'تم تحديث بطاقة السعر بنجاح',
      data: updated,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error updating rate card:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث بطاقة السعر',
    });
  }
}

/**
 * DELETE /api/v1/shipping-portal/rate-cards/:id
 * Delete client rate card
 */
async function deleteRateCard(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.clientRateCard.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'بطاقة السعر غير موجودة' });
    }

    await prisma.clientRateCard.delete({
      where: { id: existing.id },
    });

    return res.json({
      success: true,
      message: 'تم حذف بطاقة السعر بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error deleting rate card:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف بطاقة السعر',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/stats
 * Dashboard telemetry for internal shipping operations
 */
async function getDashboardStats(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      todayCount,
      outForDeliveryCount,
      deliveredCount,
      returnedCount,
      pendingCount,
      recentShipments,
      allActiveCod,
      deliveredCod,
    ] = await Promise.all([
      prisma.shipment.count({
        where: { companyId, createdAt: { gte: startOfToday } },
      }),
      prisma.shipment.count({
        where: { companyId, status: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT'] } },
      }),
      prisma.shipment.count({
        where: { companyId, status: 'DELIVERED' },
      }),
      prisma.shipment.count({
        where: { companyId, status: { in: ['RETURNED', 'FAILED_ATTEMPT', 'RETURN_REQUESTED'] } },
      }),
      prisma.shipment.count({
        where: { companyId, status: 'PENDING' },
      }),
      prisma.shipment.findMany({
        where: { companyId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: { select: { id: true, name: true, phone: true } },
          shippingCompany: { select: { id: true, name: true } },
        },
      }),
      prisma.shipment.aggregate({
        where: {
          companyId,
          status: { notIn: ['CANCELLED', 'RETURNED'] },
          codAmount: { not: null },
        },
        _sum: { codAmount: true },
      }),
      prisma.shipment.aggregate({
        where: {
          companyId,
          status: 'DELIVERED',
        },
        _sum: {
          collectedAmount: true,
          codAmount: true,
        },
      }),
    ]);

    const codExpected = Number(allActiveCod?._sum?.codAmount || 0);
    const codCollected = Number(deliveredCod?._sum?.collectedAmount || deliveredCod?._sum?.codAmount || 0);

    return res.json({
      success: true,
      data: {
        todayCount,
        outForDeliveryCount,
        deliveredCount,
        returnedCount,
        pendingCount,
        codExpected,
        codCollected,
        recentShipments,
      },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب إحصائيات لوحة الشحن',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/merchants
 * Active merchants list for dropdowns
 */
async function getMerchants(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    const merchants = await prisma.merchant.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: 'asc' },
    });

    return res.json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error listing merchants:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب قائمة العملاء والتجار',
    });
  }
}

module.exports = {
  getShippingQuote,
  createStandaloneShipment,
  getShipments,
  getShipmentById,
  cancelShipment,
  getRateCards,
  createRateCard,
  updateRateCard,
  deleteRateCard,
  getDashboardStats,
  getMerchants,
};
