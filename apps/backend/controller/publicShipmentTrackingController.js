/**
 * Public Shipment Tracking Controller (SHIP-W3)
 * Provides unauthenticated waybill tracking with strict PII masking
 * and zero exposure of internal pricing/cost/customer data.
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * Mask recipient name: first name + first character of family name + asterisks
 * Example: 'أحمد محمد علي' -> 'أحمد م***'
 */
function maskRecipientName(name) {
  if (!name || typeof name !== 'string') return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    const single = parts[0];
    return single.length > 2 ? `${single.slice(0, 2)}***` : `${single}***`;
  }
  const first = parts[0];
  const second = parts[1];
  const firstCharOfFamily = second.charAt(0);
  return `${first} ${firstCharOfFamily}***`;
}

/**
 * Mask recipient phone: first 3 digits + ***** + last 3 digits
 * Example: '01012345432' -> '010*****432'
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const clean = phone.trim().replace(/[\s\-\+]/g, '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
  }
  return clean.length > 3 ? `${clean.slice(0, 2)}***${clean.slice(-1)}` : '***';
}

/**
 * GET /api/v1/public/shipments/track/:waybill
 * Public tracking by barcode or trackingNumber
 */
async function trackShipmentByWaybill(req, res) {
  try {
    const rawWaybill = req.params.waybill;
    const cleanWaybill = String(rawWaybill || '').trim();

    if (!cleanWaybill) {
      return res.status(404).json({
        success: false,
        error: 'الشحنة غير موجودة أو رقم البوليصة غير صحيح',
        message: 'الشحنة غير موجودة أو رقم البوليصة غير صحيح',
      });
    }

    const prisma = getSharedPrismaClient();

    // Query shipment with strict projection (ZERO prices, ZERO costs, ZERO address details)
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { barcode: cleanWaybill },
          { trackingNumber: cleanWaybill }
        ]
      },
      select: {
        id: true,
        barcode: true,
        trackingNumber: true,
        status: true,
        recipientName: true,
        recipientPhone: true,
        destinationGovernorate: true,
        destinationCity: true,
        updatedAt: true,
        createdAt: true,
        events: {
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            id: true,
            toStatus: true,
            fromStatus: true,
            reasonCode: true,
            notes: true,
            createdAt: true,
          }
        }
      }
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'الشحنة غير موجودة أو رقم البوليصة غير صحيح',
        message: 'الشحنة غير موجودة أو رقم البوليصة غير صحيح',
      });
    }

    const waybill = shipment.barcode || shipment.trackingNumber;

    return res.json({
      success: true,
      data: {
        waybill,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        recipientName: maskRecipientName(shipment.recipientName),
        recipientPhone: maskPhone(shipment.recipientPhone),
        destinationGovernorate: shipment.destinationGovernorate,
        destinationCity: shipment.destinationCity,
        updatedAt: shipment.updatedAt,
        createdAt: shipment.createdAt,
        events: shipment.events.map(ev => ({
          id: ev.id,
          toStatus: ev.toStatus,
          status: ev.toStatus,
          fromStatus: ev.fromStatus,
          reasonCode: ev.reasonCode,
          notes: ev.notes,
          createdAt: ev.createdAt,
        })),
      }
    });
  } catch (error) {
    console.error('❌ [PUBLIC-TRACKING] Error looking up shipment:', error);
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ أثناء الاستعلام عن الشحنة',
      message: 'حدث خطأ أثناء الاستعلام عن الشحنة',
    });
  }
}

module.exports = {
  trackShipmentByWaybill,
  maskRecipientName,
  maskPhone,
};
