const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const HtmlPolicyService = require('../services/htmlPolicyService');

function safeParseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function buildAddressText(address, fallbackAddress = '') {
  if (!address) {
    return normalizeText(fallbackAddress);
  }

  if (typeof address === 'string') {
    return normalizeText(address);
  }

  const addressParts = [
    address.street,
    address.address,
    address.area,
    address.district,
    address.landmark,
    address.city,
    address.governorate
  ]
    .map(normalizeText)
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index);

  return addressParts.join(' - ') || normalizeText(fallbackAddress);
}

function normalizeItemMetadata(metadata) {
  return safeParseJson(metadata, {});
}

function mapRegularOrder(order) {
  const shippingAddress = safeParseJson(order.shippingAddress, order.shippingAddress || {});
  const customerName =
    normalizeText(order.customerName) ||
    [order.customer?.firstName, order.customer?.lastName].map(normalizeText).filter(Boolean).join(' ') ||
    'عميل غير محدد';

  const items = Array.isArray(order.orderItems)
    ? order.orderItems.map((item) => {
        const metadata = normalizeItemMetadata(item.metadata);
        return {
          productName:
            normalizeText(item.productName) ||
            normalizeText(item.product?.name) ||
            normalizeText(metadata.productName) ||
            'منتج غير محدد',
          sku:
            normalizeText(item.product?.sku) ||
            normalizeText(item.productSku) ||
            normalizeText(metadata.sku) ||
            normalizeText(metadata.productSku),
          color:
            normalizeText(item.productColor) ||
            normalizeText(metadata.color) ||
            normalizeText(metadata.productColor),
          size:
            normalizeText(item.productSize) ||
            normalizeText(metadata.size) ||
            normalizeText(metadata.productSize),
          details:
            normalizeText(item.productDetails) ||
            normalizeText(metadata.details) ||
            normalizeText(metadata.productDetails),
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          total: Number(item.total || 0),
          metadata
        };
      })
    : [];

  const total = Number(order.total || 0);
  const paymentMethod = normalizeText(order.paymentMethod);
  const paymentStatus = normalizeText(order.paymentStatus);
  const amountToCollect =
    paymentStatus === 'COMPLETED' || paymentStatus === 'PAID' || paymentMethod === 'ONLINE'
      ? 0
      : total;

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    printedAt: new Date(),
    status: order.status,
    paymentMethod,
    paymentStatus,
    subtotal: Number(order.subtotal || 0),
    shippingCost: Number(order.shipping || 0),
    tax: Number(order.tax || 0),
    discount: Number(order.discount || 0),
    total,
    amountToCollect,
    customerName,
    customerPhone: normalizeText(order.customerPhone) || normalizeText(order.customer?.phone),
    customerEmail: normalizeText(order.customerEmail) || normalizeText(order.customer?.email),
    customerAddress: buildAddressText(shippingAddress, order.customerAddress || order.shippingAddress),
    city: normalizeText(order.city) || normalizeText(shippingAddress.city),
    governorate: normalizeText(order.governorate) || normalizeText(shippingAddress.governorate),
    notes: normalizeText(order.notes),
    shippingAddress,
    items,
    itemsCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  };
}

function mapGuestOrder(order) {
  const shippingAddress = safeParseJson(order.shippingAddress, order.shippingAddress || {});
  const rawItems = safeParseJson(order.items, []);

  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => {
        const metadata = normalizeItemMetadata(item.metadata);
        return {
          productName:
            normalizeText(item.productName) ||
            normalizeText(item.name) ||
            'منتج غير محدد',
          sku: normalizeText(item.sku) || normalizeText(item.productSku),
          color:
            normalizeText(item.color) ||
            normalizeText(item.productColor) ||
            normalizeText(metadata.color) ||
            normalizeText(metadata.productColor),
          size:
            normalizeText(item.size) ||
            normalizeText(item.productSize) ||
            normalizeText(metadata.size) ||
            normalizeText(metadata.productSize),
          details:
            normalizeText(item.details) ||
            normalizeText(item.productDetails) ||
            normalizeText(metadata.details) ||
            normalizeText(metadata.productDetails),
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          total: Number(item.total || Number(item.quantity || 0) * Number(item.price || 0)),
          metadata
        };
      })
    : [];

  const total = Number(order.finalTotal || order.total || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const paymentMethod = normalizeText(order.paymentMethod);
  const paymentStatus = normalizeText(order.paymentStatus || 'PENDING');
  const amountToCollect = paymentMethod === 'ONLINE' ? 0 : total;

  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    printedAt: new Date(),
    status: order.status,
    paymentMethod,
    paymentStatus,
    subtotal: Math.max(Number(order.total || 0) - shippingCost, 0),
    shippingCost,
    tax: 0,
    discount: Number(order.discountAmount || 0),
    total,
    amountToCollect,
    customerName: normalizeText(order.guestName) || 'عميل ضيف',
    customerPhone: normalizeText(order.guestPhone),
    customerEmail: normalizeText(order.guestEmail),
    customerAddress: buildAddressText(shippingAddress, order.shippingAddress),
    city: normalizeText(shippingAddress.city),
    governorate: normalizeText(shippingAddress.governorate),
    notes: normalizeText(order.notes),
    shippingAddress,
    items,
    itemsCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  };
}

async function findOrderDocumentData(prisma, companyId, orderNumber) {
  const regularOrder = await prisma.order.findFirst({
    where: {
      orderNumber,
      companyId
    },
    include: {
      customer: true,
      orderItems: {
        include: {
          product: true
        }
      }
    }
  });

  if (regularOrder) {
    return mapRegularOrder(regularOrder);
  }

  const guestOrder = await prisma.guestOrder.findFirst({
    where: {
      orderNumber,
      companyId
    }
  });

  if (guestOrder) {
    return mapGuestOrder(guestOrder);
  }

  return null;
}

router.get('/generate/:orderNumber', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();
    const orderData = await findOrderDocumentData(prisma, companyId, orderNumber);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        settings: true
      }
    });

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const companySettings = safeParseJson(company?.settings, {});
    const slipSettings = companySettings?.orderPreparation?.slipDocument;
    const htmlPolicyService = new HtmlPolicyService();
    const htmlContent = await htmlPolicyService.generatePolicyHtml(orderData, {
      companyName: normalizeText(company?.name),
      slipSettings
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (error) {
    console.error('Error generating preparation slip HTML:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preparation slip HTML',
      error: error.message
    });
  }
});

module.exports = router;
