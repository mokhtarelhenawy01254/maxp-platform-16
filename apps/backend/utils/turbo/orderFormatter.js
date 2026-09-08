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

function normalizeDigits(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48));
}

function getNumericInvoiceNumber(orderNumber, fallbackValue = '') {
  const numericText = normalizeDigits(String(orderNumber || fallbackValue || '')).replace(/\D/g, '');
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

  const customerPhone = normalizeDigits((
    order.customerPhone ||
    order.guestPhone ||
    customer?.phone ||
    customer?.mobile ||
    addressFields.parsedAddress?.phone ||
    addressFields.parsedAddress?.mobile ||
    ''
  ).trim());

  const totalValue = parseFloat(order.total || order.finalTotal || order.totalAmount || order.grandTotal || 0);
  const shippingFee = parseFloat(order.shipping || order.shippingCost || order.deliveryFee || 0);
  const subtotalValue = parseFloat(order.subtotal || order.subTotal || (totalValue > 0 ? (totalValue - shippingFee) : 0));

  const rawItems = items || order.orderItems || order.items || [];
  const formattedItems = Array.isArray(rawItems) ? rawItems.map(item => {
    let parsedMeta = {};
    if (typeof item.metadata === 'string') {
      try { parsedMeta = JSON.parse(item.metadata); } catch (e) {}
    } else if (item.metadata && typeof item.metadata === 'object') {
      parsedMeta = item.metadata;
    }
    let attributes = item.attributes || parsedMeta?.attributeValues || parsedMeta?.attributes || {};
    if (typeof attributes === 'string') {
      try { attributes = JSON.parse(attributes); } catch (e) {}
    }
    let color = item.productColor || item.color || attributes?.Color || attributes?.['اللون'] || attributes?.color || parsedMeta?.color || item.productVariant?.color || null;
    let size = item.productSize || item.size || attributes?.Size || attributes?.['المقاس'] || attributes?.size || parsedMeta?.size || item.productVariant?.size || null;
    const variantName = item.variantName || item.variant?.name || item.productVariant?.name || parsedMeta?.variantName || null;

    if ((!color || !size) && variantName) {
      const parts = String(variantName).split(/\s*[-–/]\s*/);
      if (parts.length >= 2) {
        if (!color) color = parts[0].trim();
        if (!size) size = parts.slice(1).join(' - ').trim();
      }
    }

    return {
      productName: item.productName || item.name || item.product?.name || 'منتج',
      color: color ? String(color).trim() : null,
      size: size ? String(size).trim() : null,
      variantName: variantName ? String(variantName).trim() : null,
      quantity: item.quantity || 1,
      price: parseFloat(item.price || item.unitPrice || 0),
      total: parseFloat(item.total || ((item.price || 0) * (item.quantity || 1))),
      weight: item.weight || 0.5
    };
  }) : [];

  let parsedMetadata = {};
  if (typeof order.metadata === 'string') {
    try { parsedMetadata = JSON.parse(order.metadata); } catch (e) {}
  } else if (order.metadata && typeof order.metadata === 'object') {
    parsedMetadata = order.metadata;
  }

  const requestType = order.requestType || parsedMetadata.requestType || order.orderType || order.type || null;

  // Resolve alternative phone from order, address, or embedded in notes
  let resolvedPhone2 = order.phone2 || order.alternativePhone || addressFields.parsedAddress?.phone2 || addressFields.parsedAddress?.alternativePhone || addressFields.parsedAddress?.secondPhone || null;
  if (!resolvedPhone2 && order.notes) {
    const noteMatch = String(order.notes).match(/(?:هاتف\s*بديل|رقم\s*بديل|بديل|phone2|alt(?:ernative)?\s*phone)[\s:]*([0-9\u0660-\u0669]{11})/i);
    if (noteMatch && noteMatch[1]) {
      resolvedPhone2 = noteMatch[1];
    }
  }
  if (resolvedPhone2) {
    resolvedPhone2 = normalizeDigits(resolvedPhone2);
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: order.customerEmail || order.guestEmail || customer?.email || '',
    shippingAddress: rawShippingAddress,
    customerAddress: order.customerAddress || null,
    city: order.city || addressFields.city,
    // Merged district/area from both address sources (structured JSON + plain text),
    // so it survives even when the street is taken from a plain-text customerAddress.
    area: addressFields.area || order.area || null,
    governorate: governorate,
    items: formattedItems,
    totalWeight: calculateTotalWeight(formattedItems),
    subtotal: subtotalValue,
    shipping: shippingFee,
    totalValue: totalValue,
    paymentMethod: order.paymentMethod || 'CASH',
    notes: order.notes || '',
    createdAt: order.createdAt || new Date().toISOString(),
    phone2: resolvedPhone2,
    alternativePhone: resolvedPhone2,
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
  normalizeDigits,
  formatOrderForTurbo
};
