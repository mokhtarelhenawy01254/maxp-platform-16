/**
 * Shipping Portal Controller (SHIP-W1A)
 * Standalone shipments, client rate-card pricing, and parcel timeline
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { quotePrice } = require('../services/shipping/policyService');
const { recordShipmentEvent } = require('../services/shipping/shipmentEventService');
const crypto = require('crypto');
const { generateWaybillPdf } = require('../services/shipping/waybillPdfService');
const courierPortalService = require('../services/courierPortalService');
const shippingRtoService = require('../services/shipping/shippingRtoService');
const {
  getBranchInventory,
  transferBranchShipments,
  getBranchSummary,
  getCustodyDiff,
} = require('./branchCustodyController');

function generatePickupNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PCK-${dateStr}-${rand}`;
}

function generateTrackingNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-${timestamp}-${random}`;
}

/**
 * Format shipment response to ensure declaredWeightKg, actualWeightKg,
 * numeric weights and costs are consistently exposed.
 */
function formatShipment(shipment) {
  if (!shipment) return null;
  const raw = typeof shipment.toJSON === 'function' ? shipment.toJSON() : { ...shipment };

  let declaredWeight = null;
  let actualWeightFromMeta = null;

  if (raw.metadata) {
    try {
      const metadataObj = typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata;
      if (metadataObj && metadataObj.declaredWeightKg !== undefined && metadataObj.declaredWeightKg !== null) {
        declaredWeight = Number(metadataObj.declaredWeightKg);
      }
      if (metadataObj && metadataObj.actualWeightKg !== undefined && metadataObj.actualWeightKg !== null) {
        actualWeightFromMeta = Number(metadataObj.actualWeightKg);
      }
    } catch (_) {}
  }

  const actualWeightVal = raw.actualWeight !== null && raw.actualWeight !== undefined
    ? Number(raw.actualWeight)
    : actualWeightFromMeta;

  const currentWeightVal = raw.weight !== null && raw.weight !== undefined
    ? Number(raw.weight)
    : null;

  const declaredWeightKg = declaredWeight !== null
    ? declaredWeight
    : (raw.declaredWeightKg !== undefined && raw.declaredWeightKg !== null
        ? Number(raw.declaredWeightKg)
        : currentWeightVal);

  const actualWeightKg = actualWeightVal !== null
    ? actualWeightVal
    : (raw.actualWeightKg !== undefined && raw.actualWeightKg !== null
        ? Number(raw.actualWeightKg)
        : null);

  return {
    ...raw,
    weight: currentWeightVal,
    cost: raw.cost !== null && raw.cost !== undefined ? Number(raw.cost) : null,
    actualWeight: actualWeightVal,
    declaredWeightKg,
    actualWeightKg,
    courierCost: raw.courierCost !== null && raw.courierCost !== undefined ? Number(raw.courierCost) : null,
    costSource: raw.costSource || null,
    marginAmount: raw.marginAmount !== null && raw.marginAmount !== undefined ? Number(raw.marginAmount) : null,
    rtoCost: raw.rtoCost !== null && raw.rtoCost !== undefined ? Number(raw.rtoCost) : null,
  };
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
      clientReference,
      reference,
      orderId,
    } = req.body;

    // Deduplication check: clientReference (SHP-09)
    const rawRef = clientReference || reference;
    const trimmedRef = rawRef ? String(rawRef).trim() : null;
    if (trimmedRef) {
      const existingByRef = await prisma.shipment.findFirst({
        where: {
          companyId,
          merchantId: merchantId || null,
          clientReference: trimmedRef,
        },
        select: { id: true, trackingNumber: true, clientReference: true }
      });
      if (existingByRef) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_CLIENT_REFERENCE',
          message: `تم تسجيل شحنة مسبقاً بنفس مرجع العميل (${trimmedRef}) برقم تتبع ${existingByRef.trackingNumber || existingByRef.id}`,
          trackingNumber: existingByRef.trackingNumber || existingByRef.id,
        });
      }
    }

    // Deduplication check: orderId active shipment (SHP-09)
    if (orderId) {
      const existingByOrder = await prisma.shipment.findFirst({
        where: {
          companyId,
          orderId,
          status: { notIn: ['CANCELLED'] }
        },
        select: { id: true, trackingNumber: true, orderId: true }
      });
      if (existingByOrder) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_ORDER_SHIPMENT',
          message: `الطلب مربوط بالفعل بشحنة نشطة برقم تتبع ${existingByOrder.trackingNumber || existingByOrder.id}`,
          trackingNumber: existingByOrder.trackingNumber || existingByOrder.id,
        });
      }
    }

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
        clientReference: trimmedRef || null,
        clientRateCardId: quote.rateCardId || null,
        cost: quote.price,
        currency: quote.currency || 'EGP',
        status: 'PENDING',
        source: 'PORTAL',
        carrierType: 'MANUAL',
        trackingNumber,
        metadata: notes || manualDeliveryNotes
          ? JSON.stringify({ notes: notes || manualDeliveryNotes, pricingSource: quote.source, declaredWeightKg: finalWeight })
          : JSON.stringify({ pricingSource: quote.source, declaredWeightKg: finalWeight }),
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
        declaredWeightKg: finalWeight,
      },
    });

    return res.status(201).json({
      success: true,
      data: formatShipment(shipment),
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

    if (req.query.needsRtoReview === 'true' || req.query.rtoReview === 'true') {
      where.events = {
        some: {
          reasonCode: 'NEEDS_RTO_REVIEW'
        }
      };
      where.status = { notIn: ['RETURNED', 'DELIVERED', 'CANCELLED'] };
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
      data: shipments.map(formatShipment),
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

    let failureReasonLabelAr = null;
    if (shipment.failureReasonCode) {
      const reasonObj = await prisma.deliveryFailureReason.findFirst({
        where: { companyId, code: shipment.failureReasonCode }
      });
      failureReasonLabelAr = reasonObj?.labelAr || null;
    }

    return res.json({
      success: true,
      data: {
        ...formatShipment(shipment),
        failureReasonLabelAr,
      },
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

const ALLOWED_REASON_ROLES = ['OWNER', 'COMPANY_ADMIN', 'OPERATIONS', 'SUPER_ADMIN', 'ADMIN'];

async function getFailureReasons(req, res) {
  try {
    const { companyId } = req.user;
    const reasons = await courierPortalService.getFailureReasons(companyId);
    return res.json({ success: true, data: reasons });
  } catch (error) {
    console.error('[ShippingPortal] Error fetching failure reasons:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء جلب أسباب الفشل' });
  }
}

async function createFailureReason(req, res) {
  try {
    const { companyId, role } = req.user;
    if (role && !ALLOWED_REASON_ROLES.includes(role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح لك بإضافة أسباب الفشل' });
    }

    const { code, labelAr, labelEn, requiresReschedule, isActive } = req.body || {};
    const cleanCode = String(code || '').trim().toUpperCase();
    const cleanLabelAr = String(labelAr || '').trim();

    if (!cleanCode) {
      return res.status(400).json({ success: false, error: 'كود سبب الفشل مطلوب' });
    }
    if (!cleanLabelAr) {
      return res.status(400).json({ success: false, error: 'اسم سبب الفشل بالعربية مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const existing = await prisma.deliveryFailureReason.findFirst({
      where: { companyId, code: cleanCode }
    });

    if (existing) {
      return res.status(409).json({ success: false, error: 'كود سبب الفشل مسجل مسبقاً' });
    }

    const reason = await prisma.deliveryFailureReason.create({
      data: {
        companyId,
        code: cleanCode,
        labelAr: cleanLabelAr,
        labelEn: labelEn ? String(labelEn).trim() : null,
        requiresReschedule: requiresReschedule !== false,
        isActive: isActive !== false,
      }
    });

    return res.status(201).json({ success: true, data: reason });
  } catch (error) {
    console.error('[ShippingPortal] Error creating failure reason:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إضافة سبب الفشل' });
  }
}

async function updateFailureReason(req, res) {
  try {
    const { companyId, role } = req.user;
    if (role && !ALLOWED_REASON_ROLES.includes(role)) {
      return res.status(403).json({ success: false, error: 'غير مصرح لك بتعديل أسباب الفشل' });
    }

    const { id } = req.params;
    const { labelAr, labelEn, requiresReschedule, isActive } = req.body || {};

    const prisma = getSharedPrismaClient();
    const reason = await prisma.deliveryFailureReason.findFirst({
      where: { id, companyId }
    });

    if (!reason) {
      return res.status(404).json({ success: false, error: 'سبب الفشل غير موجود' });
    }

    const data = {};
    if (labelAr !== undefined) data.labelAr = String(labelAr).trim();
    if (labelEn !== undefined) data.labelEn = labelEn ? String(labelEn).trim() : null;
    if (requiresReschedule !== undefined) data.requiresReschedule = Boolean(requiresReschedule);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.deliveryFailureReason.update({
      where: { id },
      data
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ShippingPortal] Error updating failure reason:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تعديل سبب الفشل' });
  }
}

async function updateShipmentStatus(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { status, failureReasonCode, nextAttemptDate, notes } = req.body || {};

    if (!status) {
      return res.status(400).json({ success: false, error: 'الحالة مطلوبة' });
    }

    const normalizedStatus = String(status).trim().toUpperCase();
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId }
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const updateData = {
      status: normalizedStatus
    };

    if (normalizedStatus === 'FAILED') {
      const cleanReason = String(failureReasonCode || '').trim();
      if (!cleanReason) {
        return res.status(400).json({ success: false, error: 'سبب الفشل مطلوب عند تسجيل عدم التسليم' });
      }

      updateData.failureReasonCode = cleanReason;
      updateData.attemptCount = { increment: 1 };

      let calculatedNext = nextAttemptDate ? new Date(nextAttemptDate) : null;
      if (!calculatedNext) {
        let requiresReschedule = true;
        const reason = await prisma.deliveryFailureReason.findFirst({
          where: { companyId, code: cleanReason }
        });
        if (reason) {
          requiresReschedule = Boolean(reason.requiresReschedule);
        } else if (cleanReason === 'REFUSED') {
          requiresReschedule = false;
        }
        if (requiresReschedule) {
          calculatedNext = new Date(Date.now() + 24 * 3600 * 1000);
        }
      }
      if (calculatedNext) {
        updateData.nextAttemptDate = calculatedNext;
      }
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: updateData
    });

    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: id,
      fromStatus: shipment.status,
      toStatus: normalizedStatus,
      reasonCode: failureReasonCode || null,
      notes: notes || null,
      actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
      actorId: req.user?.id || null,
      actorName: req.user?.name || 'ADMIN'
    });

    try {
      const { syncNetworkShipmentToStore } = require('../services/shipping/networkShipmentSyncService');
      await syncNetworkShipmentToStore(prisma, updated, normalizedStatus, {
        actorId: req.user?.id || null,
        actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
        notes: notes || null,
        reasonCode: failureReasonCode || null,
      });
    } catch (netSyncErr) {
      console.warn('⚠️ [SHIPPING_PORTAL] Network sync notice:', netSyncErr.message);
    }

    let finalShipment = updated;
    if (normalizedStatus === 'DELIVERED' || normalizedStatus === 'PARTIALLY_DELIVERED') {
      try {
        const { applyProfitToShipment } = require('../services/shipping/profitService');
        const profitRes = await applyProfitToShipment(prisma, id);
        if (profitRes?.shipment) {
          finalShipment = profitRes.shipment;
        }
      } catch (profitErr) {
        console.warn('⚠️ [SHIPPING_PORTAL] Profit apply notice:', profitErr.message);
      }
    } else if (normalizedStatus === 'RETURNED') {
      try {
        const policyService = require('../services/shipping/policyService');
        const policy = await policyService.getPolicy(companyId, prisma);
        if (policy?.rtoChargeReturnLeg) {
          const rtoPrice = Number(policy.rtoReturnLegPrice !== null && policy.rtoReturnLegPrice !== undefined ? policy.rtoReturnLegPrice : 0);
          const currentCost = Number(updated.cost || 0);
          const courierCost = Number(updated.courierCost || 0);
          const marginAmount = Math.round((currentCost - rtoPrice - courierCost) * 100) / 100;

          finalShipment = await prisma.shipment.update({
            where: { id },
            data: {
              rtoCost: rtoPrice,
              marginAmount
            }
          });

          const existingRtoEvent = await prisma.shipmentEvent.findFirst({
            where: {
              shipmentId: id,
              reasonCode: 'RTO_COST_APPLIED'
            }
          });
          if (!existingRtoEvent) {
            await recordShipmentEvent(prisma, {
            companyId,
            shipmentId: id,
            fromStatus: shipment.status,
            toStatus: 'RETURNED',
            reasonCode: 'RTO_COST_APPLIED',
            notes: `تطبيق تكلفة رحلة العودة (RTO): ${rtoPrice} ج.م`,
            actorType: 'SYSTEM',
            metadata: {
              rtoCost: rtoPrice,
              marginAmount,
              courierCost
            }
          });
          }
        }
      } catch (rtoErr) {
        console.warn('⚠️ [SHIPPING_PORTAL] RTO cost apply notice:', rtoErr.message);
      }
    }

    return res.json({ success: true, data: formatShipment(finalShipment) });
  } catch (error) {
    console.error('[ShippingPortal] Error updating shipment status:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث حالة الشحنة' });
  }
}

