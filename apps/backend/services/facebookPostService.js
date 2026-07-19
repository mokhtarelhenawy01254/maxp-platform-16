const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const { getPageToken } = require('../utils/allFunctions');
const {
  ensureValidFacebookPageAccessToken,
  refreshFacebookPageAccessToken,
  buildFacebookPageTokenFailureMessage,
} = require('../utils/facebookPageTokenUtils');

async function syncPagePosts(pageId, companyId) {
  const prisma = getSharedPrismaClient();
  const page = await prisma.facebookPage.findFirst({ where: { pageId } });
  if (!page) throw new Error('Page not found');

  if (page.status !== 'connected') {
    throw new Error(`Page "${page.pageName}" is disconnected. Please reconnect it.`);
  }

  const pageToken = await getPageToken(pageId);
  if (!pageToken) {
    throw new Error(`Unable to retrieve token for page "${page.pageName}". Please reconnect.`);
  }

  const tokenState = await ensureValidFacebookPageAccessToken({
    companyId: pageToken.companyId || companyId,
    pageId,
    pageAccessToken: pageToken.pageAccessToken,
    allowRefresh: true,
  });

  if (!tokenState.ok) {
    const errorMsg = buildFacebookPageTokenFailureMessage(tokenState, pageId);
    console.error(`[FB-POST] Token validation failed for ${pageId}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const apiVer = getMetaGraphApiVersion();
  let allPosts = [];

  let validToken = tokenState.pageAccessToken;
  let url = `https://graph.facebook.com/${apiVer}/${pageId}/posts?fields=id,message,full_picture,permalink_url,created_time&limit=100&access_token=${validToken}`;
  let refreshAttempted = false;

  while (url) {
    try {
      const res = await axios.get(url, { timeout: 15000 });
      if (res.data.data) allPosts = allPosts.concat(res.data.data);
      url = res.data.paging?.next || null;
    } catch (error) {
      const graphError = error?.response?.data?.error || {};
      const isPermissionError =
        (graphError.code === 10 || graphError.code === 100) &&
        /pages_read_engagement/i.test(graphError.message || '');

      if (isPermissionError && !refreshAttempted) {
        refreshAttempted = true;
        const refreshResult = await refreshFacebookPageAccessToken({
          companyId: pageToken.companyId || companyId,
          pageId,
        });
        if (refreshResult.success) {
          validToken = refreshResult.pageAccessToken;
          url = `https://graph.facebook.com/${apiVer}/${pageId}/posts?fields=id,message,full_picture,permalink_url,created_time&limit=100&access_token=${validToken}`;
          allPosts = [];
          continue;
        }
      }

      if (isPermissionError && refreshAttempted) {
        throw new Error(
          `تعذرت مزامنة المنشورات: صلاحية صفحة الفيسبوك لا تحتوي على الإذن المطلوب. ` +
          `يرجى فصل الصفحة وإعادة ربطها لمنح جميع الأذونات المطلوبة.`
        );
      }
      throw error;
    }
  }

  for (const fbPost of allPosts) {
    await prisma.facebookPost.upsert({
      where: { postId: fbPost.id },
      create: {
        postId: fbPost.id,
        pageId,
        companyId: page.companyId,
        message: fbPost.message || '',
        mediaUrl: fbPost.full_picture || null,
        permalink: fbPost.permalink_url || null,
        postedAt: fbPost.created_time ? new Date(fbPost.created_time) : new Date(),
        syncStatus: 'synced',
      },
      update: {
        message: fbPost.message || '',
        mediaUrl: fbPost.full_picture || null,
        permalink: fbPost.permalink_url || null,
        postedAt: fbPost.created_time ? new Date(fbPost.created_time) : new Date(),
        syncStatus: 'synced',
      },
    });
  }

  return { synced: allPosts.length, pageName: pageToken.pageName };
}

async function setProduct(postId, productId) {
  const prisma = getSharedPrismaClient();
  const data = {};
  if (productId) {
    data.productId = productId;
    data.isProduct = true;
  } else {
    data.productId = null;
    data.isProduct = false;
  }
  return prisma.facebookPost.update({
    where: { id: postId },
    data,
    include: { product: { select: { id: true, name: true, mainImage: true, sku: true } } },
  });
}

async function getPosts(companyId, filters = {}) {
  const prisma = getSharedPrismaClient();
  const where = { companyId };
  if (filters.isProduct !== undefined) where.isProduct = filters.isProduct;
  if (filters.pageId) where.pageId = filters.pageId;

  return prisma.facebookPost.findMany({
    where,
    orderBy: { postedAt: 'desc' },
    take: filters.limit || 100,
    skip: filters.offset || 0,
    include: {
      page: { select: { pageName: true } },
      product: { select: { id: true, name: true, mainImage: true, sku: true } },
    },
  });
}

module.exports = { syncPagePosts, setProduct, getPosts };
