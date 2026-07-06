const { getSharedPrismaClient } = require('./sharedDatabase');
const axios = require('axios');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const { getPageToken } = require('../utils/allFunctions');

async function syncPagePosts(pageId) {
  const prisma = getSharedPrismaClient();
  const page = await prisma.facebookPage.findFirst({ where: { pageId } });
  if (!page) throw new Error('Page not found');

  const apiVer = getMetaGraphApiVersion();
  let allPosts = [];
  let url = `https://graph.facebook.com/${apiVer}/${pageId}/posts?fields=id,message,full_picture,permalink_url,created_time&limit=100&access_token=${page.pageAccessToken}`;

  while (url) {
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data.data) allPosts = allPosts.concat(res.data.data);
    url = res.data.paging?.next || null;
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

  return { synced: allPosts.length, pageName: page.pageName };
}

async function toggleProductLabel(postId, isProduct) {
  const prisma = getSharedPrismaClient();
  return prisma.facebookPost.update({
    where: { id: postId },
    data: { isProduct },
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
    include: { page: { select: { pageName: true } } },
  });
}

module.exports = { syncPagePosts, toggleProductLabel, getPosts };
