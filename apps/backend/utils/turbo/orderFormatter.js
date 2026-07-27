/**
 * Turbo Order Formatter Utilities
 * دوال تنسيق بيانات الطلب لشحن Turbo
 */

const { getBestShippingAddressFields } = require('./addressParser');

function calculateTotalWeight(items) {
  if (!items || items.length === 0) {
    return 1;
  }

  return items.reduce((total, item) => {
    const weight = item.weight || 0.5;
    return total + (weight * (item.quantity || 1));
  }, 0);
}

function getNumericInvoiceNumber(orderNumber, fallbackValue = '') {
  const numericText = String(orderNumber || fallbackValue || '').replace(/\D/g, '');
  return numericText ? Number(numericText) : 0;
}

function normalizeShipmentSearchKeys(shipmentIdentifiers) {
  const values = Array.isArray(shipmentIdentifiers)
    ? shipmentIdentifiers
    : [shipmentIdentifiers];

  const normalized = values
    .map((value) => {
      if (value === null || value === undefined) {
        return '';
      }

      return String(value).trim();
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function formatOrderForTurbo(order, customer, items) {
  const addressFields = getBestShippingAddressFields(order.shippingAddress, order.customerAddress);
  const rawShippingAddress = addressFields.sourceValue || order.shippingAddress || order.customerAddress;

  let governorate = addressFields.governorate || order.city || order.governorate;

  const customerName = (
    order.customerName ||
    order.guestName ||
    (customer?.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : null) ||
    customer?.name ||
    customer?.fullName ||
    addressFields.parsedAddress?.name ||
    addressFields.parsedAddress?.customerName ||
    ''
  ).trim();

  const customerPhone = (
    order.customerPhone ||
    order.guestPhone ||
    customer?.phone ||
    customer?.mobile ||
    addressFields.parsedAddress?.phone ||
    addressFields.parsedAddress?.mobile ||
    ''
  ).trim();

  const totalValue = parseFloat(order.total || order.finalTotal || order.totalAmount || order.grandTotal || 0);
  const shippingFee = parseFloat(order.shipping || order.shippingCost || order.deliveryFee || 0);
  const subtotalValue = parseFloat(order.subtotal || order.subTotal || (totalValue > 0 ? (totalValue - shippingFee) : 0));

  const rawItems = items || order.orderItems || order.items || [];
  const formattedItems = Array.isArray(rawItems) ? rawItems.map(item => ({
    productName: item.productName || item.name || item.product?.name || 'منتج',
    quantity: item.quantity || 1,
    price: parseFloat(item.price || item.unitPrice || 0),
    total: parseFloat(item.total || ((item.price || 0) * (item.quantity || 1))),
    weight: item.weight || 0.5
  })) : [];

  let parsedMetadata = {};
  if (typeof order.metadata === 'string') {
    try { parsedMetadata = JSON.parse(order.metadata); } catch (e) {}
  } else if (order.metadata && typeof order.metadata === 'object') {
    parsedMetadata = order.metadata;
  }

  const requestType = order.requestType || parsedMetadata.requestType || order.orderType || order.type || null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: order.customerEmail || order.guestEmail || customer?.email || '',
    shippingAddress: rawShippingAddress,
    customerAddress: order.customerAddress || null,
    city: order.city || addressFields.city,
    governorate: governorate,
    items: formattedItems,
    totalWeight: calculateTotalWeight(formattedItems),
    subtotal: subtotalValue,
    shipping: shippingFee,
    totalValue: totalValue,
    paymentMethod: order.paymentMethod || 'CASH',
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    alternativePhone: order.alternativePhone || addressFields.parsedAddress?.phone2 || null,
    turboShipmentStatus: order.turboShipmentStatus || null,
    returnAmount: (() => {
      const metaRetAmt = parsedMetadata.returnAmount || order.returnAmount || null;
      if (metaRetAmt) return parseFloat(metaRetAmt);
      if (requestType === 'return' || order.orderType === 'RETURN') return totalValue;
      return shippingFee;
    })(),
    returnSummary: order.returnSummary || null,
    requestType: requestType,
    orderType: order.orderType || order.type || requestType || null,
    isOrder: order.isOrder !== undefined ? order.isOrder : null,
    canOpen: order.canOpen !== undefined ? order.canOpen : true,
    actualShippingCost: null
  };
}

module.exports = {
  calculateTotalWeight,
  getNumericInvoiceNumber,
  normalizeShipmentSearchKeys,
  formatOrderForTurbo
};
