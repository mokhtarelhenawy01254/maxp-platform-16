const fetch = require('node-fetch');

const getPrisma = () => {
  const { getSharedPrismaClient } = require('./sharedDatabase');
  return getSharedPrismaClient();
};

const WEBHOOK_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const webhookCache = new Map();

const getAbortController = () => {
  if (typeof AbortController !== 'undefined') return AbortController;
  try {
    return require('abort-controller');
  } catch (error) {
    return null;
  }
};

const parseSettings = (settingsValue) => {
  if (!settingsValue) return {};
  try {
    return JSON.parse(settingsValue);
  } catch (error) {
    return {};
  }
};

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseJsonSafe = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const buildItemsText = (items = []) => {
  if (!Array.isArray(items)) return '';
  return items
    .map((item) => {
      const name = item.productName || '';
      const price = toNumber(item.price);
      const quantity = item.quantity || 1;
      const sku = item.productSku || '';
      return sku ? `${name}|${price}|${quantity}|${sku}` : `${name}|${price}|${quantity}`;
    })
    .filter(Boolean)
    .join('; ');
};

const buildOrderPayload = (order) => {
  const shippingAddress = parseJsonSafe(order.shippingAddress) || {};
  const customerName = order.customerName || (order.customer ? `${order.customer.firstName} ${order.customer.lastName}`.trim() : '');
  const customerPhone = order.customerPhone || order.customer?.phone || '';
  const customerEmail = order.customerEmail || order.customer?.email || '';
  const city = order.city || shippingAddress.city || '';
  const governorate = order.governorate || shippingAddress.governorate || '';
  const address = order.customerAddress || shippingAddress.address || '';

  const items = (order.orderItems || []).map((item) => ({
    name: item.productName || '',
    price: toNumber(item.price),
    quantity: item.quantity || 1,
    sku: item.productSku || '',
    productId: item.productId || ''
  }));

  return {
    event: 'order.created',
    sentAt: new Date().toISOString(),
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: toNumber(order.subtotal),
      shipping: toNumber(order.shipping),
      tax: toNumber(order.tax),
      discount: toNumber(order.discount),
      total: toNumber(order.total),
      currency: order.currency || 'EGP',
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail
      },
      address: {
        city,
        governorate,
        address
      },
      items,
      itemsText: buildItemsText(order.orderItems || [])
    }
  };
};

const getCompanyWebhookConfig = async (companyId) => {
  if (!companyId) return { enabled: false };

  const cached = webhookCache.get(companyId);
  const now = Date.now();
  if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
    return cached;
  }

  const prisma = getPrisma();
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true }
  });

  const settings = parseSettings(company?.settings);
  const url = typeof settings.googleSheetsWebhookUrl === 'string'
    ? settings.googleSheetsWebhookUrl.trim()
    : '';
  const enabled = settings.googleSheetsWebhookEnabled !== false && !!url;
  const secret = typeof settings.googleSheetsWebhookSecret === 'string'
    ? settings.googleSheetsWebhookSecret.trim()
    : '';

  const config = { url, enabled, secret, cachedAt: now };
  webhookCache.set(companyId, config);
  return config;
};

const sendOrderWebhook = async (orderId, companyId) => {
  const config = await getCompanyWebhookConfig(companyId);
  if (!config.enabled || !config.url) {
    return { skipped: true, reason: 'disabled' };
  }

  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, orderItems: true }
  });

  if (!order) {
    return { skipped: true, reason: 'order_not_found' };
  }

  const payload = buildOrderPayload(order);
  const AbortControllerRef = getAbortController();
  const controller = AbortControllerRef ? new AbortControllerRef() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS) : null;

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (config.secret) {
      headers['X-Webhook-Secret'] = config.secret;
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Webhook failed: ${response.status} ${response.statusText} ${errorText}`.trim());
    }

    return { success: true, status: response.status };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const queueOrderWebhook = (orderId, companyId) => {
  if (!orderId || !companyId) return;

  setTimeout(() => {
    sendOrderWebhook(orderId, companyId)
      .catch((error) => {
        console.error('❌ [ORDER-WEBHOOK] Failed to send order webhook:', error.message);
      });
  }, 0);
};

const invalidateWebhookCache = (companyId) => {
  if (!companyId) {
    webhookCache.clear();
    return;
  }
  webhookCache.delete(companyId);
};

module.exports = {
  queueOrderWebhook,
  sendOrderWebhook,
  invalidateWebhookCache
};
