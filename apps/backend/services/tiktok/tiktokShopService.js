const crypto = require('crypto');
const axios = require('axios');
const { getSharedPrismaClient } = require('../sharedDatabase');

const TIKTOK_SHOP_API_BASE = 'https://partner.tiktokshop.com/api/v2/';
const NO_ACCOUNT_ERROR = { code: 'NO_ACCOUNT', message: 'اربط حساب متجر TikTok Shop أولاً' };

const prisma = () => getSharedPrismaClient();

function assertAccount(account) {
  if (!account) {
    const error = new Error(NO_ACCOUNT_ERROR.message);
    error.code = NO_ACCOUNT_ERROR.code;
    throw error;
  }
}

function normalizeCreateTime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    const ms = numeric > 100000000000 ? numeric : numeric * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
  return String(value);
}

async function updateLastSyncedAt(account) {
  try {
    await prisma().tiktokShopAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() }
    });
  } catch (error) {
    // non-fatal: keep sync result even if timestamp update fails
  }
}

async function getAccount(companyId) {
  return prisma().tiktokShopAccount.findFirst({
    where: { companyId },
    orderBy: { updatedAt: 'desc' }
  });
}

async function saveAccount(companyId, data) {
  const shopId = String(data.shopId || '').trim();
  const existing = await prisma().tiktokShopAccount.findUnique({
    where: { companyId_shopId: { companyId, shopId } }
  });

  const payload = {
    shopName: data.shopName || existing?.shopName || null,
    region: data.region || existing?.region || null,
    appKey: data.appKey || existing?.appKey || null,
    appSecret: data.appSecret || existing?.appSecret || null,
    accessToken: data.accessToken || existing?.accessToken || null,
    status: 'connected',
    lastSyncedAt: existing?.lastSyncedAt || new Date()
  };

  return prisma().tiktokShopAccount.upsert({
    where: { companyId_shopId: { companyId, shopId } },
    create: { ...payload, companyId, shopId },
    update: payload
  });
}

function buildSignedRequest({ appKey, appSecret, accessToken, shopId, method, path, body }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = {
    app_key: String(appKey || ''),
    timestamp: String(timestamp)
  };
  if (accessToken) params.access_token = String(accessToken);
  if (shopId) params.shop_id = String(shopId);

  const canonicalString = Object.keys(params)
    .filter((key) => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const sign = crypto
    .createHmac('sha256', String(appSecret || ''))
    .update(canonicalString)
    .digest('hex')
    .toUpperCase();

  params.sign = sign;

  const query = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  return {
    method,
    url: `${TIKTOK_SHOP_API_BASE}${path}?${query}`,
    headers: { 'Content-Type': 'application/json' },
    data: body
  };
}

async function callTiktokShop(config) {
  let response;
  try {
    response = await axios(config);
  } catch (error) {
    const detail = error.response?.data?.message || error.response?.data?.msg || error.message;
    const err = new Error(detail || 'فشل الاتصال بمتجر TikTok Shop');
    err.code = 'TIKTOK_API_ERROR';
    err.apiCode = error.response?.data?.code;
    throw err;
  }

  const payload = response?.data;
  if (!payload || payload.code !== 0) {
    const err = new Error(payload?.message || 'خطأ من متجر TikTok Shop');
    err.code = 'TIKTOK_API_ERROR';
    err.apiCode = payload?.code;
    throw err;
  }
  return payload.data;
}

function normalizeOrder(order) {
  const itemList = Array.isArray(order?.item_list) ? order.item_list : [];
  return {
    orderId: order?.id || order?.order_id || '',
    status: order?.order_status || '',
    buyerUsername: order?.buyer_username || '',
    buyerName: order?.buyer_name || '',
    totalAmount: order?.total_amount ?? 0,
    currency: order?.currency || '',
    createTime: normalizeCreateTime(order?.create_time),
    items: itemList.map((item) => ({
      productId: item?.product_id || item?.id || '',
      productName: item?.product_name || item?.name || '',
      quantity: item?.quantity ?? 1,
      price: item?.sale_price ?? item?.price ?? 0
    }))
  };
}

async function fetchOrders({ companyId, pageSize }) {
  const account = await getAccount(companyId);
  assertAccount(account);

  const config = buildSignedRequest({
    appKey: account.appKey,
    appSecret: account.appSecret,
    accessToken: account.accessToken,
    shopId: account.shopId,
    method: 'POST',
    path: 'order/202309/orders/search',
    body: { page_size: pageSize || 20, sort_order: 'DESC' }
  });

  const data = await callTiktokShop(config);
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  await updateLastSyncedAt(account);
  return orders.map(normalizeOrder);
}

async function fetchProducts({ companyId, pageSize }) {
  const account = await getAccount(companyId);
  assertAccount(account);

  const config = buildSignedRequest({
    appKey: account.appKey,
    appSecret: account.appSecret,
    accessToken: account.accessToken,
    shopId: account.shopId,
    method: 'POST',
    path: 'product/202309/products/search',
    body: { page_size: pageSize || 20 }
  });

  const data = await callTiktokShop(config);
  const products = Array.isArray(data?.products) ? data.products : [];
  await updateLastSyncedAt(account);
  return products.map((product) => ({
    productId: product?.id || '',
    title: product?.title || '',
    status: product?.status || '',
    createTime: normalizeCreateTime(product?.create_time),
    skuCount: Array.isArray(product?.sku_list) ? product.sku_list.length : 0
  }));
}

module.exports = {
  TIKTOK_SHOP_API_BASE,
  getAccount,
  saveAccount,
  buildSignedRequest,
  fetchOrders,
  fetchProducts
};