async function reattemptShipment(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { nextAttemptDate, courierId, notes } = req.body || {};

    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: { id, companyId }
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(shipment.status)) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إعادة جدولة شحنة مكتملة أو ملغاة أو مرتجعة بالكامل'
      });
    }

    if (courierId) {
      const courier = await prisma.courier.findFirst({
        where: { id: courierId, companyId }
      });
      if (!courier) {
        return res.status(400).json({ success: false, error: 'المندوب المحدد غير موجود' });
      }
    }

    const nextDate = nextAttemptDate ? new Date(nextAttemptDate) : new Date(Date.now() + 24 * 3600 * 1000);

    const updated = await prisma.shipment.update({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
        nextAttemptDate: nextDate,
        status: 'OUT_FOR_DELIVERY',
        ...(courierId ? { courierId } : {})
      }
    });

    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: id,
      fromStatus: shipment.status,
      toStatus: 'OUT_FOR_DELIVERY',
      reasonCode: 'REATTEMPT_SCHEDULED',
      notes: notes || `إعادة جدولة محاولة التوصيل بتاريخ ${nextDate.toISOString().slice(0, 10)}`,
      actorType: 'ADMIN',
      actorId: req.user.id,
      actorName: req.user.name || 'ADMIN',
      metadata: {
        nextAttemptDate: nextDate,
        courierId: courierId || shipment.courierId
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ShippingPortal] Error reattempting shipment:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إعادة جدولة الشحنة' });
  }
}

