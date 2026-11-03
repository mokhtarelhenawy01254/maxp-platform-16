/**
 * MAXP Network Shipping Adapter (SHIP-W6)
 * Enables a MaxP store to connect with a MaxP shipping company within the same database,
 * transforming orders into parcels at the shipping company and syncing status/COD back.
 */

const crypto = require('crypto');
const { getSharedPrismaClient } = require('../../sharedDatabase');
const tenantContext = require('../../tenantContext');
const { recordShipmentEvent } = require('../shipmentEventService');
const {
  mapCarrierStatusToStoreStatus,
  syncNetworkShipmentToStore,
  runSuppressed,
} = require('../networkShipmentSyncService');

function generateNetworkTrackingNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRK-NET-${timestamp}-${random}`;
}

const safeJsonParse = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

class MaxpNetworkAdapter {
  constructor(prisma = null) {
    this._prisma = prisma;
  }

  _getPrisma() {
    return this._prisma || getSharedPrismaClient();
  }

  /**
   * Create a shipment in the shipping company's tenant from a store order.
   *
   * @param {Object} params
   * @param {string} params.orderId - Store's order ID
   * @param {string} params.shippingCompanyId - Store's ShippingCompany configuration ID
   * @param {string} [params.storeCompanyId] - Store's company ID
   * @param {string} [params.shipmentId] - Existing store shipment ID (optional)
   * @param {number} [params.weight]
   * @param {number} [params.pieces]
   * @param {number} [params.codAmount]
   */
  async createShipment(params = {}) {
    const prisma = this._getPrisma();
    const {
      orderId,
      shippingCompanyId,
      storeCompanyId,
      weight,
      pieces,
      codAmount,
    } = params;

    if (!orderId) {
      return { success: false, error: 'orderId is required', statusCode: 400 };
    }

    if (!shippingCompanyId) {
      return { success: false, error: 'shippingCompanyId is required', statusCode: 400 };
    }

    // 1. Read the store's order and shipping company within storeCompanyId context
    let storeOrder = null;
    let storeShippingCompany = null;

    if (storeCompanyId) {
      await tenantContext.run(storeCompanyId, async () => {
        storeOrder = await prisma.order.findFirst({
          where: { id: orderId, companyId: storeCompanyId },
          include: { customer: true, orderItems: true },
        });
        storeShippingCompany = await prisma.shippingCompany.findFirst({
          where: { id: shippingCompanyId, companyId: storeCompanyId },
        });
      });
    } else {
      storeOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true, orderItems: true },
      });
      storeShippingCompany = await prisma.shippingCompany.findUnique({
        where: { id: shippingCompanyId },
      });
    }

    if (!storeOrder) {
      return { success: false, error: 'الطلب غير موجود', statusCode: 404 };
    }

    if (!storeShippingCompany) {
      return { success: false, error: 'شركة الشحن غير موجودة بالمتجر', statusCode: 404 };
    }

    const effectiveStoreCompanyId = storeCompanyId || storeOrder.companyId;

    // 2. Discover the target shipping company ID (linkedCompanyId)
    const settings = safeJsonParse(storeShippingCompany.settings, {});
    const targetShippingCompanyId =
      storeShippingCompany.linkedCompanyId || settings.linkedCompanyId;

    if (!targetShippingCompanyId) {
      return {
        success: false,
        error: 'غير مربوط بشركة شحن',
        reason: 'NO_LINKED_COMPANY_ID',
        statusCode: 400,
      };
    }

    // 3. Switch to target shipping company context and find matching client Merchant
    return tenantContext.run(targetShippingCompanyId, async () => {
      // The shipping company must have registered this store as a client (Merchant.linkedCompanyId = storeCompanyId)
      const clientMerchant = await prisma.merchant.findFirst({
        where: {
          companyId: targetShippingCompanyId,
          linkedCompanyId: effectiveStoreCompanyId,
          isActive: true,
        },
      });

      if (!clientMerchant) {
        return {
          success: false,
          error: 'غير مربوط بشركة شحن',
          reason: 'MERCHANT_NOT_LINKED',
          statusCode: 400,
        };
      }

      // Generate unique tracking number and barcode
      const trackingNumber = generateNetworkTrackingNumber();

      // Resolve recipient details
      const recipientName =
        (
          storeOrder.customerName ||
          `${storeOrder.customer?.firstName || ''} ${storeOrder.customer?.lastName || ''}`
        ).trim() || 'عميل';
      const recipientPhone = storeOrder.customerPhone || storeOrder.customer?.phone || '';
      const destinationGov = storeOrder.governorate || '';
      const destinationCity = storeOrder.city || null;
      const destinationAddress =
        storeOrder.shippingAddress || storeOrder.customerAddress || '';

      const finalWeight = weight !== undefined && weight !== null ? Number(weight) : 1;
      const finalPieces =
        pieces !== undefined && pieces !== null
          ? Math.max(1, parseInt(pieces, 10))
          : Math.max(1, storeOrder.orderItems?.length || 1);

      let finalCod = null;
      if (codAmount !== undefined && codAmount !== null) {
        finalCod = Number(codAmount);
      } else if (
        storeOrder.paymentMethod === 'COD' ||
        storeOrder.paymentMethod === 'CASH' ||
        !storeOrder.paymentMethod
      ) {
        finalCod = storeOrder.total ? Number(storeOrder.total) : 0;
      }

      // Create Shipment inside shipping company's tenant
      const createdShipment = await prisma.shipment.create({
        data: {
          companyId: targetShippingCompanyId,
          merchantId: clientMerchant.id, // Client ID at the shipping company
          recipientName,
          recipientPhone,
          recipientPhone2: storeOrder.customer?.phone2 || null,
          destinationGovernorate: destinationGov,
          destinationCity,
          destinationAddress,
          weight: finalWeight,
          pieces: finalPieces,
          codAmount: finalCod,
          merchantOrderId: String(storeOrder.orderNumber || storeOrder.id),
          orderId: storeOrder.id, // Cross-reference back to store's order
          status: 'PENDING',
          source: 'NETWORK',
          carrierType: 'MAXP_NETWORK',
          trackingNumber,
          barcode: trackingNumber,
          currency: storeOrder.currency || 'EGP',
          metadata: JSON.stringify({
            networkStoreCompanyId: effectiveStoreCompanyId,
            networkStoreOrderId: storeOrder.id,
            networkStoreOrderNumber: storeOrder.orderNumber,
          }),
        },
      });

      // Record CREATED event timeline for shipping company
      await recordShipmentEvent(prisma, {
        companyId: targetShippingCompanyId,
        shipmentId: createdShipment.id,
        fromStatus: null,
        toStatus: 'PENDING',
        reasonCode: 'CREATED',
        notes: `تم إنشاء الشحنة تلقائياً عبر شبكة MaxP (طلب #${storeOrder.orderNumber || storeOrder.id})`,
        actorType: 'SYSTEM',
      });

      return {
        success: true,
        trackingNumber,
        externalShipmentId: createdShipment.id,
        labelUrl: `/api/v1/shipping-portal/shipments/${createdShipment.id}/waybill-label`,
        carrierShipment: createdShipment,
        serviceLevel: 'MaxP Network Standard',
      };
    });
  }

  /**
   * Map carrier status to store order status using central logic.
   */
  mapStatus(status) {
    return mapCarrierStatusToStoreStatus(status);
  }

  /**
   * Sync shipment status from the shipping company to the store.
   */
  async syncShipment({ shipmentId, trackingNumber, storeCompanyId } = {}) {
    const prisma = this._getPrisma();

    // Find the carrier shipment by ID or tracking number
    const where = {};
    if (shipmentId) where.id = shipmentId;
    else if (trackingNumber) where.trackingNumber = trackingNumber;
    else return { success: false, error: 'shipmentId or trackingNumber required', statusCode: 400 };

    const carrierShipment = await prisma.shipment.findFirst({
      where,
      include: { merchant: true },
    });

    if (!carrierShipment) {
      return { success: false, error: 'الشحنة غير موجودة لدى شركة الشحن', statusCode: 404 };
    }

    const result = await syncNetworkShipmentToStore(
      prisma,
      carrierShipment,
      carrierShipment.status,
      { actorType: 'SYSTEM', notes: 'مزامنة يدوية من المتجر' }
    );

    return {
      success: true,
      status: carrierShipment.status,
      mappedStatus: this.mapStatus(carrierShipment.status),
      syncResult: result,
      tracking: carrierShipment,
    };
  }

  /**
   * Cancel a shipment. Cancels the carrier parcel, but DOES NOT auto-cancel the store order (policy requires manual decision).
   */
  async cancelShipment({ trackingNumber, shipmentId, storeCompanyId, reason } = {}) {
    const prisma = this._getPrisma();

    const where = {};
    if (shipmentId) where.id = shipmentId;
    else if (trackingNumber) where.trackingNumber = trackingNumber;
    else return { success: false, error: 'shipmentId or trackingNumber required', statusCode: 400 };

    const carrierShipment = await prisma.shipment.findFirst({
      where,
      include: { merchant: true },
    });

    if (!carrierShipment) {
      return { success: false, error: 'الشحنة غير موجودة', statusCode: 404 };
    }

    const targetShippingCompanyId = carrierShipment.companyId;

    // 1. Update shipping company's shipment to CANCELLED
    await tenantContext.run(targetShippingCompanyId, async () => {
      await prisma.shipment.update({
        where: { id: carrierShipment.id },
        data: { status: 'CANCELLED' },
      });

      await recordShipmentEvent(prisma, {
        companyId: targetShippingCompanyId,
        shipmentId: carrierShipment.id,
        fromStatus: carrierShipment.status,
        toStatus: 'CANCELLED',
        reasonCode: 'CANCELLED_BY_STORE',
        notes: reason || 'تم إلغاء الشحنة من المتجر عبر شبكة MaxP',
        actorType: 'SYSTEM',
      });
    });

    // 2. Sync to store without cancelling the store order
    await syncNetworkShipmentToStore(prisma, carrierShipment, 'CANCELLED', {
      actorType: 'SYSTEM',
      notes: reason || 'تم إلغاء الشحنة لدى شركة الشحن (يحتاج قرار يدوي لإلغاء الطلب)',
    });

    return {
      success: true,
      message: 'تم إلغاء الشحنة بنجاح لدى شركة الشحن',
      orderStatusPolicy: 'MANUAL_DECISION_REQUIRED',
    };
  }
}

module.exports = new MaxpNetworkAdapter();
