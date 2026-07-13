const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function enrichMemoryContextWithPostProduct(companyId, threadId, memoryContext) {
  let enrichedContext = memoryContext ? { ...memoryContext } : {};
  if (!threadId) return enrichedContext;

  try {
    const prisma = getSharedPrismaClient();
    if (!prisma) return enrichedContext;

    // 1. Fetch conversation to get metadata
    const conversation = await prisma.conversation.findUnique({
      where: { id: threadId },
      select: { metadata: true }
    });

    if (!conversation || !conversation.metadata) return enrichedContext;

    let meta = {};
    try {
      meta = JSON.parse(conversation.metadata);
    } catch (e) {
      return enrichedContext;
    }

    const postId = meta.postId;
    if (!postId) return enrichedContext;

    // 2. Fetch post response settings and include product
    const postSettings = await prisma.postResponseSettings.findUnique({
      where: {
        postId_companyId: {
          postId,
          companyId
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            description: true
          }
        }
      }
    });

    if (postSettings?.product) {
      enrichedContext.referredProduct = {
        id: postSettings.product.id,
        name: postSettings.product.name,
        price: postSettings.product.price,
        description: postSettings.product.description
      };
      console.log(`✅ [POST-PRODUCT-MAPPING] Enriched context with referred product: ${postSettings.product.name}`);
    }
  } catch (err) {
    console.warn('⚠️ [POST-PRODUCT-MAPPING] Failed to enrich memory context with post product:', err.message);
  }

  return enrichedContext;
}

module.exports = {
  enrichMemoryContextWithPostProduct
};
