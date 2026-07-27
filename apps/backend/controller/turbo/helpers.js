/**
 * Turbo Controller Helpers
 * دوال مساعدة لـ Turbo Controllers
 */

const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const { normalizeGuestShippingAddress } = require('../../utils/turbo/addressParser');

async function findOrderByNumber(orderNumber, companyId) {
  const prisma = getSharedPrismaClient();
  let order = await safeQuery(async () => {
    return await prisma.order.findFirst({
      where: { orderNumber, companyId },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
        company: { select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true } }
      }
    });
  }, 3);

  if (order) return order;

  const guestOrder = await safeQuery(async () => {
    return await prisma.guestOrder.findFirst({ where: { orderNumber, companyId } });
  }, 3);

  if (!guestOrder) return null;

  let items = guestOrder.items || [];
  if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = []; } }

  const shippingAddressDetails = normalizeGuestShippingAddress(guestOrder.shippingAddress);
  const company = await safeQuery(async () => {
    return await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true }
    });
  }, 2);

  return {
    id: guestOrder.id,
    orderNumber: guestOrder.orderNumber,
    tableType: 'GuestOrder',
    customerName: guestOrder.guestName || '',
    customerPhone: guestOrder.guestPhone || '',
    customerEmail: guestOrder.guestEmail || '',
    customerAddress: shippingAddressDetails.customerAddress,
    shippingAddress: shippingAddressDetails.rawShippingAddress,
    city: shippingAddressDetails.city,
    customer: {
      firstName: guestOrder.guestName?.split(' ')[0] || '',
      lastName: guestOrder.guestName?.split(' ').slice(1).join(' ') || '',
      phone: guestOrder.guestPhone || '',
      email: guestOrder.guestEmail || ''
    },
    items: items.map(item => ({
      id: item.id || Math.random().toString(),
      productId: item.productId || null,
      productName: item.name || item.productName || 'منتج',
      quantity: item.quantity || 1,
      price: item.price || 0,
      total: item.total || (item.price || 0) * (item.quantity || 1),
      product: null
    })),
    total: guestOrder.finalTotal || guestOrder.total || 0,
    subtotal: guestOrder.total || 0,
    shipping: guestOrder.shippingCost || 0,
    tax: 0,
    company,
    companyId,
    status: 'CONFIRMED',
    paymentMethod: guestOrder.paymentMethod || 'CASH',
    notes: guestOrder.notes || '',
    turboShipmentId: guestOrder.turboShipmentId || null,
    turboTrackingNumber: guestOrder.turboTrackingNumber || null,
    turboShipmentStatus: guestOrder.turboShipmentStatus || null,
    turboLabelUrl: guestOrder.turboLabelUrl || null,
    turboMetadata: guestOrder.turboMetadata || null,
    turboBranchId: null
  };
}

function parseTurboMetadata(turboMetadata) {
  if (!turboMetadata) return null;
  if (typeof turboMetadata === 'object') return turboMetadata;
  if (typeof turboMetadata !== 'string') return null;
  try { return JSON.parse(turboMetadata); }
  catch (error) {
    console.warn('⚠️ [TURBO-CONTROLLER] Failed to parse turboMetadata for shipment lookup:', error.message);
    return null;
  }
}

function buildTurboShipmentSearchKeys(order = {}) {
  const metadata = parseTurboMetadata(order.turboMetadata);
  const metadataResult = metadata?.result && typeof metadata.result === 'object' ? metadata.result : null;

  const searchKeys = [
    order.turboTrackingNumber,
    order.turboShipmentId,
    order.orderNumber,
    metadata?.bar_code,
    metadata?.tracking_number,
    metadata?.trackingNumber,
    metadata?.code,
    metadata?.invoice_number,
    metadata?.shipmentId,
    metadataResult?.bar_code,
    metadataResult?.tracking_number,
    metadataResult?.trackingNumber,
    metadataResult?.code,
    metadataResult?.invoice_number,
  ]
    .map(v => v === null || v === undefined ? '' : String(v).trim())
    .filter(Boolean);

  return Array.from(new Set(searchKeys));
}

function buildTurboUnlinkUpdateData(includeOrderOnlyFields = false) {
  const updateData = {
    turboShipmentId: null,
    turboTrackingNumber: null,
    turboShipmentStatus: null,
    turboLabelUrl: null,
    turboMetadata: null,
  };
  if (includeOrderOnlyFields) updateData.turboBranchId = null;
  return updateData;
}

function hasTurboLink(order = {}) {
  return Boolean(
    order.turboShipmentId || order.turboTrackingNumber ||
    order.turboShipmentStatus || order.turboLabelUrl ||
    order.turboMetadata || order.turboBranchId
  );
}

async function findOrderForTurboLocalAction(orderId, companyId) {
  const prisma = getSharedPrismaClient();
  let order = await findOrderByNumber(orderId, companyId);
  if (order) return order;

  order = await safeQuery(async () => {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: { company: { select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true } } }
    });
  }, 3);
  if (order) return order;

  const guestOrder = await safeQuery(async () => {
    return await prisma.guestOrder.findFirst({ where: { id: orderId, companyId } });
  }, 3);
  if (!guestOrder) return null;

  const company = await safeQuery(async () => {
    return await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, turboApiKey: true, turboEnabled: true, turboAutoCreate: true }
    });
  }, 2);

  return {
    id: guestOrder.id, orderNumber: guestOrder.orderNumber, tableType: 'GuestOrder',
    companyId: guestOrder.companyId, company,
    turboShipmentId: guestOrder.turboShipmentId || null,
    turboTrackingNumber: guestOrder.turboTrackingNumber || null,
    turboShipmentStatus: guestOrder.turboShipmentStatus || null,
    turboLabelUrl: guestOrder.turboLabelUrl || null,
    turboMetadata: guestOrder.turboMetadata || null,
  };
}

module.exports = {
  findOrderByNumber,
  parseTurboMetadata,
  buildTurboShipmentSearchKeys,
  buildTurboUnlinkUpdateData,
  hasTurboLink,
  findOrderForTurboLocalAction
};