async function runRtoMaintenance(req, res) {
  try {
    const { companyId } = req.user;
    const result = await shippingRtoService.evaluate(companyId);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[ShippingPortal] Error running RTO maintenance:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تشغيل معالجة RTO' });
  }
}


/**
 * POST /api/v1/shipping-portal/pickups
 * Create a new pickup request
 */
async function createPickupRequest(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const {
      merchantId,
      scheduledDate,
      timeSlot,
      contactName,
      contactPhone,
      pickupAddress,
      city,
      governorate,
      expectedParcels,
      branchId,
      notes,
    } = req.body;

    if (!contactName || !String(contactName).trim()) {
      return res.status(400).json({ success: false, error: 'اسم مسؤول الاستلام مطلوب' });
    }
    if (!contactPhone || !String(contactPhone).trim()) {
      return res.status(400).json({ success: false, error: 'رقم هاتف مسؤول الاستلام مطلوب' });
    }
    if (!pickupAddress || !String(pickupAddress).trim()) {
      return res.status(400).json({ success: false, error: 'عنوان الاستلام مطلوب' });
    }
    if (!governorate || !String(governorate).trim()) {
      return res.status(400).json({ success: false, error: 'المحافظة مطلوبة' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, error: 'تاريخ الاستلام مطلوب' });
    }

    if (merchantId) {
      const merchant = await prisma.merchant.findFirst({
        where: { id: merchantId, companyId },
      });
      if (!merchant) {
        return res.status(400).json({ success: false, error: 'التاجر غير موجود أو لا يتبع هذه الشركة' });
      }
    }

    if (branchId) {
      const branch = await prisma.shippingBranch.findFirst({
        where: { id: branchId, companyId },
      });
      if (!branch) {
        return res.status(400).json({ success: false, error: 'الفرع المحدد غير موجود' });
      }
    }

    const pickupNumber = generatePickupNumber();
    const pickup = await prisma.pickupRequest.create({
      data: {
        companyId,
        merchantId: merchantId || null,
        pickupNumber,
        status: 'REQUESTED',
        scheduledDate: new Date(scheduledDate),
        timeSlot: timeSlot ? String(timeSlot).trim() : null,
        contactName: String(contactName).trim(),
        contactPhone: String(contactPhone).trim(),
        pickupAddress: String(pickupAddress).trim(),
        city: city ? String(city).trim() : null,
        governorate: String(governorate).trim(),
        expectedParcels: expectedParcels ? Math.max(1, parseInt(expectedParcels, 10)) : 1,
        branchId: branchId || null,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        branch: true,
      },
    });

    return res.status(201).json({
      success: true,
      pickup,
      data: pickup,
      message: 'تم إنشاء طلب الاستلام بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error creating pickup request:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء طلب الاستلام',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/pickups
 * List pickup requests with filtering and search
 */
async function getPickupRequests(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const {
      status,
      merchantId,
      assignedCourierId,
      branchId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const where = { companyId };
    if (status) where.status = String(status);
    if (merchantId) where.merchantId = String(merchantId);
    if (assignedCourierId) where.assignedCourierId = String(assignedCourierId);
    if (branchId) where.branchId = String(branchId);
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { pickupNumber: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
        { pickupAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = Math.max(0, (parseInt(page, 10) - 1) * take);

    const [pickups, total] = await Promise.all([
      prisma.pickupRequest.findMany({
        where,
        include: {
          branch: true,
          shipments: {
            select: {
              id: true,
              trackingNumber: true,
              barcode: true,
              status: true,
              recipientName: true,
              destinationGovernorate: true,
              pieces: true,
              codAmount: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        take,
        skip,
      }),
      prisma.pickupRequest.count({ where }),
    ]);

    const courierIds = [...new Set(pickups.map((p) => p.assignedCourierId).filter(Boolean))];
    let courierMap = {};
    if (courierIds.length > 0) {
      const couriers = await prisma.courier.findMany({
        where: { id: { in: courierIds } },
        select: { id: true, name: true, phone: true },
      });
      courierMap = couriers.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
    }

    const enrichedPickups = pickups.map((p) => ({
      ...p,
      assignedCourier: p.assignedCourierId ? courierMap[p.assignedCourierId] || null : null,
    }));

    return res.json({
      success: true,
      pickups: enrichedPickups,
      data: enrichedPickups,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error('[ShippingPortal] Error listing pickup requests:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب طلبات الاستلام',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/pickups/:id
 */
async function getPickupRequestById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const pickup = await prisma.pickupRequest.findFirst({
      where: { id, companyId },
      include: {
        branch: true,
        shipments: {
          select: {
            id: true,
            trackingNumber: true,
            barcode: true,
            status: true,
            recipientName: true,
            destinationGovernorate: true,
            pieces: true,
            codAmount: true,
          },
        },
      },
    });

    if (!pickup) {
      return res.status(404).json({ success: false, error: 'طلب الاستلام غير موجود' });
    }

    let assignedCourier = null;
    if (pickup.assignedCourierId) {
      assignedCourier = await prisma.courier.findFirst({
        where: { id: pickup.assignedCourierId },
        select: { id: true, name: true, phone: true },
      });
    }

    return res.json({
      success: true,
      pickup: { ...pickup, assignedCourier },
      data: { ...pickup, assignedCourier },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error getting pickup request:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب تفاصيل طلب الاستلام',
    });
  }
}

/**
 * PATCH /api/v1/shipping-portal/pickups/:id/schedule
 */
async function schedulePickupRequest(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { scheduledDate, timeSlot } = req.body;
    const prisma = getSharedPrismaClient();

    const pickup = await prisma.pickupRequest.findFirst({
      where: { id, companyId },
    });
    if (!pickup) {
      return res.status(404).json({ success: false, error: 'طلب الاستلام غير موجود' });
    }

    const data = {};
    if (scheduledDate) data.scheduledDate = new Date(scheduledDate);
    if (timeSlot !== undefined) data.timeSlot = timeSlot ? String(timeSlot).trim() : null;
    if (pickup.status === 'REQUESTED') {
      data.status = 'SCHEDULED';
    }

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data,
      include: { branch: true },
    });

    return res.json({
      success: true,
      pickup: updated,
      data: updated,
      message: 'تم تحديث جدولة طلب الاستلام بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error scheduling pickup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جدولة طلب الاستلام',
    });
  }
}

/**
 * PATCH /api/v1/shipping-portal/pickups/:id/assign
 */
async function assignPickupCourier(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const courierId = req.body.courierId || req.body.assignedCourierId;
    const prisma = getSharedPrismaClient();

    if (!courierId) {
      return res.status(400).json({ success: false, error: 'معرّف المندوب مطلوب للإسناد' });
    }

    const pickup = await prisma.pickupRequest.findFirst({
      where: { id, companyId },
    });
    if (!pickup) {
      return res.status(404).json({ success: false, error: 'طلب الاستلام غير موجود' });
    }

    const courier = await prisma.courier.findFirst({
      where: { id: courierId, companyId },
    });
    if (!courier) {
      return res.status(400).json({ success: false, error: 'المندوب المحدد غير موجود أو لا يتبع هذه الشركة' });
    }

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data: {
        assignedCourierId: courierId,
        status: 'ASSIGNED',
      },
      include: { branch: true },
    });

    return res.json({
      success: true,
      pickup: updated,
      data: updated,
      message: 'تم إسناد المندوب بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error assigning pickup courier:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إسناد المندوب',
    });
  }
}

/**
 * PATCH /api/v1/shipping-portal/pickups/:id/complete
 */
async function completePickupRequest(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { actualParcels } = req.body;
    const prisma = getSharedPrismaClient();

    const pickup = await prisma.pickupRequest.findFirst({
      where: { id, companyId },
    });
    if (!pickup) {
      return res.status(404).json({ success: false, error: 'طلب الاستلام غير موجود' });
    }

    const parcelsCount = actualParcels !== undefined ? parseInt(actualParcels, 10) : pickup.expectedParcels;

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data: {
        actualParcels: parcelsCount,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { branch: true },
    });

    return res.json({
      success: true,
      pickup: updated,
      data: updated,
      message: 'تم تأكيد اكتمال طلب الاستلام بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error completing pickup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إكمال طلب الاستلام',
    });
  }
}

/**
 * PATCH /api/v1/shipping-portal/pickups/:id/cancel
 */
async function cancelPickupRequest(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const pickup = await prisma.pickupRequest.findFirst({
      where: { id, companyId },
    });
    if (!pickup) {
      return res.status(404).json({ success: false, error: 'طلب الاستلام غير موجود' });
    }

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data: {
        status: 'CANCELLED',
      },
      include: { branch: true },
    });

    return res.json({
      success: true,
      pickup: updated,
      data: updated,
      message: 'تم إلغاء طلب الاستلام بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error cancelling pickup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إلغاء طلب الاستلام',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/branches
 */
async function getBranches(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const { isActive, search } = req.query;

    const where = { companyId };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { governorate: { contains: q, mode: 'insensitive' } },
      ];
    }

    const branches = await prisma.shippingBranch.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return res.json({
      success: true,
      branches,
      data: branches,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error listing branches:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب قائمة الفروع',
    });
  }
}

/**
 * POST /api/v1/shipping-portal/branches
 */
async function createBranch(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();
    const { name, code, governorate, address, phone, isActive = true } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'اسم الفرع مطلوب' });
    }
    if (!governorate || !String(governorate).trim()) {
      return res.status(400).json({ success: false, error: 'المحافظة مطلوبة' });
    }

    const branchCode = code && String(code).trim()
      ? String(code).trim().toUpperCase()
      : `BR-${Date.now().toString(36).toUpperCase()}`;

    const existing = await prisma.shippingBranch.findUnique({
      where: { companyId_code: { companyId, code: branchCode } },
    });
    if (existing) {
      return res.status(400).json({ success: false, error: 'كود الفرع مسجل مسبقاً' });
    }

    const branch = await prisma.shippingBranch.create({
      data: {
        companyId,
        name: String(name).trim(),
        code: branchCode,
        governorate: String(governorate).trim(),
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : null,
        isActive: Boolean(isActive),
      },
    });

    return res.status(201).json({
      success: true,
      branch,
      data: branch,
      message: 'تم إضافة الفرع بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error creating branch:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء إنشاء الفرع',
    });
  }
}

