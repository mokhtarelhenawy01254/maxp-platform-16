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

module.exports = {
  getShippingQuote,
  createStandaloneShipment,
  getShipments,
  getShipmentById,
};