/**
 * PUT /api/v1/shipping-portal/branches/:id
 */
async function updateBranch(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const { name, code, governorate, address, phone, isActive } = req.body;

    const branch = await prisma.shippingBranch.findFirst({
      where: { id, companyId },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const data = {};
    if (name) data.name = String(name).trim();
    if (code) data.code = String(code).trim().toUpperCase();
    if (governorate) data.governorate = String(governorate).trim();
    if (address !== undefined) data.address = address ? String(address).trim() : null;
    if (phone !== undefined) data.phone = phone ? String(phone).trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.shippingBranch.update({
      where: { id: branch.id },
      data,
    });

    return res.json({
      success: true,
      branch: updated,
      data: updated,
      message: 'تم تحديث الفرع بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error updating branch:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحديث بيانات الفرع',
    });
  }
}

/**
 * DELETE /api/v1/shipping-portal/branches/:id
 */
async function deleteBranch(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const branch = await prisma.shippingBranch.findFirst({
      where: { id, companyId },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    await prisma.shippingBranch.delete({
      where: { id: branch.id },
    });

    return res.json({
      success: true,
      message: 'تم حذف الفرع بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error deleting branch:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء حذف الفرع',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/shipments/:id/label
 * Generates and streams A6 Waybill PDF
 */
async function getShipmentLabelPdf(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: {
        companyId,
        OR: [
          { id },
          { trackingNumber: id },
          { barcode: id },
        ],
      },
      include: {
        branch: true,
        company: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    const pdfBuffer = await generateWaybillPdf(shipment);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="waybill-${shipment.trackingNumber || shipment.id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[ShippingPortal] Error generating shipment label PDF:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء توليد بوليصة الشحن PDF',
    });
  }
}

/**
 * POST /api/v1/shipping-portal/shipments/:id/receive
 * Inward receive at hub with weight recalculation and price adjustment
 */
async function receiveShipmentAtHub(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { branchId, actualWeight } = req.body;
    const prisma = getSharedPrismaClient();

    const shipment = await prisma.shipment.findFirst({
      where: {
        companyId,
        OR: [
          { id },
          { trackingNumber: id },
          { barcode: id },
        ],
      },
      include: { branch: true },
    });

    if (!shipment) {
      return res.status(404).json({ success: false, error: 'الشحنة غير موجودة' });
    }

    if (branchId) {
      const branch = await prisma.shippingBranch.findFirst({
        where: { id: branchId, companyId },
      });
      if (!branch) {
        return res.status(400).json({ success: false, error: 'الفرع المحدد غير موجود' });
      }
    }

    const newWeight = actualWeight !== undefined && actualWeight !== null && actualWeight !== ''
      ? parseFloat(actualWeight)
      : null;

    const hasValidActualWeight = newWeight !== null && !isNaN(newWeight) && newWeight > 0;
    const originalWeight = shipment.weight !== null && shipment.weight !== undefined ? Number(shipment.weight) : null;
    const originalCost = Number(shipment.cost || 0);

    let priceAdjustment = 0;
    let newCost = originalCost;
    let quote = null;

    if (hasValidActualWeight) {
      try {
        quote = await quotePrice({
          companyId,
          merchantId: shipment.merchantId,
          governorate: shipment.destinationGovernorate,
          weightKg: newWeight,
          codAmount: Number(shipment.codAmount || 0),
          prisma,
        });
        newCost = Number(quote.price);
        priceAdjustment = Number((newCost - originalCost).toFixed(2));
      } catch (err) {
        console.warn('[HubReceive] Quote recalculation error:', err.message);
      }
    }

    // Extract and update metadata
    let metadataObj = {};
    if (shipment.metadata) {
      try {
        metadataObj = typeof shipment.metadata === 'string' ? JSON.parse(shipment.metadata) : { ...shipment.metadata };
      } catch (_) {
        metadataObj = {};
      }
    }
    if (!metadataObj || typeof metadataObj !== 'object') {
      metadataObj = {};
    }

    if (hasValidActualWeight) {
      // Preserve original declared weight in metadata if not already recorded
      if (metadataObj.declaredWeightKg === undefined || metadataObj.declaredWeightKg === null) {
        metadataObj.declaredWeightKg = originalWeight;
      }
      metadataObj.actualWeightKg = newWeight;
      metadataObj.weightAdjustedAt = new Date().toISOString();
      metadataObj.lastPriceAdjustment = priceAdjustment;
    }

    const dataToUpdate = {
      status: 'RECEIVED_AT_HUB',
      branchId: branchId || shipment.branchId || null,
      lastBranchAt: new Date(),
      ...(hasValidActualWeight
        ? {
            weight: newWeight,
            actualWeight: newWeight,
            cost: newCost,
            priceAdjustment: priceAdjustment,
            metadata: JSON.stringify(metadataObj),
          }
        : {
            priceAdjustment: 0,
          }),
    };

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: dataToUpdate,
      include: { branch: true },
    });

    // Record ShipmentEvent with WEIGHT_ADJUSTED if weight was updated, otherwise HUB_RECEIVED
    const isWeightAdjusted = hasValidActualWeight && (
      (originalWeight !== null && originalWeight !== newWeight) ||
      priceAdjustment !== 0
    );

    const eventReason = isWeightAdjusted ? 'WEIGHT_ADJUSTED' : 'HUB_RECEIVED';
    const eventNotes = isWeightAdjusted
      ? `تم استلام الشحنة في الهاَب وتعديل الوزن: من ${originalWeight ?? '—'} كجم إلى ${newWeight} كجم. فرق السعر: ${priceAdjustment > 0 ? '+' : ''}${priceAdjustment} ج.م (من ${originalCost} إلى ${newCost} ج.م)`
      : `تم استلام الشحنة في الهاَب بنجاح`;

    await recordShipmentEvent(prisma, {
      companyId,
      shipmentId: shipment.id,
      fromStatus: shipment.status,
      toStatus: 'RECEIVED_AT_HUB',
      reasonCode: eventReason,
      notes: eventNotes,
      actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
      actorId: req.user?.id || null,
      actorName: req.user?.name || 'موظف الهاَب',
      branchId: branchId || shipment.branchId || null,
      metadata: {
        from: {
          weight: originalWeight,
          cost: originalCost,
        },
        to: {
          weight: hasValidActualWeight ? newWeight : originalWeight,
          cost: hasValidActualWeight ? newCost : originalCost,
        },
        financialImpact: hasValidActualWeight ? priceAdjustment : 0,
        priceAdjustment: hasValidActualWeight ? priceAdjustment : 0,
        difference: hasValidActualWeight ? priceAdjustment : 0,
        fromWeight: originalWeight,
        toWeight: hasValidActualWeight ? newWeight : originalWeight,
        fromCost: originalCost,
        toCost: hasValidActualWeight ? newCost : originalCost,
        declaredWeightKg: metadataObj.declaredWeightKg ?? originalWeight,
        actualWeightKg: hasValidActualWeight ? newWeight : (shipment.actualWeight ? Number(shipment.actualWeight) : null),
        originalCost,
        newCost: hasValidActualWeight ? newCost : originalCost,
        quoteBreakdown: quote?.breakdown || null,
      },
    });

    const formatted = formatShipment(updated);

    return res.json({
      success: true,
      shipment: formatted,
      data: formatted,
      priceAdjustment: hasValidActualWeight ? priceAdjustment : 0,
      message: 'تم استلام الشحنة في الهاَب بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPortal] Error receiving shipment at hub:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء استلام الشحنة في الهاَب',
    });
  }
}


/**
 * POST /api/v1/shipping-portal/shipments/bulk (SHIP-W11 / SHP-07)
 * Imports up to 500 parcels via CSV/XLSX or JSON array.
 * Each row is processed independently: failure in one row never drops the batch.
 */
async function bulkImportShipments(req, res) {
  try {
    const { companyId } = req.user;
    const prisma = getSharedPrismaClient();

    let rawRows = [];
    if (req.file && req.file.buffer) {
      const XLSX = require('xlsx');
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else if (Array.isArray(req.body?.rows)) {
      rawRows = req.body.rows;
    } else if (Array.isArray(req.body)) {
      rawRows = req.body;
    } else if (typeof req.body?.csv === 'string') {
      const XLSX = require('xlsx');
      const wb = XLSX.read(req.body.csv, { type: 'string' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      return res.status(400).json({
        success: false,
        code: 'NO_DATA',
        message: 'يرجى إرسال ملف (file) أو مصفوفة صفوف (rows)'
      });
    }

    if (rawRows.length > 500) {
      return res.status(400).json({
        success: false,
        code: 'MAX_ROWS_EXCEEDED',
        message: 'تجاوز الحد الأقصى المسموح به (500 صف)'
      });
    }

    const defaultMerchantId = req.body?.merchantId || req.shippingClientId || null;
    let createdCount = 0;
    const failed = [];
    const seenRefsInBatch = new Set();

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 1;
      const row = rawRows[i] || {};

      const name = String(row.recipientName || row['اسم المستلم'] || row.name || '').trim();
      const phone = String(row.recipientPhone || row['رقم الهاتف'] || row['الهاتف'] || row.phone || '').trim();
      const rawGov = String(row.governorate || row.destinationGovernorate || row['المحافظة'] || '').trim();
      const addr = String(row.address || row.destinationAddress || row['العنوان'] || '').trim();
      const rawWeight = row.weightKg !== undefined && row.weightKg !== '' ? row.weightKg : (row.weight !== undefined && row.weight !== '' ? row.weight : row['الوزن']);
      const rawCod = row.codAmount !== undefined && row.codAmount !== '' ? row.codAmount : (row.cod !== undefined && row.cod !== '' ? row.cod : row['مبلغ التحصيل']);
      const rawRef = row.clientReference !== undefined && row.clientReference !== '' ? row.clientReference : (row.reference !== undefined && row.reference !== '' ? row.reference : row['مرجع العميل']);
      const trimmedRef = rawRef ? String(rawRef).trim() : null;
      const notes = String(row.notes || row['ملاحظات'] || '').trim();
      const merchantId = row.merchantId || defaultMerchantId;

      // 1. Phone validation (SHP-07 requirement: PHONE_REQUIRED)
      if (!phone) {
        failed.push({ row: rowNum, reason: 'PHONE_REQUIRED', message: 'رقم هاتف المستلم مطلوب' });
        continue;
      }

      // 2. Weight validation (> 0)
      const weightNum = rawWeight !== undefined && rawWeight !== null && rawWeight !== '' ? Number(rawWeight) : 1;
      if (isNaN(weightNum) || weightNum <= 0) {
        failed.push({ row: rowNum, reason: 'INVALID_WEIGHT', message: 'الوزن يجب أن يكون رقماً أكبر من صفر' });
        continue;
      }

      // 3. COD validation (>= 0)
      const codNum = rawCod !== undefined && rawCod !== null && rawCod !== '' ? Number(rawCod) : 0;
      if (isNaN(codNum) || codNum < 0) {
        failed.push({ row: rowNum, reason: 'INVALID_COD', message: 'مبلغ التحصيل لا يمكن أن يكون سالباً' });
        continue;
      }

      // 4. Duplicate clientReference check (SHP-07 / SHP-09 requirement: DUPLICATE)
      if (trimmedRef) {
        if (seenRefsInBatch.has(trimmedRef)) {
          failed.push({ row: rowNum, reason: 'DUPLICATE', clientReference: trimmedRef, message: 'مرجع العميل مكرر في نفس الملف' });
          continue;
        }
        const existing = await prisma.shipment.findFirst({
          where: {
            companyId,
            merchantId: merchantId || null,
            clientReference: trimmedRef
          },
          select: { id: true, trackingNumber: true }
        });
        if (existing) {
          failed.push({
            row: rowNum,
            reason: 'DUPLICATE',
            clientReference: trimmedRef,
            trackingNumber: existing.trackingNumber || existing.id,
            message: 'مرجع العميل مكرر ومسجل مسبقاً'
          });
          continue;
        }
      }

      // 5. Governorate & quoting check (SHP-07 requirement: GOVERNORATE_NOT_SERVED)
      let quote;
      try {
        quote = await quotePrice({
          companyId,
          merchantId: merchantId || null,
          governorate: rawGov,
          weightKg: weightNum,
          codAmount: codNum,
          prisma
        });
      } catch (quoteErr) {
        failed.push({
          row: rowNum,
          reason: 'GOVERNORATE_NOT_SERVED',
          governorate: rawGov,
          message: quoteErr.message || 'المحافظة غير مخدومة'
        });
        continue;
      }

      // All validations passed -> create standalone parcel
      try {
        const trackingNumber = generateTrackingNumber();
        const createdShipment = await prisma.shipment.create({
          data: {
            companyId,
            merchantId: merchantId || null,
            recipientName: name || 'عميل',
            recipientPhone: phone,
            destinationGovernorate: quote.governorate,
            destinationAddress: addr || quote.governorate,
            weight: quote.breakdown?.actualWeightKg ? Number(quote.breakdown.actualWeightKg) : weightNum,
            codAmount: codNum > 0 ? codNum : null,
            collectedAmount: null,
            cost: quote.price,
            currency: quote.currency || 'EGP',
            clientRateCardId: quote.rateCardId || null,
            clientReference: trimmedRef,
            trackingNumber,
            status: 'PENDING',
            source: 'BULK_IMPORT',
            carrierType: 'MANUAL',
            metadata: notes ? JSON.stringify({ notes, pricingSource: quote.source }) : JSON.stringify({ pricingSource: quote.source })
          }
        });

        await recordShipmentEvent(prisma, {
          companyId,
          shipmentId: createdShipment.id,
          fromStatus: null,
          toStatus: 'PENDING',
          reasonCode: 'CREATED',
          notes: 'إنشاء الشحنة عبر الاستيراد المجمع',
          actorType: req.user?.role === 'SHIPPING_CLIENT' ? 'CLIENT' : 'ADMIN',
          actorId: req.user?.id || null,
          actorName: req.user?.name || null
        });

        if (trimmedRef) {
          seenRefsInBatch.add(trimmedRef);
        }
        createdCount++;
      } catch (createErr) {
        failed.push({ row: rowNum, reason: 'CREATE_FAILED', message: createErr.message });
      }
    }

    return res.json({
      success: true,
      created: createdCount,
      failed,
      total: rawRows.length
    });
  } catch (error) {
    console.error('❌ [SHIPPING_PORTAL] bulkImportShipments error:', error);
    return res.status(500).json({ success: false, message: error.message || 'فشل استيراد الشحنات' });
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
  createPickupRequest,
  getPickupRequests,
  getPickupRequestById,
  schedulePickupRequest,
  assignPickupCourier,
  completePickupRequest,
  cancelPickupRequest,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchInventory,
  transferBranchShipments,
  getBranchSummary,
  getCustodyDiff,
  getShipmentLabelPdf,
  receiveShipmentAtHub,
  getFailureReasons,
  createFailureReason,
  updateFailureReason,
  updateShipmentStatus,
  reattemptShipment,
  runRtoMaintenance,
  bulkImportShipments,
};
